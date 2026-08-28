# Evidence-source map

Historical design rationale is distributed. Search categories that are both available and plausibly connected to the target, and record coverage honestly.

| Category | Strongest evidence it can provide |
|---|---|
| Source control | Implementation-time rationale, PR discussion, code-review tradeoffs, commit/issue links, tests encoding motivating edge cases. |
| Issue/ticket tracker | Product/business forcing functions, customer/compliance constraints, planned scope, priority and linked incidents. |
| Long-form docs | RFCs, ADRs, PRDs, specs, alternatives considered, postmortems and explicit design decisions. |
| Team chat | Real-time deliberation, incident decisions and small rationale that never reached a formal document. |
| Infrastructure observability | Runtime conditions, metric thresholds, incidents and operational signals that motivated defensive code. |
| Error tracking | Concrete exception trajectories, affected releases and failure signatures around a corrective change. |
| Product analytics/warehouse | Usage distributions, experiments, rollout evidence and data reality behind product thresholds or migrations. |

## Search posture

- Start from a concrete code/decision anchor and dates/identifiers when possible.
- Independent categories may be searched concurrently when the host permits it.
- A null result is recorded, not hidden.
- Skip only because the category is unavailable or provably irrelevant to the target; name the reason.
- Do not let a source-control explanation substitute for unavailable product or operational evidence when the question depends on those forces.
