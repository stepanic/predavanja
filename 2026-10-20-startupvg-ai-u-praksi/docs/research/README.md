# Baza znanja: prezentacija koju vodi govor

Istraživanje prije gradnje sustava u kojem govornik priča slobodno, a LLM "redatelj"
sluša transkript uživo i sam bira što ide na projektor: gotovu karticu projekta,
dinamički generirani slajd ili ostanak na trenutnom ekranu.

Stanje: 2026-09-24. Svaka datoteka razlikuje provjereno, ono što tvrdi sam
proizvođač i nepotvrđeno. Oznake su u samim datotekama.

## Odgovor na glavno pitanje

**Nijedan pronađeni rad ne opisuje točno ovaj workflow.** Najbliži radovi pokrivaju dva
ili tri od pet dijelova:

| Rad | Što pokriva | Što nedostaje |
|---|---|---|
| Visual Captions (CHI 2023) | LLM iz govora predlaže vizuale; 3 razine proaktivnosti | Razgovor, a ne predavanje; vizuali s weba, ne vlastiti katalog |
| RealityTalk (UIST 2022) | Govor okida pripremljene vizuale, 1,47 s | Ručna tablica ključnih riječi, bez LLM-a |
| CrossTalk (UIST 2023) | Semantička pretraga pripremljenog materijala iz zadnjih 10 riječi | Nije testiran uživo zbog loših ASR-a |
| TalkDirector (UIST 2025) | Teška obrada prije predavanja, a uživo samo brzo uparivanje (132 ms) | Engleski, mali uzorak |
| Ambient Search (TED govori) | Dohvat iz govora jednog predavača, decay starih rezultata | Samo dohvat, bez odluke o ekranu |
| Living Stage / Predator (hackathon 2026) | LLM uživo puni widgete, timeout 4 s | Napušten, bez evaluacije |

Neistraženo ostaje: jedan govornik pred fizičkom publikom, na jeziku koji nije
engleski, a sustav **sam** bira iz 100+ kuriranih kartica **ili** generira slajd.
Sve studije su na engleskom i imaju 8–26 sudionika.

## Što literatura dokazuje (i kako to mijenja dizajn)

1. **Glavni rizik su krivi vizuali, a ne sporost.** RealityTalk je izbacio automatsku
   pretragu slika jer je "ometala". Visual Captions najviše grešaka pripisuje ASR-u
   i okidanju na pola rečenice.
   → Projektor se mijenja samo na **potvrđeni tekst i kraj rečenice**. "Ostani" je
   zadana akcija.
2. **LLM bez dodatnog treninga reagira previše** (ProactiveBench: 50–65 % lažnih uzbuna).
   → Odluku "kada" treba odvojiti od odluke "što" (LlamaPIE, ProCIS). Kandidate
   priprema brzi ruter, LLM potvrđuje, a histereza filtrira.
3. **Kontrola je podijeljena preferencija** (Visual Captions: 6/7/7 za
   auto-prikaz, auto-prijedlog i na zahtjev; auto-prikaz ima najmanje kontrole, 2,55/7).
   → **Tri načina rada** koja se prebacuju tijekom predavanja. Konzola ima back, freeze i pin.
   Horvitzova dva praga daju tri akcije: *ostani*, *predloži na konzoli*, *prebaci projektor*.
4. **Relevantne slike pomažu; irelevantne ne pomažu, ali ni ne štete mnogo.** Publiku
   vizuali ukupno ne opterećuju (Visual Captions, TalkDirector). Slike su ocijenjene
   bolje od teksta (6,0 naspram 4,8/7).
   → Screenshotovi i snimke projekata su glavni sadržaj. Tekstualni slajdovi služe samo kao dodatak.
5. **Sporo generiranje prekida tok** (VisAider: 20–30 s smeta).
   → Odmah se prikazuje najbliža postojeća kartica, a generirani slajd zamijeni je
   kad bude gotov. Generira se JSON u 5–8 fiksnih predložaka, ne slobodni HTML.
6. **Histereza je riješen problem.** Ambient Search svakom novom rečenicom
   množi stare rezultate s 0,9, a ACLD ima salience koji s vremenom opada.
   → Svaka kartica ima skor koji opada. Promjena ide tek kad novi kandidat
   pobijedi s marginom, a na ekranu se ostaje najmanje N sekundi. **Konkretni pragovi nisu u literaturi:
   ugađaju se na snimkama proba.**
7. **Kartica treba i aliase i opis.** Dialpad 2026: LLM nad opisom teme ima F1 0,85, regex 0,72, embeddinzi 0,71.
   → Svaka kartica ima: aliase (s hrvatskim padežima i tipičnim ASR greškama),
   opis u 1–2 rečenice i medije.
8. **Probe mjerljivo pomažu** (Elastica: govornici se opuste nakon 1–2 probe).
   → Planirati barem 2 cijele probe, snimljene, pa ih ponovno pustiti kroz sustav.

## Neovisna provjera: claude.ai Research

Izvještaj je u [`claude-ai-research-report.md`](claude-ai-research-report.md). Dolazi do
istog zaključka (točnog poklapanja nema) i potvrđuje Visual Captions, RealityTalk,
VisAider, Horvitza, Rhodesa, Soniox, ElevenLabs, Deepgram i predloške umjesto HTML-a.
Nove stvari koje naši agenti nisu našli:

- **Najbliži rad je AI pilot za planetarij** (Brossier et al., arXiv 2601.20466, 2026;
  izvor u `sources/README.md`). Arhitektura je praktički ista
  kao naša: streaming ASR, zatim `gpt-realtime` koji smije samo zvati alate, uključujući
  poseban **"no-op"** alat za "ništa ne radi".
  - LLM je bio **dobar u uključivanju vizualnih elemenata**, a loš u tempu i kameri.
    Nama treba ono prvo.
  - Nakon nekoliko poteza je **gubio upute**. Riješili su to few-shot primjerima,
    brisanjem teksta koji model sam izgenerira i kratkim podsjetnikom na kraju.
    → Redatelj radi bez stanja (stateless): svaki takt je novi poziv s kliznim prozorom.
  - 3 od 4 vodiča preferirala su predvidljiv reaktivni način.
  - Eksperti: kad se publici kaže da AI vodi, to "naglašava da je live".
    → Na početku predavanja reći da AI bira ekrane.
- **moves-cli** je napušten open-source projekt koji je listao slajdove govorom.
  Autor kaže "1 % grešaka je katastrofa na pozornici" i "govornici prvo kliknu, pa pričaju".
  → Brze glasovne naredbe ("pokaži…") zaobilaze histerezu.
- **Ograničenje brzine** ("token bucket", najviše jedna automatska promjena u N sekundi)
  sprječava treperenje kad govornik nabraja projekte (arXiv 2505.10831).
- **Biasing imena u Whisper promptu pomaže navedenim riječima, a ostalima šteti**
  (Jogi et al. 2025: greške na rijetkim riječima s 23,7 % na 18,0 %, ali ukupni WER je gori na 6 od 11 skupova).
  → Imena treba ispravljati i nakon ASR-a: fuzzy/fonetsko uparivanje s aliasima.
- **Alat plus deterministički fallback** (dynamic-voice-deck): ako LLM ne pozove alat,
  odluku donosi ruter po ključnim riječima.

## Tehničke odluke koje iz ovoga slijede

| Sloj | Odluka | Izvor |
|---|---|---|
| ASR, kandidati | Wispr Flow `live.ndjson` (lokalno), Soniox `stt-rt-v5` (0,12 $/h, hr potvrđen), lokalni whisper.cpp kao offline rezerva | 03, `tools/wispr_probe.py` |
| ASR, izbor | Test od 30 min na tvom glasu: WER i broj točno prepoznatih imena projekata | 03 |
| Upit | Klizni prozor: zadnja rečenica + zadnjih ~10 rečenica, okidanje na kraju rečenice | 02 (Ambient Search, Rhodes) |
| Ruter | Aliasi i embeddinzi (`multilingual-e5`, eksplicitno podržava hr) za trenutni top-k | 04 |
| Redatelj | Claude Haiku 4.5, sve kartice u keširanom promptu, alat s enumom ID-eva (bez izmišljenih kartica) | 04 |
| Generiranje | JSON u fiksne predloške; Mermaid samo uz `mermaid.parse()` provjeru i fallback | 04 |
| Pouzdanost | Tvrdi timeout 4 s + fallback, prikaz "što redatelj misli" na konzoli | 04 (Predator), 02 (Codellaborator) |

## Otvorena pitanja (literatura ne odgovara, testiramo mi)

- Kašnjenje Wispr Flowa i pišu li se dugi monolozi u dijelovima (`tools/wispr_probe.py`).
- WER za hrvatski na tvom glasu, s engleskim pojmovima i imenima projekata.
- Pragovi histereze i minimalno vrijeme na ekranu.
- Rade li Claude strict tool mode i streaming na istom alatu.
- Koliko publika tolerira krivi prikaz i je li "AI ticker" (zašto ovo prikazujem)
  prednost ili smetnja.

## Datoteke

| Datoteka | Sadržaj |
|---|---|
| [`01-speech-driven-presentations-hci.md`](01-speech-driven-presentations-hci.md) | 25+ HCI radova o prezentacijama koje vodi govor, 17 dizajnerskih lekcija, open-source kod |
| [`02-proactive-retrieval-mixed-initiative.md`](02-proactive-retrieval-mixed-initiative.md) | Just-in-time retrieval, proaktivni agenti, timing prekida, Horvitzovi principi mapirani na sustav, 14 pravila |
| [`03-streaming-asr-croatian.md`](03-streaming-asr-croatian.md) | Streaming ASR za hrvatski: modeli, API-ji, WER, cijene, biasing imena, stanje lokalnog setupa, plan testa |
| [`04-generative-slides-and-retrieval.md`](04-generative-slides-and-retrieval.md) | Generiranje slajdova LLM-om, generative UI, hrvatski embeddinzi, praktični primjeri |
| [`sources/`](sources/) | Samo poveznice na radove (puni tekstovi i bilješke nisu u repou) |

| [`claude-ai-research-report.md`](claude-ai-research-report.md) | Neovisni izvještaj claude.ai Researcha (engleski), dobiven promptom iz [`research-prompt.md`](research-prompt.md) |
