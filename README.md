# Pryzael

Portable engineering skills for ChatGPT and other Agent Skills-compatible clients, adapted from selected `pstack` skills.

Pryzael is both a source-of-truth repository and a **skills-only ChatGPT/Codex plugin package**. The repository root is the plugin root, `.codex-plugin/plugin.json` identifies the installable plugin, and each directory under `skills/` remains an independent Agent Skills package whose runtime manifest is its own `SKILL.md`.

## Skills

- `architect` — settle caller usage, data shapes, invariants, interfaces, and ownership before implementation.
- `blast-radius` — find non-obvious downstream breakage and prove the safety assumptions a change depends on.
- `figure-it-out` — orchestrate large, cross-cutting, unusual, or multi-phase work around falsifiable completion criteria.
- `show-me-your-work` — keep an auditable decision/evidence/result trail for handoffs and long work.
- `interrogate` — adversarially review a diff, PR, exact commit, or design and separate real findings from noise.
- `fix-root-causes` — reproduce failures, trace violated invariants, and repair the defect class rather than one symptom.
- `sequence-verifiable-units` — split multi-step work into independently checkable transitions and verify before advancing.
- `prove-it-works` — verify completion claims against the exact artifact and strongest available real behavior path.

## Plugin shape

Pryzael deliberately uses the OpenAI **Skills only** plugin architecture:

```text
.codex-plugin/plugin.json
skills/
  architect/
  blast-radius/
  figure-it-out/
  fix-root-causes/
  interrogate/
  prove-it-works/
  sequence-verifiable-units/
  show-me-your-work/
```

There is no Pryzael MCP server, `.mcp.json`, `.app.json`, hosted database, external API, or always-on runtime. Skills use tools/connectors already available in the active ChatGPT or Codex session. This avoids adding a metered hosting dependency or another operational authority layer.

The absence of Pryzael runtime infrastructure does not remove usage limits imposed by ChatGPT plans, models, connectors, or third-party services.

See [`docs/PLUGIN.md`](docs/PLUGIN.md) for the zero-infrastructure packaging, testing, and Web distribution model.

## Runtime model

Pryzael follows the Agent Skills open format:

```text
skills/<name>/
  SKILL.md                 required manifest and instructions
  references/              optional, loaded on demand
  assets/                  optional templates/resources
  scripts/                 optional executable helpers
  LICENSE.pstack.txt       upstream notice for these adaptations
```

The `name` and `description` in each `SKILL.md` are the discovery surface. Keep them precise. Detailed procedures belong in the body or on-demand references.

Installing the Pryzael plugin groups the eight skills into one installable experience. Individual skills remain self-contained and do not depend on files above their own skill root for runtime correctness.

## Architecture

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for:

- ChatGPT/Agent Skills loading boundaries;
- soft composition and trigger precedence;
- GitHub exact-head review semantics;
- capability detection and read/write boundaries;
- verification and audit contracts;
- skills-only plugin packaging and validation rules.

See [`docs/WEBCHATGPT.md`](docs/WEBCHATGPT.md) for product-facing deployment notes and [`docs/PLUGIN.md`](docs/PLUGIN.md) for the OpenAI plugin path.

## Validation

The authoritative format validator is the Agent Skills `skills-ref` validator when available:

```text
skills-ref validate ./skills/architect
```

Pryzael also carries a lightweight repository check:

```text
python scripts/validate_skills.py
```

It checks the subset of format and packaging invariants Pryzael relies on. It is not a replacement for the upstream validator or the OpenAI plugin submission scanner.

## Provenance

These materials are adapted from selected skills in Cursor's `pstack` plugin. Upstream pstack is MIT licensed. Each independently distributable skill folder contains `LICENSE.pstack.txt` so the notice remains present when a skill is copied or uploaded without the repository root.

See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) for repository-level provenance.
