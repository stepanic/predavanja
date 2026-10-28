#!/usr/bin/env python3
"""Putanja WiFi papira na govornici → crop/<kamera>_papir.json.

Obje kamere tijekom snimke polako klize (LUMIX ~70 px, moto ~150 px u 4K), pa fiksni
pravokutnik ne prati papir. Svakih STEP sekundi izvora uzme sivi izrez područja pretrage
i u njemu traži predložak papira (papir + crni rub, iz referentnog kadra) normaliziranom
korelacijom preko FFT-a na pola rezolucije, pa točno na punoj u ±3 px. Uzorci sa
slabom korelacijom (ruka preko papira) se odbacuju, a putanja se izgladi medijanom.

Izlaz je u pikselima 4K originala, po vremenu izvora:
  {"w", "h", "t": [...], "x": [...], "y": [...], "score": [...]}   (x, y = gornji lijevi kut papira)

  python3 -I montaza/scripts/track_papir.py lumix moto
"""
import json
import statistics
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent.parent
STEP = 5.0
MARGIN = 14                       # crni rub oko papira u predlošku
MIN_SCORE = 0.6
MEDIAN_N = 5
# ref: kadar izvora u kojem je papir čist; paper: izmjereni rub papira u tom kadru (x, y, w, h);
# search: područje pretrage (x, y, w, h) koje pokriva cijeli pomak
CAM = {
    "lumix": {"ref": 1200, "paper": (2786, 1487, 117, 117), "search": (2600, 1380, 600, 340)},
    "moto": {"ref": 1100, "paper": (3289, 1332, 151, 126), "search": (3140, 1220, 660, 360)},
}


def gray(path, t, x, y, w, h):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-nostdin", "-ss", f"{t:.3f}", "-i", path, "-frames:v", "1",
                          "-vf", f"crop={w}:{h}:{x}:{y},format=gray", "-f", "rawvideo", "-"],
                         capture_output=True).stdout
    if len(raw) != w * h:
        return None
    return np.frombuffer(raw, np.uint8).reshape(h, w).astype(np.float64)


def ncc(img, tpl):
    """Normalizirana korelacija predloška po svim položajima (valid), preko FFT-a."""
    th, tw = tpl.shape
    t = tpl - tpl.mean()
    tn = np.sqrt((t * t).sum())
    H, W = img.shape
    F = np.fft.rfft2(img, s=(H, W))
    num = np.fft.irfft2(F * np.conj(np.fft.rfft2(t, s=(H, W))), s=(H, W))[:H - th + 1, :W - tw + 1]

    def boxsum(a):
        c = np.pad(a.cumsum(0).cumsum(1), ((1, 0), (1, 0)))
        return c[th:, tw:] - c[:-th, tw:] - c[th:, :-tw] + c[:-th, :-tw]

    n = th * tw
    s1, s2 = boxsum(img), boxsum(img * img)
    var = np.maximum(s2 - s1 * s1 / n, 1e-6)
    return num / (np.sqrt(var) * tn)


def track(cam):
    man = json.loads((HERE / "manifest.json").read_text())
    tr = next(t for t in man["tracks"] if t["id"] == cam)
    path = str(Path(man["rawDir"]) / tr["file"])
    cfg = CAM[cam]
    px, py, pw, ph = cfg["paper"]
    sx, sy, sw, sh = cfg["search"]
    tpl = gray(path, cfg["ref"], px - MARGIN, py - MARGIN, pw + 2 * MARGIN, ph + 2 * MARGIN)
    tpl2 = tpl[::2, ::2]
    times = [i * STEP for i in range(int(tr["durationSeconds"] // STEP))]

    def one(t):
        img = gray(path, t, sx, sy, sw, sh)
        if img is None:
            return None
        r = ncc(img[::2, ::2], tpl2)
        j, i = np.unravel_index(np.argmax(r), r.shape)
        # dorada na punoj rezoluciji oko grubog položaja
        x0, y0 = max(2 * i - 3, 0), max(2 * j - 3, 0)
        sub = img[y0:y0 + tpl.shape[0] + 6, x0:x0 + tpl.shape[1] + 6]
        rf = ncc(sub, tpl)
        jj, ii = np.unravel_index(np.argmax(rf), rf.shape)
        return t, int(sx + x0 + ii + MARGIN), int(sy + y0 + jj + MARGIN), float(rf[jj, ii])

    with ThreadPoolExecutor(6) as ex:
        res = [r for r in ex.map(one, times) if r]
    good = [r for r in res if r[3] >= MIN_SCORE]
    xs = [r[1] for r in good]
    ys = [r[2] for r in good]
    h = MEDIAN_N // 2
    xm = [statistics.median(xs[max(0, k - h):k + h + 1]) for k in range(len(xs))]
    ym = [statistics.median(ys[max(0, k - h):k + h + 1]) for k in range(len(ys))]
    out = {"w": pw, "h": ph, "step": STEP, "t": [r[0] for r in good], "x": xm, "y": ym,
           "score": [round(r[3], 3) for r in good], "dropped": len(res) - len(good)}
    f = HERE / "crop" / f"{cam}_papir.json"
    f.write_text(json.dumps(out) + "\n")
    print(f"{cam}: {len(good)}/{len(res)} uzoraka, x {min(xm):.0f}–{max(xm):.0f}, y {min(ym):.0f}–{max(ym):.0f} → {f}")


if __name__ == "__main__":
    for c in sys.argv[1:] or list(CAM):
        track(c)
