# Pryzael architecture

## 1. Goal

Pryzael packages engineering reasoning workflows as portable Agent Skills and exposes the same workflows through a read-only MCP adapter. ChatGPT is the primary product target while compatibility with other Agent Skills/MCP clients is preserved where practical.

The design optimizes for:

1. **Single workflow authority.** Each `skills/<name>/SKILL.md` remains canonical.
2. **Multiple projections.** Native Skills and MCP tools are alternate ways to load the same workflow, not separate implementations.
3. **Progressive disclosure.** Discovery metadata stays small; bodies and supporting resources load only after selection.
4. **Evidence-bound claims.** Workflows distinguish proof from inference and use `INCONCLUSIVE` when decisive evidence is unavailable.
5. **No hosted Pryzael backend.** MCP is a local read-only adapter; no database, API service, telemetry backend, or model call is required.

## 2. Authority boundaries

There are three distinct authorities:

- **Workflow authority:** each `skills/<name>/SKILL.md` plus files below that Skill root.
- **MCP projection authority:** `mcp/server.mjs`, which mechanically exposes the installed Skill catalog without redefining workflow semantics.
- **Plugin packaging authority:** `.codex-plugin/plugin.json`, which points to `./skills/` and `./.mcp.json`.

The MCP adapter must derive tool descriptions from Skill frontmatter and bodies from the same `SKILL.md`. Do not copy workflow instructions into server code.

A Skill must not depend on files above its own root for native Skill correctness. The MCP adapter may read package-local references/assets on behalf of a remote client that cannot access the local filesystem directly.

Every Skill folder carries the upstream pstack notice so independent Skill exports retain attribution.

## 3. Plugin shape

Pryzael uses an OpenAI **Skills + MCP** plugin shape:

```text
.codex-plugin/plugin.json
.mcp.json
mcp/server.mjs
mcp/server.test.mjs
skills/*/SKILL.md
skills/*/references/   optional
skills/*/assets/       optional
skills/*/scripts/      optional
```

The MCP server is deliberately local and read-only. It must not require:

- Pryzael-owned OAuth;
- a database;
- server-side telemetry;
- a third-party hosted runtime;
- OpenAI API/model calls;
- GitHub Actions as a request-path service;
- connector proxying.

Remote ChatGPT access may require an endpoint/tunnel supplied by the host product. That connectivity layer is external to Pryzael's workflow authority.

## 4. Discovery and trigger design

For native Agent Skills, `name` and `description` in `SKILL.md` form the discovery surface.

For MCP, `mcp/server.mjs` creates one tool per Skill and uses that same frontmatter `description` as the MCP tool description. Hyphenated Skill names are converted only to underscore tool identifiers (`blast-radius` -> `blast_radius`); semantic trigger text is not duplicated.

Trigger precedence remains guidance rather than a deterministic host promise:

1. large/cross-cutting/multi-phase work with no sufficient narrow workflow -> `figure-it-out`;
2. explicit artifact/design review -> `interrogate`;
3. defect/regression diagnosis -> `fix-root-causes`;
4. boundary design before implementation -> `architect`;
5. downstream compatibility/impact -> `blast-radius`;
6. migration/sweep/staged sequence -> `sequence-verifiable-units`;
7. explicit completion/proof -> `prove-it-works`;
8. audit/handoff/decision trail -> `show-me-your-work`.

This precedence remains subject to empirical routing qualification. The MCP adapter must not secretly add a second router that changes these meanings.

## 5. Composition

Composition stays directional and soft:

```text
figure-it-out
  -> architect
  -> blast-radius
  -> fix-root-causes
  -> sequence-verifiable-units
  -> interrogate
  -> show-me-your-work
  -> prove-it-works

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
  -> prove-it-works

show-me-your-work         leaf
prove-it-works            leaf
```

Neither Agent Skills nor MCP should be treated as guaranteeing deterministic Skill-to-Skill/tool-to-tool composition. Each workflow must remain useful if an optional related workflow is not loaded.

## 6. MCP projection contract

`mcp/server.mjs` is a pure package adapter.

At `tools/list` it:

1. scans `skills/*/SKILL.md`;
2. validates directory/name consistency;
3. reads `name` and `description` from frontmatter;
4. creates one read-only MCP tool per Skill;
5. reports no executable or network side effects.

At `tools/call` without a resource argument it returns:

- the selected Skill body;
- the list of package-local text resources available beneath `references/`, `assets/`, or `scripts/`.

When called again with an exact reported resource path, it returns that resource's text. Resource paths are confined to the selected Skill root. Package scripts are returned as text only; the MCP adapter never executes them.

The adapter itself does not perform the engineering task. Its result instructs the host model which Pryzael workflow to apply to the user's current request.

MCP annotations are:

```text
readOnlyHint: true
destructiveHint: false
idempotentHint: true
openWorldHint: false
```

## 7. Capability contract

Pryzael is capability-variable:

- use only tools/connectors actually available in the active session;
- repository writes require explicit user intent and a host capability that supports them;
- do not claim tests, browser actions, runtime flows, independent reviews, or writes that did not occur;
- when decisive evidence cannot be observed, preserve the missing check and use `INCONCLUSIVE`.

The MCP bridge does not expand these authorities. A returned workflow may call for GitHub or another tool, but that tool remains separately authorized/provided by the host.

## 8. Verification semantics

Pryzael uses:

- `VERIFIED` — suitable evidence directly supports the predicate;
- `NOT VERIFIED` — evidence contradicts it or a required check failed;
- `INCONCLUSIVE` — available evidence/capabilities cannot decide it.

A whole-task pass requires every required predicate to be `VERIFIED`. Evidence must be bound to the artifact it proves; for GitHub work prefer repository plus exact commit SHA over moving refs.

## 9. GitHub exact-head review

`interrogate` owns exact-head review. Its detailed contract remains in `skills/interrogate/references/github-exact-head-review.md`.

Native Skill clients load that package-local reference on demand. MCP clients obtain the same reference by calling the `interrogate` MCP tool again with the exact resource path reported by the initial workflow call.

Core invariant:

> A verdict applies to one explicitly bound base/candidate artifact pair. Moving branch/PR state must never silently replace that pair.

## 10. GitHub connector boundary

Pryzael uses GitHub operation semantics rather than hard-coded host-internal tool names. The MCP bridge does not proxy GitHub and never receives GitHub credentials.

A host may separately expose repository resolution, commit/file reads, comparisons, PR metadata, CI evidence, and optional writes. Workflows degrade transparently when those capabilities are unavailable.

## 11. Decision trails

`show-me-your-work` owns decision/evidence trail semantics. The logical fields remain:

`ts`, `phase`, `decision`, `why`, `evidence`, `result`.

Its TSV template is a package-local asset and is available through both native Skill packaging and the on-demand MCP resource mechanism.

## 12. Source and licensing

Pryzael is adapted from MIT-licensed pstack material. Each Skill carries `LICENSE.pstack.txt` so the upstream notice survives independent export. MCP exposure does not change that provenance boundary.

## 13. Validation

Validation has four layers:

1. upstream Agent Skills validation when available;
2. `python scripts/validate_skills.py` for Pryzael Skill-package invariants;
3. `node --test mcp/server.test.mjs` for MCP discovery/call/resource protocol behavior;
4. OpenAI plugin ingestion/submission validation plus live target-surface testing.

Important package invariants:

- `.codex-plugin/plugin.json` is valid and points to `./skills/` and `./.mcp.json`;
- `.mcp.json` launches `node ./mcp/server.mjs` from plugin root;
- MCP tool descriptions are derived from Skill frontmatter;
- MCP calls cannot escape a Skill root or perform writes/network actions;
- a change to a Skill does not require parallel edits to MCP workflow text.

Local validation cannot prove that a particular ChatGPT surface will expose or automatically call the plugin. Only observable behavior on that product surface can establish that.

## 14. Distribution and ChatGPT path

GitHub remains development source of truth, not a live backend.

### Native Skill path

Individual Skills may still be uploaded/installed on ChatGPT surfaces that support Personal Skills. No MCP process is needed for that path.

### Local bundled MCP path

Clients supporting plugin-provided `.mcp.json` can launch the bundled stdio server directly.

### ChatGPT Web MCP path

A remote ChatGPT product needs a reachable MCP endpoint. The preferred no-third-party-hosting development path is OpenAI Secure MCP Tunnel when available. It bridges a local/private MCP server to ChatGPT while the tunnel client is running.

Do not infer tool-call capability from plugin installation or model awareness alone. A Chat qualification requires user-visible evidence that the MCP tool executed.

### Public MCP distribution

A future public MCP plugin may require a stable HTTPS MCP endpoint and current OpenAI submission/auth/domain requirements. That hosted deployment is deferred until Chat-side usefulness is proven.

## 15. Infrastructure decision

The previous skills-only design eliminated all Pryzael runtime infrastructure. The MCP architecture intentionally introduces the smallest possible runtime authority: a local read-only process that projects existing files.

Allowed baseline runtime:

```text
node mcp/server.mjs
        +
OpenAI-supported MCP connectivity while in use
```

Still rejected as baseline dependencies:

- Vercel/Netlify/Cloudflare application hosting;
- GitHub Actions as runtime;
- hosted databases;
- Pryzael API/model calls;
- server-side state/telemetry;
- always-on local service requirements.

OpenAI tunnel/product availability and limits remain external constraints. Pryzael does not claim that those services are unlimited.

## 16. Non-goals

Pryzael is not:

- a durable workflow/transaction engine;
- a GitHub proxy;
- an autonomous background service;
- a promise that subagents or browser control exist;
- a replacement for tests/CI;
- a guarantee that every ChatGPT surface can call unpublished MCP plugins;
- a guarantee of unlimited ChatGPT/OpenAI usage.

It is a portable engineering workflow layer with native Skill and MCP projections from one canonical source.
