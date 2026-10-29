# AI u praksi, StartupVG Masterclass, 20. 10. 2026.

Dvosatno predavanje o svakodnevnom radu s AI agentima, održano u poduzetničkom inkubatoru StartupVG u Velikoj Gorici (domaćin Domagoj Ilečić, ravnatelj inkubatora). Bez klasičnih slajdova: pitanja publike stizala su u WhatsApp grupu, Claude Code ih je obrađivao uživo, a na platnu je bio katalog projekata. Snimka: [youtu.be/QkcpHsj43rE](https://youtu.be/QkcpHsj43rE).

Ova mapa dokumentira tri faze, od kojih je svaka napravljena s AI-jem.

Pregled cijelog tijeka s dijagramima, odlukama i stvarnim promptovima: [`KAKO-JE-NASTALO.md`](KAKO-JE-NASTALO.md).

## 1. Priprema

- Istraživanje o prezentacijama vođenima govorom, proaktivnom dohvaćanju i hrvatskom streaming ASR-u: [`docs/research/`](docs/research/) (izvori su samo poveznice).
- Plan predavanja iz probe: [`docs/event/priprema/`](docs/event/priprema/).
- Katalog javnih projekata: kartice u [`data/cards/`](data/cards/), slike u `data/media/`, alati u [`tools/catalog/`](tools/catalog/) (shema kartice: [`CARD_SCHEMA.md`](tools/catalog/CARD_SCHEMA.md)).
- Najava, naslovnice i tekstovi objava: [`docs/event/`](docs/event/).

## 2. Interakcija uživo

- Aplikacija za platno ([`app/`](app/)): mreža kartica projekata i `stage` prikaz. Poslužuje se iz [`tools/deploy/build.py`](tools/deploy/build.py) kao statika na Cloudflareu.
- WhatsApp grupa predavanja: pitanja publike prati [`tools/wa_watch.py`](tools/wa_watch.py), a Claude Code odgovara i otvara odgovarajuću karticu. Opis: [`docs/event/whatsapp-grupa/`](docs/event/whatsapp-grupa/) i [`docs/2026-09-30-sync-kataloga-i-whatsapp-pitanja.md`](docs/2026-09-30-sync-kataloga-i-whatsapp-pitanja.md).
- Demo uživo iz pitanja iz grupe, izmišljena web stranica tvrtke s kontakt formom: [`demo/web-tvrtka/`](demo/web-tvrtka/), zapis u [`docs/2026-10-20-demo-web-tvrtka-uzivo.md`](docs/2026-10-20-demo-web-tvrtka-uzivo.md).

## 3. Montaža snimke

Montaža je radila na sirovim snimkama dviju kamera (LUMIX i mobitel), snimci zaslona i zvuku s RØDE mikrofona. Zapis cijelog tijeka: [`docs/2026-10-26-montaza-sinkronizacija.md`](docs/2026-10-26-montaza-sinkronizacija.md) i [`docs/2026-10-21-montaza-raw-snimke.md`](docs/2026-10-21-montaza-raw-snimke.md).

- Sinkronizacija tragova: [`montaza/scripts/`](montaza/scripts/) (`build_manifest.py`, `fine_sync.py`, `peaks.py`), rezultati u [`montaza/sync/`](montaza/sync/).
- Automatski rezovi između kamera i ekrana: `auto_cuts.py`, `screen_activity.py`.
- Praćenje predavača u 9:16 izrezu: `detect_people.swift`, `track_crop.py`, koordinate u [`montaza/crop/`](montaza/crop/).
- Logotipi preko WiFi papira na govornici: `track_papir.py`.
- Pregled i uređivanje rezova u pregledniku: [`montaza/app/`](montaza/app/) i [`montaza/server.py`](montaza/server.py).
- Render po segmentima u 1080p iz 4K izvora, glasnoća −14 LUFS: `render.py`, `make_proxies.sh`.
- YouTube paket (opis s poglavljima, thumbnail): [`montaza/youtube/`](montaza/youtube/). Titlovi se generiraju iz prijepisa pomoću `titlovi.py`, ali nisu u repou.

## 4. Explaineri

Kratki animirani filmovi (HyperFrames) koji prepričavaju pojedine ideje s predavanja, prvi je „Zašto je AI danas tako jeftin”: [`explaineri/`](explaineri/).

## Karta mapa

| Mapa | Sadržaj |
|---|---|
| `app/` | web aplikacija za platno (mreža kartica, stage, WhatsApp QR modul) |
| `data/` | samo javne kartice projekata, `catalog.json`, rang, slike |
| `demo/web-tvrtka/` | demo stranica napravljena uživo |
| `explaineri/` | animirani explaineri (HyperFrames projekti) |
| `docs/` | bilješke po danima, `event/` (najava, naslovnice, priprema), `research/` (istraživanje) |
| `montaza/` | skripte, preglednik, manifest, sinkronizacija, YouTube paket |
| `tools/` | izrada kataloga, deploy, praćenje WhatsAppa |

## Što nije u repou

- Prijepisi snimke i probe, dijarizacija i izvori ASR-a. Sadrže govor publike i trećih osoba.
- Titlovi (`.srt`) i `montaza/app/transkript.json`, iz istog razloga.
- Neobjavljeni projekti: kartice koje nisu javne, njihove slike i svi agregati koji ih spominju. Uključene su samo kartice s oznakom `public`. Izbačeni su i podaci o broju Claude sesija i lokalne putanje.
- Skripte za izradu kataloga koje čitaju privatne lokalne repozitorije i bilješke.
- Cjeloviti tekstovi znanstvenih radova i bilješke s doslovnim citatima (samo poveznice u `docs/research/sources/`).
- Sirove snimke (video i audio), proxyji i renderi. Nalaze se na vanjskom disku.
- Poveznica pozivnice i QR kodovi WhatsApp grupe, identifikatori grupe, lozinka WiFi mreže.
- Starije verzije naslovnica i veće slike.
- Cloudflare account ID (u `wrangler.jsonc` je `<CLOUDFLARE_ACCOUNT_ID>`).

Zbog toga neke skripte i dokumenti spominju datoteke koje ovdje ne postoje (npr. `transkript.json`, `metrics.json`). Alat `tools/catalog/rank.py` traži `data/metrics.json`, a `app/wa.js` traži vlastiti `window.WA_URL` i `wa-qr.svg`.

## Licenca

Kod: MIT (vidi [`../LICENSE`](../LICENSE)). Logotipi i slike trećih strana, npr. logotip StartupVG-a u `docs/event/covers/logos/`, nisu pokriveni MIT licencom.
