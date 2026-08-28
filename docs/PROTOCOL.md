# Pryzael protocol and authority taxonomy

## 1. Purpose and authority boundary

This document defines project-wide protocol vocabulary for Pryzael. It classifies cross-cutting constraints, dynamic execution facts, completion authority, and the Reasoning Freedom Contract used by later evaluation and Skill-semantic work.

It is **not** a second workflow source.

Canonical Skill semantics remain authored only in each `skills/<name>/` package. This document must not restate each Skill's workflow, routing rules, side effects, capability requirements, or result contract as a central registry. Native Skills and the MCP projection continue to derive workflow meaning from the canonical Skill packages.

The protocol vocabulary is intentionally small:

```text
instruction strength
  HARD INVARIANT | HEURISTIC | OPTIONAL TECHNIQUE

dynamic execution facts
  SESSION/HOST CONSTRAINT | CAPABILITY/AUTHORIZATION FACT | OBSERVABILITY FACT

completion authority
  SUCCESS CONTRACT | EVIDENCE CONTRACT
```

These dimensions are orthogonal. A host fact is not a weaker hard invariant, and a success predicate is not a reasoning heuristic.

Example:

```text
Repository write capability is unavailable.
  -> CAPABILITY/AUTHORIZATION FACT

Do not claim that a repository write occurred.
  -> HARD INVARIANT

Prefer a normal feature branch and PR when that delivery shape fits the task.
  -> HEURISTIC or session-specific instruction

The regression must be shown absent on the exact candidate artifact.
  -> SUCCESS CONTRACT + EVIDENCE CONTRACT
```

## 2. Instruction strength

### 2.1 HARD INVARIANT

A hard invariant prevents a correctness, authority, evidence, or architectural-integrity failure that is not made acceptable merely by preferring a different reasoning path.

Hard invariants constrain observable transitions, claims, or authority boundaries. They should not prescribe hidden thought shape.

A proposed hard invariant should answer all of the following before adoption:

1. What correctness/security failure does it prevent?
2. Which boundary owns it?
3. Can a legitimate exception exist, and if so what explicit re-authorization or redesign is required?
4. Does it constrain the outcome/transition, or unnecessarily constrain reasoning?
5. Which session/host facts can satisfy, block, or parameterize it without changing its meaning?
6. How can compliance be evaluated observably?

### 2.2 HEURISTIC

A heuristic is a strong default for engineering quality. It may be departed from when evidence shows another route better preserves the governing invariant or task outcome.

Heuristics should guide search without becoming hidden approval gates. A departure may need an externally useful rationale when it changes risk or ownership, but never a private chain-of-thought transcript.

### 2.3 OPTIONAL TECHNIQUE

An optional technique is a method that may help establish a fact or reduce uncertainty. It is never universally required merely because it is familiar or useful.

Examples include prototyping, differential tests, property-based tests, TDD, shadow comparison, temporary instrumentation, call-graph tracing, sequence diagrams, formal schemas, exhaustive matrices, `git bisect`, and staged migration.

A frontier model may use a better method when one exists.

## 3. Dynamic execution facts

Dynamic execution facts describe the active session and host. They do not become universal instructions.

### 3.1 SESSION/HOST CONSTRAINT

A condition imposed by the current environment or user-approved execution surface, such as read-only mode, no local shell, a fixed execution budget, or a required repository/ref.

### 3.2 CAPABILITY/AUTHORIZATION FACT

A fact about whether an operation is available and authorized. Availability and authorization are distinct.

R3 uses the following conceptual host-capability dimensions without implementing a host schema or enforcement adapter:

```text
HostCapabilityState {
  capability
  availability: available | unavailable | unknown
  authorization: authorized | requires_user_confirmation | unauthorized | unknown
  enforcement: prompt_only | tool_restricted | sandboxed | host_policy | none | unknown
  scope: observable bounded scope | unknown
  observability: directly_observed | host_reported | inferred | unknown
}
```

Multiple enforcement mechanisms may coexist. Metadata such as an MCP read-only hint is a declaration, not proof that the host enforces read-only behavior.

Host-specific realization belongs to the later host-capability/enforcement phase. R3 defines only the conceptual vocabulary.

### 3.3 OBSERVABILITY FACT

A fact about whether a relevant state, action, identity, or result can actually be observed from the active surface.

Unobservable hidden selector state, internal traces unavailable to the user, or inferred runtime behavior cannot be silently promoted into directly observed evidence.

## 4. Completion authority

### 4.1 SUCCESS CONTRACT

A success contract states observable predicates that define completion. It describes what must be true, not the internal reasoning steps used to make it true.

Good success contracts are falsifiable and scoped to the task. Examples include exact artifact identity, preserved caller behavior, absence of a reproduced regression, or a migration invariant.

### 4.2 EVIDENCE CONTRACT

An evidence contract states what observation is adequate to decide a success predicate and what result vocabulary applies.

Pryzael retains tri-state verification:

```text
VERIFIED
NOT VERIFIED
INCONCLUSIVE
```

`INCONCLUSIVE` is not a pass.

Evidence adequacy is predicate-relative:

```text
EvidenceAdequacy(predicate, observation)
```

R3 establishes the following **nominal** evidence kinds for later use:

```text
ASSERTION
STATIC_SOURCE
BUILD_STATIC_EXECUTABLE
FOCUSED_RUNTIME
INTEGRATION
TARGET_SURFACE
```

These names are categories, not an ordinal ladder. A compiler invocation can be decisive for a compilation predicate. A target-surface observation can be required for a user-visible predicate. A nominally runtime observation is not automatically stronger for an unrelated predicate.

The full structured result contract belongs to the later evidence-contract phase; R3 does not implement it.

## 5. Project-level hard invariants

The following rules deserve hard-invariant status because they protect correctness, authority, or semantic integrity without prescribing a model's internal search strategy.

### 5.1 Canonical Package Authority

**Prevents:** divergent authored workflow meaning between native Skills, generated projections, documentation, or registries.

**Owner:** canonical `skills/<name>/` packages for Skill-local semantics; project architecture for the single-authority rule.

**Legitimate exception:** none inside the current architecture. Replacing the authority model is an explicit architecture migration, not a local exception.

**Reasoning impact:** none on solution search; it constrains where workflow meaning is authored.

**Session/host interaction:** host capabilities do not change the source of Skill semantics.

**Observable evaluation:** generated projection parity, absence of duplicated authored workflow text/registries, and the frozen R1/R2 conformance suite.

### 5.2 Authority Non-Escalation

**Prevents:** retrieved content, tool output, or workflow prose silently granting capabilities or user intent that the active session did not authorize.

**Owner:** task/session authority boundary and host enforcement boundary.

**Legitimate exception:** an explicit user/host authorization change can change the dynamic fact; it does not create an exception to the invariant.

**Reasoning impact:** the model may explore any valid plan but may not execute outside authorized scope.

**Session/host interaction:** capability and authorization facts determine which actions are currently permitted.

**Observable evaluation:** no unauthorized mutation/external action; no scope escalation based solely on untrusted content.

### 5.3 Observed-Action Truthfulness

**Prevents:** claiming builds, tests, writes, browser actions, reviews, or runtime observations that did not occur.

**Owner:** completion/evidence boundary of the active task.

**Legitimate exception:** none. Inference may be reported as inference, not as an observed action.

**Reasoning impact:** none on search; it constrains externally stated facts.

**Session/host interaction:** unavailable execution changes what can be claimed, not the truthfulness rule.

**Observable evaluation:** reported actions and evidence pointers correspond to actual tool/session observations.

### 5.4 INCONCLUSIVE Is Not VERIFIED

**Prevents:** missing decisive evidence being converted into success.

**Owner:** verification/result semantics.

**Legitimate exception:** none. A success contract may explicitly not require a missing predicate, but an inconclusive required predicate cannot become verified by relabeling it.

**Reasoning impact:** none on search; it constrains verdict semantics.

**Session/host interaction:** missing capability can cause `INCONCLUSIVE`; it cannot satisfy the predicate.

**Observable evaluation:** required predicates are individually classified and whole-task pass does not include unresolved required predicates.

### 5.5 Consequential Artifact Binding

**Prevents:** a verdict or mutation applying to a moving or different artifact than the one actually inspected or qualified.

**Owner:** the workflow or task that makes an artifact-specific consequential claim.

**Legitimate exception:** artifact identity need not be over-specified when the task is genuinely artifact-independent. When identity is consequential, moving refs are insufficient without fresh resolution.

**Reasoning impact:** does not constrain how the model analyzes the artifact.

**Session/host interaction:** available identity evidence determines whether exact binding is possible.

**Observable evaluation:** consequential verdict/evidence records name the exact repository/ref/commit/generated artifact as required by the task.

### 5.6 Projection Equivalence When Claimed

**Prevents:** a projection advertised as semantics-preserving from silently changing canonical workflow meaning.

**Owner:** projection/compiler/runtime boundary.

**Legitimate exception:** a deliberately different projection must be described and qualified as such rather than called equivalent.

**Reasoning impact:** none on problem-solving path.

**Session/host interaction:** transport differences may affect availability/observability without authorizing semantic drift.

**Observable evaluation:** deterministic generation and canonical/projection contract tests.

### 5.7 No Silent Runtime Authority Expansion

**Prevents:** a read-only/stateless support layer from quietly gaining credentials, persistence, model calls, repository mutation, generic proxying, or other powers that change its threat model.

**Owner:** hosted runtime architecture.

**Legitimate exception:** a separately explicit architecture/security decision may intentionally expand runtime authority; the expansion must be treated as a new qualified boundary, not a local convenience.

**Reasoning impact:** does not constrain a model's internal reasoning; it constrains runtime powers.

**Session/host interaction:** host-provided capabilities remain separately authorized and do not imply that the Pryzael Worker should proxy them.

**Observable evaluation:** runtime dependencies, code paths, credentials/state interfaces, protocol behavior, and deployment contract.

### 5.8 No Silent Qualification-Gate Weakening

**Prevents:** advancing by bypassing, relaxing, or redefining a previously required gate merely because it blocks a candidate.

**Owner:** the phase/workflow that established the dependency gate.

**Legitimate exception:** a gate can be repaired or superseded by an explicit architecture/evaluation decision with evidence that the old gate was invalid. That is not silent weakening.

**Reasoning impact:** replanning remains legal; only hidden removal of required qualification is prohibited.

**Session/host interaction:** capability limits may make a gate inconclusive and stop dependent claims.

**Observable evaluation:** gate definition and admission evidence remain visible; changed gates have an explicit rationale and requalification.

### 5.9 No Second Authored Semantic Authority

**Prevents:** a registry, schema, generated file, protocol document, or Worker source from becoming a second manually maintained database of Skill-local meaning.

**Owner:** repository ownership model.

**Legitimate exception:** derivative machine output may contain mechanically derived semantics; the authored source remains the canonical package.

**Reasoning impact:** none on model search.

**Session/host interaction:** none.

**Observable evaluation:** Skill workflow meaning is authored in package-local sources and derivative artifacts are mechanically produced or non-semantic.

### 5.10 Preserve Correctness-Critical Ordering

**Prevents:** unsafe transitions such as mutating before required authority/identity/approval, advancing dependent work from a failed gate, or finalizing before a prerequisite state exists.

**Owner:** the success/dependency contract of the affected workflow.

**Legitimate exception:** ordering is hard only when causal correctness depends on it. Convenience ordering is not promoted into an invariant.

**Reasoning impact:** constrains observable state transitions, not hidden thought order.

**Session/host interaction:** dynamic facts can make a prerequisite unavailable and therefore block the transition.

**Observable evaluation:** prerequisite state is observed before the dependent transition when the contract requires it.

## 6. Engineering heuristics

The following are strong defaults, not universal hard invariants:

- find the violated invariant or ownership assumption before selecting a defect repair;
- inspect adjacent cases that could violate the same invariant;
- ground surrounding architecture, data flow, state ownership, dependencies, and downstream consumers when relevant;
- prefer a root-cause repair over a symptom-only patch;
- prefer the smallest **coherent** change that closes the defect class;
- preserve sound existing ownership boundaries and conventions unless evidence shows that the violated invariant originates in them;
- subtract, reuse, or consolidate before introducing a new owner or mechanism;
- avoid duplicated policy and broken abstractions;
- compare materially different viable architectures when consequential uncertainty remains;
- use rigor proportional to reversibility, blast radius, authority, shared state, migration risk, and cost of error;
- re-check system-wide regressions and duplicated logic before finalizing a non-trivial change.

None of these imply that the current architecture must be preserved, that small diffs are inherently superior, or that a fixed number of alternatives must be considered.

A bad abstraction must remain replaceable. A broad change can be the smallest coherent repair when the invariant itself crosses the broader boundary.

## 7. Coding-behavior mapping

The project-wide representation for common engineering behavior is deliberately split rather than copied into every Skill as one mandatory checklist.

| Engineering behavior | Taxonomy representation | Primary owner / use |
|---|---|---|
| Avoid ad-hoc symptom-only fixes | Heuristic | `fix-root-causes`; evaluation can check whether the defect class remains open |
| Inspect architecture/data flow/dependencies | Heuristic | `how`/`architect` depending on task; other Skills compose when needed |
| Identify violated invariant | Heuristic for diagnosis/design; hard only when the task's success contract names a governing invariant | `fix-root-causes`, `architect` |
| Inspect adjacent defect-class cases | Heuristic | `fix-root-causes`; broader sweeps may compose with `sequence-verifiable-units` |
| Prefer clean architectural integration | Heuristic | `architect`, then implementation owner |
| Inspect downstream/system-wide effects | Heuristic | `blast-radius` when compatibility uncertainty is material |
| Avoid duplicated policy and broken abstractions | Heuristic | `architect`/review; hard only when it would create a second authored semantic authority |
| Preserve sound existing conventions | Heuristic | defeasible when evidence shows the convention is the source of the violated invariant |
| Avoid unnecessary broad refactoring | Heuristic | choose the smallest coherent repair, not the smallest textual diff |
| Do not reason about one file/function in isolation | Heuristic | scale grounding to the real ownership/data-flow boundary |
| Do not exceed authority or fabricate verification | Hard invariant | global project protocol |
| Use a particular analysis method | Optional technique unless the success contract explicitly makes that method the required observable test | Skill-local or task-local |

This mapping is guidance for R4 rubrics and later R5 prototypes. It does not change any current Skill body in R3.

## 8. Reasoning Freedom Contract

Pryzael preserves broad frontier-model freedom inside the outer correctness and authority shell.

1. **No arbitrary reasoning-loop cap.** Complex work is not limited to a fixed number of analysis or replanning cycles.
2. **No fixed maximum number of alternatives.** A diligence rule may establish that consequential uncertainty was not prematurely collapsed, but it may not impose a ceiling on exploration.
3. **No mandatory hidden chain-of-thought disclosure.** Record decisions, assumptions, evidence, artifact identities, and outcomes; do not require private reasoning transcripts.
4. **No golden implementation path unless order itself is correctness-critical.** Outcome/evidence contracts are preferred over mandatory internal step sequences.
5. **Replanning remains legal.** New evidence may invalidate the current plan, design, gate, or abstraction.
6. **Heuristics are defeasible.** They guide search and quality but do not override evidence.
7. **Hard authority/evidence constraints remain hard.** Reasoning freedom does not authorize scope expansion, fabricated evidence, artifact substitution, or false completion claims.
8. **Stopping is evidence-based, not iteration-based.** Stop when required success predicates are established, decisive evidence is unavailable, user/host budget prevents further work, or additional exploration no longer changes decision-relevant uncertainty.

Important distinction:

```text
Allowed hard constraint:
  Do not implement before a correctness-critical migration prerequisite exists.

Usually over-constraining:
  Always perform exactly seven internal reasoning steps before coding.
```

The first governs an observable safe transition. The second prescribes hidden thought shape.

## 9. Cross-Skill responsibility model

R3 does not rewrite current Skills. It records where specialized concerns already belong so project-wide protocol does not become a mega-workflow.

| Concern | Local owner | Project-wide portion |
|---|---|---|
| Boundary/interface/ownership design | `architect` | authority/evidence invariants only |
| Causal defect diagnosis and adjacent cases | `fix-root-causes` | truthfulness and completion semantics only |
| Downstream compatibility and safety assumptions | `blast-radius` | evidence vocabulary only |
| Adversarial review and exact artifact scope | `interrogate` | consequential artifact binding |
| Completion predicates and proof | `prove-it-works` | tri-state/evidence contract vocabulary |
| Large multi-phase orchestration | `figure-it-out` | qualification-gate integrity and reasoning freedom |
| Decision/evidence trail | `show-me-your-work` | no chain-of-thought requirement; truthfulness |
| Staged verifiable transitions | `sequence-verifiable-units` | correctness-critical ordering when applicable |
| Current implementation grounding | `how` | observability/truthfulness |
| Historical rationale and epistemics | `why` | observation vs inference distinction |

Composition remains soft. A Skill should call on another specialized workflow only when the uncertainty is material; the shared protocol must not mechanically duplicate every concern into every Skill.

Preferred shape:

```text
small project-wide invariants
+ Skill-local specialized workflow
+ soft composition
+ observable qualification
```

Rejected shape:

```text
one global mega-prompt containing every engineering procedure
```

## 10. System-wide finalization heuristic

For a non-trivial change, a compact finalization pass is useful:

- re-check the owning boundary;
- inspect adjacent cases of the violated invariant;
- inspect plausible downstream consumers;
- inspect duplicated policy or broken abstractions introduced by the change;
- verify scope is no broader than needed for a coherent repair;
- verify the evidence supports the completion claim.

This is a **heuristic**. It belongs in shared guidance and later evaluation rubrics, while individual Skills may express specialized parts where they already own the concern. It must not be copied mechanically into every Skill or treated as a required hidden reasoning transcript.

## 11. Representation decision for R3

R3 considered four materially different representation shapes.

### A. Documentation-only shared protocol vocabulary — selected

One project-wide document defines cross-cutting terms and invariants. Skill packages retain local workflow meaning.

**Why selected:** lowest new semantic-authority risk, directly useful to R4 rubrics and R5 design work, portable across hosts, and sufficient to resolve current terminology ambiguity.

### B. Machine-readable project protocol schema — rejected for R3

A schema could validate category names, but current phases do not yet need runtime/code generation from the taxonomy. Introducing one now would create maintenance and ownership questions without a demonstrated lever.

### C. Skill-local machine-readable declarations constrained by shared vocabulary — deferred/rejected for R3

This would require touching current Skill packages and could turn R3 into a semantic migration. Later phases may revisit only if evaluation or projection needs justify it.

### D. No shared representation beyond aligned Skill-local wording — rejected

Current concerns span multiple Skills and later evaluation needs a stable vocabulary. Keeping only informal local wording would preserve the ambiguity R3 is intended to remove.

Therefore:

```text
MACHINE_READABLE_TAXONOMY = NO
GLOBAL_MEGA_PROMPT = NO
SECOND_SKILL_SEMANTIC_AUTHORITY = NONE
```

## 12. R4/R5 interface

R4 may use this taxonomy to build observable rubrics for:

- task success;
- unsupported claims and False VERIFIED;
- unsafe scope expansion;
- premature convergence;
- path overconstraint;
- low-risk ceremony tax;
- replanning competence.

R4 should evaluate outcomes and evidence by default. Exact trajectory constraints belong only where ordering itself is correctness-critical.

R5 may use the instruction-strength labels to simplify or refactor Skill-local wording, but no Skill is changed by R3. A later semantic candidate must still be qualified against the pre-registered behavioral protocol.

## 13. Anti-drift rules

The following guard R3 terminology from becoming a new framework:

- do not add a central registry of every Skill's semantics;
- do not inject this entire document into every Skill;
- do not treat heuristics as universal approval gates;
- do not encode arbitrary iteration, alternative-count, or ceremony thresholds;
- do not make host-specific capability/enforcement APIs part of Core;
- do not treat evidence kinds as a universal strength ladder;
- do not replace Skill-local procedures with one global workflow;
- do not use protocol conformance as a substitute for engineering task success.

The design target is strong outer contracts with weak internal prescription.
