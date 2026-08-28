---
name: why
description: "Investigate why code or a system was built this way using historical, product, and operational evidence. Use for design rationale, rejected alternatives, regressions, postmortems, thresholds, or 'why X instead of Y'; use how for current runtime behavior."
metadata:
  pryzael-source: "https://github.com/cursor/plugins/tree/main/pstack/skills/why"
  pryzael-target: "chatgpt"
  pryzael-upstream-license: "MIT"
---

# Why

Recover the forces that shaped a design. Treat intent as a historical claim that needs evidence, not something that can be reverse-engineered confidently from code shape alone.

## Workflow

### 1. Anchor the decision

Identify the concrete code, behavior, threshold, feature, regression, or design choice being explained. Establish relevant files/symbols and, when available, recent commits/PRs touching them.

### 2. Build a coverage map from available evidence

Historical rationale can live in source control, issues, long-form docs, team chat, infrastructure observability, error tracking, or product analytics. Consult `references/evidence-map.md` for what each source can uniquely establish.

Use only sources/apps available in the active ChatGPT session. Search independent evidence categories in parallel when the host supports it. A category that was unavailable is a gap; a category that was searched and returned nothing is a real null result and should be reported as such.

### 3. Collect before narrating

Prefer explicit evidence tied to the decision:

- commit/PR text and review discussion;
- issue/ticket scope and linked incidents;
- RFC/ADR/spec/postmortem rationale;
- contemporaneous chat discussion;
- metrics/errors/traces near the change;
- product/warehouse evidence that explains a threshold or rollout.

Do not use current code as proof of historical intent. It is an anchor for what changed, not automatically why.

### 4. Synthesize with calibrated confidence

Consult `references/epistemics.md` before final synthesis. Separate:

- direct evidence;
- reasonable inference;
- competing hypotheses;
- unresolved gaps and unavailable sources.

Surface contradictions rather than selecting the cleanest story.

### 5. Present a verifiable answer

A reader should be able to follow material claims back to an artifact. Prefer exact commit hashes, PR/issue IDs, document URLs, chat permalinks, metric/error references, or file/line anchors actually observed.

## Composition

- Use `how` when the user needs the current implementation/runtime flow.
- Use `architect` only after the historical constraints are understood if the user wants to redesign the system.
- Use `show-me-your-work` when the investigation itself needs a durable decision/evidence trail.

## Capability contract

Do not require a specific connector. If only source control is available, investigate it and clearly name the missing categories. Never claim a source was searched when it was not.

## Output

Return the question/target, direct evidence, supported inferences, competing hypotheses when relevant, unknowns/gaps, sources consulted including null results, and an overall confidence statement.
