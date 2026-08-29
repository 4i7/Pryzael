import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  PINNED_SKILLS_REF,
  assertFrozenR1Contract,
  assertPinnedSkillsRefIdentity,
} from "../scripts/r1_qualification_invariants.mjs";
import {
  qualifyHeadSemanticAuthority,
  validateHeadSemanticAuthority,
} from "../scripts/qualify_head_semantic_authority.mjs";
import { assertCurrentCatalogMatchesGenerated } from "../scripts/qualify_r1.mjs";
import {
  parseCanonicalSkillMarkdown,
  projectCanonicalSkill,
} from "../scripts/skill_package.mjs";
import { validateSkill } from "../scripts/validate_skills.mjs";

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

function frozenActual(fixture = FROZEN) {
  const packageIdentities = Object.fromEntries(
    Object.entries(FROZEN.canonicalPackageDigests).map(([name, digest]) => [name, { digest }]),
  );
  return {
    fixture,
    pluginVersion: FROZEN.provenance.pluginVersion,
    skillNames: Object.keys(FROZEN.canonicalPackageDigests),
    packageIdentities,
    catalogIdentity: { ...FROZEN.generatedCatalog },
    skillsTreeGitSha: FROZEN.provenance.skillsTreeGitSha,
  };
}

function runGit(cwd, args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  }
  return result.stdout.trim();
}

function skillMarkdown(name, body = "Original fixture body.") {
  return `---\nname: ${name}\ndescription: "${name} fixture."\n---\n\n${body}\n`;
}

function commitAll(cwd, message) {
  runGit(cwd, ["add", "-A"]);
  runGit(cwd, ["commit", "-q", "-m", message]);
}

function withAuthorityRepo(callback) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pryzael-head-authority-"));
  try {
    runGit(root, ["init", "-q"]);
    runGit(root, ["config", "user.name", "Pryzael Test"]);
    runGit(root, ["config", "user.email", "pryzael-test@example.invalid"]);

    for (const name of ["architect", "prove-it-works"]) {
      const skillDir = path.join(root, "skills", name);
      fs.mkdirSync(skillDir, { recursive: true });
      fs.writeFileSync(path.join(skillDir, "SKILL.md"), skillMarkdown(name), "utf8");
    }
    commitAll(root, "baseline");

    const baselineCanonicalSkillTree = runGit(root, ["rev-parse", "HEAD:skills"]);
    const authority = {
      schemaVersion: 1,
      baselineCanonicalSkillTree,
      admittedCanonicalPackages: ["architect"],
    };
    return callback({ root, authority, baselineCanonicalSkillTree });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function withValidationSkill(markdown, callback) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pryzael-validation-"));
  try {
    const skillDir = path.join(root, "demo-skill");
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, "SKILL.md"), markdown, "utf8");
    fs.writeFileSync(path.join(skillDir, "LICENSE.pstack.txt"), "fixture\n", "utf8");
    return callback(skillDir);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test("required upstream identity rejects unavailable validator metadata", () => {
  assert.throws(() => assertPinnedSkillsRefIdentity(null), /identity is unavailable/);
});

test("required upstream identity rejects wrong version", () => {
  const identity = validUpstreamIdentity();
  identity.version = "0.1.1";
  assert.throws(() => assertPinnedSkillsRefIdentity(identity), /version mismatch/);
});

test("required upstream identity rejects wrong repository or commit", () => {
  const wrongRepository = validUpstreamIdentity();
  wrongRepository.directUrl.url = "https://github.com/example/skills-ref.git";
  assert.throws(() => assertPinnedSkillsRefIdentity(wrongRepository), /repository mismatch/);

  const wrongCommit = validUpstreamIdentity();
  wrongCommit.directUrl.vcs_info.commit_id = "0000000000000000000000000000000000000000";
  assert.throws(() => assertPinnedSkillsRefIdentity(wrongCommit), /commit mismatch/);
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

test("historical R1 oracle accepts the exact qualified identities", () => {
  assert.equal(assertFrozenR1Contract(frozenActual()), true);
});

test("historical R1 oracle rejects modified provenance", () => {
  const fixture = structuredClone(FROZEN);
  fixture.provenance.frozenBaseSha = "0".repeat(40);
  assert.throws(() => assertFrozenR1Contract(frozenActual(fixture)), /provenance was modified/);
});

test("historical R1 oracle rejects plugin and skills-tree identity drift", () => {
  const plugin = frozenActual();
  plugin.pluginVersion = "9.9.9";
  assert.throws(() => assertFrozenR1Contract(plugin), /plugin version drift/);

  const tree = frozenActual();
  tree.skillsTreeGitSha = "0".repeat(40);
  assert.throws(() => assertFrozenR1Contract(tree), /skills tree drift/);
});

test("historical R1 oracle rejects canonical package semantic drift", () => {
  const actual = frozenActual();
  actual.packageIdentities.architect = { digest: "0".repeat(64) };
  assert.throws(() => assertFrozenR1Contract(actual), /canonical package drift: architect/);
});

test("historical R1 oracle rejects generated projection drift", () => {
  const actual = frozenActual();
  actual.catalogIdentity.digest = "f".repeat(64);
  assert.throws(() => assertFrozenR1Contract(actual), /generated catalog drift/);
});

test("HEAD semantic authority data is generic, deterministic, and package-scoped", () => {
  assert.deepEqual(
    validateHeadSemanticAuthority({
      schemaVersion: 1,
      baselineCanonicalSkillTree: "1".repeat(40),
      admittedCanonicalPackages: ["architect"],
    }),
    {
      schemaVersion: 1,
      baselineCanonicalSkillTree: "1".repeat(40),
      admittedCanonicalPackages: ["architect"],
    },
  );
  assert.throws(
    () => validateHeadSemanticAuthority({
      schemaVersion: 1,
      baselineCanonicalSkillTree: "1".repeat(40),
      admittedCanonicalPackages: ["prove-it-works", "architect"],
    }),
    /deterministic ordinal ordering/,
  );
  assert.throws(
    () => validateHeadSemanticAuthority({
      schemaVersion: 1,
      baselineCanonicalSkillTree: "1".repeat(40),
      admittedCanonicalPackages: ["skills\/architect"],
    }),
    /invalid admitted canonical package name/,
  );
});

test("admitted architect semantic mutation passes HEAD authority without requiring historical R1 equality", () => {
  withAuthorityRepo(({ root, authority }) => {
    fs.writeFileSync(
      path.join(root, "skills", "architect", "SKILL.md"),
      skillMarkdown("architect", "Legitimate later semantic phase body."),
      "utf8",
    );
    commitAll(root, "mutate architect");

    const report = qualifyHeadSemanticAuthority({ cwd: root, authority });
    assert.deepEqual(report.changedCanonicalPackages, ["architect"]);
    assert.equal(report.status, "PASS");
  });

  const historical = frozenActual();
  historical.packageIdentities.architect = { digest: "0".repeat(64) };
  assert.throws(() => assertFrozenR1Contract(historical), /canonical package drift: architect/);
});

test("admitted architect resource mutation is authorized at package-subtree granularity", () => {
  withAuthorityRepo(({ root, authority }) => {
    const resource = path.join(root, "skills", "architect", "references", "fixture.md");
    fs.mkdirSync(path.dirname(resource), { recursive: true });
    fs.writeFileSync(resource, "fixture resource\n", "utf8");
    commitAll(root, "add architect resource");

    const report = qualifyHeadSemanticAuthority({ cwd: root, authority });
    assert.deepEqual(report.changedCanonicalPackages, ["architect"]);
    assert.ok(report.changedCanonicalPaths.includes("architect/references/fixture.md"));
  });
});

test("non-admitted canonical package semantic mutation fails HEAD authority", () => {
  withAuthorityRepo(({ root, authority }) => {
    fs.writeFileSync(
      path.join(root, "skills", "prove-it-works", "SKILL.md"),
      skillMarkdown("prove-it-works", "Unauthorized semantic mutation."),
      "utf8",
    );
    commitAll(root, "mutate non-admitted package");
    assert.throws(
      () => qualifyHeadSemanticAuthority({ cwd: root, authority }),
      /not admitted.*prove-it-works/,
    );
  });
});

test("top-level Skill additions, deletions, and renames fail closed unless the affected packages are admitted", async (t) => {
  await t.test("addition", () => withAuthorityRepo(({ root, authority }) => {
    const added = path.join(root, "skills", "new-skill");
    fs.mkdirSync(added, { recursive: true });
    fs.writeFileSync(path.join(added, "SKILL.md"), skillMarkdown("new-skill"), "utf8");
    commitAll(root, "add skill");
    assert.throws(() => qualifyHeadSemanticAuthority({ cwd: root, authority }), /new-skill/);
  }));

  await t.test("deletion", () => withAuthorityRepo(({ root, authority }) => {
    fs.rmSync(path.join(root, "skills", "prove-it-works"), { recursive: true, force: true });
    commitAll(root, "delete skill");
    assert.throws(() => qualifyHeadSemanticAuthority({ cwd: root, authority }), /prove-it-works/);
  }));

  await t.test("rename", () => withAuthorityRepo(({ root, authority }) => {
    fs.renameSync(path.join(root, "skills", "architect"), path.join(root, "skills", "architect-next"));
    commitAll(root, "rename skill");
    assert.throws(() => qualifyHeadSemanticAuthority({ cwd: root, authority }), /architect-next/);
  }));
});

test("projection freshness accepts regenerated current bytes and rejects stale projection", () => {
  const regenerated = Buffer.from("generated-from-current-canonical-source\n");
  assert.equal(assertCurrentCatalogMatchesGenerated(regenerated, regenerated), true);
  assert.throws(
    () => assertCurrentCatalogMatchesGenerated(Buffer.from("old projection\n"), regenerated),
    /stale or was modified independently/,
  );
});

test("generated-only semantic drift is rejected when canonical source is unchanged", () => {
  const canonicalProjection = Buffer.from("canonical projection\n");
  const manuallyChangedProjection = Buffer.from("manual generated semantic change\n");
  assert.throws(
    () => assertCurrentCatalogMatchesGenerated(manuallyChangedProjection, canonicalProjection),
    /stale or was modified independently/,
  );
});

test("shared parser continues to reject malformed canonical package syntax", () => {
  const parsed = parseCanonicalSkillMarkdown(
    "name: demo-skill\ndescription: missing opening delimiter\n---\nBody\n",
  );
  assert.ok(parsed.errors.some((error) => error.includes("missing opening YAML frontmatter delimiter")));
  assert.throws(
    () => projectCanonicalSkill(parsed, "demo-skill"),
    /missing opening YAML frontmatter delimiter/,
  );
});

test("validator continues to reject broken owner-local resource references", () => {
  withValidationSkill(
    "---\nname: demo-skill\ndescription: \"fixture\"\n---\n\nConsult `references/missing.md`.\n",
    (skillDir) => {
      assert.ok(validateSkill(skillDir).includes("broken local resource reference: references/missing.md"));
    },
  );
});

test("public R4C CURRENT comparator remains immutably documented", () => {
  const evaluation = fs.readFileSync(path.join(ROOT, "docs", "EVALUATION.md"), "utf8");
  assert.match(evaluation, /3bba19e0be936e7b9d3554ac737d32f5cf84c846/);
  assert.match(evaluation, /29c3d97126d0f11de8d5c89dddf21f23d861f257/);
  assert.match(evaluation, /4395ef86a309ed610f4860f47284d0e4da572914/);
});
