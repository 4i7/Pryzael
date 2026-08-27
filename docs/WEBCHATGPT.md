# WebChatGPT deployment notes

## Verified product model

OpenAI currently documents ChatGPT Skills as reusable workflows that follow the Agent Skills open standard. Installed skills may be selected explicitly or activated automatically when relevant. Skills can contain instructions, supporting files, and code and are scanned when uploaded.

Personal Skills availability depends on the ChatGPT plan/workspace/surface. Do not assume a repository being connected through GitHub makes its `skills/` directory automatically installed.

For the current public product documentation, see:

- https://help.openai.com/en/articles/20001066
- https://openai.com/academy/skills/
- https://agentskills.io/specification

## Recommended deployment

Treat GitHub as the versioned source of truth and the ChatGPT Skill installation as a deployed copy.

For each skill:

1. Validate the directory against the Agent Skills format.
2. Review the skill and its bundled resources.
3. Upload/install that individual skill through a supported ChatGPT Skills surface when available.
4. Verify activation using both an explicit mention and a natural-language trigger.
5. After repository updates, update/reinstall the deployed skill rather than assuming GitHub changes synchronize automatically.

## Why each skill is self-contained

Agent Skills clients progressively load content inside the activated skill package. A reference outside the skill root is not a portable dependency. Therefore Pryzael keeps composition references by skill name and keeps only package-local supporting files under `references/`, `assets/`, or `scripts/`.

## GitHub use

GitHub access varies by ChatGPT surface and connector configuration. Portable Pryzael skills assume read access only. A session may expose stronger write operations, but writes are never required for analysis/review and are used only when the user requests a mutation.

For exact-head review, use `interrogate`; it contains a package-local GitHub identity contract.

## Fallback when Skills installation is unavailable

The repository remains usable as prompt material: fetch the relevant `SKILL.md` from the exact repository commit and ask ChatGPT to follow it for that task. This is not equivalent to an installed Skill because automatic discovery/composition is absent, but it preserves the workflow semantics.
