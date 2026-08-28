import assert from "node:assert/strict";
import test from "node:test";
import worker from "./index.mjs";
import { CATALOG, PRYZAEL_VERSION } from "./generated/catalog.mjs";

function decodeRpcBody(text) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("{")) return JSON.parse(trimmed);

  const messages = [];
  for (const line of trimmed.split(/\r?\n/)) {
    if (!line.startsWith("data:")) continue;
    const data = line.slice(5).trim();
    if (!data || data === "[DONE]") continue;
    messages.push(JSON.parse(data));
  }
  return messages.at(-1) ?? null;
}

function createClient() {
  let sessionId;
  let nextId = 1;

  async function raw(payload) {
    const headers = {
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
    };
    if (sessionId) headers["mcp-session-id"] = sessionId;

    const response = await worker.fetch(new Request("https://pryzael.example/mcp", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    }));
    sessionId = response.headers.get("mcp-session-id") ?? sessionId;
    const text = await response.text();
    return { response, text, payload: decodeRpcBody(text) };
  }

  async function request(method, params = {}) {
    const result = await raw({ jsonrpc: "2.0", id: nextId++, method, params });
    assert.ok(result.response.status < 500, `${method}: unexpected HTTP ${result.response.status}: ${result.text}`);
    assert.ok(result.payload, `${method}: missing JSON-RPC response: ${result.text}`);
    return result;
  }

  async function initialize() {
    const initialized = await request("initialize", {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: { name: "pryzael-conformance", version: "1.0.0" },
    });
    assert.equal(initialized.payload.result.serverInfo.name, "Pryzael MCP");
    assert.equal(initialized.payload.result.serverInfo.version, PRYZAEL_VERSION);

    const notification = await raw({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });
    assert.ok(notification.response.status < 500, `notifications/initialized: HTTP ${notification.response.status}: ${notification.text}`);
  }

  return { raw, request, initialize };
}

function assertRpcFailure(result, expectedText) {
  const failed = Boolean(result.payload?.error) || result.payload?.result?.isError === true;
  assert.ok(failed, `expected JSON-RPC failure, received: ${result.text}`);
  assert.match(result.text, expectedText);
}

test("health, not-found, and MCP initialize expose version/tool-count parity", async () => {
  const health = await worker.fetch(new Request("https://pryzael.example/health"));
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), {
    service: "pryzael-mcp",
    version: PRYZAEL_VERSION,
    tools: CATALOG.length,
  });

  const missing = await worker.fetch(new Request("https://pryzael.example/other"));
  assert.equal(missing.status, 404);

  const client = createClient();
  await client.initialize();
});

test("tools/list matches every generated Skill projection and MCP annotation", async () => {
  const client = createClient();
  await client.initialize();
  const listed = await client.request("tools/list");
  assert.ok(!listed.payload.error, listed.text);

  const tools = listed.payload.result.tools;
  assert.equal(tools.length, CATALOG.length);
  const byName = new Map(tools.map((tool) => [tool.name, tool]));

  for (const skill of CATALOG) {
    const tool = byName.get(skill.toolName);
    assert.ok(tool, `${skill.name}: missing tools/list entry`);
    assert.equal(tool.title, skill.title);
    assert.equal(tool.description, skill.description);
    assert.deepEqual(tool.annotations, {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    });
    assert.equal(tool.inputSchema.type, "object");
    assert.ok(tool.inputSchema.properties.resource);
  }
});

test("tools/call returns every current Skill body, resource enumeration, and structuredContent", async () => {
  const client = createClient();
  await client.initialize();

  for (const skill of CATALOG) {
    const called = await client.request("tools/call", { name: skill.toolName, arguments: {} });
    assert.ok(!called.payload.error, `${skill.name}: ${called.text}`);
    const result = called.payload.result;
    assert.deepEqual(result.structuredContent, {
      skill: skill.name,
      availableResources: Object.keys(skill.resources),
    });
    assert.equal(result.content.length, 1);
    assert.equal(result.content[0].type, "text");
    assert.match(result.content[0].text, new RegExp(`^Pryzael workflow: ${skill.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
    assert.ok(result.content[0].text.includes(skill.body), `${skill.name}: workflow body drift`);

    for (const resource of Object.keys(skill.resources)) {
      const retrieved = await client.request("tools/call", {
        name: skill.toolName,
        arguments: { resource },
      });
      assert.ok(!retrieved.payload.error, `${skill.name}/${resource}: ${retrieved.text}`);
      assert.deepEqual(retrieved.payload.result.structuredContent, { skill: skill.name, resource });
      assert.equal(retrieved.payload.result.content[0].type, "text");
      assert.ok(retrieved.payload.result.content[0].text.includes(skill.resources[resource]));
    }
  }
});

test("unknown, cross-Skill, non-normal, and malformed resource requests are rejected", async () => {
  const client = createClient();
  await client.initialize();
  const target = CATALOG[0];

  const unknown = await client.request("tools/call", {
    name: target.toolName,
    arguments: { resource: "references/does-not-exist.md" },
  });
  assertRpcFailure(unknown, /Unknown resource/);

  const sourceWithResource = CATALOG.find((skill) => Object.keys(skill.resources).some((resource) => !(resource in target.resources)));
  if (sourceWithResource) {
    const foreign = Object.keys(sourceWithResource.resources).find((resource) => !(resource in target.resources));
    const crossSkill = await client.request("tools/call", {
      name: target.toolName,
      arguments: { resource: foreign },
    });
    assertRpcFailure(crossSkill, /Unknown resource/);
  }

  for (const resource of ["../SKILL.md", "/references/does-not-exist.md", "references\\does-not-exist.md", "references/../SKILL.md"]) {
    const nonNormal = await client.request("tools/call", {
      name: target.toolName,
      arguments: { resource },
    });
    assertRpcFailure(nonNormal, /Unknown resource/);
  }

  const wrongType = await client.request("tools/call", {
    name: target.toolName,
    arguments: { resource: 42 },
  });
  assertRpcFailure(wrongType, /resource|invalid|expected/i);

  const unknownTool = await client.request("tools/call", { name: "not_a_pryzael_tool", arguments: {} });
  assertRpcFailure(unknownTool, /not_a_pryzael_tool|not found|unknown/i);
});

test("malformed JSON never reaches a successful MCP result", async () => {
  const response = await worker.fetch(new Request("https://pryzael.example/mcp", {
    method: "POST",
    headers: {
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
    },
    body: "{not-json",
  }));
  assert.ok(response.status >= 400 && response.status < 500, `unexpected malformed-input status ${response.status}`);
});
