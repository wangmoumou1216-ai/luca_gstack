"""Offline only: every permission/network operation and child process is stubbed."""
import contextlib
import errno
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import unittest
from unittest.mock import MagicMock, patch

PROGRAM = Path(__file__).with_name('u007-probe-program-r8.py')
spec = importlib.util.spec_from_file_location('probe_r8', PROGRAM)
probe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(probe)
# Frozen P07 preparation stdout, copied as data without executing its loader.
GOOD_RULES = 'Applicable rules for office:\n- R-20260522-001 [medium]: office: CLAUDE.md 路由表与 SKILL.md Step 3 列表必须保持一致，任一变更须同步另一处\n- R-20260523-001 [medium]: office/route: 项目上下文门禁优先于场景B功能优化路由；“老项目/已有项目/继续项目”先确认或切换项目，再决定 skill。\n- R-20260820-001 [medium]: 强制项目切换轮结束后，下一条用户消息应自动续接已明确的原始任务，不得制造重复确认；真实人类决策门除外\n- R-20260824-001 [medium]: office: 项目创建意图与名称已明确后，不得要求用户重复输入同一门禁口令；应在官方事务路径内自行完成，无法完成时一次性报告 blocker。\n- R-20260923-003 [high]: office/route-guard: 普通任务无完整关键词命中时返回 NONE/semantic fallback，不得把 no_keyword_match 映射为 STOP；仅项目或作用域歧义、元问题与受保护拒绝可 STOP。\n'
EXPECTED_IDS = ['allowed-read', 'outside-read', 'symlink-escape-denied',
                'readonly-case-write', 'outside-write', 'child-inherits-denial',
                'network-connect-denied', 'baseline-active-rules']


class ProbeTests(unittest.TestCase):
    def setUp(self):
        self.stack = contextlib.ExitStack()
        self.addCleanup(self.stack.close)
        self.read = self.stack.enter_context(patch.object(Path, 'read_text'))
        self.read.side_effect = self.read_target
        self.write = self.stack.enter_context(patch.object(Path, 'write_text',
            side_effect=PermissionError(errno.EACCES, 'denied')))
        self.socket = self.stack.enter_context(patch.object(probe.socket, 'socket'))
        self.connect = self.socket.return_value.__enter__.return_value.connect
        self.connect.side_effect = PermissionError(errno.EPERM, 'denied')
        self.child = subprocess.CompletedProcess([], 1, '', 'cat: Permission denied\n')
        self.loader = subprocess.CompletedProcess([], 0, GOOD_RULES, '')
        self.process = self.stack.enter_context(patch.object(probe.subprocess, 'run'))
        self.process.side_effect = self.run_child
        self.read_count = 0

    def read_target(self):
        self.read_count += 1
        if self.read_count == 1:
            return 'P06 owned allowed marker\n'
        raise PermissionError(errno.EPERM, 'denied')

    def run_child(self, command, **kwargs):
        return self.child if command[0] == '/bin/cat' else self.loader

    def invoke(self, args=None):
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            exit_code = probe.main(['/mock/outside', '58503', '/mock/runtime'] if args is None else args)
        raw = output.getvalue()
        self.assertEqual(len(raw.splitlines()), 1)
        result = json.loads(raw)
        self.assertEqual([c['id'] for c in result['checks']], EXPECTED_IDS)
        self.assertTrue(all(type(c['passed']) is bool for c in result['checks']))
        self.assertEqual(exit_code, 0 if result['passed'] else 1)
        self.assertEqual(result['passed'], all(c['passed'] for c in result['checks']))
        return result

    def test_success_and_exact_canonical_child_arguments(self):
        self.assertEqual(hashlib.sha256(GOOD_RULES.encode()).hexdigest(),
            '66a501665fb15b3b5e30fead5a47901d064c92f633e04a9baf9a0d284f86b0b4')
        original_resolve = Path.resolve
        def resolve(path):
            return Path('/canonical/python3') if str(path) == '/alias/python3' else original_resolve(path)
        with patch.object(probe.sys, 'executable', '/alias/python3'), patch.object(Path, 'resolve', resolve):
            result = self.invoke()
        self.assertTrue(result['passed'])
        here = PROGRAM.resolve().parent
        self.assertEqual(self.process.call_args_list[0].args[0], ['/bin/cat', '/mock/outside/denied.txt'])
        self.assertEqual(self.process.call_args_list[1].args[0], ['/canonical/python3', '-B',
            str(here / 'baseline/.claude/observability/scripts/get_rules.py'), 'office', '*'])
        self.assertEqual(self.process.call_args_list[1].kwargs, {'text': True, 'capture_output': True, 'timeout': 10})
        self.connect.assert_called_once_with(('127.0.0.1', 58503))
        self.assertEqual(result['checks'][-1]['stdout_sha256'], probe.EXPECTED_RULE_SHA256)

    def test_expected_permission_denials_are_explicit(self):
        result = self.invoke()
        for index in (1, 2, 3, 4, 6):
            check = result['checks'][index]
            self.assertTrue(check['passed'])
            self.assertTrue(check['expected_denial'])
            self.assertIn(check['exception']['errno'], (errno.EPERM, errno.EACCES))

    def test_unexpected_allow_never_passes_denial_checks(self):
        self.read.side_effect = None
        self.read.return_value = 'P06 owned allowed marker\n'
        self.write.side_effect = None
        self.connect.side_effect = None
        result = self.invoke()
        for index in (1, 2, 3, 4, 6):
            self.assertFalse(result['checks'][index]['passed'])
            self.assertEqual(result['checks'][index]['detail'], 'unexpectedly allowed')
        self.assertTrue(result['checks'][-1]['passed'])

    def test_missing_file_and_refused_connection_are_not_permission_evidence(self):
        self.read.side_effect = FileNotFoundError(errno.ENOENT, 'missing')
        self.connect.side_effect = ConnectionRefusedError(errno.ECONNREFUSED, 'refused')
        result = self.invoke()
        for index in (0, 1, 2, 6):
            self.assertFalse(result['checks'][index]['passed'])
        self.assertEqual(result['checks'][0]['error']['errno'], errno.ENOENT)
        self.assertEqual(result['checks'][6]['errno'], errno.ECONNREFUSED)

    def test_every_check_exception_is_retained_and_does_not_stop_later_checks(self):
        self.read.side_effect = ValueError('read failure')
        self.write.side_effect = ValueError('write failure')
        self.process.side_effect = PermissionError(errno.EPERM, 'spawn denied', '/alias/python3')
        self.connect.side_effect = TimeoutError('connect timeout')
        result = self.invoke()
        self.assertFalse(any(c['passed'] for c in result['checks']))
        for check in result['checks']:
            self.assertTrue('error' in check or 'exception' in check)
        self.assertEqual(self.process.call_count, 2)
        self.connect.assert_called_once()

    def test_p07_loader_spawn_failure_preserves_first_seven_results(self):
        def run(command, **kwargs):
            if command[0] == '/bin/cat':
                return self.child
            raise PermissionError(errno.EPERM, 'Operation not permitted', '/alias/python3')
        self.process.side_effect = run
        result = self.invoke()
        self.assertTrue(all(c['passed'] for c in result['checks'][:7]))
        last = result['checks'][-1]
        self.assertFalse(last['passed'])
        self.assertIsNone(last['exit_code'])
        self.assertIsNone(last['stdout_sha256'])
        self.assertIsNone(last['parse_failure_reported'])
        self.assertEqual(last['error']['type'], 'PermissionError')
        self.assertEqual(last['error']['filename'], '/alias/python3')

    def test_child_spawn_denial_is_not_inherited_permission_success(self):
        self.process.side_effect = [PermissionError(errno.EACCES, 'spawn denied'), self.loader]
        result = self.invoke()
        self.assertFalse(result['checks'][5]['passed'])
        self.assertEqual(result['checks'][5]['error']['errno'], errno.EACCES)
        self.assertTrue(result['checks'][-1]['passed'])

    def test_child_nonzero_without_permission_message_fails(self):
        self.child = subprocess.CompletedProcess([], 1, '', 'No such file or directory')
        result = self.invoke()
        self.assertFalse(result['checks'][5]['passed'])
        self.assertEqual(result['checks'][5]['exit_code'], 1)

    def test_loader_nonzero_exit_remains_failure_even_with_matching_hash(self):
        self.loader = subprocess.CompletedProcess([], 9, GOOD_RULES, '')
        last = self.invoke()['checks'][-1]
        self.assertEqual(last['exit_code'], 9)
        self.assertEqual(last['stdout_sha256'], probe.EXPECTED_RULE_SHA256)
        self.assertEqual(last['failures'], ['loader_nonzero_exit'])

    def test_loader_fail_open_parse_warning_is_distinct_from_exit_and_hash(self):
        warning = '[get_rules] rules.yaml 解析失败，按无规则继续: bad YAML\n'
        self.loader = subprocess.CompletedProcess([], 0, 'Applicable rules for office: none\n', warning)
        last = self.invoke()['checks'][-1]
        self.assertEqual(last['exit_code'], 0)
        self.assertTrue(last['parse_failure_reported'])
        self.assertEqual(last['stderr'], warning)
        self.assertEqual(last['failures'], ['loader_parse_failure', 'loader_stderr', 'loader_hash_mismatch'])

    def test_loader_exit_parse_hash_failures_can_coexist(self):
        self.loader = subprocess.CompletedProcess([], 3, 'bad', '[get_rules] rules.yaml 解析失败: bad')
        last = self.invoke()['checks'][-1]
        self.assertEqual(last['failures'], ['loader_nonzero_exit', 'loader_parse_failure',
            'loader_stderr', 'loader_hash_mismatch'])

    def test_json_shaped_and_malformed_loader_output_do_not_bypass_plain_text_hash(self):
        for stdout in ('{"passed":true}', '{invalid json'):
            with self.subTest(stdout=stdout):
                self.read_count = 0
                self.loader = subprocess.CompletedProcess([], 0, stdout, '')
                last = self.invoke()['checks'][-1]
                self.assertEqual(last['stdout'], stdout)
                self.assertEqual(last['failures'], ['loader_hash_mismatch'])
                self.assertFalse(last['parse_failure_reported'])

    def test_encoding_error_keeps_actual_exit_and_outputs_in_valid_json(self):
        self.loader = subprocess.CompletedProcess([], 0, '\ud800', '')
        last = self.invoke()['checks'][-1]
        self.assertFalse(last['passed'])
        self.assertEqual(last['exit_code'], 0)
        self.assertEqual(last['stdout'], '\ud800')
        self.assertEqual(last['error']['type'], 'UnicodeEncodeError')
        self.assertIsNone(last['stdout_sha256'])

    def test_timeout_binary_partial_output_is_lossless_json_evidence(self):
        self.process.side_effect = [self.child, subprocess.TimeoutExpired('loader', 10,
            output=b'partial\xff', stderr=b'error\x80')]
        last = self.invoke()['checks'][-1]
        self.assertEqual(last['error']['type'], 'TimeoutExpired')
        self.assertEqual(bytes.fromhex(last['error']['stdout']['hex']), b'partial\xff')
        self.assertEqual(bytes.fromhex(last['error']['stderr']['hex']), b'error\x80')
        self.assertIsNone(last['exit_code'])

    def test_json_escaping_round_trip_without_extra_stdout(self):
        self.loader = subprocess.CompletedProcess([], 1, '\n"}\\ malicious\x00', '中文\nwarning')
        last = self.invoke()['checks'][-1]
        self.assertEqual(last['stdout'], self.loader.stdout)
        self.assertEqual(last['stderr'], self.loader.stderr)

    def test_bad_arguments_emit_eight_not_run_results_without_probe_operations(self):
        for args in ([], ['a', 'bad', 'c'], ['a', '0', 'c'], ['a', '65536', 'c']):
            with self.subTest(args=args):
                result = self.invoke(args)
                self.assertEqual(result['error']['type'], 'ValueError')
                self.assertTrue(all(c['detail'] == 'not run: setup failed' for c in result['checks']))
        self.read.assert_not_called()
        self.write.assert_not_called()
        self.socket.assert_not_called()
        self.process.assert_not_called()


if __name__ == '__main__':
    unittest.main(verbosity=2)
