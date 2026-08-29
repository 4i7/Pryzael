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
import {
  assertCurrentCatalogMatchesGenerated,
  assertGeneratedCatalogUntracked,
  qualifyEphemeralGeneratedCatalog,
} from "../scripts/qualify_r1.mjs";
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

function currentPackageTrees(cwd) {
  const entries = runGit(cwd, ["ls-tree", "HEAD:skills"])
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^040000 tree ([0-9a-f]{40})\t(.+)$/);
      assert.ok(match, `unexpected synthetic Skill tree entry: ${line}`);
      return [match[2], match[1]];
    });
  return Object.fromEntries(entries);
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
    const baselineCanonicalPackageTrees = currentPackageTrees(root);
    const authority = {
      schemaVersion: 1,
      baselineCanonicalSkillTree,
      baselineCanonicalPackageTrees,
      admittedCanonicalPackages: ["architect"],
    };
    return callback({ root, authority, baselineCanonicalSkillTree, baselineCanonicalPackageTrees });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function withGeneratedCatalogRepo(callback) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pryzael-generated-boundary-"));
  try {
    runGit(root, ["init", "-q"]);
    runGit(root, ["config", "user.name", "Pryzael Test"]);
    runGit(root, ["config", "user.email", "pryzael-test@example.invalid"]);
    fs.writeFileSync(path.join(root, ".gitignore"), "worker/generated/\n", "utf8");
    commitAll(root, "baseline");
    return callback({
      root,
      catalogPath: path.join(root, "worker", "generated", "catalog.mjs"),
      repoPath: "worker/generated/catalog.mjs",
    });
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
  const input = {
    schemaVersion: 1,
    baselineCanonicalSkillTree: "1".repeat(40),
    baselineCanonicalPackageTrees: {
      architect: "2".repeat(40),
    },
    admittedCanonicalPackages: ["architect"],
  };
  assert.deepEqual(validateHeadSemanticAuthority(input), input);

  assert.throws(() => validateHeadSemanticAuthority(null), /must be a JSON object/);
  assert.throws(
    () => validateHeadSemanticAuthority({ ...input, schemaVersion: 2 }),
    /unsupported HEAD semantic authority schema/,
  );
  assert.throws(
    () => validateHeadSemanticAuthority({ ...input, baselineCanonicalSkillTree: "not-a-sha" }),
    /40-character lowercase Git SHA-1/,
  );
  assert.throws(
    () => validateHeadSemanticAuthority({
      ...input,
      admittedCanonicalPackages: ["prove-it-works", "architect"],
    }),
    /deterministic ordinal ordering/,
  );
  assert.throws(
    () => validateHeadSemanticAuthority({
      ...input,
      admittedCanonicalPackages: ["architect", "architect"],
    }),
    /must not contain duplicates/,
  );
  assert.throws(
    () => validateHeadSemanticAuthority({
      ...input,
      admittedCanonicalPackages: ["skills/architect"],
    }),
    /invalid admitted canonical package name/,
  );
  assert.throws(
    () => validateHeadSemanticAuthority({
      ...input,
      baselineCanonicalPackageTrees: {
        "prove-it-works": "3".repeat(40),
        architect: "2".repeat(40),
      },
    }),
    /baselineCanonicalPackageTrees must use deterministic ordinal ordering/,
  );
});

test("HEAD authority always dereferences the declared baseline Skill tree from Git", async (t) => {
  await t.test("syntactically valid nonexistent baseline object fails", () => withAuthorityRepo(({ root, authority }) => {
    const nonexistent = structuredClone(authority);
    nonexistent.baselineCanonicalSkillTree = "f".repeat(40);
    assert.throws(
      () => qualifyHeadSemanticAuthority({ cwd: root, authority: nonexistent }),
      /git cat-file -t .* exited/,
    );
  }));

  await t.test("non-tree baseline object fails", () => withAuthorityRepo(({ root, authority }) => {
    const nonTree = structuredClone(authority);
    nonTree.baselineCanonicalSkillTree = runGit(root, ["rev-parse", "HEAD"]);
    assert.throws(
      () => qualifyHeadSemanticAuthority({ cwd: root, authority: nonTree }),
      /must resolve to a Git tree/,
    );
  }));

  await t.test("unexpected baseline tree structure fails", () => withAuthorityRepo(({ root, authority }) => {
    fs.writeFileSync(path.join(root, "skills", "README.md"), "not a package\n", "utf8");
    commitAll(root, "add malformed top-level skills entry");
    const malformed = structuredClone(authority);
    malformed.baselineCanonicalSkillTree = runGit(root, ["rev-parse", "HEAD:skills"]);
    assert.throws(
      () => qualifyHeadSemanticAuthority({ cwd: root, authority: malformed }),
      /baseline canonical Skill tree contains a non-package entry/,
    );
  }));
});

test("baseline package identities are reconstructed from Git on every HEAD-authority qualification", () => {
  withAuthorityRepo(({ root, authority }) => {
    fs.writeFileSync(
      path.join(root, "skills", "architect", "SKILL.md"),
      skillMarkdown("architect", "Authorized current semantic mutation."),
      "utf8",
    );
    commitAll(root, "mutate architect");

    const corrupted = structuredClone(authority);
    corrupted.baselineCanonicalPackageTrees.architect = "0".repeat(40);
    assert.throws(
      () => qualifyHeadSemanticAuthority({ cwd: root, authority: corrupted }),
      /baselineCanonicalPackageTrees does not exactly match the Git-derived baseline/,
    );
  });
});

test("unknown admitted package is rejected even without a current mutation", () => {
  withAuthorityRepo(({ root, authority }) => {
    const corrupted = structuredClone(authority);
    corrupted.admittedCanonicalPackages = ["architect", "future-package"];
    assert.throws(
      () => qualifyHeadSemanticAuthority({ cwd: root, authority: corrupted }),
      /admits package absent from baseline canonical Skill tree: future-package/,
    );
  });
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

test("top-level Skill package-set changes fail before subtree admission is evaluated", async (t) => {
  await t.test("addition", () => withAuthorityRepo(({ root, authority }) => {
    const added = path.join(root, "skills", "new-skill");
    fs.mkdirSync(added, { recursive: true });
    fs.writeFileSync(path.join(added, "SKILL.md"), skillMarkdown("new-skill"), "utf8");
    commitAll(root, "add skill");
    assert.throws(
      () => qualifyHeadSemanticAuthority({ cwd: root, authority }),
      /top-level Skill package set differs from baseline: added=new-skill; deleted=NONE/,
    );
  }));

  await t.test("deletion", () => withAuthorityRepo(({ root, authority }) => {
    fs.rmSync(path.join(root, "skills", "prove-it-works"), { recursive: true, force: true });
    commitAll(root, "delete skill");
    assert.throws(
      () => qualifyHeadSemanticAuthority({ cwd: root, authority }),
      /top-level Skill package set differs from baseline: added=NONE; deleted=prove-it-works/,
    );
  }));

  await t.test("rename", () => withAuthorityRepo(({ root, authority }) => {
    fs.renameSync(path.join(root, "skills", "architect"), path.join(root, "skills", "architect-next"));
    commitAll(root, "rename skill");
    assert.throws(
      () => qualifyHeadSemanticAuthority({ cwd: root, authority }),
      /top-level Skill package set differs from baseline: added=architect-next; deleted=architect/,
    );
  }));

  await t.test("deletion of admitted architect still fails", () => withAuthorityRepo(({ root, authority }) => {
    fs.rmSync(path.join(root, "skills", "architect"), { recursive: true, force: true });
    commitAll(root, "delete admitted architect");
    assert.throws(
      () => qualifyHeadSemanticAuthority({ cwd: root, authority }),
      /top-level Skill package set differs from baseline: added=NONE; deleted=architect/,
    );
  }));
});

test("baseline package identities are self-checked when the canonical Skill tree is unchanged", () => {
  withAuthorityRepo(({ root, authority }) => {
    const corrupted = structuredClone(authority);
    corrupted.baselineCanonicalPackageTrees.architect = "0".repeat(40);
    assert.throws(
      () => qualifyHeadSemanticAuthority({ cwd: root, authority: corrupted }),
      /baselineCanonicalPackageTrees does not exactly match the Git-derived baseline/,
    );
  });
});

test("ephemeral generated catalog is reconstructed from clean checkout and ignores untracked residue", async (t) => {
  await t.test("clean checkout absence generates twice with byte identity", () => withGeneratedCatalogRepo(({ root, catalogPath, repoPath }) => {
    assert.equal(fs.existsSync(catalogPath), false);
    let generationCount = 0;
    const qualified = qualifyEphemeralGeneratedCatalog({
      cwd: root,
      catalogPath,
      repoPath,
      generate: () => {
        generationCount += 1;
        fs.mkdirSync(path.dirname(catalogPath), { recursive: true });
        fs.writeFileSync(catalogPath, "deterministic canonical projection\n", "utf8");
      },
    });
    assert.equal(generationCount, 2);
    assert.equal(qualified.toString("utf8"), "deterministic canonical projection\n");
    assert.equal(fs.readFileSync(catalogPath, "utf8"), "deterministic canonical projection\n");
  }));

  await t.test("arbitrary ignored residue is not qualification authority", () => withGeneratedCatalogRepo(({ root, catalogPath, repoPath }) => {
    fs.mkdirSync(path.dirname(catalogPath), { recursive: true });
    fs.writeFileSync(catalogPath, "arbitrary stale local residue\n", "utf8");
    const qualified = qualifyEphemeralGeneratedCatalog({
      cwd: root,
      catalogPath,
      repoPath,
      generate: () => {
        fs.mkdirSync(path.dirname(catalogPath), { recursive: true });
        fs.writeFileSync(catalogPath, "deterministic canonical projection\n", "utf8");
      },
    });
    assert.equal(qualified.toString("utf8"), "deterministic canonical projection\n");
    assert.equal(fs.readFileSync(catalogPath, "utf8"), "deterministic canonical projection\n");
  }));

  await t.test("non-deterministic regeneration fails", () => withGeneratedCatalogRepo(({ root, catalogPath, repoPath }) => {
    let generationCount = 0;
    assert.throws(
      () => qualifyEphemeralGeneratedCatalog({
        cwd: root,
        catalogPath,
        repoPath,
        generate: () => {
          generationCount += 1;
          fs.mkdirSync(path.dirname(catalogPath), { recursive: true });
          fs.writeFileSync(catalogPath, `projection-${generationCount}\n`, "utf8");
        },
      }),
      /not byte-for-byte deterministic/,
    );
  }));
});

test("tracked generated catalog is rejected by Git/index evidence", () => {
  withGeneratedCatalogRepo(({ root, catalogPath, repoPath }) => {
    fs.mkdirSync(path.dirname(catalogPath), { recursive: true });
    fs.writeFileSync(catalogPath, "tracked generated artifact\n", "utf8");
    runGit(root, ["add", "-f", repoPath]);
    runGit(root, ["commit", "-q", "-m", "track generated artifact"]);

    assert.throws(
      () => assertGeneratedCatalogUntracked({ cwd: root, repoPath }),
      /must remain untracked ephemeral derived output/,
    );
    assert.throws(
      () => qualifyEphemeralGeneratedCatalog({
        cwd: root,
        catalogPath,
        repoPath,
        generate: () => fs.writeFileSync(catalogPath, "replacement\n", "utf8"),
      }),
      /must remain untracked ephemeral derived output/,
    );
  });
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
