# Pryzael Behavioral Conformance Lab (R4)

## Authority and purpose

This directory is evaluation authority, not production Skill semantic authority.

Production direction remains:

```text
skills/<name>/ package
        ↓
Pryzael behavior / generated projections
```

Evaluation direction is separate:

```text
frozen evaluation contract + corpus
        ↓
trial
        ↓
evidence
        ↓
judge
        ↓
deterministic aggregate/admission decision
```

Gold success predicates and expected diagnoses are never model inputs. The evaluated model receives only the task `prompt` plus the ordinary session/tool context of the condition. `skills/**`, Skill descriptions, parser behavior, generated MCP semantics, and Worker authority are outside R4 mutation scope.

The central question is whether Pryzael improves observable engineering outcomes relative to the same frontier model without Pryzael while avoiding material regressions in epistemic correctness, authority discipline, efficiency, and reasoning freedom. Protocol wording compliance is not a proxy for task success.

## Architecture decision

Four serious representations were compared before implementation.

1. **Markdown-only corpus/rubric plus ad-hoc result notes.** Most reviewable, but weak for digest binding, schema validation, deterministic aggregation, and accidental partition mixing.
2. **Fully machine-readable corpus and result model.** Strong reproducibility but risks making generated/rendered documents a second evaluation truth if a renderer becomes authoritative.
3. **Executable harness with embedded fixtures.** Strong mechanics but couples evaluation authority to one execution surface and makes ChatGPT/native/MCP portability worse.
4. **Hybrid authority (selected):** machine-readable contract/corpus/result schema with a human-readable protocol document and small validator/aggregator. There is one rubric truth in the corpus JSON; this document explains the contract but does not duplicate task answers.

The selected shape is the smallest one that gives task-level immutable digests, held-out partition checks, portable external result capture, deterministic aggregation, and independent review without creating a Pryzael production-semantic registry.

## Frozen partitions

`evaluation/corpus/development.json` is visible development material. It may be used to debug the evaluator and future candidate prototypes, but it is never final admission authority.

`evaluation/corpus/held-out.json` is frozen qualification material. It is intentionally stored separately and bound by `evaluation/frozen-manifest.json`. Candidate authors must not use it for prompt/Skill tuning after this freeze. Repository visibility is not treated as secrecy; the protection is pre-registration, task/file digests, process separation, and contamination reporting.

Every task has a content digest computed from its canonical JSON object excluding the digest field. The frozen manifest also binds complete contract/corpus/routing/schema file bytes. Editing any bound file requires an explicit re-freeze before authoritative measurement.

## Experimental conditions and observables

The representative semantic comparison has three condition labels: `NO_PRYZAEL`, `CURRENT_PRYZAEL`, and `CANDIDATE_PRYZAEL`. Candidate identity is intentionally unresolved until a later candidate exists.

Activation/selection is not one routing score:

- `CONDITIONED_BEHAVIOR` controls Skill activation/use and is primary authority for Skill-body semantic effects.
- `NATIVE_AUTOMATIC_SKILL_SELECTION` is fresh-chat/first-turn native selection.
- `MCP_TOOL_SELECTION` is automatic MCP/tool selection.
- `FORCED_INVOCATION_CALIBRATION` tests observability sensitivity only and is never automatic-routing evidence.

Native and MCP measurements retain separate trials, metrics, evidence, and gates.

## Outcome-first judging

Task predicates are defined independently of future candidate wording. Judges do not score hidden reasoning transcripts and never require chain-of-thought. A response can succeed without Pryzael vocabulary; repeating that vocabulary does not rescue an incorrect outcome.

Objective predicates are decided mechanically where possible. Subjective engineering predicates use the frozen statement, independent scoring, blinded condition labels where practical, and `INCONCLUSIVE` when evidence is insufficient. Candidate authors cannot be the sole final authority.

R3 taxonomy is evaluation input, not a mandatory workflow checklist:

- relevant `HARD INVARIANT` violations may directly fail a trial;
- skipping a `HEURISTIC` is not failure unless observable outcomes suffer;
- skipping an `OPTIONAL TECHNIQUE` is never failure by itself.

## Autonomy and efficiency

`PREMATURE_CONVERGENCE` is consequential failure to investigate materially plausible alternatives or causes under unresolved uncertainty. It is not a required alternative count.

`PATH_OVERCONSTRAINT` is a Pryzael-induced restriction that blocks or materially degrades a valid path without correctness/authority justification.

`SOLUTION_CLASS_COLLAPSE` is diagnostic only. Low diversity can be appropriate when a task has one strong solution.

`REPLANNING_COMPETENCE` measures appropriate revision after new evidence invalidates assumptions; arbitrary churn is not rewarded.

`CEREMONY_TAX` is material work/latency/verbosity with no compensating success, safety, evidence, or reviewability benefit. Low-risk corpus tasks deliberately expose disproportional process.

## Pre-registration and admission

Trial counts, retries, judge disagreement, aggregation, non-inferiority, critical failures, autonomy limits, ceremony limits, and routing scope are frozen in `evaluation/contract.json`.

The sample sizes are not presented as statistical power. Admission uses conservative deterministic count rules. Required missing trials are inconclusive. Critical epistemic/authority failures are reported separately and cannot be averaged away by an overall quality score.

For a Skill-body-only future candidate, held-out `CONDITIONED_BEHAVIOR` admission is required. Automatic routing is independently required only if descriptions, Skill count, discovery metadata, native routing, or MCP routing change.

The no-Pryzael condition keeps model/host/task/tools equivalent where observable except for Pryzael procedural assistance. Unavoidable differences are recorded as limitations; causal claims are prohibited when equivalence cannot be established.

## Baseline contamination guard

R4A/R4B may run synthetic evaluator self-tests, schema validation, deterministic aggregation tests, and non-authoritative canary calibration. It must not measure authoritative held-out current-Pryzael outcomes.

If a final held-out result becomes visible before independent review/freeze completion, record contamination and replace/re-freeze the affected material before baseline measurement.

The next admissible action after this implementation is **independent R4 Lab review only**. Authoritative untouched baseline measurement belongs after that review.
