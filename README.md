# Pryzael

WebChatGPT-oriented engineering skill materials adapted from selected skills in Cursor's `pstack` plugin.

This repository is intentionally a first-pass source pack. The skills are written as model-readable operating instructions rather than Cursor-specific executable plugins, so they can be refined later for the exact WebChatGPT skill/plugin surface.

## Included skills

- `architect` — settle caller usage, data shapes, interfaces, and module boundaries before implementation.
- `blast-radius` — trace non-obvious downstream breakage and prove the safety assumptions a change depends on.
- `figure-it-out` — design an auditable workflow for large or unusual work before executing it.
- `show-me-your-work` — maintain a compact decision/evidence/result trail for work reviewed after the fact.
- `interrogate` — perform adversarial review and synthesize findings rather than blindly applying them.
- `fix-root-causes` — reproduce, instrument, and repair the underlying cause instead of suppressing symptoms.
- `sequence-verifiable-units` — split multi-step work into independently checkable units and verify each before advancing.
- `prove-it-works` — require direct evidence from the real artifact before declaring work complete.

## WebChatGPT adaptation rules

The source pstack skills assume Cursor-specific facilities such as slash skills, `Task` subagents, worktrees, local transcript directories, model slug configuration, and Cursor Automations. Pryzael does not assume those facilities.

Each skill instead follows these rules:

1. Use connected sources and tools that are actually available in the current ChatGPT session.
2. Never invent a tool, subagent, filesystem path, transcript, model, or execution result.
3. If direct execution is unavailable, downgrade the verification level explicitly rather than pretending the task was run.
4. Prefer GitHub/file citations and concrete artifacts over unsupported narrative claims.
5. Treat `VERIFIED`, `NOT VERIFIED`, and `INCONCLUSIVE` as distinct outcomes.
6. Keep reversible investigation moving without unnecessary questions, but do not invent product requirements or irreversible authorization.
7. When another Pryzael skill is available, compose by name rather than duplicating its full procedure.

## Suggested layout

```text
skills/
  architect/SKILL.md
  blast-radius/SKILL.md
  figure-it-out/SKILL.md
  show-me-your-work/SKILL.md
  interrogate/SKILL.md
  fix-root-causes/SKILL.md
  sequence-verifiable-units/SKILL.md
  prove-it-works/SKILL.md
```

## Provenance

These materials are adapted from selected skills in [`cursor/plugins/pstack`](https://github.com/cursor/plugins/tree/main/pstack/skills), originally published under the MIT License. The adaptations remove or generalize Cursor-only mechanisms for WebChatGPT use while preserving the engineering intent of the source material.

See `THIRD_PARTY_NOTICES.md` for source and license information.
