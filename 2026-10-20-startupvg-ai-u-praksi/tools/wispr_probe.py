#!/usr/bin/env python3
"""Prati Wispr Flow live.ndjson najnovijeg meetinga i mjeri kašnjenje.

Za svaki novi segment ispisuje: koliko je sekundi prošlo od kraja izgovora
(endEpochMs) do trenutka kad se redak pojavio u datoteci, trajanje segmenta
i tekst. Pokreni, pa u Wispr Flowu započni snimanje bilješke i pričaj.
"""
import json, os, pathlib, time

ROOT = pathlib.Path.home() / "Library/Application Support/Wispr Flow/meetings"

def newest_live():
    files = list(ROOT.glob("*/live.ndjson"))
    return max(files, key=lambda p: p.stat().st_mtime) if files else None

def main():
    start = time.time()
    path, pos = None, 0
    print(f"čekam novi/aktivni meeting u {ROOT} …")
    while True:
        cand = newest_live()
        if cand and cand != path and cand.stat().st_mtime >= start - 5:
            path, pos = cand, 0
            print(f"\n→ pratim {path.parent.name}")
        if path:
            size = path.stat().st_size
            if size < pos:
                pos = 0
            if size > pos:
                with path.open() as f:
                    f.seek(pos)
                    chunk = f.read()
                    pos = f.tell()
                now_ms = time.time() * 1000
                for line in chunk.splitlines():
                    try:
                        d = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    if "text" not in d:
                        continue
                    lag = (now_ms - d["endEpochMs"]) / 1000
                    dur = (d["endEpochMs"] - d["startEpochMs"]) / 1000
                    src = d.get("speaker", {}).get("source")
                    print(f"[kašnjenje {lag:5.1f}s | segment {dur:5.1f}s | {src}] {d['text']}")
        time.sleep(0.2)

if __name__ == "__main__":
    main()
