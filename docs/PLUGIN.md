# Pryzael as Skills + remote MCP

Pryzael keeps one canonical workflow catalog and exposes it through two product paths:

```text
skills/*/SKILL.md        native Agent Skills
        |
        +--> build-time generated MCP catalog
              |
              +--> stateless Cloudflare Worker /mcp
```

## Authority boundary

The eight `skills/<name>/SKILL.md` packages remain authoritative. `scripts/generate_mcp_catalog.mjs` derives MCP tool metadata, bodies, and package-local text resources from those files during Worker build/deploy.

Do not hand-maintain a second copy of Skill descriptions or workflow instructions in Worker code.

`.codex-plugin/plugin.json` remains the packaging manifest for the Skill collection. The hosted MCP endpoint is deployed from the same repository but is connected to ChatGPT by its actual HTTPS server URI rather than by a local `.mcp.json` process definition.

## Runtime boundary

The Cloudflare Worker is intentionally narrow:

- stateless Streamable HTTP MCP;
- read-only public workflow content;
- no downstream network/API calls;
- no writes;
- no database or persistent state;
- no GitHub or connector credential proxying;
- no OpenAI API/model calls;
- no local-PC or tunnel dependency.

A workflow returned by an MCP tool may instruct the host model to use capabilities available in the active session. Those capabilities remain outside the Pryzael MCP server.

## ChatGPT development path

Deploy the Worker through Cloudflare Workers Builds, obtain the actual `workers.dev` hostname shown by Cloudflare, and create a ChatGPT developer Plugin connection to:

```text
https://<actual-worker-hostname>/mcp
```

See [`MCP.md`](MCP.md) for setup.

Product support is established only by ordinary user-visible evidence that the target ChatGPT surface executed a Pryzael MCP tool. Installation or plugin awareness by itself is insufficient.

## Authentication

Initial qualification is intentionally unauthenticated because the endpoint serves only public repository workflow material and has no mutation capability. If live Chat execution is successful and the endpoint will be retained or shared, reassess OAuth/authorization separately.

## Cost boundary

The hosted runtime uses Cloudflare Workers. Its limits and pricing are external Cloudflare product properties rather than Pryzael guarantees. The architecture avoids additional metered services such as D1, KV, R2, Durable Objects, hosted databases, or model/API calls.

For personal interactive use, the Worker is designed to stay far below the current Free-plan request allowance by doing only in-memory MCP catalog lookup and response construction at request time.
