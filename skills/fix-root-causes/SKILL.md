---
name: fix-root-causes
description: Debug by reproducing the failure, tracing causal chains to the violated invariant, instrumenting instead of guessing, and fixing the underlying class of defect rather than suppressing one symptom.
source: cursor/plugins pstack/skills/principle-fix-root-causes
adapted_for: WebChatGPT
---

# Fix Root Causes

Use this skill for debugging and repair work.

Do not start from "what small patch makes the visible error disappear?" Start from "which invariant was violated, where did that violation originate, and what adjacent cases share the same cause?"

## Procedure

### 1. Reproduce or establish evidence

Prefer a deterministic reproduction before changing code.

Capture:

- exact input or precondition;
- observed failure;
- expected behavior;
- relevant environment/version/ref;
- logs, stack traces, state, or failing tests;
- whether the failure survives restart or depends on persisted state.

If direct reproduction is unavailable in WebChatGPT, gather the strongest available source/log evidence and label the reproduction status `INCONCLUSIVE`.

### 2. Trace the causal chain

Ask "why did this happen?" repeatedly until the answer reaches a violated invariant or incorrect ownership/state assumption rather than another symptom.

Examples of root-level causes include:

- invalid external state accepted at a boundary;
- stale durable state treated as authoritative;
- two actors incorrectly sharing mutable state;
- an operation that is not idempotent across retry;
- a data model that allows an illegal state;
- ordering assumptions not guaranteed by the runtime;
- duplicated business rules drifting apart.

### 3. Instrument instead of guessing

When the chain is uncertain, seek direct observations: logs, traces, state dumps, tests, exact repository history, or targeted probes.

Do not invent runtime behavior from code shape alone when the disputed fact can be observed.

### 4. Identify the defect class

Before editing, search for adjacent cases that violate the same invariant.

A report points to one instance; the fix scope should be determined by the invariant, not by the first symptom discovered.

Do not automatically broaden into unrelated refactoring. Fix all instances of the same underlying defect that belong to the current architectural boundary.

### 5. Reject symptom suppression

Treat these as warning signs:

- adding a nil/null guard only to silence a crash without explaining why the value is invalid;
- catching and ignoring an error that should be impossible;
- retrying around corruption without repairing the state model;
- adding a special case whose only rationale is the current failing fixture;
- retaining an invalid compatibility path because removing it seems inconvenient;
- writing a long comment to justify behavior the types or structure should encode.

A guard is valid when it is the correct boundary behavior. It is not valid merely because it prevents the observed exception.

### 6. Restart failures: inspect state first

When behavior changes after restart while code does not, prioritize mutable persistent state:

- config files;
- caches;
- lock files;
- serialized state;
- database rows;
- checkpoints or generation markers;
- local metadata.

If clearing a state file restores behavior, do not stop at "delete the file". Determine why invalid or stale state was accepted and repair validation, migration, ownership, or lifecycle rules.

### 7. Verify the causal fix

A root-cause fix should prove both:

1. the original symptom no longer occurs;
2. the violated invariant is now enforced or the invalid state can no longer arise through the same class of path.

Use `prove-it-works` for the final verification and `sequence-verifiable-units` when the repair spans multiple changes.

## Output

Return:

- reproduction status and evidence;
- causal chain;
- violated invariant;
- defect class and adjacent instances checked;
- why rejected symptom-level patches are insufficient;
- selected repair boundary;
- verification evidence;
- verdict: `VERIFIED`, `NOT VERIFIED`, or `INCONCLUSIVE`.
