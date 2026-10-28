#!/usr/bin/env python3
"""Render montaže iz manifest.json: 4K originali → 1080p30 H.264 + AAC.

Slika se radi po segmentima (jedan ffmpeg po točki reza), s točno izbrojenim frameovima
na mreži od 30 fps od početka raspona, pa se segmenti spajaju bez ponovnog kodiranja.
Zvuk je jedan prolaz preko cijelog raspona (RØDE), pa na rezovima nema rupa.

  python3 -I montaza/scripts/render.py --od 0:36:00 --do 0:38:00   # probni isječak
  python3 -I montaza/scripts/render.py                              # cijeli edit (in–out)

Izlaz: <rawDir>/render/<ime>/<ime>.mp4; segmenti i log su u istoj mapi.
"""
import argparse
import bisect
import json
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
FPS = 30
OUT_W, OUT_H = 1920, 1080
CAM_SCALE = OUT_W / 3840            # kamere su 4K, izrez i papir se računaju u 1080p
# WiFi papir na govornici: umjesto zamućenja kartica s logotipima iz mediakita, koja prati papir
# (putanja iz scripts/track_papir.py, crop/<kamera>_papir.json). Rub kartice je u 4K px.
MEDIAKIT = Path.home() / "git/domovinatv/mediakit.domovina.tv"
LOGOS = ["domovina", "domovina_ai", "domovina_tv", "domovina_energy", "domovina_karta", "domovina_klubovi",
         "domovina_cloud", "domovina_lopta", "domovina_studio", "domovina_wallet", "domovina_pay",
         "domovina_provjera", "domovina_omm", "domovina_bot", "domovina_browser", "mpt", "airkuna", "omm", "pay"]
LOGO_S, LOGO_FADE = 4.0, 0.25
PAPIR_PAD = {"lumix": 8, "moto": 14}
PAPIR_BOJA = "0xEDEDED"
VENC = ["-c:v", "h264_videotoolbox", "-profile:v", "high", "-b:v", "12M", "-maxrate", "18M",
        "-bufsize", "24M", "-g", "60", "-pix_fmt", "yuv420p", "-r", str(FPS)]
FADE_IN, FADE_OUT = 0.5, 1.5
# RØDE je na ~−50 LUFS, šum ~−70 dBFS (najtiših 5 % prozora od 100 ms). Pojačanje ide prvo,
# jer afftdn šum zadaje apsolutno (nf ≥ −80 dB); loudnorm na kraju postavi točnu glasnoću.
AUDIO_PRE = "pan=stereo|c0=c0|c1=c0,volume=30dB,highpass=f=80,afftdn=nr=8:nf=-40:tn=1"
LOUD = "I=-14:TP=-1:LRA=11"


def hms(s):
    if ":" not in s:
        return float(s)
    t = 0.0
    for p in s.split(":"):
        t = t * 60 + float(p.replace(",", "."))
    return t


def fmt(t):
    return f"{int(t // 3600)}:{int(t % 3600 // 60):02d}:{t % 60:04.1f}"


class Ctx:
    def __init__(self, man):
        self.m = man
        self.raw = Path(man["rawDir"])
        self.tracks = {t["id"]: t for t in man["tracks"]}
        self.layouts = {L["id"]: L for L in man.get("layouts", [])}
        self.crops = {}
        self.papir = {}
        self.papir_loop = {}

    def src(self, tid, T):
        tr = self.tracks[tid]
        return (T - tr["offsetSeconds"] - tr.get("nudgeSeconds", 0.0)) / tr["scale"]

    def path(self, tid):
        return str(self.raw / self.tracks[tid]["file"])

    def crop(self, cam):
        if cam not in self.crops:
            self.crops[cam] = json.loads((HERE / f"app/crop/{cam}.json").read_text())
        return self.crops[cam]


def interp(ts, vs, t):
    i = bisect.bisect_right(ts, t)
    if i <= 0:
        return vs[0]
    if i >= len(ts):
        return vs[-1]
    a, b = ts[i - 1], ts[i]
    return vs[i - 1] + (vs[i] - vs[i - 1]) * (t - a) / (b - a)


def papir_size(ctx, cam):
    p, pad = ctx.papir[cam], PAPIR_PAD[cam]
    return (int(round((p["w"] + 2 * pad) * CAM_SCALE / 2)) * 2, int(round((p["h"] + 2 * pad) * CAM_SCALE / 2)) * 2)


def papir_loop(ctx, cam, d):
    """Petlja kartice s logotipima za kameru: svaki logo LOGO_S s, pretapanje preko boje papira."""
    if cam in ctx.papir_loop:
        return ctx.papir_loop[cam]
    ctx.papir[cam] = json.loads((HERE / f"crop/{cam}_papir.json").read_text())
    w, h = papir_size(ctx, cam)
    s = int(min(w, h) * 0.86) // 2 * 2
    out = d / f"papir_{cam}_{w}x{h}.mp4"
    if not out.exists():
        ins, fg = [], []
        for i, name in enumerate(LOGOS):
            ins += ["-loop", "1", "-framerate", str(FPS), "-t", str(LOGO_S), "-i", str(MEDIAKIT / f"{name}_logo_square.png")]
            fg.append(f"[{i}:v]scale={s}:{s}:flags=lanczos,format=rgba,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2:color={PAPIR_BOJA},"
                      f"format=yuv420p,fade=t=in:d={LOGO_FADE}:color={PAPIR_BOJA},"
                      f"fade=t=out:st={LOGO_S - LOGO_FADE}:d={LOGO_FADE}:color={PAPIR_BOJA}[l{i}]")
        fg.append("".join(f"[l{i}]" for i in range(len(LOGOS))) + f"concat=n={len(LOGOS)}:v=1:a=0[v]")
        subprocess.run(["ffmpeg", "-hide_banner", "-nostdin", "-y", "-loglevel", "error", *ins, "-filter_complex",
                        ";".join(fg), "-map", "[v]", "-c:v", "libx264", "-crf", "12", "-preset", "slow",
                        "-pix_fmt", "yuv420p", "-r", str(FPS), str(out)], check=True)
    ctx.papir_loop[cam] = out
    return out


def papir_inputs(ctx, cam, T0, d):
    """Ulaz petlje, s pomakom po vremenu crte, pa se izmjena logotipa nastavlja kroz rezove."""
    period = LOGO_S * len(LOGOS)
    return ["-stream_loop", "-1", "-ss", f"{T0 % period:.4f}", "-i", str(papir_loop(ctx, cam, d))]


def cam_chain(ctx, cam, inp, pinp, label, T0, n, cmdf):
    """Kamera 4K → 1080p, a preko WiFi papira kartica s logotipima koja ga prati frame po frame."""
    p, pad = ctx.papir[cam], PAPIR_PAD[cam]
    scale = ctx.tracks[cam]["scale"]
    s0 = ctx.src(cam, T0)
    lines = []
    for f in range(n):
        ts = s0 + f / FPS / scale
        x = round((interp(p["t"], p["x"], ts) - pad) * CAM_SCALE)
        y = round((interp(p["t"], p["y"], ts) - pad) * CAM_SCALE)
        lines.append(f"{f / FPS:.4f} overlay@pap x {x}, overlay@pap y {y};")
    cmdf.write_text("\n".join(lines) + "\n")
    x0, y0 = lines[0].split()[3].rstrip(","), lines[0].split()[6].rstrip(";")
    return (f"[{inp}:v]setpts=PTS-STARTPTS,fps={FPS},scale={OUT_W}:{OUT_H}:flags=lanczos,sendcmd=f='{cmdf}'[ca];"
            f"[{pinp}:v]setpts=PTS-STARTPTS[pl];"
            f"[ca][pl]overlay@pap={x0}:{y0}:eof_action=repeat[{label}]")


def screen_chain(L, inp, label):
    x, y, w, h = L["screenCrop"]
    return f"[{inp}:v]setpts=PTS-STARTPTS,fps={FPS},crop={w}:{h}:{x}:{y},scale={OUT_W}:{OUT_H}[{label}]"


def segment_cmd(ctx, seg, d):
    """ffmpeg naredba za jedan segment {video, T0, n, k}."""
    vid, T0, n = seg["video"], seg["T0"], seg["n"]
    out = d / f"seg_{seg['k']:04d}.mp4"
    ins, graph = [], []
    if vid in ctx.layouts:
        L = ctx.layouts[vid]
        cam, cr, p = L["cam"], ctx.crop(L["cam"]), L["pip"]
        ins += ["-ss", f"{ctx.src(L['screen'], T0):.4f}", "-i", ctx.path(L["screen"]),
                "-ss", f"{ctx.src(cam, T0):.4f}", "-i", ctx.path(cam), *papir_inputs(ctx, cam, T0, d)]
        graph.append(screen_chain(L, 0, "scr"))
        graph.append(cam_chain(ctx, cam, 1, 2, "cam", T0, n, d / f"seg_{seg['k']:04d}.pap"))
        # putanja izreza po vremenu izvora, linearno između točaka (0,5 s), jedna naredba po frameu
        cw, ch = int(cr["w"] * CAM_SCALE), int(cr["h"] * CAM_SCALE)
        scale = ctx.tracks[cam]["scale"]
        s0 = ctx.src(cam, T0)
        lines = []
        for f in range(n):
            ts = s0 + f / FPS / scale
            x = min(max(round(interp(cr["t"], cr["x"], ts) * CAM_SCALE), 0), OUT_W - cw)
            y = min(max(round(interp(cr["t"], cr["y"], ts) * CAM_SCALE), 0), OUT_H - ch)
            lines.append(f"{f / FPS:.4f} crop@pc x {x}, crop@pc y {y};")
        cmdf = d / f"seg_{seg['k']:04d}.cmd"
        cmdf.write_text("\n".join(lines) + "\n")
        x0, y0 = lines[0].split()[3].rstrip(","), lines[0].split()[6].rstrip(";")
        b = p["border"]
        ox, oy = OUT_W - p["margin"] - p["w"] - b, OUT_H - p["margin"] - p["h"] - b
        graph.append(f"[cam]sendcmd=f='{cmdf}',crop@pc={cw}:{ch}:{x0}:{y0},scale={p['w']}:{p['h']},"
                     f"pad={p['w'] + 2 * b}:{p['h'] + 2 * b}:{b}:{b}:white[pp]")
        graph.append(f"[scr][pp]overlay={ox}:{oy}[v0]")
    elif ctx.tracks[vid]["kind"] == "av":  # kamera preko cijelog kadra
        ins += ["-ss", f"{ctx.src(vid, T0):.4f}", "-i", ctx.path(vid), *papir_inputs(ctx, vid, T0, d)]
        graph.append(cam_chain(ctx, vid, 0, 1, "v0", T0, n, d / f"seg_{seg['k']:04d}.pap"))
    else:  # screenshare preko cijelog kadra
        L = next(iter(ctx.layouts.values()))
        ins += ["-ss", f"{ctx.src(vid, T0):.4f}", "-i", ctx.path(vid)]
        graph.append(screen_chain(L, 0, "v0"))
    tail = "format=yuv420p"
    if seg.get("fadeIn"):
        tail += f",fade=t=in:d={FADE_IN}"
    if seg.get("fadeOut") is not None:
        tail += f",fade=t=out:st={seg['fadeOut']:.3f}:d={FADE_OUT}"
    graph.append(f"[v0]{tail}[v]")
    return ["ffmpeg", "-hide_banner", "-nostdin", "-y", "-loglevel", "error", *ins,
            "-filter_complex", ";".join(graph), "-map", "[v]", "-frames:v", str(n), *VENC, "-an",
            str(out)], out


def plan(ctx, A, B):
    cuts = sorted(ctx.m["edit"]["cuts"], key=lambda c: c["t"])
    pts = [c for c in cuts if A < c["t"] < B]
    first = max((c for c in cuts if c["t"] <= A), key=lambda c: c["t"], default=None) or cuts[0]
    bounds = [(A, first["video"])] + [(c["t"], c["video"]) for c in pts]
    total = round((B - A) * FPS)
    segs = []
    for k, (t, vid) in enumerate(bounds):
        f0 = round((t - A) * FPS)
        f1 = total if k + 1 == len(bounds) else round((bounds[k + 1][0] - A) * FPS)
        if f1 > f0:
            segs.append({"k": len(segs), "video": vid, "T0": A + f0 / FPS, "n": f1 - f0})
    segs[0]["fadeIn"] = True
    segs[-1]["fadeOut"] = max(0.0, segs[-1]["n"] / FPS - FADE_OUT)
    return segs, total


def audio(ctx, A, B, d, log):
    """RØDE: mjerenje loudnorma na cijelom editu (isti gain za probu i cijeli video), pa render raspona."""
    E0, E1 = ctx.m["edit"]["inSeconds"], ctx.m["edit"]["outSeconds"]
    rode = ctx.path("rode")
    mf = HERE / "render_loudnorm.json"
    key = f"{E0}-{E1}|{AUDIO_PRE}|{LOUD}"
    meas = json.loads(mf.read_text()) if mf.exists() else {}
    if meas.get("key") != key:
        log("zvuk: mjerim glasnoću cijelog edita …")
        r = subprocess.run(["ffmpeg", "-hide_banner", "-nostdin", "-ss", f"{E0}", "-t", f"{E1 - E0}", "-i", rode,
                            "-af", f"{AUDIO_PRE},loudnorm={LOUD}:print_format=json", "-f", "null", "-"],
                           capture_output=True, text=True, check=True)
        j = json.loads(r.stderr[r.stderr.rindex("{"):r.stderr.rindex("}") + 1])
        meas = {"key": key, **j}
        mf.write_text(json.dumps(meas, indent=1) + "\n")
    log(f"zvuk: ulaz {meas['input_i']} LUFS, {meas['input_tp']} dBTP, LRA {meas['input_lra']}")
    dur = (B - A)
    ln = (f"loudnorm={LOUD}:measured_I={meas['input_i']}:measured_TP={meas['input_tp']}:"
          f"measured_LRA={meas['input_lra']}:measured_thresh={meas['input_thresh']}:"
          f"offset={meas['target_offset']}:linear=true")
    af = f"{AUDIO_PRE},{ln},aresample=48000,afade=t=in:d={FADE_IN},afade=t=out:st={dur - FADE_OUT:.3f}:d={FADE_OUT}"
    out = d / "audio.m4a"
    subprocess.run(["ffmpeg", "-hide_banner", "-nostdin", "-y", "-loglevel", "error", "-ss", f"{A}", "-t", f"{dur}",
                    "-i", rode, "-af", af, "-c:a", "aac", "-b:a", "256k", "-ar", "48000", str(out)], check=True)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--od", help="početak na crti (s ili h:mm:ss), zadano edit.inSeconds")
    ap.add_argument("--do", dest="do_", help="kraj na crti, zadano edit.outSeconds")
    ap.add_argument("--ime", help="ime izlaza, zadano proba_<od>_<do> ili ai-u-praksi_1080p")
    ap.add_argument("-j", "--jobs", type=int, default=3)
    a = ap.parse_args()

    ctx = Ctx(json.loads((HERE / "manifest.json").read_text()))
    full = not a.od and not a.do_
    A = hms(a.od) if a.od else ctx.m["edit"]["inSeconds"]
    B = hms(a.do_) if a.do_ else ctx.m["edit"]["outSeconds"]
    name = a.ime or ("ai-u-praksi_1080p" if full else f"proba_{int(A)}_{int(B)}")
    d = ctx.raw / "render" / name
    d.mkdir(parents=True, exist_ok=True)
    logf = open(d / "render.log", "a")

    def log(s):
        print(s, flush=True)
        logf.write(s + "\n")
        logf.flush()

    for L in ctx.layouts.values():
        ctx.crop(L["cam"])
        papir_loop(ctx, L["cam"], d)  # prije dretvi, da ih ne rade dvije istovremeno
    segs, total = plan(ctx, A, B)
    log(f"raspon {fmt(A)}–{fmt(B)}, {total} frameova, {len(segs)} segmenata → {d}")
    aud = audio(ctx, A, B, d, log)

    def run(seg):
        cmd, out = segment_cmd(ctx, seg, d)
        if out.exists() and out.with_suffix(".ok").exists():
            return seg, None
        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode:
            return seg, r.stderr[-2000:]
        out.with_suffix(".ok").touch()
        return seg, None

    errors = 0
    with ThreadPoolExecutor(a.jobs) as ex:
        for done, (seg, err) in enumerate(ex.map(run, segs), 1):
            if err:
                errors += 1
                log(f"GREŠKA segment {seg['k']} {seg['video']} @ {fmt(seg['T0'])}:\n{err}")
            elif done % 20 == 0 or done == len(segs):
                log(f"segmenti {done}/{len(segs)}")
    if errors:
        log(f"Error: {errors} segmenata nije uspjelo, spajanje preskočeno")
        sys.exit(1)

    (d / "concat.txt").write_text("".join(f"file 'seg_{s['k']:04d}.mp4'\n" for s in segs))
    out = d / f"{name}.mp4"
    subprocess.run(["ffmpeg", "-hide_banner", "-nostdin", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0",
                    "-i", str(d / "concat.txt"), "-i", str(aud), "-map", "0:v", "-map", "1:a", "-c", "copy",
                    "-movflags", "+faststart", str(out)], check=True)
    log(f"gotovo: {out}")


if __name__ == "__main__":
    main()
