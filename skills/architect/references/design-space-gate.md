# Design-space gate

Use these prompts before a consequential architectural commitment when they help reduce material uncertainty.

This resource is not a mandatory sequence or exhaustive checklist. It imposes no required number of alternatives, passes, or prototypes. Use the shortest set of prompts that is sufficient for the actual decision, and replace them with a better technique when one is more informative.

## Hard boundary

Do not silently introduce a new source of authority, persistent/shared state, write surface, model-call boundary, service, connector, or generic proxy merely because it is easy to implement. If the design needs one, make the new boundary explicit, explain the invariant it serves, and keep it within task/session authorization.

Do not claim that an alternative was ruled out unless an observable constraint, tradeoff, or experiment actually supports that conclusion. Preserve any correctness-critical prerequisite ordering for migration, destructive transition, authority, or artifact identity.

## Heuristics

### Subtract or reuse before adding

Ask whether deletion, consolidation, or reuse of an existing owner solves the requirement. A new abstraction is not the default merely because implementation is cheap.

### Revisit the foundational assumption

When a new requirement changes a core assumption, consider what the system would look like if that requirement had existed from the beginning. Compare that perspective with an incremental repair when doing so exposes ownership or abstraction mismatch.

Repeated optional fields, pass-through flags, special cases, duplicated policy, or compensating coordination are signals that the current abstraction may no longer match the domain. They are evidence to investigate, not automatic proof that a rewrite is required.

### Keep the design space open while uncertainty is material

When several materially different shapes remain viable and the choice is consequential, compare the ones needed to resolve the uncertainty. Do not manufacture nominal alternatives, and do not stop or continue merely to satisfy a numeric count.

Prefer concrete sketches or small prototypes for empirical forks when they can cheaply reveal the deciding fact.

### Encode repetition only when it reduces net complexity

If a design would require repeated manual edits or repeated application of the same rule, consider whether a script, generator, schema, validator, codemod, or registry can encode it once. The reusable mechanism should itself be inspectable and verifiable, and it should not create a second authority for semantics already owned elsewhere.

## Optional evaluation dimensions

Use whichever dimensions are material to the decision:

- number and clarity of authorities/sources of truth;
- mutable/shared state and hidden coordination;
- ownership and dependency direction;
- caller/API complexity and boundary validation;
- failure semantics and observability;
- persistence, retry, concurrency, and ordering;
- compatibility, migration, deletion, and rollback path;
- downstream blast radius and operational cost;
- verification path and irreversible commitments.

These dimensions help compare designs; they are not a required traversal order.

## Optional capability-admission prompts

For a proposed tool, service, state store, connector, or other capability, ask whichever questions are relevant:

- Can an existing host capability own the operation without proxying it through this system?
- Can an existing workflow owner absorb the procedure as a resource/playbook instead of adding another routing surface?
- Is the capability a distinct user intent, or only an implementation detail of an existing owner?
- Can the requirement remain stateless or read-only until evidence shows persistence or writes are necessary?
- Can generated projection replace duplicated hand-maintained configuration or content?
- What observation would justify the new authority and what verification would detect misuse or drift?

Choose the architecture that best preserves the governing invariant with acceptable complexity and an observable verification path. Record rejected serious alternatives only when they were materially relevant to the decision.
