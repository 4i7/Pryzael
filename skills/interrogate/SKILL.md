---
name: interrogate
description: Adversarially review a change against its stated intent, separate real defects from noise, synthesize independent findings when available, and never auto-apply review suggestions without lead judgment.
source: cursor/plugins pstack/skills/interrogate
adapted_for: WebChatGPT
---

# Interrogate

Use this skill to challenge a diff, branch, design, patch, or implementation before treating it as ready.

The goal is not to maximize the number of comments. The goal is to find defects, broken invariants, unsafe assumptions, architectural regressions, and verification gaps that matter to the actual intent of the work.

Review findings are advisory evidence. Do not automatically modify code merely because a reviewer suggested a change.

## Step 1: Determine exact scope

Resolve the artifact under review from the user's request and connected sources.

Prefer exact identities:

- repository;
- base branch or base commit;
- candidate branch or exact candidate commit;
- PR number when applicable;
- explicit file set when the review is intentionally narrower.

Read the full relevant diff plus enough surrounding code to understand invariants. Do not review isolated changed lines when correctness depends on callers, schemas, state, persistence, or protocol behavior.

If the exact artifact cannot be resolved, say what is missing rather than silently reviewing a nearby version.

## Step 2: State the intent

Before reviewing, write one concise intent statement answering:

- what behavior or structure is meant to change;
- what must remain unchanged;
- which important constraints apply;
- what evidence is expected to prove success.

Derive this from the user's request, issue/PR description, commits, documentation, and code. Distinguish explicit intent from inferred intent.

## Step 3: Review from independent evidence paths

When the environment genuinely supports multiple independent reviewers or model families, give each the same intent, scope, diff, and review rubric. Do not assign theatrical personas merely to create artificial diversity.

When WebChatGPT exposes only one reasoning model, use single-reviewer mode and compensate by making the review passes explicit:

1. **Correctness and invariants.** Trace state transitions, boundary conditions, error paths, retries, and ordering.
2. **Architecture and ownership.** Check whether responsibilities, data shapes, and module boundaries remain coherent.
3. **Compatibility and blast radius.** Check callers, persistence, protocols, schemas, configuration, and cross-language consumers.
4. **Verification quality.** Check whether tests/validators actually prove the intended behavior rather than a proxy.
5. **Maintainability.** Look for duplicated rules, hidden state, special cases, escape hatches, and symptom fixes.

Do not call these passes independent models. They are separate lenses from one reviewer.

## Step 4: Validate findings

For each candidate finding:

- identify the concrete code or artifact involved;
- state the failure mechanism step by step;
- distinguish observed fact from inference;
- check surrounding code for an existing invariant that clears the concern;
- run or identify the cheapest decisive verification when tools permit it;
- deduplicate different descriptions of the same underlying problem.

A plausible concern without a viable failure path is not automatically a defect.

## Step 5: Lead judgment

Classify findings as:

### Act On
A real issue affecting correctness, security, data integrity, architectural invariants, or maintainability enough to block the stated goal.

### Consider
A legitimate issue or tradeoff whose benefit may not justify changing the current work immediately.

### Noted
Technically valid context with low current action value.

### Dismissed
Wrong, already prevented by an invariant, irrelevant to the requested scope, speculative without a credible failure path, or a nitpick that does not earn code churn.

For every non-trivial finding, include the evidence and reason for its classification.

## Agreement handling

If genuinely independent reviewers are available:

- findings independently raised by multiple reviewers deserve higher attention;
- lone findings still require technical validation;
- explicit disagreement is useful and should be surfaced;
- consensus is not proof and never overrides contrary runtime/source evidence.

If only one reviewer is available, omit consensus claims entirely.

## Verification

For findings categorized `Act On`, prefer a reproducer, test, validator, trace, or direct source proof before finalizing the verdict.

If decisive execution is unavailable, mark the finding's verification status `INCONCLUSIVE` even when the static reasoning is strong.

## Output

### Intent
The exact intent and preserved constraints.

### Scope
Repository/ref/PR/files reviewed.

### Act On
Each finding with location, failure mechanism, evidence, and verification status.

### Consider
Legitimate tradeoffs and why they are not blockers yet.

### Noted
Low-priority but useful observations.

### Dismissed
Rejected candidate findings with concise reasons.

### Agreement Map
Only when genuinely independent reviews were performed. Otherwise state `single-reviewer mode`.

### Verdict
State whether the reviewed artifact is acceptable for its stated purpose, not whether it is aesthetically perfect. Distinguish `VERIFIED`, `NOT VERIFIED`, and `INCONCLUSIVE` where direct proof matters.
