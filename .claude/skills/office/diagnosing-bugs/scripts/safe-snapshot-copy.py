#!/usr/bin/env python3
"""CAS-bound diagnostic snapshot copy into an existing OS-temp scratch root."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import stat
import tempfile


def die(message: str) -> "NoReturn":
    raise SystemExit(f"safe-snapshot-copy: {message}")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True)
    parser.add_argument("--dest-root", required=True)
    parser.add_argument("--name", required=True)
    parser.add_argument("--expected-sha256", required=True)
    parser.add_argument("--allow-write-to-scratch", action="store_true")
    return parser.parse_args()


args = parse_args()
if not args.allow_write_to_scratch:
    die("refusing write without --allow-write-to-scratch and pre-existing caller authority")
if len(args.expected_sha256) != 64 or any(c not in "0123456789abcdef" for c in args.expected_sha256):
    die("--expected-sha256 must be 64 lowercase hex characters")
if not args.name or args.name in {".", ".."} or Path(args.name).name != args.name:
    die("--name must be one basename without separators")

source = Path(args.source)
root = Path(args.dest_root)
if not source.is_absolute() or not root.is_absolute():
    die("source and dest-root must be absolute")
try:
    source_lstat = source.lstat()
    root_lstat = root.lstat()
except OSError as error:
    die(str(error))
if stat.S_ISLNK(source_lstat.st_mode) or not stat.S_ISREG(source_lstat.st_mode):
    die("source must be a non-symlink regular file")
if stat.S_ISLNK(root_lstat.st_mode) or not stat.S_ISDIR(root_lstat.st_mode):
    die("dest-root must be a non-symlink directory")

source_real = source.resolve(strict=True)
root_real = root.resolve(strict=True)
temp_roots = {Path(tempfile.gettempdir()).resolve(strict=True)}
private_tmp = Path("/private/tmp")
if private_tmp.is_dir():
    temp_roots.add(private_tmp.resolve(strict=True))
matching_roots = [candidate for candidate in temp_roots if root_real != candidate and candidate in root_real.parents]
if not matching_roots:
    die(f"dest-root must be a task-specific child of an allowed OS temp root: {sorted(map(str, temp_roots))}")
if root_real in temp_roots:
    die("dest-root must be a task-specific child of OS temp root")
if source_real == root_real or root_real in source_real.parents:
    die("source must not be the destination root or one of its descendants")

before_sha = sha256_file(source_real)
if before_sha != args.expected_sha256:
    die(f"source preimage mismatch: expected {args.expected_sha256}, got {before_sha}")

destination = root_real / args.name
if destination.exists() or destination.is_symlink():
    die("destination already exists; refusing overwrite")

temporary = root_real / f".{args.name}.tmp-{os.getpid()}"
fd = None
try:
    fd = os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    with source_real.open("rb") as reader, os.fdopen(fd, "wb", closefd=True) as writer:
        fd = None
        for block in iter(lambda: reader.read(1024 * 1024), b""):
            writer.write(block)
        writer.flush()
        os.fsync(writer.fileno())
    if sha256_file(temporary) != before_sha:
        die("temporary copy hash mismatch")
    os.link(temporary, destination, follow_symlinks=False)
    os.unlink(temporary)
    directory_fd = os.open(root_real, os.O_RDONLY)
    try:
        os.fsync(directory_fd)
    finally:
        os.close(directory_fd)
finally:
    if fd is not None:
        os.close(fd)
    if temporary.exists():
        temporary.unlink()

after_source_sha = sha256_file(source_real)
destination_sha = sha256_file(destination)
if after_source_sha != before_sha or destination_sha != before_sha:
    die("source drifted or destination verification failed")

print(json.dumps({
    "source_realpath": str(source_real),
    "source_sha256": before_sha,
    "destination": str(destination),
    "destination_mode": "100600",
    "destination_sha256": destination_sha,
}, sort_keys=True, separators=(",", ":")))
