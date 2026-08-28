#!/usr/bin/env python3
"""Lightweight Pryzael package checks. Use pinned skills-ref for independent validation."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKILLS = ROOT / "skills"
ALLOWED_TOP = {"name", "description", "license", "compatibility", "metadata", "allowed-tools"}
NAME_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
RESOURCE_PATH_RE = re.compile(r"^(?:references|assets|scripts)/[A-Za-z0-9._/-]+$")
INLINE_CODE_RE = re.compile(r"(?<!`)`([^`\n]+)`(?!`)")
MARKDOWN_LINK_RE = re.compile(
    r"\[[^\]\n]*\]\(\s*(?:<([^>\n]+)>|([^\s)]+))(?:\s+['\"][^)\n]*['\"])?\s*\)"
)


def frontmatter(text: str) -> tuple[dict[str, str], list[str]]:
    lines = text.splitlines()
    errors: list[str] = []
    if not lines or lines[0].strip() != "---":
        return {}, ["missing opening YAML frontmatter delimiter"]
    try:
        end = next(i for i in range(1, len(lines)) if lines[i].strip() == "---")
    except StopIteration:
        return {}, ["missing closing YAML frontmatter delimiter"]

    data: dict[str, str] = {}
    current_parent: str | None = None
    for raw in lines[1:end]:
        if not raw.strip() or raw.lstrip().startswith("#"):
            continue
        indent = len(raw) - len(raw.lstrip(" "))
        if indent == 0:
            if ":" not in raw:
                errors.append(f"invalid top-level YAML line: {raw!r}")
                continue
            key, value = raw.split(":", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            data[key] = value
            current_parent = key if not value else None
        elif current_parent == "metadata":
            if ":" not in raw.strip():
                errors.append(f"invalid metadata YAML line: {raw!r}")
        else:
            errors.append(f"unsupported nested YAML under {current_parent!r}: {raw!r}")
    return data, errors


def explicit_resource_references(text: str) -> list[str]:
    """Return only resource paths expressed through established explicit Markdown syntax."""
    references: list[str] = []

    def add(raw: str) -> None:
        candidate = raw.strip()
        candidate = candidate.split("#", 1)[0]
        if RESOURCE_PATH_RE.fullmatch(candidate) and candidate not in references:
            references.append(candidate)

    for match in INLINE_CODE_RE.finditer(text):
        add(match.group(1))

    for match in MARKDOWN_LINK_RE.finditer(text):
        add(match.group(1) or match.group(2))

    return references


def validate_skill(path: Path) -> list[str]:
    errors: list[str] = []
    skill_file = path / "SKILL.md"
    if not skill_file.is_file():
        return ["missing SKILL.md"]

    text = skill_file.read_text(encoding="utf-8")
    data, parse_errors = frontmatter(text)
    errors.extend(parse_errors)

    unknown = set(data) - ALLOWED_TOP
    if unknown:
        errors.append(f"unsupported top-level frontmatter keys: {sorted(unknown)}")

    name = data.get("name", "")
    if name != path.name:
        errors.append(f"name {name!r} does not match directory {path.name!r}")
    if not NAME_RE.fullmatch(name):
        errors.append(f"invalid skill name: {name!r}")
    if len(name) > 64:
        errors.append("name exceeds 64 characters")

    desc = data.get("description", "")
    if not desc:
        errors.append("missing description")
    if len(desc) > 1024:
        errors.append("description exceeds 1024 characters")

    if len(text.splitlines()) > 500:
        errors.append("SKILL.md exceeds 500 lines")

    notice = path / "LICENSE.pstack.txt"
    if not notice.is_file():
        errors.append("missing LICENSE.pstack.txt package notice")

    for resource in explicit_resource_references(text):
        if not (path / resource).exists():
            errors.append(f"broken local resource reference: {resource}")

    return errors


def main() -> int:
    failures = 0
    if not SKILLS.is_dir():
        print("skills directory not found", file=sys.stderr)
        return 2

    for path in sorted(p for p in SKILLS.iterdir() if p.is_dir()):
        errors = validate_skill(path)
        if errors:
            failures += 1
            print(f"FAIL {path.name}")
            for error in errors:
                print(f"  - {error}")
        else:
            print(f"PASS {path.name}")

    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
