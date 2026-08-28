# pstack capability integration

Pryzael adapts useful ideas from Cursor's `pstack` without treating upstream packaging as architecture authority.

Upstream: `https://github.com/cursor/plugins/tree/main/pstack/skills`

## Admission rule

Before importing a pstack Skill, compare at least these shapes:

1. **New top-level Pryzael tool.** Use only for a distinct user intent that an existing owner cannot represent cleanly.
2. **Owner-local resource/playbook.** Preferred for a specialized procedure that belongs inside an existing workflow.
3. **Host capability.** Prefer an existing ChatGPT/GitHub/other App capability instead of proxying or duplicating it in Pryzael.
4. **No addition.** If current workflows already express the invariant, do not add a second copy.

For consequential architecture changes also compare stateless vs stateful and generated vs hand-maintained representations before adoption.

This gate exists because more MCP tools are not automatically better. Tool descriptions are part of the routing surface, and overlapping tools increase selection ambiguity and prompt/tool overhead.

## First integration wave

### Added as top-level tools

| Upstream | Pryzael | Why it earns a tool |
|---|---|---|
| `how` | `how` | Understanding current runtime/data/ownership flow is a distinct intent not owned by architecture design or review. |
| `why` | `why` | Historical motivation/evidence archaeology is distinct from current-system explanation. It can compose with other ChatGPT Apps without Pryzael proxying them. |

### Absorbed as owner-local resources

| Upstream | Pryzael owner/resource | Reason |
|---|---|---|
| `tdd` | `fix-root-causes/references/tdd-regression.md` | Regression-first testing is a conditional bug-fix tactic, not a separate default owner. |
| `create-verification-skill` | `prove-it-works/references/create-verification-harness.md` | Building a real-surface proof path belongs to verification. The adaptation prefers repo-native harnesses before host-specific Skill wrappers. |
| `maintain-verification-skill` | `prove-it-works/references/maintain-verification-harness.md` | Verification-map upkeep is a verification concern and does not need another routing surface. |
| `principle-laziness-protocol`, `principle-redesign-from-first-principles`, `principle-exhaust-the-design-space`, `principle-build-the-lever` | `architect/references/design-space-gate.md` | These are cross-cutting architecture selection rules. They strengthen the existing architect owner without becoming standalone tools. |

## Deliberately not exposed in this wave

- `poteto-mode`: useful upstream, but as a generic router it overlaps Pryzael's existing owner-first action selection and `figure-it-out`. Copying it as another top-level action would create a second routing authority.
- `teach`: mostly composition of understanding/rationale workflows. Try `how` + `why` before adding another tool.
- `arena` / `swarm`: depend on parallel agents/models as an execution capability. Pryzael must not promise subagents that the active ChatGPT surface does not expose.
- `recall`: depends on personal/session/shared-record access outside the MCP server's read-only public-workflow authority.
- `make-bot-ui`: product-specific rather than a general engineering control-plane capability.
- `setup-pstack`: configures Cursor/model-role machinery that Pryzael does not own.
- `automate-me` / `reflect`: useful meta-workflows, but lower-frequency; first measure whether the current workflow set produces repeated manual adaptation.
- `no-comments`, `unslop`, `bro`, `technical-writing`: useful communication/code-style capabilities, but not required for the engineering-control baseline. Admit later only if they solve measured gaps without crowding core routing.
- language-specific best-practice skills: defer until a language-specific gap is observed; generic architecture should not become a catalog of language linters.

## Routing budget

The qualified v0.2 baseline had eight tools and routed five representative intents correctly when Pryzael itself was selected. This wave grows the primary MCP surface only to ten tools. Further capability growth should prefer resources and composition until empirical routing evidence shows a new top-level owner is justified.

## Evaluation contract

After adding or changing top-level tools:

1. validate all Skill packages;
2. generate the MCP catalog and run the Worker smoke/dry-run check;
3. deploy the exact candidate;
4. with Pryzael selected but no action named, rerun representative existing intents plus the new intents;
5. reject the change or adjust ownership if existing routing regresses materially.

Unselected-Plugin automatic activation remains a host-level behavior, not the authority for Pryzael internal routing quality.
