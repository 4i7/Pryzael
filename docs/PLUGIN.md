# Pryzael as a skills-only ChatGPT plugin

Pryzael is packaged as a **skills-only plugin**. It deliberately has no MCP server, app mapping, custom UI, hooks, or runtime service.

## Why this shape

OpenAI plugins can contain skills, an MCP server, or both. Pryzael's workflows operate on instructions, references, and tools/connectors that are already available in the active ChatGPT or Codex session. It does not need a service owned by Pryzael.

This keeps the runtime architecture zero-infrastructure:

```text
Pryzael plugin
  -> .codex-plugin/plugin.json
  -> skills/*/SKILL.md
  -> skill-local references/assets

No Pryzael MCP server
No always-on process
No database
No Vercel/Workers function
No OpenAI API calls
No GitHub Actions runtime
```

The plugin does not bundle GitHub or another third-party connector. A skill uses a connector only when that connector is actually available and authorized in the active session. This preserves the capability-variable contract and avoids turning an existing integration into a hidden runtime dependency.

## Canonical package

The repository root is the plugin root. `.codex-plugin/plugin.json` is the plugin manifest and points at `./skills/`.

The eight skill directories remain the canonical workflow sources. Plugin metadata must not duplicate their detailed procedures or create a second workflow authority.

## Cost boundary

The skills-only design has no Pryzael-operated runtime infrastructure and therefore no hosting/request quota to exhaust.

This does **not** make ChatGPT itself unlimited. Model, connector, and product usage remains subject to the user's ChatGPT plan and to any limits imposed by third-party services. "Zero infrastructure" means Pryzael adds no metered server or API dependency of its own.

Free-tier hosted MCP designs are intentionally rejected for the core plugin because Vercel, Cloudflare Workers, GitHub Actions, tunnels, and similar services have quotas, availability constraints, or operational limits. GitHub is used as source/version control, not as a live request-path backend.

## Testing paths

### Package validation

A skills-only submission accepts a ZIP containing a supported plugin manifest and at least one `skills/<skill>/SKILL.md`. GitHub's repository ZIP has a single top-level directory, which matches the supported archive shape as long as `.codex-plugin/plugin.json` and the skill tree are present.

### Local plugin testing

OpenAI's documented local marketplace flow is supported by the ChatGPT desktop app and Codex tooling. It is useful for activation/evaluation work but is not a Web-only installation mechanism.

### Web distribution

For ChatGPT on the web, the zero-server path is the OpenAI plugin submission portal:

1. Create a plugin submission.
2. Choose **Skills only**.
3. Upload the final plugin ZIP.
4. Complete listing metadata and developer verification.
5. Pass skill security scans and review.
6. Publish the approved version to the universal Plugins Directory.

A skills-only submission does not require an MCP server URL or domain verification. Website, support, privacy, and terms URLs are optional for the skills-only final directory submission under the current OpenAI rules.

## What the ChatGPT "New plugin" server URL dialog means

The server-URL dialog under ChatGPT Plugins is the developer-mode path for directly connecting an MCP server. It is not the only plugin architecture and is not the correct entry point for Pryzael's skills-only package.

## Submission-time metadata

The package manifest intentionally keeps publisher-specific listing data minimal. Public submission requires a verified developer or business identity, and the portal owns final listing fields such as developer identity, category, descriptions, and availability.

Do not hard-code identity/legal metadata that can conflict with the identity selected in the OpenAI Platform submission portal.

## Deferred features

Do not add any of these unless a future workflow demonstrably requires live Pryzael-owned capabilities:

- `.mcp.json` or `mcpServers`;
- `.app.json` or `apps`;
- custom MCP UI/screenshots;
- OAuth;
- hosted state or databases;
- server-side telemetry;
- lifecycle hooks required for core ChatGPT behavior.

If such a requirement appears later, treat it as an architectural fork. The skills-only plugin remains the baseline because it is the only Pryzael shape with no added runtime infrastructure.
