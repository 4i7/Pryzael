---
name: sequence-verifiable-units
description: "Structure a migration, sweep, staged repair, repeated edit, or multi-step change as independently checkable transitions. Use when batching work would make failures hard to localize or when commits/PRs should form a reviewable proof sequence."
metadata:
  pryzael-source: "https://github.com/cursor/plugins/tree/main/pstack/skills/principle-sequence-verifiable-units"
  pryzael-target: "chatgpt"
  pryzael-upstream-license: "MIT"
---

# Sequence Verifiable Units

Each unit starts from a known state, makes one coherent change, ends in a checkable state, and is verified before dependent work advances.

## Choose the unit

Use the smallest unit that is both meaningful and verifiable: one caller migration plus check, one schema behavior plus fixtures, failing test then fix, one state migration plus read-back, one boundary introduction, or one validator rule plus acceptance/rejection cases.

Do not make units so tiny that the check proves nothing or so broad that failure has many plausible causes.

## Execution loop

For every unit:

1. state baseline/precondition;
2. state intended invariant or behavior change;
3. make only that coherent change when execution is in scope;
4. inspect the actual artifact/diff;
5. run the strongest relevant check, applying `prove-it-works` semantics;
6. record `VERIFIED`, `NOT VERIFIED`, or `INCONCLUSIVE`;
7. advance only from a dependency state explicitly acceptable to the workflow.

Automation reduces editing cost, not verification value. Keep per-unit or bounded-batch checks even for scripts/codemods.

## Delivery order

Arrange commits, PRs, or phases so the sequence itself explains and proves the work. Useful shapes include:

- defect: reproducer -> root fix -> safe cleanup;
- migration: baseline/harness -> new structure -> checked caller moves -> zero legacy callers -> delete legacy API;
- architecture: current constraint evidence -> new boundary/data shape -> move behavior -> remove superseded path;
- performance: measured baseline -> one hypothesis -> same-workload measurement -> keep measured wins only.

## Failure handling

When a unit fails, stop dependent work. Determine whether the change or the gate is wrong. If the cause is not immediate, hand the unexplained failure once to `fix-root-causes`; if already operating inside that workflow, do not recursively invoke it again.

An inconclusive unit is not green. Continuing despite it requires an explicit dependency/risk statement.

## Capability contract

Do not assume a clean worktree, terminal, writable branch, or commit capability. Read-only sessions can still produce the unit sequence and verification contracts but must not claim execution.

## Output

Return ordered units, verification predicate and result for each, dependencies, exact first failing/inconclusive unit when stopped, and whole-sequence verification still required at the end.
