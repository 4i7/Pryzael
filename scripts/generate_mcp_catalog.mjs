import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_DIR = path.join(ROOT, "skills");
const OUTPUT = path.join(ROOT, "worker", "generated", "catalog.ts");
const RESOURCE_ROOTS = new Set(["references", "assets", "scripts"]);
const TEXT_EXTENSIONS = new Set([
  ".md", ".txt", ".tsv", ".csv", ".json", ".yaml", ".yml", ".toml",
  ".ini", ".py", ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx",
]);

function parseScalar(raw) {
  const value = raw.trim();
  if (value.startsWith('"') && value.endsWith('"')) return JSON.parse(value);
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/''/g, "'");
  }
  return value;
}

function parseSkill(markdown, directoryName) {
  const normalized = markdown.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) throw new Error(`${directoryName}: missing YAML frontmatter`);
  const end = normalized.indexOf("\n---\n", 4);
  if (end === -1) throw new Error(`${directoryName}: unterminated YAML frontmatter`);

  const metadata = {};
  for (const line of normalized.slice(4, end).split("\n")) {
    if (/^\s/.test(line)) continue;
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    if (key === "name" || key === "description") {
      metadata[key] = parseScalar(line.slice(separator + 1));
    }
  }

  if (metadata.name !== directoryName) {
    throw new Error(`${directoryName}: frontmatter name must match directory`);
  }
  if (typeof metadata.description !== "string" || metadata.description.length === 0) {
    throw new Error(`${directoryName}: missing description`);
  }

  return {
    name: metadata.name,
    description: metadata.description,
    body: normalized.slice(end + 5).trim(),
  };
}

function collectResources(skillDir) {
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

const catalog = [];
for (const entry of fs.readdirSync(SKILLS_DIR, { withFileTypes: true }).filter((item) => item.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
  const skillDir = path.join(SKILLS_DIR, entry.name);
  const skill = parseSkill(fs.readFileSync(path.join(skillDir, "SKILL.md"), "utf8"), entry.name);
  catalog.push({
    ...skill,
    toolName: skill.name.replace(/-/g, "_"),
    title: skill.name.split("-").map((part) => part[0].toUpperCase() + part.slice(1)).join(" "),
    resources: collectResources(skillDir),
  });
}

if (catalog.length === 0) throw new Error("No Pryzael skills found");

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
const source = `// GENERATED FILE. Do not edit. Source: skills/*/SKILL.md and skill-local resources.\n\nexport const PRYZAEL_VERSION = "0.2.0";\nexport const CATALOG = ${JSON.stringify(catalog, null, 2)} as const;\n`;
fs.writeFileSync(OUTPUT, source, "utf8");
console.log(`Generated ${catalog.length} MCP tools at ${path.relative(ROOT, OUTPUT)}`);
