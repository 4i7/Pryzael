# Pryzael architecture

## 1. Goal

Pryzael packages engineering reasoning workflows as portable Agent Skills and distributes the current suite as a skills-only OpenAI plugin. The target is ChatGPT first while preserving compatibility with other Agent Skills clients where practical.

The design optimizes for five properties:

1. **Portable activation.** Each skill is independently usable through its own `SKILL.md`.
2. **Progressive disclosure.** Discovery metadata stays small; detailed, situational procedures move to references.
3. **Evidence-bound claims.** Skills distinguish direct proof from static inference and use `INCONCLUSIVE` when decisive proof is unavailable.
4. **Composable rigor.** Large workflows delegate named concerns to smaller skills instead of embedding copies of their procedures.
5. **Zero Pryzael runtime infrastructure.** The plugin adds instructions/resources, not a hosted service.

## 2. Runtime and packaging boundaries

There are two distinct authorities:

- **Skill runtime authority:** each `skills/<name>/SKILL.md` plus files below that skill root.
- **Plugin packaging authority:** `.codex-plugin/plugin.json`, which gives the collection a stable install identity and points at `./skills/`.

The plugin manifest does not redefine skill behavior. It must not duplicate detailed skill procedures, composition rules, or verification logic. Those remain in the skill packages.

A skill must not depend on files above its own root for runtime correctness because individual skills may be exported or installed independently. Repository files such as this document are development guidance, not skill runtime dependencies.

Every skill folder carries the upstream pstack license notice because an individual skill may be exported without the repository root.

## 3. Plugin shape

Pryzael uses the OpenAI **Skills only** plugin shape.

```text
.codex-plugin/plugin.json
skills/*/SKILL.md
skills/*/references/   optional
skills/*/assets/       optional
skills/*/scripts/      optional
```

The baseline must not contain or require:

- `.mcp.json` / `mcpServers`;
- `.app.json` / `apps`;
- Pryzael-owned OAuth;
- an always-on service;
- a database;
- server-side telemetry;
- UI that requires an MCP server;
- hooks required for core ChatGPT behavior.

OpenAI explicitly supports plugins made only of skills when instructions and tools already available to the model are sufficient. Pryzael fits that category.

This architecture removes Pryzael-operated request quotas and hosting costs. It does not make ChatGPT, models, connectors, GitHub, or other third-party services unlimited; their own product limits still apply.

## 4. Discovery and trigger design

Only short skill metadata should decide activation. Descriptions must say both what the skill does and when it should be used.

Trigger precedence for overlapping engineering tasks:

1. **Large/cross-cutting/multi-phase or no narrow workflow fits:** `figure-it-out` owns orchestration.
2. **Explicit review of a diff/PR/commit/design:** `interrogate` owns the review.
3. **Debugging a failure/regression:** `fix-root-causes` owns diagnosis and repair reasoning.
4. **Design before implementation across boundaries:** `architect` owns the design.
5. **Hidden downstream-impact question:** `blast-radius` owns impact analysis.
6. **Migration/sweep/staged sequence:** `sequence-verifiable-units` owns ordering.
7. **Completion/proof question:** `prove-it-works` owns verification.
8. **Audit/handoff/decision-log request:** `show-me-your-work` owns the trail.

This precedence is routing guidance, not a promise that every Agent Skills client exposes deterministic priority controls. Descriptions are written to reduce ambiguous activation, and multiple skills may legitimately be loaded for one task.

Plugin metadata is discovery/install-surface metadata only. Do not try to force skill routing through plugin-level descriptions.

## 5. Composition graph

Composition is intentionally directional to avoid recursive workflow loops.

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
  -> interrogate          optional design challenge
  -> prove-it-works       final implementation proof when implementation occurs

blast-radius
  -> prove-it-works       decisive safety checks

sequence-verifiable-units
  -> fix-root-causes      only when a unit fails for an unexplained reason
  -> prove-it-works       per-unit and whole-sequence checks

interrogate
  -> blast-radius         when hidden downstream effects are central
  -> prove-it-works       when a finding needs decisive reproduction/proof

fix-root-causes
  -> prove-it-works       prove symptom and violated invariant are repaired

show-me-your-work         leaf
prove-it-works            leaf
```

### Soft composition, not runtime linkage

The public Agent Skills model allows a client to use one or more relevant skills, but it does not define a portable API by which one `SKILL.md` synchronously invokes another by name.

Therefore Pryzael composition is **soft**:

- a skill may state that another named skill should own a concern when that skill is available;
- the client may activate both skills automatically, or the user/model may select the other skill explicitly;
- the calling skill must still remain useful if the named skill is unavailable;
- no runtime correctness may depend on a cross-skill filesystem reference;
- composition must never recurse indefinitely.

A composed skill owns only its concern. The top-level workflow remains responsible for task state, evidence integration, and final handoff.

## 6. Common capability contract

Pryzael targets capability-variable environments.

- Use only tools and connected sources actually available in the active session.
- Repository read access is sufficient for static analysis. Writes are optional capabilities and require user intent plus connector support.
- Do not infer that ChatGPT, GitHub, a terminal, browser control, subagents, or a specific model family is available merely because another client supports it.
- Never report a command, test, build, runtime flow, independent reviewer, or write as completed unless it actually ran.
- When the decisive observation cannot be made, preserve the exact missing check and return `INCONCLUSIVE` for that claim.

A skills-only plugin must not smuggle a third-party connector in as an implicit hard dependency. GitHub-aware skills use GitHub only when an authorized GitHub capability is actually present. Otherwise they degrade transparently.

## 7. Verification semantics

Pryzael uses three claim states:

- `VERIFIED`: evidence directly supports the predicate at a suitable level for the claim.
- `NOT VERIFIED`: evidence contradicts the predicate or the required check failed.
- `INCONCLUSIVE`: available evidence or capabilities cannot decide the predicate.

A whole-task pass requires every required predicate to be `VERIFIED`. Static review may still produce a useful finding when runtime proof is unavailable, but it must not be mislabeled as runtime verification.

Evidence must be bound to the artifact identity it proves. For GitHub work, prefer repository plus exact commit SHA; branch names and PR numbers are context, not immutable identity.

## 8. GitHub exact-head review contract

`interrogate` owns exact-head review. Its detailed algorithm lives in `skills/interrogate/references/github-exact-head-review.md` and should be loaded only for GitHub reviews where commit identity matters.

Core invariant:

> A review verdict applies to one explicitly bound base/candidate artifact pair. Moving branch or PR state must never silently replace that pair.

The review binds exact SHAs, verifies expected ancestry/comparison semantics, reads changed and contextual files at explicit SHAs, keys CI evidence to the candidate SHA, and rechecks moving PR/branch identity before reporting current-state claims.

## 9. GitHub connector architecture

Pryzael uses operation semantics rather than hard-coded internal tool names because ChatGPT surfaces and connector implementations can change.

Required read operations for a strong exact-head review are conceptually:

- resolve repository;
- resolve commit objects;
- read PR metadata when a PR is part of the task;
- compare exact base and candidate commits and inspect ancestry/status;
- enumerate changed paths;
- read file content at an exact commit;
- read commit-bound checks/workflow evidence when relevant;
- re-read moving context before claiming a verdict applies to the current PR/branch tip.

Optional write operations are outside review semantics. `interrogate` is read-only by default even if the active connector exposes writes.

Search is useful for discovery but is not identity authority. Once a path/ref is known, fetch it directly at the bound SHA.

The skills-only plugin does not attempt to embed, proxy, or resubmit the existing GitHub integration. The GitHub connector remains a separately authorized capability supplied by the host environment.

## 10. Decision trails

`show-me-your-work` owns audit-trail semantics. Other skills should not invent alternate log schemas.

The canonical logical fields are:

`ts`, `phase`, `decision`, `why`, `evidence`, `result`.

The durable representation may be TSV when a writable artifact surface exists. When persistence is unavailable, the same schema can be returned in the conversation without pretending a durable file was written.

## 11. Source and licensing boundary

Pryzael is adapted from MIT-licensed pstack material. Repository-level notices are insufficient for independently exported skills, so each skill folder includes the upstream notice. `metadata` carries provenance using Agent Skills-compatible string key/value entries rather than non-standard top-level YAML keys.

The plugin manifest is packaging metadata for the Pryzael collection. It does not replace the per-skill upstream notices.

## 12. Validation

Validation has three layers:

1. Run the upstream Agent Skills validator when available.
2. Run `scripts/validate_skills.py` to catch Pryzael-specific skill drift such as unsupported frontmatter keys, directory/name mismatch, missing upstream notice, oversized `SKILL.md`, and broken local resource references.
3. Treat the OpenAI plugin upload/submission validator and skill security scanner as the authority for public plugin packaging constraints.

Important skills-only package invariants include:

- `.codex-plugin/plugin.json` exists and is valid JSON;
- `skills` resolves to `./skills/`;
- at least one valid `skills/<name>/SKILL.md` exists;
- no `mcpServers`, `.mcp.json`, `apps`, or `.app.json` are introduced into the skills-only package;
- no screenshots are declared for the skills-only submission;
- new releases increment the plugin manifest version.

The local validator deliberately avoids pretending to replace OpenAI's submission-time normalization, security scans, or review.

## 13. Distribution and WebChatGPT path

### Source and versioning

GitHub is the development source of truth. It is not a live backend in the plugin request path.

### Local evaluation

OpenAI's documented local marketplace flow is supported by the ChatGPT desktop app and Codex tooling. Use it for activation and regression evaluation when available. It is not required for the final Web runtime.

### Web distribution

The zero-server Web path is:

1. package the repository as a plugin ZIP;
2. open the OpenAI plugin submission portal;
3. choose **Skills only**;
4. upload the package;
5. select a verified developer/business identity and complete required listing fields;
6. pass bundled-skill safety/security scans and review;
7. publish the approved version to the universal Plugins Directory.

A skills-only public submission does not require an MCP server URL, MCP domain verification, OAuth, or a hosted Pryzael service. Under the current submission rules, website/support/privacy/terms URLs are optional for skills-only submissions.

The ChatGPT **New plugin** dialog that asks for a server URL is the developer-mode MCP connection path. It is not the installation/submission path for a skills-only package.

## 14. Infrastructure decision

Strictly exclude hosted runtime designs from the Pryzael baseline when they only reproduce behavior that skills and existing host tools can already provide.

Rejected baseline dependencies include:

- Vercel/Netlify/Cloudflare serverless functions;
- GitHub Actions as a runtime service;
- tunnels;
- self-hosted always-on MCP processes;
- paid or free-tier databases;
- OpenAI API calls made by Pryzael infrastructure.

Free tiers are not equivalent to unbounded infrastructure; they have quotas, cold starts, suspension rules, or operational limits. The skills-only plugin avoids this class of dependency entirely.

If a future use case genuinely requires Pryzael-owned live data or controlled actions, introducing MCP is an architectural fork and must justify the new runtime authority, cost model, availability model, authentication boundary, and verification surface.

## 15. Non-goals

Pryzael is not:

- a durable workflow engine;
- a transaction/authority store;
- a promise that background execution or subagents exist;
- a replacement for repository-native tests or CI;
- a replacement for existing GitHub/Drive/etc. connectors;
- a guarantee of unlimited ChatGPT/model/connector usage;
- a guarantee that every ChatGPT plan or client can install unpublished local plugins.

It is a portable reasoning and verification layer packaged as a zero-infrastructure skills-only plugin, designed to integrate with stronger external authority and execution systems when they already exist.
