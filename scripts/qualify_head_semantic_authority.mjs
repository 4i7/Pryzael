import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { ordinalCompare } from "./r1_qualification_invariants.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const AUTHORITY_PATH = path.join(ROOT, "qualification", "head-semantic-authority.json");
const SHA1_PATTERN = /^[0-9a-f]{40}$/;
const PACKAGE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function runGit(cwd, args) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} exited ${result.status}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  }
  return result.stdout.trim();
}

export function validateHeadSemanticAuthority(authority) {
  if (!authority || typeof authority !== "object" || Array.isArray(authority)) {
    throw new Error("HEAD semantic authority must be a JSON object");
  }
  if (authority.schemaVersion !== 1) {
    throw new Error(`unsupported HEAD semantic authority schema: ${authority.schemaVersion ?? "missing"}`);
  }
  if (!SHA1_PATTERN.test(authority.baselineCanonicalSkillTree ?? "")) {
    throw new Error("HEAD semantic authority baselineCanonicalSkillTree must be a 40-character lowercase Git SHA-1");
  }
  if (!Array.isArray(authority.admittedCanonicalPackages)) {
    throw new Error("HEAD semantic authority admittedCanonicalPackages must be an array");
  }

  const admitted = [...authority.admittedCanonicalPackages];
  for (const name of admitted) {
    if (typeof name !== "string" || !PACKAGE_PATTERN.test(name)) {
      throw new Error(`invalid admitted canonical package name: ${String(name)}`);
    }
  }
  const sorted = [...admitted].sort(ordinalCompare);
  if (new Set(admitted).size !== admitted.length) {
    throw new Error("HEAD semantic authority admittedCanonicalPackages must not contain duplicates");
  }
  if (JSON.stringify(admitted) !== JSON.stringify(sorted)) {
    throw new Error("HEAD semantic authority admittedCanonicalPackages must use deterministic ordinal ordering");
  }

  return {
    schemaVersion: authority.schemaVersion,
    baselineCanonicalSkillTree: authority.baselineCanonicalSkillTree,
    admittedCanonicalPackages: admitted,
  };
}

function changedCanonicalPaths(cwd, baselineTree, currentTree) {
  if (baselineTree === currentTree) return [];

  runGit(cwd, ["cat-file", "-e", `${baselineTree}^{tree}`]);
  const output = runGit(cwd, [
    "diff",
    "--no-renames",
    "--name-only",
    baselineTree,
    currentTree,
  ]);
  return output.length === 0 ? [] : output.split("\n").filter(Boolean).sort(ordinalCompare);
}

function packageForChangedPath(relativePath) {
  const normalized = relativePath.replace(/\\/g, "/");
  const packageName = normalized.split("/", 1)[0];
  if (!packageName || packageName === "." || packageName === "..") {
    throw new Error(`unable to classify canonical Skill package path: ${relativePath}`);
  }
  return packageName;
}

export function qualifyHeadSemanticAuthority({ cwd = ROOT, authority }) {
  const normalized = validateHeadSemanticAuthority(authority);
  const currentTree = runGit(cwd, ["rev-parse", "HEAD:skills"]);
  if (!SHA1_PATTERN.test(currentTree)) {
    throw new Error(`current canonical Skill tree is not a Git SHA-1: ${currentTree}`);
  }

  const changedPaths = changedCanonicalPaths(
    cwd,
    normalized.baselineCanonicalSkillTree,
    currentTree,
  );
  const changedPackages = [...new Set(changedPaths.map(packageForChangedPath))].sort(ordinalCompare);
  const admitted = new Set(normalized.admittedCanonicalPackages);
  const unauthorized = changedPackages.filter((name) => !admitted.has(name));

  if (unauthorized.length > 0) {
    throw new Error(
      `canonical Skill package mutation is not admitted by HEAD semantic authority: ${unauthorized.join(", ")}`,
    );
  }

  return {
    status: "PASS",
    claim: "HEAD_SEMANTIC_MUTATION_AUTHORITY",
    baselineCanonicalSkillTree: normalized.baselineCanonicalSkillTree,
    currentCanonicalSkillTree: currentTree,
    admittedCanonicalPackages: normalized.admittedCanonicalPackages,
    changedCanonicalPackages: changedPackages,
    changedCanonicalPaths: changedPaths,
  };
}

function main() {
  const authority = JSON.parse(fs.readFileSync(AUTHORITY_PATH, "utf8"));
  const report = qualifyHeadSemanticAuthority({ authority });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
