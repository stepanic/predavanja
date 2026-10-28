#!/usr/bin/env python3
"""Lokalni server za montaza app.

    python3 montaza/server.py [--port 8770]

/            → montaza/app (statika)
/media/…     → mapa sirovih snimki (proxyji), s HTTP Range za premotavanje
/api/manifest GET → manifest.json; PUT → sprema edit (in/out, bilješke, točke reza) i nudgeSeconds po tragu
"""
import argparse
import json
import mimetypes
import os
import re
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

HERE = Path(__file__).resolve().parent
APP = HERE / "app"
MANIFEST = HERE / "manifest.json"
mimetypes.add_type("audio/mp4", ".m4a")


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(APP), **kw)

    def log_message(self, *a):
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        path = unquote(urlparse(self.path).path)
        if path == "/api/manifest":
            return self.send_json(json.loads(MANIFEST.read_text()))
        if path.startswith("/media/"):
            return self.send_media(path[len("/media/"):])
        return super().do_GET()

    def do_PUT(self):
        if urlparse(self.path).path != "/api/manifest":
            return self.send_error(404)
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        m = json.loads(MANIFEST.read_text())
        # Tab koji je učitao stariju verziju ne smije prepisati noviju (dva otvorena taba).
        if body.get("rev") != m.get("rev", 0):
            return self.send_json({"ok": False, "rev": m.get("rev", 0)}, 409)
        m["rev"] = m.get("rev", 0) + 1
        edit = body.get("edit", {})
        m["edit"] = {"inSeconds": edit.get("inSeconds"), "outSeconds": edit.get("outSeconds"),
                     "notes": str(edit.get("notes", ""))}
        # točke reza: od t do iduće točke vrijede ova slika i ovaj zvuk
        ids = {t["id"] for t in m["tracks"]} | {L["id"] for L in m.get("layouts", [])}
        m["edit"]["cuts"] = sorted(
            ({"t": round(float(c["t"]), 3), "video": c["video"], "audio": c["audio"],
              **({"why": str(c["why"])[:200]} if c.get("why") else {})}
             for c in edit.get("cuts") or [] if c.get("video") in ids and c.get("audio") in ids),
            key=lambda c: c["t"])
        nudges = body.get("nudges", {})
        for t in m["tracks"]:
            if t["id"] in nudges:
                t["nudgeSeconds"] = round(float(nudges[t["id"]]), 4)
        tmp = MANIFEST.with_suffix(".tmp")
        tmp.write_text(json.dumps(m, indent=2, ensure_ascii=False) + "\n")
        os.replace(tmp, MANIFEST)
        self.send_json({"ok": True, "rev": m["rev"]})

    def send_json(self, obj, code=200):
        data = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def send_media(self, rel):
        root = Path(json.loads(MANIFEST.read_text())["rawDir"]).resolve()
        f = (root / rel).resolve()
        if root not in f.parents or not f.is_file():
            return self.send_error(404)
        size = f.stat().st_size
        start, end = 0, size - 1
        rng = re.match(r"bytes=(\d*)-(\d*)", self.headers.get("Range", ""))
        if rng:
            if rng[1]:
                start = int(rng[1])
                end = int(rng[2]) if rng[2] else end
            else:
                start = size - int(rng[2])
            end = min(end, size - 1)
            self.send_response(206)
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        else:
            self.send_response(200)
        self.send_header("Content-Type", mimetypes.guess_type(f.name)[0] or "application/octet-stream")
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(end - start + 1))
        self.end_headers()
        with f.open("rb") as fh:
            fh.seek(start)
            left = end - start + 1
            try:
                while left > 0:
                    chunk = fh.read(min(1 << 20, left))
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    left -= len(chunk)
            except (BrokenPipeError, ConnectionResetError):
                pass


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8770)
    port = ap.parse_args().port
    print(f"montaža: http://127.0.0.1:{port}/")
    ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
