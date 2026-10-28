# Speech-Driven Autonomous Presentation Visuals: Literature Review, Prior Art, and Design Guidance for a Live "AI Director" (Croatian + English)

No published paper I could find describes your exact workflow, where a presenter speaks freely and an LLM director picks from 100+ pre-made cards or generates new slides from the live transcript and puts them on a projector with no human confirmation. The closest work is a 2026 planetarium study in which an always-listening OpenAI realtime model turned a guide's speech into visualization commands. That study found proactive control fluid but unreliable, and most guides preferred the more predictable push-to-talk mode. Around it sits a well-developed line of research: Visual Captions (CHI 2023), RealityTalk (UIST 2022), RealityChat (2024), VisAider (2025), and the older just-in-time retrieval and mixed-initiative work of Rhodes and Horvitz.

## TL;DR

- **No exact match exists; the nearest evidence is a warning.** The closest system is the LLM "pilot" for a planetarium show (Brossier et al., arXiv 2026). It used a streaming transcript and a tool-only realtime LLM with a "no-op" action, which is essentially your design. It worked well for swapping visual assets but badly for pacing. Three of the four guides who stated a preference chose the more predictable reactive mode. Visual Captions (N=26 lab, N=10 deployment) found that the right level of AI proactivity depends on the situation. RealityTalk dropped fully automatic image retrieval because it distracted and annoyed presenters.
- **Build it as a retrieval-first system with hysteresis, not as a generator-first one.** Pre-made cards are the safe default. The literature and prior art suggest that "stay" should be the dominant action, that switching should require high confidence held over time, and that generated slides should be template-filled JSON rendered by your own code, not free HTML. LLM-generated visualization pipelines have been reported at 20–30 s latency (VisAider), far over a 1–3 s budget.
- **For Croatian ASR, the practical choice is a commercial streaming API with keyterm biasing, plus LLM/fuzzy post-correction against your list of project names.** Soniox, Deepgram Nova-3 (Croatian added, with Keyterm Prompting), and ElevenLabs Scribe v2 Realtime all support Croatian streaming. ElevenLabs' launch post, "Introducing Scribe v2 Realtime", says it transcribes speech in under 150 ms (a vendor claim). Croatian WER figures come mostly from vendors. The best independent figure I found for zero-shot Whisper-large-v3 on Croatian is 16.18% WER / 6.68% CER. Rehearse with your own audio and measure.

## Key Findings

### 1. Does published research describe this exact workflow?

**No, not exactly.** Every system I found drops at least one of the three defining features: (a) free, unscripted monologue to an audience, (b) *autonomous* display with no presenter confirmation, and (c) a mix of selecting from a curated library and generating new slides. The closest work, ordered by how closely it matches:

**Piloting Planetarium Visualizations with LLMs during Live Events (Brossier et al., arXiv 2601.20466, Jan 2026)** is the nearest match in architecture.
- **Setup:** An AI pilot for OpenSpace listens to a human guide and turns what they say into camera flights, asset toggles and time changes. It uses OpenAI's `gpt-realtime-2025-08-28`.
- **Proactive mode:** A streaming speech-to-text model by Macháček and Polák (the SimulStreaming lineage) feeds the transcript to the LLM continuously. The LLM only makes tool calls, and when nothing should happen it calls a special "no-op" tool, which is effectively your "stay".
- **Engineering lesson:** The first version "typically lost track of the instructions after a few turns". The authors fixed this with few-shot warm-up examples, by deleting model-generated text messages, and by appending a short system-instruction reminder at the end of the thread.
- **Study:** Five professional guides plus two consulting experts. Software instability meant the first author had to intervene several times, and one participant's session could not run.
- **Preferences:** P1 preferred proactive mode, while P2, P3 and P5 preferred reactive mode "because it was more predictable and reliable". Proactive mode felt more fluid, and pressing the trigger added cognitive load.
- **What worked and what didn't:** The AI "was rather good at toggling assets based on context, while it performed very poorly with camera and pace control". Guides said a human pilot "can guess what I want to say and anticipate".
- **Error taxonomy:** The authors propose four dimensions: detection (mishearing), reasoning (misreading intent), context (wrong state, such as showing a planet's dark side) and naturalness.
- **Latency:** They logged end-to-end latency but reported no figures.

For your system this is the most directly transferable evidence. Choosing a discrete asset ("toggle this card") is the part LLMs did well, and timing and pacing are where they failed.

**Visual Captions (Liu et al., CHI 2023; demo at UIST 2023 Adjunct)** is the canonical speech-to-visual system.
- **Mechanism:** A fine-tuned LLM predicts "visual intent" (what to show, which type, from which source) from live captions in video calls.
- **Data:** It was trained on VC1.5K, a dataset of 1,595 visual intents from 246 crowd workers across 15 topic categories. That dataset came out of a formative study (N=10).
- **Proactivity levels:** It offered three: *auto-display* (the AI adds visuals by itself), *auto-suggest* (the AI proposes and the user clicks to share), and *on-demand-suggest* (the AI suggests only when the user presses the spacebar, then keeps listening for 3 s).
- **Evaluation:** A lab study (N=26) and a two-week deployment (N=10). "Different levels of AI proactivity … were preferred in various social scenarios."
- **Crowdsourced model evaluation (89 participants, 846 tasks):** 83% wanted visuals during conversation, 82% rated them useful and informative, 84% rated them relevant, and 87% and 86% said the predicted visual type and source were accurate.
- **Code:** Released as part of Google's ARChat. A prior-art check found the repo is marked no longer maintained.

The key difference from your case is that it targets two-way video calls and a person clicking to share, not an unscripted talk to an audience with autonomous projection.

**RealityTalk (Liao et al., UIST 2022)** is the closest match for presentations specifically.
- **Pipeline:** Google's Web Speech API for recognition, spaCy (`en_core_web_sm`) noun-phrase keyword extraction, and a presenter-authored keyword→visual matching table.
- **Display timing:** Keywords appear as kinetic text and vanish after 4 s. User-defined keywords stay for 10 s, and embedded visuals default to 10 s.
- **Design study:** The team analysed 177 augmented-presentation videos, filtered from 538, and ran a usability study with 15 participants.
- **Design decision:** An early version automatically showed the top Google Image result. The authors abandoned it because "these automated visual aids are rather distracting to the presentation, increasing the noise … and sometimes making the presenter annoyed due to the lack of control". The pre-authored mapping they replaced it with is structurally what your card library is.

**RealityChat / "Augmented Conversation with Embedded Speech-Driven On-the-Fly Referencing in AR" (Jadon et al., arXiv 2405.18537, 2024)** runs on a HoloLens. It combines Web Speech API recognition, keyword extraction and gaze-based confirmation. It derives seven design guidelines and reports, in an initial study, less distraction and friction than searching on a smartphone. It uses gaze confirmation, not autonomous display.

**VisAider (Takahira & Ueno, arXiv 2510.14247, 2025, work in progress)** generates ranked Vega-Lite chart suggestions from the dataset, the chart on screen, the conversation and the audience profile. It uses a five-module GPT-4o/LangChain pipeline.
- **Formative study:** Three senior analysts. Their first design consideration was "Preserve Presenter Autonomy". One said, "Even if the audience asks for it, there are cases where I don't want to show certain information. That decision should be the presenter's".
- **Latency:** Generating eight ranked candidates took **20–30 seconds**, which "disrupts presentation flow".
- **Other problems:** It struggled with implied data transformations and with ambiguous intent.

**VisAug (Zhao et al., ACM MM 2025, arXiv 2508.03410)** generates visual augmentations for recorded speech-rich web video, which is offline, not live. In paired comparisons, participants preferred its AI-generated visuals to Visual Captions' retrieval-based output 81% of the time. That is weak evidence that generated visuals can beat retrieved ones on relevance when latency doesn't matter.

**Historical roots.**
- **Rhodes & Maes, "Just-in-time information retrieval agents" (IBM Systems Journal 39(3–4):685–704, 2000):** Covers the Remembrance Agent, Margin Notes and Jimminy. It defines a JITIR agent as software that proactively retrieves and presents information based on local context "in an easily accessible yet nonintrusive manner". The original Remembrance Agent (Rhodes & Starner, PAAM '96) ran continuously and let the user "pursue or ignore" its suggestions. That is the peripheral, low-cost-to-ignore pattern, the opposite of taking over a projector.
- **Horvitz, "Principles of Mixed-Initiative User Interfaces" (CHI 1999):** Supplies the decision rule. Act autonomously only when the expected utility of acting beats not acting, which gives a threshold probability *p\** that shifts with context and with the costs of false and missed actions. Horvitz also calls for considering the user's attention and timing, minimising the cost of poor guesses, and supporting direct invocation and termination.
- **"Creating General User Models from Computer Use" (arXiv 2505.10831, 2025):** A modern refinement. Horvitz's framework treats actions as independent, so suggestions "would still pour through the decision boundary". The authors added a token-bucket rate limit of at most one suggestion per minute.

### 2. Just-in-time retrieval from live speech: query formation, switching, confidence

**Query formation from noisy streaming text.** The published systems use three tiers:
1. Keyword and noun-phrase extraction plus exact matching against an authored table (RealityTalk, RealityChat). This is fast and predictable but brittle.
2. An LLM reading a transcript window to infer intent (Visual Captions, VisAider, the planetarium pilot).
3. Embedding plus phonetic fuzzy matching against pre-chunked content. The open-source moves-cli uses MiniLM embeddings with phonetic fuzzy matching to align live speech to slide chunks.

Visual Captions' Google blog notes that the model tolerated transcription errors, for example "pier" misheard as "pair". A 2–3 sentence context window, plus the transcript's committed (non-partial) tokens, is a reasonable way to form queries. None of the papers ablate window length, so treat any specific number as a tuning parameter.

**When to switch versus stay.** No paper I found reports tuned switching thresholds or hysteresis for live presentation visuals. The best-grounded guidance comes from four sources:
- **Horvitz's expected-utility threshold.** On a projector, a wrong autonomous switch costs a lot (the audience sees it, and the presenter has to recover), so *p\** should be high.
- **Rate limiting.** The General User Models paper's one-per-minute token bucket shows that independent per-decision thresholds still flood users.
- **Dwell times.** RealityTalk's 4 s and 10 s display durations give a rough sense of how long a speech-triggered visual should stay up.
- **Practitioner experience.** The moves-cli author stopped development and said "a 1% error rate is a disaster on stage". He also pointed out that presenters usually click to a slide first and then talk about it. Speech-driven switching therefore lags intent by construction.

**Communicating confidence.** In a live talk the audience should not see confidence cues, so confidence belongs on the presenter's console. Visual Captions' auto-suggest mode and VisAider's ranked candidate list both put AI proposals in a private channel that the presenter can promote to the shared screen.

### 3. User-study findings: what people liked, failure modes, latency

- **Liked:** Real-time visuals helped explain unfamiliar concepts, resolved language ambiguities, and made conversations more engaging (Visual Captions). Proactive listening felt "more fun than anticipated" and more fluid, with no trigger to remember (planetarium P2).
- **Disliked / failure modes:**
  - Randomly retrieved visuals were distracting, and presenters were annoyed by losing control (RealityTalk).
  - Mishearing, misreading intent, ignoring state and context, and poor pacing (planetarium error taxonomy).
  - Missing implied transformations and ambiguous tasks (VisAider).
  - Presenters wanting a veto over what is shown (VisAider DC1).
  - Instruction drift after a few turns in a long realtime session (planetarium).
- **Latency:** None of the core HCI papers I read publish a threshold for acceptable end-to-end latency in live presentations. What is on record:
  - Whisper-Streaming reports 3.3 s ASR latency on long-form speech.
  - VisAider's 20–30 s was judged disruptive.
  - The moves-cli author estimates his offline ASR-plus-matching pipeline "will always take 500ms to 1 second".
  
  This is a real gap. The 1–3 s budget in your plan is plausible but not backed by studies.

### 4. Streaming ASR for Croatian in 2026

**Open models**
- **Whisper-large-v3 (zero-shot):**
  - On a Croatian ASR test set built for ASR challenges such as numerals (Samardžić, Rupnik, Starović & Ljubešić, 2024, as cited in the Mići Princ paper), it reached **CER 6.68% / WER 16.18%** and beat the other models tested.
  - It is the base for Croatian dialect fine-tunes. According to the `classla/whisper-large-v3-mici-princ` model card (Ljubešić, Rupnik & Perinčić), fine-tuning on Chakavian cut CER from 11.54% to 3.95% and WER from 35.43% to 16.83%. The test split has two known and two unseen speakers, each using a different micro-dialect.
- **BuzzASR/croatian (2026):** A Whisper-large-v3 fine-tune claiming the lowest CER among the open systems it compares (Whisper-large-v3, Omnilingual, MMS, Qwen3-ASR, Cohere Transcribe) on FLEURS + Common Voice, with "~1.7x CER reduction over Whisper zero-shot". This is a model-card claim tied to arXiv 2609.09554 (Findings of EMNLP 2026), which I did not verify independently.
- **CLASSLA wav2vec2 models:** Trained on ParlaSpeech-HR. Ljubešić, Koržinek, Rupnik & Jazbec (ParlaCLARIN III @ LREC 2022) describe it as "the first large freely available Croatian automatic speech recognition (ASR) dataset, 1,816 hours in size". Its transcripts differ from what was actually said in "~4-5% of words, which is also the word error rate of our best-performing ASR system". The best of these models is `wav2vec2-large-slavic-parlaspeech-hr-lm`. They are CTC models, not streaming-native, and trained on parliamentary speech.
  - I could not verify a public CLASSLA "whisper-large-v3 fine-tuned on ParlaSpeech" model, so treat that as unconfirmed.
- **NVIDIA Canary-1B-v2 and Parakeet-TDT-0.6B-v3 (arXiv 2509.14128, 2025):** Support 25 European languages including Croatian.
  - Parakeet averages 9.7% WER across the 24-language evaluation, against 9.9% for whisper-large-v3 and 8.1% for Canary-1B-v2.
  - Canary is reported as 10x faster than Whisper-large-v3.
  - I did not extract a verified Croatian-only figure.
- **Streaming wrappers:**
  - Whisper-Streaming (LocalAgreement) reports 3.3 s latency on long-form speech. Its authors now call it outdated.
  - SimulStreaming (AlignAtt policy) is "~5-times faster". It supports in-domain terminology prompts and RAG, and ran in 2 s and 4 s latency regimes at IWSLT 2025, where it was the top system.
  - Simul-Whisper's latency is "generally 1 to 2 times the chunk length".

**Commercial APIs with Croatian streaming**
- **Soniox:**
  - Claims 9.5% Croatian WER on real-world YouTube audio in its 2025 60-language benchmark, against 15.5% for OpenAI, 14.1% for Google and 38.2% for AssemblyAI.
  - Advertises Croatian–English code-switching, with the example "Jesam, ali imam jedan tight deadline; šef traži report do podne."
  - Other Soniox pages claim **1.25%** Croatian WER. These vendor numbers are inconsistent and self-published, so treat them as marketing until you test.
- **Deepgram Nova-3:** Added Croatian (`hr`) as a monolingual model with Keyterm Prompting.
  - Deepgram's 10 December 2025 changelog says Nova-3 Multilingual lets you "pass up to 500 tokens (~100 words)" of keyterms.
  - Deepgram's Keyterm Prompting docs say "the maximum number of tokens across all keyterms is 500" and that keyterms work with both monolingual and multilingual Nova-3. So long, multi-word project names use up the budget faster.
  - The original Nova-3 launch cited up to 100 key terms.
  - I found no published Croatian WER.
- **ElevenLabs Scribe v2 Realtime:** ElevenLabs' "Introducing Scribe v2 Realtime" post (November 2025) says it transcribes speech in under 150 ms in 90+ languages. Its product page claims "93.5% accuracy across 30 languages" on FLEURS, "outperforming Gemini Flash 2.5, GPT-4o Mini Transcribe, and Deepgram Nova 3". Its documentation lists Croatian in its "Excellent accuracy (≤5% WER)" tier. All of these are vendor claims.
  - Keyterm prompting is available for Scribe v2 Realtime.
  - The batch Scribe v2 accepts up to 1,000 keyterms.
- **Not verified in this research:** Google Cloud Chirp, Azure Speech, AssemblyAI streaming, Speechmatics, OpenAI realtime transcription and Gladia were not independently checked for Croatian streaming, WER or biasing limits. The competitor numbers above come from Soniox's own comparisons.

**Biasing toward project names**
- **Whisper prompting:** Jogi et al. (arXiv 2502.11572, 2025) put a 70-word biasing list into the prompt of Whisper Large, averaged over 11 English datasets.
  - Rare-word error fell from **23.7% to 18.0%**, and out-of-vocabulary error from **60% to 37.1%**, without fine-tuning.
  - Errors on words not in the list rose on every dataset, and overall WER got worse on 6 of 11.
  - Their fine-tuned B-Whisper cut rare-word error by a further 45.6% relative.
  
  In short, prompt biasing helps the listed names at some cost to everything else.
- **Commercial biasing:** Keyterm lists (Deepgram, ElevenLabs) are the commercial equivalent.
- **Post-ASR correction:** For 100+ project names, the most robust layer is post-ASR correction. Fuzzy and phonetic matching of transcript spans against the name list can be followed by LLM confirmation. The retriever over card descriptions also acts as an implicit error-correction channel, as moves-cli's phonetic matching does.

### 5. LLM-generated slides and generative UI under a 1–3 s budget

- **Structured programs beat pixels.** AutoPresent (Ge et al., CVPR 2025) introduced SlidesBench: 7k training and 585 test examples from 310 decks across 10 domains. It found that "programmatic methods produce higher-quality slides in user-interactable formats" than end-to-end image generation. Its 8B Llama model reached results "comparable to the closed-source model GPT-4o", and self-refinement improved quality.
- **Template-driven pipelines dominate offline generation.** PPTAgent (EMNLP 2025) and the wave of 2025–2026 benchmarks (PresentBench, SlidesGenBench, PPTArena, UniPPTBench) all evaluate offline, document-to-deck generation measured in minutes, not seconds. None measures live, speech-conditioned generation.
- **Diagram generation reliability.** MermaidSeqBench (IBM, NeurIPS 2025) has 132 NL→Mermaid sequence-diagram pairs scored by an LLM judge on syntax, logic and completeness. Larger 7B–8B models clearly beat 0.5–2B ones, and the scores depended on which judge was used. I found no benchmark giving a clean "renders without error" rate for Mermaid, Graphviz or SVG under latency constraints. Validate every generated diagram by actually rendering it, and keep a fallback.
- **Live evidence on generation latency.** VisAider's 20–30 s for eight Vega-Lite candidates shows that multi-stage generation doesn't fit in 1–3 s. Its authors plan to restrict transformation types to "a predefined, well-tested set" to improve stability. The practical implication for your case:
  - The LLM should emit a small JSON object (template ID plus a few short fields) against a fixed schema.
  - Your own renderer should turn that into HTML or SVG instantly.
  - Diagrams should be limited to small Mermaid flowcharts, rendered and validated before display.

### 6. Practitioner prior art (2023–2026)

- **google/archat (Visual Captions):** Open source, includes the dataset. The repo is marked no longer maintained.
- **moves-cli (mdonmez, GPL-3.0):** Live slide advancing from speech.
  - **Live pipeline:** Silero VAD → NeMo streaming conformer ASR (ONNX int8) → MiniLM embeddings plus phonetic fuzzy matching → simulated arrow keys. An LLM is used only in preparation, to map a transcript to slides.
  - **Latency:** Author estimates 500 ms–1 s.
  - **Why it was abandoned:** It needs a written transcript. Losing window focus sends keystrokes nowhere. "A 1% error rate is a disaster on stage." Speakers click to a slide before talking about it. A planned ~350M-parameter streaming LLM was cancelled over laptop compute and reliability concerns.
- **StageMate (Langhalsdino):** Azure STT with a sliding window and keyword matching against speaker notes. It advances slides and flags missed points. It uses no LLM; the date is probably before 2023 and could not be confirmed.
- **dynamic-voice-deck (HarshChin):** The reverse setup, where an AI presents and answers questions.
  - **Pipeline:** Browser VAD (600 ms silence) → Whisper and Qwen on Groq → Kokoro TTS.
  - **Slide control:** A `go_to_slide(slide_index, reason)` tool, with a server-side keyword fallback for when the LLM forgets to call it.
  - **Latency:** Barge-in under 150 ms.
  - Its "tool plus deterministic fallback" pattern is directly reusable.
- **Unverified leads (seen only in search snippets):** PMTLabs/presenter-ai (OpenAI Live API; AI narrates and advances after ≥2.5 s of silence), a voice-based presentation assistant using Azure plus GPT-4o-mini, and Google's Gemini `live-api-web-console`, whose `render_altair` demo makes charts from voice prompts. I found no verified hackathon "AI slide director" that generates visuals live.

## Recommendations (design for your talk)

1. **Make "stay" the default and switching expensive.** Use a Horvitz-style threshold that is high because projector errors are public.
   - Require the top card to win in two consecutive director ticks, or to exceed the runner-up by a margin, before showing it.
   - Enforce a minimum dwell of about 8–15 s per visual, in the same range as RealityTalk's 10 s default for visuals.
   - Add a token-bucket rate limit, following the General User Models approach, so bursts of keywords can't cause flicker.
   - Treat these numbers as starting points to tune in rehearsal; no study establishes them.
2. **Split fast retrieval from slow reasoning.** A deterministic retriever (BM25 plus embeddings plus phonetic fuzzy match on project names and aliases) should run on every committed ASR segment. The LLM director should only arbitrate among the top k candidates and the current screen. Feed the LLM only final (committed) ASR tokens, never partials, to avoid acting on text that will be revised.
3. **Put confidence on the laptop, not the projector.** Show the director's pending choice, its score and a countdown on your console, like Visual Captions' auto-suggest mode but auto-committing. Add one-key veto, back, freeze and pin, plus an "arm/disarm autonomy" toggle, reflecting the planetarium finding that predictability matters. Consider a semi-autonomous mode for sections where you expect to improvise heavily.
4. **Prefer cards; restrict generation to templates.** Allow a small set of generated slide types:
   - a quote card (verbatim from the committed transcript),
   - a big number,
   - a two-column comparison,
   - a ≤8-node Mermaid flowchart.

   Use JSON-schema structured output with a fast model and render it with your own HTML templates. Validate Mermaid by rendering it off-screen first; on failure, fall back to a bullet or quote card. Never display unvalidated free HTML.
5. **Pre-compute everything you can.** For each card, write aliases and likely Croatian and English phrasings, Croatian inflected forms of project names, and a short description, then embed them offline. This covers both Croatian morphology and ASR misspellings.
6. **ASR choice for a few days out.**
   - Shortlist two Croatian streaming APIs with keyterm support (for example Soniox and Deepgram Nova-3 `hr`, or ElevenLabs Scribe v2 Realtime). Record 10 minutes of yourself talking in the target style and measure WER and project-name recall for each.
   - Load all project names as keyterms. Deepgram's docs cap keyterms at 500 tokens in total ("~100 words" per its 10 December 2025 changelog), and long names use up more of it. If that is too small, pass the names of the current section or the top-k candidates instead of all 100+.
   - Keep a SimulStreaming + Whisper-large-v3 local fallback with an initial prompt containing the project names. Jogi et al. show that such prompting helps listed words but can hurt others.
7. **Guard against realtime-session drift.** If you use a realtime or streaming LLM session, re-send a compact system reminder and state each tick, or use stateless per-tick calls with the sliding window. The planetarium team saw instruction loss after a few turns.
8. **Log everything and rehearse twice.** Log the transcript, candidates, decisions, latencies and overrides. Count false switches and missed switches, which map onto the planetarium team's detection, reasoning and context taxonomy, and tune thresholds between rehearsals.
9. **Tell the audience it is live.** Planetarium experts said acknowledging the pilot "underlines that it's a live presentation". Briefly explaining that an AI is choosing the visuals turns occasional misses into part of the demonstration.

## Most relevant papers and projects

| Work | Year / Venue | Mechanism | Key finding | Code? |
|---|---|---|---|---|
| Principles of Mixed-Initiative UIs (Horvitz) | 1999 / CHI | Expected-utility threshold for autonomous action | Act only when EU(action) > EU(inaction); consider attention, timing, cost of poor guesses | No (theory; LookOut system) |
| Remembrance Agent / Margin Notes / Jimminy (Rhodes & Maes) | 1996 PAAM; 2000 IBM Sys. J. | Continuous context-based JITIR | Proactive, accessible yet nonintrusive; user can ignore | Historical |
| RealityTalk (Liao et al.) | 2022 / UIST | Web Speech API → spaCy keywords → authored keyword→visual table | Auto top-image retrieval was distracting; authored mapping adopted; N=15 | Gallery/project page; code not verified |
| Visual Captions (Liu et al.) | 2023 / CHI (+UIST Adjunct demo) | Fine-tuned LLM predicts visual intent from captions; 3 proactivity levels | N=26 lab, N=10 deployment; proactivity preference depends on setting; 82–87% positive crowd ratings | Yes (ARChat, unmaintained) |
| RealityChat (Jadon et al.) | 2024 / arXiv | Speech keywords + gaze confirmation in AR | Less distraction than smartphone search; 7 design guidelines | Not verified |
| VisAider (Takahira & Ueno) | 2025 / arXiv (WIP) | GPT-4o multi-stage → ranked Vega-Lite suggestions | 20–30 s latency; presenter autonomy essential | Not verified |
| VisAug (Zhao et al.) | 2025 / ACM MM | Generated visuals for speech-rich video (offline) | 81% preferred over Visual Captions retrieval | Not verified |
| Planetarium AI pilot (Brossier et al.) | 2026 / arXiv | Streaming ASR → gpt-realtime tool calls incl. no-op | Good at asset toggling, poor at pacing; majority preferred reactive mode | No |
| AutoPresent / SlidesBench (Ge et al.) | 2025 / CVPR | Code generation for slides; 8B model | Programmatic > image generation; 8B ≈ GPT-4o | Yes |
| PPTAgent (Zheng et al.) | 2025 / EMNLP | Template/reference-based deck generation | Offline document-to-deck | Yes (per paper; not opened) |
| MermaidSeqBench (IBM) | 2025 / NeurIPS | LLM-judged NL→Mermaid | Larger models better; judge-dependent scores | Benchmark released |
| Whisper-Streaming / SimulStreaming (Macháček et al.) | 2023 / 2025 IWSLT | LocalAgreement → AlignAtt streaming Whisper | 3.3 s → ~5x faster; 2–4 s regimes; prompt support | Yes |
| Canary-1B-v2 / Parakeet-TDT-0.6B-v3 (NVIDIA) | 2025 / arXiv | FastConformer multilingual ASR, 25 langs incl. hr | Avg WER 8.1% / 9.7% vs Whisper-v3 9.9% | Yes (open weights) |
| Rare-word Whisper prompting (Jogi et al.) | 2025 / arXiv | Prompt biasing list; fine-tuned B-Whisper | Rare-word error 23.7%→18.0%, but non-listed words degrade | Not verified |
| moves-cli | 2025–26 / GitHub | VAD → NeMo streaming ASR → embedding + phonetic match → keypress | 0.5–1 s; abandoned over on-stage reliability | Yes (GPL-3.0) |
| dynamic-voice-deck | ~2025–26 / GitHub | Whisper + Qwen (Groq), `go_to_slide` tool + keyword fallback | Barge-in <150 ms | Yes |

## Open Questions the Literature Does Not Answer

1. **Acceptable latency for autonomous visuals in a live talk.** No study measures how late a speech-triggered visual can appear before the audience finds it confusing, or how early it can appear before it pre-empts the speaker.
2. **Switch/stay policy.** No published work tunes thresholds, hysteresis, dwell times or rate limits for projector-level autonomy, or compares them with presenter-confirmed modes on the same content.
3. **Audience-side outcomes.** Visual Captions and RealityTalk studied speakers and conversation partners. No study I found measures comprehension, recall or perceived credibility for audiences watching an AI-directed talk, or how audiences react to visible AI mistakes.
4. **Library-scale retrieval.** None of the systems reviewed selects from 100+ visually similar cards, such as screenshots of software projects. How precise retrieval needs to be in that setting is unknown.
5. **Croatian–English code-switching ASR.** There is no independent, published streaming benchmark for Croatian with English technical terms. All code-switching claims I found come from vendors.
6. **Retrieval versus generation in live settings.** VisAug's 81% preference for generated over retrieved visuals comes from offline video. Whether that holds under a 1–3 s live budget, where generation quality falls, is untested.
7. **Diagram validity under time pressure.** No benchmark reports render-success rates for Mermaid, Graphviz or SVG from small, fast models on short, speech-derived prompts.

## Caveats

- Several key sources are preprints or work-in-progress: the planetarium study, VisAider and RealityChat. The planetarium study is small (five participants) and was affected by system instability.
- Croatian WER figures for commercial APIs are almost entirely vendor-published, and Soniox's own pages contradict each other (9.5% versus 1.25%). The Whisper-large-v3 16.18% WER figure is second-hand, cited in the Mići Princ paper from Samardžić et al. (2024).
- I did not independently verify Croatian streaming support, WER or biasing limits for Google Chirp, Azure, AssemblyAI streaming, Speechmatics, OpenAI realtime transcription or Gladia.
- The dwell-time and threshold numbers in the recommendations are engineering starting points drawn from adjacent evidence, not validated values.