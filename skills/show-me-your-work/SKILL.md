---
name: show-me-your-work
description: "Keep a compact audit trail of important engineering decisions, reasons, evidence, and results. Use for long or multi-phase work, handoffs, unattended work, decision logs, or whenever another session/reviewer must reconstruct what happened without trusting a polished summary."
metadata:
  pryzael-source: "https://github.com/cursor/plugins/tree/main/pstack/skills/show-me-your-work"
  pryzael-target: "chatgpt"
  pryzael-upstream-license: "MIT"
---

# Show Me Your Work

Keep a decision log, not a transcript or activity feed.

## Canonical schema

Use these logical fields:

| Field | Meaning |
|---|---|
| `ts` | ISO 8601 timestamp when available |
| `phase` | Phase/workstream |
| `decision` | What was chosen, changed, rejected, or concluded |
| `why` | Concrete reason |
| `evidence` | Resolvable pointer to proof |
| `result` | Observable outcome/predicate state |

When creating a TSV artifact, start from [`assets/decision-log-template.tsv`](assets/decision-log-template.tsv).

## What earns a row

Record design forks, accepted/rejected hypotheses, verification gates, completed units, reverts, blockers that change the workflow, authority/scope/identity changes, and inconclusive results a future session must not mistake for success.

Do not log every command, read, search, or trivial edit.

## Evidence rules

Evidence is a pointer, not persuasive prose. Good pointers include exact commit SHA, PR/issue, file and line range, tool result/citation, validator output, artifact path, screenshot/trace reference, or an explicit note that direct execution was unavailable.

Never invent evidence. If evidence proves only part of a claim, narrow the row to what it actually proves.

## History semantics

Once shared or committed, treat the trail as append-only. Supersede a wrong decision with a new row rather than rewriting history.

Before handoff, audit the trail against artifacts actually observed in the current session. Remove aspirational entries, repair broken pointers, preserve important pivots, remove padding, and ensure `INCONCLUSIVE` has not become a pass.

If a genuinely independent reviewer is available, it may challenge the trail. Otherwise label the audit as self-review; never call same-model review independent consensus.

## Capability contract

Use a durable file only when a writable artifact surface exists. Otherwise return the same schema in the conversation without claiming persistence. Do not claim access to hidden/local transcripts that the active environment cannot read.

## Output

Return current artifact identity/state, the trail or its durable path, verified claims, inconclusive/blocked claims, and a short `Attention` section identifying the decisions a human should inspect first.
