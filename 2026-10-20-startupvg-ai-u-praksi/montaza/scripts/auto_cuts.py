#!/usr/bin/env python3
"""Pametno prebacivanje slike → edit.cuts u manifest.json (zvuk ostaje kakav je bio).

Osnova je pip-moto (screenshare + predavač 9:16). Od nje se odstupa samo s razlogom:
  pitanje   — govori netko iz publike (pyannote, app/transkript.json) → kamera preko cijelog kadra
  ekran     — mijenja se kut ekrana ispod izreza (sync/screen_activity.json) → samo screenshare
  kod ekrana— predavač je otišao od govornice prema ekranu (app/crop/moto.json) → široki kadar
  dinamika  — ekran dugo miruje dok predavač priča → kratki kadar kamere, naizmjence LUMIX/moto
Granice rezova padaju u pauze između riječi (Soniox), osim kod „ekran”, gdje vodi sadržaj.
Točke prije prve pip-moto točke (Domagojev uvod) i od kraja screensharea dalje ostaju netaknute.
Prethodne točke se ne gube: git ih pamti.

  python3 montaza/scripts/auto_cuts.py [--dry]
"""
import json
import statistics
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
MAIN = "Matija Stepanić"
DT = 0.5

m = json.loads((HERE / "manifest.json").read_text())
T = {t["id"]: t for t in m["tracks"]}
off = lambda tr: tr["offsetSeconds"] + tr.get("nudgeSeconds", 0)
end = lambda tr: off(tr) + tr["scale"] * tr["durationSeconds"]
to_tl = lambda tr, t: off(tr) + tr["scale"] * t

old = m["edit"]["cuts"]
A = next(c["t"] for c in old if c["video"].startswith("pip-"))       # početak izlaganja
B = round(end(T["screen"]), 3)                                        # kraj screensharea
N = int((B - A) / DT)
grid = [A + i * DT for i in range(N)]
audio_at = lambda t: next((c["audio"] for c in reversed(old) if c["t"] <= t), old[0]["audio"])


def sample(times, values, t):
    """Vrijednost signala (vremena već na crti) najbliža trenutku t."""
    lo, hi = 0, len(times) - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if times[mid] < t: lo = mid + 1
        else: hi = mid
    return values[lo]


# --- signali na mreži od 0,5 s ---
tr = json.loads((HERE / "app/transkript.json").read_text())["segments"]
other = [False] * N
for s in tr:
    if s["text"] and s["name"] != MAIN and s["end"] - s["start"] >= 1.5:
        for i in range(max(0, int((s["start"] - A) / DT)), min(N, int((s["end"] - A) / DT) + 1)):
            other[i] = True

act = json.loads((HERE / "sync/screen_activity.json").read_text())
at = [to_tl(T["screen"], t) for t in act["t"]]
corner = [sample(at, act["corner"], t) > 2.0 for t in grid]
still = [sample(at, act["full"], t) < 0.3 for t in grid]

crop = json.loads((HERE / "app/crop/moto.json").read_text())
ct = [to_tl(T["moto"], t) for t in crop["t"]]
cx = [x + crop["w"] / 2 for x in crop["x"]]
talk_cx = [c for t, c in zip(ct, cx) if A <= t <= B]
lectern = statistics.median(talk_cx)
away = [sample(ct, cx, t) < lectern - 450 for t in grid]


def runs(flags, min_len, merge_gap):
    """Uzastopni True dijelovi (indeksi), spojeni preko kratkih rupa, bez prekratkih."""
    out, i = [], 0
    while i < N:
        if flags[i]:
            j = i
            while j < N and flags[j]: j += 1
            if out and i - out[-1][1] <= merge_gap / DT: out[-1][1] = j
            else: out.append([i, j])
            i = j
        else:
            i += 1
    return [r for r in out if (r[1] - r[0]) * DT >= min_len]


label = ["pip"] * N
why = [""] * N
def paint(rs, lab, reason, pad_before=0.0, pad_after=0.0, over=()):
    for i, j in rs:
        for k in range(max(0, i - int(pad_before / DT)), min(N, j + int(pad_after / DT))):
            if label[k] == "pip" or label[k] in over:
                label[k], why[k] = lab, reason

# redoslijed = prioritet (kasniji ne prepisuju ranije, osim navedenih u over)
paint(runs(other, 2.5, 3.0), "cam", "pitanje iz publike", 0.3, 1.0)
paint(runs(corner, 3.0, 10.0), "screen", "promjena u kutu ekrana, izrez bi je prekrio", 1.0, 2.0)
paint(runs(away, 4.0, 4.0), "wide", "predavač je otišao do ekrana", 0.5, 1.0)

# dinamika: u dugim mirnim dijelovima (≥ 45 s) kadar kamere od 9 s, svakih ~60 s
for i, j in runs([still[k] and label[k] == "pip" and not other[k] for k in range(N)], 45.0, 0.0):
    k = i + int(18 / DT)
    while k + int(9 / DT) < j - int(12 / DT):
        for q in range(k, k + int(9 / DT)):
            label[q], why[q] = "var", "ekran miruje, kadar kamere radi dinamike"
        k += int(60 / DT)

# kratki pip između dva odstupanja (< 8 s) samo bi trepnuo: produlji prethodni kadar
i = 0
while i < N:
    j = i
    while j < N and label[j] == label[i]: j += 1
    if label[i] == "pip" and 0 < i and j < N and (j - i) * DT < 8.0:
        for q in range(i, j): label[q], why[q] = label[i - 1], why[i - 1]
    i = j

# --- pauze između riječi za granice ---
w = json.loads((HERE / "transkript/izvori/soniox/rode.mp3.soniox.words.json").read_text())
w = w if isinstance(w, list) else w["words"]
w = [x for x in w if x["w"].strip() not in ",.?!…:;"]
gaps = [((a["end"] + b["start"]) / 2, b["start"] - a["end"]) for a, b in zip(w, w[1:]) if b["start"] - a["end"] >= 0.25]
gap_t = [g[0] for g in gaps]
def snap(t, reach=1.5):
    best = min((g for g in gap_t[max(0, _bis(t) - 3):_bis(t) + 3]), key=lambda g: abs(g - t), default=None)
    return best if best is not None and abs(best - t) <= reach else t
def _bis(t):
    lo, hi = 0, len(gap_t)
    while lo < hi:
        mid = (lo + hi) // 2
        if gap_t[mid] < t: lo = mid + 1
        else: hi = mid
    return lo

# --- kadrovi → točke ---
alt = ["lumix", "moto"]
var_n = 0
new = []
i = 0
while i < N:
    j = i
    while j < N and label[j] == label[i]: j += 1
    t0, t1, lab = grid[i], grid[min(j, N - 1)], label[i]
    lumix_ok = off(T["lumix"]) <= t0 and t1 <= end(T["lumix"]) - 0.1
    if lab == "pip": video = "pip-moto"
    elif lab == "screen": video = "screen"
    elif lab == "var":
        video = alt[var_n % 2] if lumix_ok else "moto"; var_n += 1
    else: video = "lumix" if lumix_ok else "moto"
    t = t0 if i == 0 else (round(t0 - 0.5, 3) if lab == "screen" else round(snap(t0), 3))
    new.append({"t": t, "video": video, "audio": audio_at(t), "why": why[i] or "osnovni kadar"})
    i = j
# prvi rez je zatečena pip-moto točka; ponovi isti izvor = nije rez
dedup = []
for c in new:
    if dedup and dedup[-1]["video"] == c["video"]: continue
    dedup.append(c)

kept = [c for c in old if c["t"] < A or c["t"] >= B - 1e-3]
cuts = sorted(kept + dedup, key=lambda c: c["t"])
dur = {}
for k, c in enumerate(cuts):
    t1 = cuts[k + 1]["t"] if k + 1 < len(cuts) else m["edit"]["outSeconds"]
    if m["edit"]["inSeconds"] <= c["t"] < m["edit"]["outSeconds"]:
        dur[c["video"]] = dur.get(c["video"], 0) + t1 - c["t"]
total = sum(dur.values())
print(f"{len(cuts)} točaka ({len(dedup)} automatskih), govornica na x={lectern:.0f}")
for v, s in sorted(dur.items(), key=lambda x: -x[1]):
    print(f"  {v:10} {s / 60:6.1f} min  {s / total:5.1%}")
reasons = {}
for c in dedup: reasons[c["why"]] = reasons.get(c["why"], 0) + 1
for r, n in reasons.items(): print(f"  {n:4}× {r}")

if "--dry" not in sys.argv:
    m["edit"]["cuts"] = cuts
    m["rev"] = m.get("rev", 0) + 1
    (HERE / "manifest.json").write_text(json.dumps(m, indent=2, ensure_ascii=False) + "\n")
    print("upisano u manifest.json, rev", m["rev"])
