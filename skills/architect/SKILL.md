---
name: architect
description: "Design a non-trivial code or system change before implementation. Use when a task crosses API, module, ownership, persistence, concurrency, protocol, or other architectural boundaries, or when the user asks to architect or design the change first."
metadata:
  pryzael-source: "https://github.com/cursor/plugins/tree/main/pstack/skills/architect"
  pryzael-target: "chatgpt"
  pryzael-upstream-license: "MIT"
---

# Architect

Design non-trivial changes around real system invariants while preserving freedom to choose and revise the reasoning path.

## Reasoning Freedom Contract

**HARD INVARIANT.** Constrain observable correctness, authority, evidence, and architectural boundaries, not hidden thought shape.

- Do not require a fixed number of analysis passes, alternatives, prototypes, or replanning cycles.
- Do not require hidden chain-of-thought, exhaustive reasoning transcripts, or one golden internal path.
- Replanning is legal whenever new evidence changes the model, constraints, or best design.
- Stop when the relevant success/evidence contract is satisfied, decisive information is unavailable, or a real session/host budget prevents further work. Do not continue for an arbitrary iteration count.
- Preserve correctness-critical ordering when one observable transition causally depends on another; reasoning itself may be reorganized freely.

## Architectural hard invariants

### Ground material boundaries before consequential change

Before recommending or making a consequential architectural mutation, establish enough evidence about the affected system to identify the material correctness boundaries. Depending on the problem, those may include ownership, control/data flow, state and persistence, APIs/contracts, concurrency/ordering, authority, failure modes, compatibility, migration, blast radius, downstream effects, and verification.

This is not a mandatory checklist. Scale grounding to the actual boundary and mark unavailable decisive facts as assumptions or `INCONCLUSIVE` rather than guessing.

### Keep ownership, authority, and contracts coherent

A selected design must not silently introduce conflicting ownership, duplicated authority, hidden shared state, or an undeclared contract change where those would affect correctness. New authorities, persistence, writes, model calls, services, or proxy boundaries must be explicit design decisions and remain within task/session authorization.

### Account for material downstream and transition risk

Do not finalize a design while knowingly leaving material compatibility, migration, destructive-transition, concurrency/ordering, or downstream effects unaddressed. A prerequisite that is causally required for safety remains required before the dependent transition.

### Make completion externally checkable

Do not claim execution, runtime behavior, repository mutation, comparison, or verification that did not occur. Heuristics are not evidence. A required but unresolved predicate remains `INCONCLUSIVE`, not verified.

## Engineering heuristics

These are strong defaults, not hidden approval gates. Depart from them when evidence shows another route better preserves the governing invariant or task outcome.

- Trace real control/data flow far enough to expose the constraints that shape the design; a file list alone is insufficient when the relevant behavior is observable.
- Describe caller usage early when the caller-facing contract is a material design driver; it need not always be the first reasoning step.
- Derive interfaces, data shapes, module ownership, dependency direction, validation, and error semantics from the real boundary rather than from local convenience.
- Prefer fewer authorities, less hidden/shared state, clearer dependency direction, and stronger failure observability and verification paths.
- Prefer deletion, reuse, consolidation, or a root-cause redesign over adding a new mechanism when they satisfy the invariant more coherently.
- Revisit foundational assumptions when repeated optional fields, pass-through flags, locks, casts, special cases, or duplicated policy indicate that the abstraction no longer matches the domain.
- Compare materially different viable architectures when consequential uncertainty remains. Use as many or as few alternatives as the decision needs; do not manufacture options to satisfy a count.
- Use rigor proportional to reversibility, blast radius, authority, shared state, migration risk, and cost of error.
- Before finalizing, re-check the chosen design for regressions, duplicated logic/policy, broken abstractions, and downstream effects that are material to the change.

## Optional techniques

`references/design-space-gate.md` contains decision-quality prompts for consequential architecture. Use any relevant subset when it reduces uncertainty; skip irrelevant prompts.

Sketches, prototypes, diagrams, schemas, differential tests, temporary instrumentation, repository history, or small experiments may be useful for empirical or novel forks. They are techniques, not universal requirements.

Other Pryzael workflows may be composed when they materially help: `how` for unfamiliar implementation structure, `why` for historical rationale, `interrogate` for adversarial review, `prove-it-works` for post-implementation evidence, or `figure-it-out` for larger orchestration. Do not invoke another workflow solely to satisfy `architect`.

## Implementation and replanning

When implementation is in scope, treat the design as a falsifiable hypothesis rather than an immutable plan. Surface meaningful deviations. If implementation evidence reveals a missed concept or invalid assumption, re-ground the affected boundary and replan instead of layering compensating special cases.

Preserve user/session scope and authorization during replanning. A broader change may be the smallest coherent repair when the governing invariant crosses that boundary, but scope expansion still requires the authority the task demands.

## Capability and observability facts

Use only evidence and tools actually available. Capability availability does not imply authorization, and unobservable state does not become observed fact through inference.

If a decisive fact cannot be observed, preserve it explicitly as an assumption or `INCONCLUSIVE` verification item. Do not claim independent model comparison, code execution, runtime proof, repository writes, or user approval unless they occurred.

## Success and evidence contract

Architectural work is complete when the externally relevant decision is sufficiently grounded to protect the material invariants and define how correctness can be checked, or when a required unknown/capability blocks that decision and is reported as such.

Return a concise decision record appropriate to the task. Include only what is materially useful, such as:

- the selected design or current decision;
- affected ownership/authority/contract boundaries;
- assumptions and unresolved unknowns;
- serious alternatives considered when they were materially relevant;
- tradeoffs, compatibility/migration/blast-radius consequences;
- verification criteria and evidence;
- implementation deviations when implementation occurred.

No fixed section order is required. Do not emit an exhaustive hidden-reasoning transcript.
