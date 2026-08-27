---
name: blast-radius
description: "Find what a code, schema, configuration, persistence, or protocol change could break beyond the visible diff. Use when asked for blast radius, hidden downstream effects, compatibility risk, or when a small-looking change needs its safety assumptions proven."
metadata:
  pryzael-source: "https://github.com/cursor/plugins/tree/main/pstack/skills/blast-radius"
  pryzael-target: "chatgpt"
  pryzael-upstream-license: "MIT"
---

# Blast Radius

Find the non-obvious breakage a direct caller search misses and identify the small number of facts on which safety really depends.

## Confidence ladder

Classify each safety-critical claim at the strongest level actually reached:

1. **Assertion.** Reasoned but not directly evidenced.
2. **Source evidence.** Code, schema, docs, dependency source, commit, PR, or config supports it.
3. **Failure-path proof.** The relevant bad case was traced and shown not to reach the changed behavior.
4. **Executable proof.** A test/script/query/command exercises the real path and would fail if the claim were false.
5. **Runtime/end-to-end proof.** The real system or closest production-equivalent surface was exercised.

Never report a higher level than the evidence supports.

## Workflow

1. **Understand the semantic change.** Read the exact diff/artifact and identify changed behavior, defaults, ordering, validation, serialization, persistence, retries, concurrency, and dependency assumptions.
2. **Find the safety assumptions.** Reduce the analysis to the one or few facts that, if true, eliminate most speculative risks.
3. **Look where symbol search stops.** Follow wire formats, DB state, generated files, other languages/processes, caches, flags, teardown, async ordering, retries, timeouts, pinned dependencies, and historical contracts.
4. **Separate risks.** Keep confirmed risks separate from investigated-and-cleared concerns.
5. **Prove the critical facts.** Use `prove-it-works` when a decisive executable or runtime check is available or required.

For each confirmed risk, state the failure mechanism, affected surface, likelihood, impact, evidence, and cheapest decisive check.

## Capability contract

Repository/source review may stop below executable proof. Do not turn static confidence into runtime certainty. When the decisive check cannot be run, state exactly what remains and classify that claim `INCONCLUSIVE`.

## Output

Return semantic change, safety assumptions with confidence levels, confirmed risks, cleared concerns, verification evidence, and an overall `VERIFIED`, `NOT VERIFIED`, or `INCONCLUSIVE` verdict appropriate to the requested claim.
