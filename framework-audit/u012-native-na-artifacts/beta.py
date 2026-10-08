from pathlib import Path
import time, sys
root = Path(__file__).resolve().parent
time.sleep(5)
with (root / 'beta-attempts.txt').open('a') as f:
    f.write('beta-attempt\n')
print('BETA_SOURCE_NOT_ACCEPTED', file=sys.stderr, flush=True)
sys.exit(23)
