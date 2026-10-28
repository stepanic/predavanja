#!/usr/bin/env python3
"""Rangira public kartice po važnosti i upisuje `rank` u data/cards/<id>.json.

Ocjena = pola semantičke važnosti (data/importance.json, 1-5) i pola uloženog
rada iz data/metrics.json (tools/catalog/metrics.py). Rad se računa na
logaritamskoj skali, da jedan ogroman projekt ne spljošti sve ostale:
promptovi, sesije, dani s vlastitim commitovima, mjeseci rada i linije koda.
Izlaz je i data/ranking.json s pojedinačnim sastojcima ocjene.
"""
import json, math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
# (polje, težina, gornja granica): iznad granice nema dodatnih bodova.
EFFORT = [("user_prompts", 0.30, None), ("commit_days", 0.25, None), ("sessions", 0.15, None),
          ("months", 0.15, 12), ("loc", 0.15, 100_000)]
W_SEMANTIC = 0.5


def main():
    metrics = json.loads((ROOT / "data/metrics.json").read_text())
    importance = json.loads((ROOT / "data/importance.json").read_text())
    tops = {f: cap or max(m[f] for m in metrics) for f, _, cap in EFFORT}

    rows = []
    for m in metrics:
        effort = sum(w * math.log1p(min(m[f], tops[f])) / math.log1p(tops[f]) for f, w, _ in EFFORT)
        sem, why = importance[m["id"]]
        score = W_SEMANTIC * (sem - 1) / 4 + (1 - W_SEMANTIC) * effort
        rows.append({"id": m["id"], "title": m["title"], "score": round(score * 100, 1),
                     "semantic": sem, "semantic_reason": why, "effort": round(effort * 100, 1),
                     **{f: m[f] for f, _, _ in EFFORT}})
    rows.sort(key=lambda r: (-r["score"], r["id"]))
    for i, r in enumerate(rows, 1):
        r["rank"] = i
        p = ROOT / "data/cards" / f"{r['id']}.json"
        card = json.loads(p.read_text())
        if card.get("rank") != i:
            card["rank"] = i
            p.write_text(json.dumps(card, ensure_ascii=False, indent=2) + "\n")
    (ROOT / "data/ranking.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1) + "\n")
    for r in rows:
        print(f"{r['rank']:3} {r['score']:5} sem{r['semantic']} rad{r['effort']:5}  {r['title']}")


if __name__ == "__main__":
    main()
