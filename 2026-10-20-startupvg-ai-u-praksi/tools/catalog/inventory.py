#!/usr/bin/env python3
"""Inventura Claude Code sessiona iz ~/.claude/projects.

Za svaki projektni direktorij skuplja: stvarni cwd, broj sessiona, raspon
datuma, broj korisničkih promptova, prve promptove, spomenute deploy URL-ove,
git remote i postoji li repo lokalno. Izlaz: data/inventory.json.
"""
import json, re, subprocess, sys
from collections import Counter
from pathlib import Path

PROJECTS = Path.home() / ".claude/projects"
OUT = Path(__file__).resolve().parents[2] / "data/inventory.json"

URL_RE = re.compile(r"https?://([a-z0-9][a-z0-9.-]+\.[a-z]{2,})(/[^\s\"'`)<>\]\\]*)?", re.I)
DEPLOY_HINT = re.compile(r"(pages\.dev|workers\.dev|vercel\.app|netlify\.app|web\.app|firebaseapp\.com|fly\.dev|onrender\.com|\.hr$|\.ai$|\.tv$|\.io$|\.app$|\.com$|\.dev$)")
NOISE = re.compile(r"(github\.com|githubusercontent|anthropic\.com|claude\.(ai|com)|npmjs|google\.com|googleapis|gstatic|cloudflare\.com|stackoverflow|mozilla|w3\.org|schema\.org|example\.(com|org)|localhost|apple\.com|microsoft\.com|pypi\.org|python\.org|nodejs\.org|jsdelivr|unpkg|cdnjs|fonts\.|youtube\.com|youtu\.be|wikipedia|docs\.|shields\.io|sentry\.io|x\.com|twitter\.com|linkedin\.com|facebook\.com|instagram\.com|medium\.com|arxiv\.org|huggingface\.co|openai\.com|stripe\.com|vercel\.com|netlify\.com|flutter\.dev|dart\.dev|pub\.dev|firebase\.google|developer\.|dl\.acm\.org|semanticscholar|react\.dev|tailwindcss|vitejs|wasp\.sh|figma\.com|atlassian|slack\.com|notion\.so)", re.I)

def text_of(msg):
    c = msg.get("content")
    if isinstance(c, str):
        return c
    if isinstance(c, list):
        return " ".join(p.get("text", "") for p in c if isinstance(p, dict) and p.get("type") == "text")
    return ""

def is_real_prompt(t):
    t = t.strip()
    return t and not t.startswith(("<", "[Request interrupted", "Caveat:")) and "tool_use_id" not in t

def scan(pdir):
    cwds, urls, prompts = Counter(), Counter(), []
    first = last = None
    sessions = [f for f in pdir.glob("*.jsonl")]
    n_prompts = 0
    for f in sessions:
        try:
            fh = f.open(errors="ignore")
        except OSError:
            continue
        with fh:
            for line in fh:
                if '"cwd"' not in line and '"text"' not in line and '"content"' not in line:
                    continue
                try:
                    d = json.loads(line)
                except json.JSONDecodeError:
                    continue
                ts = d.get("timestamp")
                if ts:
                    first = min(first, ts) if first else ts
                    last = max(last, ts) if last else ts
                if d.get("cwd"):
                    cwds[d["cwd"]] += 1
                typ = d.get("type")
                msg = d.get("message") or {}
                if typ in ("user", "assistant"):
                    t = text_of(msg)
                    if typ == "user" and not d.get("isSidechain") and is_real_prompt(t):
                        n_prompts += 1
                        if len(prompts) < 6:
                            prompts.append((ts or "", t.strip()[:400]))
                    for m in URL_RE.finditer(t):
                        host = m.group(1).lower().rstrip(".")
                        if NOISE.search(host) or not DEPLOY_HINT.search(host):
                            continue
                        urls[host] += 1
    cwd = cwds.most_common(1)[0][0] if cwds else None
    repo = Path(cwd) if cwd else None
    remote = None
    if repo and (repo / ".git").exists():
        r = subprocess.run(["git", "-C", str(repo), "remote", "get-url", "origin"], capture_output=True, text=True)
        remote = r.stdout.strip() or None
    return {
        "dir": pdir.name,
        "cwd": cwd,
        "repo_exists": bool(repo and repo.exists()),
        "git_remote": remote,
        "sessions": len(sessions),
        "user_prompts": n_prompts,
        "first": first,
        "last": last,
        "size_mb": round(sum(f.stat().st_size for f in pdir.rglob("*.jsonl")) / 1e6, 1),
        "first_prompts": [p for _, p in sorted(prompts)[:4]],
        "urls": [h for h, _ in urls.most_common(12)],
    }

def main():
    dirs = sorted(p for p in PROJECTS.iterdir() if p.is_dir())
    rows = []
    for i, p in enumerate(dirs, 1):
        rows.append(scan(p))
        print(f"{i}/{len(dirs)} {p.name}", file=sys.stderr)
    OUT.write_text(json.dumps(rows, ensure_ascii=False, indent=1))
    print(f"zapisano {OUT} ({len(rows)} projekata)", file=sys.stderr)

if __name__ == "__main__":
    main()
