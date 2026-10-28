#!/usr/bin/env python3
"""Generira varijante Luma covera (1600×1600 CSS, render 2× → 3200×3200).

Svaka varijanta ima drugi raspored screenshotova iz data/media, a isti tekst.
Render: node docs/event/covers/render.mjs
"""
from pathlib import Path

HERE = Path(__file__).parent
MEDIA = "../../../data/media"
IDS = """stadion-maksimir-stadion-maksimir-natjecaj-2026 deooptimomaximo-pediludium
domovinatv-domovina-ai podcasterium-podcasterium-app domovinatv-karta-hrvatske
domovinatv-izbori-domovina-ai domovinatv-domovina-stats domovinatv-rodjendaonice-domovina-ai
domovinatv-crkve-domovina-ai ss-hrvatski-amaterski-nogometni-klubovi domovinatv-oou-domovina-ai
domovinatv-stranke-domovina-ai pinka-finance-app tehnoetika-chatcontrol-timeline
domovinatv-zakoni-domovina-ai domovinatv-domovina-rag novcanik-prototipovi stepanic-committers-top""".split()


def img(i, cls=""):
    return f'<img class="{cls}" src="{MEDIA}/{i}.jpg">'


BASE = """<!doctype html><html lang="hr"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0}
body{width:1600px;height:1600px;background:#0b1020;font-family:Inter,system-ui,sans-serif;color:#fff;overflow:hidden;position:relative}
img{display:block;object-fit:cover;object-position:top;border-radius:14px;box-shadow:0 12px 36px rgba(0,0,0,.5)}
.brand{display:flex;align-items:center;gap:36px}
.brand img{height:150px;width:auto;border-radius:0;box-shadow:none;object-fit:contain}
.kicker{display:inline-block;font-weight:700;font-size:34px;letter-spacing:.08em;text-transform:uppercase;color:#0b1020;background:#ffd23f;padding:10px 20px;border-radius:10px}
h1{font-weight:800;font-size:124px;line-height:1.0;letter-spacing:-.03em;margin-top:32px}
h1 span{color:#ffd23f}
.sub{font-weight:500;font-size:44px;line-height:1.3;margin-top:28px;color:#d5dbef}
.meta{display:flex;justify-content:space-between;align-items:flex-end;margin-top:54px;padding-top:34px;border-top:3px solid rgba(255,255,255,.18);font-size:40px;font-weight:700}
.meta small{display:block;font-weight:500;font-size:32px;color:#aab3cf;margin-top:8px}
%CSS%
</style></head><body>
%BG%
<div class="text">
  <div class="brand"><img src="logos/startupvg-white.png" alt="StartupVG poduzetnički inkubator"><div class="kicker">AI u praksi</div></div>
  <h1>%TITLE%</h1>
  <div class="sub">Žive aplikacije umjesto slajdova. Ti pitaš, a ja pokazujem ono što tebi treba.</div>
  <div class="meta">
    <div>Matija Stepanić<small>predavanje i otvorena pitanja</small></div>
    <div style="text-align:right">Uto 20. 10. · 18:00<small>Podložnica 6, Velika Gorica</small></div>
  </div>
</div>
</body></html>"""

TITLE = "30+ živih projekata<br><span>godina i pol s AI-jem</span>"
TEXT_BOTTOM = ".text{position:absolute;left:96px;right:96px;bottom:92px}"

variants = {}

# 1 — izvorni: nagnuti zid 4 stupca
variants["1-nagnuti-zid"] = (
    TEXT_BOTTOM + """
.grid{position:absolute;inset:-60px;display:grid;grid-template-columns:repeat(4,1fr);gap:22px;transform:rotate(-6deg) scale(1.12);opacity:.9}
.grid img{width:100%;aspect-ratio:16/9}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(11,16,32,.15) 0%,rgba(11,16,32,.6) 32%,rgba(11,16,32,.95) 47%,#0b1020 100%)}""",
    '<div class="grid">' + "".join(img(i) for i in IDS[:20] + IDS[:4]) + '</div><div class="shade"></div>',
)

# 2 — bento: jedan veliki (Maksimir) + manji oko njega, ravno, gore
variants["2-bento"] = (
    TEXT_BOTTOM + """
.bento{position:absolute;left:64px;right:64px;top:64px;height:760px;display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(3,1fr);gap:18px}
.bento img{width:100%;height:100%}
.bento .big{grid-column:1/3;grid-row:1/3}
.bento .wide{grid-column:3/5}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,transparent 0%,transparent 44%,rgba(11,16,32,.85) 54%,#0b1020 60%)}""",
    '<div class="bento">' + img(IDS[0], "big") + img(IDS[1], "wide") + "".join(img(i) for i in IDS[2:8]) + '</div><div class="shade"></div>',
)

# 3 — 3D perspektiva: zid koji se udaljava u dubinu
variants["3-perspektiva"] = (
    TEXT_BOTTOM + """
.stage{position:absolute;inset:0;perspective:1400px;perspective-origin:50% 0%}
.wall{position:absolute;left:-200px;right:-200px;top:-120px;display:grid;grid-template-columns:repeat(5,1fr);gap:24px;transform:rotateX(38deg) rotateZ(-8deg);transform-origin:50% 0}
.wall img{width:100%;aspect-ratio:16/10}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(11,16,32,0) 0%,rgba(11,16,32,.35) 30%,rgba(11,16,32,.95) 58%,#0b1020 66%)}""",
    '<div class="stage"><div class="wall">' + "".join(img(i) for i in (IDS * 2)[:25]) + '</div></div><div class="shade"></div>',
)

# 4 — stupci s pomakom (kao da se skrolaju), tekst preko lijevo-dolje
variants["4-stupci"] = (
    TEXT_BOTTOM + """
.cols{position:absolute;inset:-40px -40px 0 -40px;display:flex;gap:22px}
.col{flex:1;display:flex;flex-direction:column;gap:22px}
.col img{width:100%;aspect-ratio:9/12}
.col:nth-child(1){margin-top:-220px}.col:nth-child(2){margin-top:-40px}.col:nth-child(3){margin-top:-320px}.col:nth-child(4){margin-top:-120px}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(11,16,32,.1) 0%,rgba(11,16,32,.5) 36%,rgba(11,16,32,.96) 60%,#0b1020 100%)}""",
    '<div class="cols">' + "".join(
        '<div class="col">' + "".join(img(i) for i in IDS[k::4][:4]) + "</div>" for k in range(4)
    ) + '</div><div class="shade"></div>',
)

# 5 — preglednik: Maksimir u velikom browser okviru, lepeza ostalih iza
variants["5-preglednik"] = (
    TEXT_BOTTOM + """
.fan img{position:absolute;width:640px;aspect-ratio:16/9;opacity:.55}
.browser{position:absolute;left:170px;top:90px;width:1260px;border-radius:22px;overflow:hidden;background:#1b2238;box-shadow:0 30px 80px rgba(0,0,0,.6);transform:rotate(-2deg)}
.bar{height:56px;display:flex;align-items:center;gap:12px;padding:0 22px;background:#232b45}
.bar i{width:16px;height:16px;border-radius:50%;background:#ff5f57}.bar i:nth-child(2){background:#febc2e}.bar i:nth-child(3){background:#28c840}
.bar b{margin-left:20px;flex:1;height:32px;border-radius:9px;background:#141a2e;color:#aab3cf;font:500 20px Inter;display:flex;align-items:center;padding-left:16px}
.browser img{width:100%;aspect-ratio:16/9;border-radius:0;box-shadow:none}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,transparent 0%,transparent 42%,rgba(11,16,32,.9) 54%,#0b1020 60%)}""",
    '<div class="fan">'
    + "".join(
        f'<img src="{MEDIA}/{i}.jpg" style="left:{x}px;top:{y}px;transform:rotate({r}deg)">'
        for i, (x, y, r) in zip(IDS[1:9], [(-120, 40, -12), (1080, 20, 10), (-160, 420, 8), (1120, 400, -9), (300, -160, 4), (760, -170, -5), (-60, 700, -6), (1040, 690, 7)])
    )
    + '</div><div class="browser"><div class="bar"><i></i><i></i><i></i><b>maksimir.domovina.ai/glasanje</b></div>'
    + img(IDS[0]) + '</div><div class="shade"></div>',
)

# 1 u 16:9 (1920×1080 CSS → 3840×2160) za kartice na startupvg.hr/vijesti,
# koje sliku režu na aspect-ratio 16/9 s object-fit: cover
variants["1-nagnuti-zid-16x9"] = (
    """body{width:1920px;height:1080px}
.text{position:absolute;left:88px;right:88px;bottom:64px}
.brand{gap:30px}.brand img{height:104px}.kicker{font-size:28px}
h1{font-size:100px;margin-top:22px}
.sub{font-size:36px;margin-top:18px}
.meta{margin-top:30px;padding-top:24px;font-size:34px}.meta small{font-size:27px}
.grid{position:absolute;inset:-80px;display:grid;grid-template-columns:repeat(5,1fr);gap:22px;transform:rotate(-6deg) scale(1.12);opacity:.9}
.grid img{width:100%;aspect-ratio:16/9}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(11,16,32,.15) 0%,rgba(11,16,32,.65) 18%,rgba(11,16,32,.95) 34%,#0b1020 100%)}""",
    '<div class="grid">' + "".join(img(i) for i in IDS[:20] + IDS[:10]) + '</div><div class="shade"></div>',
)

# 1 univerzalni: kvadrat 1:1, sav tekst u srednjoj traci visine 9/16 (y 350–1250).
# Web isti upload reže na 16:9 (liste), 4:3 (slider na početnoj) i 1:1 (detail),
# a sva tri reza zadržavaju tu traku cijelu.
variants["1-nagnuti-zid-univerzal"] = (
    """.text{position:absolute;left:84px;right:84px;top:350px;height:900px;display:flex;flex-direction:column;justify-content:center}
.brand{gap:30px}.brand img{height:118px}.kicker{font-size:30px}
h1{font-size:132px;margin-top:22px}
.sub{font-size:40px;margin-top:18px}
.meta{margin-top:30px;padding-top:24px;font-size:38px}.meta small{font-size:30px}
.grid{position:absolute;inset:-80px;display:grid;grid-template-columns:repeat(4,1fr);gap:22px;transform:rotate(-6deg) scale(1.12);opacity:.9}
.grid img{width:100%;aspect-ratio:16/9}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(11,16,32,.15) 0%,rgba(11,16,32,.7) 16%,rgba(11,16,32,.96) 24%,#0b1020 50%,rgba(11,16,32,.96) 76%,rgba(11,16,32,.7) 84%,rgba(11,16,32,.2) 100%)}""",
    '<div class="grid">' + "".join(img(i) for i in IDS[:20] + IDS[:12]) + '</div><div class="shade"></div>',
)

for name, (css, bg) in variants.items():
    html = BASE.replace("%CSS%", css).replace("%BG%", bg).replace("%TITLE%", TITLE)
    (HERE / f"{name}.html").write_text(html)
print("\n".join(variants))

# Najava dan prije (19. 10.): WhatsApp status 9:16 (1080×1920 → 2160×3840) i LinkedIn 4:5
# (1080×1350 → 2160×2700). Statusu WhatsApp gore i dolje preklapa sučelje, pa tekst
# ostaje između ~y 300 i ~y 1650.
SOON_TEXT = """
<div class="text">
  <div class="brand"><img src="logos/startupvg-white.png" alt="StartupVG poduzetnički inkubator"><div class="kicker">Sutra · 18:00</div></div>
  <h1>AI u praksi<br><span>pitaj što tebi treba</span></h1>
  <div class="sub">30+ živih projekata napravljenih s AI agentima. Smjer određuju tvoja pitanja, naglas ili preko WhatsAppa.</div>
  <div class="meta">
    <div>Matija Stepanić<small>predavanje i pitanja</small></div>
    <div style="text-align:right">Uto 20. 10. · 18:00<small>StartupVG, Podložnica 6, Velika Gorica</small></div>
  </div>
  <div class="cta">Besplatno, uz prijavu · <b>luma.com/bsd0tedr</b></div>
</div>"""
SOON_CSS = """
.cta{margin-top:34px;font-size:34px;font-weight:500;color:#d5dbef}
.cta b{color:#ffd23f;font-weight:700}
.grid{position:absolute;display:grid;gap:22px;transform:rotate(-6deg) scale(1.12);opacity:.9}
.grid img{width:100%;aspect-ratio:16/9}"""

soon = {}
soon["sutra-status-9x16"] = (
    """body{width:1080px;height:1920px}
.text{position:absolute;left:68px;right:68px;top:700px}
.brand{gap:26px}.brand img{height:92px}.kicker{font-size:28px}
h1{font-size:112px;margin-top:30px}
.sub{font-size:40px;margin-top:26px}
.meta{flex-direction:column;align-items:flex-start;gap:26px;margin-top:40px;padding-top:30px;font-size:40px}
.meta>div{text-align:left!important}.meta small{font-size:31px}
.cta{font-size:32px}""" + SOON_CSS + """
.grid{inset:-120px -160px auto -160px;height:900px;grid-template-columns:repeat(3,1fr)}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(11,16,32,.2) 0%,rgba(11,16,32,.55) 22%,rgba(11,16,32,.95) 33%,#0b1020 40%,#0b1020 100%)}""",
    '<div class="grid">' + "".join(img(i) for i in IDS[:18]) + '</div><div class="shade"></div>',
)
soon["sutra-linkedin-4x5"] = (
    """body{width:1080px;height:1350px}
.text{position:absolute;left:68px;right:68px;bottom:64px}
.brand{gap:26px}.brand img{height:88px}.kicker{font-size:27px}
h1{font-size:100px;margin-top:26px}
.sub{font-size:36px;margin-top:22px}
.meta{margin-top:32px;padding-top:26px;font-size:34px}.meta small{font-size:26px}
.cta{font-size:30px;margin-top:26px}""" + SOON_CSS + """
.grid{inset:-120px -160px auto -160px;height:760px;grid-template-columns:repeat(3,1fr)}
.shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(11,16,32,.15) 0%,rgba(11,16,32,.6) 24%,rgba(11,16,32,.95) 38%,#0b1020 46%,#0b1020 100%)}""",
    '<div class="grid">' + "".join(img(i) for i in IDS[:18]) + '</div><div class="shade"></div>',
)

# Na dan predavanja (20. 10.) iste slike s „Danas” i svježim brojem živih projekata.
TODAY_TEXT = SOON_TEXT.replace("Sutra · 18:00", "Danas · 18:00").replace("30+ živih", "40+ živih")
for name in list(soon):
    soon[name.replace("sutra-", "danas-")] = soon[name]

for name, (css, bg) in soon.items():
    html = BASE.replace("%CSS%", css).replace("%BG%", bg)
    text = TODAY_TEXT if name.startswith("danas-") else SOON_TEXT
    html = html[: html.index('<div class="text">')] + text.strip() + "\n</body></html>"
    (HERE / f"{name}.html").write_text(html)
print("\n".join(soon))
