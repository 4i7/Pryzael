import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_DIR = path.join(ROOT, "skills");
const CATALOG_PATH = path.join(ROOT, "worker", "generated", "catalog.mjs");
const REPORT_PATH = path.join(ROOT, "dist", "r1-qualification.json");
const BUILD_OUT = path.join(ROOT, ".qualification-dist");
const RESOURCE_ROOTS = ["references", "assets", "scripts"];

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = options.capture ? `\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}` : "";
    throw new Error(`${command} ${args.join(" ")} exited ${result.status}${detail}`);
  }
  return options.capture ? result.stdout.trim() : "";
}

function available(command, args = ["--version"]) {
  const result = spawnSync(command, args, { cwd: ROOT, encoding: "utf8", stdio: "ignore", shell: false });
  return !result.error && result.status === 0;
}

function findPython() {
  for (const candidate of [process.env.PYTHON, "python3", "python"].filter(Boolean)) {
    if (available(candidate)) return candidate;
  }
  throw new Error("Python is required for scripts/validate_skills.py");
}

function sortedSkillNames() {
  return fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

function walkCanonicalEntries(skillDir) {
  const entries = [];
  const visit = (absolute, relative) => {
    const stat = fs.lstatSync(absolute);
    if (stat.isSymbolicLink()) {
      entries.push({ path: relative, kind: "symlink", target: fs.readlinkSync(absolute) });
      return;
    }
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(absolute).sort((a, b) => a.localeCompare(b))) {
        visit(path.join(absolute, name), path.posix.join(relative, name));
      }
      return;
    }
    if (stat.isFile()) entries.push({ path: relative, kind: "file", bytes: fs.readFileSync(absolute) });
  };

  visit(path.join(skillDir, "SKILL.md"), "SKILL.md");
  for (const root of RESOURCE_ROOTS) {
    const absolute = path.join(skillDir, root);
    if (fs.existsSync(absolute)) visit(absolute, root);
  }
  return entries;
}

function packageIdentity(skillName) {
  const skillDir = path.join(SKILLS_DIR, skillName);
  const entries = walkCanonicalEntries(skillDir);
  const hash = crypto.createHash("sha256");
  let bytes = 0;
  let resourceFiles = 0;
  let largestResourceBytes = 0;
  let symlinks = 0;

  for (const entry of entries) {
    hash.update(entry.path);
    hash.update("\0");
    hash.update(entry.kind);
    hash.update("\0");
    if (entry.kind === "symlink") {
      symlinks += 1;
      hash.update(entry.target);
    } else {
      hash.update(entry.bytes);
      bytes += entry.bytes.length;
      if (entry.path !== "SKILL.md") {
        resourceFiles += 1;
        largestResourceBytes = Math.max(largestResourceBytes, entry.bytes.length);
      }
    }
    hash.update("\0");
  }

  return {
    digest: hash.digest("hex"),
    canonicalBytes: bytes,
    resourceFiles,
    largestResourceBytes,
    symlinks,
  };
}

function gitIdentity() {
  return {
    commit: run("git", ["rev-parse", "HEAD"], { capture: true }),
    tree: run("git", ["rev-parse", "HEAD^{tree}"], { capture: true }),
  };
}

function dependencyIdentity() {
  const raw = run("npm", ["ls", "--all", "--json"], { capture: true });
  const parsed = JSON.parse(raw);

  function normalize(node) {
    const normalized = {};
    if (typeof node.name === "string") normalized.name = node.name;
    if (typeof node.version === "string") normalized.version = node.version;
    if (node.dependencies && typeof node.dependencies === "object") {
      normalized.dependencies = Object.fromEntries(
        Object.entries(node.dependencies)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([name, dependency]) => [name, normalize(dependency)]),
      );
    }
    return normalized;
  }

  const normalized = normalize(parsed);
  const serialized = JSON.stringify(normalized);
  return { digest: sha256(serialized), tree: normalized };
}

function runUpstreamValidation(skillNames) {
  if (!available("skills-ref", ["--help"])) {
    return {
      status: "INCONCLUSIVE",
      authority: "agentskills/skills-ref",
      reason: "skills-ref executable is not available on this qualification surface",
    };
  }

  for (const skillName of skillNames) run("skills-ref", ["validate", path.join("skills", skillName)]);
  return { status: "PASS", authority: "agentskills/skills-ref", skills: skillNames.length };
}

function deterministicCatalog() {
  fs.rmSync(path.dirname(CATALOG_PATH), { recursive: true, force: true });
  run(process.execPath, ["scripts/generate_mcp_catalog.mjs"]);
  const first = fs.readFileSync(CATALOG_PATH);
  run(process.execPath, ["scripts/generate_mcp_catalog.mjs"]);
  const second = fs.readFileSync(CATALOG_PATH);
  if (!first.equals(second)) throw new Error("MCP catalog generation is not byte-for-byte deterministic");
  return { digest: sha256(first), bytes: first.length };
}

function buildIdentity() {
  const wranglerVersion = run("npx", ["--no-install", "wrangler", "--version"], { capture: true });
  const wranglerConfig = fs.readFileSync(path.join(ROOT, "wrangler.jsonc"), "utf8");
  const compatibilityDate = wranglerConfig.match(/"compatibility_date"\s*:\s*"([^"]+)"/)?.[1] ?? null;
  return {
    node: process.version,
    wrangler: wranglerVersion,
    compatibilityDate,
    packageJsonDigest: sha256(fs.readFileSync(path.join(ROOT, "package.json"))),
  };
}

function main() {
  const skillNames = sortedSkillNames();
  const python = findPython();

  run(python, ["scripts/validate_skills.py"]);
  const upstreamSpecValidation = runUpstreamValidation(skillNames);
  const catalog = deterministicCatalog();

  run(process.execPath, ["--test", "tests/structural-conformance.test.mjs", "worker/index.test.mjs"]);

  fs.rmSync(BUILD_OUT, { recursive: true, force: true });
  run("npx", ["--no-install", "wrangler", "deploy", "--dry-run", "--outdir", BUILD_OUT]);
  const postBuildCatalog = fs.readFileSync(CATALOG_PATH);
  if (sha256(postBuildCatalog) !== catalog.digest) throw new Error("build dry-run changed the deterministic catalog identity");
  fs.rmSync(BUILD_OUT, { recursive: true, force: true });

  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, ".codex-plugin", "plugin.json"), "utf8"));
  const packages = Object.fromEntries(skillNames.map((skillName) => [skillName, packageIdentity(skillName)]));
  const totals = Object.values(packages).reduce((acc, item) => ({
    canonicalBytes: acc.canonicalBytes + item.canonicalBytes,
    resourceFiles: acc.resourceFiles + item.resourceFiles,
    largestResourceBytes: Math.max(acc.largestResourceBytes, item.largestResourceBytes),
    symlinks: acc.symlinks + item.symlinks,
  }), { canonicalBytes: 0, resourceFiles: 0, largestResourceBytes: 0, symlinks: 0 });

  const report = {
    status: "PASS",
    source: gitIdentity(),
    pluginVersion: manifest.version,
    skillCount: skillNames.length,
    canonicalPackages: packages,
    generatedCatalog: catalog,
    resolvedDependencies: dependencyIdentity(),
    build: buildIdentity(),
    resourceEnvelope: totals,
    upstreamSpecValidation,
    deploymentIdentity: "NOT_USED",
    checks: {
      canonicalPackageValidation: "PASS",
      deterministicRebuild: "PASS",
      canonicalProjectionParity: "PASS",
      workerProtocolMatrix: "PASS",
      malformedAndResourceBoundaryChecks: "PASS",
      buildDryRun: "PASS",
    },
  };

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

main();
