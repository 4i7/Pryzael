import assert from "node:assert/strict";
import test from "node:test";
import worker from "./index.mjs";

test("health and legacy MCP initialize reach the deployed handler contract", async () => {
  const health = await worker.fetch(new Request("https://pryzael.example/health"));
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), {
    service: "pryzael-mcp",
    version: "0.2.0",
    tools: 8,
  });

  const initialize = await worker.fetch(
    new Request("https://pryzael.example/mcp", {
      method: "POST",
      headers: {
        accept: "application/json, text/event-stream",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-11-25",
          capabilities: {},
          clientInfo: { name: "pryzael-smoke", version: "1.0.0" },
        },
      }),
    }),
  );

  assert.ok(initialize.status < 500, `unexpected MCP status ${initialize.status}`);
  const body = await initialize.text();
  assert.match(body, /Pryzael MCP/);
});
