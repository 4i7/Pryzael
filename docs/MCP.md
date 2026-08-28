# Pryzael MCP bridge

## Purpose

The MCP bridge exposes the existing Pryzael Skill catalog as read-only MCP workflow tools. It exists to make the same engineering workflows reachable on ChatGPT/Codex surfaces where MCP tools are available even when native Personal Skill execution is not.

The invariant is:

> `skills/<name>/SKILL.md` remains workflow authority. MCP is only a projection of that package.

The adapter contains no copied Skill descriptions or workflow bodies.

## Tool model

At `tools/list`, `mcp/server.mjs` scans `skills/*/SKILL.md` and creates one tool per Skill:

| Skill | MCP tool |
|---|---|
| `architect` | `architect` |
| `blast-radius` | `blast_radius` |
| `figure-it-out` | `figure_it_out` |
| `fix-root-causes` | `fix_root_causes` |
| `interrogate` | `interrogate` |
| `prove-it-works` | `prove_it_works` |
| `sequence-verifiable-units` | `sequence_verifiable_units` |
| `show-me-your-work` | `show_me_your_work` |

The MCP tool description is the corresponding Skill frontmatter `description`. A normal call takes no required arguments and returns the Skill body as workflow guidance.

Every tool is annotated read-only, non-destructive, idempotent, and closed-world. The server itself performs no repository/tool action on behalf of the workflow; any GitHub, browser, file, or execution capability mentioned by the returned Skill remains the responsibility of the active ChatGPT/Codex host.

## Package-local resources

The adapter discovers text files beneath a Skill's `references/`, `assets/`, and `scripts/` directories. A first workflow call reports the available resource paths. If the workflow needs one, call the same tool again with:

```json
{
  "resource": "references/example.md"
}
```

The path must exactly match a resource reported for that Skill. The server does not follow arbitrary paths or execute package scripts.

## Local stdio MCP

Requirements:

- Node.js with ES module support (current Node LTS is sufficient);
- a local Pryzael checkout/package.

Start directly:

```text
node mcp/server.mjs
```

The plugin's `.mcp.json` contains the equivalent bundled server definition:

```json
{
  "mcpServers": {
    "pryzael": {
      "cwd": ".",
      "command": "node",
      "args": ["./mcp/server.mjs"]
    }
  }
}
```

Run the protocol smoke test:

```text
node --test mcp/server.test.mjs
```

No npm install is required.

## ChatGPT Web without third-party hosting

A remote ChatGPT product cannot connect directly to a local stdio process. For development/testing, use OpenAI's Secure MCP Tunnel when that feature is available to the account/workspace. The tunnel-client documentation describes a `sample_mcp_stdio_local` profile that launches a local MCP command and bridges it to an OpenAI-hosted tunnel endpoint.

On Windows/PowerShell the flow is conceptually:

```powershell
$env:CONTROL_PLANE_API_KEY = "<runtime key>"

tunnel-client init `
  --sample sample_mcp_stdio_local `
  --profile pryzael `
  --tunnel-id <tunnel id> `
  --mcp-command "node C:\path\to\Pryzael\mcp\server.mjs"

tunnel-client doctor --profile pryzael --explain
tunnel-client run --profile pryzael
```

Create/inspect the tunnel ID, runtime credentials, and ChatGPT connector/plugin endpoint only through the OpenAI UI/CLI surfaces actually available to the user. Do not guess hidden endpoint IDs or treat unobservable internal state as evidence.

Keep `tunnel-client run` alive while ChatGPT is discovering or calling the MCP tools. Stop it when Pryzael is not in use. Pryzael does not require a third-party hosting account, database, or always-on service.

Secure MCP Tunnel availability, permissions, and product limits are controlled by OpenAI and are not properties Pryzael can guarantee.

## Public deployment

A future public-directory MCP plugin may require a stable HTTPS MCP endpoint and the associated OpenAI submission/domain/auth requirements. That is deliberately outside the current local/no-hosting architecture. Do not add a hosted backend merely to reproduce the local bridge until Chat-side MCP usefulness has been established empirically.

## Observable qualification

For ChatGPT qualification, only user-visible facts count. Useful evidence includes a visible tool execution/card or other product-provided indication that the MCP tool was actually called and its result used.

Do not use as proof:

- guessed internal selector state;
- hidden package hashes/IDs unavailable to a normal user;
- model claims that a plugin exists without an observable MCP call;
- an MCP tool result that was never visibly executed.
