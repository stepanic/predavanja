#!/usr/bin/env python3
"""Vrhovi valnog oblika za montaza app: max |x| po 50 ms, 0–255, iz *_audio.m4a."""
import json, subprocess, sys
from pathlib import Path
import numpy as np

SR, HOP = 2000, 100   # 2 kHz, 100 uzoraka = 50 ms
src, dst = Path(sys.argv[1]), Path(sys.argv[2])
dst.mkdir(parents=True, exist_ok=True)
for f in sorted(src.glob("*_audio.m4a")):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-nostdin", "-i", str(f), "-ac", "1", "-ar", str(SR),
                          "-f", "f32le", "-"], capture_output=True, check=True).stdout
    x = np.abs(np.frombuffer(raw, np.float32))
    x = x[: len(x) // HOP * HOP].reshape(-1, HOP).max(axis=1)
    ref = np.percentile(x, 99.5) or 1.0
    q = np.clip(np.sqrt(x / ref) * 255, 0, 255).astype(np.uint8)   # sqrt da se tihi govor vidi
    name = f.name.removesuffix("_audio.m4a")
    (dst / f"{name}.json").write_text(json.dumps({"hopSeconds": HOP / SR, "peaks": q.tolist()},
                                                 separators=(",", ":")))
    print(name, len(q))
