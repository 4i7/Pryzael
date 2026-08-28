import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ordinalCompare } from "./deterministic_order.mjs";
import { parseCanonicalSkillMarkdown, projectCanonicalSkill } from "./skill_package.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_DIR = path.join(ROOT, "skills");
const OUTPUT = path.join(ROOT, "worker", "generated", "catalog.mjs");
const PLUGIN_MANIFEST = path.join(ROOT, ".codex-plugin", "plugin.json");
const RESOURCE_ROOTS = new Set(["references", "assets", "scripts"]);
const TEXT_EXTENSIONS = new Set([
  ".md", ".txt", ".tsv", ".csv", ".json", ".yaml", ".yml", ".toml",
  ".ini", ".py", ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx",
]);

function collectResources(skillDir) {
  const resources = {};
  for (const rootName of RESOURCE_ROOTS) {
    const root = path.join(skillDir, rootName);
    if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) continue;
    const stack = [root];
    while (stack.length > 0) {
      const current = stack.pop();
      for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => ordinalCompare(a.name, b.name))) {
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
  return Object.fromEntries(Object.entries(resources).sort(([a], [b]) => ordinalCompare(a, b)));
}

const pluginManifest = JSON.parse(fs.readFileSync(PLUGIN_MANIFEST, "utf8"));
if (typeof pluginManifest.version !== "string" || pluginManifest.version.length === 0) {
  throw new Error("plugin manifest must define a non-empty version");
}

const catalog = [];
const toolNames = new Set();
for (const entry of fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
  .filter((item) => item.isDirectory())
  .sort((a, b) => ordinalCompare(a.name, b.name))) {
  const skillDir = path.join(SKILLS_DIR, entry.name);
  const parsed = parseCanonicalSkillMarkdown(fs.readFileSync(path.join(skillDir, "SKILL.md"), "utf8"));
  const skill = projectCanonicalSkill(parsed, entry.name);
  const toolName = skill.name.replace(/-/g, "_");
  if (toolNames.has(toolName)) throw new Error(`duplicate MCP tool name: ${toolName}`);
  toolNames.add(toolName);
  catalog.push({
    ...skill,
    toolName,
    title: skill.name.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" "),
    resources: collectResources(skillDir),
  });
}

if (catalog.length === 0) throw new Error("No Pryzael skills found");

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
const source = `// GENERATED FILE. Do not edit. Source: skills/*/SKILL.md and skill-local resources.\n\nexport const PRYZAEL_VERSION = ${JSON.stringify(pluginManifest.version)};\nexport const CATALOG = ${JSON.stringify(catalog, null, 2)};\n`;
fs.writeFileSync(OUTPUT, source, "utf8");
console.log(`Generated ${catalog.length} MCP tools at ${path.relative(ROOT, OUTPUT)}`);
