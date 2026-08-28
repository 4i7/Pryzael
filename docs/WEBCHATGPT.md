# Web ChatGPT deployment notes

## Capability model

Pryzael has two independent Web-facing paths:

1. **Personal/installed Skills** on ChatGPT surfaces that support native Skill execution.
2. **Remote MCP plugin tools** on ChatGPT surfaces that support custom MCP plugins/connectors.

Availability varies by product surface, plan, workspace, and rollout. Do not infer that a capability is callable merely because the model can mention it or the item appears installed.

## Native Skills

Treat GitHub as source/version control and an uploaded Skill as a deployed copy. Each Skill remains self-contained and can be uploaded independently where Personal Skills are supported.

Native Skill qualification uses only product-visible behavior available to an ordinary user. Hidden selector/load state is not measurement authority.

## Remote MCP path

The same eight workflows are projected as read-only MCP tools by the stateless Cloudflare Worker built from this repository. The Worker is reachable without a local PC or tunnel.

After Cloudflare deployment, connect ChatGPT to the exact URL shown by Cloudflare:

```text
https://<actual-worker-hostname>/mcp
```

Do not guess the hostname. See [`MCP.md`](MCP.md).

A valid Chat-side qualification requires observable tool execution. The following are not sufficient by themselves:

- the plugin appearing in an installed list;
- the model saying it knows the plugin exists;
- a guessed/internal package identity;
- behavior that could have been produced without an MCP tool call.

## GitHub use

The MCP Worker does not embed or proxy GitHub. `interrogate` and other workflows use GitHub only when the active ChatGPT session separately exposes an authorized GitHub capability. Otherwise they preserve missing evidence as `INCONCLUSIVE` where appropriate.

## Fallback

If neither native Skills nor MCP execution is available on the intended ChatGPT surface, the repository can still be used as explicit prompt material by supplying the relevant `SKILL.md`. That preserves workflow semantics but not automatic discovery/tool selection.
