# Pryzael

Portable engineering workflows for ChatGPT, Codex, and other Agent Skills/MCP-compatible clients, adapted from selected `pstack` skills.

Pryzael keeps each `skills/<name>/SKILL.md` as the canonical workflow source and exposes the same sources through two runtime projections:

- **Agent Skills** for clients that natively load skills;
- **read-only MCP workflow tools** for clients/surfaces that can call MCP tools.

The MCP layer is an adapter, not a second workflow implementation.

## Skills

- `architect` — settle caller usage, data shapes, invariants, interfaces, and ownership before implementation.
- `blast-radius` — find non-obvious downstream breakage and prove the safety assumptions a change depends on.
- `figure-it-out` — orchestrate large, cross-cutting, unusual, or multi-phase work around falsifiable completion criteria.
- `show-me-your-work` — keep an auditable decision/evidence/result trail for handoffs and long work.
- `interrogate` — adversarially review a diff, PR, exact commit, or design and separate real findings from noise.
- `fix-root-causes` — reproduce failures, trace violated invariants, and repair the defect class rather than one symptom.
- `sequence-verifiable-units` — split multi-step work into independently checkable transitions and verify before advancing.
- `prove-it-works` — verify completion claims against the exact artifact and strongest available real behavior path.

## Plugin shape

```text
.codex-plugin/plugin.json
.mcp.json
mcp/
  server.mjs
  server.test.mjs
skills/
  architect/
  blast-radius/
  figure-it-out/
  fix-root-causes/
  interrogate/
  prove-it-works/
  sequence-verifiable-units/
  show-me-your-work/
```

`.codex-plugin/plugin.json` declares both `skills` and `mcpServers`. `.mcp.json` starts a local stdio MCP server with Node.js. The server discovers every Skill at runtime, derives each MCP tool description from that Skill's frontmatter, and returns the Skill body when the tool is called. Package-local `references/`, `assets/`, and text `scripts/` remain on-demand resources exposed through the same workflow tool.

The MCP server performs no writes, network requests, authentication, database access, or model/API calls. It only reads the installed Pryzael package. A public hosted Pryzael service is not required.

See [`docs/MCP.md`](docs/MCP.md) for local and ChatGPT connection instructions and [`ARCHITECTURE.md`](ARCHITECTURE.md) for the authority boundaries.

## Runtime model

Each skill remains independently valid:

```text
skills/<name>/
  SKILL.md
  references/              optional
  assets/                  optional
  scripts/                 optional
  LICENSE.pstack.txt
```

The `name` and `description` in each `SKILL.md` remain the discovery contract. MCP tool metadata is generated from them instead of duplicating trigger text in server code.

When a Skill body references a package-local supporting file, the MCP tool reports the available resource path. Calling that same workflow tool again with `resource` set to the reported path returns the supporting text. This preserves progressive disclosure without requiring the remote model to access the local filesystem directly.

## ChatGPT Web path

For ChatGPT surfaces that can call custom MCP plugins, Pryzael can run locally and be connected through an MCP endpoint. The preferred no-hosting development path is OpenAI's Secure MCP Tunnel: the MCP server and tunnel client run only while Pryzael is in use, and no third-party hosted runtime is required.

Do not infer MCP execution merely because a plugin appears installed or is mentioned by the model. Qualification should rely only on user-visible tool execution evidence available on the actual ChatGPT surface.

See [`docs/WEBCHATGPT.md`](docs/WEBCHATGPT.md) and [`docs/MCP.md`](docs/MCP.md).

## Validation

Agent Skills validation:

```text
skills-ref validate ./skills/architect
python scripts/validate_skills.py
```

MCP protocol/adapter smoke test (Node.js, no npm dependencies):

```text
node --test mcp/server.test.mjs
```

The local checks do not replace OpenAI's plugin ingestion/submission validation or live ChatGPT testing.

## Provenance

These materials are adapted from selected skills in Cursor's `pstack` plugin. Upstream pstack is MIT licensed. Each independently distributable skill folder contains `LICENSE.pstack.txt` so the notice remains present when a skill is copied or uploaded without the repository root.

See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) for repository-level provenance.
