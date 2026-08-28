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
            "description: \"Validation fixture.\"\n"
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

    def test_directory_like_prose_is_not_promoted_to_missing_file_contract(self):
        temp, skill = self.make_skill("Automation can use scripts/codemods.")
        self.addCleanup(temp.cleanup)
        self.assertEqual(validate_skill(skill), [])

    def test_missing_file_like_resource_reference_is_rejected(self):
        temp, skill = self.make_skill("Consult references/missing.md before continuing.")
        self.addCleanup(temp.cleanup)
        self.assertIn(
            "broken local resource reference: references/missing.md",
            validate_skill(skill),
        )

    def test_existing_extensionless_resource_reference_is_accepted(self):
        temp, skill = self.make_skill(
            "Use scripts/codemod when appropriate.",
            {"scripts/codemod": "fixture\n"},
        )
        self.addCleanup(temp.cleanup)
        self.assertEqual(validate_skill(skill), [])


if __name__ == "__main__":
    unittest.main()
