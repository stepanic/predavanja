#!/usr/bin/env python3
"""Putanja 9:16 izreza predavača iz detekcija osoba (detect_people.swift) → app/crop/<kamera>.json.

Po frameu bira osobu najbližu prethodnom položaju (prvi put: govornici), pa slaže
„virtualnog snimatelja”: medijan protiv skokova, mrtva zona da izrez stoji dok se
predavač njiše za govornicom, i ograničena brzina kad ode u stranu.
Izlaz je u pikselima 4K originala, po vremenu izvora (ne crte):
  {"step", "srcW", "srcH", "w", "h", "t": [...], "x": [...], "y": [...], "blur": [x, y, w, h], "missing": udio}
"""
import json
import statistics
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
SRC_W, SRC_H = 3840, 2160
CROP_W, CROP_H = 720, 1280          # 9:16; predavač visok ~800–950 px u 4K
# Polazna točka (govornica) i WiFi papir na govornici, u 4K pikselima. Papir se kroz
# snimku pomakne do ~100 px jer su se kamere malo pomaknule, pa je pravokutnik širi.
CAM = {
    "lumix": {"start": 0.72, "blur": [2720, 1420, 310, 250]},
    "moto": {"start": 0.79, "blur": [3290, 1270, 370, 260]},
}
DEADZONE = 0.16 * CROP_W            # koliko se smije odmaknuti od sredine izreza prije nego krene
VMAX = 260.0                         # px/s najveća brzina izreza
MEDIAN_S = 4.0


def pick(boxes, prev_cx):
    best, bd = None, 1e9
    for x, y, w, h, conf in boxes:
        if h < 0.22 or conf < 0.3:   # glave publike u prvom planu i šum
            continue
        cx = x + w / 2
        d = abs(cx - prev_cx)
        if d < bd:
            best, bd = (cx, y, h), d
    return best if best and bd < 0.25 else None


def main(cam):
    d = json.loads((HERE / f"crop/{cam}_people.json").read_text())
    step = d["step"]
    cfg = CAM[cam]
    raw_cx, raw_top, miss, prev = [], [], 0, cfg["start"]
    for t, boxes in d["frames"]:
        p = pick(boxes, prev)
        if p is None:
            miss += 1
            raw_cx.append(None); raw_top.append(None)
            continue
        prev = p[0]
        raw_cx.append(p[0] * SRC_W); raw_top.append(p[1] * SRC_H)
    # rupe: zadnja poznata vrijednost (na početku prva poznata)
    first = next(v for v in raw_cx if v is not None)
    first_top = next(v for v in raw_top if v is not None)
    cx, top, lc, lt = [], [], first, first_top
    for c, tp in zip(raw_cx, raw_top):
        lc = c if c is not None else lc
        lt = tp if tp is not None else lt
        cx.append(lc); top.append(lt)
    k = max(1, int(MEDIAN_S / step / 2))
    med = [statistics.median(cx[max(0, i - k):i + k + 1]) for i in range(len(cx))]
    kt = k * 3
    med_top = [statistics.median(top[max(0, i - kt):i + kt + 1]) for i in range(len(top))]

    pos, xs, ys, vmax = med[0], [], [], VMAX * step
    for m, tp in zip(med, med_top):
        off = m - pos
        if abs(off) > DEADZONE:
            pos += max(-vmax, min(vmax, (abs(off) - DEADZONE) * (1 if off > 0 else -1) * 0.5))
        x = min(SRC_W - CROP_W, max(0, pos - CROP_W / 2))
        y = min(SRC_H - CROP_H, max(0, tp - 0.12 * CROP_H))     # glava ~12 % ispod vrha
        xs.append(round(x)); ys.append(round(y))
    out = {"step": step, "srcW": SRC_W, "srcH": SRC_H, "w": CROP_W, "h": CROP_H,
           "t": [f[0] for f in d["frames"]], "x": xs, "y": ys, "blur": cfg["blur"],
           "missing": round(miss / len(d["frames"]), 3)}
    (HERE / f"app/crop/{cam}.json").write_text(json.dumps(out, separators=(",", ":")))
    print(cam, len(xs), "točaka, bez detekcije", f"{out['missing']:.1%}",
          "x", min(xs), "–", max(xs), "y", min(ys), "–", max(ys))


if __name__ == "__main__":
    for c in sys.argv[1:] or ["lumix", "moto"]:
        main(c)
