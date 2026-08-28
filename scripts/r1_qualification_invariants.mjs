import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const PINNED_SKILLS_REF = Object.freeze({
  repository: "https://github.com/agentskills/agentskills.git",
  subdirectory: "skills-ref",
  version: "0.1.0",
  commit: "69ef37e9424c0a7ea9dd2293b559e43ec8176379",
});

export const FROZEN_R1_PROVENANCE = Object.freeze({
  frozenBaseSha: "fe1e304c34f6594c9c5cedbd1e6597dad08754c7",
  reviewedQualificationHeadSha: "19df52175fcc94e99ee14ac7993c59e28562aa2c",
  skillsTreeGitSha: "4395ef86a309ed610f4860f47284d0e4da572914",
  pluginVersion: "0.3.0",
});

export const RESOURCE_ROOTS = Object.freeze(["references", "assets", "scripts"]);

export function ordinalCompare(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function canonicalPackageIdentity(skillDir) {
  const entries = [];

  const visit = (absolute, relative) => {
    const stat = fs.lstatSync(absolute);
    if (stat.isSymbolicLink()) {
      entries.push({ path: relative, kind: "symlink", target: fs.readlinkSync(absolute) });
      return;
    }
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(absolute).sort(ordinalCompare)) {
        visit(path.join(absolute, name), path.posix.join(relative, name));
      }
      return;
    }
    if (stat.isFile()) {
      entries.push({ path: relative, kind: "file", bytes: fs.readFileSync(absolute) });
    }
  };

  visit(path.join(skillDir, "SKILL.md"), "SKILL.md");
  for (const root of RESOURCE_ROOTS) {
    const absolute = path.join(skillDir, root);
    if (fs.existsSync(absolute)) visit(absolute, root);
  }

  const hash = crypto.createHash("sha256");
  let canonicalBytes = 0;
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
      canonicalBytes += entry.bytes.length;
      if (entry.path !== "SKILL.md") {
        resourceFiles += 1;
        largestResourceBytes = Math.max(largestResourceBytes, entry.bytes.length);
      }
    }
    hash.update("\0");
  }

  return {
    digest: hash.digest("hex"),
    canonicalBytes,
    resourceFiles,
    largestResourceBytes,
    symlinks,
  };
}

export function catalogFileIdentity(catalogPath) {
  const bytes = fs.readFileSync(catalogPath);
  return {
    digest: sha256(bytes),
    bytes: bytes.length,
  };
}

export function assertPinnedSkillsRefIdentity(identity) {
  if (!identity || typeof identity !== "object") {
    throw new Error("required pinned skills-ref identity is unavailable");
  }
  if (identity.version !== PINNED_SKILLS_REF.version) {
    throw new Error(`skills-ref version mismatch: expected ${PINNED_SKILLS_REF.version}, got ${identity.version ?? "missing"}`);
  }

  const directUrl = identity.directUrl;
  const vcs = directUrl?.vcs_info;
  if (!directUrl || typeof directUrl !== "object") {
    throw new Error("skills-ref direct_url provenance is unavailable");
  }
  if (directUrl.url !== PINNED_SKILLS_REF.repository) {
    throw new Error(`skills-ref repository mismatch: expected ${PINNED_SKILLS_REF.repository}, got ${directUrl.url ?? "missing"}`);
  }
  if (directUrl.subdirectory !== PINNED_SKILLS_REF.subdirectory) {
    throw new Error(`skills-ref subdirectory mismatch: expected ${PINNED_SKILLS_REF.subdirectory}, got ${directUrl.subdirectory ?? "missing"}`);
  }
  if (vcs?.vcs !== "git") {
    throw new Error(`skills-ref VCS mismatch: expected git, got ${vcs?.vcs ?? "missing"}`);
  }
  if (vcs.commit_id !== PINNED_SKILLS_REF.commit) {
    throw new Error(`skills-ref commit mismatch: expected ${PINNED_SKILLS_REF.commit}, got ${vcs?.commit_id ?? "missing"}`);
  }
  if (vcs.requested_revision !== PINNED_SKILLS_REF.commit) {
    throw new Error(`skills-ref requested revision mismatch: expected ${PINNED_SKILLS_REF.commit}, got ${vcs?.requested_revision ?? "missing"}`);
  }

  return {
    version: identity.version,
    repository: directUrl.url,
    subdirectory: directUrl.subdirectory,
    commit: vcs.commit_id,
  };
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function assertFrozenR1Contract({
  fixture,
  pluginVersion,
  skillNames,
  packageIdentities,
  catalogIdentity,
  skillsTreeGitSha,
}) {
  if (fixture?.schemaVersion !== 1) {
    throw new Error(`unsupported frozen R1 fixture schema: ${fixture?.schemaVersion ?? "missing"}`);
  }
  if (!sameJson(fixture.provenance, FROZEN_R1_PROVENANCE)) {
    throw new Error("frozen R1 fixture provenance was modified");
  }
  if (pluginVersion !== fixture.provenance.pluginVersion) {
    throw new Error(`frozen R1 plugin version drift: expected ${fixture.provenance.pluginVersion}, got ${pluginVersion}`);
  }
  if (skillsTreeGitSha !== undefined && skillsTreeGitSha !== fixture.provenance.skillsTreeGitSha) {
    throw new Error(`frozen R1 skills tree drift: expected ${fixture.provenance.skillsTreeGitSha}, got ${skillsTreeGitSha}`);
  }

  const sortedNames = [...skillNames].sort(ordinalCompare);
  const expectedNames = Object.keys(fixture.canonicalPackageDigests).sort(ordinalCompare);
  if (!sameJson(sortedNames, expectedNames)) {
    throw new Error(`frozen R1 Skill set drift: expected ${expectedNames.join(", ")}, got ${sortedNames.join(", ")}`);
  }

  for (const skillName of sortedNames) {
    const actualDigest = packageIdentities[skillName]?.digest;
    const expectedDigest = fixture.canonicalPackageDigests[skillName];
    if (actualDigest !== expectedDigest) {
      throw new Error(`frozen R1 canonical package drift: ${skillName}`);
    }
  }

  if (!sameJson(catalogIdentity, fixture.generatedCatalog)) {
    throw new Error(
      `frozen R1 generated catalog drift: expected ${JSON.stringify(fixture.generatedCatalog)}, got ${JSON.stringify(catalogIdentity)}`,
    );
  }

  return true;
}
