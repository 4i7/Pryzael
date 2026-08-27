---
name: show-me-your-work
description: Keep a compact, reviewable trail of important decisions, reasons, evidence, and results so another session or reviewer can reconstruct long or consequential work without trusting a polished summary.
source: cursor/plugins pstack/skills/show-me-your-work
adapted_for: WebChatGPT
---

# Show Me Your Work

Use this skill for long, multi-phase, high-stakes, or handoff-heavy work where the user needs to understand not only the final state but the decisions that produced it.

The trail is a decision log, not a transcript and not an activity feed. Record only choices, pivots, gates, completed units, blockers, and evidence-bearing outcomes that a later reviewer may need to audit.

## Canonical record

Prefer one canonical table with these fields:

| Field | Meaning |
|---|---|
| `ts` | ISO 8601 timestamp when available |
| `phase` | Current phase or workstream |
| `decision` | What was chosen, changed, rejected, or concluded |
| `why` | Concrete reason for that choice |
| `evidence` | Resolvable pointer to proof |
| `result` | Observable outcome or predicate state |

When repository writes are appropriate and available, TSV is a good durable form:

```text
ts\tphase\tdecision\twhy\tevidence\tresult
```

When repository or filesystem writes are unavailable, maintain the same logical schema in the conversation and include it in the handoff. Do not pretend a persistent file exists when it does not.

## What earns a row

Record:

- a design fork that materially changes the solution;
- a hypothesis accepted or rejected by evidence;
- a verification gate passed, failed, or found invalid;
- a unit completed and its proof;
- a revert or abandoned approach and why;
- a blocker that changes the workflow;
- a change in authority, scope, or source identity;
- an inconclusive result that future work must not mistake for success.

Do not record every command, file read, search, or trivial edit.

## Evidence rules

Evidence is a pointer, not a persuasive paragraph.

Good evidence includes:

- exact commit SHA;
- PR or issue reference;
- repository path and line range;
- exact tool result or citation;
- test/validator output;
- generated artifact path;
- screenshot or trace reference;
- explicit statement that direct execution was unavailable.

Never invent evidence to make a row look complete.

If evidence supports only part of a claim, narrow the decision/result to what the evidence actually proves.

## Append-only semantics

Treat the trail as append-only once shared or committed.

If an earlier decision becomes wrong, add a new row that supersedes it. Do not silently rewrite history to make the final path look inevitable.

If the log exists only in the active conversation and has not been handed off, corrections are allowed, but preserve meaningful pivots rather than erasing them.

## Audit before handoff

Before presenting the trail:

1. Check every row against artifacts and tool results actually observed in the current session.
2. Remove aspirational entries that describe intended work rather than completed work.
3. Resolve or clearly mark broken evidence pointers.
4. Add missing pivots or failed approaches that materially shaped the final result.
5. Remove padding that no reviewer would use.
6. Confirm that `INCONCLUSIVE` results have not been rewritten as passes.

Do not claim to audit against a hidden/local ChatGPT transcript unless such a transcript is actually accessible through a provided tool. The visible conversation and connected artifacts are the evidence boundary by default.

## Independent review when available

If the environment provides a genuinely independent reviewer, model, or separate session/tool, it may inspect the trail for:

- weak or absent evidence;
- skipped verification;
- scope creep;
- symptom fixes;
- decisions that conflict with stated constraints;
- gaps between claimed and actual artifacts.

If no independent reviewer is available, perform a clearly labeled self-audit. Do not describe same-model self-review as cross-model consensus.

## Handoff format

For a completed run, provide:

### Current state
The exact state now, including repository/branch/commit identity when relevant.

### Decision trail
The canonical table or path to the durable log.

### Verified
Claims directly supported by evidence.

### Inconclusive or blocked
Claims that still lack decisive proof and why.

### Attention
The small set of rows or decisions a human reviewer should inspect first.

## Security and integrity

If log cells contain user- or model-generated text that will be opened in spreadsheet software, neutralize formula-leading values (`=`, `+`, `-`, `@`) when producing TSV/CSV artifacts.

Do not put secrets, credentials, tokens, or private transcript content into a committed trail.
