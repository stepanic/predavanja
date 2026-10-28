# Montaža predavanja 20.10.: sinkronizacija tragova i pregled

Nastavak [2026-10-21-montaza-raw-snimke.md](2026-10-21-montaza-raw-snimke.md). Svih pet
izvora poravnato je na jednu vremensku crtu. Rezultat je u `montaza/manifest.json`, a
pregledava se u lokalnom web appu `montaza/`, gdje se biraju početak i kraj YouTube snimke.

## Vremenska crta

`t = 0` je prvi uzorak RØDE snimke (`Recording 6.wav`), a to je 17:49:19,8 po satu
moto mobitela. Za svaki izvor vrijedi `t_crta = offsetSeconds + nudgeSeconds + scale · t_izvor`.

| Trag | Fajl | Počinje (s) | Završava (s) | Kako je poravnan | Kvaliteta |
|---|---|---|---|---|---|
| RØDE Connect | `Recording 6.wav` | 0 | 8333,3 | referenca | — |
| LUMIX | `P1400725.MP4` | +683,236 | 5463,1 | zvuk, GCC-PHAT, prozori 20 s | rezidual 4,5 ms RMS, drift +7,2 ppm |
| moto g86 | `VID_20261020_174551574.mp4` | −208,254 | 8641,9 | zvuk, GCC-PHAT, prozori 20 s | rezidual 25 ms RMS (max 55), drift −7,3 ppm |
| m4a s Drivea | `StartupVG AI radionica 2026-10-20.m4a` | +733,042 | 7838,5 | zvuk, `sync_cameras.py` | rezidual 3,1 ms RMS, drift −25,7 ppm |
| Screenshare | `20261020-1601-22.4383047.mp4` | +725,615 | 7877,3 | zidni sat | ±0,5 s, treba ručna provjera |

LUMIX pokriva samo 1 h 20 min (do 5463 s, oko 19:20). Nije razdijeljen u više fajlova,
nego na kartici postoji samo `P1400725.MP4`. Ostatak predavanja imaju samo moto i screenshare.

## Kako je mjereno

**Zvuk.** `producer.domovina.tv/scripts/sync_cameras.py --sync audio` s RØDE snimkom kao
masterom. Za m4a je prošao iz prve. Za LUMIX i moto je gruba korelacija bila čista
(LUMIX 5/5 prozora na +683,24 s), ali je fini prolaz s prozorima od 4 s pao: PSR je ispod
8 jer kamere stoje daleko i čuju jeku. `montaza/scripts/fine_sync.py` zato uvozi iste
funkcije i mjeri prozorima od 20 s oko grubog pomaka. Ishod: LUMIX 59/70 prozora, moto 69/72.
Moto ima veći rezidual jer je najdalje od govornika. 25 ms je ispod jednog framea.

**Screenshare nema zvučni trag.** Poravnan je po satu na Windows taskbaru. Minuta se
mijenja na t = 34,63 / 634,70 / 1534,80 / 2434,90 / 3634,07 / 4834,27 / 6034,43 / 6934,57 /
7114,57 s, pa je početak u 18:01:25,45 ±0,4 s, što se slaže s `creation_time` 16:01:25Z.
Razlika naspram vremena iz imena moto fajla (17:45:51,574, sat mobitela) daje +725,6 s na
crti. Nesigurnost je zbroj odstupanja dvaju satova (oba po NTP-u) i kašnjenja početka
snimanja na mobitelu, pa uzimam ±0,5 s. Ispravak se radi u appu, na promjeni slajda vidljivoj
u kameri, gumbima za pomak traga.

Zamka: `sync_cameras.py` ime traga uzima iz imena fajla iza zadnje crtice, pa se m4a u
`multicam_sync.json` zove `-3`.

## Datoteke

| Put | Što je |
|---|---|
| `montaza/manifest.json` | tragovi, pomaci, kvaliteta, odabir (`edit.inSeconds/outSeconds`, bilješke), `nudgeSeconds` |
| `montaza/sync/` | `multicam_sync.json` i `sync.log` iz `sync_cameras.py`, `fine_*.json` s točkama po prozoru |
| `montaza/scripts/fine_sync.py` | fini prolaz s dugim prozorima |
| `montaza/scripts/build_manifest.py` | sastavlja manifest iz `sync/`; čuva odabir i ručne pomake |
| `montaza/scripts/make_proxies.sh` | proxyji u `…/raw_montaza/proxy/` (540p H.264 bez zvuka + AAC po izvoru) i `peaks.py` |
| `montaza/server.py`, `montaza/app/` | web app za pregled |

## Pregled

```bash
python3 montaza/server.py        # http://127.0.0.1:8770/
```

Disk DOMOVINA2TB mora biti spojen, jer app čita proxyje s njega. App pokazuje monitore za
LUMIX, moto i screenshare, a vremenska crta prikazuje valne oblike i pokrivenost svakog
traga. Sluša se jedan zvučni trag (tipke 1–4 ili klik na monitor). Taj zvuk vodi sat, a
slike ga prate. Tipke I/O postavljaju početak i kraj, a svaka promjena odmah se upisuje u
`manifest.json`. Lipsync se provjerava tako da se pod sliku kamere pusti njezin vlastiti
zvuk, pa RØDE.

## Proxyji: softverski dekoder, ne VideoToolbox

Prvi pokušaj s `-hwaccel videotoolbox` na LUMIX-u nije dekodirao nijedan frame (svaki frame
„hardware accelerator failed to decode picture”). Pola sata je radila samo audio grana, a
video izlaz je ostao prazan. Pritom su oba fajla obični H.264 High 8-bit 4:2:0. Test na 10 s:

| Način | LUMIX | moto |
|---|---|---|
| `-hwaccel videotoolbox` + `scale` na CPU-u | greška na svakom frameu | 3,0 s |
| sve na GPU-u (`videotoolbox_vld` + `scale_vt`) | greška na svakom frameu | 2,9 s |
| softverski dekoder + `h264_videotoolbox` encoder | 1,9 s | 1,2 s |

Sa softverskim dekoderom LUMIX je gotov za 10 min, a moto za 13 min. Ako ffmpeg na fajlu
iz kamere troši malo CPU-a, a izlaz ne raste, treba pogledati stderr na „Decode error rate”.

## Transkript

Isti pristup kao u `most/e-satnica/e-satnica-sastanci`: riječi daje Speechmatics, govornike
pyannoteAI, a tekst po segmentu Gemini 3.8 Flash kroz `agy` (pretplata, tmux sesija `agymt`).
Ulaz je RØDE (dual-mono, L = R) kao mono mp3 64k, pa su vremena izravno na crti montaže.

- `montaza/transkript/pipeline/`: kopija skripti iz e-satnice. Promptovi su prilagođeni
  predavanju, a ključevi dolaze iz `~/.config/adria/*-domovinaenergy.env`. `package.json`
  s `"type": "commonjs"` je tu jer ovaj repo ima `"type": "module"`. Iz `run-tekst.sh` je
  maknut `pkill -f 'gk mcp'`, koji bi pogodio i druge agy sesije.
- pyannote: 442 segmenta, SPEAKER_07 = predavač (106 min), devet kratkih glasova (publika,
  domaćin). Speechmatics je predavača rascijepio na S5 i S1, pa govornici dolaze iz pyannotea.
- Kostur ima 365 segmenata (234 predavačeva). Prvih ~4 min (prije predavanja) Speechmatics
  je od šuma izmislio rečenice.
- `montaza/transkript/build_transkript.py` → `app/transkript.json` + `transkript/transkript.md`.
  Uzima Geminijev `rezultat.json` kad postoji, inače Speechmaticsov tekst.
- U appu: panel s transkriptom (klik = premotaj, pretraga, praćenje reprodukcije) i traka
  „Govor” (predavač i ostali).

### Soniox (pokrenut 2026-10-26 20:42)

`fetch.domovina.tv` od 25.10. ima redoslijed Soniox → Speechmatics → Canary
(`fetch.domovina.tv/docs/2026-10-25-asr-prioritet-soniox.md`). Soniox je na hrvatskom
bolji u 86 % slijepo preslušanih razlika i stoji ~$0,12/h. Pokrenut je fetchov skript bez
kopiranja, s ključem iz `~/.config/adria/soniox-domovinaenergy.env`:

```bash
D=montaza/transkript/izvori/soniox   # rode.mp3 -> ../rode-mono-64k.mp3 (symlink)
set -a; source ~/.config/adria/soniox-domovinaenergy.env; set +a
node ~/git/domovinatv/fetch.domovina.tv/transcribe_soniox.js --file $D/rode.mp3 --language hr --no-fallback
```

Izlaz ide uz audio: `rode.mp3.soniox.{json,words.json,srt,diarized.srt,meta.json}`.
Riječi su u formatu `{w, start, end, speaker, conf, punct?, eos?}` (`lib/asr/words.js`
`sonioxToWords`). Sonioxove govornike ignorirati, jer ih spaja, pa govornici i dalje dolaze iz pyannotea.

### Gemini prijepis gotov (2026-10-26 23:40)

204 min ukupno. Od 365 segmenata tekst za 313 daje Gemini, za 28 repair, a za 24 Speechmatics
(fail-safe). Zamka iz quality gatea se ostvarila na 0–62 s: repair je iz šuma napisao 6
rečenica (natječaj, državna matura). Te su ručno ispražnjene (`source: "rucno"`). Razgovor o
mikrostanovima na 77–181 s je stvaran. Segmente na 185–234 s treba poslušati.

Govornici: pyannote je predavača rascijepio na SPEAKER_07 (105 min) i SPEAKER_06 (4,7 min,
početak izlaganja i čekanje). SPEAKER_01 je Domagoj Ilečić, jer se sam predstavlja na 14:50.
Sva tri imena su u `izvori/imena-pyannote.json`.

## Odluka: početak i kraj YouTube snimke (2026-10-27)

**Konačno, potvrdio predavač:**

| | Crta | Zidni sat | Što se čuje |
|---|---|---|---|
| početak | 0:13:29,5 (809,5 s) | 18:02:49 | Domagoj: „A hoćemo mi, Matija, možda onda krenuti…” |
| kraj | 2:18:47,2 (8327,2 s) | 20:08:07 | Domagoj: „…na kiflice i sokove, koje smo pripremili za vas.” |

Trajanje je 2:05:17. Zapisano je u `montaza/manifest.json` → `edit.inSeconds` i `edit.outSeconds`.
Od izvora cijeli raspon pokrivaju RØDE, moto i screenshare. m4a završava na 7838,5 s, a LUMIX na 5463,1 s.

## Raspored slike: screenshare + predavač 9:16 (2026-10-27)

Odabran je raspored A: screenshare preko cijelog kadra 1920×1080 i predavač 9:16 (360×640, bijeli
okvir 4 px, 24 px od ruba) u donjem desnom kutu. Odbačen je raspored B (predavač preko cijele
visine desno, screenshare 1312 px širine lijevo), jer je sitan tekst terminala tamo teško čitljiv.
Od screensharea (1920×1200) ostaje `crop=1920:1080:0:72`: odreže se gornja traka i Windows taskbar.

U manifestu su to `layouts` `pip-moto` i `pip-lumix`. Biraju se kao slika u točkama reza, a app
ih pokazuje na monitoru „Program”. Zasad je uvod (Domagoj) LUMIX preko cijelog kadra, od
0:15:59 je `pip-moto`, a od 2:11:17, kad screenshare završava, moto preko cijelog kadra.

**Izrez prati predavača.** Krećeš se između govornice i ekrana, pa fiksni izrez nije dovoljan.
- `scripts/detect_people.swift`: Apple Vision `VNDetectHumanRectanglesRequest` nad proxyjem,
  svakih 0,5 s, bez ikakvih paketa. Moto (2 h 27 min) i LUMIX su gotovi za ~6 min, paralelno.
  Osoba nije nađena u 2,9 % (moto) i 3,5 % (LUMIX) frameova. Izlaz je `crop/<kamera>_people.json`.
- `scripts/track_crop.py` → `app/crop/<kamera>.json`: izrez 720×1280 iz 4K. Bira osobu najbližu
  prethodnom položaju (visina > 22 % kadra, tako da glave publike u prvom planu ne smetaju).
  Na to ide medijan 4 s, mrtva zona 16 % širine izreza i najviše 260 px/s. Za govornicom izrez
  stoji, a kad predavač ode do ekrana, glatko ga prati. Dok govori Domagoj (uvod i kraj), izrez
  prati njega.
- **WiFi lozinka za goste** je na papiru na govornici i u izrezu je čitljiva. Zamućuje se
  pravokutnik `blur` iz `track_crop.py`. Papir se kroz snimku pomakne do ~100 px u 4K, jer su
  se kamere malo pomaknule, pa je pravokutnik širi od papira. U renderu treba zamutiti i kadrove
  s kamerom preko cijelog ekrana.

## Pametno prebacivanje slike (`scripts/auto_cuts.py`)

Zvuk je posvuda RØDE (odluka predavača 2026-10-27). RØDE je na −50 LUFS, pa ga prije rendera
treba podići na −14 LUFS.

Osnovni kadar je `pip-moto`, a od njega se odstupa samo s razlogom. Razlog se upisuje u
`cuts[].why` i vidi se u appu:

| Razlog | Signal | Slika | Broj |
|---|---|---|---|
| pitanje iz publike | pyannote: govori netko drugi ≥ 1,5 s | LUMIX ako snima, inače moto | 20 |
| promjena u kutu ekrana | `sync/screen_activity.json`: razlika u kutu ispod izreza > 2 tijekom ≥ 3 s | samo screenshare | 54 |
| predavač je otišao do ekrana | izrez moto > 450 px lijevo od govornice | LUMIX/moto preko cijelog kadra | 6 |
| ekran miruje | razlika na ekranu < 0,3 ≥ 45 s | 9 s kamere svakih ~60 s, naizmjence LUMIX/moto | 38 |

Pravila: osnovni kadar između dva odstupanja traje barem 8 s, inače se produlji prethodni kadar.
Granice padaju u najbližu pauzu između riječi (≥ 0,25 s, do ±1,5 s, iz Sonioxa). Kod
screensharea rez dolazi 0,5 s prije promjene, jer tu vodi sadržaj, a ne govor.

Rezultat: 230 točaka, rez otprilike svakih 30 s. Udjeli: pip-moto 61 %, moto 16 % (uključuje
7,5 min kraja bez screensharea), screenshare 16 %, LUMIX 6 %. Prvi pokušaj (prag 2 s, spajanje
4 s, osnovni kadar ≥ 4 s) dao je 301 točku s 86 prebacivanja na screenshare, što je bilo
nemirno. Aktivnost ekrana: ekran miruje 83 % vremena, a kut je aktivan 8 %.

Ponovno generiranje prepisuje sve točke između prve `pip-` točke i kraja screensharea, a zvuk
uzima iz dotadašnjih točaka. Ručne izmjene u appu dobivaju `why: "ručno"`, ali se pri ponovnom
generiranju ne čuvaju. Zato skriptu treba pokrenuti prije ručnog dotjerivanja, a ne poslije.

## Prijedlog početka i kraja (`app/semantika.json`)

Iz transkripta, s vremenima riječi iz Sonioxa i pljeskom iz valnog oblika RØDE-a. U appu su
isprekidane crte i panel s gumbima „poslušaj”, „postavi” i „Prihvati prijedlog”. Manifest se
ne mijenja dok predavač to sam ne potvrdi.

| | t (s) | Crta | Što |
|---|---|---|---|
| **početak** | 815,3 | 0:13:35 | Domagoj: „Evo, dobar dan i dobro nam došli…” |
| početak | 809,5 | 0:13:29 | s dogovorom „hoćemo mi, Matija, krenuti” |
| početak | 958,9 | 0:15:59 | predavač „Hvala, Domagoju”, bez uvoda |
| **kraj** | 8320,8 | 2:18:40 | pljesak nakon „Hvala vam puno”, fade-out ~1,5 s |
| kraj | 8300,0 | 2:18:20 | „…vidimo se neki drugi put” |
| kraj | 8327,2 | 2:18:47 | s Domagojevim pozivom na kiflice |

Glavni prijedlog traje 2 h 5 min 5 s. Pljesak traje 8315–8320 s, a Domagoj govori preko
njegova kraja.

## Render (`scripts/render.py`, 2026-10-27)

```bash
python3 -I montaza/scripts/render.py --od 0:36:00 --do 0:38:00   # probni isječak
python3 -I montaza/scripts/render.py                              # cijeli edit in–out
```

Izlaz ide u `<rawDir>/render/<ime>/` na DOMOVINA2TB, sa segmentima, `concat.txt`,
`audio.m4a` i `render.log`. **Sve ide na vanjski disk**, jer primarni disk ima ~7–11 GB
slobodno. U repo ide samo `montaza/render_loudnorm.json`, s izmjerenim vrijednostima zvuka.

**Slika.** Jedan ffmpeg po točki reza, na mreži od 30 fps od početka raspona. Segment ima
`round((t_kraj−A)·30) − round((t_poč−A)·30)` frameova i radi s `-frames:v`, a segmenti se spajaju
concat demuxerom s `-c copy`. Proba od 2 min dala je točno 3600 frameova. Izlaz je 30 fps, jer su moto i
screenshare 30p (zajedno ~93 %), a LUMIX 25p dobiva duplicirane frameove. Vrijeme izvora je
`(T − offset − nudge)/scale`, s `-ss` ispred svakog ulaza (točno traženje kod ponovnog kodiranja).
- Kamera 4K → `scale=1920:1080:lanczos` → WiFi pravokutnik iz `crop/<kamera>.json` (u 1080p)
  `crop` + `boxblur=12:3` + `overlay`. Isti lanac ide za pip i za kameru preko cijelog kadra.
- Pip: izrez 360×640 iz kamere u 1080p, što je isto kao 720×1280 iz 4K. `sendcmd` po
  frameu (`crop@pc x/y`) s linearnom interpolacijom putanje od 0,5 s, jer bi skok svakih
  0,5 s bio trzav. Bijeli `pad` 4 px, overlay na `1920−24−360−4`, `1080−24−640−4`.
- Encoder je `h264_videotoolbox` 12 Mb/s (max 18), a dekoder softverski.
- Fade: slika i zvuk 0,5 s na ulazu, 1,5 s na izlazu.

**Brzina:** 10 s 4K kamere (dekodiranje, skaliranje, blur, enkodiranje) traje 1,6 s, pip segment
1,7 s, a samo screenshare 1,5 s. Proba je trajala 3,5 min, jer je gotovo sve vrijeme otišlo na
jednokratno mjerenje glasnoće cijelog edita (`afftdn` na 2 h zvuka). Ta je vrijednost sad u
spremištu. Procjena za cijeli video: 15–25 min uz `-j 3`.

**Zvuk.** Šum RØDE-a je mjeren na najtiših 5 % prozora od 100 ms u pet komada od po 5 min i
iznosi −69 do −73 dBFS, a medijan je ~−54. „Pauze” između Sonioxovih riječi (≥ 2 s) daju −52 do −66,
jer u njima ima jeke i publike, pa nisu dobra mjera šuma. L i R su identični (L−R = −inf).
Lanac: `pan` L u oba kanala → `volume=30dB` → `highpass=80` → `afftdn=nr=8:nf=-40:tn=1` →
`loudnorm I=-14:TP=-1:LRA=11`. Pojačanje ide prvo, jer `afftdn` šum zadaje apsolutno (nf ≥ −80 dB).
Prvi prolaz loudnorma mjeri **cijeli edit** (ulaz −18,8 LUFS, +17,0 dBTP, LRA 7), pa proba i
cijeli video dobiju isti gain. U drugom prolazu `linear=true` se zbog vrhova od +17 dBTP sam
prebaci u dinamički način s limiterom. Proba na kraju: −13,7 LUFS, −1,0 dBTP nakon AAC 256k.

`fetch.domovina.tv/normalize_loudness.js` je dva prolaza namjerno odbacio i koristi jedan
dinamički prolaz (−16 LUFS, −2 dBTP), jer im je linearni gain klipao (+0,4 dBTP). Ovdje je ishod
isti, ali zahvaljujući mjerenju cijelog edita isječci ne dobivaju svaki svoju razinu.

## Cijeli render i YouTube paket (2026-10-28)

`render.py` je za cijeli edit radio ~25 min (-j 3). Rezultat je
`…/render/ai-u-praksi_1080p/ai-u-praksi_1080p.mp4`: 4,8 GB, 225 531 frameova, 2:05:17,7,
−14,0 LUFS, LRA 6,4, true peak −0,7 dBTP (AAC prebacuje cilj −1,0 za 0,3 dB, pa render nije ponovljen).
Pregledano je pet rezova i svi su u redu. Probni isječak je na Driveu u `google_drive_ms:ai-u-praksi-montaza/`.

YouTube paket je u `montaza/youtube/` (kopija uz video u `…/render/youtube/`): naslov i postavke
(`README.md`), opis s 36 poglavlja (`opis.txt`), SRT iz Sonioxovih riječi (`scripts/titlovi.py`)
i thumbnail (`thumbnail.html` → `render_thumbnail.mjs`).

**4K:** obje kamere su 3840×2160, a screenshare je 1920×1200. 4K render bi dao pravi 4K samo u
kadrovima kamere, ali YouTube 4K upload kodira VP9/AV1 s većim bitrateom, pa je i tekst terminala
oštriji. Procjena je ~1–1,5 h rendera i 15–20 GB. Čeka korisnikovu odluku.

## Otvoreno (stanje 2026-10-28)

- **Upload na YouTube** radi korisnik ručno, po `montaza/youtube/README.md`. Prvo Unlisted.
- **Ručni pregled rezova** u appu: 230 automatskih točaka. Ako ritam ne odgovara, promijeniti
  pragove u `auto_cuts.py` i generirati ponovno, prije ručnih ispravaka.
- **Soniox naspram Gemini teksta**: kostur Soniox + pyannote (`prep_kostur.py` čita samo
  Speechmatics) i usporedba nisu napravljeni. U appu je Gemini tekst.
- **Segmenti 185–234 s** u transkriptu su nepouzdani. To je prije početka snimke, pa nije hitno.
- **Semantički korak** za YouTube (naslov, opis, poglavlja, isječci za kratke klipove).
- **Screenshare** je poravnat na ±0,5 s i nije fino provjeren na promjeni slajda.

## Sljedeći korak

Kad korisnik potvrdi probni isječak: cijeli render u pozadini (`python3 -I montaza/scripts/render.py`),
s obavijesti samo na kraju ili kod greške. Zatim provjera trajanja (2:05:17,7, 225 531 frameova), glasnoće i
nekoliko rezova, pa YouTube (naslov, opis, poglavlja).
