# Design-space gate

Use this before committing to a consequential architecture or introducing a new mechanism.

## 1. Subtract before adding

Ask whether deletion, consolidation, or reuse of an existing owner solves the requirement. New abstraction is not the default just because implementation is cheap.

## 2. Redesign from the foundational assumption

If the new requirement changes a core assumption, sketch the system as if that requirement had existed on day one. Compare that shape with an incremental patch. Repeated optional fields, pass-through flags, special cases, or duplicated policy are evidence the old abstraction no longer matches the domain.

## 3. Compare structurally different options

When several viable shapes exist, compare at least two. For genuinely novel or empirical forks, use two or three concrete sketches/prototypes rather than arguing from taste. A renamed version of the same dependency graph is not a second design.

Evaluate:

- number of authorities/sources of truth;
- mutable/shared state introduced;
- dependency direction and boundary clarity;
- caller complexity and hidden coordination;
- migration/deletion path;
- verification path and failure observability;
- operational cost and irreversible commitments.

## 4. Build the lever when repetition appears

If the design requires repeated manual edits or repeated reasoning, first ask whether a script, generator, schema, validator, codemod, or registry can encode the rule once. The reusable mechanism should itself be inspectable and verifiable.

## 5. Capability admission for tool/plugin architecture

Before adding a new tool, service, state store, or connector:

1. Can an existing host capability own the operation without proxying it through this system?
2. Can an existing workflow owner absorb the procedure as a resource/playbook rather than adding another routing surface?
3. Is the new capability a distinct user intent, or just an implementation detail of an existing owner?
4. Can the requirement stay stateless/read-only until evidence proves persistence or writes are necessary?
5. Can generated projection replace duplicated hand-maintained configuration/content?

Choose the smallest architecture that satisfies the real invariant. Record the serious rejected alternatives and the observation that ruled them out.
