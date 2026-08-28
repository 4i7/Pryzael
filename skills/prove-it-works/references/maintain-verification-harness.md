# Maintain a project verification harness

Use when an existing verification command, guide, or feature map may have drifted from the product.

## Outcomes

Return one of:

- **clean**: source and live coverage found no correction worth shipping;
- **changed**: verification artifacts were corrected and the correction was re-proven;
- **blocked**: required coverage could not complete safely, with the exact blocker named.

## Maintenance pass

1. **Locate authority.** Identify the executable harness and any feature map/guide. If several copies disagree, resolve the authority problem before editing details.
2. **Index hygiene.** Remove dead/duplicate entries and identify user-facing surfaces missing from the map only with a concrete source anchor.
3. **Source coverage.** For each feature, trace current implementation enough to flag likely documentation/harness drift. Parallelize independent read-only slices only if the host supports it safely.
4. **Reconcile.** Merge overlapping live recipes into the fewest useful app states/sessions.
5. **Live pass.** Exercise every mapped feature at least once using the harness's own launch model. Health-check before driving, recover to known state after surprising failures, preserve evidence, and clean residue created by failed attempts.
6. **Triage.** Fix verification-doc/harness drift. Report product regressions separately instead of editing the verification contract to match broken behavior.
7. **Re-prove changes.** Any harness correction must be exercised live before it is claimed fixed.

Do not modify product code merely to make the verification harness green during a maintenance pass.
