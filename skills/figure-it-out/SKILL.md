---
name: figure-it-out
description: Design a rigorous, auditable workflow before executing large, cross-cutting, unusual, or poorly structured work. Define falsifiable completion criteria, sequence verifiable units, and keep an evidence-backed decision trail.
source: cursor/plugins pstack/skills/figure-it-out
adapted_for: WebChatGPT
---

# Figure It Out

Use this skill when no narrow workflow fits the task, especially for migrations, multi-part architecture work, large repairs, or work that another session or reviewer must understand later.

The first deliverable is the workflow itself. Do not begin a long run until the task has a checkable finish condition, bounded scope, verification strategy, and a phase structure that exposes failures early.

## Phase A: Frame

Establish the following from available evidence:

### Definition of done

Write completion as falsifiable predicates. Prefer facts such as:

- zero callers remain on the legacy API;
- all specified fixtures pass;
- exact candidate HEAD satisfies the validator;
- generated output is byte-identical except for the intended field;
- the old path is deleted after every caller is migrated.

Avoid goals such as "done well", "clean", or "work on this for several hours" unless converted into observable checks.

### Scope

Quantify the work where practical:

- number of call sites, modules, packages, PRs, or phases;
- repositories and branches involved;
- known blockers;
- external systems or credentials needed;
- irreversible operations that are outside current authority.

Do not fabricate duration estimates when evidence is weak. Unit counts and dependency shape are usually more useful than guessed hours.

### Rigor level

Choose rigor according to reversibility, blast radius, cost of a wrong decision, and ease of direct proof. Rigor means more explicit gates and evidence, not merely more prose.

## Phase B: Design the workflow

Break the task into atomic units that each finish in a verifiable state.

Sequence work so unknowns and architectural risks are resolved before expensive dependent work. Prefer this general order when applicable:

1. Ground current behavior and authority.
2. Capture baseline evidence.
3. Build or identify the verification mechanism.
4. Settle hard-to-reverse architecture.
5. Execute the smallest independently checkable unit.
6. Verify it before advancing.
7. Repeat.
8. Remove obsolete compatibility structure when its callers are gone.
9. Run whole-system verification against the original definition of done.

Use `architect` for consequential boundary changes. Use `blast-radius` when a small change may have hidden downstream effects. Use `sequence-verifiable-units` to structure execution. Use `prove-it-works` for every completion claim. Use `show-me-your-work` when later auditability matters.

If work can be parallelized, parallelize only genuinely independent seams. When the available WebChatGPT environment cannot isolate mutable workspaces or branches, prefer read-only parallel investigation over concurrent writes.

## Phase C: Run an evidence loop

Treat each unit as an experiment:

1. State the hypothesis or intended invariant change.
2. Make the smallest justified change when write tools are available.
3. Inspect the actual changed artifact.
4. Run the strongest available verification.
5. Classify the unit as `VERIFIED`, `NOT VERIFIED`, or `INCONCLUSIVE`.
6. Advance only from a verified base unless the workflow explicitly records why an inconclusive dependency is unavoidable.

Do not keep failed experiments merely because effort was spent on them. Revert or supersede them when possible. If the verification gate itself is faulty, fix the gate rather than routing around it.

## Phase D: Keep the decision trail

For long or consequential work, maintain one canonical trail using `show-me-your-work`.

Record decisions, pivots, completed units, failed hypotheses, blockers, and verification results. Evidence should point to concrete files, commits, PRs, tool results, or other resolvable artifacts.

Do not reconstruct a polished story only at the end. Record important decisions while they are made.

## Phase E: Final verification and handoff

Return to the Phase A definition of done and evaluate every predicate against the real artifacts available to the session.

A green proxy is not enough when a stronger direct check exists. If a required direct check cannot be performed with available tools, mark the corresponding predicate `INCONCLUSIVE` and identify exactly what remains to be run.

Before handoff, check for recurring lessons that should become durable structure such as a validator, schema, test, check script, or repository rule rather than another prose instruction.

## WebChatGPT constraints

Do not assume:

- background subagents exist;
- a local terminal or worktree exists;
- a future run can continue asynchronously;
- local transcripts can be read;
- a specific model family is available.

Use the actual connected capabilities in the current session. When a capability is missing, adapt the phase rather than pretending it ran.

## Output

Return:

- definition of done;
- quantified scope and blockers;
- designed phase sequence;
- important architectural decisions;
- decision-trail location or representation;
- verification evidence by predicate;
- current verdict for each predicate;
- remaining open or inconclusive items.
