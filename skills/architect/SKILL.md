---
name: architect
description: "Design a non-trivial code or system change before implementation. Use when a task crosses API, module, ownership, persistence, concurrency, protocol, or other architectural boundaries, or when the user asks to architect or design the change first."
metadata:
  pryzael-source: "https://github.com/cursor/plugins/tree/main/pstack/skills/architect"
  pryzael-target: "chatgpt"
  pryzael-upstream-license: "MIT"
---

# Architect

Settle the caller-facing contract and ownership model before implementation makes a weak shape expensive to undo.

## Workflow

### 1. Ground the existing system

Trace enough real code and evidence to state:

- entry points and callers;
- data shapes, invariants, and state transitions;
- mutable-state ownership;
- external boundaries and validation;
- persistence, retry, concurrency, and ordering constraints;
- existing verification paths;
- historical rationale when repository history or design records are available.

A file list is not grounding. Follow control and data flow until the constraints that shape the design are explicit. Mark missing facts instead of guessing them.

### 2. Write caller usage first

Describe how a caller should use the result. Derive types, signatures, and module boundaries from that usage.

The design package should cover:

1. caller usage;
2. core data shapes and invariants;
3. signatures/interfaces;
4. module ownership and dependency direction;
5. boundary validation and error semantics;
6. persistence/concurrency semantics when relevant;
7. verification strategy;
8. rationale and rejected alternatives.

### 3. Run the design-space gate before committing

For consequential or hard-to-reverse decisions, consult `references/design-space-gate.md`. Check deletion/reuse before addition, compare a foundational redesign with an incremental patch when assumptions changed, and compare at least two structurally different shapes when more than one is viable.

For novel or empirical forks, prefer concrete sketches/prototypes over asking the user to decide a fact that can be observed. Do not manufacture alternatives that differ only in naming.

Select the design that preserves the invariant with the fewest authorities, least hidden/shared state, clearest dependency direction, and strongest verification path.

### 4. Implement against the sketch when implementation is in scope

Treat the design as a hypothesis. Surface meaningful deviations rather than silently adding optional fields, casts, locks, parameters, or special cases.

Repeated deviations of the same shape are evidence that the architecture missed a concept. Re-ground that constraint and redesign as if it had existed from day one instead of layering workarounds.

### 5. Compose only when needed

- Use `how` to understand the current subsystem before redesign when the implementation model is unclear.
- Use `why` when historical rationale or external constraints may explain a surprising shape.
- Use `interrogate` to adversarially challenge a contested or expensive design.
- Use `prove-it-works` after implementation to prove the final artifact.
- If the overall task is large or multi-phase, let `figure-it-out` own orchestration; do not recursively turn `architect` into a project manager.

## Capability contract

Use only evidence and tools actually available. Do not claim independent model comparison, code execution, runtime proof, or repository writes unless they occurred. If a decisive fact cannot be observed, preserve it as an explicit assumption or `INCONCLUSIVE` verification item.

## Output

Return the grounded model, caller-first design, selected structure and rationale, rejected serious alternatives, unverified assumptions, implementation deviations if any, and verification evidence when implementation occurred.
