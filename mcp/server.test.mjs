import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { spawn } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const SERVER_PATH = fileURLToPath(new URL("./server.mjs", import.meta.url));

function writeFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pryzael-mcp-"));
  fs.mkdirSync(path.join(root, ".codex-plugin"), { recursive: true });
  fs.mkdirSync(path.join(root, "skills", "architect"), { recursive: true });
  fs.mkdirSync(path.join(root, "skills", "interrogate", "references"), {
    recursive: true,
  });
  fs.writeFileSync(
    path.join(root, ".codex-plugin", "plugin.json"),
    JSON.stringify({ name: "pryzael", version: "0.2.0" }),
  );
  fs.writeFileSync(
    path.join(root, "skills", "architect", "SKILL.md"),
    `---\nname: architect\ndescription: "Design a system change before implementation."\n---\n# Architect\n\nDesign first.\n`,
  );
  fs.writeFileSync(
    path.join(root, "skills", "interrogate", "SKILL.md"),
    `---\nname: interrogate\ndescription: "Review an existing artifact adversarially."\n---\n# Interrogate\n\nRead [exact review](references/exact.md) when needed.\n`,
  );
  fs.writeFileSync(
    path.join(root, "skills", "interrogate", "references", "exact.md"),
    "# Exact review\n\nBind exact artifact identity.\n",
  );
  return root;
}

function startServer(root) {
  const child = spawn(process.execPath, [SERVER_PATH], {
    env: { ...process.env, PRYZAEL_ROOT: root },
    stdio: ["pipe", "pipe", "pipe"],
  });
  const lines = readline.createInterface({
    input: child.stdout,
    crlfDelay: Infinity,
  });
  const pending = new Map();
  let nextId = 1;

  lines.on("line", (line) => {
    const message = JSON.parse(line);
    const waiter = pending.get(message.id);
    if (waiter) {
      pending.delete(message.id);
      waiter.resolve(message);
    }
  });

  child.on("exit", (code) => {
    for (const waiter of pending.values()) {
      waiter.reject(new Error(`server exited: ${code}`));
    }
    pending.clear();
  });

  return {
    child,
    rpc(method, params = {}) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        child.stdin.write(
          `${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`,
        );
      });
    },
  };
}

test("lists skill-derived read-only tools and loads resources on demand", async (t) => {
  const root = writeFixture();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const client = startServer(root);
  t.after(() => client.child.kill());

  const initialized = await client.rpc("initialize", {
    protocolVersion: "2025-11-25",
  });
  assert.equal(initialized.result.serverInfo.name, "Pryzael MCP");
  assert.equal(initialized.result.serverInfo.version, "0.2.0");

  const listed = await client.rpc("tools/list");
  assert.deepEqual(
    listed.result.tools.map((tool) => tool.name),
    ["architect", "interrogate"],
  );
  for (const tool of listed.result.tools) {
    assert.equal(tool.annotations.readOnlyHint, true);
    assert.equal(tool.annotations.destructiveHint, false);
    assert.equal(tool.annotations.idempotentHint, true);
    assert.equal(tool.annotations.openWorldHint, false);
  }

  const workflow = await client.rpc("tools/call", {
    name: "interrogate",
    arguments: {},
  });
  assert.match(workflow.result.content[0].text, /# Interrogate/);
  assert.deepEqual(workflow.result.structuredContent.availableResources, [
    "references/exact.md",
  ]);

  const resource = await client.rpc("tools/call", {
    name: "interrogate",
    arguments: { resource: "references/exact.md" },
  });
  assert.match(resource.result.content[0].text, /Bind exact artifact identity/);

  const invalid = await client.rpc("tools/call", {
    name: "interrogate",
    arguments: { resource: "../outside.md" },
  });
  assert.equal(invalid.error.code, -32602);
});
