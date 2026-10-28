#!/usr/bin/env python3
"""Titlovi za YouTube iz Sonioxovih riječi, na vremenu montiranog videa.

Ulaz:  transkript/izvori/soniox/rode.mp3.soniox.words.json (vrijeme na crti, RØDE t = 0)
       manifest.json → edit.inSeconds / edit.outSeconds
Izlaz: youtube/ai-u-praksi.hr.srt

Cue: najviše 2 retka po 42 znaka i 6 s; prelama na kraju rečenice, na stanci > 0,7 s
ili kad bi redak prerastao. Riječi s pouzdanošću ispod 0,35 se ne izbacuju, jer je
Soniox i tad većinom u pravu.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MAX_CHARS, MAX_LINES, MAX_DUR, GAP = 42, 2, 6.0, 0.7
ISPRAVCI = {"Startup VG": "StartupVG", "Whisper Flow": "Wispr Flow"}


def fmt(t):
    ms = round(t * 1000)
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def tokens(words):
    """Spoji interpunkciju na prethodnu riječ: [(tekst, start, end, kraj_recenice)]."""
    out = []
    for w in words:
        if w.get("punct") and out:
            txt, s, e, _ = out[-1]
            out[-1] = (txt + w["w"], s, e, w["w"] in ".?!…")
        elif not w.get("punct"):
            out.append((w["w"], w["start"], w["end"], bool(w.get("eos"))))
    return out


def wrap(words):
    lines, cur = [], ""
    for w in words:
        if cur and len(cur) + 1 + len(w) > MAX_CHARS:
            lines.append(cur)
            cur = w
        else:
            cur = f"{cur} {w}" if cur else w
    return lines + ([cur] if cur else [])


def cues(toks):
    out, cur = [], []
    for tok in toks:
        if cur:
            gap = tok[1] - cur[-1][2]
            too_long = len(wrap([t[0] for t in cur + [tok]])) > MAX_LINES
            if gap > GAP or too_long or tok[2] - cur[0][1] > MAX_DUR:
                out.append(cur)
                cur = []
        cur.append(tok)
        if tok[3] and len(" ".join(t[0] for t in cur)) > MAX_CHARS // 2:
            out.append(cur)
            cur = []
    return out + ([cur] if cur else [])


def main():
    m = json.loads((ROOT / "manifest.json").read_text())
    A, B = m["edit"]["inSeconds"], m["edit"]["outSeconds"]
    words = json.loads((ROOT / "transkript/izvori/soniox/rode.mp3.soniox.words.json").read_text())["words"]
    words = [w for w in words if A <= w["start"] < B]
    cs = cues(tokens(words))
    rows = []
    for i, c in enumerate(cs):
        s = c[0][1] - A
        e = max(c[-1][2] - A + 0.25, s + 0.8)
        if i + 1 < len(cs):
            e = min(e, cs[i + 1][0][1] - A)  # kraj cuea ne prelazi početak sljedećeg
        rows.append(f"{i + 1}\n{fmt(s)} --> {fmt(e)}\n" + "\n".join(wrap([t[0] for t in c])) + "\n")
    out = ROOT / "youtube" / "ai-u-praksi.hr.srt"
    out.parent.mkdir(exist_ok=True)
    text = "\n".join(rows)
    for a, b in ISPRAVCI.items():
        text = text.replace(a, b)
    out.write_text(text)
    print(f"{len(rows)} cueova → {out}")


if __name__ == "__main__":
    main()
