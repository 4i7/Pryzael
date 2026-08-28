# Pryzael remote MCP

## Purpose

Pryzael exposes the existing Skill catalog as read-only MCP workflow tools so ChatGPT surfaces that can call MCP tools can use the same engineering workflows even when native Personal Skill execution is unavailable.

The invariant is:

> `skills/<name>/SKILL.md` remains workflow authority. The Worker is a build-time projection of that package.

There is no separately maintained MCP workflow copy.

## Runtime architecture

```text
skills/*/SKILL.md
      |
      | build-time generation
      v
worker/generated/catalog.ts
      |
      v
Cloudflare Worker
  /mcp     stateless Streamable HTTP MCP
  /health  version/tool-count health endpoint
      |
      v
ChatGPT Plugin connection
```

The generated catalog is disposable output. The canonical source is always the Skill package.

## Tool model

One MCP tool is generated per Skill:

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

The tool description is the corresponding Skill frontmatter `description`. A normal call returns the Skill body as workflow guidance.

Every tool is annotated read-only, non-destructive, idempotent, and closed-world. The Worker does not perform repository mutations, external API calls, model calls, or downstream connector actions on behalf of the workflow.

## Package-local resources

At build time the generator bundles text files beneath each Skill's `references/`, `assets/`, and `scripts/` directories. A first workflow call reports the available resource paths. If the workflow needs one, call the same tool again with:

```json
{
  "resource": "references/example.md"
}
```

Only generated, package-local resource keys are accepted. Scripts are returned as text; the Worker does not execute them.

## Why Cloudflare Workers

Pryzael uses a stateless Worker rather than a local stdio process or tunnel because the intended ChatGPT surface must remain usable when the user's PC is off.

The deployment deliberately does not use:

- Durable Objects;
- KV;
- D1;
- R2;
- Queues;
- scheduled jobs;
- hosted databases;
- OpenAI API calls;
- a local tunnel or always-on PC.

The only runtime is the Worker request itself.

Cloudflare's current recommended path for a new stateless MCP server is `createMcpHandler()` with Streamable HTTP. The Pryzael Worker follows that model.

## Build path

Wrangler runs the custom build command declared in `wrangler.jsonc` before bundling:

```text
npm run generate:mcp-catalog
```

That command reads the canonical Skill files and generates `worker/generated/catalog.ts`. The generated file is not an independent authority and should not be edited by hand.

## GitHub -> Cloudflare deployment

The preferred deployment path is Cloudflare Workers Builds connected directly to `4i7/Pryzael`:

1. In Cloudflare Dashboard open **Workers & Pages**.
2. Create an application by importing a repository.
3. Connect GitHub and select `4i7/Pryzael`.
4. Set the Worker project name to `pryzael` so it matches `wrangler.jsonc`.
5. Select the MCP branch while qualification is in progress; switch production branch only after the candidate is accepted.
6. Use the repository root as the project root.
7. The deploy command may remain the Workers Builds default `npx wrangler deploy`; Wrangler runs the configured custom catalog build automatically.
8. Deploy and record the user-visible `*.workers.dev` hostname.

The resulting MCP URL is:

```text
https://<assigned-worker-hostname>/mcp
```

The health URL is:

```text
https://<assigned-worker-hostname>/health
```

Do not guess either hostname before Cloudflare displays it.

## Authentication decision

The initial product-gate deployment is unauthenticated. It serves only public Pryzael workflow text and performs no mutation or external action. This minimizes moving parts while determining whether the target Chat surface can actually execute the MCP tools.

If Chat-side execution succeeds and the service is retained, reassess exposure and add OAuth or another supported authorization layer if needed. Authentication must not be added merely as ceremony before the basic product path is proven.

## Free-plan boundary

As of the current Cloudflare Workers Free limits, the account receives 100,000 Worker requests per day and 10 ms CPU time per invocation. Pryzael is intentionally stateless and performs no network/database subrequests, so ordinary personal interactive use is expected to remain far below the request quota. The build-time catalog also avoids filesystem parsing or large schema construction during each request.

These are Cloudflare product limits, not Pryzael guarantees. Qualification should use the limits visible in the user's actual Cloudflare account/dashboard when operational decisions depend on them.

## ChatGPT qualification

Create a ChatGPT Plugin connection using the exact `/mcp` URL shown by the deployed Worker.

The product gate is satisfied only by ordinary user-visible evidence that ChatGPT actually executed a Pryzael MCP tool and used its result. Plugin existence/awareness alone is not execution proof.

Do not require or infer hidden package IDs, hidden routing state, private server-side traces unavailable to an ordinary user, or any other practically unobservable data as evidence.
