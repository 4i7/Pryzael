import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  PINNED_SKILLS_REF,
  assertFrozenR1Contract,
  assertPinnedSkillsRefIdentity,
  canonicalPackageIdentity,
  catalogFileIdentity,
  ordinalCompare,
  sha256,
} from "./r1_qualification_invariants.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_DIR = path.join(ROOT, "skills");
const CATALOG_PATH = path.join(ROOT, "worker", "generated", "catalog.mjs");
const FROZEN_CONTRACT_PATH = path.join(ROOT, "tests", "fixtures", "r1-qualified-contract.json");
const REPORT_PATH = path.join(ROOT, "dist", "r1-qualification.json");
const BUILD_OUT = path.join(ROOT, ".qualification-dist");
const UPSTREAM_VENV = path.join(ROOT, ".qualification-python");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    shell: false,
    env: options.env ?? process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = options.capture ? `\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}` : "";
    throw new Error(`${command} ${args.join(" ")} exited ${result.status}${detail}`);
  }
  return options.capture ? result.stdout.trim() : "";
}

function runNpm(args, options = {}) {
  const npmExecPath = process.env.npm_execpath;
  if (npmExecPath && fs.existsSync(npmExecPath)) {
    return run(process.execPath, [npmExecPath, ...args], options);
  }
  const command = process.platform === "win32" ? "npm.cmd" : "npm";
  return run(command, args, options);
}

function packageBin(packageName, binName) {
  const packageDir = path.join(ROOT, "node_modules", ...packageName.split("/"));
  const manifestPath = path.join(packageDir, "package.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const relative = typeof manifest.bin === "string" ? manifest.bin : manifest.bin?.[binName];
  if (typeof relative !== "string" || relative.length === 0) {
    throw new Error(`${packageName}: missing ${binName} package binary`);
  }
  const executable = path.resolve(packageDir, relative);
  if (!fs.statSync(executable).isFile()) {
    throw new Error(`${packageName}: package binary is unavailable: ${executable}`);
  }
  return executable;
}

function available(command, args = ["--version"]) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: "ignore",
    shell: false,
  });
  return !result.error && result.status === 0;
}

function findPython() {
  for (const candidate of [process.env.PYTHON, "python3", "python"].filter(Boolean)) {
    if (available(candidate)) return candidate;
  }
  throw new Error("Python is required for R1 qualification");
}

function sortedSkillNames() {
  return fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort(ordinalCompare);
}

function establishLockedDependencies() {
  runNpm(["ci", "--ignore-scripts", "--no-audit", "--no-fund"]);
}

function venvPythonPath() {
  return process.platform === "win32"
    ? path.join(UPSTREAM_VENV, "Scripts", "python.exe")
    : path.join(UPSTREAM_VENV, "bin", "python");
}

function venvSkillsRefPath() {
  return process.platform === "win32"
    ? path.join(UPSTREAM_VENV, "Scripts", "skills-ref.exe")
    : path.join(UPSTREAM_VENV, "bin", "skills-ref");
}

function establishPinnedUpstreamValidation(systemPython, skillNames) {
  fs.rmSync(UPSTREAM_VENV, { recursive: true, force: true });
  run(systemPython, ["-m", "venv", UPSTREAM_VENV]);

  const python = venvPythonPath();
  if (!fs.statSync(python).isFile()) {
    throw new Error(`qualification venv Python is unavailable: ${python}`);
  }

  const requirement =
    `git+${PINNED_SKILLS_REF.repository}@${PINNED_SKILLS_REF.commit}` +
    `#subdirectory=${PINNED_SKILLS_REF.subdirectory}`;
  run(python, [
    "-m", "pip", "install",
    "--disable-pip-version-check",
    "--no-input",
    requirement,
  ]);

  const probe = [
    "import importlib.metadata as m, json",
    "d=m.distribution('skills-ref')",
    "raw=d.read_text('direct_url.json')",
    "print(json.dumps({'version': d.version, 'directUrl': json.loads(raw) if raw else None}))",
  ].join("; ");
  const installedIdentity = JSON.parse(run(python, ["-c", probe], { capture: true }));
  const pinnedIdentity = assertPinnedSkillsRefIdentity(installedIdentity);

  const executable = venvSkillsRefPath();
  if (!fs.statSync(executable).isFile()) {
    throw new Error(`required pinned skills-ref executable is unavailable: ${executable}`);
  }

  for (const skillName of skillNames) {
    run(executable, ["validate", path.join("skills", skillName)]);
  }

  return {
    status: "PASS",
    authority: "agentskills/skills-ref",
    version: pinnedIdentity.version,
    repository: pinnedIdentity.repository,
    subdirectory: pinnedIdentity.subdirectory,
    commit: pinnedIdentity.commit,
    skills: skillNames.length,
  };
}

export function assertCurrentCatalogMatchesGenerated(currentBytes, generatedBytes) {
  const current = Buffer.isBuffer(currentBytes) ? currentBytes : Buffer.from(currentBytes);
  const generated = Buffer.isBuffer(generatedBytes) ? generatedBytes : Buffer.from(generatedBytes);
  if (!current.equals(generated)) {
    throw new Error("generated MCP catalog is stale or was modified independently of canonical Skill source");
  }
  return true;
}

function deterministicCatalog() {
  const existing = fs.existsSync(CATALOG_PATH) && fs.statSync(CATALOG_PATH).isFile()
    ? fs.readFileSync(CATALOG_PATH)
    : null;

  run(process.execPath, ["scripts/generate_mcp_catalog.mjs"]);
  const first = fs.readFileSync(CATALOG_PATH);
  if (existing !== null) {
    try {
      assertCurrentCatalogMatchesGenerated(existing, first);
    } catch (error) {
      fs.writeFileSync(CATALOG_PATH, existing);
      throw error;
    }
  }

  run(process.execPath, ["scripts/generate_mcp_catalog.mjs"]);
  const second = fs.readFileSync(CATALOG_PATH);
  if (!first.equals(second)) {
    throw new Error("MCP catalog generation is not byte-for-byte deterministic");
  }
  return catalogFileIdentity(CATALOG_PATH);
}

function normalizeDependencyTree(node) {
  const normalized = {};
  if (typeof node.name === "string") normalized.name = node.name;
  if (typeof node.version === "string") normalized.version = node.version;
  if (node.dependencies && typeof node.dependencies === "object") {
    normalized.dependencies = Object.fromEntries(
      Object.entries(node.dependencies)
        .sort(([a], [b]) => ordinalCompare(a, b))
        .map(([name, dependency]) => [name, normalizeDependencyTree(dependency)]),
    );
  }
  return normalized;
}

function dependencyIdentity() {
  const lockPath = path.join(ROOT, "package-lock.json");
  const lockBytes = fs.readFileSync(lockPath);
  const lock = JSON.parse(lockBytes);
  const installed = JSON.parse(runNpm(["ls", "--all", "--json"], { capture: true }));
  const normalized = normalizeDependencyTree(installed);
  const serialized = JSON.stringify(normalized);

  return {
    authority: {
      path: "package-lock.json",
      lockfileVersion: lock.lockfileVersion,
      sha256: sha256(lockBytes),
      gitBlob: run("git", ["hash-object", "package-lock.json"], { capture: true }),
    },
    observedExecutionEnvironment: {
      digest: sha256(serialized),
      tree: normalized,
    },
  };
}

function gitIdentity() {
  return {
    commit: run("git", ["rev-parse", "HEAD"], { capture: true }),
    tree: run("git", ["rev-parse", "HEAD^{tree}"], { capture: true }),
  };
}

function buildIdentity(wranglerBin) {
  const wranglerVersion = run(process.execPath, [wranglerBin, "--version"], { capture: true });
  const wranglerConfig = fs.readFileSync(path.join(ROOT, "wrangler.jsonc"), "utf8");
  const compatibilityDate = wranglerConfig.match(/"compatibility_date"\s*:\s*"([^"]+)"/)?.[1] ?? null;
  return {
    node: process.version,
    wrangler: wranglerVersion,
    compatibilityDate,
    packageJsonDigest: sha256(fs.readFileSync(path.join(ROOT, "package.json"))),
  };
}

function qualificationMode() {
  const args = process.argv.slice(2);
  if (args.length === 0) return { frozen: false };
  if (args.length === 1 && args[0] === "--frozen") return { frozen: true };
  throw new Error(`unsupported R1 qualification arguments: ${args.join(" ")}`);
}

function main() {
  const mode = qualificationMode();
  fs.rmSync(REPORT_PATH, { force: true });
  fs.rmSync(BUILD_OUT, { recursive: true, force: true });

  const skillNames = sortedSkillNames();
  const python = findPython();

  establishLockedDependencies();
  const wranglerBin = packageBin("wrangler", "wrangler");

  run(process.execPath, ["scripts/validate_skills.mjs"]);
  run(process.execPath, ["--test", "tests/skill-package-contract.test.mjs"]);
  run(process.execPath, ["--test", "tests/qualification-gates.test.mjs"]);

  const upstreamSpecValidation = establishPinnedUpstreamValidation(python, skillNames);
  const catalog = deterministicCatalog();

  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, ".codex-plugin", "plugin.json"), "utf8"));
  const packages = Object.fromEntries(
    skillNames.map((skillName) => [
      skillName,
      canonicalPackageIdentity(path.join(SKILLS_DIR, skillName)),
    ]),
  );

  let historicalR1ArtifactIdentity = null;
  if (mode.frozen) {
    const frozenContract = JSON.parse(fs.readFileSync(FROZEN_CONTRACT_PATH, "utf8"));
    const skillsTreeGitSha = run("git", ["rev-parse", "HEAD:skills"], { capture: true });
    assertFrozenR1Contract({
      fixture: frozenContract,
      pluginVersion: manifest.version,
      skillNames,
      packageIdentities: packages,
      catalogIdentity: catalog,
      skillsTreeGitSha,
    });
    historicalR1ArtifactIdentity = {
      status: "PASS",
      fixture: "tests/fixtures/r1-qualified-contract.json",
      provenance: frozenContract.provenance,
    };
  }

  run(process.execPath, [
    "--test",
    "tests/structural-conformance.test.mjs",
    "worker/index.test.mjs",
  ]);

  fs.rmSync(BUILD_OUT, { recursive: true, force: true });
  run(process.execPath, [
    wranglerBin,
    "deploy",
    "--dry-run",
    "--outdir",
    BUILD_OUT,
  ]);
  const postBuildCatalog = catalogFileIdentity(CATALOG_PATH);
  if (postBuildCatalog.digest !== catalog.digest || postBuildCatalog.bytes !== catalog.bytes) {
    throw new Error("build dry-run changed the deterministic catalog identity");
  }
  fs.rmSync(BUILD_OUT, { recursive: true, force: true });

  const totals = Object.values(packages).reduce(
    (acc, item) => ({
      canonicalBytes: acc.canonicalBytes + item.canonicalBytes,
      resourceFiles: acc.resourceFiles + item.resourceFiles,
      largestResourceBytes: Math.max(acc.largestResourceBytes, item.largestResourceBytes),
      symlinks: acc.symlinks + item.symlinks,
    }),
    { canonicalBytes: 0, resourceFiles: 0, largestResourceBytes: 0, symlinks: 0 },
  );

  const checks = {
    canonicalPackageValidation: "PASS",
    parserContractFixtures: "PASS",
    pinnedIndependentUpstreamValidation: "PASS",
    validatorRegressionTests: "PASS",
    generation: "PASS",
    freshness: "PASS",
    deterministicGeneration: "PASS",
    canonicalProjectionConformance: "PASS",
    workerProtocolTests: "PASS",
    malformedAndResourceBoundaryTests: "PASS",
    wranglerBuildDryRun: "PASS",
  };
  if (mode.frozen) checks.historicalR1ArtifactIdentity = "PASS";

  const report = {
    status: "PASS",
    claim: "STRUCTURAL_PROJECTION_CONFORMANCE",
    qualificationCommand: mode.frozen ? "npm run qualify:r1:frozen" : "npm run qualify:r1",
    source: gitIdentity(),
    pluginVersion: manifest.version,
    skillCount: skillNames.length,
    canonicalPackages: packages,
    generatedCatalog: catalog,
    dependencies: dependencyIdentity(),
    build: buildIdentity(wranglerBin),
    resourceEnvelope: totals,
    upstreamSpecValidation,
    deploymentIdentity: "NOT_USED",
    checks,
  };
  if (historicalR1ArtifactIdentity) {
    report.historicalR1ArtifactIdentity = historicalR1ArtifactIdentity;
  }

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
