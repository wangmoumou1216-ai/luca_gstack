"""Exercise real handoff parsing; synthetic fixtures do not attest native review."""
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HANDOFF = '''# Handoff: focused applicability fixture
gate_result: PASS
criteria:
  - "[C1] Original input fidelity PASS evidence: synthetic fixture source"
  - "[C2] No consequential evidence gap after independent examination PASS evidence: synthetic review fixture, not a native vote"
  - "[C3] No-research scope and original inputs preserved PASS evidence: Decisions and Constraints below"

## Decisions
applicability only; no new research. This is a parser fixture, not a completed skill run.
## Constraints
applicability only; no new research. No empirical confidence or design-benefit claim follows.
## Risks
Native behaviour is not tested by this fixture.
## Outputs
Synthetic applicability assessment; original input remains the requirement source.
'''


class HandoffTests(unittest.TestCase):
    def check_handoff(self, body, skill):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory, f'2026-10-16-fixture-{skill}-handoff.md')
            path.write_text(body)
            return subprocess.run(['node', str(ROOT / 'scripts/check-quality-gates.mjs'),
                                   '--handoff', str(path), '--require-gate', 'PASS'],
                                  cwd=ROOT, text=True, capture_output=True)

    def test_applicability_pass_shape_is_accepted_for_both_owners(self):
        for skill in ['deepresearch', 'ux-research']:
            with self.subTest(skill=skill):
                result = self.check_handoff(HANDOFF, skill)
                self.assertEqual(result.returncode, 0, result.stderr)

    def test_not_run_cannot_impersonate_completion(self):
        result = self.check_handoff(HANDOFF.replace('gate_result: PASS', 'gate_result: NOT_RUN'), 'deepresearch')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('invalid gate_result field', result.stderr)

    def test_missing_review_criterion_is_not_a_pass(self):
        result = self.check_handoff(HANDOFF.replace('examination PASS evidence:', 'examination UNKNOWN reason:'), 'ux-research')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('criterion C2 must be PASS', result.stderr)

    def test_missing_criteria_evidence_is_rejected(self):
        result = self.check_handoff(HANDOFF.replace('evidence: synthetic fixture source', 'evidence:'), 'deepresearch')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('every criteria bullet must contain', result.stderr)

    def test_completion_headers_apply_to_all_four_skill_owners(self):
        for skill in ['deepresearch', 'ux-research', 'brainstorm', 'ux-brainstorm']:
            with self.subTest(skill=skill):
                result = self.check_handoff(HANDOFF, skill)
                self.assertEqual(result.returncode, 0, result.stderr)
                missing = HANDOFF.replace('criteria:', 'no_criteria:')
                self.assertNotEqual(self.check_handoff(missing, skill).returncode, 0)

    def test_risk_reference_and_provenance_fit_existing_parser_contract(self):
        # Parser compatibility only: a semantic reviewer must still verify the referenced set.
        body = HANDOFF.replace(
            'Native behaviour is not tested by this fixture.',
            'Source: fixture-input-v1; confirmed choice: retain mechanism; evidence limits: offline.\n'
            'Risk summary: K1/K2; K3/K4. Complete critical set K1-K4: fixture-report-v1 section Risks.\n'
            'Native behaviour and source truth are not tested by this fixture.')
        self.assertLess(len(body), 8000)
        for skill in ['deepresearch', 'ux-research', 'ux-brainstorm']:
            with self.subTest(skill=skill):
                result = self.check_handoff(body, skill)
                self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == '__main__':
    unittest.main()
