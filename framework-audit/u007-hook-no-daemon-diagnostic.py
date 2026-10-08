import json, os, pathlib, queue, subprocess, threading, time

AUDIT = pathlib.Path('/Users/luca/Desktop/luca_gstack/framework-audit')
TEMP = pathlib.Path(json.loads((AUDIT / 'u007-hook-config-layer-diagnostic.json').read_text())['root'])
SOURCE = pathlib.Path('/Users/luca/Desktop/luca_gstack')

def inspect(root):
    argv = ['/Users/luca/.local/bin/codex', '--no-daemon', 'app-server', '--listen', 'stdio://', '-c', f'projects."{root}".trust_level="trusted"']
    process = subprocess.Popen(argv, cwd=root, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    responses = queue.Queue()
    def reader():
        for line in process.stdout:
            try: responses.put(json.loads(line))
            except json.JSONDecodeError: pass
    threading.Thread(target=reader, daemon=True).start()
    threading.Thread(target=lambda: list(process.stderr), daemon=True).start()
    request_id = 0
    def request(method, params):
        nonlocal request_id
        request_id += 1
        process.stdin.write(json.dumps({'id': request_id, 'method': method, 'params': params}) + '\n')
        process.stdin.flush()
        deadline = time.monotonic() + 15
        while time.monotonic() < deadline:
            value = responses.get(timeout=max(.1, deadline-time.monotonic()))
            if value.get('id') == request_id:
                if 'error' in value: raise RuntimeError(str(value['error']))
                return value.get('result')
        raise TimeoutError(method)
    try:
        init = request('initialize', {'clientInfo': {'name':'luca_u007_metadata', 'version':'1'}, 'capabilities': {'experimentalApi': True}})
        process.stdin.write(json.dumps({'method':'initialized'})+'\n'); process.stdin.flush()
        config = request('config/read', {'cwd':str(root), 'includeLayers':True})
        # Retain only config-layer identity and task-related settings; no provider,
        # authentication, environment values, or arbitrary global settings.
        layers = []
        for layer in config.get('layers') or []:
            content = layer.get('config') or {}
            layers.append({'name':layer.get('name'), 'disabledReason':layer.get('disabledReason'), 'version':layer.get('version'),
                           'hooks_present': 'hooks' in content, 'features_hooks': content.get('features',{}).get('hooks'),
                           'this_project_trust':content.get('projects',{}).get(str(root),{}).get('trust_level')})
        hooks = request('hooks/list', {'cwds':[str(root)]})
        public_hooks = []
        for entry in hooks.get('data',[]):
            public_hooks.append({'cwd':entry.get('cwd'), 'errors':entry.get('errors'), 'warnings':entry.get('warnings'),
                'hooks':[{k:h.get(k) for k in ('source','sourcePath','eventName','enabled','trustStatus','currentHash','key')}
                         for h in entry.get('hooks',[])]})
        return {'root':str(root), 'argv':argv, 'layers':layers, 'hooks':public_hooks,
                'effective_features_hooks':config.get('config',{}).get('features',{}).get('hooks')}
    finally:
        process.terminate()
        try: process.wait(timeout=3)
        except subprocess.TimeoutExpired: process.kill(); process.wait()

result = {'kind':'read-only config-layer root-cause diagnostic', 'model_calls':0, 'hook_executions':0,
          'global_writes':0, 'methods':['initialize','config/read','hooks/list'],
          'hypothesis':'standalone no-daemon avoids shared daemon config reuse', 'records':[inspect(TEMP)]}
path = AUDIT/'u007-hook-layer-no-daemon.json'
path.write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
