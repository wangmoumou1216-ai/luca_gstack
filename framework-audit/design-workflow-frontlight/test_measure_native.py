"""Behaviour checks against the real meter with isolated native-shaped trace files."""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

SPEC = importlib.util.spec_from_file_location('native_meter', Path(__file__).with_name('measure-native.py'))
METER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(METER)
USAGE = dict(input_tokens=100, cached_input_tokens=20, output_tokens=20, reasoning_output_tokens=5)


def event(kind, second, **payload):
    return dict(type='event_msg', timestamp=f'2026-10-16T00:00:{second:02d}Z',
                payload=dict(type=kind, **payload))


def tokens(second, usage=None):
    return event('token_count', second, info=dict(total_token_usage=usage or USAGE))


def spawn(identity='child', call_id='spawn-1', by_path=False):
    return [
        dict(type='response_item', payload=dict(type='function_call', name='spawn_agent',
             namespace='collaboration', call_id=call_id, arguments='{}')),
        dict(type='response_item', payload=dict(type='function_call_output', call_id=call_id,
             output=json.dumps({'task_name': '/root/' + identity} if by_path else {'agent_id': identity}))),
    ]


class MeterTests(unittest.TestCase):
    def measure(self, rows, child=None):
        with tempfile.TemporaryDirectory() as directory:
            for identity, events, parent in [('root', rows, None), ('child', child, 'root')]:
                if events is None:
                    continue
                source = {'subagent': {'thread_spawn': {'parent_thread_id': parent,
                          'agent_path': '/root/' + identity}}} if parent else 'cli'
                meta = dict(type='session_meta', payload=dict(id=identity, source=source))
                Path(directory, identity + '.jsonl').write_text('\n'.join(map(json.dumps, [meta, *events])))
            return METER.measure('root', [directory])

    def test_completed_window_and_tokens(self):
        result = self.measure([event('task_started', 0), tokens(8), event('task_complete', 10)])
        self.assertEqual(result['status'], 'OBSERVED')
        self.assertEqual(result['active_window_seconds'], 10)
        self.assertEqual(result['token_totals']['total_tokens'], 120)
        self.assertEqual(result['token_totals']['uncached_input_plus_output'], 100)

    def test_missing_timing_is_unknown_not_zero(self):
        result = self.measure([tokens(8)])
        self.assertEqual(result['status'], 'UNKNOWN')
        self.assertIsNone(result['active_window_seconds'])
        self.assertIsNone(result['elapsed_span_seconds'])
        self.assertEqual(result['token_totals']['total_tokens'], 120)
        self.assertTrue(result['gaps'])

    def test_orphan_terminal_is_unknown(self):
        result = self.measure([tokens(8), event('task_complete', 10)])
        self.assertEqual(result['status'], 'UNKNOWN')
        self.assertIsNone(result['active_window_seconds'])

    def test_missing_terminal_is_unknown(self):
        result = self.measure([event('task_started', 0), tokens(8)])
        self.assertEqual(result['status'], 'UNKNOWN')
        self.assertIsNone(result['active_window_seconds'])

    def test_aborted_turn_keeps_time_but_cost_is_unknown(self):
        result = self.measure([event('task_started', 0), tokens(8), event('turn_aborted', 10)])
        self.assertEqual(result['status'], 'UNKNOWN')
        self.assertEqual(result['active_window_seconds'], 10)
        self.assertEqual(result['token_totals']['total_tokens'], 120)
        self.assertEqual(result['usage_status'], 'UNKNOWN')

    def test_later_turn_without_usage_does_not_reuse_old_cost_as_complete(self):
        result = self.measure([event('task_started', 0), tokens(3), event('task_complete', 4),
                               event('task_started', 5), event('task_complete', 9)])
        self.assertEqual(result['status'], 'UNKNOWN')
        self.assertEqual(result['active_window_seconds'], 8)
        self.assertEqual(result['token_totals']['total_tokens'], 120)

    def test_child_overlap_is_counted_once(self):
        result = self.measure([event('task_started', 0), *spawn(), tokens(9), event('task_complete', 10)],
                              [event('task_started', 3), tokens(7), event('task_complete', 8)])
        self.assertEqual(result['status'], 'OBSERVED')
        self.assertEqual(result['active_window_seconds'], 10)
        self.assertEqual(result['token_totals']['total_tokens'], 240)

    def test_child_missing_time_invalidates_total_not_known_parent_interval(self):
        result = self.measure([event('task_started', 0), *spawn(), tokens(8), event('task_complete', 10)], [tokens(8)])
        self.assertEqual(result['status'], 'UNKNOWN')
        self.assertIsNone(result['active_window_seconds'])
        self.assertEqual(result['observed_active_window_seconds'], 10)

    def test_reversed_or_missing_timestamps_are_unknown(self):
        for start in [event('task_started', 20), dict(type='event_msg', payload=dict(type='task_started'))]:
            with self.subTest(start=start):
                result = self.measure([start, tokens(8), event('task_complete', 10)])
                self.assertEqual(result['status'], 'UNKNOWN')
                self.assertIsNone(result['active_window_seconds'])

    def test_dispatched_child_missing_from_supplied_directories_is_unknown(self):
        result = self.measure([event('task_started', 0), *spawn(), tokens(8), event('task_complete', 10)])
        self.assertEqual(result['status'], 'UNKNOWN')
        self.assertEqual(result['tree_coverage_status'], 'UNKNOWN')
        self.assertEqual(result['usage_status'], 'UNKNOWN')
        self.assertIsNone(result['active_window_seconds'])
        self.assertEqual(result['token_totals']['total_tokens'], 120)
        self.assertTrue(any('child' in gap for gap in result['gaps']))

    def test_native_task_path_resolves_to_exact_child_metadata(self):
        result = self.measure([event('task_started', 0), *spawn(by_path=True), tokens(9), event('task_complete', 10)],
                              [event('task_started', 3), tokens(7), event('task_complete', 8)])
        self.assertEqual(result['tree_coverage_status'], 'OBSERVED')
        self.assertEqual(result['token_totals']['total_tokens'], 240)

    def test_missing_spawn_response_is_unknown(self):
        result = self.measure([event('task_started', 0), spawn()[0], tokens(8), event('task_complete', 10)])
        self.assertEqual(result['tree_coverage_status'], 'UNKNOWN')

    def test_failed_or_unrecognized_spawn_response_is_unknown(self):
        for output in ['not JSON', json.dumps({'error': 'transport failure'}), json.dumps({'status': 'unknown'})]:
            call, response = spawn()
            response['payload']['output'] = output
            result = self.measure([event('task_started', 0), call, response, tokens(8), event('task_complete', 10)])
            self.assertEqual(result['tree_coverage_status'], 'UNKNOWN')

    def test_child_without_parent_dispatch_evidence_is_unknown(self):
        result = self.measure([event('task_started', 0), tokens(9), event('task_complete', 10)],
                              [event('task_started', 3), tokens(7), event('task_complete', 8)])
        self.assertEqual(result['tree_coverage_status'], 'UNKNOWN')
        self.assertEqual(result['token_totals']['total_tokens'], 240)

    def test_missing_grandchild_is_unknown(self):
        result = self.measure([event('task_started', 0), *spawn(), tokens(9), event('task_complete', 10)],
                              [event('task_started', 3), *spawn('grandchild'), tokens(7), event('task_complete', 8)])
        self.assertEqual(result['tree_coverage_status'], 'UNKNOWN')
        self.assertEqual(result['token_totals']['total_tokens'], 240)


if __name__ == '__main__':
    unittest.main()
