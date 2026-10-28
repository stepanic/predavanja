# 04 — Generativni slajdovi, generative UI i retrieval kartica iz govora

> Istraživanje: 2026-09-24. Svaka stavka ima link koji je dohvaćen (WebFetch) ili pregledan u rezultatima pretrage.
> Oznaka **[NEPROVJERENO]** znači da tvrdnju nisam potvrdio iz primarnog izvora; oznaka **[SNAPSHOT]** znači da je broj trenutačno stanje s mjerne stranice i mijenja se.

## Sažetak (preporuke)

1. **Za ~100–150 kartica ne treba vektorska baza kao glavni mehanizam.** Cijeli katalog (ID + 1–2 rečenice opisa + ključne riječi HR/EN) stane u nekoliko tisuća tokena i ide u **cachirani system prompt**; LLM bira karticu po ID-u. Embedding retrieval služi kao brzi pre-filter i fallback, ne kao sudac.
2. **Dvije brzine.** Brzi put (lokalni embedding nad interim ASR transkriptom, < 100 ms) predlaže kandidate i može odmah prikazati karticu kad je sličnost vrlo visoka; spori put (Claude Haiku 4.5 kao "director", TTFT ~0,6 s [SNAPSHOT]) donosi konačnu odluku na kraju rečenice/misli. To je isti obrazac kao Living Stage (timeout 4 s + iskreni fallback) i Visual Captions (predviđanje svakih ~100 ms, razine proaktivnosti).
3. **Nove slajdove generirati kao JSON u fiksni skup predložaka, ne kao slobodni HTML.** Googleov generative UI (slobodni HTML/CSS/JS) daje odlične rezultate, ali sami autori kažu da generiranje "ponekad traje minutu ili više". Za 1–3 s treba shema: 5–8 layouta (naslov+bulleti, citat, broj/statistika, usporedba 2 stupca, timeline, mermaid dijagram, "kartica + komentar"), Claude **strict tool use** (constrained decoding, uvijek valjan JSON) i **fine-grained tool streaming** (`eager_input_streaming`) da se naslov iscrta prije nego je ostatak gotov. Isti smjer idu A2UI (Google) i json-render (Vercel).
4. **Embedding model za hrvatski:** `intfloat/multilingual-e5-large(-instruct)` — model card eksplicitno navodi `hr` među jezicima; dobar je i u neovisnoj analizi slavenskih jezika (2026). Alternativa `BAAI/bge-m3` (isti XLM-R temelj, dense+sparse, ali `hr` nije eksplicitno naveden ni u paperu ni u evaluaciji). Od API-ja jedino **Cohere** ima javnu listu s `hr`; Voyage ne objavljuje listu jezika.
5. **Ne vjerovati benchmarkovima za hrvatski — napraviti vlastiti mini-eval.** Za hrvatski gotovo nema retrieval benchmarka (i 2026. rad o slavenskim jezicima upozorava na manjak podataka). 3–5 izgovorenih parafraza po kartici (snimljeno + propušteno kroz naš ASR) = ~300–500 upita; mjeriti top-1/top-3 za 2–3 modela. To je jedan popodnevni posao i odlučuje izbor.
6. **Mermaid samo kao ograničeni podskup + validacija.** Llama-3.1-8B postiže ~92 % syntax score na MermaidSeqBench; veliki modeli su bolji, ali ne 100 %. Klijent mora pokrenuti `mermaid.parse()` prije prikaza; ako padne, prikazati tekstualni predložak umjesto popravnog ciklusa (popravak = još jedan LLM round-trip).
7. **Histereza i ljudska kontrola.** Visual Captions je uveo tri razine proaktivnosti (auto-display / auto-suggest / on-demand). Za živi talk: auto-display samo iznad visokog praga pouzdanosti, minimalno vrijeme prikaza (npr. 8–10 s), i clicker/tipka za "prihvati prijedlog / vrati prethodno / zamrzni".
8. **Prethodno generirati što se može.** Sve što se može predvidjeti (slajdovi za očekivane teme) generirati offline većim modelom (Sonnet 5 / Opus 5.5) i dodati u katalog kao kartice; živo generiranje ostaviti za stvarno neočekivane skretanja.

---

## A. Generiranje slajdova i generative UI pod latencijom

### A1. AutoPresent (CVPR 2025) + SlidesBench
- **Link:** https://arxiv.org/abs/2501.00912 · https://openaccess.thecvf.com/content/CVPR2025/html/Ge_AutoPresent_Designing_Structured_Visuals_from_Scratch_CVPR_2025_paper.html
- **Što je:** Slajdovi iz NL instrukcije generiranjem **Python koda** koji poziva SLIDESLIB (high-level API nad python-pptx). Uspoređuje kod-pristup s end-to-end generiranjem slika.
- **Brojevi:** SlidesBench 7k train / 585 test primjera, 10 domena, 310 decková; AutoPresent = 8B Llama model, rezultati "usporedivi s GPT-4o"; iterativni self-refinement poboljšava kvalitetu. Evaluacija reference-based i reference-free (dizajn).
- **Što nam to znači:** Programski/strukturirani izlaz je bolji od "nacrtaj sliku". Ključna lekcija je **high-level API** (SLIDESLIB) — model ne piše sirovi pptx nego poziva par apstraktnih funkcija. Naš ekvivalent: mala JSON shema predložaka. Self-refinement si ne možemo priuštiti u 1–3 s.

### A2. PPTAgent + PPTEval
- **Link:** https://arxiv.org/abs/2501.03936 · https://github.com/icip-cas/PPTAgent
- **Što je:** Dvofazni, edit-based pristup: iz referentnih prezentacija izvuče funkcionalne tipove slajdova i **content sheme**, zatim piše outline i generira *edit akcije* nad odabranim referentnim slajdom. PPTEval = MLLM-as-judge u tri dimenzije: Content, Design, Coherence.
- **Brojevi:** prosjek 3,67 (od 5) na PPTEval; objavljen i dataset Zenodo10K.
- **Što nam to znači:** Točno naš obrazac "odaberi postojeći predložak i popuni ga" umjesto generiranja od nule. PPTEval-ove tri dimenzije su dobar okvir i za našu evaluaciju (+ četvrta dimenzija: **pravovremenost**).

### A3. DOC2PPT (AAAI 2022)
- **Link:** https://arxiv.org/abs/2101.11796
- **Što je:** Pred-LLM hijerarhijski seq2seq: sumarizacija dokumenta, retrieval teksta/slika, predikcija layouta, parafraziranje u kratke fraze.
- **Brojevi:** ~6k parova dokument–deck.
- **Što nam to znači:** Povijesni kontekst; razlaganje zadatka (odaberi sadržaj → skrati → rasporedi) i dalje vrijedi. Parafraziranje u kratke fraze je upravo ono što director mora raditi s govorom.

### A4. SlideCoder (EMNLP 2025)
- **Link:** https://arxiv.org/abs/2506.07964 · https://aclanthology.org/2025.emnlp-main.458/
- **Što je:** Iz referentne *slike* slajda generira editabilan slajd (kod). Layout-aware hijerarhijski RAG, benchmark Slide2Code, otvoreni 7B model SlideMaster.
- **Brojevi:** do +40,5 bodova nad baselineima (layout fidelity, execution accuracy, visual consistency).
- **Što nam to znači:** Uglavnom nije naš problem (mi nemamo referentnu sliku), ali potvrđuje da je **RAG nad primjerima koda/layouta** ključ kvalitete — mi to rješavamo tako da primjere popunjenih predložaka stavimo u prompt.

### A5. "Talk to Your Slides" + TSBench (ACL 2026)
- **Link:** https://arxiv.org/abs/2505.11604
- **Što je:** Agent koji uređuje slajdove manipulacijom **strukturiranih podataka** umjesto GUI/screenshot pristupa.
- **Brojevi:** TSBench = 379 ljudski provjerenih instrukcija (+ Hard podskup); 34 % brže, 34 % bolja vjernost instrukciji, 87 % niži trošak od GUI baselinea.
- **Što nam to znači:** Jasan empirijski argument: **rad nad strukturom (JSON) je brži i jeftiniji od rada nad pikselima/HTML-om**. Direktno podržava preporuku #3.

### A6. SlidesGen-Bench (EMNLP 2026) i DeepSlides
- **Link:** https://arxiv.org/abs/2601.09487 · https://arxiv.org/abs/2605.26451
- **Što je:** SlidesGen-Bench evaluira *renderirani* izlaz bilo kojeg sustava (kod ili slika) kroz Content, Aesthetics, Editability; Slides-Align1.5k (9 sustava, 7 scenarija) za usklađenost s ljudima. DeepSlides: "design first, code later", bez predložaka, RL-trenirani SlideQwen modeli.
- **Što nam to znači:** Za evaluaciju gledati **screenshot** onoga što je stvarno na projektoru, ne JSON. DeepSlides pokazuje da template-free može biti ljepši — ali uz višefazni workflow koji nije za 1–3 s.

### A7. Google — "Generative UI: LLMs are Effective UI Generators"
- **Link:** https://research.google/blog/generative-ui-a-rich-custom-visual-interactive-user-experience-for-any-prompt/ (18. 11. 2025) · https://arxiv.org/abs/2604.09577
- **Što je:** Gemini 3 Pro generira kompletan HTML/CSS/JS za svaki upit; tri sastojka: alati (generiranje slika, web search), detaljne sistemske upute s primjerima, **post-processing** za česte greške. U produkciji kao "dynamic view"/"visual layout" u Gemini appu i AI Modeu.
- **Brojevi:** ljudi pretežno preferiraju generirani UI nad markdownom (sekundarni izvori navode 83 % **[NEPROVJERENO u primarnom izvoru]**); u ~50 % slučajeva barem usporedivo sa stručno izrađenim. **Brzina je isključena iz evaluacije** — "our current implementation can sometimes take a minute or more".
- **Što nam to znači:** Slobodni HTML je najizražajniji, ali je **red veličine prespor** za naš budžet. Korisna ideja: deterministički post-processing sloj koji popravlja tipične greške modela prije renderiranja.

### A8. "Generative Interfaces for Language Models" (Stanford/SALT, ACL 2026 Findings)
- **Link:** https://arxiv.org/abs/2508.19227 · https://github.com/SALT-NLP/GenUI
- **Što je:** LLM odgovara generiranjem UI-ja preko **strukturiranih, sučelju-specifičnih reprezentacija** + iterativnog dotjerivanja, ne sirovog HTML-a.
- **Brojevi:** do 72 % poboljšanja u ljudskoj preferenciji nad chat sučeljem.
- **Što nam to znači:** Strukturirani međusloj (shema → render) je istraživački prihvaćen put i daje kvalitetu bez slobodnog HTML-a.

### A9. Shema-ograničeni generative UI u praksi: A2UI (Google) i json-render (Vercel)
- **A2UI:** https://developers.googleblog.com/introducing-a2ui-an-open-project-for-agent-driven-interfaces/ · https://github.com/google/A2UI — objavljen 15. 12. 2025, v0.8, Apache-2.0. Agent šalje **deklarativni JSON** (ravna lista komponenti s ID referencama), klijent renderira samo komponente iz svog **kataloga povjerenja**. Ravna lista je namjerno odabrana jer je "LLM-friendly" i omogućuje progresivno renderiranje i inkrementalne izmjene.
- **json-render:** https://github.com/vercel-labs/json-render — Apache-2.0, ~18,3k zvjezdica; katalog komponenti definiran Zod shemama, iz kataloga se automatski generira sistemski prompt; `SpecStream` kompajler pretvara stream u patcheve i renderira progresivno.
- **Što nam to znači:** Ovo je gotovo točno arhitektura koju trebamo. Ili koristiti json-render (React) direktno, ili kopirati ideju: katalog od 5–8 "slide" komponenti → shema → progresivni render. Ravna lista s ID-evima olakšava i "dopuni postojeći slajd" operacije.

### A10. Claude: strict tool use, structured outputs, fine-grained tool streaming
- **Linkovi:** https://platform.claude.com/docs/en/build-with-claude/structured-outputs · https://platform.claude.com/docs/en/agents-and-tools/tool-use/fine-grained-tool-streaming
- **Što je:**
  - *Structured outputs / `strict: true`* (GA, uključujući Haiku 4.5): constrained decoding → uvijek valjan JSON prema shemi. Ograničenja: nema rekurzivnih shema, nema `minLength/maxLength/minimum/maximum`. Prvi zahtjev ima dodatnu latenciju kompilacije gramatike; gramatika se cachira 24 h (promjena strukture sheme invalidira cache).
  - *`eager_input_streaming: true`* po alatu: input alata stiže fragment po fragment bez server-side bufferiranja; JSON može biti djelomičan/nevaljan pa parser mora biti tolerantan.
- **Što nam to znači:** `show_card(id)` → strict (enum ID-eva kartica = model ne može izmisliti karticu). `generate_slide(...)` → eager streaming da naslov stigne na projektor dok se bulleti još generiraju. **Zagrijati** gramatiku jednim zahtjevom prije talka. Kombinaciju `strict` + `eager_input_streaming` na istom alatu treba testirati **[NEPROVJERENO]**. Duljinu teksta ograničiti promptom i odrezati na klijentu (shema ne podržava `maxLength`).

### A11. Pouzdanost LLM → Mermaid
- **MermaidSeqBench (IBM Research):** https://arxiv.org/html/2511.14967v2 — 132 uzorka, sequence dijagrami, LLM-as-judge u 6 dimenzija. Syntax score (sudac DeepSeek-V3): Llama-3.1-8B 92,0 %, Qwen-2.5-7B 91,3 %, Granite-3.3-8B 87,0 %, Llama-3.2-1B 69,0 %; stroži sudac (GPT-OSS-120B) daje niže ocjene.
- **GenAIScript "Mermaids Unbroken" (Microsoft, 16. 5. 2025):** https://microsoft.github.io/genaiscript/blog/mermaids/ — "repairer": parsiraj svaki mermaid blok, grešku parsera vrati modelu, ponovi. Bez objavljenih stopa uspjeha.
- **Što nam to znači:** I mali modeli rijetko potpuno promaše, ali ~5–10 % grešaka na projektoru je neprihvatljivo. Pravila: (1) dopustiti samo `flowchart LR/TD` i možda `sequenceDiagram`; (2) max ~8 čvorova; (3) ID-evi čvorova ASCII, labele u navodnicima (hrvatski dijakritici u labelama); (4) `mermaid.parse()` na klijentu prije prikaza; (5) na grešku → fallback predložak (bulleti), a popravak samo u pozadini ako ostane vremena. Alternativa: dijagram kao **JSON (čvorovi + bridovi)** kroz strict shemu i vlastiti layout (npr. dagre/elk) — tada sintaksne greške ne postoje.

---

## B. Retrieval kartica iz bučnog govornog upita + latencija "directora"

### B1. Embedding modeli i hrvatski — što je stvarno potvrđeno

| Model | Hrvatski | Napomene | Link |
|---|---|---|---|
| `intfloat/multilingual-e5-large` / `-large-instruct` | **Da — `hr` eksplicitno u `language` listi model carda** | XLM-R temelj, 100 jezika, 1024 dim, **max 512 tokena**, obavezni prefiksi `query: ` / `passage: `; card upozorava da low-resource jezici mogu biti slabiji | https://huggingface.co/intfloat/multilingual-e5-large |
| `BAAI/bge-m3` | Nije eksplicitno navedeno; paper evaluira MIRACL (18 jezika) i MKQA (25), **hr nije među njima** | XLM-RoBERTa-large temelj, 8192 tokena, **dense + sparse + ColBERT** u jednom modelu; MIT | https://huggingface.co/BAAI/bge-m3 · https://arxiv.org/abs/2402.03216 |
| `Alibaba-NLP/gte-multilingual-base` | **Da — `hr` u metapodacima** | Apache-2.0 | https://huggingface.co/Alibaba-NLP/gte-multilingual-base |
| `jinaai/jina-embeddings-v3` | **Da — `hr` u metapodacima** | **CC-BY-NC-4.0** (nekomercijalno) | https://huggingface.co/jinaai/jina-embeddings-v3 |
| `Qwen/Qwen3-Embedding-0.6B/4B/8B` | "100+ jezika", lista jezika nije u metapodacima | 32k kontekst, instruction-aware (+1–5 %), MTEB multilingual 0.6B = 64,33, 8B = 70,58 (#1 u trenutku objave); Apache-2.0 | https://huggingface.co/Qwen/Qwen3-Embedding-0.6B |
| Cohere embed (multilingual v3 / v4) | **Da — `hr` (i `sr`, `bs`, `sl`) na službenoj listi** | API, 100+ jezika | https://github.com/cohere-ai/cohere-developer-experience/blob/main/fern/pages/text-embeddings/multilingual-language-models/supported-languages.mdx |
| Voyage (`voyage-4*`, `voyage-3.5*`, `voyage-multilingual-2`) | **Nepoznato** — dokumentacija kaže "multilingual", ne objavljuje listu jezika | 32k kontekst, 256–2048 dim | https://docs.voyageai.com/docs/embeddings |

- **Neovisna analiza slavenskih jezika (kolovoz 2026):** https://arxiv.org/abs/2608.24477 — na slavenskom podskupu MTEB-a konzistentno najjači: `llama-embed-nemotron-8b`, `multilingual-e5-large-instruct`, `Qwen3-Embedding` varijante; glavni zaključak je da je **benchmark premali** za robusne zaključke (mnogi par jezik–zadatak ima samo jedan dataset). Hrvatski nije zasebno istaknut.
- **Što nam to znači:** Kratka lista za naš mini-eval: `multilingual-e5-large-instruct` (lokalno, hr potvrđen), `bge-m3` (lokalno, dense+sparse — sparse pomaže kod imena projekata), `Qwen3-Embedding-0.6B` (lokalno, mali), i Cohere kao API kontrola. Tekstovi kartica su kratki pa 512-token limit e5 nije problem.

### B2. Bučan govorni upit → retrieval
- **SQuTR (SIGIR 2026):** https://arxiv.org/html/2602.12783 — 37.317 upita, 200 govornika, 17 vrsta buke, SNR do 0 dB (EN + ZH). Retrieval pada s bukom (npr. Qwen3-Embedding-8B, ZH: 0,803 čisti tekst → 0,776 čisti govor → 0,730 na 0 dB). BM25 je stabilniji, ali **"najmanji Whisper-Tiny + dense retrieval značajno nadmašuje najveći Whisper-Large-v3 + BM25"**.
- **N-best / ASR šum za dense retrieval:** https://arxiv.org/abs/2301.06056 — ASR transkripti smanjuju učinkovitost BERT rerankera i dense retrievala; N-best fuzija smanjuje jaz za >50 %.
- **Što nam to znači:** (1) Dense > leksički za govor, ali **imena projekata** (vlastite imenice, engleske riječi u hrvatskom govoru) ASR često krivo napiše — zato hibrid: dense + fuzzy/sparse match na listu aliasa po kartici (uključujući fonetske varijante kako ih ASR piše). (2) Upit = klizni prozor zadnjih ~15–30 s transkripta, ne jedna rečenica. (3) U prompt za kartice dodati "kako bih to izgovorio" parafraze na hrvatskom.

### B3. Rerank
- **LLM kao reranker:** kad je katalog cijeli u promptu, sam director *je* reranker — nema dodatnog koraka.
- **Cross-encoder opcija:** `BAAI/bge-reranker-v2-m3` (lokalno) ili Cohere Rerank 3.5 (https://docs.cohere.com/docs/rerank-overview; 100+ jezika, +26,4 % cross-lingual u odnosu na Rerank 3). Dodatna latencija 100–300 ms navodi se u sekundarnim izvorima **[NEPROVJERENO]**.
- **Što nam to znači:** Za 100–150 kartica cross-encoder vjerojatno nije potreban; ima smisla samo ako mini-eval pokaže da embedding top-1 često promašuje, a želimo brzi put bez LLM-a.

### B4. Latencija LLM "directora"
- **Claude modeli (službeno):** https://platform.claude.com/docs/en/about-claude/models/overview — Haiku 4.5 (`claude-haiku-4-5`) = "Fastest", $1/$5 po MTok, 200k kontekst; Sonnet 5 = "Fast"; Opus 5.5 = "Moderate". Haiku 4.5 retirement "not sooner than October 15, 2026" — ne utječe na talk, ali za kasniju upotrebu planirati prelazak.
- **Mjerenja [SNAPSHOT]:** https://artificialanalysis.ai/models/comparisons/gemini-3-flash-vs-claude-4-5-haiku — Claude 4.5 Haiku TTFT 0,63 s, ~85 tok/s; Gemini 3 Flash TTFT 0,92 s, ~195 tok/s. Reasoning varijante imaju TTFT u desecima sekundi → **thinking isključiti** za directora.
- **Prompt caching:** cache read košta 10 % ulazne cijene (ista stranica) i skraćuje obradu dugog prefiksa → katalog kartica + upute + primjeri idu u stabilni, cachirani prefiks; na kraj samo novi transkript.
- **Što nam to znači (procjena budžeta, ne mjerenje):** odluka `show_card` ≈ TTFT (~0,6 s) + ~20 izlaznih tokena (~0,25 s) + mreža ≈ **~1 s**. `generate_slide` s ~120 tokena ≈ 0,6 + 1,4 s ≈ **~2 s do potpunog slajda**, s naslovom vidljivim nakon ~0,8 s uz eager streaming. To je unutar 1–3 s cilja. Sve treba izmjeriti iz Zagreba na stvarnoj mreži dvorane.

### B5. Streaming "director" obrasci
- **Pipecat RTVI:** https://docs.pipecat.ai/client/rtvi-standard — otvoreni protokol klijent–server: `user-transcription` (interim + final), `server-message` (proizvoljni JSON prema klijentu — npr. "prikaži karticu X"), `llm-function-call-started/in-progress/stopped`. Pipecat ima i `UIWorker` koji upravlja web UI-jem preko RTVI UI kanala.
- **Living Stage** (vidi C4): ASR → transkript → odluka o layoutu → paralelno punjenje widgeta preko streaming JSON-a; asinkrona korekcija transkripta jeftinijim modelom svakih ~600 ms; tvrdi timeout 4 s → najavljeni fallback.
- **Što nam to znači:** Director ne treba biti "voice agent" (ne govori). Dovoljan je jednostavan event loop: interim transkript → brzi embedding kandidati (prefetch slika kartica); final segment ili pauza → poziv directoru s zadnjim prozorom transkripta + trenutnim stanjem ekrana; odgovor je jedan od alata `show_card | generate_slide | keep`. Pipecat/RTVI vrijedi samo ako ionako koristimo Pipecat za ASR; inače obični WebSocket.

---

## C. Praktičari 2023–2026: LLM sluša govornika i upravlja vizualima

### C1. Google Visual Captions / ARChat (CHI 2023)
- **Link:** https://research.google/blog/visual-captions-using-large-language-models-to-augment-video-conferences-with-dynamic-visuals/ · https://research.google/pubs/pub52074/ · https://github.com/google/archat
- **Što je:** Chrome ekstenzija za video pozive; fine-tunani LLM iz govora predviđa **što prikazati, odakle (osobni album / web search) i kojeg tipa (emoji, fotografija…)**.
- **Brojevi:** dataset VC1.5K (1.595 primjera, 246 sudionika, 15 kategorija); token accuracy 97 % train / 87 % val; predikcije "svakih 100 ms"; 89 sudionika / 846 zadataka, 82–84 % smatra vizuale korisnima i relevantnima; lab studija 26 + terenska 10 sudionika. Tri razine proaktivnosti: auto-display, auto-suggest, on-demand-suggest.
- **Stanje:** Apache-2.0, **više se ne održava** (upućuju na XR Blocks). Koji je točno bazni LLM, u dohvaćenim izvorima nije navedeno **[NEPROVJERENO]**.
- **Što nam to znači:** Najbliži akademski prethodnik. Preuzeti: razdvajanje "što / odakle / kakav tip" (kod nas: kartica vs generirani slajd vs dijagram) i **razine proaktivnosti** kao konfiguracijski prekidač tijekom talka.

### C2. tldraw: make real, draw fast
- **Link:** https://tldraw.substack.com/p/make-real-the-story-so-far (18. 11. 2023) · https://github.com/tldraw/draw-a-ui · https://github.com/tldraw/draw-fast
- **Što je:** make real = skica → GPT-4V → HTML u iframeu na canvasu ("za nekoliko sekundi"); draw-a-ui repo >10k zvjezdica u dva tjedna. draw fast = realtime generiranje slika na canvasu; hosted demo ugašen 14. 1. 2024, kod ostaje.
- **Što nam to znači:** Nije "live talk", ali pokazuje da publika tolerira nekoliko sekundi ako *vidi da se nešto generira*. Za nas: vidljiv, elegantan "generating…" indikator je bolji od praznog ekrana.

### C3. "Imagine with Claude" (Anthropic, rujan 2025)
- **Link:** https://www.anthropic.com/news/claude-sonnet-4-5 (najava uz Sonnet 4.5) — **[stranicu nisam dohvatio; opis iz rezultata pretrage i sekundarnih izvora]**
- **Što je:** Privremeni research preview (5 dana, Max korisnici): Claude generira softver "u letu", bez unaprijed napisanog koda, kao reakciju na klik korisnika.
- **Što nam to znači:** Dobar referentni primjer za talk (Claude-generirani UI u stvarnom vremenu), ali po latenciji je bliži Googleovom generative UI-ju nego našem 1–3 s budžetu.

### C4. Living Stage (Google I/O Hackathon, svibanj 2026)
- **Link:** https://cerebralvalley.ai/e/google-io-hackathon/hackathon/gallery/73 · repo https://github.com/Poiurity/Predator · demo https://youtu.be/Gn-G9kBpFws
- **Što je:** "Površina za prezentaciju koja se gradi dok pričaš." Gemini 3.5 Flash, **streaming strukturirani JSON**, byte-stabilan prompt prefiks (implicitni cache), 5 tipova widgeta (Sim s sliderima, Plot/recharts, Compare, Flow/SVG, Annotate/KaTeX), error boundary po widgetu, nove fraze *nadograđuju* scenu umjesto da je zamijene. Timeout 4 s → "rehearsed capture" fallback koji se otvoreno najavljuje. Asinkrona korekcija transkripta svakih ~600 ms.
- **Što nam to znači:** **Najbliži praktični analog našem projektu** i potvrda cijelog pristupa: fiksni katalog widgeta + streaming JSON + stabilan cachirani prefiks + tvrdi timeout s fallbackom. Vrijedi pročitati kod prije pisanja vlastitog.

### C5. Ostali hackathon/GitHub projekti (manje relevantni)
- **sayit** (OpenAI Voice Hack Night, svibanj 2026): https://cerebralvalley.ai/e/openai-voice-hack-night/hackathon/gallery/25 — glas → dijagrami, SVG objašnjenja, bilješke na canvasu. Stack i repo nisu navedeni **[detalji NEPROVJERENI]**.
- **voice-based-presentation-assistant:** https://github.com/aaditya4401-dot/voice-based-presentation-assistant — React + FastAPI + Azure Speech + GPT-4o-mini; generira 6-slajdni deck iz teme i AI ga naracira, prekidivo glasom. Mali projekt (0 zvjezdica), obrnuta uloga (AI prezentira).
- **Lumen Slides:** https://github.com/Anmol567/lumen-slides — konverzacijski builder s alatima `plan_deck/add_slide/update_slide`, patchevi streamani preko SSE (iz rezultata pretrage, repo nisam otvarao **[NEPROVJERENO]**).
- **Što nam to znači:** Nismo pronašli zreo open-source projekt koji radi točno "govornik priča slobodno → LLM bira između stotinjak pripremljenih kartica ili generira novi slajd". Kombinacija **katalog-first + generate-fallback** izgleda neistražena u javnom prostoru — to je i dobra priča za sam talk.

---

## Preporučeni tehnički stack (retrieval + generiranje)

```
mikrofon → ASR (interim + final, vidi dokument o ASR-u)
      │
      ├─ interim tekst ──► [Brzi put] lokalni embedding (multilingual-e5-large-instruct ili bge-m3, ONNX/TEI)
      │                     + fuzzy match na aliase imena projekata
      │                     → top-5 kandidata (+ prefetch slika), auto-prikaz samo ako score >> prag
      │
      └─ final segment / pauza ──► [Director] Claude Haiku 4.5, bez thinkinga, streaming
                                   cachirani prefiks: upute + KATALOG svih kartica + sheme predložaka + primjeri
                                   varijabilni dio: zadnjih ~30 s transkripta, trenutni ekran, top-5 iz brzog puta
                                   alati:
                                     show_card(card_id: enum, reason)          strict: true
                                     generate_slide(template: enum, fields)    eager_input_streaming: true
                                     keep()                                    (ništa ne mijenjaj)
                                   timeout ~3 s → ostaje trenutni ekran / top-1 kartica iz brzog puta
      │
      ▼
projektor (browser): katalog 5–8 predložaka (json-render ili vlastite React/HTML komponente),
                     tolerantni parser djelomičnog JSON-a, mermaid.parse() prije prikaza,
                     min. vrijeme prikaza + histereza, operatorska tipka: prihvati / natrag / zamrzni
```

**Obrazloženje:**

1. **Katalog u promptu, embedding kao pomoć.** 100–150 kartica × ~60–80 tokena ≈ 6–12k tokena — trivijalno za kontekst i jeftino uz prompt caching. LLM tada vidi *sve* opcije i sam radi rerank s punim razumijevanjem govora; `enum` ID-eva u strict shemi onemogućuje izmišljene kartice. Embedding put daje trenutnu reakciju i fallback kad LLM kasni ili padne.
2. **Haiku 4.5 za odluke, veći model offline.** Haiku je službeno najbrži Claude i ima najniži izmjereni TTFT (~0,6 s [SNAPSHOT]); za odabir kartice ne treba više inteligencije. Sonnet 5 / Opus 5.5 koristiti prije talka za: pisanje opisa kartica, aliasa i HR parafraza, pregenerirane slajdove za očekivane teme. Opcionalno A/B: Sonnet 5 kao director ako mini-eval pokaže da Haiku griješi u izboru.
3. **Predlošci umjesto slobodnog HTML-a.** Podržano literaturom (Talk to Your Slides: struktura 34 % brža / 87 % jeftinija; GenUI Stanford: strukturirane reprezentacije; PPTAgent: popuni shemu) i praksom (A2UI, json-render, Living Stage). Slobodni HTML (Google generative UI) = kvaliteta, ali do minute latencije i rizik vizualnih grešaka uživo.
4. **Lokalni embedding.** Nema mrežnog round-tripa (~ms umjesto ~100+ ms), radi i ako Wi-Fi dvorane zapne; e5 ima eksplicitno potvrđen hrvatski. Cohere embed kao API alternativa jer jedini ima javnu listu s `hr`.
5. **Mjerenje prije odluke.** Prije gradnje: (a) mini-eval retrievala s 300–500 snimljenih HR upita kroz naš ASR; (b) izmjeriti p50/p95 latenciju Haiku 4.5 za `show_card` i `generate_slide` iz Zagreba s cachiranim prefiksom; (c) 50 generiranih mermaid dijagrama kroz `mermaid.parse()` → stopa grešaka. Ako (c) > 2 %, dijagrame raditi kao JSON čvorova/bridova s vlastitim layoutom.

### Otvorena pitanja / neprovjereno
- Radi li `strict: true` zajedno s `eager_input_streaming` na istom alatu (treba testirati).
- Kvaliteta Voyage modela na hrvatskom (nema službene liste jezika).
- Stvarna latencija Cohere Rerank 3.5 iz EU.
- Točan bazni LLM u Visual Captions.
