import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const JsonRpcError = {
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
};

const TEXT_RESOURCE_EXTENSIONS = new Set([
  ".md", ".txt", ".tsv", ".csv", ".json", ".yaml", ".yml", ".toml",
  ".ini", ".py", ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx",
]);
const RESOURCE_ROOTS = new Set(["references", "assets", "scripts"]);
const DEFAULT_PROTOCOL_VERSION = "2025-11-25";

function pluginRoot() {
  if (process.env.PRYZAEL_ROOT) {
    return path.resolve(process.env.PRYZAEL_ROOT);
  }
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
}

function parseYamlScalar(raw) {
  const value = raw.trim();
  if (value.startsWith('"') && value.endsWith('"')) {
    return JSON.parse(value);
  }
  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/''/g, "'");
  }
  return value;
}

export function parseSkillMarkdown(markdown) {
  const normalized = markdown.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    throw new Error("SKILL.md must start with YAML frontmatter.");
  }
  const end = normalized.indexOf("\n---\n", 4);
  if (end === -1) {
    throw new Error("SKILL.md frontmatter is not terminated.");
  }

  const frontmatter = normalized.slice(4, end);
  const body = normalized.slice(end + 5).trim();
  let name;
  let description;

  for (const line of frontmatter.split("\n")) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const rawValue = line.slice(separator + 1);
    if (key === "name") name = parseYamlScalar(rawValue);
    if (key === "description") description = parseYamlScalar(rawValue);
  }

  if (typeof name !== "string" || name.length === 0) {
    throw new Error("SKILL.md frontmatter is missing name.");
  }
  if (typeof description !== "string" || description.length === 0) {
    throw new Error(`Skill ${name} is missing description.`);
  }
  return { name, description, body };
}

function toPosix(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function listTextResources(skillDir) {
  const resources = [];
  for (const rootName of RESOURCE_ROOTS) {
    const root = path.join(skillDir, rootName);
    if (!fs.existsSync(root) || !fs.lstatSync(root).isDirectory()) continue;
    const stack = [root];
    while (stack.length > 0) {
      const current = stack.pop();
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const absolute = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(absolute);
        } else if (
          entry.isFile() &&
          TEXT_RESOURCE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
        ) {
          resources.push(toPosix(path.relative(skillDir, absolute)));
        }
      }
    }
  }
  return resources.sort();
}

function toolNameForSkill(name) {
  return name.replace(/-/g, "_");
}

function titleForSkill(name) {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function loadCatalog(root = pluginRoot()) {
  const skillsDir = path.join(root, "skills");
  if (!fs.existsSync(skillsDir) || !fs.lstatSync(skillsDir).isDirectory()) {
    throw new Error(`Skills directory not found: ${skillsDir}`);
  }

  const catalog = new Map();
  for (const entry of fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((item) => item.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))) {
    const skillDir = path.join(skillsDir, entry.name);
    const skillPath = path.join(skillDir, "SKILL.md");
    if (
      !fs.existsSync(skillPath) ||
      !fs.lstatSync(skillPath).isFile()
    ) {
      continue;
    }
    const skill = parseSkillMarkdown(fs.readFileSync(skillPath, "utf8"));
    if (skill.name !== entry.name) {
      throw new Error(`Skill directory/name mismatch: ${entry.name} != ${skill.name}`);
    }
    const toolName = toolNameForSkill(skill.name);
    if (catalog.has(toolName)) {
      throw new Error(`Duplicate MCP tool name: ${toolName}`);
    }
    catalog.set(toolName, {
      ...skill,
      title: titleForSkill(skill.name),
      toolName,
      skillDir,
      resources: listTextResources(skillDir),
    });
  }
  if (catalog.size === 0) throw new Error("No Pryzael skills were discovered.");
  return catalog;
}

function readPluginVersion(root) {
  try {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(root, ".codex-plugin", "plugin.json"), "utf8"),
    );
    return typeof manifest.version === "string" ? manifest.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function toolDescriptor(skill) {
  return {
    name: skill.toolName,
    title: skill.title,
    description: skill.description,
    inputSchema: {
      type: "object",
      properties: {
        resource: {
          type: "string",
          description:
            "Optional package-local resource path returned by a previous call to this same workflow tool. Omit on the first call.",
        },
      },
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  };
}

function mainWorkflowResult(skill) {
  const resourceHint =
    skill.resources.length === 0
      ? ""
      : `\n\nAvailable package-local resources: ${skill.resources.join(", ")}. If the workflow requires one, call this same tool again with the exact resource path.`;
  return {
    content: [
      {
        type: "text",
        text: `Pryzael workflow: ${skill.name}\n\nApply the following workflow to the user's current request. Treat it as workflow guidance, not as evidence that any external action already occurred.\n\n${skill.body}${resourceHint}`,
      },
    ],
    structuredContent: {
      skill: skill.name,
      availableResources: skill.resources,
    },
  };
}

function resourceResult(skill, resource) {
  if (!skill.resources.includes(resource)) {
    throw new Error(`Unknown resource for ${skill.name}: ${resource}`);
  }
  const absolute = path.resolve(skill.skillDir, ...resource.split("/"));
  const relative = path.relative(skill.skillDir, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Resource path escapes the skill directory.");
  }
  if (!fs.lstatSync(absolute).isFile()) {
    throw new Error("Resource must be a regular file.");
  }
  const text = fs.readFileSync(absolute, "utf8");
  return {
    content: [
      {
        type: "text",
        text: `Pryzael resource: ${skill.name}/${resource}\n\n${text}`,
      },
    ],
    structuredContent: {
      skill: skill.name,
      resource,
    },
  };
}

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function sendResult(id, result) {
  send({ jsonrpc: "2.0", id, result });
}

function sendError(id, code, message) {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

export function createRequestHandler(root = pluginRoot()) {
  return async function handleRequest(message) {
    const { id, method, params } = message;
    try {
      if (method === "initialize") {
        sendResult(id, {
          protocolVersion: params?.protocolVersion ?? DEFAULT_PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: {
            name: "Pryzael MCP",
            version: readPluginVersion(root),
          },
          instructions:
            "Pryzael exposes read-only engineering workflow tools derived from the installed skills. Use a workflow tool when its description matches the user's current engineering request. Tool results are guidance, not evidence of external actions.",
        });
        return;
      }

      if (method === "ping") {
        sendResult(id, {});
        return;
      }

      if (method === "tools/list") {
        const catalog = loadCatalog(root);
        sendResult(id, {
          tools: [...catalog.values()].map(toolDescriptor),
        });
        return;
      }

      if (method === "tools/call") {
        const catalog = loadCatalog(root);
        const skill = catalog.get(params?.name);
        if (!skill) {
          throw new Error(`Unknown tool: ${params?.name ?? ""}`);
        }
        const args = params?.arguments ?? {};
        if (args.resource !== undefined && typeof args.resource !== "string") {
          throw new Error("resource must be a string when provided.");
        }
        sendResult(
          id,
          args.resource
            ? resourceResult(skill, args.resource)
            : mainWorkflowResult(skill),
        );
        return;
      }

      if (id !== undefined) {
        sendError(
          id,
          JsonRpcError.METHOD_NOT_FOUND,
          `Method not found: ${method}`,
        );
      }
    } catch (error) {
      if (id !== undefined) {
        sendError(
          id,
          method === "tools/call"
            ? JsonRpcError.INVALID_PARAMS
            : JsonRpcError.INTERNAL_ERROR,
          error instanceof Error ? error.message : String(error),
        );
      }
    }
  };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const handleRequest = createRequestHandler();
  const lines = readline.createInterface({
    input: process.stdin,
    crlfDelay: Infinity,
  });
  lines.on("line", (line) => {
    if (line.trim().length === 0) return;
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      return;
    }
    void handleRequest(message);
  });
}
