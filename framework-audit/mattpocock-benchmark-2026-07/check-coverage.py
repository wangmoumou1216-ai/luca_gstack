#!/usr/bin/env python3
"""Coverage / evidence / reconciliation / hash checker for the mattpocock benchmark.

The teeth: every cited quote is grep-verified against the actual file (whitespace-
normalized substring). A fabricated or drifted quote FAILS — this is what enforces
"每个结论双侧证据" mechanically, not on trust.

Run from repo root: python3 framework-audit/mattpocock-benchmark-2026-07/check-coverage.py --assert all
"""
import sys, os, re, argparse, glob

try:
    import yaml
except ImportError:
    print("need pyyaml", file=sys.stderr); sys.exit(2)

BM = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(BM, "..", ".."))
INV = yaml.safe_load(open(os.path.join(BM, "inventory.yaml")))
MAT = yaml.safe_load(open(os.path.join(BM, "mapping-matrix.yaml")))
CLONE = INV["clone_root"]

APPROVE_BUCKETS = {"merge", "replace", "adopt"}
ALL_BUCKETS = {"leave", "merge", "replace", "adopt"}

def norm(s):
    return re.sub(r"\s+", " ", str(s)).strip().lower()

_filecache = {}
def filetext(path, side):
    root = CLONE if side == "opponent" else REPO
    ap = path if os.path.isabs(path) else os.path.join(root, path)
    if ap not in _filecache:
        try:
            _filecache[ap] = open(ap, encoding="utf-8", errors="replace").read()
        except Exception:
            _filecache[ap] = None
    return _filecache[ap]

def quote_ok(ev, side):
    """ev = {path, quote, ...}. Verify quote (normalized) is substring of file (normalized)."""
    path, quote = ev.get("path"), ev.get("quote")
    if not path or not quote:
        return False, f"missing path/quote in {ev}"
    txt = filetext(path, side)
    if txt is None:
        return False, f"file not found: {path} (side={side})"
    if norm(quote) in norm(txt):
        return True, ""
    return False, f"quote not found in {path}: '{quote[:60]}...'"

def load_verdicts():
    out = {}
    for f in glob.glob(os.path.join(BM, "verdicts", "*.yaml")):
        v = yaml.safe_load(open(f))
        if v and "id" in v:
            out[v["id"]] = (v, f)
    return out

def load_dossiers():
    out = {}
    for f in glob.glob(os.path.join(BM, "dossiers", "*.yaml")):
        d = yaml.safe_load(open(f))
        if d and "id" in d:
            out[d["id"]] = (d, f)
    return out

def inv_by_id():
    return {u["id"]: u for u in INV["units"]}

def opp_hash(unit):
    return unit.get("sha256") if unit["kind"] == "skill" else None

# ---------------- assertions ----------------

def a_ids(errs):
    inv_ids = set(u["id"] for u in INV["units"])
    mat_ids = set(r["id"] for r in MAT["rows"])
    if inv_ids != mat_ids:
        errs.append(f"[ids] matrix!=inventory  missing={inv_ids-mat_ids} extra={mat_ids-inv_ids}")

def a_verdict_completeness(errs):
    """Every inventory unit must have a verdict file (adjudicated)."""
    vs = load_verdicts()
    for u in INV["units"]:
        if u["id"] not in vs:
            errs.append(f"[complete] no verdict for {u['id']}")
            continue
        v = vs[u["id"]][0]
        if v.get("bucket") not in ALL_BUCKETS:
            errs.append(f"[complete] {u['id']} bad bucket={v.get('bucket')}")

def check_dossier_obj(uid, d, errs):
    """Verify one dossier's mechanisms: double-sided grep-verified evidence."""
    mechs = d.get("mechanisms") or []
    if not mechs:
        errs.append(f"[evidence] {uid} dossier has no mechanisms")
        return
    for m in mechs:
        mname = m.get("name", "?")
        oev = m.get("opponent_evidence") or []
        if not oev:
            errs.append(f"[evidence] {uid}/{mname}: no opponent_evidence")
        for ev in oev:
            ok, why = quote_ok(ev, "opponent")
            if not ok:
                errs.append(f"[evidence] {uid}/{mname} opponent: {why}")
        # our side: either our_evidence quotes OR absence_proof
        our = m.get("our_evidence")
        absence = m.get("absence_proof")
        if our:
            for ev in our:
                ok, why = quote_ok(ev, "ours")
                if not ok:
                    errs.append(f"[evidence] {uid}/{mname} ours: {why}")
        elif absence:
            if absence.get("hits", -1) != 0:
                errs.append(f"[evidence] {uid}/{mname} absence_proof hits!=0")
        else:
            errs.append(f"[evidence] {uid}/{mname}: neither our_evidence nor absence_proof")


def a_evidence(errs):
    """Dossiers REQUIRED for Tier-A/B; quotes verified for EVERY dossier present."""
    dos = load_dossiers()
    mat = {r["id"]: r for r in MAT["rows"]}
    for uid, r in mat.items():
        if r["tier"] in ("A", "B") and uid not in dos:
            errs.append(f"[evidence] missing dossier for {r['tier']} unit {uid}")
    for uid, (d, f) in dos.items():
        check_dossier_obj(uid, d, errs)

def a_absence(errs):
    """counterpart=none rows must carry an absence_proof somewhere in their dossier."""
    dos = load_dossiers()
    for r in MAT["rows"]:
        if r["tier"] not in ("A", "B"):
            continue
        cp = r.get("our_counterpart")
        if cp not in (None, "none", [], "None"):
            continue
        d = dos.get(r["id"], (None,))[0]
        if not d:
            continue  # caught by a_evidence
        has_absence = any(m.get("absence_proof") for m in (d.get("mechanisms") or []))
        if not has_absence:
            errs.append(f"[absence] {r['id']} counterpart=none but no absence_proof in dossier")

def a_redteam(errs):
    vs = load_verdicts()
    for uid, (v, f) in vs.items():
        b = v.get("bucket")
        if b in APPROVE_BUCKETS:
            rt = v.get("redteam") or {}
            if rt.get("verdict") not in ("stands", "downgraded", "killed"):
                errs.append(f"[redteam] {uid} bucket={b} but no redteam verdict")
        if b == "replace":
            if not v.get("dominance_table"):
                errs.append(f"[redteam] {uid} replace without dominance_table")
            iub = v.get("incumbent_unique_behaviors") or []
            for beh in iub:
                if beh.get("disposition") not in ("ported", "written-off"):
                    errs.append(f"[redteam] {uid} incumbent behavior without disposition: {beh}")
            if (v.get("redteam") or {}).get("verdict") != "stands":
                errs.append(f"[redteam] {uid} replace but redteam!=stands")

def a_killed_integrity(errs):
    """Any verdict whose text claims a redteam kill must carry an actual redteam block
    with verdict=killed (catches the git-guardrails blind spot: leave-bucket kills
    escaped a_redteam which only checks APPROVE buckets)."""
    # 只匹配"本单元被击杀"的声明形态（"红队 killed（原 merge"式），排除判据引用
    # （"需 D<3 或红队 killed"）与否定式（"非击杀/不击杀"）
    kill_claim = re.compile(r"红队\s*(killed|击杀)\s*（原")
    for uid, (v, f) in load_verdicts().items():
        blob = open(f, encoding="utf-8", errors="replace").read()
        if kill_claim.search(blob):
            rt = v.get("redteam") or {}
            if rt.get("verdict") != "killed":
                errs.append(f"[killed] {uid}: text claims kill but redteam block missing/mismatched")


def a_reconciliation(errs):
    recon_ids = set(MAT["meta"]["reconciliation_units"])
    vs = load_verdicts()
    for uid in recon_ids:
        v = vs.get(uid, (None,))[0]
        if not v:
            errs.append(f"[reconciliation] no verdict for reconciliation unit {uid}")
            continue
        if not str(v.get("reconciliation") or "").strip():
            errs.append(f"[reconciliation] {uid} missing reconciliation text")

def a_hash(errs):
    """verdict/dossier recorded opponent hash == inventory hash (anti-drift)."""
    byid = inv_by_id()
    for loader in (load_verdicts, load_dossiers):
        for uid, (obj, f) in loader().items():
            u = byid.get(uid)
            if not u or u["kind"] != "skill":
                continue
            rec = obj.get("opponent_sha256")
            if rec and rec != opp_hash(u):
                errs.append(f"[hash] {uid} in {os.path.basename(f)}: {rec[:12]}!=inv {opp_hash(u)[:12]}")

ASSERTS = {
    "ids": a_ids, "complete": a_verdict_completeness, "evidence": a_evidence,
    "absence": a_absence, "redteam": a_redteam, "reconciliation": a_reconciliation, "killed": a_killed_integrity,
    "hash": a_hash,
}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--assert", dest="which", default="all")
    ap.add_argument("--dossier", help="verify a single dossier file (self-check for P2 agents)")
    a = ap.parse_args()
    if a.dossier:
        d = yaml.safe_load(open(a.dossier))
        errs = []
        if not d or "id" not in d:
            errs.append(f"[dossier] {a.dossier}: missing id")
        else:
            check_dossier_obj(d["id"], d, errs)
            u = inv_by_id().get(d["id"])
            if u and u["kind"] == "skill":
                if d.get("opponent_sha256") != opp_hash(u):
                    errs.append(f"[dossier] {d['id']}: opponent_sha256 missing or != inventory")
        if errs:
            print(f"FAIL ({len(errs)} issues):")
            for e in errs[:50]:
                print("  " + e)
            sys.exit(1)
        print(f"PASS [dossier {os.path.basename(a.dossier)}]")
        sys.exit(0)
    which = list(ASSERTS) if a.which == "all" else a.which.split(",")
    errs = []
    for name in which:
        fn = ASSERTS.get(name)
        if not fn:
            print(f"unknown assert: {name}", file=sys.stderr); sys.exit(2)
        fn(errs)
    if errs:
        print(f"FAIL ({len(errs)} issues):")
        for e in errs[:100]:
            print("  " + e)
        sys.exit(1)
    print(f"PASS [{','.join(which)}]")
    sys.exit(0)

if __name__ == "__main__":
    main()
