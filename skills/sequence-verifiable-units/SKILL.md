---
name: sequence-verifiable-units
description: Structure multi-step work as the smallest independently checkable units, verify each unit before advancing, and order commits or changes so the sequence itself demonstrates correctness.
source: cursor/plugins pstack/skills/principle-sequence-verifiable-units
adapted_for: WebChatGPT
---

# Sequence Verifiable Units

Use this skill for migrations, sweeps, repeated edits, staged repairs, multi-commit changes, or any workflow where a later failure would be difficult to localize if many steps were batched together.

The invariant is simple: each unit begins from a known state, makes one coherent change, ends in a checkable state, and is verified before the next unit begins.

## Why

When ten edits are made and verification runs once, a failure implicates the whole batch. When each edit is checked before the next, the failure is localized to one transition.

The same ordering also helps reviewers. A well-sequenced stack of changes can show the problem, introduce the necessary structure, apply the fix, and remove obsolete structure without requiring trust in a large final diff.

## Define the unit

Choose the smallest unit that is both meaningful and verifiable.

A unit may be:

- one caller migrated to a new API plus its check;
- one schema or parser behavior plus fixtures;
- one failing test that establishes a defect;
- one fix that turns that test green;
- one durable-state migration plus read-back verification;
- one module boundary introduced before moving behavior behind it;
- one validator change plus cases proving acceptance and rejection behavior.

Do not make units so small that verification cannot establish anything useful. Do not make them so large that a failure has many plausible causes.

## Execution loop

For every unit:

1. State the precondition or baseline.
2. State the intended invariant or behavior change.
3. Make only the change required for that unit.
4. Inspect the actual artifact/diff produced.
5. Run the strongest available check.
6. Record `VERIFIED`, `NOT VERIFIED`, or `INCONCLUSIVE`.
7. Advance only when the dependency state is acceptable under the workflow's explicit rules.

Do not defer all checks to the end for convenience.

If a repeated migration is performed by a script or codemod, keep per-unit or per-batch validation anyway. Automation reduces editing cost; it does not eliminate verification value.

## Delivery order

Order commits, PRs, or documented phases so each transition makes sense on its own and adds evidence.

Useful sequences include:

### Defect repair

1. Reproducer/failing test.
2. Root-cause fix.
3. Cleanup made safe by the fix.

### Migration

1. Baseline/verification harness.
2. New structure or API.
3. Caller migrations in independently checked units.
4. Proof that legacy callers are zero.
5. Delete legacy API.

### Architecture reshape

1. Evidence of current constraint.
2. New boundary/data shape.
3. Move behavior behind it.
4. Remove superseded compatibility structure.

### Performance work

1. Measured baseline.
2. One hypothesized change.
3. Before/after measurement.
4. Keep only measured wins.

The ordering should make the reasoning reviewable, not merely match the chronological order in which ideas occurred.

## WebChatGPT adaptation

When ChatGPT has repository write tools, preserve these units as commits/files/PRs when appropriate. When it only has read access, produce the same unit plan and verification contracts without claiming execution.

Do not assume a clean worktree, terminal, or branch exists. Resolve exact repository and ref identity from connected GitHub when those facts matter.

## Failure handling

When a unit fails:

- stop building dependent units on top of it;
- determine whether the change or the verification gate is wrong;
- use `fix-root-causes` if the failure is not immediately explained;
- revert or supersede the failed change when writes are available;
- record the failure rather than hiding it in a later successful batch.

An inconclusive unit is not green. If work must continue despite it, state that dependency and risk explicitly.

## Output

Return:

- ordered unit list;
- verification predicate for each unit;
- current state/result of each unit;
- dependency relationships;
- exact first failing or inconclusive unit when the sequence stops;
- whole-sequence verification still required at the end.
