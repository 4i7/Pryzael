import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ordinalCompare } from "./deterministic_order.mjs";
import { parseCanonicalSkillMarkdown } from "./skill_package.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS = path.join(ROOT, "skills");
const ALLOWED_TOP = new Set(["name", "description", "license", "compatibility", "metadata", "allowed-tools"]);
const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESOURCE_PATH_RE = /^(?:references|assets|scripts)\/[A-Za-z0-9._/-]+$/;
const INLINE_CODE_RE = /(?<!`)`([^`\n]+)`(?!`)/g;
const MARKDOWN_LINK_RE = /\[[^\]\n]*\]\(\s*(?:<([^>\n]+)>|([^\s)]+))(?:\s+['"][^)\n]*['"])?\s*\)/g;

export function explicitResourceReferences(text) {
  const references = [];

  function add(raw) {
    const candidate = raw.trim().split("#", 1)[0];
    if (RESOURCE_PATH_RE.test(candidate) && !references.includes(candidate)) {
      references.push(candidate);
    }
  }

  for (const match of text.matchAll(INLINE_CODE_RE)) add(match[1]);
  for (const match of text.matchAll(MARKDOWN_LINK_RE)) add(match[1] ?? match[2]);
  return references;
}

export function validateSkill(skillDir) {
  const errors = [];
  const directoryName = path.basename(skillDir);
  const skillFile = path.join(skillDir, "SKILL.md");
  if (!fs.existsSync(skillFile) || !fs.statSync(skillFile).isFile()) {
    return ["missing SKILL.md"];
  }

  const text = fs.readFileSync(skillFile, "utf8");
  const parsed = parseCanonicalSkillMarkdown(text);
  errors.push(...parsed.errors);

  const unknown = Object.keys(parsed.entries)
    .filter((key) => !ALLOWED_TOP.has(key))
    .sort(ordinalCompare);
  if (unknown.length > 0) {
    errors.push(`unsupported top-level frontmatter keys: ${JSON.stringify(unknown)}`);
  }

  const name = parsed.semanticFields.name ?? "";
  if (name !== directoryName) {
    errors.push(`name ${JSON.stringify(name)} does not match directory ${JSON.stringify(directoryName)}`);
  }
  if (!NAME_RE.test(name)) {
    errors.push(`invalid skill name: ${JSON.stringify(name)}`);
  }
  if (name.length > 64) {
    errors.push("name exceeds 64 characters");
  }

  const description = parsed.semanticFields.description ?? "";
  if (!description) {
    errors.push("missing description");
  }
  if (description.length > 1024) {
    errors.push("description exceeds 1024 characters");
  }

  if (text.split(/\r\n|\n|\r/).length > 500) {
    errors.push("SKILL.md exceeds 500 lines");
  }

  const notice = path.join(skillDir, "LICENSE.pstack.txt");
  if (!fs.existsSync(notice) || !fs.statSync(notice).isFile()) {
    errors.push("missing LICENSE.pstack.txt package notice");
  }

  for (const resource of explicitResourceReferences(text)) {
    if (!fs.existsSync(path.join(skillDir, resource))) {
      errors.push(`broken local resource reference: ${resource}`);
    }
  }

  return errors;
}

export function validateAllSkills(skillsDir = SKILLS) {
  if (!fs.existsSync(skillsDir) || !fs.statSync(skillsDir).isDirectory()) {
    return { status: 2, results: [], fatal: "skills directory not found" };
  }

  const directories = fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => ordinalCompare(a.name, b.name));

  const results = directories.map((entry) => ({
    name: entry.name,
    errors: validateSkill(path.join(skillsDir, entry.name)),
  }));
  return {
    status: results.some((result) => result.errors.length > 0) ? 1 : 0,
    results,
    fatal: null,
  };
}

function main() {
  const result = validateAllSkills();
  if (result.fatal) {
    console.error(result.fatal);
    return result.status;
  }

  for (const item of result.results) {
    if (item.errors.length === 0) {
      console.log(`PASS ${item.name}`);
      continue;
    }
    console.log(`FAIL ${item.name}`);
    for (const error of item.errors) console.log(`  - ${error}`);
  }
  return result.status;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
