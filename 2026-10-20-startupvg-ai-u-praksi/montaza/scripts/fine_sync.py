#!/usr/bin/env python3
"""Fini prolaz poravnanja s dugim prozorima, kad sync_cameras.py padne na kratkima.

Koristi funkcije iz producer.domovina.tv/scripts/sync_cameras.py: GCC-PHAT u
prozorima od WINDOW_S kroz cijelu snimku, oko grubog pomaka, pa robustan pravac
t_master = a + b · t_kamera.

    fine_sync.py MASTER KAMERA GRUBI_POMAK [--window 20] [--search 1.0] [--n 80]
"""
import argparse, json, sys
from pathlib import Path
import numpy as np

sys.path.insert(0, str(Path.home() / "git/domovinatv/producer.domovina.tv/scripts"))
import sync_cameras as sc

ap = argparse.ArgumentParser()
ap.add_argument("master"); ap.add_argument("camera"); ap.add_argument("a0", type=float)
ap.add_argument("--window", type=float, default=20.0)
ap.add_argument("--search", type=float, default=1.0)
ap.add_argument("--n", type=int, default=80)
args = ap.parse_args()

sr = sc.FINE_SR
master = sc.bandpass(sc.load_audio(args.master, sr), sr)
cam = sc.bandpass(sc.load_audio(args.camera, sr), sr)
mdur, cdur = len(master) / sr, len(cam) / sr
a, b = args.a0, 1.0
lo = max(0.0, -a) + 1
hi = min(cdur, mdur - a) - args.window - 1
points = []
for s in np.linspace(lo, hi, args.n):
    m = sc.correlate_at(cam, master, s, args.window, args.search, a, b)
    if m is not None:
        points.append(m)
good = [p for p in points if p[2] >= sc.MIN_PSR]
print(f"{len(good)}/{len(points)} prozora s PSR ≥ {sc.MIN_PSR}; PSR medijan {np.median([p[2] for p in points]):.1f}")
cs, ms, ps = (np.array(v) for v in zip(*good))
a, b, res, keep = sc.robust_line(cs, ms)
out = {"file": args.camera, "durationSeconds": cdur, "offsetSeconds": float(a), "scale": float(b),
       "driftPPM": float((b - 1) * 1e6), "windows": len(points), "windowsUsed": int(keep.sum()),
       "medianPSR": float(np.median(ps)),
       "residualRmsMs": float(np.sqrt(np.mean(res[keep] ** 2)) * 1000),
       "residualMaxMs": float(np.max(np.abs(res[keep])) * 1000),
       "windowS": args.window,
       "points": [[round(float(c), 3), round(float(m - (a + b * c)) * 1000, 3), round(float(p), 1)]
                  for c, m, p in zip(cs, ms, ps)]}
print(f"pomak {a:+.4f} s · drift {out['driftPPM']:+.1f} ppm · rezidual {out['residualRmsMs']:.2f} ms RMS, "
      f"max {out['residualMaxMs']:.2f} · {out['windowsUsed']}/{len(good)} · PSR {out['medianPSR']:.1f}")
print(json.dumps(out), file=sys.stderr)
