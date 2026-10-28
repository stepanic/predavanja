# 03 — Streaming ASR za hrvatski (live predavanje)

Stanje: 2026-09-24. Izvori su navedeni uz svaku tvrdnju. Oznaka **[NEVERIFICIRANO]** znači da tvrdnju nisam potvrdio na službenoj stranici (dolazi iz tražilice, sekundarnog izvora ili pamćenja). **[VENDOR]** znači da broj objavljuje sam proizvođač.

---

## Sažetak i preporuka

**Primarno: Soniox real-time (`stt-rt-v5`) preko WebSocketa, s `context` listom pojmova.**
- Hrvatski je službeno podržan i u real-time i u async API-ju ([docs](https://soniox.com/docs/stt/concepts/supported-languages)).
- Latencija ispod 200 ms (tvrdnja proizvođača), $0.12/h za real-time ([pricing](https://soniox.com/pricing)). Cijelo predavanje košta nekoliko centi.
- Ima strukturirani `context` za imena, nazive proizvoda i domenske pojmove ([models](https://soniox.com/docs/stt/models)). Upravo to nam treba za "Claude Code", "Cloudflare", "Flutter" i nazive projekata.
- Prema Sonioxovu vlastitom benchmarku na hrvatskom (stvarni YouTube audio, 2025) ima 9.5 % WER, Google 14.1 %, OpenAI 15.5 %, AssemblyAI 38.2 % **[VENDOR, stranice s usporedbom vraćale su 404 pri provjeri, brojevi su iz sažetaka tražilice]**.
- Argument za cloud: LLM koji odlučuje što ide na projektor ionako treba internet. Cloud ASR zato ne uvodi novu točku kvara, nego samo dodaje još jedan servis.

**Fallback (offline, već instalirano): whisper.cpp + `ggml-large-v3-turbo`, Metal, VAD chunkovi od 3–8 s i `--prompt` s glosarom.**
- Na ovom M4 Pro stroju izmjerio sam oko 0.56 s encodinga po prozoru i oko 1.1 s ukupno za isječak od 5 s dok je model već učitan (detalji u §6).
- Uz VAD segmentaciju to daje latenciju od kraja rečenice do teksta od oko 1–2 s. Za odluke o projektoru to je sasvim dovoljno.
- Ne koristiti `whisper-stream` kao glavni put. Nema opciju `--prompt` (provjereno u izvornom kodu), a u lokalnom buildu nije ni izgrađen (`WHISPER_SDL2=OFF`).

**Treća razina zaštite (vrijedi za obje opcije): ispravak glosarom u LLM promptu.** Transkript ionako ide LLM-u. U system prompt treba staviti glosar s tipičnim pogrešnim zapisima, npr. `"Slaude Code" / "Klod kod" → Claude Code`. Lokalni test je pokazao da ASR sam neće uvijek pogoditi ime (§6).

**Rezervna cloud opcija ako Soniox zakaže:** ElevenLabs Scribe v2 Realtime (~150 ms, keyterms, $0.39/h) ili Deepgram Nova-3 `hr` (keyterm prompting, ~$0.29/h promo). Oba treba testirati istim testnim klipom.

**Što otpada:**
- **AssemblyAI streaming:** hrvatski nije na listi streaming modela u službenoj dokumentaciji.
- **Apple SpeechAnalyzer/SpeechTranscriber:** nema `hr-HR` (provjereno lokalno na macOS 26.5.1).
- **Azure `hr-HR`:** nema phrase list.
- **Canary/Parakeet:** nisu praktični na Macu u 8 dana.
- **Omnilingual ASR:** nije streaming, limit ulaza je 40 s.

---

## 1. Istraživanja i alati za streaming Whisper

Whisper nije streaming model. Obrađuje prozor od 30 s, a streaming se dobiva politikom koja odlučuje kad je dio izlaza "stabilan" i može se emitirati.

| Rad / alat | Ključna ideja | Prijavljena latencija / brzina | Mac (Apple Silicon) |
|---|---|---|---|
| **Whisper-Streaming**: Macháček, Dabre, Bojar, *Turning Whisper into Real-Time Transcription System*, IJCNLP-AACL 2023 demo ([arXiv 2307.14743](https://arxiv.org/abs/2307.14743), [GitHub](https://github.com/ufal/whisper_streaming)) | **LocalAgreement-n**: audio buffer se ponovno obrađuje sa svakim novim chunkom. Emitira se najduži zajednički prefiks zadnje dvije hipoteze. Buffer se reže po segmentima ili rečenicama. | **3.3 s** latencije na nesegmentiranom long-form testu (abstract) | backend `mlx-whisper` (Apple Silicon), `faster-whisper`, OpenAI API |
| **SimulStreaming**: Macháček & Polák, CUNI na IWSLT 2025 ([arXiv 2506.17077](https://arxiv.org/abs/2506.17077), [GitHub](https://github.com/ufal/SimulStreaming)) | **AlignAtt**: iz encoder-decoder cross-attentiona gleda koji dio audija se upravo dekodira. Dekodiranje staje kad attention dođe do kraja buffera (`--frame_threshold`). Spaja Simul-Whisper i Whisper-Streaming. | README: "**~5× brži** od WhisperStreaminga". Najbolji sustav na IWSLT 2025. Latenciju u ms nisam našao u abstractu. | README spominje samo GPU (≥10 GB VRAM za large-v3), MPS/MLX se ne spominje |
| Status | README Whisper-Streaminga kaže: *"In 2025, WhisperStreaming is becoming outdated, replaced by SimulStreaming."* | | |
| **WhisperLiveKit** (QuentinFuxa, [GitHub](https://github.com/QuentinFuxa/WhisperLiveKit), Apache-2.0) | Server koji pakira SimulStreaming (zadano) i LocalAgreement, s WebSocket izlazom `ws://localhost:8000/asr` | Konkretne brojke nisam provjerio | **Da**: `--backend mlx-whisper`, `voxtral-mlx`. Ima i Canary backend. Najbrži put do SimulStreaminga na Macu. |
| **WhisperLive** (Collabora, [GitHub](https://github.com/collabora/WhisperLive), MIT) | Klijent-server, VAD, `initial_prompt` | "nearly-live", bez brojki | Backendi faster_whisper / TensorRT / OpenVINO. MLX nije naveden, na Macu radi samo CPU. |
| **whisper.cpp `whisper-stream`** ([README](https://github.com/ggml-org/whisper.cpp/tree/master/examples/stream)) | Dva načina rada: `--step 500 --length 5000` (klizni prozor, ispis se prepisuje) ili `--step 0 -vth 0.6` (VAD, ispis po frazama) | Ovisi o `--step`, bez brojki | Metal da. Build traži `-DWHISPER_SDL2=ON`. **Nema `--prompt`**, samo `-kc` (keep context). Provjereno u `examples/stream/stream.cpp`. |
| **faster-whisper** (CTranslate2) | Brzi inference, koriste ga WhisperLive i Whisper-Streaming | n/a | CTranslate2 na Macu radi samo na CPU-u (nema Metal/MPS) **[NEVERIFICIRANO u ovom istraživanju, poznato ograničenje]**. `faster-whisper 1.2.1` je lokalno instaliran. |

**Zaključak za naš slučaj.** Sliding window transkripta za LLM ne traži token-po-token streaming. Dovoljne su finalizirane fraze svakih 1–3 s. VAD i chunk pristup (fraza → whisper → tekst) je najjednostavniji i najrobusniji. SimulStreaming/LocalAgreement donose partial rezultate brže, ali uz dodatnu složenost koja nam ne treba.

---

## 2. Dokazi o WER-u za hrvatski

### Otvoreni modeli: FLEURS `hr_hr` (čitani govor, čist audio)

Izvor: NVIDIA, *Canary-1B-v2 & Parakeet-TDT-0.6B-v3* ([arXiv 2509.14128](https://arxiv.org/abs/2509.14128)), Table 11 "Per-language WER (%) results on the FLEURS benchmark". Stupac `hr` sam izvukao izravno iz PDF-a.

| Model | FLEURS hr WER | Napomena |
|---|---|---|
| Canary-1B-v2 | **8.29 %** | 25 EU jezika uključujući hr, CC-BY-4.0. Model card ne spominje streaming. |
| whisper-large-v3 | **11.07 %** | |
| seamless-m4t-v2-large | 11.89 % | |
| Parakeet-TDT-0.6B-v3 | 12.46 % | Model card: streaming je moguć (chunked skripta u NeMo). CC-BY-4.0. |
| seamless-m4t-medium | 14.16 % | |

- **whisper-large-v3-turbo (naš lokalni model):** broj za hrvatski nisam našao. OpenAI navodi da turbo "performs similarly to large-v2" i da najviše gubi na jezicima s manje resursa ([discussion #2363](https://github.com/openai/whisper/discussions/2363)). Realna procjena je nešto lošije od 11 % na FLEURS-u **[NEVERIFICIRANO, izmjeriti]**.
- **Common Voice hr:** usporedive brojke za ove modele nisam našao.

### Modeli fine-tunirani na hrvatskom (HuggingFace)

| Model | Baza | Podaci | Rezultat | Licenca |
|---|---|---|---|---|
| [GoranS/whisper-large-v3-turbo-hr-parla](https://huggingface.co/GoranS/whisper-large-v3-turbo-hr-parla) | large-v3 (turbo arhitektura) | ParlaSpeech-HR + 400 h privatnih podataka | **FLEURS hr 8.66 %**, ParlaSpeech test 3.52 % | Apache-2.0 |
| [BuzzASR/croatian](https://huggingface.co/BuzzASR/croatian) (EMNLP 2026 Findings, [arXiv 2609.09554](https://arxiv.org/pdf/2609.09554)) | whisper-large-v3 | SFT, standardni Whisper tokenizer | FLEURS WER 10.6 %, CER 3.35 % (baseline v3 CER 5.11 %) | MIT |
| [classla/whisper-large-v3-mici-princ](https://huggingface.co/classla/whisper-large-v3-mici-princ) | whisper-large-v3 | Audiobook *Mići Princ*, **čakavski** | WER 35.43 → 16.83 %, CER 11.54 → 3.95 % | model card |
| [5roop/whisper-large-v3-ParlaSpeech-HR](https://huggingface.co/5roop/whisper-large-v3-ParlaSpeech-HR) | whisper-large-v3 | ParlaSpeech-HR | Model card nema brojke ("More Information Needed") | CC-BY-SA-4.0 |
| [classla/wav2vec2-large-slavic-parlaspeech-hr-lm](https://huggingface.co/classla/wav2vec2-large-slavic-parlaspeech-hr-lm) | wav2vec2 + LM | ParlaSpeech-HR | Najbolji CLASSLA wav2vec2 po CER/WER (prema pretrazi) | |

Model `classla/whisper-large-v3-mici` iz zadatka ne postoji pod tim imenom. Stvarni model je `classla/whisper-large-v3-mici-princ`. Za predavanje je irelevantan jer je čakavski i audiobook.

**Zanimljiv kandidat je `GoranS/whisper-large-v3-turbo-hr-parla`:** turbo arhitektura, FLEURS 8.66 % nasuprot 11.07 % za vanilla v3. Nema gotove ggml konverzije, pa bi je trebalo napraviti ručno (`models/convert-h5-to-ggml.py`). Rizik: parlamentarni govor i fine-tune mogu oslabiti engleske tech termine i prompt-following. **Isprobati samo ako ostane vremena**, i to tek nakon usporedbe na vlastitom klipu.

### Meta MMS / Omnilingual ASR
- [Omnilingual ASR](https://github.com/facebookresearch/omnilingual-asr) (studeni 2025, [arXiv 2511.09690](https://arxiv.org/abs/2511.09690), Apache-2.0) podržava 1600+ jezika, a 7B LLM-ASR ima CER < 10 za 78 % jezika. Jezik se zadaje kodom tipa `hrv_Latn` (format `eng_Latn` je dokumentiran).
- Ograničenja: CTC i LLM modeli trenutno primaju samo audio **kraći od 40 s**, a streaming i MPS nisu dokumentirani. Broj za hrvatski nisam našao.
- **Nije kandidat za live.**

### Komercijalni: hrvatski WER
- **Soniox [VENDOR]:** 9.5 % na stvarnom hrvatskom audiju (YouTube), Google 14.1 %, OpenAI 15.5 %, AssemblyAI 38.2 %. Izvor su sažeci stranica soniox.com/compare/... koje su vraćale 404 pri izravnom dohvatu.
- **ElevenLabs:** STT dokumentacija svrstava Croatian (hrv) u razred "Excellent (≤ 5 % WER)" ([docs](https://elevenlabs.io/docs/overview/capabilities/speech-to-text)) **[VENDOR, vjerojatno FLEURS i batch model]**.

---

## 3. Komercijalni streaming API-ji s hrvatskim (stanje rujan 2026.)

| Servis | Hrvatski | Streaming | Latencija | Custom vocab | Cijena (real-time) | Izvor |
|---|---|---|---|---|---|---|
| **Soniox** `stt-rt-v5` | ✅ `hr` (službena lista) | ✅ WebSocket | "sub-200 ms" [VENDOR]. `max_endpoint_delay_ms` podesiv. | ✅ `context` (general/text/terms) | **$0.12/h** | [jezici](https://soniox.com/docs/stt/concepts/supported-languages), [modeli](https://soniox.com/docs/stt/models), [cijene](https://soniox.com/pricing) |
| **ElevenLabs** Scribe v2 Realtime | ✅ hrv u STT listi, razred ≤5 % WER. Za realtime stranica kaže samo "90+ languages". | ✅ | ~150 ms [VENDOR] | ✅ do 50 keyterms × 20 znakova (realtime) | **$0.39/h**, keyterms +$0.05/h | [docs](https://elevenlabs.io/docs/overview/capabilities/speech-to-text), [cijene](https://elevenlabs.io/pricing/api) |
| **Deepgram** Nova-3 | ✅ `hr` (samo Nova-3) | ✅ | "low latency" | ✅ keyterm prompting, 500 tokena. Za Nova-3 mono i multi, ali hr nije eksplicitno potvrđen. | $0.0048/min promo (redovno $0.0077) ≈ $0.29–0.46/h, keyterm +$0.0013/min. $200 besplatnog kredita. | [modeli](https://developers.deepgram.com/docs/models-languages-overview), [keyterm](https://developers.deepgram.com/docs/keyterm), [cijene](https://deepgram.com/pricing) |
| **Speechmatics** | ✅ `hr`, realtime + batch | ✅ | nije navedena | ✅ `additional_vocab` + `sounds_like`, radi u realtimeu | Pricing stranica pokazuje "$0.129" za Pro, jedinica nejasna **[provjeriti]**. $100 besplatnog kredita. | [jezici](https://docs.speechmatics.com/introduction/supported-languages), [custom dict](https://docs.speechmatics.com/speech-to-text/features/custom-dictionary), [cijene](https://www.speechmatics.com/pricing) |
| **Google** Chirp 3 (`chirp_3`) | ✅ `hr-HR` GA (EU regija) | ✅ `StreamingRecognize` | nije navedena | "Model adaptation" naveden za hr-HR. Za streaming nije eksplicitno potvrđen. | **[NEVERIFICIRANO]** (~$0.016/min po sjećanju) | [chirp-3](https://docs.cloud.google.com/speech-to-text/docs/models/chirp-3), [jezici](https://docs.cloud.google.com/speech-to-text/v2/docs/speech-to-text-supported-languages) |
| **Azure Speech** `hr-HR` | ✅ real-time | ✅ | nije navedena | ❌ **phrase list NE podržava hr-HR**. Custom Speech (plain text + pronunciation) postoji, ali traži trening. | **[NEVERIFICIRANO]** (stranica s cijenama nije prikazala iznose). Free tier 5 h/mjesec. | [language support](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=stt) |
| **OpenAI** `gpt-live-transcribe` (Realtime API) | ⚠️ Model stranica ne navodi jezike. Parametar `languages` prima ISO 639-1 kodove. Hrvatski **[NEVERIFICIRANO]**. | ✅ delte transkripta | 5 razina: `minimal`…`xhigh`, bez brojki u ms | ✅ `prompt` + "keyword hints" | **$0.017/min ≈ $1.02/h** | [guide](https://developers.openai.com/api/docs/guides/realtime-transcription), [model](https://developers.openai.com/api/docs/models/gpt-live-transcribe) |
| **AssemblyAI** | ❌ Nema hrvatskog u streamingu. U2.5 Pro Streaming ima 18–19 jezika, Multilingual ima en/es/de/fr/pt/it. Hrvatski postoji samo u batch modelu `universal-2`. | — | — | — | — | [FAQ](https://www.assemblyai.com/docs/faq/language-support-for-real-time-transcription), [multilingual](https://www.assemblyai.com/docs/streaming/universal-streaming/multilingual-transcription) |

Napomena za AssemblyAI: tražilica vraća sažetak da model `speech_model=whisper-rt` (WhisperLiveKit, 99 jezika, $0.30/h) postoji u streamingu. U službenoj dokumentaciji i u `llms-full.txt` nisam našao `whisper-rt`, pa to vodim kao **[NEVERIFICIRANO / proturječno]**.

---

## 4. Custom vocabulary / prompt biasing za vlastita imena

| Mehanizam | Gdje | Kako radi / ograničenja |
|---|---|---|
| **Whisper `initial_prompt` / `--prompt`** | whisper.cpp `whisper-cli` i `whisper-server` (polje `prompt` u multipart requestu), faster-whisper, WhisperLive (`initial_prompt`), SimulStreaming (`--init_prompt`, `--static_init_prompt`) | Tekst ide u decoder kao "prethodni kontekst". To nije tvrdo biasiranje, nego pomak stila i pravopisa. whisper.cpp help: *"initial prompt (max n_text_ctx/2 tokens)"*, dakle **224 tokena**. `--carry-initial-prompt` ga ponavlja za svaki prozor. Prompt treba napisati kao **prirodnu hrvatsku rečenicu s pojmovima**, a ne kao golu listu. SimulStreaming `--static_init_prompt` je upravo za terminologiju koja se ne "odscrolla". |
| **Deepgram keyterm prompting** | Nova-3 (mono/multi), Flux | Do 500 tokena po requestu. Doplata $0.0013/min za streaming. |
| **ElevenLabs keyterms** | Scribe v2 / v2 Realtime | Realtime: do 50 pojmova po 20 znakova. Doplata $0.05/h. |
| **Soniox `context`** | stt-rt-v5 | Strukturirani kontekst (opis domene, tekst, lista pojmova). Proizvođač navodi da v5 kontekst primjenjuje pouzdanije kod rijetkih pojmova i gramatičkih varijacija. To je bitno za hrvatske padeže ("Cloudflareu", "Flutteru"). |
| **Speechmatics `additional_vocab`** | realtime + batch | Lista riječi/fraza s opcionalnim `sounds_like`. Preporuka je ≤1000, a u realtimeu se kešira. |
| **Google model adaptation** (phrase sets) | chirp_3 hr-HR | Naveden kao podržan za hr-HR. U streamingu nije eksplicitno potvrđen. |
| **Azure phrase list** | — | **Ne radi za hr-HR.** |
| **OpenAI `prompt` + keyword hints** | gpt-live-transcribe | Podržano, detalji u vodiču. |
| **Naknadni ispravak u LLM-u** | naš pipeline | Glosar kanonskih imena s poznatim pogrešnim zapisima u system promptu LLM-a koji ionako čita transkript. Radi neovisno o ASR-u i besplatan je. |

Glosar za pripremu (primjer): `Claude Code, Claude, Anthropic, Cloudflare, Workers, Flutter, deploy, Domovina TV, <nazivi projekata>`. Za svaki pojam zapisati i kako ga ASR krivo čuje. Najbrže je pustiti testni klip i skupiti pogreške.

---

## 5. Apple on-device SpeechAnalyzer (macOS 26)

**Provjereno lokalno** na ovom Macu (macOS 26.5.1, M4 Pro), malim Swift programom koji ispisuje `supportedLocales`:

- **`SpeechTranscriber.supportedLocales`** (novi on-device model): de, en, es, fr, it, ja, ko, pt, yue, zh. **Nema `hr-HR`.** Pri pokretanju se u logu pojavljuje i `No Assistant asset for language hr-HR`.
- **`DictationTranscriber.supportedLocales`**: **`hr-HR` je na listi.** To je stariji model istog tipa kao keyboard dictation, bez naprednog long-form modela. Radi li potpuno on-device i koliko je dobar za hrvatski, nisam testirao **[NEVERIFICIRANO]**.
- **`SFSpeechRecognizer` (`hr-HR`)**: `isAvailable = true`, ali **`supportsOnDeviceRecognition = false`**. Prepoznavanje ide preko Appleovih servera, uz poznata ograničenja trajanja sesije.

**Zaključak:** nije primarna opcija. DictationTranscriber `hr-HR` može biti zanimljiv eksperiment ako sve drugo zakaže, ali nema biasiranja pojmova usporedivog s gornjim opcijama.

---

## 6. Lokalno stanje (što je instalirano)

- **Model:** `~/modeli/ggml-large-v3-turbo.bin` je symlink na `/Volumes/DOMOVINA2TB/.../ggml-large-v3-turbo.bin` (1.6 GB). **Radi samo dok je disk DOMOVINA2TB spojen.** Prije predavanja model treba kopirati na interni disk.
- **whisper.cpp:** `/Volumes/DOMOVINA2TB/git/ggml-org/whisper.cpp`, commit `364c77f4` (15. 2. 2026.). Buildani su `whisper-cli`, `whisper-server`, `whisper-bench` i VAD alati. **`whisper-stream` NIJE buildan** (`WHISPER_SDL2=OFF`), iako su `sdl2` i `sdl3` instalirani preko brewa. Metal je uključen, CoreML nije.
- **Pokvaren rpath:** binariji traže `~/git/ggml-org/whisper.cpp/build/...dylib`, a repo je premješten na vanjski disk. Rade samo uz:
  `export DYLD_LIBRARY_PATH=$W/build/src:$W/build/ggml/src:$W/build/ggml/src/ggml-blas:$W/build/ggml/src/ggml-metal`
  Pozor: `/usr/bin/time` briše `DYLD_*` zbog SIP-a. Rješenje je rebuild (`cmake -B build -DWHISPER_SDL2=ON && cmake --build build -j`), što je odluka korisnika.
- U PATH-u nema `whisper-cli`, `whisper-stream` ni ičega whisper-sličnog u `/opt/homebrew/bin`.
- **Python:** `faster-whisper 1.2.1`, `whisperx 3.8.1`, `torch 2.10`, `jiwer` su instalirani. `mlx-whisper` nije.

**Mini test (sintetički, macOS TTS glas "Lana" hr_HR, 10.5 s):** rečenica *"Danas ću vam pokazati kako sam s Claude Code napravio deploy na Cloudflare, a zatim ćemo pogledati Flutter aplikaciju koju sam razvio za Domovina TV."*

| | Izlaz |
|---|---|
| bez prompta | "…kako sam **Slaude Code** napravio deploy na Cloudflare, … pogledati **Fluter** aplikaciju … za **domovina TV**." |
| `--prompt "Claude Code, deploy, Cloudflare, Flutter, Domovina TV."` | "…kako sam **Slaude Code** napravio deploy na Cloudflare, … pogledati **Flutter** aplikaciju … za **Domovina TV**." |

- Prompt je popravio "Flutter" i "Domovina TV", ali ne i "s Claude" → "Slaude". Stapanje prijedloga s imenom ostaje, pa je LLM glosar potreban.
- "deploy" i "Cloudflare" su prošli i bez prompta.
- Vrijeme: encode oko 0.56–0.60 s po prozoru (Metal, M4 Pro). Isječak od 5 s: total 1.1 s, od toga 0.4 s load, koji `whisper-server` plaća samo jednom. Prvo učitavanje s vanjskog diska: 2.2 s.
- Ovo je TTS, a ne pravi govor. Pravi test je u §8.

---

## 7. Usporedna tablica

| Opcija | Hrvatski | Streaming | Latencija (tipično) | WER dokaz (hr) | Cijena | Offline? |
|---|---|---|---|---|---|---|
| **Soniox stt-rt-v5** | ✅ služb. | ✅ native | <200 ms [VENDOR] | 9.5 % real-world [VENDOR] | $0.12/h | ❌ |
| **ElevenLabs Scribe v2 RT** | ✅ (hrv, ≤5 % razred) | ✅ native | ~150 ms [VENDOR] | "≤5 % WER" razred [VENDOR] | $0.39/h (+$0.05 keyterms) | ❌ |
| **Deepgram Nova-3 hr** | ✅ služb. | ✅ native | nisko, bez brojke | nema javne brojke za hr | ~$0.29/h promo (+keyterm) | ❌ |
| **Speechmatics** | ✅ služb. | ✅ native | nije navedena | nema javne brojke za hr | $0.129 (jedinica?) | ❌ (on-prem enterprise) |
| **Google Chirp 3** | ✅ GA (EU) | ✅ StreamingRecognize | nije navedena | 14.1 % [prema Soniox VENDOR] | [NEVERIF.] | ❌ |
| **Azure hr-HR** | ✅ | ✅ | nije navedena | — | [NEVERIF.] | ❌ (kontejneri enterprise) |
| **OpenAI gpt-live-transcribe** | ⚠️ neverif. | ✅ delte | podesiva (5 razina) | 15.5 % [prema Soniox VENDOR, stariji model] | $1.02/h | ❌ |
| **AssemblyAI streaming** | ❌ | — | — | 38.2 % [Soniox VENDOR, batch?] | — | ❌ |
| **whisper.cpp turbo (lokalno)** | ✅ | pseudo (VAD chunk / `whisper-stream`) | ~1–2 s nakon kraja fraze (izmjereno ~0.6 s encode) | v3: 11.07 % FLEURS. Turbo nešto lošije [procjena]. | 0 | ✅ |
| **SimulStreaming / WhisperLiveKit (mlx)** | ✅ (Whisper) | ✅ AlignAtt | ~5× brže od LocalAgreement (3.3 s u radu iz 2023.) | kao Whisper | 0 | ✅ |
| **GoranS turbo-hr-parla** | ✅ fine-tune | kao whisper.cpp (nakon konverzije) | kao turbo | 8.66 % FLEURS | 0 | ✅ |
| **Canary-1B-v2** | ✅ | ❌ (nije dokumentirano) | — | **8.29 % FLEURS** | 0 | ✅ (NeMo/CUDA, na Macu nepraktično) |
| **Parakeet-TDT-0.6B-v3** | ✅ | ✅ chunked (NeMo) | — | 12.46 % FLEURS | 0 | ✅ (NeMo, na Macu nepraktično) |
| **Omnilingual ASR** | ✅ (hrv_Latn) | ❌, ulaz <40 s | — | nema broja za hr | 0 | ✅ |
| **Apple SpeechTranscriber** | ❌ | — | — | — | 0 | — |
| **Apple DictationTranscriber** | ✅ hr-HR na listi | ✅ | ? | nema | 0 | ? [NEVERIF.] |

---

## 8. Kako testirati u 30 minuta

**0. Priprema (5 min).** Napisati odlomak od oko 150 riječi iz stvarnog predavanja. Neka sadrži sve nazive projekata, "Claude Code", "deploy", "Cloudflare", "Flutter", barem jedan padež (npr. "na Cloudflareu") i jedan broj. Snimiti ga vlastitim glasom na mikrofonu koji ide na predavanje:
```bash
ffmpeg -f avfoundation -i ":0" -ar 16000 -ac 1 -t 90 test.wav
```
(indeks uređaja se vidi s `ffmpeg -f avfoundation -list_devices true -i ""`). Referentni tekst spremiti kao `ref.txt`.

**1. Lokalni baseline (5 min).**
```bash
W=/Volumes/DOMOVINA2TB/git/ggml-org/whisper.cpp
M=~/modeli/ggml-large-v3-turbo.bin
export DYLD_LIBRARY_PATH=$W/build/src:$W/build/ggml/src:$W/build/ggml/src/ggml-blas:$W/build/ggml/src/ggml-metal
$W/build/bin/whisper-cli -m $M -l hr -nt -f test.wav > local_noprompt.txt
$W/build/bin/whisper-cli -m $M -l hr -nt --carry-initial-prompt \
  --prompt "Predavanje o tome kako s Claude Code radim deploy na Cloudflare i Flutter aplikacije: <projekti>." \
  -f test.wav > local_prompt.txt
```

**2. Cloud kandidati (12 min, oko 4 min po servisu).** Isti `test.wav` treba poslati **real-time brzinom** preko WebSocketa: chunkovi od 100 ms s `sleep` između, tako da se mjeri stvarna streaming latencija.
- Soniox: model `stt-rt-v5`, `language_hints: ["hr","en"]`, `context` s glosarom.
- ElevenLabs: `scribe_v2_realtime`, `language_code: "hrv"` (ili auto), keyterms.
- Deepgram: `model=nova-3&language=hr&keyterm=Claude%20Code&keyterm=Cloudflare…`.

Svaki servis ima službeni Python primjer za streaming iz datoteke. Za svaki treba zabilježiti finalni tekst i vremena između zadnjeg poslanog audio chunka fraze i dolaska finalnog tokena.

**3. Mjerenje (5 min).** `jiwer` je već instaliran:
```python
import jiwer, re
ref = open("ref.txt").read()
norm = lambda s: re.sub(r"[^\w\s]", "", s.lower())
for f in ["local_noprompt.txt","local_prompt.txt","soniox.txt","elevenlabs.txt","deepgram.txt"]:
    hyp = open(f).read(); print(f, round(jiwer.wer(norm(ref), norm(hyp))*100,1), "%")
```
Uz WER brojati i **keyterm hit rate**: koliko je od N ključnih imena napisano točno. Za naš slučaj to je važnije od WER-a.

**4. Odluka (3 min).** Primarno ide najbolji hit rate uz latenciju finalizacije ispod oko 1.5 s. Lokalni whisper.cpp ostaje kao offline fallback. Iz izlaza svih servisa skupiti tipične krive zapise i ubaciti ih u LLM glosar.

**Checklist prije predavanja:**
- Kopirati model s DOMOVINA2TB na interni disk.
- Popraviti rpath rebuildom.
- Testirati na mreži dvorane ili mobilnom hotspotu.
- Imati tipku ili prekidač "cloud → lokalno".
