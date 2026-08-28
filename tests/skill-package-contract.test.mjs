import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { ordinalCompare } from "../scripts/deterministic_order.mjs";
import {
  parseCanonicalSkillMarkdown,
  projectCanonicalSkill,
} from "../scripts/skill_package.mjs";
import { validateSkill } from "../scripts/validate_skills.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_DIR = path.join(ROOT, "skills");
const FIXTURES = JSON.parse(
  fs.readFileSync(path.join(ROOT, "tests", "fixtures", "skill-package-contract.json"), "utf8"),
);

function withFixtureSkill({ directory = "demo-skill", markdown, extraFiles = {}, notice = true }, callback) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "pryzael-skill-contract-"));
  try {
    const skillDir = path.join(temp, directory);
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, "SKILL.md"), markdown, "utf8");
    if (notice) fs.writeFileSync(path.join(skillDir, "LICENSE.pstack.txt"), "fixture\n", "utf8");
    for (const [relative, content] of Object.entries(extraFiles)) {
      const target = path.join(skillDir, relative);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, content, "utf8");
    }
    return callback(skillDir);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

function fixtureMarkdown(body) {
  return `---\nname: demo-skill\ndescription: "Validation fixture."\n---\n\n${body}\n`;
}

test("valid parser fixtures freeze the supported semantic envelope", () => {
  for (const fixture of FIXTURES.valid) {
    const parsed = parseCanonicalSkillMarkdown(fixture.markdown);
    assert.deepEqual(parsed.errors, [], fixture.id);
    const projected = projectCanonicalSkill(parsed, fixture.directory);
    assert.deepEqual(
      {
        ...projected,
        keys: Object.keys(parsed.entries).sort(ordinalCompare),
        metadataKeys: Object.keys(parsed.metadataEntries).sort(ordinalCompare),
      },
      fixture.expected,
      fixture.id,
    );
  }
});

test("invalid parser fixtures fail before projection", () => {
  for (const fixture of FIXTURES.invalidParser) {
    const parsed = parseCanonicalSkillMarkdown(fixture.markdown);
    assert.ok(
      parsed.errors.some((error) => error.includes(fixture.error)),
      `${fixture.id}: expected ${fixture.error}, got ${parsed.errors.join(" | ")}`,
    );
    assert.throws(
      () => projectCanonicalSkill(parsed, fixture.directory),
      new RegExp(fixture.error.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      fixture.id,
    );
  }
});

test("validation-policy fixtures remain distinct from canonical parsing", () => {
  for (const fixture of FIXTURES.invalidValidation) {
    withFixtureSkill(fixture, (skillDir) => {
      const errors = validateSkill(skillDir);
      assert.ok(
        errors.some((error) => error.includes(fixture.error)),
        `${fixture.id}: expected ${fixture.error}, got ${errors.join(" | ")}`,
      );
    });
  }
});

test("all current canonical packages are accepted by the shared interpretation", () => {
  const directories = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => ordinalCompare(a.name, b.name));
  assert.ok(directories.length > 0);

  for (const entry of directories) {
    const skillDir = path.join(SKILLS_DIR, entry.name);
    const markdown = fs.readFileSync(path.join(skillDir, "SKILL.md"), "utf8");
    const parsed = parseCanonicalSkillMarkdown(markdown);
    assert.deepEqual(parsed.errors, [], entry.name);
    assert.equal(projectCanonicalSkill(parsed, entry.name).name, entry.name);
    assert.deepEqual(validateSkill(skillDir), [], entry.name);
  }
});

test("explicit resource-reference behavior remains qualified across adjacent cases", () => {
  withFixtureSkill({
    markdown: fixtureMarkdown("Automation can use scripts/codemods. The references/index prose label is descriptive."),
  }, (skillDir) => {
    assert.deepEqual(validateSkill(skillDir), []);
  });

  withFixtureSkill({
    markdown: fixtureMarkdown("Run `scripts/bootstrap` before continuing."),
  }, (skillDir) => {
    assert.ok(validateSkill(skillDir).includes("broken local resource reference: scripts/bootstrap"));
  });

  withFixtureSkill({
    markdown: fixtureMarkdown("Run `scripts/bootstrap` before continuing."),
    extraFiles: { "scripts/bootstrap": "fixture\n" },
  }, (skillDir) => {
    assert.deepEqual(validateSkill(skillDir), []);
  });

  withFixtureSkill({
    markdown: fixtureMarkdown("Consult `references/missing.md` before continuing."),
  }, (skillDir) => {
    assert.ok(validateSkill(skillDir).includes("broken local resource reference: references/missing.md"));
  });

  withFixtureSkill({
    markdown: fixtureMarkdown("See [the gate](references/gate.md#decision)."),
    extraFiles: { "references/gate.md": "fixture\n" },
  }, (skillDir) => {
    assert.deepEqual(validateSkill(skillDir), []);
  });
});
