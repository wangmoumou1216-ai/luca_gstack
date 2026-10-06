"""Actual parent consumption of the native DESIGN_DRAFT response; audit-only."""
import hashlib
import json
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET

input_path, response_path, receipt_path, result_path = map(Path, sys.argv[1:])
request = json.loads(input_path.read_text())
response = response_path.read_text()
receipt = json.loads(receipt_path.read_text())

def require(condition, reason):
    if not condition:
        raise ValueError(reason)

def block(tag):
    matches = re.findall(rf'<{tag}(?:\s[^>]*)?>.*?</{tag}>', response, re.S)
    require(len(matches) == 1, f'exact one {tag} required')
    require('<!DOCTYPE' not in response and '<!ENTITY' not in response, 'DTD forbidden')
    return ET.fromstring(matches[0])

def value(tree, tag):
    return (tree.findtext(tag) or '').strip()

require(receipt['status'] == 'accepted', 'same native invocation not accepted')
require(receipt.get('input_sha'), 'native input binding absent')
native_ref = re.fullmatch(r'codex-transcript:(.+):(01[a-z0-9-]+)', receipt['evidence_ref'])
require(native_ref is not None, 'native response provenance absent')
events = [json.loads(line) for line in Path(native_ref.group(1)).read_text().splitlines()]
native_reports = ['\n'.join(item.get('text', '') for item in event['payload'].get('content', [])
                           if item.get('type') == 'output_text')
                  for event in events if event.get('type') == 'response_item'
                  and event.get('payload', {}).get('type') == 'message'
                  and event['payload'].get('role') == 'assistant']
native_report = next((item for item in reversed(native_reports) if 'EVAL_ENVELOPE_JSON' in item), None)
require(native_report is not None and response == native_report + '\n', 'response does not match accepted native invocation output')
require(request['review_stage'] == 'DESIGN_DRAFT' and request['skill_name'] in ('brainstorm', 'ux-brainstorm'), 'bounded facet')
require(request['draft']['encoding'] == 'utf-8', 'draft encoding')
require(hashlib.sha256(request['draft']['body'].encode('utf-8')).hexdigest() == request['draft']['sha256'], 'input draft drift')
require(response.count('EVAL_ENVELOPE_JSON') == 1, 'one envelope required')
envelope = json.loads(response.split('EVAL_ENVELOPE_JSON')[1].strip())
require(envelope['schema_version'] == 1 and envelope['producer'] == 'quality-gate', 'envelope schema')
require(envelope['eval_run_id'] == request['eval_run_id'], 'envelope identity')
require(envelope['subject']['skill'] == request['skill_name'] + ':DESIGN_DRAFT', 'subject identity')
require(envelope['subject']['output_paths'] == [], 'future output exemption invalid')
findings = block('review_findings')
criteria = block('criteria_results')
for tree in (findings, criteria):
    for key, expected_value in {'skill_name': request['skill_name'], 'round': str(request['round']),
                       'draft_sha256': request['draft']['sha256'], 'eval_run_id': request['eval_run_id'],
                       'review_stage': 'DESIGN_DRAFT', 'scope_tier': request['scope_tier']}.items():
        require(tree.get(key) == expected_value, f'{tree.tag} {key} mismatch')
require(criteria.get('review_stage') == 'DESIGN_DRAFT' and criteria.get('scope_tier') == request['scope_tier'], 'criterion scope identity')
rows = criteria.findall('criterion')
expected = {item['id']: item for item in request['criteria']}
require(bool(expected) and len(expected) == len(request['criteria']), 'invalid original denominator')
require(len(rows) == len(expected), 'criterion denominator')
require(len({item.get('id') for item in rows}) == len(rows), 'duplicate criteria')
for row in rows:
    require(row.get('id') in expected, 'unknown criterion')
    require(row.get('level') == expected[row.get('id')]['level'], 'criterion severity mismatch')
    require(row.get('status') in ('PASS', 'FAIL', 'UNKNOWN'), 'criterion verdict unknown')
    require(bool((row.findtext('evidence') or '').strip()), 'criterion evidence missing')
passed = sum(row.get('status') == 'PASS' for row in rows)
blocking = any(row.get('level') == 'BLOCKING' and row.get('status') != 'PASS' for row in rows)
seen = set()
counts = {'critical': 0, 'high': 0}
for finding in findings.findall('finding'):
    ident = finding.get('id')
    require(ident and ident not in seen, 'finding identity')
    seen.add(ident)
    severity = (finding.findtext('severity') or '').strip().lower()
    require(severity in ('critical', 'high', 'medium', 'low', 'fyi'), 'unknown finding severity')
    for tag in ('dimension', 'issue', 'evidence'):
        require(bool((finding.findtext(tag) or '').strip()), f'finding {tag} missing')
    if request['skill_name'] == 'brainstorm':
        require(value(finding, 'dimension') in ('Coherence', 'Feasibility', 'Scope', 'Assumption', 'Handoff', 'Research_Loss', 'AI_Native'), 'finding dimension')
        require(value(finding, 'confidence') in ('100', '75', '50'), 'finding confidence')
        for tag in ('location', 'proposed_fix'):
            require(bool((finding.findtext(tag) or '').strip()), f'finding {tag} missing')
    else:
        require(value(finding, 'dimension') in ('1', '2', '3', '4', '5'), 'finding dimension')
        require(value(finding, 'classification') in ('safe_auto', 'gated_auto', 'manual', 'fyi'), 'finding classification')
        require(bool((finding.findtext('suggestion') or '').strip()), 'finding suggestion missing')
    if severity in counts:
        counts[severity] += 1
        blocking = True
summary = block('review_summary') if request['skill_name'] == 'brainstorm' else findings.find('summary')
require(summary is not None, 'summary absent')
for severity, count in counts.items():
    require(value(summary, severity + '_count') == str(count), 'summary count mismatch')
if request['skill_name'] == 'brainstorm':
    readiness = value(summary, 'overall_readiness')
    require(readiness in ('handoff-ready', 'needs-rework', 'critical-gaps'), 'readiness invalid')
    require(not (blocking and readiness == 'handoff-ready'), 'persisting blocker falsely handoff ready')
else:
    require(value(summary, 'converged') in ('true', 'false'), 'converged invalid')
    require(not (blocking and value(summary, 'converged') == 'true'), 'no-new bypass')
verdict = envelope['verdict']
require(verdict['passed'] == passed and verdict['total'] == len(expected), 'envelope denominator mismatch')
status = 'FAIL' if blocking else ('PASS' if passed == len(expected) else 'CONDITIONAL_PASS')
require(verdict['status'] == status, 'XML/criteria/envelope verdict contradiction')
require(not (counts['critical'] + counts['high'] and passed == len(expected)), 'blocking findings omitted from criteria')
for source in request['source_refs']:
    if 'path' in source:
        require(hashlib.sha256(Path(source['path']).read_bytes()).hexdigest() == source['sha256'], 'source drift')
result_path.write_text(json.dumps({'mechanical_consumption': 'VALID', 'decision': status,
    'may_enter_phase6': status in ('PASS', 'CONDITIONAL_PASS'), 'passed': passed, 'total': len(expected),
    'counts': counts, 'draft_sha256': request['draft']['sha256'],
    'input_file_sha256': hashlib.sha256(input_path.read_bytes()).hexdigest(),
    'native_invocation_id': receipt['invocation_id'], 'native_input_sha': receipt['input_sha'],
    'response_sha256': hashlib.sha256(response_path.read_bytes()).hexdigest()}, indent=2) + '\n')
print(status, f'{passed}/{len(expected)}', 'same accepted native response consumed')
