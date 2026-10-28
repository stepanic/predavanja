#!/usr/bin/env python3
"""Gradi dist/ za javni deploy na projekti.domovina.ai.

Na internet idu samo public kartice, i to bez polja koja su pisana za
govornika (talk_hooks). Od repoa (urls.repos, tools/catalog/repos.py) ostaju
samo oni koje GitHub sad vidi kao javne, jer neke public kartice opisuju javnu
stranicu s privatnim kodom. Vidljivost se provjerava ponovno pri svakom buildu.
Uz slike idu i sličice (640 px) za grid, napravljene sa `sips`.
"""
import json, re, shutil, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DIST = ROOT / "dist"
DROP = {"talk_hooks"}


def repo_is_public(url):
    m = re.search(r"github\.com[:/]([^/]+/[^/\s]+?)(?:\.git)?/?$", url or "")
    if not m:
        return False
    r = subprocess.run(["gh", "repo", "view", m.group(1), "--json", "visibility", "--jq", ".visibility"],
                       capture_output=True, text=True)
    return r.stdout.strip() == "PUBLIC"


def main():
    catalog = json.loads((ROOT / "data/catalog.json").read_text())
    public = [c for c in catalog if c.get("visibility") == "public"]
    ids = {c["id"] for c in public}

    shutil.rmtree(DIST, ignore_errors=True)
    (DIST / "data/media").mkdir(parents=True)
    (DIST / "data/thumbs").mkdir()
    for f in ["index.html", "stage.html", "stage.js", "wa.js", "wa-qr.svg"]:
        if (ROOT / "app" / f).exists():  # wa-qr.svg nije u repou
            shutil.copy(ROOT / "app" / f, DIST / f)

    out, hidden_repos = [], []
    for c in public:
        c = {k: v for k, v in c.items() if k not in DROP}
        c["related"] = [r for r in c.get("related", []) if r in ids]
        c.get("stats", {}).pop("prompts_fixed", None)
        urls = dict(c.get("urls") or {})
        repos = urls.get("repos") or []
        urls["repos"] = [r for r in repos if repo_is_public(r["url"])]
        if len(urls["repos"]) < len(repos):
            hidden_repos.append(c["id"])
        c["urls"] = urls
        for m in c.get("media", []):
            src = ROOT / "data" / m["src"]
            if src.exists():
                shutil.copy(src, DIST / "data" / m["src"])
                if m.get("type") == "screenshot":
                    subprocess.run(["sips", "-Z", "640", "-s", "formatOptions", "70", str(src),
                                    "--out", str(DIST / "data/thumbs" / f"{c['id']}.jpg")],
                                   check=True, capture_output=True)
        out.append(c)

    (DIST / "data/catalog.json").write_text(json.dumps(out, ensure_ascii=False) + "\n")
    size = sum(p.stat().st_size for p in DIST.rglob("*") if p.is_file())
    print(f"dist: {len(out)} kartica, {size / 1e6:.1f} MB; repo link skriven za: {', '.join(hidden_repos) or '-'}")


if __name__ == "__main__":
    main()
