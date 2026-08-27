---
name: interrogate
description: "Adversarially review a code change, pull request, exact commit, branch diff, or design against its stated intent. Use for PR/code review, exact-head review, stress testing, finding blind spots, challenging architecture, or separating real blockers from noisy review suggestions."
metadata:
  pryzael-source: "https://github.com/cursor/plugins/tree/main/pstack/skills/interrogate"
  pryzael-target: "chatgpt"
  pryzael-upstream-license: "MIT"
---

# Interrogate

Find defects, broken invariants, unsafe assumptions, architectural regressions, and verification gaps that matter to the stated intent. Do not maximize comment count and do not auto-apply review suggestions.

## Workflow

### 1. Bind scope and intent

Resolve the exact artifact being reviewed and state:

- intended change;
- behavior/constraints that must remain unchanged;
- expected success evidence;
- repository/base/candidate/PR/files when applicable.

If this is a GitHub review where commit identity matters, read and follow [`references/github-exact-head-review.md`](references/github-exact-head-review.md).

### 2. Review through distinct evidence lenses

When genuinely independent reviewers/models are available, give them the same scope, intent, artifact, and rubric. Diversity comes from independent reasoning, not theatrical personas.

Otherwise use explicit single-reviewer passes:

1. correctness and invariants;
2. architecture and ownership;
3. compatibility and blast radius;
4. verification quality;
5. maintainability and root-cause discipline.

Do not describe these lenses as independent models.

### 3. Validate every candidate finding

For each finding:

- identify concrete code/artifact;
- trace the failure mechanism;
- separate observation from inference;
- check surrounding invariants that may clear it;
- seek the cheapest decisive proof;
- deduplicate symptoms of the same underlying defect.

A plausible concern without a credible failure path is not automatically a defect.

### 4. Apply lead judgment

Classify:

- **Act On:** real issue that blocks correctness, security, data integrity, architectural invariants, or maintainability required by the task.
- **Consider:** legitimate tradeoff that may not justify changing this work now.
- **Noted:** valid context with low action value.
- **Dismissed:** wrong, already prevented, out of scope, speculative without a credible path, or churn without benefit.

Consensus raises attention but is never proof. Contrary source/runtime evidence wins.

### 5. Compose only where useful

- Use `blast-radius` when downstream compatibility is the central uncertainty.
- Use `prove-it-works` when an `Act On` finding or final verdict requires decisive execution/runtime proof.

## Capability contract

Review is read-only by default even if the active connector exposes writes. Do not mutate code, PRs, comments, labels, or branches unless the user separately asks for that action. If decisive runtime proof is unavailable, distinguish strong static evidence from `VERIFIED` runtime behavior.

## Output

Return intent, exact scope/artifact identity, `Act On`, `Consider`, `Noted`, `Dismissed`, agreement map only when genuinely independent reviews occurred, and a verdict bounded to the artifact actually reviewed.
