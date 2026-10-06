from pathlib import Path
import datetime, hashlib, json, os, subprocess, sys

audit = Path(__file__).resolve().parent
root = audit.parent.parent
label, cwd, *command = sys.argv[1:]
if not label or not command or '/' in label:
    raise SystemExit('label cwd command required')
started = datetime.datetime.now(datetime.timezone.utc).isoformat()
manifest_path = audit / 'release-source-manifest.json'
sources = json.loads(manifest_path.read_text())['files'] if manifest_path.exists() else {}
before = {p: hashlib.sha256((root / p).read_bytes()).hexdigest() for p in sources}
with (audit / (label + '.stdout')).open('w') as stdout, (audit / (label + '.stderr')).open('w') as stderr:
    process = subprocess.Popen(command, cwd=cwd, stdout=stdout, stderr=stderr)
    code = process.wait()
after = {p: hashlib.sha256((root / p).read_bytes()).hexdigest() for p in sources}
record = dict(label=label, command=command, cwd=cwd, driver_pid=os.getpid(), pid=process.pid,
              started=started, ended=datetime.datetime.now(datetime.timezone.utc).isoformat(),
              exit_code=code, source_hashes_before=before, source_hashes_after=after,
              sources_unchanged=before == after)
(audit / (label + '.json')).write_text(json.dumps(record, indent=2) + '\n')
print(json.dumps(dict(label=label, exit_code=code, sources_unchanged=before == after)))
raise SystemExit(code)
