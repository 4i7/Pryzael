import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  PINNED_SKILLS_REF,
  assertFrozenR1Contract,
  assertPinnedSkillsRefIdentity,
} from "../scripts/r1_qualification_invariants.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FROZEN = JSON.parse(
  fs.readFileSync(path.join(ROOT, "tests", "fixtures", "r1-qualified-contract.json"), "utf8"),
);

function validUpstreamIdentity() {
  return {
    version: PINNED_SKILLS_REF.version,
    directUrl: {
      url: PINNED_SKILLS_REF.repository,
      subdirectory: PINNED_SKILLS_REF.subdirectory,
      vcs_info: {
        vcs: "git",
        commit_id: PINNED_SKILLS_REF.commit,
        requested_revision: PINNED_SKILLS_REF.commit,
      },
    },
  };
}

function frozenActual() {
  const packageIdentities = Object.fromEntries(
    Object.entries(FROZEN.canonicalPackageDigests).map(([name, digest]) => [name, { digest }]),
  );
  return {
    fixture: FROZEN,
    pluginVersion: FROZEN.provenance.pluginVersion,
    skillNames: Object.keys(FROZEN.canonicalPackageDigests),
    packageIdentities,
    catalogIdentity: { ...FROZEN.generatedCatalog },
    skillsTreeGitSha: FROZEN.provenance.skillsTreeGitSha,
  };
}

test("required upstream identity rejects unavailable validator metadata", () => {
  assert.throws(
    () => assertPinnedSkillsRefIdentity(null),
    /identity is unavailable/,
  );
});

test("required upstream identity rejects wrong version", () => {
  const identity = validUpstreamIdentity();
  identity.version = "0.1.1";
  assert.throws(
    () => assertPinnedSkillsRefIdentity(identity),
    /version mismatch/,
  );
});

test("required upstream identity rejects wrong repository or commit", () => {
  const wrongRepository = validUpstreamIdentity();
  wrongRepository.directUrl.url = "https://github.com/example/skills-ref.git";
  assert.throws(
    () => assertPinnedSkillsRefIdentity(wrongRepository),
    /repository mismatch/,
  );

  const wrongCommit = validUpstreamIdentity();
  wrongCommit.directUrl.vcs_info.commit_id = "0000000000000000000000000000000000000000";
  assert.throws(
    () => assertPinnedSkillsRefIdentity(wrongCommit),
    /commit mismatch/,
  );
});

test("required upstream identity accepts only the pinned artifact", () => {
  assert.deepEqual(
    assertPinnedSkillsRefIdentity(validUpstreamIdentity()),
    {
      version: PINNED_SKILLS_REF.version,
      repository: PINNED_SKILLS_REF.repository,
      subdirectory: PINNED_SKILLS_REF.subdirectory,
      commit: PINNED_SKILLS_REF.commit,
    },
  );
});

test("frozen R1 contract rejects canonical package semantic drift", () => {
  const actual = frozenActual();
  actual.packageIdentities.architect = { digest: "0".repeat(64) };
  assert.throws(
    () => assertFrozenR1Contract(actual),
    /canonical package drift: architect/,
  );
});

test("frozen R1 contract rejects generated projection drift", () => {
  const actual = frozenActual();
  actual.catalogIdentity.digest = "f".repeat(64);
  assert.throws(
    () => assertFrozenR1Contract(actual),
    /generated catalog drift/,
  );
});

test("frozen R1 contract accepts the exact qualified identities", () => {
  assert.equal(assertFrozenR1Contract(frozenActual()), true);
});
