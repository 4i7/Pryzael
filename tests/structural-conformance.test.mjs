import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { CATALOG, PRYZAEL_VERSION } from "../worker/generated/catalog.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_DIR = path.join(ROOT, "skills");
const PLUGIN_MANIFEST = path.join(ROOT, ".codex-plugin", "plugin.json");
const RESOURCE_ROOTS = ["references", "assets", "scripts"];
const TEXT_EXTENSIONS = new Set([
  ".md", ".txt", ".tsv", ".csv", ".json", ".yaml", ".yml", ".toml",
  ".ini", ".py", ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx",
]);

function parseScalar(raw) {
  const value = raw.trim();
  if (value.startsWith('"') && value.endsWith('"')) return JSON.parse(value);
  if (value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1).replace(/''/g, "'");
  return value;
}

function readCanonicalSkill(directoryName) {
  const skillDir = path.join(SKILLS_DIR, directoryName);
  const markdown = fs.readFileSync(path.join(skillDir, "SKILL.md"), "utf8").replace(/\r\n/g, "\n");
  assert.ok(markdown.startsWith("---\n"), `${directoryName}: missing YAML frontmatter`);
  const end = markdown.indexOf("\n---\n", 4);
  assert.notEqual(end, -1, `${directoryName}: unterminated YAML frontmatter`);

  const metadata = {};
  for (const line of markdown.slice(4, end).split("\n")) {
    if (/^\s/.test(line)) continue;
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    if (key === "name" || key === "description") metadata[key] = parseScalar(line.slice(separator + 1));
  }

  return {
    name: metadata.name,
    description: metadata.description,
    body: markdown.slice(end + 5).trim(),
    resources: collectCanonicalResources(skillDir),
  };
}

function collectCanonicalResources(skillDir) {
  const resources = {};
  for (const rootName of RESOURCE_ROOTS) {
    const root = path.join(skillDir, rootName);
    if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) continue;
    const stack = [root];
    while (stack.length > 0) {
      const current = stack.pop();
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        if (entry.isSymbolicLink()) continue;
        const absolute = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(absolute);
          continue;
        }
        if (!entry.isFile() || !TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
        const relative = path.relative(skillDir, absolute).split(path.sep).join("/");
        resources[relative] = fs.readFileSync(absolute, "utf8");
      }
    }
  }
  return Object.fromEntries(Object.entries(resources).sort(([a], [b]) => a.localeCompare(b)));
}

function skillDirectories() {
  return fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

test("plugin manifest and generated version stay aligned", () => {
  const manifest = JSON.parse(fs.readFileSync(PLUGIN_MANIFEST, "utf8"));
  assert.equal(manifest.name, "pryzael");
  assert.equal(manifest.skills, "./skills/");
  assert.equal(typeof manifest.version, "string");
  assert.ok(manifest.version.length > 0);
  assert.equal(PRYZAEL_VERSION, manifest.version);
});

test("every top-level Skill is projected exactly once with canonical description and body", () => {
  const directories = skillDirectories();
  assert.ok(directories.length > 0);
  assert.equal(CATALOG.length, directories.length);
  assert.deepEqual(CATALOG.map((skill) => skill.name), directories);

  const toolNames = new Set();
  for (const directoryName of directories) {
    const canonical = readCanonicalSkill(directoryName);
    const projected = CATALOG.find((skill) => skill.name === directoryName);
    assert.ok(projected, `${directoryName}: missing generated projection`);
    assert.equal(canonical.name, directoryName, `${directoryName}: name/directory mismatch`);
    assert.equal(projected.description, canonical.description, `${directoryName}: description drift`);
    assert.equal(projected.body, canonical.body, `${directoryName}: body drift`);

    const expectedToolName = directoryName.replace(/-/g, "_");
    assert.equal(projected.toolName, expectedToolName, `${directoryName}: tool-name drift`);
    assert.ok(!toolNames.has(expectedToolName), `${directoryName}: duplicate tool name ${expectedToolName}`);
    toolNames.add(expectedToolName);
  }
});

test("generated resources exactly match canonical text resources and remain package-local", () => {
  for (const projected of CATALOG) {
    const canonical = readCanonicalSkill(projected.name);
    assert.deepEqual(projected.resources, canonical.resources, `${projected.name}: resource projection drift`);

    for (const resource of Object.keys(projected.resources)) {
      assert.ok(RESOURCE_ROOTS.some((root) => resource.startsWith(`${root}/`)), `${projected.name}: unexpected resource root ${resource}`);
      assert.equal(resource, resource.split(path.sep).join("/"), `${projected.name}: non-portable resource separator ${resource}`);
      assert.equal(path.posix.normalize(resource), resource, `${projected.name}: non-normal resource path ${resource}`);
      assert.ok(!resource.startsWith("/"));
      assert.ok(!resource.split("/").includes(".."));
      assert.ok(TEXT_EXTENSIONS.has(path.extname(resource).toLowerCase()), `${projected.name}: non-text resource projected ${resource}`);
      assert.equal(typeof projected.resources[resource], "string");
    }
  }
});

test("current resource envelope is characterized without imposing a new size limit", () => {
  const resources = CATALOG.flatMap((skill) => Object.entries(skill.resources).map(([resource, text]) => ({
    skill: skill.name,
    resource,
    bytes: Buffer.byteLength(text, "utf8"),
  })));

  for (const item of resources) assert.ok(item.bytes >= 0);
  const totalBytes = resources.reduce((sum, item) => sum + item.bytes, 0);
  const maxBytes = resources.reduce((max, item) => Math.max(max, item.bytes), 0);
  assert.ok(totalBytes >= maxBytes);
});
