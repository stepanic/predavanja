#!/usr/bin/env python3
"""Aktivnost na screenshareu po sekundi → sync/screen_activity.json.

Čita samo keyframeove proxyja (-skip_frame nokey), pa je
gotovo za par minuta. Za svaki par uzastopnih frameova mjeri srednju apsolutnu razliku
svjetline na cijelom kadru i posebno u kutu gdje je predavač 9:16 (raspored pip-*).
Vrijeme je vrijeme izvora (screenshare), u sekundama.
"""
import json
import subprocess
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent.parent
m = json.loads((HERE / "manifest.json").read_text())
scr = next(t for t in m["tracks"] if t["id"] == "screen")
L = m["layouts"][0]
W, H = 240, 150                       # 1920×1200 / 8
src = str(Path(m["rawDir"]) / scr["videoProxy"])
raw = subprocess.run(["ffmpeg", "-v", "error", "-skip_frame", "nokey", "-i", src, "-vf", f"scale={W}:{H},format=gray",
                      "-fps_mode", "passthrough", "-f", "rawvideo", "-"], capture_output=True, check=True).stdout
frames = np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.int16)
pts = subprocess.run(["ffprobe", "-v", "error", "-skip_frame", "nokey", "-select_streams", "v:0", "-show_entries",
                      "frame=pts_time", "-of", "csv=p=0", src], capture_output=True, text=True, check=True).stdout.split()
times = np.array([float(x.strip(",")) for x in pts if x.strip(",")])[:len(frames)]
step = float(np.median(np.diff(times)))

# Kut s predavačem u izlazu 1920×1080 (screenCrop y=72), preveden u koordinate screensharea /8.
sx, sy, sw, sh = L["screenCrop"]
pw, ph, mg = L["pip"]["w"], L["pip"]["h"], L["pip"]["margin"] + L["pip"]["border"]
x0, y0 = (sx + sw - pw - mg) // 8, (sy + sh - ph - mg) // 8
x1, y1 = (sx + sw - mg + 8) // 8, (sy + sh - mg + 8) // 8
crop = slice(sy // 8, (sy + sh) // 8)

d = np.abs(np.diff(frames, axis=0))
full = d[:, crop, :].mean(axis=(1, 2))
corner = d[:, y0:y1, x0:x1].mean(axis=(1, 2))
out = {"step": round(step, 3), "t": times[1:].round(2).tolist(),
       "full": full.round(2).tolist(), "corner": corner.round(2).tolist(),
       "cornerBox": [x0 * 8, y0 * 8, (x1 - x0) * 8, (y1 - y0) * 8]}
(HERE / "sync/screen_activity.json").write_text(json.dumps(out, separators=(",", ":")))
print(len(frames), "frameova, korak", round(step, 2), "s;", "mirno (<0,3):", f"{(full < 0.3).mean():.0%}",
      "· kut aktivan (>2):", f"{(corner > 2).mean():.0%}")
