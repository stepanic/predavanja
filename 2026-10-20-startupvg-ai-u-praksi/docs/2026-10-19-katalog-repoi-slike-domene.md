# Katalog: GitHub repoi, slike za svaki projekt i istekle domene (19. 10. 2026.)

Vezani dokumenti: [`2026-09-30-sync-kataloga-i-whatsapp-pitanja.md`](2026-09-30-sync-kataloga-i-whatsapp-pitanja.md),
[`tools/catalog/CARD_SCHEMA.md`](../tools/catalog/CARD_SCHEMA.md), [`event/whatsapp-grupa/`](event/whatsapp-grupa/README.md).

## Repoi (`urls.repos`, `tools/catalog/repos.py`)

- Izvori su git remotei lokalnih kopija iz `data/card-inputs/*.paths` (i od duplikata)
  te `sources`. **Bilješke iz `ecosystem-brain/` su isključene**, inače bi taj repo
  završio na svakoj kartici koja ih citira.
- Repo ostaje samo ako `gh` kaže da imaš ADMIN/MAINTAIN/WRITE. Time otpadaju tuđi
  upstreami (Shopify/dawn, httpsms, lharries/whatsapp-mcp kao origin).
- Kopije se traže u `~/git`, `/Volumes/DOMOVINA2TB/git` i `/Volumes/DOMOVINA1TB/git`
  (ista relativna putanja). Bez diskova se 30 kopija ne vidi i repoi tiho nestanu,
  zato skriptu pokreći samo kad su diskovi spojeni.
- Nije nađeno: `gorica/novcanik` (dvosmisleno: `most/novcanik` ili `e-demokracija/novcanik`),
  `ss/hrvatski-amaterski-nogometni-klubovi`, `stepanic/adhd-provjera`,
  još jedan registry repo. `legacy/map.domovina.ai` nema remote.
- Stanje 19. 10.: 130 kartica s repoom, 87 javnih i 60 privatnih repoa. Na webu je
  94 projekta, a javni kod ima njih oko 65. Zato u objavama ne pisati „gotovo svi
  su open source”.

## Slike

- `repo_media.py`: ručno odabrane slike iz repoa i govornikovi screenshotovi
  (`<id>=<putanja>`, origin `user`). Omjer 1,6–2,1 reže se na 16:9 od gornjeg lijevog
  kuta (tako logo ostaje), a ostalo ide cijelo na zamućenu pozadinu.
- Odbačeno: fotka pošiljke Modrićeva dresa (adresna naljepnica), logo
  domovina-walleta (AI stock slika).
- `cover.mjs`: generirana naslovnica (origin `generated`) za sve bez slike. Pravi
  screenshot je kasnije samo prepiše.
- Govornik je 19. 10. rekao da ostali iz grupe 4 (desktop i mobilne aplikacije) te
  cutter, firme i cal ostaju s generiranom slikom. Dva projekta su
  prebačena u `review` (nisu u ovom repou).

## Istekle domene (pinka.io, pinka.finance, spremni.hr)

| Projekt | Nova adresa |
|---|---|
| Pinka aplikacija | `pinka-app.pages.dev` (Pages projekt `pinka-app`, D.O.M. račun) |
| Pinka landing | `pinka-finance-landing.d-o-m.workers.dev` |
| za.stablecoin.spremni.hr | bez live linka, samo GitHub (GitHub Pages ima CNAME pa github.io preusmjerava na mrtvu domenu) |

- `pinka.io` je istekao 2026-09-09. `pinka.finance` se 19. 10. još otvarao.
- D.O.M. račun je `<CLOUDFLARE_ACCOUNT_ID>`, a workers.dev poddomena mu je `d-o-m`.
  Wrangler ima 15 računa, pa `pages project list` traži `CLOUDFLARE_ACCOUNT_ID`.
- Landing worker je imao isključen workers.dev. Uključen je preko API-ja
  (`POST /accounts/<id>/workers/scripts/pinka-finance-landing/subdomain`), a
  `workers_dev = true` je u `pinka-finance/landing` (`40dd3a4`, grana
  `feat/ekosustav-uskladjivanje`).
- Landing šalje X-Frame-Options, pa ga katalog prikazuje kao sliku, ne kao iframe.

## Otvoreno

- Linkovi unutar landinga na `pinka.io` prestaju raditi kad domena istekne. Prebaciti ih na `pinka-app.pages.dev`.
- `40dd3a4` je na feature grani landinga i na `main` dolazi tek s njom.
- JID WhatsApp grupe „AI u praksi 2026-10-20” dopisati kad bridge vidi prvu poruku.
- LinkedIn tekst (`docs/event/objava-2026-10-19.md`) i dalje ima „gotovo svi su open source”.

## Projektor (`/stage`) za publiku, 19. 10. navečer

Projektor više nije samo za platno: ljudi ga otvaraju na svom mobitelu tijekom
predavanja. Zato:

- **Auto-slide** svakih 20 s (`SLIDE_MS` u `app/stage.js`). Pauzira dok je uključena
  interakcija (`e`), otvorena pretraga ili padajući popis repoa, i kad tab nije vidljiv.
  Tipka `a` ili klik na brojač pali i gasi, a `?auto=0` otvara pauzirano.
  Redatelj preko BroadcastChannela: `{cmd: "autoslide", on}`.
- **Traka** `#bar` je izvan `#stage` i pozicionira se u `layout()`. Kad ispod slajda
  ima više od 80 px (mobitel u portretu), ide ispod slajda, a inače gore desno u slajdu.
  Font je `max(14px, …)`, jer je proporcionalna veličina na 390 px širine bila ~3 px.
- Više od 2 repoa ide u `<details>` „GitHub (N)” (Novčanik ima 11 i inače prekrije ekran).
- Uz svaku poveznicu je gumb ⧉ za kopiranje URL-a. Navigacija je ‹ › u traci i swipe
  (vodoravno > 50 px i 1,5× više od okomitog).
- Naslov taba je `<projekt> · Projekti · Matija Stepanić` (prije „Projektor”).
- **Privatni repoi se ne prikazuju** (ni na stageu ni u katalogu), jer bi posjetitelj dobio 404.

### Zamka: hero od 100vh u iframeu (italk.hr)

Projektor iframe postavi na punu visinu stranice da bi kamera mogla scrollati. Stranica
čiji je hero `100vh` tada naraste zajedno s iframeom: italk.hr je imao hero od 8506 px
i izgledao je „prezumirano”. Iframe je cross-origin, pa se to ne može popraviti iznutra.

- `capture.mjs` sad izmjeri `scrollHeight` pri visini 810, pa pri visini stranice.
  Ako naraste više od 15 %, piše `embed.vh_dependent: true`, a stage tada prikazuje
  full-page sliku umjesto iframea.
- Full-page slika se sad snima s `fullPage: true` pri visini 810 (prije se viewport
  povećavao, s istim problemom). Prije snimanja skripta prođe stranicom u koracima od 400 px.
  Bez toga su sekcije koje se pojavljuju na scroll (IntersectionObserver) ostale prazne.
- Ponovno su snimljeni samo `italk-italk-hr` i `repo-stepanic-modric-lottery-verify`.
  Ostali projekti imaju stare full-page slike. Ako neki izgleda prazno ili razvučeno:
  `node tools/catalog/capture.mjs <id>`, pa `python3 tools/catalog/finalize.py` i `npm run deploy`.

### $MODRIC lutrija

`urls.live` je `https://kapetan-luka-onchain.domovina.ai/` (može u iframe). Slika je
govornikov screenshot (`repo_media.py <id>=<png>`, origin `user`). Redoslijed je
bitan: prvo `capture.mjs`, jer on prepisuje `media`, pa tek onda `repo_media.py`.

## Sync 19. 10. navečer: 7 novih projekata

Javno (deployano, verzija `5637c166`): Open Diagram, Open SaaS + MPT, odds.domovina.ai,
Video tvornica (HyperFrames), omm.domovina.ai, Osciloskop. Jedan projekt je na reviewu
(prava na glazbu nisu riješena, stranica je noindex, a repo je privatan); nije u ovom repou.
Katalog sada ima 100 javnih projekata.

- **Redoslijed skripti:** `metrics.py` čita kartice koje je `finalize.py` već uvrstio u katalog.
  Novu karticu zato treba proći ovim redom: `finalize` → `metrics` → `rank` → `finalize`. Ako se
  `finalize` prvi put preskoči, nove kartice ostanu bez `rank`.
- **Kartica bez card-inputa** (HyperFrames: nema Claude sesija u svom direktoriju) treba putanju
  repoa u `EXTRA_PATHS` u `metrics.py`, inače nema git metrika.
- Open SaaS je tuđi kod (wasp-lang), pa je u `FOREIGN_CODE`. Repo je fork `stepanic/open-saas`,
  a `repos.py` ga nađe jer gleda sve remoteove, ne samo origin.
- **Javna kartica ne smije spominjati projekt na reviewu.** HyperFrames kartica je prvo opisivala
  Tomislav video, pa je to izbačeno i deployano ponovno. Provjera nakon deploya:
  `curl -s https://projekti.domovina.ai/data/catalog.json | grep -c <pojam>`.
- Screenshot osciloskopa pokazuje samo gumb „Uključi mikrofon”. Na `/stage` je iframe pa radi uživo.
- Sesije za Open SaaS + MPT i HyperFrames nisu nađene, pa su `sessions: 0`, a broje se samo commitovi.

## 20. 10. ujutro: FootballFans i klupski novčanik javno

Govornik je htio pokazati prototipe iz `/Volumes/DOMOVINA2TB/git/ss` (`ff-landing`,
`ss-novcanik-prototip`, `ff-domains`, `ff-wallet`, `ff-pitch`). Deploy `24259ca1`, katalog 102 javna.

- **`ss-ss-novcanik-prototip`** (nova kartica, rank 21): live `https://lom.ff.hr`, iframe u app modu
  (`APP_MODE` u `capture.mjs`). Novčanik je i dalje dio skupne kartice `novcanik-prototipovi`, a kartice su povezane preko `related`.
- **`ss-ff-landing`** (rank 34): prebačen iz `review` u `public` jer ga govornik želi pokazati.
  Iz teksta je izbačen pitch, investitori i fundraising. ff.hr šalje `X-Frame-Options: DENY`, pa ide kao slika.
- Nisu dodani: `ff-pitch` (investitorski deckovi), `ff-wallet` (feature-pack za Safe fork, ne builda se
  sam, nema live), `ff-domains` (infra; brojke su u kartici novčanika). Sva četiri repoa su privatna.
- Kartica ne spominje treće osobe iz izvora (vlasnik Sofascorea, predsjednik kluba).
- Grbovi su prema README-u prototipa „samo za demo”, a za javnu upotrebu treba suglasnost kluba. Stranica sama piše „nije službena aplikacija kluba”.

Zamke:

- **`rank.py` pada s `KeyError`** za karticu koja nema unos u `data/importance.json`. Unos dodaj prije `rank`.
- `importance.json` ima **ručni format** (jedan projekt po retku). `json.dump(..., indent=1)` ga
  prepiše u +417/−103 redaka, pa novi red dopiši tekstualno.
- `~/git/ss` više ne postoji, jer su repoi na `/Volumes/DOMOVINA2TB/git/ss`. Obje kartice imaju putanje u `EXTRA_PATHS`.
- Slike se na webu poslužuju s `/data/media/<id>.jpg`, ne s `/media/` (404 tamo je normalan).
