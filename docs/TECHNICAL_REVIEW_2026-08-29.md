# Pryzael technical architecture review — 2026-08-29

## Scope

This review records the improvement decisions made after inspecting Pryzael at exact main commit `7f9192bd44ba0ab852ef3db2071ed29ecedbae4c` and comparing the repository with relevant supply-chain, evaluation, MCP, and operations patterns.

The goal is not to maximize framework count. The goal is to adopt only changes that improve reproducibility, maintainability, operational clarity, or measured model performance without weakening Pryzael's existing authority boundaries.

## Current architecture assessment

Pryzael's strongest existing decisions should be preserved:

- canonical Skill packages are the single workflow authority;
- MCP is a generated projection rather than a second hand-maintained workflow copy;
- the Worker is stateless, read-only, credential-free, and intentionally small;
- exact commit/tree/artifact identities bind evidence;
- `INCONCLUSIVE` is a first-class outcome when evidence is unavailable;
- hidden behavioral qualification is separated from candidate development;
- new top-level capabilities require admission rather than being added automatically.

The main observed weaknesses were operational/documentation gaps around this architecture rather than a need for a different runtime design.

## Adopted improvements

### 1. Stable contributor command authority

**Problem:** README and ARCHITECTURE referred to a removed `python scripts/validate_skills.py` implementation while the repository authority had moved to `node scripts/validate_skills.mjs` behind `npm run validate:skills`.

**Decision:** document the package script, not the implementation filename.

**Why:** this applies Pryzael's own single-authority principle to contributor commands. Future validator implementation changes do not require every document to change again.

### 2. Explicit repository licensing and distribution boundary

**Problem:** upstream pstack MIT notices were preserved, but no root license explicitly granted rights for Pryzael-authored code and documentation.

**Decision:** add a root MIT license and distinguish it from upstream pstack attribution. Preserve `LICENSE.pstack.txt` in standalone Skill packages and repository-level provenance in `THIRD_PARTY_NOTICES.md`.

**Why:** the adapted and original portions can both remain under MIT while retaining distinct copyright attribution. Distribution is simpler when full-repository, standalone-Skill, and generated-artifact cases are documented explicitly.

### 3. Immutable GitHub Action references

**Problem:** qualification workflows used moving major tags such as `actions/checkout@v4` while the rest of Pryzael strongly prefers exact artifact identity.

**Decision:** pin trusted actions to full commit SHAs while keeping human-readable major-version comments.

GitHub's security guidance states that a full-length commit SHA is the immutable way to reference an Action. This directly matches Pryzael's exact-artifact model.

Reference: https://docs.github.com/en/enterprise-cloud@latest/actions/reference/security/secure-use

### 4. Dependabot as the update path for pinned identities

**Problem:** immutable pins reduce drift but can become stale if no explicit update mechanism exists.

**Decision:** enable weekly Dependabot version updates for both npm and GitHub Actions.

**Why:** immutability and maintainability are complementary. Dependabot can propose reviewed updates without making live advisory/registry state part of deterministic R1/R4 qualification.

Reference: https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/auto-update-actions

### 5. Operations and observability documentation

**Problem:** `wrangler.jsonc` enabled persisted invocation logging at 100% head sampling, but the operational meaning and future review triggers were not documented.

**Decision:** document current application logging, distinguish it from platform-controlled invocation metadata, and make authentication/rate-limiting changes evidence-triggered rather than automatic.

**Why:** this preserves the minimal runtime while making privacy, cost, and abuse assumptions explicit.

Cloudflare documents head sampling as a volume/cost control and provides a Worker rate-limiting API if measured traffic later requires it.

References:

- https://developers.cloudflare.com/workers/observability/logs/workers-logs/
- https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/

## Compared architectures and decisions

### SLSA source/provenance model

SLSA treats a source revision as an immutable snapshot identified by a revision identifier such as a Git commit SHA and recommends digest-bound subjects and source provenance.

Reference: https://slsa.dev/spec/v1.2/source-requirements

**Similarity to Pryzael:** strong. Pryzael already binds review and qualification claims to exact commits, trees, package trees, and digests.

**Decision:** adopt the conceptual vocabulary where useful, but do not add a SLSA attestation framework solely for Pryzael's internal qualification.

**Reason:** a full SLSA implementation would add machinery without improving the current runtime or behavioral measurement. Existing Git identities already supply the needed immutable revision boundary for this project.

### in-toto materials/products chain

in-toto records authorized supply-chain steps and links input materials to output products through signed metadata.

Reference: https://in-toto.io/docs/getting-started/

**Similarity to Pryzael:** the canonical Skill -> generated catalog -> Worker and frozen contract -> trial -> Judge result chains are structurally similar.

**Decision:** do not add in-toto as a dependency now.

**Reason:** Pryzael already enforces the important local invariants — exact source identity, deterministic projection, restricted changed paths, and fail-closed evidence. Signing/layout infrastructure is unjustified until an external distribution or multi-party provenance requirement appears.

### OpenSSF Scorecard

Scorecard emphasizes branch protection, code review, dangerous workflow patterns, pinned dependencies, token permissions, and security policy visibility.

Reference: https://www.scorecard.dev/

**Decision:** adopt selected engineering controls, not score optimization as a product goal.

Useful current controls include immutable Action pins, read-only workflow token permissions, dependency update automation, and the absence of checked-in generated/binary authority. Other controls should be added only when they solve a real project risk.

### MCP native Resources versus Pryzael's tool-local resource parameter

MCP Resources provide URI-addressed context that host applications may expose through UI selection, search, or automatic inclusion.

Reference: https://modelcontextprotocol.io/specification/2025-11-25/server/resources

**Current Pryzael design:** package-local resources are advertised after Skill selection and fetched through the same Skill tool using an exact resource key.

**Decision:** keep the current mechanism until host-product evidence shows a material advantage from native MCP Resources.

**Reason:** the current path preserves one capability/selection surface and works with tool-centric hosts. Moving references to a separate MCP resource surface could reduce or increase context cost depending on host behavior, but there is no product-surface evidence yet that it improves selection or latency.

### Inspect evaluation logs

Inspect separates evaluation configuration, samples/results, status, and reproducible run configuration. Its log format is optimized for large automated evaluation sets.

Reference: https://inspect.aisi.org.uk/eval-logs.html

**Decision:** retain the conceptual separation of configuration, response evidence, and result identity in R4/R4C, but do not import Inspect as the R4C execution engine.

**Reason:** R4C's authoritative surface is native ChatGPT Temporary Chat with explicit SUBJECT/JUDGE isolation. Replacing that surface with an API-driven framework would change the experiment rather than merely optimize it.

### Promptfoo matrices and caching

Promptfoo supports prompt/provider/test matrices, repeat indices, assertions, and response caching keyed by provider/request material.

References:

- https://www.promptfoo.dev/docs/configuration/guide/
- https://www.promptfoo.dev/docs/configuration/caching/

**Decision:** do not cache authoritative R4C SUBJECT outputs and do not replace R4C with a provider matrix runner.

**Reason:** repeated R4C trials are intentionally separate observations. Replaying a cached model response would destroy the meaning of repeated trial indices. Deterministic caching is useful for build/source artifacts, not for the model outputs being measured.

## Performance-related decisions

### Keep the stateless generated Worker

No evidence supports adding a database, durable state, server-side router, model proxy, or dynamic repository fetch to the request path. These would increase latency, failure modes, credential surface, and maintenance while duplicating authority already resolved at build time.

**Verdict:** current runtime architecture remains preferred.

### Preserve progressive disclosure

Skill discovery metadata remains small; workflow bodies load after selection; package-local references load only when requested. This is directionally appropriate for context/token efficiency.

**Verdict:** preserve. Measure routing and context cost before changing the number of top-level Skills or resource-delivery mechanism.

### Do not impose an arbitrary resource-size hard limit yet

The repository already measures resource/package sizes during qualification, and currently visible resources remain small enough that no failure threshold has been demonstrated.

**Verdict:** continue measurement, but do not invent a 32 KiB/64 KiB/etc. policy without product latency/context evidence. Add a hard budget only when an empirical envelope can be justified.

### Do not add request caching to the Worker

Workflow and resource text are already embedded in the generated catalog and served from the Worker bundle. A KV/cache layer would add a network/state dependency without avoiding meaningful work in the current request path.

**Verdict:** reject unless runtime profiling later identifies a different expensive operation.

### Do not add application-level rate limiting without traffic evidence

Cloudflare provides rate-limiting mechanisms, but current Pryzael runtime serves public read-only text and has no evidence in-repository of abuse pressure.

**Verdict:** document the trigger; implement only if measured availability or cost requires it.

## Highest-value unresolved measurement

The most important product-performance question remains R4C:

> Does `CURRENT_PRYZAEL` measurably improve engineering behavior over `NO_PRYZAEL` under the frozen held-out protocol?

Until that baseline is measured, changing Skill count, routing descriptions, ceremony requirements, resource budgets, or orchestration based on intuition risks optimizing the wrong bottleneck.

Therefore the preferred sequence is:

1. fix distribution/documentation/provenance defects that are independently evident;
2. harden deterministic supply-chain identity without changing semantics;
3. finish the public-safe R4C carrier mechanics;
4. execute the frozen baseline when the host capability is valid;
5. use measured R4C results to choose any semantic or routing optimization.

## Final assessment

Pryzael does not currently need a broader agent framework. Its main architectural advantage is that it keeps workflow authority, generated delivery, runtime capabilities, and evaluation evidence separate.

The best near-term improvements are therefore boundary-strengthening changes, not added runtime layers. Performance-affecting semantic/routing changes should wait for R4C measurement unless a separate concrete runtime bottleneck is observed.
