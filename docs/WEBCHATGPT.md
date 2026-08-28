# Web ChatGPT deployment notes

## Capability model

Pryzael has two independent Web-facing paths:

1. **Personal/installed Skills** on ChatGPT surfaces that support native Skill execution.
2. **MCP plugin tools** on ChatGPT surfaces that support custom MCP plugins/connectors.

Availability varies by product surface, plan, workspace, and feature rollout. Do not infer that a capability is callable merely because the model can mention it or the item appears installed.

## Native Skills

Treat GitHub as source/version control and an uploaded Skill as a deployed copy. Each Skill remains self-contained and can be uploaded independently where Personal Skills are supported.

Native Skill qualification should use only product-visible behavior available to an ordinary user. Hidden selector/load state is not measurement authority.

## MCP plugin path

The repository's `.mcp.json` and `mcp/server.mjs` expose the same eight workflows as read-only MCP tools. A remote Web ChatGPT surface needs a reachable MCP endpoint; it cannot reach local stdio directly.

For development without third-party hosting, use OpenAI Secure MCP Tunnel when available. See [`MCP.md`](MCP.md).

A valid Chat-side qualification requires an observable tool execution. The following are not sufficient by themselves:

- the plugin appearing in an installed list;
- the model saying it knows the plugin exists;
- a guessed/internal package identity;
- behavior that could have been produced without the MCP tool.

## GitHub use

The MCP bridge does not embed or proxy GitHub. `interrogate` and other workflows use GitHub only when the active ChatGPT session separately exposes an authorized GitHub capability. Otherwise they must preserve missing evidence as `INCONCLUSIVE` where appropriate.

## Fallback

If neither native Skills nor MCP execution is available on the intended ChatGPT surface, the repository can still be used as explicit prompt material by supplying the relevant `SKILL.md`. That preserves workflow semantics but not automatic discovery/tool selection.
