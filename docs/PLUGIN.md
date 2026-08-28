# Pryzael as a Skills + MCP plugin

Pryzael packages one canonical workflow catalog in two forms:

```text
skills/*/SKILL.md        native Agent Skills
        |
        +--> MCP projection generated at runtime
              .mcp.json
              mcp/server.mjs
```

OpenAI plugin packaging supports Skills and MCP together. Pryzael uses that shape so native Skill clients and MCP-capable ChatGPT/Codex surfaces can reach the same workflows without maintaining two instruction sets.

## Authority boundary

The eight `skills/<name>/SKILL.md` packages remain authoritative. The MCP server discovers `name`, `description`, body text, and package-local text resources from those directories on each request.

Do not hard-code a second copy of Skill descriptions or workflow instructions in MCP code. A Skill edit should automatically change the corresponding MCP projection.

`.codex-plugin/plugin.json` is packaging authority and points to both:

```json
{
  "skills": "./skills/",
  "mcpServers": "./.mcp.json"
}
```

## Runtime boundary

The bundled MCP server is intentionally narrow:

- local stdio only;
- read-only package access;
- no network requests;
- no writes;
- no database;
- no OAuth or secrets;
- no OpenAI API/model calls;
- no proxying of GitHub or other connectors.

The workflow returned by an MCP tool may tell the host model to use capabilities available in the active session. That does not make those capabilities part of the MCP server.

## ChatGPT development path

For Web ChatGPT development, connect the local stdio server through a supported MCP endpoint. OpenAI Secure MCP Tunnel is the preferred no-third-party-hosting path when available: run the local MCP server/tunnel only while testing or using Pryzael.

See [`MCP.md`](MCP.md) for setup.

Product support must be established by an observable MCP tool execution on the target ChatGPT surface. Plugin installation/awareness by itself is not sufficient proof.

## Distribution

The current repository is suitable as a Skills + MCP plugin source package and as a local bundled-MCP plugin for clients that support `.mcp.json` lifecycle configuration.

A public ChatGPT directory submission with MCP may require a stable public HTTPS MCP endpoint, domain verification, authentication declarations, or other current submission requirements. That is a separate deployment decision and is not required for local MCP qualification.

## Cost boundary

Pryzael does not add a hosted request-path service. The local bridge has no per-request Pryzael charge and no third-party free-tier quota. ChatGPT/OpenAI product limits and Secure MCP Tunnel availability remain external constraints.
