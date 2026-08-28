---
name: fix-root-causes
description: "Diagnose and repair a bug, regression, crash, corrupted state, retry failure, or other defect by reproducing it and tracing the violated invariant. Use for debugging when a symptom-level guard or one-off patch could hide the real defect class."
metadata:
  pryzael-source: "https://github.com/cursor/plugins/tree/main/pstack/skills/principle-fix-root-causes"
  pryzael-target: "chatgpt"
  pryzael-upstream-license: "MIT"
---

# Fix Root Causes

Determine which invariant failed, where the violation originated, and which adjacent cases share the same cause before choosing the repair boundary.

## Workflow

1. **Reproduce or establish evidence.** Capture exact input/precondition, observed failure, expected behavior, environment/ref, relevant logs/state/tests, and whether restart/persistent state changes the result.
2. **Trace the causal chain.** Ask why until the explanation reaches a violated invariant or ownership/state assumption rather than another symptom.
3. **Instrument instead of guessing.** Prefer logs, traces, state reads, exact history, or targeted probes when the disputed fact can be observed.
4. **Identify the defect class.** Search adjacent cases that violate the same invariant. Scope the repair by the invariant, not by the first fixture that failed.
5. **Lock the regression when cheap.** If an obvious inexpensive executable test path exists, consult `references/tdd-regression.md` and establish failing-before evidence before changing production code. Do not build a bad harness just to satisfy TDD ceremony.
6. **Choose the repair architecture, not the symptom patch.** Prefer the smallest boundary correction that prevents the defect class. Before adding a new abstraction, state store, retry layer, signal, or special case, compare whether deletion, an existing owner, or a foundational redesign solves the invariant more directly. Use `architect` when the repair crosses ownership or public boundaries.
7. **Treat restart failures as state clues.** If code is unchanged but behavior changes after restart, inspect config, caches, locks, serialized state, DB rows, checkpoints, and generation markers. If clearing state helps, find why invalid/stale state was accepted.
8. **Prove the causal repair.** Use `prove-it-works` to establish both that the symptom is gone and that the violated invariant/invalid-state path is now prevented or correctly handled.

If a repair must be delivered in multiple independently checkable units, let the caller use `sequence-verifiable-units`; do not recursively turn diagnosis into a second orchestrator.

## Capability contract

If direct reproduction is unavailable, label reproduction `INCONCLUSIVE` and use the strongest source/log evidence available. Do not invent runtime behavior from code shape when the disputed fact requires observation.

## Output

Return reproduction status/evidence, causal chain, violated invariant, defect class and adjacent instances checked, rejected symptom/architecture patches, selected repair boundary, verification evidence, and `VERIFIED`, `NOT VERIFIED`, or `INCONCLUSIVE` verdict.
