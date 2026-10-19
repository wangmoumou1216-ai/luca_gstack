#!/usr/bin/env python3
"""Read real Codex usage for one explicit session tree; no token estimates."""
import argparse
import json
from datetime import datetime
from pathlib import Path


def measure(session_id, directories):
    metadata = {}
    for directory in directories:
        for path in Path(directory).glob('*.jsonl'):
            with path.open() as stream:
                first = stream.readline()
            if not first:
                continue
            row = json.loads(first)
            if row.get('type') != 'session_meta':
                continue
            meta = row['payload']
            source = meta.get('source')
            spawn = source.get('subagent', {}).get('thread_spawn', {}) if isinstance(source, dict) else {}
            metadata[meta['id']] = (path, spawn.get('parent_thread_id'), spawn.get('agent_path'))
    if session_id not in metadata:
        raise ValueError('Exact requested session not found in supplied directories')
    included = {session_id}
    while True:
        children = {key for key, (_, parent, _) in metadata.items() if parent in included}
        if children <= included:
            break
        included |= children
    nodes, intervals, timing_gaps, usage_gaps, tree_gaps = [], [], [], [], []
    dispatched_children = set()
    totals = {key: 0 for key in ('input_tokens', 'cached_input_tokens', 'output_tokens', 'reasoning_output_tokens')}
    for key in sorted(included):
        path, parent, agent = metadata[key]
        usage, model, effort, opened = None, set(), set(), None
        turn_open, turn_usage = False, False
        starts, ends = [], []
        dispatches, responses = {}, {}
        for line in path.read_text().splitlines():
            row = json.loads(line)
            payload = row.get('payload', {})
            timestamp = row.get('timestamp')
            if row.get('type') == 'response_item':
                kind = payload.get('type')
                if kind in ('function_call', 'custom_tool_call') and payload.get('name', '').split('.')[-1] == 'spawn_agent':
                    dispatches[payload.get('call_id')] = payload
                elif kind in ('function_call_output', 'custom_tool_call_output'):
                    responses[payload.get('call_id')] = payload.get('output')
            if row.get('type') == 'turn_context':
                if payload.get('model'):
                    model.add(payload['model'])
                if payload.get('effort'):
                    effort.add(payload['effort'])
            if row.get('type') != 'event_msg':
                continue
            kind = payload.get('type')
            if kind == 'token_count' and payload.get('info'):
                current_usage = payload['info'].get('total_token_usage')
                if current_usage is not None:
                    usage = current_usage
                    turn_usage = turn_open
            if kind == 'task_started':
                if turn_open:
                    timing_gaps.append(f'{key}: overlapping/unclosed turn')
                    usage_gaps.append(f'{key}: interrupted turn cost may be unreported')
                turn_open, turn_usage = True, False
                opened = timestamp
                starts.append(timestamp)
            elif kind in ('task_complete', 'task_completed', 'turn_aborted'):
                ends.append(timestamp)
                if not turn_open:
                    timing_gaps.append(f'{key}: terminal event without task_started')
                else:
                    try:
                        start = datetime.fromisoformat(opened.replace('Z', '+00:00'))
                        end = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                        if start.tzinfo is None or end.tzinfo is None or end < start:
                            raise ValueError('invalid time interval')
                        intervals.append((start.timestamp(), end.timestamp()))
                    except (AttributeError, TypeError, ValueError):
                        timing_gaps.append(f'{key}: missing/invalid/reversed turn timestamp')
                if not turn_usage:
                    usage_gaps.append(f'{key}: terminal turn has no native usage update')
                if kind == 'turn_aborted':
                    usage_gaps.append(f'{key}: aborted turn may have unreported cost')
                turn_open, turn_usage = False, False
                opened = None
        for call_id in dispatches:
            output = responses.get(call_id)
            try:
                response = json.loads(output) if isinstance(output, str) else output
            except (TypeError, ValueError):
                response = None
            if not isinstance(response, dict) or response.get('error'):
                tree_gaps.append(f'{key}: spawn {call_id} missing/failed/unreadable response; child cost unresolved')
                continue
            child_id, task_name = response.get('agent_id'), response.get('task_name')
            matches = [identity for identity, (_, child_parent, child_path) in metadata.items()
                       if child_parent == key and
                       ((child_id and identity == child_id) or (task_name and child_path == task_name))]
            if len(matches) != 1:
                tree_gaps.append(f'{key}: spawn {call_id} child {child_id or task_name or "UNKNOWN"} trace missing/ambiguous')
            else:
                dispatched_children.add(matches[0])
        if not starts:
            timing_gaps.append(f'{key}: missing task_started events')
        if not ends:
            timing_gaps.append(f'{key}: missing terminal events')
        if turn_open:
            timing_gaps.append(f'{key}: still active or missing terminal event')
            usage_gaps.append(f'{key}: active turn cost is incomplete')
        if usage is None:
            usage_gaps.append(f'{key}: missing native usage')
        else:
            for name in totals:
                if name not in usage:
                    usage_gaps.append(f'{key}: missing {name}')
                totals[name] += usage.get(name, 0)
        nodes.append(dict(session_id=key, parent=parent, agent=agent, trace=str(path),
                          model=sorted(model), effort=sorted(effort), usage=usage,
                          started=starts, ended=ends))
    for child in sorted(included - {session_id} - dispatched_children):
        tree_gaps.append(f'{child}: child metadata has no matching successful parent dispatch evidence')
    union = []
    for start, end in sorted(intervals):
        if union and start <= union[-1][1]:
            union[-1][1] = max(union[-1][1], end)
        else:
            union.append([start, end])
    totals['total_tokens'] = totals['input_tokens'] + totals['output_tokens']
    totals['uncached_input_plus_output'] = totals['input_tokens'] - totals['cached_input_tokens'] + totals['output_tokens']
    observed_seconds = sum(end-start for start, end in union) if union else None
    gaps = timing_gaps + usage_gaps + tree_gaps
    return dict(session_id=session_id, nodes=nodes, token_totals=totals,
                token_totals_are_reported_subtotal=True,
                tree_coverage_status='UNKNOWN' if tree_gaps else 'OBSERVED',
                timing_status='UNKNOWN' if timing_gaps or tree_gaps else 'OBSERVED',
                usage_status='UNKNOWN' if gaps else 'OBSERVED',
                observed_active_window_seconds=observed_seconds,
                active_window_seconds=observed_seconds if not timing_gaps and not tree_gaps else None,
                elapsed_span_seconds=(union[-1][1]-union[0][0]) if union and not timing_gaps and not tree_gaps else None,
                status='UNKNOWN' if gaps else 'OBSERVED', gaps=gaps,
                limits='Tree coverage reconciles each native spawn response with exact child metadata recursively; missing, failed or unreadable dispatch evidence makes full cost UNKNOWN. This assumes complete unedited native traces, not arbitrary truncated excerpts. Native turn windows include tool/service wait. Human idle inside a turn is not automatically removed; report separately. Reported token subtotals are retained when complete cost is UNKNOWN, including aborted/unreported calls. OBSERVED means trace counters/windows and dispatch coverage were observed, not billed-cost reconciliation. Reasoning tokens are already inside output, not added twice. One-time implementation/diagnosis excluded only by selecting exact experiment roots.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--session', required=True)
    parser.add_argument('--directory', action='append', required=True)
    args = parser.parse_args()
    print(json.dumps(measure(args.session, args.directory), ensure_ascii=False, indent=2))
