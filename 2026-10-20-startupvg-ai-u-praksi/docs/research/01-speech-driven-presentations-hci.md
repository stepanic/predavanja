# 01 — HCI istraživanja: prezentacije vođene govorom i živo vizualno proširenje govora

> Istraživanje: 2026-09-24. Svaki rad naveden ovdje potvrđen je dohvaćenom stranicom: OpenAlex zapisom s DOI-jem i sažetkom, arXiv PDF-om koji sam pročitao (pdftotext), PDF-om s autorove stranice ili službenim blogom/GitHubom.
> Citation graph: OpenAlex `cites:` filter nad RealityTalk (W4300309873), Visual Captions (W4366547453), Elastica, CrossTalk i Augmented Chironomia. Ukupno ~150 citirajućih radova, filtrirano ručno. Semantic Scholar API je vraćao 429 (rate limit), pa je umjesto njega korišten OpenAlex.
> **[NEPROVJERENO]** znači da tvrdnju nisam potvrdio iz primarnog izvora. **[SAMO SAŽETAK]** znači da puni tekst nije bio dostupan (ACM DL blokira skripte) i da se oslanjam samo na službeni sažetak.

## Sažetak

1. **Nijedan pronađeni rad ne opisuje točno naš workflow.** Naš workflow je: govornik uživo, nepripremljeni redoslijed, ne-engleski jezik, sustav *autonomno* bira jednu od N≈100+ unaprijed pripremljenih kartica **ili** generira novi slajd, a publika gleda projektor. Najbliži radovi pokrivaju po dva ili tri od tih elemenata:
   - **RealityTalk** (UIST '22): govor okida unaprijed pripremljene vizuale, ali preko ručne tablice ključnih riječi 1:1.
   - **Visual Captions** (CHI '23): LLM predviđa *koji* vizual prikazati iz zadnje 2 rečenice, ali u razgovoru na videopozivu i s dohvatom slika s weba.
   - **CrossTalk** (UIST '23): semantička pretraga (BERT) nad pripremljenim materijalima iz zadnjih 10 riječi, za videopozive.
   - **TalkDirector** (UIST '25): speech-to-script podudaranje nad unaprijed poravnatim slajdovima, uz izmjerenu latenciju od 132 ms.
   - **Tedric** (2019): improvizirane prezentacije s generiranim deckom. Publika ih je ocijenila kao jednako dobre kao one s deckom koji su složili ljudi.
2. **Glavni problem u svim radovima su pogreške i "šum", a ne latencija modela.** RealityTalk je izbacio automatski Google Image dohvat jer je bio "distracting" i "noise". Visual Captions navodi ASR greške i pohlepno okidanje na nedovršenim rečenicama kao dva glavna izvora pogrešaka. CrossTalk je zbog ASR latencije i grešaka u konverzacijskom govoru odustao od terenske studije.
3. **Autonomno prikazivanje dijeli ljude.** Visual Captions (lab studija): 6 ljudi preferira auto-display, 7 auto-suggest, 7 on-demand. Auto-display ima najmanji napor (1,35/7), ali i najmanju kontrolu (2,55/7). Teže je i ispraviti pogrešku (5,65/7 na skali error-prone/teško poništiti). Za nas to znači: autonomija uz **ručni override** i visok prag pouzdanosti.
4. **Pripremljeni sadržaj + fleksibilno mapiranje pobjeđuje i čistu improvizaciju i kruto skriptiranje.** Elastica (CHI '24) pokazuje da "elastično" mapiranje nad pripremljenim animacijama ispravi 73,6 % odstupanja govornika od skripte. RealityTalk sudionici hvale improvizirani, nelinearni karakter. Isto tako ne bi RealityTalk izabrali umjesto PowerPointa (4,6/7).
5. **Brojke o latenciji su rijetke, ali konzistentne.** Visual Captions: query svakih 100 ms, okida se nakon ≥4 riječi. TalkDirector: speech-script matching 132 ms, gesture 22 ms. Tedric: generiranje decka od 7 slajdova, medijan 12,3 s. VisAider (LLM rangira 8 kandidata vizualizacija, GPT-4o): 20–30 s, što autori sami opisuju kao ometanje toka. **Generiranje u sekundama je prihvatljivo samo ako se u međuvremenu nešto prikazuje.**
6. **Vizuali ne moraju ometati publiku.** Visual Captions: nema značajne razlike u mentalnom opterećenju ni frustraciji u odnosu na razgovor bez vizuala (p>0,05). TalkDirector: nema značajne razlike u percipiranoj distrakciji publike (3,08 vs 3,92, p=0,37), ali 4 od 12 sudionika prijavilo je teškoće s koncentracijom. Ometaju **ponavljanje, prenatrpanost i neprikladni vizuali**, a ne sama prisutnost vizuala.
7. **Filtar "zaslužuje li ovo vizual?"** je eksplicitna komponenta u novijim radovima. Primjeri: VisAug (Llama 3.1 8B daje ocjenu imageability 1–10, vizual tek iznad 5), personalizirano filtriranje žargona (2026: generička podrška donosi "excessive definitions") i "appropriateness score" koji predlažu autori Visual Captions.
8. **Open source koji se može odmah proučiti:** `google/archat` (Visual Captions, Apache-2.0, 97★, više se ne održava), `jlia0/RealityTalk` (AGPL-3.0), `twinters/talk-generator` (Tedric, MIT) i `meghamariamkm2002/Slide_Highlight` (poravnanje govora i regija slajda, ICDAR '25). Dataset VC1.5K (1595 rečenica→vizual) javno je objavljen uz ARChat.

---

## A. Temeljni radovi: govor → vizual uživo

### A1. RealityTalk (UIST 2022)
- **Citat:** Jian Liao, Adnan Karim, Shivesh Singh Jadon, Rubaiat Habib Kazi, Ryo Suzuki. *RealityTalk: Real-Time Speech-Driven Augmented Presentation for AR Live Storytelling.* UIST '22. DOI [10.1145/3526113.3545702](https://doi.org/10.1145/3526113.3545702) · [arXiv:2208.06350](https://arxiv.org/abs/2208.06350)
- **Što su napravili:** Webcam ili mobilni AR u kojem se tijekom govora pojavljuju tekst (ključne riječi, naslovi, liste), slike, ikone, videi i iframe (web, karte, tweetovi), a govornik ih pozicionira gestama (pointing, pinch, throw-away). Dizajn je izveden iz analize **177** video-editiranih "augmented presentation" videa.
- **Kako se vizuali biraju iz govora:** Chrome **Web Speech API** → **spaCy** (transformer model, zadržavaju se samo imenice) → **tablica ključnih riječi 1:1**. Govornik prije nastupa upiše ključnu riječ i uz nju veže vizual; sustav predlaže slike iz Google Search API-ja. Nepodudarne ključne riječi prikazuju se kao animirani tekst. Tekst nestaje nakon **4 s**, korisnički definirani elementi nakon **10 s** (može se podesiti). Liste okidaju riječi "First/Second/Third".
- **Ključna odluka dizajna:** Autori su *prvo probali potpuno automatski pristup* (prva slika s Google Image Searcha za ključnu riječ) i odustali: *"These automated visual aids are rather distracting to the presentation, increasing the noise of the presentation and sometimes making the presenter annoyed due to the lack of control."*
- **Latencija:** nije kvantificirana.
- **Studija:** N=15, prezentacija od 2–3 min, priprema 10–15 min. Ukupno 5,4/7, lako za korištenje 5,8/7, poboljšava prezentaciju 5,7/7, korisnost slika/ikona **6,0/7** (video 5,1, tekst 4,8). Brža priprema od drugih alata 5,3/7. **Preferira RealityTalk umjesto slajdova: najniža ocjena, 4,6/7.** Sudionici (P7, P14, P15) cijene "improvised, non-linear aspect". P7: bolje za "dynamic and less structured setting for improvisational talk" nego za predavanje.
- **Načini kvara:**
  - ASR greške (naglasak): "some pictures refused to pop up, making the overall experience somewhat stressful" (P1).
  - Duplikati: ako se ista ključna riječ spomene nekoliko puta u par sekundi, "shows up too many images and distracts me" (P10). Autori zaključuju da je potreban **dedup dok je vizual još na ekranu**.
  - Mapiranje 1:1 ograničava kreativnu slobodu.
  - Studija ne mjeri doživljaj publike.
- **Kod:** [github.com/jlia0/RealityTalk](https://github.com/jlia0/RealityTalk) (AGPL-3.0, zadnji push 2023-06) i [ucalgary-ilab/realitytalk](https://github.com/ucalgary-ilab/realitytalk).
- **Što nam to znači:**
  - Naš katalog kartica je "tablica ključnih riječi" u modernom obliku. Treba je obogatiti LLM/embedding sličnošću umjesto 1:1 podudaranja, ali **zadržati kuriranost**: automatski dohvat slika s weba autori su *izbacili*.
  - Obavezno uvesti **dedup/cooldown** (ne prikazivati istu karticu dok je na ekranu ili nedavno prikazana) i **minimalno vrijeme prikaza** (oni koriste 4–10 s).
  - Ne mjere publiku, pa to moramo sami provjeriti na probi.

### A2. Visual Captions (CHI 2023) + demo (UIST 2023 Adjunct)
- **Citat:** Xingyu "Bruce" Liu, Vladimir Kirilyuk, Xiuxiu Yuan, Alex Olwal, Peggy Chi, Xiang 'Anthony' Chen, Ruofei Du. *Visual Captions: Augmenting Verbal Communication with On-the-fly Visuals.* CHI '23. DOI [10.1145/3544548.3581566](https://doi.org/10.1145/3544548.3581566) · [PDF (autorova stranica)](https://duruofei.com/papers/Liu_VisualCaptions-AugmentingVerbalCommunicationWithOn-the-flyVisuals_CHI2023.pdf) · [Google Research blog](https://research.google/blog/visual-captions-using-large-language-models-to-augment-video-conferences-with-dynamic-visuals/). Demo: *Experiencing Visual Captions…*, UIST '23 Adjunct, DOI [10.1145/3586182.3615978](https://doi.org/10.1145/3586182.3615978).
- **Što su napravili:** Chrome plugin za Google Meet koji iz živih titlova predlaže ili prikazuje vizuale (slike, emoji, karte, dijagrame, osobne fotografije). Formativna studija N=10 daje **8 dimenzija dizajna** (D1 temporalno, D2 subjekt, D3 vizual, D4 skala, D5 prostor, D6 privatnost, D7 inicijacija, D8 interakcija).
- **Kako se vizuali biraju iz govora:**
  - Dataset **VC1.5K**: 1595 četvorki (jezik, vizualni sadržaj, tip, izvor), 246 crowdworkera, 15 tematskih kategorija.
  - Model: **fine-tuned GPT-3 (text-davinci-002)**, 4 epohe. Prompt = **zadnje dvije rečenice**, a izlaz ima format `"<Visual Type> of <Visual Content> from <Visual Source>"` (više prijedloga odvojenih s `;`, ili `none`).
  - Točnost: validation token accuracy 86,59 %, tip 87,6 %, izvor 86,1 %.
  - Crowd evaluacija (89 radnika, 846 zadataka): "I would like to display the visual" ≥5/7 u **83 %** slučajeva, relevantno 84 %.
  - Prije LLM-a probali su named-entity detekciju, analizu emocija i knowledge graph. Nisu bili dovoljno općeniti.
- **Latencija / okidanje:** titlovi se dohvaćaju **svakih 100 ms**. Upit se šalje za zadnje 2 rečenice (granica je interpunkcija), ali i za nedovršenu rečenicu ako ima **≥4 riječi** (`n_min = 4`), da bi sustav bio brži. Točna latencija od kraja do kraja nije navedena u radu.
- **Tri razine proaktivnosti:** auto-display (AI sam prikazuje svima), auto-suggest (privatni prijedlozi, klik za prikaz), on-demand-suggest (razmaknica).
- **Studija:** lab N=26, in-the-wild N=10 kroz 2 tjedna.
  - Preferencije: **6 auto-display / 7 auto-suggest / 7 on-demand**. Ljudi mijenjaju razinu ovisno o kontekstu, npr. "auto-display all the time, but change to on-demand mode in important meetings" (U6).
  - Auto-display: napor 1,35/7 (najniži, p<0,0001), kontrola 2,55/7 (najniža, p<0,01), teško poništiti grešku 5,65/7 (najviše, p<0,001).
  - Vizuali **nisu** povećali mentalno ni fizičko opterećenje ni frustraciju u odnosu na razgovor bez vizuala (p>0,05).
  - Vizuali su **usmjeravali razgovor**: 13 sudionika se složilo da su vizuali davali teme.
  - Paradoks percipirane latencije: kod on-demand načina ljudi osjete **značajno više kašnjenja**, iako je latencija ista. Kad AI radi proaktivno, pažnja je na razgovoru pa se kašnjenje manje primijeti.
- **Načini kvara (iz rasprave):**
  1. **ASR greške** dovode do "drastically incorrect visual suggestions".
  2. **Pohlepno okidanje na nedovršenim rečenicama** (primjer: "San Francisco is a beautiful city", gdje se okine prerano). Predlažu Wait-k politiku i stability score kao kod live prijevoda.
  3. Kod auto-display načina korisnik mora stalno pratiti što se prikazuje ("I always pay attention to the spotlight view, and immediately check whether the image displayed is appropriate", P17).
  4. Privatnost osobnih fotografija.
  5. Predlažu **visual appropriateness score** i prag filtriranja, osobito za auto-display.
  6. Predlažu **vizualnu koherenciju** (isti stil kroz cijeli razgovor).
- **Kod:** [github.com/google/archat](https://github.com/google/archat) (Apache-2.0, 97★, "no longer under active maintenance"). VC1.5K je objavljen uz repo.
- **Što nam to znači:** Ovo je najbliži analog našem "directoru".
  1. Kontekst = zadnje ~2 rečenice ili fiksni prozor riječi.
  2. Izlaz modela je **strukturirana odluka** (tip + sadržaj + izvor), ne slobodni tekst. Kod nas: `{action: show_card|generate|hold, card_id, confidence}`.
  3. Treba razmisliti o `n_min` i o tome čekamo li kraj rečenice. Hrvatski ASR će imati više grešaka, pa je bolje čekati stabilne segmente.
  4. **Moramo imati "hold"/`none` kao legitiman izlaz.** U VC1.5K "none" je bila ispravna oznaka za dio rečenica, a model za 53 od 319 testnih rečenica nije predložio ništa (266/319 je imalo barem jedan prijedlog).
  5. Budući da je govornik jedan i izlaže javno, najbliži su "auto-display s overrideom" ili "auto-suggest na privatnom ekranu govornika". Vrijedi napraviti oba načina i prebacivati se između njih uživo.

### A3. CrossTalk (UIST 2023)
- **Citat:** Haijun Xia, Tony Wang, Aditya Gunturu, Peiling Jiang, William Duan, Xiaoshuo Yao. *CrossTalk: Intelligent Substrates for Language-Oriented Interaction in Video-Based Communication and Collaboration.* UIST '23. DOI [10.1145/3586183.3606773](https://doi.org/10.1145/3586183.3606773) · [arXiv:2308.03311](https://arxiv.org/abs/2308.03311)
- **Što su napravili:** Videokonferencijski sustav s "panelima" (PDF, video, karte, web). Sustav iz govora prepoznaje namjeru i nenametljivo preporučuje sadržaj ili akciju (npr. otvori stranicu PDF-a, skoči na timestamp u videu).
- **Kako se biraju vizuali:** Web Speech API → **klizni prozor od zadnjih 10 prepoznatih riječi** kao upit → **BERT semantička pretraga** nad svim tekstom u panelima (tekst PDF-a, opisi slika, transkripti videa, opisi akcija) → pravila i Google Cloud NLP entiteti za finu granulaciju. Klasifikator akcija (weighted KNN, k=5 nad BERT sličnostima): precision 0,89, recall 0,90, F1 0,89 na 294 rečenice (pola "šum" rečenica iz Kaggle Human Conversation dataseta).
- **UI odluke:** preporuke se prikazuju periferno i nestaju nakon praga (npr. 5 s), da ne ometaju. Dizajn je izričito vođen smjernicama za mixed-initiative (Horvitz) i Guidelines for Human-AI Interaction.
- **Latencija:** nije kvantificirana. Studija navodi: *"our pilot tests showed that state-of-the-art speech recognition models still produced significant latency and errors for conversational speech in the wild"*, pa su umjesto terenske napravili kontroliranu studiju. P6: speech recognition je bio "laggy and unresponsive".
- **Studija:** N=13, 1 h. 8/13 "strongly agree" i 5/13 "agree" da je lako za korištenje kad sustav točno prepozna namjeru. Efekt novosti ("magical"). Problemi: vidljivost (ne zna se što sustav može), nesigurnost oko toga kad sustav "sluša".
- **Autori predlažu:** (1) utvrditi koja je latencija prihvatljiva za konverzacijske sustave, (2) prijeći s *detekcije* namjere na *predikciju* namjere iz konteksta.
- **Što nam to znači:**
  - Arhitektura "klizni prozor riječi → semantička pretraga nad opisima pripremljenog sadržaja" je doslovno naš brzi put za odabir kartice i objavljena je kao funkcionalna.
  - Test skup s namjerno umiješanim "šum" rečenicama je dobar obrazac za naš eval: pola upita neka budu rečenice koje **ne bi smjele** okinuti karticu.
  - Periferni prijedlozi koji sami nestaju idu na ekran govornika, ne na projektor.
  - Njihov problem je ASR u konverzacijskom govoru. Monolog na pozornici je lakši slučaj, ali hrvatski je teži.

### A4. Elastica (CHI 2024)
- **Citat:** Yining Cao, Rubaiat Habib Kazi, Li-Yi Wei, Deepali Aneja, Haijun Xia. *Elastica: Adaptive Live Augmented Presentations with Elastic Mappings Across Modalities.* CHI '24. DOI [10.1145/3613904.3642725](https://doi.org/10.1145/3613904.3642725) · [PDF](https://rrrima.github.io/pdf/chi24_rima_elastica.pdf)
- **Što su napravili:** "Adaptive presentations". Unaprijed definirane animacije vezane su uz riječi u skripti, a u živo izvođenje se **elastično prilagođavaju** govoru i gestama (script following + motion warping). Uspoređuju tri pristupa: bez mapiranja (predefinirana animacija), kruto mapiranje i elastično mapiranje.
- **Kako se vizuali biraju iz govora:** **Microsoft Azure Speech-to-Text** → *ScriptLocationPredictor* (tokenizacija rečenica, indeksiranje, **fuzzy word matching** za predviđanje pozicije u skripti) → *ScriptAdvancer* (pomiče poziciju u skripti) → okidanje animacije. Nema LLM-a.
- **Studije:** Studija 1 N=8 (reprodukcija + vlastita kreacija), studija 2 N=6 (usporedba tri pristupa). Kodiranje 16 videa: **91 animacija s odstupanjima** (preskočene ili krivo izgovorene riječi, neprecizne geste). Adaptacija je riješila **73,6 %**. Od 24 kvara, 5 je "failure to adapt" (npr. okidač na prvoj riječi rečenice ili više animacija na kratkim uzastopnim riječima) i 19 "flawed adaptations" (prerano ili prekasno, npr. "animation ending late" kod odstupanja u govoru).
- **Nalazi:** Sudionici su postupno gradili povjerenje kroz preview i probe: prvo su bili nervozni i "čekali" animaciju, a nakon 1–2 probe nastupali su prirodnije. "Predefined states put minds at ease." Kritika skriptiranja: skripta ograničava spontanost.
- **Što nam to znači:**
  - Kruti okidači na točne riječi pucaju na stvarnom govoru. Već se na engleskom s pripremljenom skriptom četvrtina odstupanja ne riješi.
  - Za hrvatski i improvizaciju fuzzy word matching nije dovoljan. Treba semantičko podudaranje, ali Elastica potvrđuje da **pripremljeni ciljni sadržaj** daje sigurnost govorniku.
  - **Proba sa sustavom** gradi povjerenje (2 probe su bile dovoljne), pa treba planirati barem 2 generalne probe prije predavanja.

### A5. Augmented Chironomia (UIST 2022)
- **Citat:** Brian D. Hall, Lyn Bartram, Matthew Brehmer. *Augmented Chironomia for Presenting Data to Remote Audiences.* UIST '22. DOI [10.1145/3526113.3545614](https://doi.org/10.1145/3526113.3545614) · [arXiv:2208.04451](https://arxiv.org/abs/2208.04451)
- **Što su napravili:** Grafovi preklopljeni preko webcam slike govornika, kojima se upravlja bimanualnim praćenjem ruku (highlight i manipulacija). **Nije vođeno govorom.** Kontrola je gestama.
- **Studije:** prezenteri N=12, publika N=17 (profesionalci koji redovito prezentiraju ili slušaju prezentacije podataka). Publika opisuje veći angažman: "it's drawing attention because it's so engaging" (A-sudionici).
- **Što nam to znači:** Relevantno uglavnom kao dokaz da publika pozitivno reagira kad je govornik "u" vizualu. Za nas je pouka da **ručni kanal** (klik, gesta) ostaje važan kao override uz govorni kanal.

---

## B. Noviji radovi (2024–2026) iz citation grapha

### B1. TalkDirector (UIST 2025)
- **Citat:** Geonsun Lee, Yuran Ding, Vrushank Phadnis, Dinesh Manocha, Ruofei Du. *TalkDirector: Real-time Multimodal Slide Augmentation via Adaptive Presenter Integration.* UIST '25 (Busan). [PDF (UMD)](https://www.cs.umd.edu/sites/default/files/scholarly_papers/202501_Ding,_Yuran_Scholarly_Paper.pdf). **[NEPROVJERENO]**: DOI u PDF-u je placeholder, a OpenAlex rad ne indeksira. UIST '25 potvrđuje ACM reference u PDF-u i rezultat pretrage.
- **Što su napravili:** Online prezentacija u kojoj se video govornika dinamički pozicionira i skalira *unutar* slajda, blizu sadržaja o kojem trenutno govori. Dataset **VTalk-68** (68 prezentacija, 275 min).
- **Kako se sadržaj bira iz govora:** Dvije faze.
  - **Offline:** GPT-4o (s "refinerom" i "labelerom" protiv halucinacija) poravnava skriptu s elementima slajda.
  - **Uživo:** **Web Speech API** (brzi, trenutni rezultati) + **Whisper API** (periodična korekcija točnosti) → fuzzy/semantičko podudaranje transkripta s pred-poravnatim segmentima skripte.
- **Latencija (N=180 mjerenja):** gesture recognition **22 ms**, **speech-script matching 132 ms** (±24), blank-space detekcija 49 ms, repozicioniranje 28 ms. Skupe LLM operacije su prebačene u predprocesiranje.
- **Studije:** prezenteri N=12, publika N=12.
  - Prezenteri: priprema **58,8 s vs 137,5 s** (baseline), govornik vidljiv 2,7× dulje.
  - Publika: distrakcija 3,08 vs 3,92 (n.s., p=0,37), pažnja 4,50 vs 5,17 (n.s.). 9/12 kaže da su više slušali govornika nego sami čitali slajd, a **4 sudionika prijavljuju teškoće s koncentracijom**. Citat: "almost felt like watching a TikTok video – in a good way".
- **Što nam to znači:**
  - Najjasniji dokaz za arhitekturu **"LLM offline, jeftino podudaranje online"**. Opise, ključne fraze i embeddinge svih kartica treba izračunati unaprijed (Claude obogati svaku karticu), a uživo raditi samo brzo podudaranje od ~100 ms.
  - **Dvostruki ASR** (brzi interim + točniji periodični) je obrazac koji vrijedi kopirati.
  - Postoji manjina publike kojoj dinamika smeta, pa promjene treba prigušiti (fade, bez treperenja).

### B2. Dynamite (VL/HCC 2025)
- **Citat:** Panayu Keelawat, David Barron, Kaushik Narasimhan, Daniel Manesh, Xiaohang Tang, Xi Chen, Sang Won Lee, Yan Chen. *Dynamite: Real-Time Debriefing Slide Authoring through AI-Enhanced Multimodal Interaction.* IEEE VL/HCC 2025. DOI [10.1109/vl-hcc65237.2025.00023](https://doi.org/10.1109/vl-hcc65237.2025.00023) · [arXiv:2507.20137](https://arxiv.org/abs/2507.20137)
- **Što su napravili:** Nastavnik tijekom živog razgovora u razredu (etika) slaže debriefing slajdove. "Semantic data binding" veže blokove slajda na podatke iz rasprave koji se mijenjaju, a GPT-4o daje prijedloge. Nastavnik koristi glas i skicu.
- **Studija:** N=12, within-subject, usporedba s tekstualnim AI baselineom: točnost odabira teme **97,5 % vs 75 %**, layouta 91,6 % vs 61,6 %. U formativnoj studiji (N=10) 6/10 sudionika jedva je završilo slajdove u 10 min uz čisti LLM chat.
- **Što nam to znači:** Generiranje slajdova "uživo" je izvedivo kad LLM **puni unaprijed definirane blokove ili predloške**, a ne kad slobodno piše. To je dokaz iz HCI-ja za našu odluku da generirane slajdove radimo kao JSON u fiksnim predlošcima. Kod njih čovjek ostaje urednik, a kod nas je taj urednik "director" LLM.

### B3. VisAug (ACM MM 2025)
- **Citat:** Baoquan Zhao, Xiaofan Ma, Qianshi Pang, Ruomei Wang, Fan Zhou, Shujin Lin. *VisAug: Facilitating Speech-Rich Web Video Navigation and Engagement with Auto-Generated Visual Augmentations.* ACM MM '25. DOI [10.1145/3746027.3754584](https://doi.org/10.1145/3746027.3754584) · [arXiv:2508.03410](https://arxiv.org/abs/2508.03410)
- **Što su napravili:** Offline vizualno proširenje videa s puno govora (predavanja, intervjui). Generirane slike postavljaju se u područja kadra koja nisu salijentna.
- **Kako:** WhisperX → **Llama 3.1 8B Instruct daje ocjenu imageability (1–10) za svaki segment**, s globalnim kontekstom (sažetak) i lokalnim (5 prethodnih segmenata) → augmentacija samo za segmente s ocjenom >5 → LLM piše prompt → text-to-image.
- **Studija:** N=20. **81 % preferencija** generiranih vizuala naspram retrieval pristupa Visual Captions (semantičko podudaranje 5,67 vs 5,54, vizualna privlačnost 5,71 vs 5,08). Nije u stvarnom vremenu.
- **Što nam to znači:** Ideja **"prvo procijeni zaslužuje li ovaj trenutak vizual, pa tek onda biraj koji"** je jeftin i efikasan filtar. Kod nas se može ugraditi u director prompt kao prvi korak (`hold` ako je niska imageability). Usporedba s retrievalom je rađena na web slikama, dok su naše kartice kurirane, pa rezultat ne vrijedi izravno za nas.

### B4. Augmented Conversation / RealityChat (arXiv 2024)
- **Citat:** Shivesh Jadon, Mehrad Faridan, Edward Mah, Rajan Vaish, Wesley Willett, Ryo Suzuki. *Augmented Conversation with Embedded Speech-Driven On-the-Fly Referencing in AR.* [arXiv:2405.18537](https://arxiv.org/abs/2405.18537) (preprint, 2024). Autore potvrđuju arXiv PDF i referenca u VisAideru.
- **Što su napravili:** AR (HMD) za razgovor licem u lice. Ključne riječi iz govora postaju interaktivni elementi (slike, karta, Wikipedia), koje korisnik bira pogledom (gaze/dwell).
- **Kako:** real-time ASR → ekstrakcija ključnih riječi i entiteta → pretraga referenci. Ključne riječi su obojene po kategoriji (ljudi crveno, lokacije plavo).
- **Dizajnerske smjernice (G1–G7) iz iteracija:** uključuju "**G2 Augment not Automate**" i "**G7 Minimize Latency**" ("latency can directly affect usability"). Autori su probali auto-prikaz svega i odustali jer je *tjerao korisnika da prati nevažne informacije*.
- **Studija:** N=13. Sudionici su bili podijeljeni oko toga ometa li sustav, **većina preferira vizualne reference (slike, karte) pred tekstom**.
- **Što nam to znači:** Opet: slike ispred teksta, i automatizacija samo tamo gdje je pouzdana. Treba napomenuti da je ovo privatni HMD, a ne javni projektor.

### B5. Real-Time Adaptive Visual Backgrounds for Supporting Dialogue (2025)
- **Citat:** Hibiki Harano, Hirotaka Ōsawa. DOI [10.1145/3765766.3765790](https://doi.org/10.1145/3765766.3765790). **[SAMO SAŽETAK]**. Venue iz DOI prefiksa nisam potvrdio.
- **Što:** Sustav koji iz razgovora u stvarnom vremenu (ASR → LLM → generiranje slike) prikazuje **ambijentalnu generiranu pozadinu** iza sudionika.
- **Studija:** within-subjects N=20, tri uvjeta: statična pozadina, **irelevantne slike** i semantički adaptivne slike. Adaptivne slike su značajno podigle užitak i percipiranu dubinu razgovora, **uz razinu ometanja usporedivu s kontrolom**.
- **Što nam to znači:** Jedini pronađeni rad koji ima uvjet "irelevantne slike". Relevantnost je ta koja donosi korist, a ne sama prisutnost slike. Ambijentalni ili pozadinski generirani vizual je dobar **fallback dok se čeka** prava kartica ili generirani slajd.

### B6. StopGap: real-time LLM knowledge support (CHI 2025) i personalizirani žargon (2026)
- **Citati:**
  - Yuhan Liu, Aadit Shah, Jordan Ackerman, Manaswi Saha. *Exploring the Design Space of Real-time LLM Knowledge Support Systems: A Case Study of Jargon Explanations.* CHI '25. DOI [10.1145/3706598.3714262](https://doi.org/10.1145/3706598.3714262) · [arXiv:2503.00715](https://arxiv.org/abs/2503.00715)
  - Yifan Song et al. *Breaking the Curse of Knowledge: Toward Personalized Jargon Support in Online Meetings.* 2026 (DOI prefiks upućuje na CHI '26 EA, **[NEPROVJERENO]** venue), DOI [10.1145/3772363.3798465](https://doi.org/10.1145/3772363.3798465) **[SAMO SAŽETAK]**
- **Što:** StopGap koristi Whisper + GPT-4 i prikazuje objašnjenja žargona tijekom videa u više formata: definicija, metafora, lista, konceptualni dijagram, slika. Studija N=24.
- **Nalazi:**
  - Velike individualne razlike u preferiranom formatu, uz naglasak na agenciji korisnika i mixed-initiative pristupu.
  - "More visual information does not necessarily mean more distraction."
  - Liste s previše riječi smetaju.
  - U radu iz 2026., **generička** podrška poboljšava razumijevanje, ali smanjuje angažman zbog "excessive definitions". **Personalizirana** podrška (profil slušatelja od jedne rečenice) filtrira pojmove i zadržava angažman.
- **Što nam to znači:** Director treba znati **tko je publika** (jedna rečenica u system promptu: npr. "opća publika, ne-programeri, hrvatski") da ne bi "objašnjavao" očite stvari. Više vizuala nije automatski bolje. **Filtrirati.**

### B7. Tedric: automatski generirani deckovi za improvizirane prezentacije (2019)
- **Citat:** Thomas Winters, Kory W. Mathewson. *Automatically Generating Engaging Presentation Slide Decks.* [arXiv:1903.09308](https://arxiv.org/abs/1903.09308) (EvoMUSART 2019 prema bilješci u radu; **[NEPROVJERENO]** venue).
- **Što:** Generator decka za format "Improvised TED Talk" (PowerPoint karaoke). Iz jedne teme koju zada publika generira 7 slajdova po shemi prezentacije: naslov, "about me", izjave, grafovi, slike.
- **Brojke:**
  - Generiranje: **94,4 % deckova unutar 20 s**, medijan **12,29 s**, maksimum 38 s (jedan outlier 58 s). Čisto računanje traje 2,49 s, a ~80 % vremena otpada na čekanje vanjskih izvora sadržaja.
  - Evaluacija: 8 improvizatora, 6 talkova (3 s deckovima ljudi, 3 generirana, izmiješano naslijepo). Kvaliteta generiranih deckova je **"on par"** s ljudskima (χ² bez ocjena 1: p=0,148).
  - Kvalitativno: govornici se žale na nepredvidljivost ("new slide or an additional animation next?") i na "too many words in the presenter's mouth". Generirani deck ne radi za format panela s 3 govornika.
- **Kod:** [github.com/twinters/talk-generator](https://github.com/twinters/talk-generator) (MIT).
- **Što nam to znači:**
  - Improvizatori prihvaćaju vizuale koje nisu vidjeli unaprijed, *ako su strukturirani*.
  - **Nepredvidljivost prijelaza** je stvarni problem za govornika. Naš govornik mora na privatnom ekranu vidjeti što slijedi ili što je predloženo.
  - Manje teksta na slajdu, jer tekst "stavlja riječi u usta" govorniku.

### B8. Ostali relevantni radovi iz citation grapha (kraće)
- **ChatDirector** (CHI '24, Qian … Du, DOI [10.1145/3613904.3642110](https://doi.org/10.1145/3613904.3642110)) **[SAMO SAŽETAK]**: 3D avatari u videopozivu. Decision tree na temelju stanja govora ("speech-driven layout transition") mijenja raspored. N=16. Pouka: jednostavna pravila nad stanjem govora (tko govori, pauza) mogu voditi *layout*, a skupa semantika *sadržaj*.
- **CoExplorer** (CHI '24 EA, Park, Panda, Tankelevitch, Rintel, DOI [10.1145/3613905.3650797](https://doi.org/10.1145/3613905.3650797)) **[SAMO SAŽETAK]**: prije sastanka GenAI generira faze, a tijekom sastanka speech recognition prepoznaje fazu i mijenja layout prozora i aplikacija. Pouka: **unaprijed isplanirane "faze" + prepoznavanje trenutne faze iz govora**. Kod nas to bi bile tematske sekcije predavanja kao prior za odabir kartica.
- **InstInfo** (Ros, Suresh, Zhai, 2025, DOI [10.1145/3726302.3730146](https://doi.org/10.1145/3726302.3730146), vjerojatno SIGIR '25 demo, **[NEPROVJERENO]** venue) **[SAMO SAŽETAK]**: transkribira prezentaciju uživo i preporučuje znanstvene radove prema idejama o kojima se govori. Samo neformalne studije upotrebljivosti. Pouka: "just-in-time retrieval iz govora prezentera" postoji kao demo, ali bez rigorozne evaluacije.
- **VisAider** (Takahira, Ueno, [arXiv:2510.14247](https://arxiv.org/abs/2510.14247), WIP 2025): GPT-4o iz konteksta (dataset, trenutna vizualizacija, razgovor, profil publike) rangira kandidate vizualizacija. **Latencija 20–30 s za 8 kandidata**, što "disrupts presentation flow". Pouka: **ne generirati više kandidata sekvencijalno u kritičnom putu**. Rangiranje nad pripremljenim kandidatima je brže od generiranja.
- **Attend to what I say** (Megha Mariam K M, C. V. Jawahar, ICDAR 2025, [arXiv:2601.10244](https://arxiv.org/abs/2601.10244)): offline poravnanje ASR-a (WhisperX) i OCR regija slajda (Amazon Textract) za isticanje relevantne regije. Kod: [github.com/meghamariamkm2002/Slide_Highlight](https://github.com/meghamariamkm2002/Slide_Highlight). Pouka: ako kartica ima više regija (screenshot + opis), može se istaknuti regija o kojoj govornik priča.
- **MeetMap** (Chen et al., PACM HCI 2025, DOI [10.1145/3711030](https://doi.org/10.1145/3711030), [arXiv:2502.01564](https://arxiv.org/abs/2502.01564)): LLM uživo gradi dialogue mapu. Human-Map vs AI-Map, 10 parova. Korisnici cijene nizak napor AI-Map varijante, a u Human-Map vrijednost vlastitog sense-makinga.
- **CollEagle** (Adan, Dritsa, Houben, ACM 2026, DOI [10.1145/3800645.3812930](https://doi.org/10.1145/3800645.3812930)) **[SAMO SAŽETAK]**: tabletop koji iz govora kontinuirano generira *kandidate* sadržaja, a ljudi ih kuriraju. "Mixed-initiative: implicit automation + explicit manipulation".
- **InsightBridge** (CHI '25, DOI [10.1145/3706598.3713640](https://doi.org/10.1145/3706598.3713640)) **[SAMO SAŽETAK]**: iz intervjua uživo gradi empathy mapu i generira vizualne sažetke za provjeru. N=32.
- **"When Constraints Limit and Inspire"** / ReSlide (2026, DOI [10.1145/3800645.3813023](https://doi.org/10.1145/3800645.3813023)) **[SAMO SAŽETAK]**: formativna studija s 10 prezentera. Vrijeme, publika i komunikacijska namjera su ključna ograničenja kod ponovne upotrebe slajdova kroz više sesija.
- **A Design Space for Intelligent Dialogue Augmentation** (Chan, Marx, Kim, El-Assady, IUI '25, DOI [10.1145/3708359.3712096](https://doi.org/10.1145/3708359.3712096)): potvrđeno postojanje, ali sažetak nije dostupan u OpenAlexu. **Nisam pročitao.** Vrijedi pročitati kao taksonomiju.
- **TalkSketch** ([arXiv:2511.05817](https://arxiv.org/abs/2511.05817)): skiciranje + govor → GenAI za ideaciju dizajnera. Formativna studija N=6: tekstualni promptovi prekidaju kreativni tok. Samo tangencijalno relevantno.
- **Trinity** ([arXiv:2411.17015](https://arxiv.org/abs/2411.17015)): GPT-4 podrška *govorniku* (tempo, geste, promptovi) na akademskim prezentacijama za EFL studente. 33 prezentera i 21 slušatelj. Tangencijalno: to je teleprompter-podrška, ne vizuali za publiku.

---

## C. Klasični radovi o nelinearnim i improviziranim prezentacijama (prije LLM-a)

### C1. NextSlidePlease (CHI EA 2009; ACM TOMM 2012)
- **Citat:** Ryan P. Spicer, Aisling Kelliher. CHI EA '09, DOI [10.1145/1520340.1520588](https://doi.org/10.1145/1520340.1520588). Proširena verzija: Spicer, Lin, Kelliher, Sundaram, ACM TOMM 2012, DOI [10.1145/2379790.2379795](https://doi.org/10.1145/2379790.2379795). **[SAMO SAŽETAK]**
- **Što:** Prezentacija kao **usmjereni graf** umjesto linearnog niza. Algoritam za **upravljanje vremenom i odabir puta** tijekom izlaganja pomaže prioritizirati sadržaj. Motivacija iz 2009.: linearni slideware "does not … facilitate improvisational presentation of material".
- **Nalazi (2012):** dvije usporedne studije. Pristup grafom potiče hiperlinkove, razmišljanje o vezama među sadržajima i bolje razumijevanje posljedica odabira na vrijeme.
- **Što nam to znači:** Naš katalog kartica je implicitno graf. Vrijedi dodati **rubove "povezano s"** između kartica (npr. "slični projekti" i "tehnički nastavak") i **svijest o vremenu**, da director zna koliko je još preostalo i što je "must-show".

### C2. Fly (CHI 2009)
- **Citat:** Leonhard Lichtschlag, Thorsten Karrer, Jan Borchers. *Fly: A Tool to Author Planar Presentations.* CHI '09, DOI [10.1145/1518701.1518786](https://doi.org/10.1145/1518701.1518786) · [projekt](https://hci.rwth-aachen.de/fly) **[SAMO SAŽETAK]**
- **Što:** Prezentacija na ravnini, kao karta (preteča Prezi-ja), koja se oslanja na chunking, asocijacije i prostornu memoriju.
- **Što nam to znači:** Prostorni raspored kartica (npr. klasteri po domeni) može publici dati orijentaciju ("gdje smo") dok sustav skače nelinearno. To je opcija za "overview" ekran.

### C3. HyperSlides (CHI 2013)
- **Citat:** Darren Edge, Joan Savage, Koji Yatani. *HyperSlides: Dynamic Presentation Prototyping.* CHI '13, DOI [10.1145/2470654.2470749](https://doi.org/10.1145/2470654.2470749) **[SAMO SAŽETAK]**
- **Što:** Grounded theory studija prezentiranja + alat koji iz markupa hijerarhijskih "scena" algoritamski generira hiperlinkane slajdove konzistentnog minimalističkog stila.
- **Nalazi:** pomaže organizaciji ideja, štedi vrijeme i daje fleksibilniju probu i izlaganje od linearnih slajdova, **uz cijenu manje kontrole nad layoutom i većeg opterećenja navigacijom**.
- **Što nam to znači:** Opterećenje navigacijom je upravo ono što naš sustav preuzima od govornika. Ali iz HyperSlidesa slijedi da je automatski generirani **konzistentan minimalistički stil** prihvatljiva cijena za fleksibilnost. To podržava predloške za generirane slajdove.

### C4. Prezi vs PowerPoint vs usmeno (PLOS ONE 2017)
- **Citat:** Samuel T. Moulton, Selen Türkay, Stephen M. Kosslyn. *Does a presentation's medium affect its message? PowerPoint, Prezi, and oral presentations.* PLOS ONE 12(7), 2017. DOI [10.1371/journal.pone.0178774](https://doi.org/10.1371/journal.pone.0178774) **[SAMO SAŽETAK iz OpenAlexa]**. Autore nisam provjerio iz primarnog izvora, pa su **[NEPROVJERENO]**.
- **Što nam to znači:** Jedini pronađeni empirijski rad koji uspoređuje medije prezentacije iz perspektive publike. Detalje treba pročitati prije citiranja.

### C5. TalkMiner (ACM MM 2010) i SlideSpeech (ICASSP 2024)
- **TalkMiner:** Adcock, Cooper, Denoue, Pirsiavash, Rowe. DOI [10.1145/1873951.1873986](https://doi.org/10.1145/1873951.1873986). Tražilica za video-predavanja koja indeksira riječi sa slajdova u videu. Offline, relevantno samo kao povijest poravnanja slajda i govora.
- **SlideSpeech:** Haoxu Wang et al. DOI [10.1109/icassp48485.2024.10448079](https://doi.org/10.1109/icassp48485.2024.10448079) · [arXiv:2309.05396](https://arxiv.org/abs/2309.05396). 1705 videa, 1000+ h, 473 h transkribirano, sa sinkroniziranim slajdovima. **Ključne riječi iz slajdova kao kontekst poboljšavaju ASR** (contextual ASR).
- **Što nam to znači (SlideSpeech):** Obrnuti smjer je jednako koristan. **Imena projekata i ključne riječi iz kartica treba dati ASR-u kao bias/hint listu** (custom vocabulary, keyword boosting), jer imena poput "Claude Code" ili imena naših projekata inače padaju na hrvatskom ASR-u. Detalji su u dokumentu 03.

---

## D. Tablica radova

| # | Rad | God. / venue | Ulaz | Kako bira vizual | Pripremljeni sadržaj? | Latencija (navedena) | Studija | Kod |
|---|---|---|---|---|---|---|---|---|
| A1 | RealityTalk | 2022 UIST | Web Speech API | spaCy imenice + tablica ključnih riječi 1:1 | Da (ručno mapirano) | — (prikaz 4 s / 10 s) | N=15 prezentera | jlia0/RealityTalk (AGPL) |
| A2 | Visual Captions | 2023 CHI | Google Meet titlovi | Fine-tuned GPT-3 na zadnje 2 rečenice → tip/sadržaj/izvor | Ne (web/osobni album) | poll 100 ms, okidanje ≥4 riječi | N=26 lab + N=10 2 tj. + 89 crowd | google/archat (Apache) |
| A3 | CrossTalk | 2023 UIST | Web Speech API | Zadnjih 10 riječi → BERT semantička pretraga + pravila | Da (paneli) | "laggy" ASR; nema brojke | N=13 | — |
| A4 | Elastica | 2024 CHI | Azure STT | Fuzzy word matching u skripti | Da (skripta + animacije) | — | N=8 + N=6; 73,6 % odstupanja riješeno | — |
| A5 | Augm. Chironomia | 2022 UIST | Praćenje ruku | Geste (ne govor) | Da (grafovi) | — | N=12 prezentera + N=17 publike | — |
| B1 | TalkDirector | 2025 UIST* | Web Speech + Whisper | GPT-4o offline poravnanje; online fuzzy/semantičko podudaranje skripte | Da (slajdovi + skripta) | **132 ms** speech-script, 22 ms gesta | N=12 prezentera + N=12 publike | najavljen, nije nađen |
| B2 | Dynamite | 2025 VL/HCC | Glas + skica + podaci rasprave | GPT-4o semantičko vezanje blokova | Djelomično (predlošci) | — | N=12 (+ N=10 formativna) | — |
| B3 | VisAug | 2025 ACM MM | WhisperX (offline) | Llama 3.1 8B imageability >5 → T2I | Ne (generirano) | offline | N=20; 81 % preferira generirano | — |
| B4 | RealityChat | 2024 arXiv | ASR | Ključne riječi/entiteti → pretraga | Ne (web) | "minimize latency" (G7) | N=13 | — |
| B5 | Adaptive Backgrounds | 2025 | ASR | LLM → generiranje slike | Ne | — | N=20 (uklj. uvjet irelevantnih slika) | — |
| B6 | StopGap | 2025 CHI | Whisper | GPT-4 detekcija žargona | Ne | — | N=24 | — |
| B7 | Tedric | 2019 arXiv | Tema od publike | Generator po shemi decka | Ne (generirano) | medijan 12,3 s / 7 slajdova | 8 improvizatora, 6 talkova | twinters/talk-generator (MIT) |
| B8 | VisAider | 2025 arXiv WIP | Razgovor + dataset | GPT-4o rangira 8 kandidata | Djelomično | **20–30 s** (problem) | nema (formativna N=3) | — |
| B8 | CoExplorer | 2024 CHI EA | ASR | Prepoznavanje faze sastanka | Da (generirane faze) | — | tehnološki probe | — |
| B8 | InstInfo | 2025 | ASR | Preporuka radova po temi | Ne (literatura) | — | neformalno | instinfo.com |
| B8 | Attend to what I say | 2025 ICDAR | WhisperX + OCR | Poravnanje govora i regija slajda | Da | offline | benchmark | Slide_Highlight |
| C1 | NextSlidePlease | 2009 / 2012 | Ručno | Graf + odabir puta prema vremenu | Da | — | 2 usporedne studije | — |
| C2 | Fly | 2009 CHI | Ručno | Planarni raspored | Da | — | — | — |
| C3 | HyperSlides | 2013 CHI | Ručno | Hiperlinkane scene | Da | — | evaluacija | — |
| C5 | SlideSpeech | 2024 ICASSP | Audio + slajdovi | Slajdovi → kontekstualni ASR | — | — | 1000+ h korpus | — |

\* TalkDirector: UIST '25 prema PDF-u; DOI nije potvrđen.

---

## E. Dizajnerske lekcije za naš sustav

1. **Kurirani katalog, ne web dohvat.** RealityTalk i RealityChat su oba odustala od automatskog prikaza web rezultata ("noise", "distracting", "annoyed"). Naših 100+ kartica je prednost. Generiranje novih slajdova treba ostati **iznimka s visokim pragom**.
2. **Offline obogati, online samo podudaraj.** TalkDirector sve skupe GPT-4o operacije radi u predprocesiranju, a uživo mu podudaranje traje 132 ms. Za svaku karticu treba unaprijed generirati: opis, 10–20 fraza kako bih je *mogao* najaviti na hrvatskom, sinonime i embedding.
3. **Klizni prozor + semantička pretraga je dokazana osnova.** CrossTalk koristi 10 riječi, Visual Captions 2 rečenice ili ≥4 riječi. Kontekst treba biti kratak, ali ne jedna riječ.
4. **Ne okidaj na nedovršenim mislima.** Visual Captions navodi pohlepno okidanje kao drugi glavni izvor grešaka. Koristiti stabilne (final) ASR segmente za *prikaz*, a interim segmente samo za *pripremu* (prefetch, zagrijavanje kandidata).
5. **"Ništa" je valjana odluka.** Uvesti eksplicitni `hold`. VisAug prikazuje vizual tek za imageability >5, a VC1.5K ima oznaku "none". Test skup treba sadržavati ~50 % rečenica koje ne smiju ništa okinuti (CrossTalk metoda).
6. **Dedup i minimalno trajanje prikaza.** Ne ponavljati istu karticu dok je na ekranu. RealityTalk P10: "too many images and distracts me". Kartica ostaje ≥8–10 s (RealityTalk: 10 s za korisnički definirane vizuale).
7. **Razine proaktivnosti s prebacivanjem uživo.** Visual Captions je pokazao da nema jedne optimalne razine (6/7/7) i da ljudi mijenjaju razinu prema kontekstu. Treba nam prekidač: *auto* (sustav prikazuje) / *suggest* (prijedlog na govornikovom ekranu, potvrda clickerom) / *manual*. Uz to uvijek dostupni **"vrati prethodno"** i **"zamrzni"**, jer je u auto načinu teško ispraviti grešku (5,65/7).
8. **Govornik mora vidjeti što sustav misli.** CrossTalk ima problem vidljivosti, Tedric nepredvidljivost prijelaza, a kod Visual Captions on-demand korisnik ne zna je li sustav reagirao. Privatni "presenter view" treba prikazivati živi transkript, top-3 kandidata s pouzdanošću i sljedeću akciju.
9. **Latencija: sakrij je, ne samo smanji.** Proaktivni način smanjuje *percipiranu* latenciju (Visual Captions). Za generirane slajdove (Tedric medijan 12 s, VisAider 20–30 s su predugi) odmah prikazati najbližu postojeću karticu ili ambijentalni vizual, a generirani slajd pustiti tek kad bude gotov i ako je tema i dalje aktualna. Nikad ne generirati N kandidata sekvencijalno.
10. **Publika tolerira dinamiku, manjina ne.** TalkDirector: distrakcija n.s., ali 4/12 ima teškoće s koncentracijom. Visual Captions: nema porasta opterećenja. Prijelazi trebaju biti mekani (crossfade), bez treperenja, a broj promjena u minuti ograničen.
11. **Relevantnost je ono što donosi korist, a ne sama prisutnost slike.** U Adaptive Backgrounds uvjet s irelevantnim slikama nije donio korist, a relevantne slike jesu. Bolje je ne prikazati ništa nego prikazati nešto krivo.
12. **Slike i screenshotovi pobjeđuju tekst.** RealityTalk: slike 6,0/7 naspram teksta 4,8/7. RealityChat: većina preferira vizualno. Tedric: previše teksta "stavlja riječi u usta". Generirani slajdovi neka budu minimalni: naslov + 1 vizual/broj/dijagram, a ne bulleti.
13. **Znaj publiku i ne objašnjavaj očito.** Personalizirani žargon (2026) pokazuje da generička podrška preopterećuje. U system prompt directora treba dodati profil publike od jedne rečenice.
14. **Plan i faze kao prior.** CoExplorer i NextSlidePlease: čak i improvizirani talk ima grube sekcije i "must-show" stavke. Director treba znati preostalo vrijeme i što još nije prikazano.
15. **Boost ASR-a vokabularom kartica.** SlideSpeech: tekst sa slajdova poboljšava ASR. Imena projekata i tehnički pojmovi iz kataloga idu u ASR kao phrase hints.
16. **Proba sa sustavom gradi povjerenje.** Elastica: nakon 1–2 probe govornici se opuštaju. Treba planirati ≥2 pune generalne probe u 8 dana i logirati svaku odluku directora za naknadnu analizu (lažno pozitivni, propušteni, kasni).
17. **Nitko nije evaluirao ovaj workflow na ne-engleskom jeziku, s fizičkom publikom i autonomnim odabirom iz 100+ kartica.** Sve studije su engleske, većinom online ili u AR-u, s N=8–26. Naše predavanje je, u tom smislu, originalan eksperiment. Vrijedi ga dokumentirati (logovi + kratka anketa publike) jer bi to bila novost u odnosu na literaturu.

---

## F. Izvori koje nisam uspio potvrditi ili pročitati
- Semantic Scholar API: 429 rate limit tijekom cijele sesije. Umjesto njega korišten je OpenAlex (`api.openalex.org/works?filter=cites:W…`).
- ACM DL PDF-ovi: blokirani za skripte (Cloudflare). Za CHI/UIST radove bez arXiva ili autorske kopije koristio sam samo službeni sažetak (označeno **[SAMO SAŽETAK]**).
- "Speech-Based Real-Time Presentation Tracking Using Semantic Matching" (Northeastern University repozitorij): pronađen u pretrazi, ali PDF vraća 403. **Nije uključen.**
- Patenti (npr. US 11289091 "Contextual voice-based presentation assistance", US 10936281 "Automatic slide page progression based on verbal and visual cues"): pojavili su se samo u rezultatima pretrage, nisam ih pročitao. **[NEPROVJERENO]** Upućuju na to da je glasovna nelinearna navigacija ("go to the slide showing the mountains") patentirana ideja u industriji.
- Microsoft PowerPoint "Presenter Coach", Google Slides auto-captions i slično: nisu znanstveni radovi pa nisu pretraživani.
