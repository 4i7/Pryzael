# Pryzael architecture

## 1. Goal

Pryzael packages engineering reasoning workflows as portable Agent Skills without depending on Cursor-specific runtime machinery. The target is ChatGPT first, while preserving compatibility with other Agent Skills clients where practical.

The design optimizes for four properties:

1. **Portable activation.** Each skill is independently installable and discoverable through its own `SKILL.md`.
2. **Progressive disclosure.** Discovery metadata stays small; detailed, situational procedures move to references.
3. **Evidence-bound claims.** Skills distinguish direct proof from static inference and use `INCONCLUSIVE` when decisive proof is unavailable.
4. **Composable rigor.** Large workflows delegate named concerns to smaller skills instead of embedding copies of their procedures.

## 2. Runtime and packaging boundary

The Agent Skills package boundary is the individual skill directory. Therefore a skill must not depend on files above its own root for runtime correctness.

A repository-level runtime manifest is intentionally absent. In the Agent Skills format, `SKILL.md` is the manifest. Any future catalog or plugin manifest should be generated from skill metadata rather than becoming a second manually maintained authority.

Repository files such as this document are development guidance, not runtime dependencies.

Every skill folder carries the upstream pstack license notice because an individual skill may be exported without the repository root.

## 3. Discovery and trigger design

Only short metadata should decide activation. Descriptions must say both what the skill does and when it should be used.

Trigger precedence for overlapping engineering tasks:

1. **Large/cross-cutting/multi-phase or no narrow workflow fits:** `figure-it-out` owns orchestration.
2. **Explicit review of a diff/PR/commit/design:** `interrogate` owns the review.
3. **Debugging a failure/regression:** `fix-root-causes` owns diagnosis and repair reasoning.
4. **Design before implementation across boundaries:** `architect` owns the design.
5. **Hidden downstream-impact question:** `blast-radius` owns impact analysis.
6. **Migration/sweep/staged sequence:** `sequence-verifiable-units` owns ordering.
7. **Completion/proof question:** `prove-it-works` owns verification.
8. **Audit/handoff/decision-log request:** `show-me-your-work` owns the trail.

If multiple conditions apply, the higher-level owner composes the lower-level skills rather than duplicating them.

## 4. Composition graph

Composition is intentionally directional to avoid recursive workflow loops.

```text
figure-it-out
  -> architect
  -> blast-radius
  -> fix-root-causes
  -> sequence-verifiable-units
  -> interrogate
  -> show-me-your-work
  -> prove-it-works

architect
  -> interrogate          optional design challenge
  -> prove-it-works       final implementation proof when implementation occurs

blast-radius
  -> prove-it-works       decisive safety checks

sequence-verifiable-units
  -> fix-root-causes      only when a unit fails for an unexplained reason
  -> prove-it-works       per-unit and whole-sequence checks

interrogate
  -> blast-radius         when hidden downstream effects are central
  -> prove-it-works       when a finding needs decisive reproduction/proof

fix-root-causes
  -> prove-it-works       prove symptom and violated invariant are repaired

show-me-your-work         leaf
prove-it-works            leaf
```

A composed skill owns only its concern. The caller remains responsible for the overall task and must not recursively re-enter the same workflow.

## 5. Common capability contract

Pryzael targets capability-variable environments.

- Use only tools and connected sources actually available in the active session.
- Repository read access is sufficient for static analysis. Writes are optional capabilities and require user intent plus connector support.
- Do not infer that ChatGPT, GitHub, a terminal, browser control, subagents, or a specific model family is available merely because another client supports it.
- Never report a command, test, build, runtime flow, independent reviewer, or write as completed unless it actually ran.
- When the decisive observation cannot be made, preserve the exact missing check and return `INCONCLUSIVE` for that claim.

This contract is short enough to repeat where required for package independence. Large shared procedures are not duplicated.

## 6. Verification semantics

Pryzael uses three claim states:

- `VERIFIED`: evidence directly supports the predicate at a suitable level for the claim.
- `NOT VERIFIED`: evidence contradicts the predicate or the required check failed.
- `INCONCLUSIVE`: available evidence or capabilities cannot decide the predicate.

A whole-task pass requires every required predicate to be `VERIFIED`. Static review may still produce a useful finding when runtime proof is unavailable, but it must not be mislabeled as runtime verification.

Evidence must be bound to the artifact identity it proves. For GitHub work, prefer repository plus exact commit SHA; branch names and PR numbers are context, not immutable identity.

## 7. GitHub exact-head review contract

`interrogate` owns exact-head review. Its detailed algorithm lives in `skills/interrogate/references/github-exact-head-review.md` and should be loaded only for GitHub reviews where commit identity matters.

Core invariant:

> A review verdict applies to one explicitly bound base/candidate artifact pair. Moving branch or PR state must never silently replace that pair.

The review therefore binds exact SHAs, reads changed and contextual files at those SHAs, keys CI evidence to the candidate SHA, and rechecks moving PR/branch identity before reporting current-state claims.

## 8. GitHub connector architecture

Pryzael uses operation semantics rather than hard-coded internal tool names because ChatGPT surfaces and connector implementations can change.

Required read operations for a strong exact-head review are conceptually:

- resolve repository;
- resolve commit objects;
- read PR metadata when a PR is part of the task;
- compare exact base and candidate commits;
- read file content at an exact commit;
- read commit-bound checks/workflow evidence when relevant.

Optional write operations are outside review semantics. `interrogate` is read-only by default even if the active connector exposes writes.

Search is useful for discovery but is not identity authority. Once a path/ref is known, fetch it directly at the bound SHA.

## 9. Decision trails

`show-me-your-work` owns audit-trail semantics. Other skills should not invent alternate log schemas.

The canonical logical fields are:

`ts`, `phase`, `decision`, `why`, `evidence`, `result`.

The durable representation may be TSV when a writable artifact surface exists. When persistence is unavailable, the same schema can be returned in the conversation without pretending a durable file was written.

## 10. Source and licensing boundary

Pryzael is adapted from MIT-licensed pstack material. Repository-level notices are insufficient for independently exported skills, so each skill folder includes the upstream notice. `metadata` carries provenance using Agent Skills-compatible string key/value entries rather than non-standard top-level YAML keys.

## 11. Validation

Validation has two layers:

1. Run the upstream Agent Skills validator when available.
2. Run `scripts/validate_skills.py` to catch Pryzael-specific drift such as unsupported frontmatter keys, directory/name mismatch, missing upstream notice, oversized `SKILL.md`, and broken local resource references.

The local validator deliberately avoids enforcing editorial style that is not part of the portable contract.

## 12. Future plugin packaging

ChatGPT plugins can package skills together with apps and app templates. Pryzael does not currently need an app-backed capability, so a plugin manifest would add deployment machinery without improving the skills themselves.

If plugin distribution becomes useful later, generate plugin/catalog metadata from the eight canonical `SKILL.md` manifests. Do not hand-maintain duplicated names, descriptions, or composition metadata in a second runtime authority.

## 13. Non-goals

Pryzael is not:

- a durable workflow engine;
- a transaction/authority store;
- a promise that background execution or subagents exist;
- a replacement for repository-native tests or CI;
- a guarantee that every ChatGPT plan/surface can install personal skills.

It is a portable reasoning and verification layer that should integrate with stronger external authority and execution systems when they exist.
