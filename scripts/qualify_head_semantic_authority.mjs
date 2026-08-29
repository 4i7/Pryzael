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

function validatePackageName(name, context) {
  if (typeof name !== "string" || !PACKAGE_PATTERN.test(name)) {
    throw new Error(`invalid ${context} canonical package name: ${String(name)}`);
  }
}

function validatePackageTreeMap(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("HEAD semantic authority baselineCanonicalPackageTrees must be an object");
  }

  const names = Object.keys(value);
  const sortedNames = [...names].sort(ordinalCompare);
  if (names.length === 0) {
    throw new Error("HEAD semantic authority baselineCanonicalPackageTrees must not be empty");
  }
  if (JSON.stringify(names) !== JSON.stringify(sortedNames)) {
    throw new Error("HEAD semantic authority baselineCanonicalPackageTrees must use deterministic ordinal ordering");
  }

  for (const name of names) {
    validatePackageName(name, "baseline");
    if (!SHA1_PATTERN.test(value[name] ?? "")) {
      throw new Error(`HEAD semantic authority baseline package tree must be a Git SHA-1: ${name}`);
    }
  }

  return Object.fromEntries(names.map((name) => [name, value[name]]));
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

  const baselineCanonicalPackageTrees = validatePackageTreeMap(authority.baselineCanonicalPackageTrees);

  if (!Array.isArray(authority.admittedCanonicalPackages)) {
    throw new Error("HEAD semantic authority admittedCanonicalPackages must be an array");
  }

  const admitted = [...authority.admittedCanonicalPackages];
  for (const name of admitted) validatePackageName(name, "admitted");
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
    baselineCanonicalPackageTrees,
    admittedCanonicalPackages: admitted,
  };
}

function currentCanonicalPackageTrees(cwd) {
  const output = runGit(cwd, ["ls-tree", "HEAD:skills"]);
  const packageTrees = {};

  for (const line of output.split("\n").filter(Boolean)) {
    const match = line.match(/^040000 tree ([0-9a-f]{40})\t(.+)$/);
    if (!match) {
      throw new Error(`canonical skills tree contains a non-package entry: ${line}`);
    }
    const [, treeSha, name] = match;
    validatePackageName(name, "current");
    packageTrees[name] = treeSha;
  }

  return Object.fromEntries(
    Object.entries(packageTrees).sort(([a], [b]) => ordinalCompare(a, b)),
  );
}

function samePackageTreeMap(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function changedPackagesFromTrees(baseline, current) {
  const names = [...new Set([...Object.keys(baseline), ...Object.keys(current)])].sort(ordinalCompare);
  return names.filter((name) => baseline[name] !== current[name]);
}

export function qualifyHeadSemanticAuthority({ cwd = ROOT, authority }) {
  const normalized = validateHeadSemanticAuthority(authority);
  const currentTree = runGit(cwd, ["rev-parse", "HEAD:skills"]);
  if (!SHA1_PATTERN.test(currentTree)) {
    throw new Error(`current canonical Skill tree is not a Git SHA-1: ${currentTree}`);
  }

  const currentPackageTrees = currentCanonicalPackageTrees(cwd);
  if (
    currentTree === normalized.baselineCanonicalSkillTree &&
    !samePackageTreeMap(currentPackageTrees, normalized.baselineCanonicalPackageTrees)
  ) {
    throw new Error("HEAD semantic authority baseline package identities do not reconstruct the baseline canonical Skill tree contents");
  }

  const changedPackages = changedPackagesFromTrees(
    normalized.baselineCanonicalPackageTrees,
    currentPackageTrees,
  );
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
