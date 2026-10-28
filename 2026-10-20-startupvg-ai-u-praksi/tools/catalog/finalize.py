#!/usr/bin/env python3
"""Čisti kartice i gradi katalog za redatelja.

1. Duplikati: sporedna kartica dobiva `duplicate_of`, a njezini aliasi prelaze
   na glavnu, da ruter i dalje prepozna stara imena.
2. Statistika: automatizirana pokretanja ne broje se kao korisnički promptovi.
3. Provjera: obavezna polja, aliasi malim slovima, poznate vidljivosti.
4. Izlaz: data/catalog.json, samo kartice koje nisu private ni duplikati,
   sortirane po `rank` (tools/catalog/rank.py), a ostale po showcase_score.
"""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CARDS = ROOT / "data/cards"

DUPLICATES = {
    "domovina-draft-karta-rh": "domovinatv-karta-hrvatske",
    "domovinatv-map-domovina-ai": "domovinatv-karta-hrvatske",
    "repo-spremni-ultra-za-stablecoin-spremni-hr": "repo-spremni-za-stablecoin-spremni-hr",
}
REQUIRED = ["id", "title", "visibility", "stats", "sources"]
PUBLIC_REQUIRED = ["one_liner", "description", "aliases", "facts", "showcase_score"]
DIRECTOR_FIELDS = ["id", "title", "one_liner", "description", "category", "context", "visibility",
                   "status", "tags", "aliases", "facts", "talk_hooks", "urls", "stats",
                   "showcase_score", "rank", "related", "media", "embed"]

def load(p):
    return json.loads(p.read_text())

def save(p, c):
    p.write_text(json.dumps(c, ensure_ascii=False, indent=2) + "\n")

def main():
    cards = {p.stem: (p, load(p)) for p in sorted(CARDS.glob("*.json"))}
    problems = []

    for dup, main_id in DUPLICATES.items():
        if dup not in cards or main_id not in cards:
            problems.append(f"duplikat {dup} → {main_id}: kartica ne postoji")
            continue
        dp, d = cards[dup]
        mp, m = cards[main_id]
        d["duplicate_of"] = main_id
        extra = [a for a in d.get("aliases", []) + [d["title"].lower()] if a not in m.get("aliases", [])]
        m["aliases"] = m.get("aliases", []) + extra
        m["related"] = [r for r in m.get("related", []) if r != dup]
        save(dp, d)
        save(mp, m)

    for cid, (p, c) in cards.items():
        s = c.get("stats") or {}
        auto = s.get("automated_runs") or 0
        if auto and s.get("user_prompts", 0) >= auto and not s.get("prompts_fixed"):
            s["user_prompts"] -= auto
            s["prompts_fixed"] = True
            c["stats"] = s
            save(p, c)
        missing = [f for f in REQUIRED if f not in c]
        if c.get("visibility") not in ("public", "review", "private"):
            missing.append("visibility?")
        if c.get("visibility") != "private":
            missing += [f for f in PUBLIC_REQUIRED if not c.get(f)]
            if any(a != a.lower() for a in c.get("aliases", [])):
                c["aliases"] = [a.lower() for a in c["aliases"]]
                save(p, c)
        if missing:
            problems.append(f"{cid}: nedostaje {missing}")

    catalog = []
    for cid, (p, c) in cards.items():
        if c.get("visibility") == "private" or c.get("duplicate_of"):
            continue
        catalog.append({k: c[k] for k in DIRECTOR_FIELDS if k in c})
    catalog.sort(key=lambda c: (c.get("rank") or 999, -(c.get("showcase_score") or 0), c["id"]))
    (ROOT / "data/catalog.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=1) + "\n")

    vis = {}
    for _, c in cards.values():
        key = "duplicate" if c.get("duplicate_of") else c.get("visibility")
        vis[key] = vis.get(key, 0) + 1
    print(f"kartica: {len(cards)} | {vis} | u katalogu: {len(catalog)}")
    for pr in problems:
        print("  !", pr)
    return 1 if problems else 0

if __name__ == "__main__":
    sys.exit(main())
