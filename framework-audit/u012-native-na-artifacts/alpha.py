from pathlib import Path
import json, time
root = Path(__file__).resolve().parent
time.sleep(5)
src = json.loads((root / 'source.json').read_text())
with (root / 'alpha-effects.txt').open('a') as f:
    f.write('alpha-applied-once\n')
(root / 'alpha-result.json').write_text(json.dumps({'source_version':src['version'],'items':src['items'],'total':sum(x['value'] for x in src['items'])},indent=2)+'\n')
print('ALPHA_COMPLETED', flush=True)
