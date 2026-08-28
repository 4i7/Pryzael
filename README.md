# Pryzael

Portable engineering workflows for ChatGPT, Codex, and other Agent Skills/MCP-compatible clients, adapted from selected `pstack` skills.

Pryzael keeps each `skills/<name>/SKILL.md` as the canonical workflow source and exposes the same workflows through two projections:

- **Agent Skills** for clients that natively load skills;
- **read-only remote MCP tools** served by a stateless Cloudflare Worker.

The MCP layer is a generated adapter, not a second workflow implementation.

## Skills

- `architect` — settle caller usage, data shapes, invariants, interfaces, and ownership before implementation.
- `blast-radius` — find non-obvious downstream breakage and prove the safety assumptions a change depends on.
- `figure-it-out` — orchestrate large, cross-cutting, unusual, or multi-phase work around falsifiable completion criteria.
- `show-me-your-work` — keep an auditable decision/evidence/result trail for handoffs and long work.
- `interrogate` — adversarially review a diff, PR, exact commit, or design and separate real findings from noise.
- `fix-root-causes` — reproduce failures, trace violated invariants, and repair the defect class rather than one symptom.
- `sequence-verifiable-units` — split multi-step work into independently checkable transitions and verify before advancing.
- `prove-it-works` — verify completion claims against the exact artifact and strongest available real behavior path.

## Runtime shape

```text
.codex-plugin/plugin.json
skills/*/SKILL.md                 canonical workflow authority
scripts/generate_mcp_catalog.mjs  build-time projection
worker/index.ts                   stateless Streamable HTTP MCP
wrangler.jsonc                    Cloudflare Workers deployment
package.json
```

Before Wrangler bundles the Worker, `scripts/generate_mcp_catalog.mjs` reads the eight canonical Skill packages and emits an ephemeral TypeScript catalog under `worker/generated/`. The deployed Worker therefore needs no filesystem, database, KV, D1, Durable Object, background process, OpenAI API call, or local PC.

The Worker exposes:

- `/mcp` — stateless MCP Streamable HTTP endpoint;
- `/health` — small service/version/tool-count health response.

Each MCP tool description comes from the matching `SKILL.md` frontmatter, and its result returns that Skill body. Text resources under a Skill's `references/`, `assets/`, or `scripts/` directory are bundled at build time and can be requested on demand through the same tool.

See [`docs/MCP.md`](docs/MCP.md) and [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Authority boundary

Each skill remains independently valid:

```text
skills/<name>/
  SKILL.md
  references/              optional
  assets/                  optional
  scripts/                 optional
  LICENSE.pstack.txt
```

The `name`, `description`, and workflow body in `SKILL.md` remain authoritative. Do not hand-maintain a second copy in Worker code. MCP routing metadata and workflow content are regenerated from these files at build/deploy time.

The MCP server itself performs no repository mutation or downstream tool action. If a returned Pryzael workflow calls for GitHub, browser, filesystem, or execution capabilities, those remain capabilities of the active ChatGPT/Codex host.

## Cloudflare deployment

Pryzael targets a stateless Cloudflare Worker so ChatGPT can reach the MCP endpoint without a local machine or tunnel. Cloudflare Workers Builds can connect directly to this GitHub repository and deploy on push.

For the initial product gate the endpoint is intentionally read-only and unauthenticated because it exposes only public Pryzael workflow material. Authentication can be added after Chat-side MCP execution is proven if the deployment threat model requires it.

See [`docs/MCP.md`](docs/MCP.md) for the exact deployment and qualification path.

## Validation

Agent Skills validation:

```text
skills-ref validate ./skills/architect
python scripts/validate_skills.py
```

Cloudflare Worker validation after dependency installation:

```text
npm run generate:mcp-catalog
npm run typecheck
npx wrangler deploy --dry-run
```

Live qualification requires a deployed `https://<worker>.workers.dev/mcp` endpoint and user-visible evidence that ChatGPT actually executed a Pryzael MCP tool. Plugin awareness alone is not sufficient.

## Provenance

These materials are adapted from selected skills in Cursor's `pstack` plugin. Upstream pstack is MIT licensed. Each independently distributable skill folder contains `LICENSE.pstack.txt` so the notice remains present when a skill is copied or uploaded without the repository root.

See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) for repository-level provenance.
