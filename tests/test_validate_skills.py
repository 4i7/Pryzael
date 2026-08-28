from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from validate_skills import validate_skill  # noqa: E402


class ResourceReferenceValidationTests(unittest.TestCase):
    def make_skill(self, body: str, extra_files: dict[str, str] | None = None):
        temp = tempfile.TemporaryDirectory()
        skill = Path(temp.name) / "demo-skill"
        skill.mkdir()
        (skill / "SKILL.md").write_text(
            "---\n"
            "name: demo-skill\n"
            'description: "Validation fixture."\n'
            "---\n\n"
            f"{body}\n",
            encoding="utf-8",
        )
        (skill / "LICENSE.pstack.txt").write_text("fixture\n", encoding="utf-8")
        for relative, content in (extra_files or {}).items():
            target = skill / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(content, encoding="utf-8")
        return temp, skill

    def assert_broken(self, body: str, resource: str) -> None:
        temp, skill = self.make_skill(body)
        self.addCleanup(temp.cleanup)
        self.assertIn(
            f"broken local resource reference: {resource}",
            validate_skill(skill),
        )

    def test_incidental_path_like_prose_is_not_promoted_to_reference(self):
        temp, skill = self.make_skill(
            "Automation can use scripts/codemods. "
            "The references/index prose label is descriptive."
        )
        self.addCleanup(temp.cleanup)
        self.assertEqual(validate_skill(skill), [])

    def test_explicit_missing_extensionless_code_span_is_rejected(self):
        self.assert_broken(
            "Run `scripts/bootstrap` before continuing.",
            "scripts/bootstrap",
        )

    def test_explicit_existing_extensionless_code_span_is_accepted(self):
        temp, skill = self.make_skill(
            "Run `scripts/bootstrap` before continuing.",
            {"scripts/bootstrap": "fixture\n"},
        )
        self.addCleanup(temp.cleanup)
        self.assertEqual(validate_skill(skill), [])

    def test_explicit_missing_suffix_bearing_reference_is_rejected(self):
        self.assert_broken(
            "Consult `references/missing.md` before continuing.",
            "references/missing.md",
        )

    def test_existing_normal_code_span_reference_is_accepted(self):
        temp, skill = self.make_skill(
            "Consult `references/runbook.md` before continuing.",
            {"references/runbook.md": "fixture\n"},
        )
        self.addCleanup(temp.cleanup)
        self.assertEqual(validate_skill(skill), [])

    def test_markdown_link_is_an_explicit_reference_even_without_suffix(self):
        self.assert_broken(
            "See [bootstrap instructions](scripts/bootstrap).",
            "scripts/bootstrap",
        )

    def test_punctuation_outside_code_span_does_not_change_reference_identity(self):
        self.assert_broken(
            "Use `references/index`, then continue.",
            "references/index",
        )

    def test_anchor_on_markdown_link_resolves_the_underlying_resource(self):
        temp, skill = self.make_skill(
            "See [the gate](references/gate.md#decision).",
            {"references/gate.md": "fixture\n"},
        )
        self.addCleanup(temp.cleanup)
        self.assertEqual(validate_skill(skill), [])


if __name__ == "__main__":
    unittest.main()
