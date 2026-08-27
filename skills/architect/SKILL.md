---
name: architect
description: Design non-trivial changes before implementation by grounding the existing system, sketching caller usage and data shapes, comparing alternatives, and treating repeated implementation friction as evidence that the architecture may be wrong.
source: cursor/plugins pstack/skills/architect
adapted_for: WebChatGPT
---

# Architect

Use this skill before a change that crosses function, module, ownership, persistence, concurrency, or protocol boundaries. The goal is to settle the shape of the change before implementation makes a weak design expensive to undo.

Do not jump from a request directly to code. First establish how callers should use the result, which data shapes and invariants exist, where validation belongs, and which module owns each responsibility.

## Phase A: Ground

Build a traced model of the existing system using the sources and tools actually available in the session.

At minimum determine:

- entry points and callers;
- important data shapes and state transitions;
- ownership of mutable state;
- external boundaries and validation points;
- persistence, retries, concurrency, or ordering constraints;
- tests or runtime paths that currently prove behavior;
- historical rationale when commits, PRs, issues, or documentation are available.

Do not treat a filename list as grounding. Follow data and control flow far enough to state the relevant invariants.

If evidence is unavailable, mark the missing facts explicitly. Do not fill them with architectural guesses.

## Phase B: Sketch the contract

Write the intended caller experience first. Derive the implementation surface from that usage rather than exposing internals and making callers adapt.

Produce a compact design package:

1. Caller usage or API example.
2. Core data shapes and invariants.
3. Function or method signatures.
4. Module ownership and dependency direction.
5. Boundary validation and error behavior.
6. Persistence/concurrency semantics when relevant.
7. Verification strategy.
8. Rationale and rejected alternatives.

For consequential or hard-to-reverse choices, compare at least two structurally different designs when the available tools and context make that practical. Do not create fake alternatives that differ only in naming.

Prefer designs that hide complexity behind a smaller coherent public surface. Avoid pass-through layers, temporal decomposition, duplicated validation, scattered state rules, and abstractions that require callers to know their internals.

## Phase C: Decide

Select the design that best preserves the system's invariants with the lowest reader and maintenance burden.

State why the selected design wins and why serious alternatives were rejected. If a decision depends on an unverified assumption, name that assumption and its verification plan.

If the user explicitly requests a design checkpoint, stop after presenting the design. Otherwise proceed when implementation is part of the task and the available tools permit it.

## Phase D: Implement against the sketch

Treat the sketch as a hypothesis, not sacred text.

During implementation, surface meaningful deviations instead of silently adding parameters, escape hatches, optional fields, casts, locks, or special cases. For each deviation ask which explanation is true:

- the design missed a requirement;
- the implementation is overreaching;
- the existing system contains a constraint not found during grounding;
- the architecture is wrong.

A single hard edge case does not invalidate the design. Repeated friction of the same shape does.

## Phase E: Scrap when the architecture is wrong

Return to design rather than layering patches when patterns such as these appear:

- the same workaround repeats in unrelated locations;
- several edge cases require the same special-case branch;
- types need repeated casts or "optional but always present" fields;
- a new lock is required even though the design assumed state separation;
- callers need knowledge of internal rules to use the abstraction correctly;
- two or more independent implementation deviations point to the same missing concept.

When this happens:

1. Ground the newly discovered constraint.
2. State the violated assumption.
3. Redesign as if that constraint had been foundational from the beginning.
4. Remove obsolete scaffolding before adding replacement structure.
5. Re-check callers, invariants, and verification before continuing.

## WebChatGPT tool adaptation

Use connected GitHub, files, web sources, code execution, or other available tools for grounding and verification. Do not assume Cursor subagents, local worktrees, terminal access, or a specific model panel exists.

If independent model attempts are unavailable, perform one explicit alternative-design pass yourself and label it as same-model analysis rather than independent consensus.

## Output

Return:

- grounded system model;
- caller-first design;
- selected structure and rationale;
- rejected alternatives;
- assumptions still unverified;
- implementation deviations, if any;
- verification evidence or `INCONCLUSIVE` where direct proof was unavailable.
