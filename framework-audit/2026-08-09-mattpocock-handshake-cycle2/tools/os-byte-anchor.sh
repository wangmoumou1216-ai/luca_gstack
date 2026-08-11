#!/bin/sh
set -eu

if [ "$#" -ne 3 ]; then
  echo '{"status":"FAIL","exit":19,"reason":"usage: os-byte-anchor.sh <absolute-repo> <bundle-relative-path> <expected-bundle-sha256>"}' >&2
  exit 19
fi

exec /usr/bin/python3 -I -S - "$1" "$2" "$3" <<'PY'
import hashlib
import json
import os
import re
import stat
import sys

EXIT = 19
TOOLS = (
    "/bin/sh",
    "/usr/bin/python3",
    "/usr/bin/shasum",
    "/usr/bin/awk",
    "/bin/test",
    "/usr/bin/stat",
)
PREFIX = "framework-audit/2026-08-09-mattpocock-handshake-cycle2/"


def fail(reason, **details):
    print(json.dumps({"status": "FAIL", "exit": EXIT, "reason": reason, **details}, sort_keys=True), file=sys.stderr)
    raise SystemExit(EXIT)


def identity(st):
    return (
        st.st_dev,
        st.st_ino,
        st.st_mode,
        st.st_nlink,
        st.st_uid,
        st.st_gid,
        st.st_size,
        st.st_mtime_ns,
        st.st_ctime_ns,
    )


for tool in TOOLS:
    tool_st = os.lstat(tool)
    if not stat.S_ISREG(tool_st.st_mode) or tool_st.st_uid != 0 or tool_st.st_mode & (stat.S_IWGRP | stat.S_IWOTH):
        fail("OS anchor tool is not a root-owned non-group/world-writable regular file", tool=tool)

repo, bundle_rel, expected_bundle = sys.argv[1:]
if not os.path.isabs(repo) or os.path.realpath(repo) != repo:
    fail("repository path is not absolute physical identity", repo=repo)
if not re.fullmatch(r"[0-9a-f]{64}", expected_bundle):
    fail("expected bundle SHA-256 is malformed")

open_dir_flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW
root_fd = os.open("/", open_dir_flags)
repo_fd = root_fd
try:
    for segment in repo.split("/")[1:]:
        if not segment or segment in (".", ".."):
            fail("repository path contains an invalid segment", segment=segment)
        next_fd = os.open(segment, open_dir_flags, dir_fd=repo_fd)
        if repo_fd != root_fd:
            os.close(repo_fd)
        repo_fd = next_fd
    repo_st = os.fstat(repo_fd)
    if not stat.S_ISDIR(repo_st.st_mode):
        fail("repository identity is not a directory")

    held = []

    def open_source(relative_path, *, hold=True):
        if not relative_path.startswith(PREFIX) or relative_path.startswith("/"):
            fail("source path is outside the frozen audit prefix", path=relative_path)
        parts = relative_path.split("/")
        if any(not part or part in (".", "..") for part in parts):
            fail("source path has an invalid segment", path=relative_path)
        directory_fd = os.dup(repo_fd)
        try:
            for part in parts[:-1]:
                next_fd = os.open(part, open_dir_flags, dir_fd=directory_fd)
                os.close(directory_fd)
                directory_fd = next_fd
            file_fd = os.open(parts[-1], os.O_RDONLY | os.O_NOFOLLOW, dir_fd=directory_fd)
        finally:
            os.close(directory_fd)
        before = os.fstat(file_fd)
        if not stat.S_ISREG(before.st_mode) or before.st_nlink != 1:
            os.close(file_fd)
            fail("source is not an exclusive regular file", path=relative_path, nlink=before.st_nlink)
        chunks = []
        while True:
            chunk = os.read(file_fd, 1024 * 1024)
            if not chunk:
                break
            chunks.append(chunk)
        after = os.fstat(file_fd)
        if identity(before) != identity(after):
            os.close(file_fd)
            fail("source identity changed while reading", path=relative_path)
        if hold:
            held.append((relative_path, file_fd, identity(after)))
        else:
            os.close(file_fd)
        return b"".join(chunks), after

    bundle_bytes, bundle_st = open_source(bundle_rel)
    bundle_sha = hashlib.sha256(bundle_bytes).hexdigest()
    if bundle_sha != expected_bundle:
        fail("bundle bytes do not match Plan literal", expected=expected_bundle, observed=bundle_sha)

    try:
        lines = bundle_bytes.decode("utf-8").splitlines()
    except UnicodeDecodeError as error:
        fail("bundle is not UTF-8", error=str(error))
    if not lines or bundle_bytes.endswith(b"\n\n"):
        fail("bundle is empty or has an invalid terminal layout")

    entries = []
    seen_paths = set()
    seen_inodes = {(bundle_st.st_dev, bundle_st.st_ino)}
    for line in lines:
        match = re.fullmatch(r"([0-9a-f]{64})  (.+)", line)
        if not match:
            fail("bundle line is malformed", line=line)
        expected, relative_path = match.groups()
        if relative_path in seen_paths:
            fail("bundle path is duplicated", path=relative_path)
        seen_paths.add(relative_path)
        payload, payload_st = open_source(relative_path)
        inode = (payload_st.st_dev, payload_st.st_ino)
        if inode in seen_inodes:
            fail("bundle contains an inode alias", path=relative_path)
        seen_inodes.add(inode)
        observed = hashlib.sha256(payload).hexdigest()
        if observed != expected:
            fail("bundle member bytes drifted", path=relative_path, expected=expected, observed=observed)
        entries.append((relative_path, inode, observed))

    for relative_path, file_fd, frozen_identity in held:
        if identity(os.fstat(file_fd)) != frozen_identity:
            fail("held source identity drifted", path=relative_path)
        reopened, reopened_st = open_source(relative_path, hold=False)
        if (reopened_st.st_dev, reopened_st.st_ino) != (frozen_identity[0], frozen_identity[1]):
            fail("source pathname was swapped after verification", path=relative_path)
        if hashlib.sha256(reopened).hexdigest() != hashlib.sha256(os.pread(file_fd, frozen_identity[6], 0)).hexdigest():
            fail("source pathname bytes changed after verification", path=relative_path)

    print(json.dumps({
        "status": "PASS",
        "exit": 0,
        "bundle_sha256": bundle_sha,
        "members": len(entries),
        "repo_device": repo_st.st_dev,
        "repo_inode": repo_st.st_ino,
    }, sort_keys=True))
finally:
    for item in locals().get("held", []):
        try:
            os.close(item[1])
        except OSError:
            pass
    if repo_fd != root_fd:
        os.close(repo_fd)
    os.close(root_fd)
PY
