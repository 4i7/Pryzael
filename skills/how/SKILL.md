---
name: how
description: "Explain how a codebase, subsystem, feature flow, or runtime path actually works. Use for code walkthroughs, onboarding mental models, ownership/layer placement questions about the current system, or architecture critique after first understanding the implementation; use why for historical motivation."
metadata:
  pryzael-source: "https://github.com/cursor/plugins/tree/main/pstack/skills/how"
  pryzael-target: "chatgpt"
  pryzael-upstream-license: "MIT"
---

# How

Build a working mental model from the real implementation. Explain the system at the level needed to safely change it, not as an annotated file dump.

## Workflow

### 1. Anchor the question

Identify the subsystem, feature flow, symbol, or ownership question. State a best-guess scope when the request is ambiguous and proceed unless the ambiguity would make the investigation unsafe or meaningless.

### 2. Trace the implementation

Follow enough real code or connected evidence to establish:

- entry points and callers;
- core types/data shapes;
- state ownership and persistence;
- control and data flow from trigger to effect;
- external boundaries and adapters;
- configuration and important side effects;
- non-obvious invariants and failure paths.

Read actual implementation. Do not infer a runtime path from directory names or a single interface.

### 3. Scale exploration to the question

For a narrow module, explore directly. For a cross-cutting subsystem, partition independent read-only questions and investigate them in parallel only when the active host supports that safely; otherwise do the same slices serially. Reconcile contradictions before explaining the whole.

### 4. Explain for a maintainer

Prefer this shape when useful:

- **Overview.** What the subsystem is and what role it plays.
- **Key concepts.** The few types/services/abstractions needed to understand it.
- **How it works.** Trigger-to-effect flow and decision points.
- **Where it lives.** The small set of files/modules that form the working map.
- **Sharp edges.** Surprising constraints, hidden state, or places a newcomer would misread.

Reference exact files, symbols, commits, or connected records when available. Do not dump source unless a small excerpt is necessary to explain an invariant.

### 5. Critique only after understanding

If the user asked whether the architecture is good, explain the existing system first. Then challenge ownership, dependency direction, duplicated policy, hidden state, reader load, concurrency, and verification gaps. Use `architect` for a replacement design and `interrogate` for an adversarial review when those are the actual task.

## Composition

- Use `why` when the question is motivation, historical rationale, rejected alternatives, or where a threshold came from.
- Use `architect` when the user wants a new shape rather than an explanation of the current one.
- Use `blast-radius` when the next question is what a proposed change could break.

## Capability contract

Use only repository/data sources actually available. If code or runtime evidence needed to answer the question cannot be accessed, state the missing evidence instead of filling the gap from convention.

## Output

Return the working model, traced flow, ownership boundaries, relevant artifact references, sharp edges, and any explicit gaps. Keep critique clearly separated from explanation.
