Research the scientific literature and practical prior art for the following system, and write a long, well-cited report.

## The system
In a few days I give a live talk about AI (in Croatian, with English technical terms mixed in). I speak freely, with no fixed slide order. A system listens to me through the microphone, transcribes my speech in real time (streaming ASR) and autonomously decides what to show on the projector while I speak:
- choose from N pre-made "cards" (screenshots and short descriptions of 100+ software projects I built with an AI coding agent over the past year), or
- generate a new slide on the fly (a quote of what I just said, a number, a comparison, a diagram), or
- stay on the current screen.
An LLM acts as the "director": every few seconds it sees a sliding window of the transcript, what is currently on screen and the top-k candidate cards from a fast retriever, then calls a tool (show / generate / stay). The presenter has a laptop console to override it (back, freeze, pin).

## What I want to know
1. **Does published research describe this exact workflow**: a human speaks freely and a system autonomously selects or generates presentation visuals from live speech? Find the closest papers (HCI venues: CHI, UIST, CSCW, IUI, DIS; plus arXiv 2023-2026). Known starting points: RealityTalk (UIST 2022), Visual Captions (CHI 2023), the Remembrance Agent / Jimminy (Rhodes), Horvitz's "Principles of Mixed-Initiative User Interfaces" (CHI 1999). Follow their citation graphs forward to find the newest related work.
2. **Just-in-time / proactive retrieval from live speech**: how to form queries from a noisy streaming transcript, how to decide when to switch vs. stay (thresholds, hysteresis, interruption cost), and how to communicate confidence.
3. **User-study findings**: what presenters and audiences liked or disliked, failure modes (wrong, late or distracting visuals, presenter losing control), and the latency that was acceptable.
4. **Streaming ASR for Croatian in 2026**: open models (Whisper large-v3/turbo streaming, SimulStreaming, Canary/Parakeet, Croatian fine-tunes such as CLASSLA/ParlaSpeech) and commercial APIs with Croatian streaming support. Include WER evidence, latency, and how to bias recognition toward proper nouns (project names).
5. **LLM-generated slides and generative UI under a 1-3 s latency budget**: template/schema-constrained vs. free HTML, and how reliably LLMs produce diagrams.
6. **Practitioner prior art**: open-source repos, demos and blog posts (2023-2026) where an LLM listens to a live speaker and drives visuals.

## Requirements
- Cite every claim with a working link. Do not invent papers. If you cannot verify something, say so explicitly.
- Prefer concrete numbers (latencies, WER, study sample sizes, preference percentages).
- End with: (a) a table of the most relevant papers and projects (year, venue, mechanism, key finding, code available?), (b) a list of concrete design recommendations for my system, and (c) open questions that the literature does not answer.
