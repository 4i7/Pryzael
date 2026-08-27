---
name: figure-it-out
description: "Orchestrate a large, cross-cutting, unusual, ambiguous, or multi-phase engineering task when no narrow workflow is sufficient. Use for migrations, architecture programs, large repairs, or work that needs falsifiable completion criteria, phased execution, evidence, and a reviewable handoff."
metadata:
  pryzael-source: "https://github.com/cursor/plugins/tree/main/pstack/skills/figure-it-out"
  pryzael-target: "chatgpt"
  pryzael-upstream-license: "MIT"
---

# Figure It Out

The first deliverable is the workflow. Do not start a long run until completion, scope, dependencies, and verification can be stated clearly enough to detect failure early.

## Phase A: Frame

Establish:

- a **falsifiable definition of done**;
- quantified scope where practical, such as callers/modules/packages/PRs rather than guessed duration;
- known blockers, external dependencies, authority limits, and irreversible operations;
- rigor proportional to reversibility, blast radius, and cost of a wrong decision.

## Phase B: Design the workflow

Break work into independently checkable units and resolve risky unknowns before expensive dependent work.

Use the narrow skills rather than copying their procedures:

- `architect` for consequential boundary/design decisions;
- `blast-radius` for hidden downstream risk;
- `sequence-verifiable-units` for staged execution;
- `fix-root-causes` when a failure or violated invariant must be diagnosed;
- `interrogate` for adversarial review;
- `show-me-your-work` when a later reviewer needs a decision trail;
- `prove-it-works` for completion predicates.

Parallelize only genuinely independent seams. If mutable execution contexts cannot be isolated, prefer parallel read-only investigation over concurrent writes.

## Phase C: Run an evidence loop

For each unit:

1. state the intended invariant/behavior and baseline;
2. make the smallest justified change when execution is in scope and available;
3. inspect the actual resulting artifact;
4. run the strongest relevant verification;
5. record `VERIFIED`, `NOT VERIFIED`, or `INCONCLUSIVE`;
6. advance only from an acceptable dependency state explicitly visible in the workflow.

Do not retain failed experiments because effort was spent on them. If the gate is faulty, repair the gate rather than routing around it.

## Phase D: Keep the audit trail

When auditability matters, let `show-me-your-work` own the trail. Record decisions and evidence as they occur rather than reconstructing a polished story only at the end.

## Phase E: Final handoff

Re-evaluate every Phase A completion predicate against the exact final artifacts. Encode recurring lessons as durable tests, validators, schemas, or checks when practical rather than adding repeated prose instructions.

## Capability contract

Do not assume background execution, subagents, a local terminal, a writable repository, browser control, or a specific model family. Adapt the workflow to the active capabilities and preserve missing decisive checks as `INCONCLUSIVE` rather than pretending they ran.

## Output

Return definition of done, scope/blockers, phase sequence, key decisions, trail location/representation, evidence by predicate, current verdict for each predicate, and remaining open or inconclusive work.
