# Pryzael architecture

## 1. Goal

Pryzael packages engineering reasoning workflows as portable Agent Skills and exposes the same workflows through a read-only remote MCP projection. ChatGPT is the primary product target while compatibility with other Agent Skills/MCP clients is preserved where practical.

The design optimizes for:

1. **Single workflow authority.** Each `skills/<name>/SKILL.md` remains canonical.
2. **Multiple projections.** Native Skills and MCP tools are alternate ways to load the same workflow, not separate implementations.
3. **Progressive disclosure.** Discovery metadata stays small; bodies and supporting resources load only after selection.
4. **Evidence-bound claims.** Workflows distinguish proof from inference and use `INCONCLUSIVE` when decisive evidence is unavailable.
5. **Minimal hosted runtime.** The remote MCP endpoint is stateless, read-only, and performs no external actions or model/API calls.
6. **No local-PC dependency.** ChatGPT can reach Pryzael while the user's computer is offline.

## 2. Authority boundaries

There are three distinct authorities:

- **Workflow authority:** each `skills/<name>/SKILL.md` plus files below that Skill root.
- **MCP projection implementation:** `scripts/generate_mcp_catalog.mjs` plus `worker/index.mjs`.
- **Plugin packaging authority:** `.codex-plugin/plugin.json`, which continues to describe the installable Skill collection and owns the Pryzael version used by the generated MCP catalog.

The build generator derives tool descriptions, workflow bodies, package-local text resources, and MCP version from canonical repository sources. The Worker must not carry manually duplicated workflow text or version constants.

Every Skill remains self-contained for native Skill clients and carries the upstream pstack notice.

## 3. Runtime shape

```text
skills/*/SKILL.md
skills/*/{references,assets,scripts}/   optional
        |
        | Cloudflare build step
        v
scripts/generate_mcp_catalog.mjs
        |
        v
worker/generated/catalog.mjs           disposable derived artifact
        |
        v
worker/index.mjs
        |
        v
Cloudflare Workers /mcp
```

`wrangler.jsonc` is deployment configuration and `package.json` declares the minimal Worker/MCP build dependencies.

The deployed runtime must not require a local process or tunnel, Durable Objects, KV/D1/R2/Queues/databases, Pryzael-owned model/API calls, GitHub Actions as request-path service, connector proxying, or server-side workflow state.

## 4. Discovery and trigger design

For native Agent Skills, `name` and `description` in `SKILL.md` form the discovery surface.

For MCP, the build generator creates one tool per top-level Skill and copies that same frontmatter `description` into the derived catalog. Hyphenated Skill names are converted only to underscore tool identifiers (`blast-radius` -> `blast_radius`); semantic trigger text is not duplicated in Worker source.

Trigger precedence remains guidance rather than a deterministic host promise:

1. large/cross-cutting/multi-phase work with no sufficient narrow workflow -> `figure-it-out`;
2. explicit artifact/design review -> `interrogate`;
3. defect/regression diagnosis -> `fix-root-causes`;
4. boundary design before implementation -> `architect`;
5. downstream compatibility/impact -> `blast-radius`;
6. explanation of how the current system/runtime flow works -> `how`;
7. historical/product/operational rationale for why a design exists -> `why`;
8. migration/sweep/staged sequence -> `sequence-verifiable-units`;
9. explicit completion/proof -> `prove-it-works`;
10. audit/handoff/decision trail -> `show-me-your-work`.

This remains subject to empirical routing qualification. The MCP transport must not introduce a second hidden router.

### Capability admission gate

Before adding another top-level Skill/MCP tool, compare these alternatives:

1. **No addition.** Existing workflow already owns the invariant.
2. **Owner-local resource/playbook.** Specialized procedure belongs under an existing owner and loads only when needed.
3. **Host capability.** ChatGPT/GitHub/another App already owns the action; Pryzael should guide its use rather than proxy it.
4. **New top-level tool.** Admit only when the user intent is semantically distinct and cannot be represented cleanly by an existing owner.

For consequential changes also compare deletion/reuse vs new mechanism, foundational redesign vs incremental patch, and stateless/generated vs stateful/hand-maintained shapes. `skills/architect/references/design-space-gate.md` contains the reusable decision procedure.

This keeps the routing surface lean. Upstream packaging is evidence, not authority. See `docs/PSTACK_INTEGRATION.md` for the current pstack adoption matrix.

## 5. Composition

Composition stays directional and soft:

```text
figure-it-out
  -> how
  -> why
  -> architect
  -> blast-radius
  -> fix-root-causes
  -> sequence-verifiable-units
  -> interrogate
  -> show-me-your-work
  -> prove-it-works

how
  -> why
  -> architect
  -> blast-radius

why
  -> how
  -> architect

architect
  -> interrogate
  -> prove-it-works

blast-radius
  -> prove-it-works

sequence-verifiable-units
  -> fix-root-causes
  -> prove-it-works

interrogate
  -> blast-radius
  -> prove-it-works

fix-root-causes
  -> architect
  -> prove-it-works

show-me-your-work         leaf
prove-it-works            leaf
```

Neither Agent Skills nor MCP guarantees deterministic workflow-to-workflow composition. Each workflow must remain useful if a related workflow is not selected.

## 6. MCP projection contract

The generator runs at build/deploy time and:

1. scans `skills/*/SKILL.md`;
2. validates directory/name consistency;
3. reads `name`, `description`, and body;
4. collects text resources under `references/`, `assets/`, and `scripts/` without following symlinks;
5. reads the Pryzael version from `.codex-plugin/plugin.json`;
6. emits a disposable JavaScript catalog consumed by the Worker.

The Worker creates one MCP tool per catalog entry. A normal call returns the selected Skill body and the list of bundled package-local text resources available for that Skill. When called with an exact advertised `resource` key, it returns that resource's text. Scripts are returned as text only and are never executed.

Specialized pstack-derived procedures should prefer package-local resources rather than new top-level tools when an existing owner already exists.

MCP annotations are:

```text
readOnlyHint: true
destructiveHint: false
idempotentHint: true
openWorldHint: false
```

The Worker itself does not perform the engineering task. It supplies the canonical workflow to the host model.

## 7. Cloudflare execution model

Pryzael uses the current minimal stateless MCP path from `@modelcontextprotocol/server` 2.0.0, including `createMcpHandler()`, with Streamable HTTP. The Agents SDK and Cloudflare-specific TypeScript definition package are intentionally not dependencies.

The Worker exposes:

```text
/mcp       MCP protocol endpoint
/health    service/version/tool-count health endpoint
```

A fresh MCP server instance is created per request. No protocol or workflow state is persisted between requests. Plain JavaScript is used deliberately so deployment correctness does not depend on the publication cadence of Cloudflare TypeScript definition packages.

## 8. Capability contract

Pryzael is capability-variable:

- use only tools/connectors actually available in the active session;
- repository writes require explicit user intent and a host capability that supports them;
- do not claim tests, browser actions, runtime flows, independent reviews, or writes that did not occur;
- when decisive evidence cannot be observed, preserve the missing check and use `INCONCLUSIVE`.

The MCP endpoint does not expand those authorities. A returned workflow may call for GitHub or another host tool, but that tool remains separately authorized and supplied by the host.

## 9. Verification semantics

Pryzael uses:

- `VERIFIED` — suitable evidence directly supports the predicate;
- `NOT VERIFIED` — evidence contradicts it or a required check failed;
- `INCONCLUSIVE` — available evidence/capabilities cannot decide it.

A whole-task pass requires every required predicate to be `VERIFIED`. Evidence must be bound to the artifact it proves; for GitHub work prefer repository plus exact commit SHA over moving refs.

Only practically observable user/product evidence may be used as qualification authority. Hidden package IDs, internal selector states, server traces unavailable to an ordinary user, or other unobservable internals must not be required as proof.

## 10. GitHub exact-head review

`interrogate` owns exact-head review. Its detailed contract remains in `skills/interrogate/references/github-exact-head-review.md`.

Native Skill clients load that package-local reference on demand. MCP clients obtain the same reference through the `interrogate` tool's advertised resource key.

Core invariant:

> A verdict applies to one explicitly bound base/candidate artifact pair. Moving branch/PR state must never silently replace that pair.

## 11. GitHub connector boundary

Pryzael uses GitHub operation semantics rather than hard-coded host-internal tool names. The MCP Worker does not proxy GitHub and never receives GitHub credentials. Host-provided repository reads/writes remain separately authorized capabilities.

`why` may ask the host to consult multiple available Apps/evidence categories, but Pryzael itself still does not proxy or persist their data.

## 12. Decision trails

`show-me-your-work` owns decision/evidence trail semantics. The logical fields remain `ts`, `phase`, `decision`, `why`, `evidence`, `result`. Its TSV template is bundled as a package-local MCP resource and remains a native Skill asset.

## 13. Source, licensing, and distribution

Unless a file states otherwise, Pryzael-authored source code and documentation are licensed under the repository-root MIT [`LICENSE`](LICENSE).

Selected Skill material is adapted from MIT-licensed pstack material. Each Skill carries `LICENSE.pstack.txt` so the upstream notice survives independent export, and `THIRD_PARTY_NOTICES.md` records repository-level provenance. The root Pryzael license does not replace third-party attribution.

MCP exposure and generated artifacts do not create a second workflow or licensing authority. See `docs/DISTRIBUTION.md` for the full distribution boundary.

## 14. Validation

Validation has four layers:

1. upstream Agent Skills validation when available;
2. `npm run validate:skills` for Pryzael Skill-package invariants;
3. generated-catalog, Worker protocol smoke, and Wrangler dry-run bundle validation through repository qualification;
4. live Cloudflare endpoint and ChatGPT product-surface qualification.

Use package scripts as the contributor-facing command authority instead of documenting validator implementation filenames. This keeps the documented command stable if the implementation changes.

Expected repository check after dependencies are installed:

```text
npm run check
```

`npm run check` currently runs `qualify:head-authority`, `qualify:r1`, and `qualify:r4-lab` in sequence.

Important invariants:

- `.codex-plugin/plugin.json` remains valid and points to `./skills/`;
- Worker tool descriptions and bodies are generated from canonical Skills;
- Worker version is generated from plugin metadata rather than separately hard-coded;
- runtime performs no filesystem scan, downstream network/API call, or persistent-state access;
- package resources cannot be invented by the caller and are limited to generated catalog keys;
- a Skill change requires no manual parallel edit to MCP workflow text;
- deployability does not depend on Cloudflare's separately versioned TypeScript definitions.

Static checks cannot prove that a particular ChatGPT surface will expose or execute the MCP tools. Only observable behavior on that product surface can establish that.

See `docs/DEVELOPMENT.md` for the contributor decision flow and change-class-to-authority mapping.

## 15. Distribution and deployment

GitHub remains development source of truth. Cloudflare Workers is the live MCP runtime.

Distribution rights, pstack attribution, standalone Skill copying, and generated-artifact boundaries are documented in `docs/DISTRIBUTION.md`.

### Native Skill path

Individual Skills may still be uploaded/installed on ChatGPT surfaces that support Personal Skills. No MCP endpoint is needed for that path.

### Remote MCP path

Cloudflare Workers Builds connects to the GitHub repository, runs the generator during Wrangler's custom build, and deploys the Worker to a `workers.dev` hostname. Stable production should follow `main`; feature branches are qualification candidates until merged.

The ChatGPT developer Plugin connection uses the resulting:

```text
https://<actual-worker-hostname>/mcp
```

### Authentication

The current endpoint is unauthenticated because the Worker serves only public repository workflow text and performs no external action. If future capabilities introduce private data or writes, reassess OAuth/authorization before exposing them.

See `docs/OPERATIONS.md` for the current application-log boundary, observability configuration, sampling policy, and evidence threshold for adding rate limiting or revisiting authentication.

## 16. Infrastructure decision

The MCP architecture intentionally introduces one hosted runtime authority: a stateless Cloudflare Worker.

Allowed runtime:

```text
Cloudflare Workers
  -> stateless /mcp
  -> generated public Pryzael workflow catalog
```

Still excluded unless future evidence requires them: local always-on processes/tunnels, duplicate hosts, Durable Objects/stateful MCP sessions, KV/D1/R2/Queues/databases, GitHub Actions as runtime, Pryzael model/API calls, or connector credential proxying.

Cloudflare plan limits remain external product constraints. Pryzael does not claim that those services are unlimited.

## 17. Non-goals

Pryzael is not a durable workflow/transaction engine, GitHub proxy, autonomous background service, promise that subagents/browser control exist, replacement for tests/CI, guarantee every ChatGPT surface can call unpublished MCP plugins, or guarantee of unlimited ChatGPT/Cloudflare usage.

It is a portable engineering workflow layer with native Skill and remote MCP projections from one canonical source.
