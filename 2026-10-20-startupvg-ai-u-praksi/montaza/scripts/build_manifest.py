#!/usr/bin/env python3
"""Sastavi montaza/manifest.json iz rezultata poravnanja.

Vremenska crta = zvuk RØDE Connecta (Recording 6.wav), t = 0 je njegov prvi uzorak.
Svaki izvor: t_timeline = offsetSeconds + scale · t_izvor.
Postojeći odabir (edit) iz app-a se čuva.
"""
import json
from datetime import datetime, timedelta
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
SYNC = HERE / "sync"
RAW = "/Volumes/DOMOVINA2TB/ai_edukacija_startupvg_20261020_raw_montaza"

ms = json.loads((SYNC / "multicam_sync.json").read_text())["cameras"]
lumix = json.loads((SYNC / "fine_lumix.json").read_text())
moto = json.loads((SYNC / "fine_moto.json").read_text())
m4a = next(iter(ms.values()))  # ime iz sync_cameras.py je "-3" (krnje ime fajla)

# Zidni sat: ime moto fajla je lokalno vrijeme početka snimanja (sat mobitela).
moto_start = datetime.fromisoformat("2026-10-20T17:45:51.574+02:00")
timeline_zero = moto_start + timedelta(seconds=-moto["offsetSeconds"])
# Screenshare nema zvuk. Sat na Windows taskbaru mijenja minutu na t = 34,63 / 634,70 /
# 1534,80 / 2434,90 / 3634,07 / 4834,27 / 6034,43 / 6934,57 / 7114,57 s → početak 18:01:25,45 ±0,4 s.
screen_start = datetime.fromisoformat("2026-10-20T18:01:25.450+02:00")
screen_offset = moto["offsetSeconds"] + (screen_start - moto_start).total_seconds() * moto["scale"]


def q(r):
    return {k: round(r[k], 3) for k in ("residualRmsMs", "residualMaxMs", "medianPSR") if k in r} | \
           {"windowsUsed": r.get("windowsUsed"), "windows": r.get("windows")}


tracks = [
    {"id": "rode", "label": "RØDE Connect (mikrofon)", "kind": "audio", "file": "Recording 6.wav",
     "media": "PCM 24-bit 48 kHz stereo", "durationSeconds": 8333.34,
     "offsetSeconds": 0.0, "scale": 1.0, "audioProxy": "proxy/rode_audio.m4a",
     "sync": {"method": "master", "note": "referentni zvuk vremenske crte"}},
    {"id": "lumix", "label": "LUMIX (kamera)", "kind": "av", "file": "P1400725.MP4",
     "media": "H.264 3840×2160 25p + AAC 48 kHz stereo", "durationSeconds": lumix["durationSeconds"],
     "offsetSeconds": round(lumix["offsetSeconds"], 4), "scale": lumix["scale"],
     "videoProxy": "proxy/lumix.mp4", "audioProxy": "proxy/lumix_audio.m4a",
     "sync": {"method": "audio GCC-PHAT, prozori 20 s", "driftPPM": round(lumix["driftPPM"], 2), **q(lumix)}},
    {"id": "moto", "label": "moto g86 (mobitel)", "kind": "av", "file": "VID_20261020_174551574.mp4",
     "media": "H.264 3840×2160 ~30p VFR + AAC 48 kHz stereo", "durationSeconds": moto["durationSeconds"],
     "offsetSeconds": round(moto["offsetSeconds"], 4), "scale": moto["scale"],
     "videoProxy": "proxy/moto.mp4", "audioProxy": "proxy/moto_audio.m4a",
     "sync": {"method": "audio GCC-PHAT, prozori 20 s", "driftPPM": round(moto["driftPPM"], 2), **q(moto),
              "note": "mobitel je daleko od govornika, jeka diže rezidual; i dalje ispod jednog framea"}},
    {"id": "m4a", "label": "Snimka zvuka (m4a s Drivea)", "kind": "audio",
     "file": "StartupVG AI radionica 2026-10-20.m4a", "media": "AAC 48 kHz mono",
     "durationSeconds": m4a["durationSeconds"], "offsetSeconds": round(m4a["offsetSeconds"], 4),
     "scale": m4a["scale"], "audioProxy": "proxy/m4a_audio.m4a",
     "sync": {"method": "audio GCC-PHAT (sync_cameras.py)", "driftPPM": round(m4a["driftPPM"], 2), **q(m4a)}},
    {"id": "screen", "label": "Screenshare (Windows)", "kind": "video", "file": "20261020-1601-22.4383047.mp4",
     "media": "H.264 1920×1200 30p, bez zvuka", "durationSeconds": 7151.7333,
     "offsetSeconds": round(screen_offset, 3), "scale": 1.0, "videoProxy": "proxy/screen.mp4",
     "sync": {"method": "zidni sat", "uncertaintySeconds": 0.5,
              "note": "nema zvuka; početak 18:01:25,45 iz promjena minute na Windows satu, preveden na "
                      "vremensku crtu preko sata moto mobitela (ime fajla). Provjeri na promjeni slajda i fino pomakni."}},
]

out = HERE / "manifest.json"
old = json.loads(out.read_text()) if out.exists() else {}
manifest = {
    "version": 1,
    "title": "AI u praksi — StartupVG, 20. 10. 2026.",
    "rawDir": RAW,
    "model": "t_timeline = offsetSeconds + scale * t_izvor (sekunde); t_timeline = 0 je prvi uzorak RØDE snimke",
    "timelineZeroWallClock": timeline_zero.isoformat(timespec="milliseconds"),
    "timelineEndSeconds": round(max(t["offsetSeconds"] + t["scale"] * t["durationSeconds"] for t in tracks), 3),
    "tracks": tracks,
    "edit": old.get("edit") or {"inSeconds": None, "outSeconds": None, "notes": ""},
    # Složeni kadrovi: screenshare (bez Windows trake) + predavač 9:16 iz kamere u donjem desnom kutu.
    # Izrez predavača po vremenu je u app/crop/<kamera>.json (scripts/track_crop.py). Mjere su za izlaz 1920×1080.
    "layouts": [dict(id=f"pip-{c}", label=f"Screen + {n} 9:16", screen="screen", cam=c,
                     screenCrop=[0, 72, 1920, 1080], pip={"w": 360, "h": 640, "margin": 24, "border": 4})
                for c, n in (("moto", "moto"), ("lumix", "LUMIX"))],
    "rev": old.get("rev", 0),
}
# Ručni pomaci iz app-a (nudge) ostaju sačuvani.
for t in tracks:
    t["nudgeSeconds"] = next((o.get("nudgeSeconds", 0.0) for o in old.get("tracks", []) if o["id"] == t["id"]), 0.0)
out.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")
print(out)
for t in tracks:
    print(f"{t['id']:7} {t['offsetSeconds']:+10.3f} s  → kraj {t['offsetSeconds'] + t['scale'] * t['durationSeconds']:9.1f} s")
print("t=0 =", manifest["timelineZeroWallClock"])
