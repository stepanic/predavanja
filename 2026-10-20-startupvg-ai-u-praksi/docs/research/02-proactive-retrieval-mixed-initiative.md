# 02 — Proaktivni (just-in-time) retrieval iz govora i mixed-initiative principi

Istraživanje za sustav koji tijekom slobodnog govora (hrvatski, live ASR) sam odlučuje što prikazati na projektoru: jednu od N unaprijed pripremljenih kartica (~100+ softverskih projekata) ili slajd generiran u letu.

Stanje na dan 2026-09-24. Svaki rad naveden ispod potvrđen je dohvaćenom stranicom (arXiv, ACL Anthology, ACM DL, OpenAlex zapis ili PDF autora). Brojke su prepisane iz samih radova. Gdje sam pročitao samo sažetak, to je napomenuto.

---

## Sažetak

- **Problem je star 30 godina i ima ime: just-in-time information retrieval (JITIR).** Rhodes i Maes (2000) definirali su ga trima svojstvima: proaktivnost, prikaz koji je dostupan, ali nenametljiv, i svijest o lokalnom kontekstu. Naš sustav je JITIR agent kojemu je prikaz projektor, a ne sporedni prozor. To bitno mijenja cijenu pogreške, jer publika vidi svaki krivi pogodak.
- **Upit se gradi iz kliznog prozora transkripta, i to u više skala.** Remembrance Agent koristio je zadnjih 20 i zadnjih 500 riječi, a autori su poslije zaključili da je trebalo miješati 20/100/500. ACLD (Idiap) šalje upit svakih 15–30 s. Ambient Search upit ažurira nakon svake rečenice nad prozorom od zadnjih 10 rečenica.
- **Zaglađivanje u vremenu je standardno rješenje za treperenje.** ACLD koristi "persistence model": salience rezultata opada s vremenom osim ako ga novi upit ponovno ne vrati. Ambient Search stare rezultate svaki put množi s 0,9. To je izravni predložak za naš mehanizam "ostani ili prebaci" (hysteresis).
- **Kad djelovati, određuje očekivana korisnost, ne sama sličnost.** Horvitz (1999) pokazuje da iz četiri korisnosti slijedi prag p*. S tri opcije (ništa, dijalog, akcija) dobiju se dva praga. Za nas to znači: ne mijenjaj ništa, ponudi diskretni hint ili prebaci projektor.
- **Timing je jednako važan kao sadržaj.** Iqbal i Bailey (2008) pokazali su da odgoda obavijesti do "breakpointa" smanjuje frustraciju i vrijeme reakcije. Sadržaj koji nije vezan uz zadatak treba čekati grube (coarse) granice. Kod Codellaboratora (CHI 2025) intervencije na granicama podzadataka imale su 67–73 % angažmana, dok je okidanje na neaktivnost bilo loše.
- **LLM-ovi su po defaultu previše proaktivni.** U ProactiveBenchu nedotjerani modeli imaju 50–65 % lažnih alarma, a najbolji fine-tuned model doseže F1 od 66,5 %. Arhitektura s malim brzim "trigger" modelom i velikim generatorom (LlamaPIE; Liu i sur. 2026: TGL trigger od 11 ms) je bolja i brža.
- **Za kartice s opisima dobro radi lagani LLM koji čita opis na prirodnom jeziku.** Na stvarnim ASR transkriptima (Dialpad, 2026) LLM koji uspoređuje iskaz s opisom teme postiže F1 0,847, regex 0,721, a najbolji embedding 0,708. Način na koji je tema opisana utječe na rezultat jednako koliko i izbor modela.
- **ASR šum ruši kvalitetu retrievala otprilike za četvrtinu.** U Ambient Searchu najbolji NDCG@5 na ASR transkriptu (WER 15,6 %) bio je 0,47, a na ručnom transkriptu 0,60. Zato su rezervni putovi (entiteti, imena projekata, fonetsko podudaranje) važni, osobito za hrvatski.

---

## 1. Temelji: JITIR agenti (MIT Media Lab)

### 1.1 Rhodes & Starner (1996) — Remembrance Agent

**Citat:** B. J. Rhodes, T. Starner. *Remembrance Agent: A continuously running automated information retrieval system.* PAAM 1996. (Postojanje potvrđeno preko OpenAlexa; cjeloviti tekst nisam čitao, a sadržaj je detaljno opisan u radu 1.2.)

**Ideja:** Emacs agent koji neprekidno gleda što korisnik piše i u nekoliko redaka na dnu ekrana nudi povezane dokumente (mailove, bilješke).

### 1.2 Rhodes & Maes (2000) — Just-in-time information retrieval agents

**Citat:** B. J. Rhodes, P. Maes. *Just-in-time information retrieval agents.* IBM Systems Journal 39(3–4), 2000, str. 685–704. DOI [10.1147/sj.393.0685](https://doi.org/10.1147/sj.393.0685). PDF: <https://www.bradleyrhodes.com/Papers/rhodes-jitir-agents-ibmsj-2000.pdf>

**Ideja.** JITIR agent je softver koji proaktivno dohvaća i prikazuje informacije na temelju lokalnog konteksta osobe, tako da su lako dostupne, a ne nameću se. Rad opisuje tri sustava:
- **Remembrance Agent (RA):** Emacs, vlastiti tekst korisnika kao upit.
- **Margin Notes:** bilješke na margini web stranice, po jedna za svaku sekciju.
- **Jimminy:** nosivo računalo (wearable). Kontekst čine lokacija, prisutne osobe, vrijeme dana i bilješke koje se upravo tipkaju. Polja se mogu različito težiti, npr. "osoba" dvostruko važnija od ostalog.

**Mehanizam okidanja i upita.**
- Lista prijedloga osvježava se svakih nekoliko sekundi dok korisnik tipka ili čita.
- Postoji više "scopeova" nad istom bazom. Prvi redci mogu se temeljiti na zadnjih 20 riječi, ostali na zadnjih 500.
- Sličnost dokumenta lokalnom kontekstu služi kao zamjena (proxy) za korisnost. Autori izrijekom upozoravaju da relevantnost nije isto što i korisnost.
- Automatski generirani upiti sadrže smeće (potpise, zaglavlja) koje treba filtrirati.
- Margin Notes prikazuje bilješku samo ako je relevantnost iznad praga.
- Svaki prijedlog ima ocjenu relevantnosti (0, 1 ili 2 plusa) i ključne riječi koje su ga izazvale. To je objašnjenje "zašto ovo".
- Uvodi pojam **ramping interface**: informacija se otkriva u stupnjevima, a svaki stupanj traži malo više pažnje. Korisnik može odustati rano, a cijena ignoriranja je gotovo nula.
- Rad već 2000. spominje ASR kao izvor upita za Jimminy (tada oko 55 % preciznosti za IR nad audio vijestima).

**Evaluacija.** Kontrolirani eksperiment (pisanje eseja, n = 13 u eksperimentalnoj skupini):
- 78,5 % ispitanika rangiralo je RA na prvo mjesto.
- RA je dobio otprilike bod više od tražilice (na skali 1–7) za korisnost i za "koristio bih ponovno". Ocjene korisnosti bile su 4,8 ± 1,1 za RA i 3,8 ± 1,3 za tražilicu.
- Eksperimentalna skupina pogledala je oko 3× više članaka od kontrolne, a unutar nje oko 2,5× više preko RA nego preko tražilice.
- Margin Notes je prošao najlošije: manje od trećine ispitanika otvorilo je ijedan njegov prijedlog.
- U RA eksperimentu korišten je samo scope od 500 riječi. Autori kažu da je trebalo miješati 20/100/500.
- Prijedlozi ocijenjeni relevantnima, ali nekorisnima, bili su nekorisni u 100 % slučajeva zato što je osoba stvar već znala.

**Što nam to znači:**
- Upit gradimo iz **više prozora istovremeno**: kratki (~20 riječi ili zadnja rečenica, za "upravo spominje X") i dugi (~300–500 riječi, za "tema ovog dijela"). Kratki prozor predlaže promjenu, a dugi odlučuje o ostanku.
- Imena projekata i entiteti trebaju **težinu veću od općih riječi**, po uzoru na Jimminyjevo "person ×2".
- Relevantno nije isto što i korisno. Ako je kartica već prikazana prije 2 minute, publika je vidjela, pa ponovni prikaz ima manju vrijednost (novelty penalty).
- Naš "ekran" nije sporedan. Projektor je najintruzivniji mogući prikaz, pa Rhodesov argument "cijena ignoriranja ≈ 0" za nas ne vrijedi. Ramping interface možemo imati samo na **presenter viewu** (laptop ili tablet): ondje su kandidati s ocjenom, a na projektor ide tek potvrđena ili vrlo sigurna odluka.

---

## 2. Mixed-initiative: odlučivanje pod nesigurnošću

### 2.1 Horvitz (1999) — Principles of Mixed-Initiative User Interfaces

**Citat:** E. Horvitz. *Principles of Mixed-Initiative User Interfaces.* CHI 1999, str. 159–166. DOI [10.1145/302979.303030](https://doi.org/10.1145/302979.303030). PDF: <https://erichorvitz.com/chi99horvitz.pdf>

**Ideja.** Rad navodi 12 kritičnih faktora za spajanje automatizacije s direktnom manipulacijom, ilustriranih sustavom **LookOut** (Outlook: iz maila zaključi sastanak i otvori kalendar).

**Mehanizam.**
- Klasifikator daje p(G|E), vjerojatnost da korisnik ima cilj G uz dokaze E.
- Očekivana korisnost akcije je eu(A|E) = p(G|E)·u(A,G) + [1−p(G|E)]·u(A,¬G). Isto se računa za neakciju.
- Pravci korisnosti sijeku se u **p\***. Iznad tog praga isplati se djelovati, ispod ne.
- S trećom opcijom, dijalogom, dobivaju se **dva praga**: p\*¬A,D (između ničega i dijaloga) i p\*D,A (između dijaloga i akcije).
- Pragovi se pomiču s kontekstom. Ako lažna akcija postane skuplja, p\* raste.
- Korisnik može izravno postaviti ta dva praga.
- Timing: iz podataka je izvučen sigmoidalni odnos između duljine poruke i vremena koje korisnik provede na njoj prije akcije, i LookOut čeka toliko. Vrijeme čekanja prije time-outa ovisi o p. Sustav produžuje prisutnost ako čuje "hmmm…" ili "uh…".
- Kad nije siguran, sustav smanjuje preciznost usluge: ako ne zna točan termin, prikaže pravi dan ili tjedan u kalendaru ("doing less, but correctly").

**Evaluacija.** Ovo je rad o principima i dizajnu, bez kontroliranog eksperimenta. Jedini kvantitativni podatak je krivulja vremena zadržavanja iz korisničkih logova.

**Što nam to znači.** Imamo tri razine akcije:
1. ništa (projektor ostaje na trenutnoj kartici),
2. "dijalog", kod nas tihi prijedlog na presenter viewu s jednim klikom ili gestom za prihvaćanje,
3. autonomno prebacivanje.

To se preslikava na dva praga, primjerice p\*hint ≈ 0,5 i p\*switch ≈ 0,8. Točne vrijednosti treba kalibrirati na probama, ali pravilo je izvedeno iz Horvitza. Cijena krive akcije na projektoru je visoka jer je javna, pa p\*switch mora biti visok. Kad je nesigurnost velika, "radi manje": umjesto konkretne kartice prikaži naslov teme ili kategoriju (npr. "alati za AI transkripciju"), ili ostavi neutralan slajd. Tabela principa i njihova preslikavanja nalazi se u odjeljku 7.

---

## 3. Timing i trošak prekida

### 3.1 Adamczyk & Bailey (2004) — If not now, when?

**Citat:** P. D. Adamczyk, B. P. Bailey. *If not now, when? The effects of interruption at different moments within task execution.* CHI 2004, str. 271–278. DOI [10.1145/985692.985727](https://doi.org/10.1145/985692.985727). (Pročitan sažetak.)

**Ideja.** Modeli zadatka izvedeni tehnikama percepcije događaja (event perception) koriste se za predviđanje kognitivnog opterećenja. Korisnika se prekida u različitim trenucima.

**Nalazi.** Različiti trenuci prekida različito utječu na izvedbu zadatka, emocionalno stanje i socijalnu atribuciju (koliko korisnik "krivi" sustav). Najbolji trenuci su granice između podzadataka.

**Što nam to znači.** Govornik je u "zadatku". Promjena slike iza njega je prekid za publiku i za njega samog, jer se okrene i izgubi nit. Promjene treba vezati uz granice u govoru: kraj rečenice, pauzu, diskursni marker ("sljedeće…", "idemo dalje", "drugi primjer…").

### 3.2 Iqbal & Bailey (2006) — Leveraging characteristics of task structure to predict the cost of interruption

**Citat:** S. T. Iqbal, B. P. Bailey. CHI 2006. DOI [10.1145/1124772.1124882](https://doi.org/10.1145/1124772.1124882). (Pročitan sažetak.)

**Ideja.** Trošak prekida, mjeren kao resumption lag, može se predvidjeti iz strukture zadatka, ovisno o tome na kojoj se razini granice prekid dogodi. Model je validiran na drugom skupu zadataka.

### 3.3 Iqbal & Bailey (2008) — Effects of Intelligent Notification Management on Users and Their Tasks

**Citat:** S. T. Iqbal, B. P. Bailey. CHI 2008, str. 93–102. DOI [10.1145/1357054.1357070](https://doi.org/10.1145/1357054.1357070). PDF: <https://interruptions.net/literature/Iqbal-CHI08.pdf>. Proširenje: *OASIS*, ACM TOCHI 17(4), 2010, DOI [10.1145/1879831.1879833](https://doi.org/10.1145/1879831.1879833).

**Ideja.** Sustav **OASIS** statističkim modelima detektira breakpointe tri granulacije: Coarse, Medium i Fine. Obavijest se odgađa do sljedećeg breakpointa određenog tipa (defer-to-breakpoint).

**Mehanizam.** Događaji iz aplikacije skupljaju se u prozore od 3 s (to je dalo najbolju točnost) i idu u modele.

**Evaluacija.**
- Detekcija breakpointa na novim sekvencama zadataka imala je preciznost 64 %: 109 isporuka palo je u trenutke za koje su korisnici potvrdili da su breakpointi.
- Recall za tip Coarse bio je 71 % (60/85), ali modeli slabo razlikuju tipove. Recall za Fine pao je na 1,7–15 %.
- Isporuka na breakpointu smanjuje frustraciju i vrijeme reakcije u odnosu na trenutnu isporuku.
- Sadržaj koji nije vezan uz zadatak ("general interest") frustrira više i treba ga isporučiti samo na Coarse breakpointu. Kad je stigao na Medium ili Fine, korisnici su ga odvlačili u lanac skretanja pažnje (9 od 11 slučajeva).

**Što nam to znači:**
- **Defer-to-breakpoint** preslikavamo na govor. Odluka "prebaci na karticu X" može se donijeti odmah, ali se izvršava na prvoj sljedećoj granici: kraju rečenice iz ASR endpointinga, pauzi od ~600–800 ms, ili tematskoj granici.
- Granica se bira prema vrsti sadržaja. Kartica koja **točno odgovara** onome što govornik upravo imenuje ("…i onda sam napravio Domovina AI") ide na fini breakpoint (kraj rečenice). Tematski ili "ambijentalni" slajd ide tek na grubu granicu (promjena teme).
- Detektori granica griješe. Treba imati gornju granicu čekanja (max-defer, npr. 4–6 s), nakon koje se ili izvrši promjena ili se odluka odbaci ako je trenutak prošao.

### 3.4 Pu i sur. (2025) — Assistance or Disruption? (Codellaborator)

**Citat:** K. Pu, D. Lazaro, I. Arawjo, H. Xia, Z. Xiao, T. Grossman, Y. Chen. *Assistance or Disruption? Exploring and Evaluating the Design and Trade-offs of Proactive AI Programming Support.* CHI 2025. DOI [10.1145/3706598.3713357](https://dl.acm.org/doi/10.1145/3706598.3713357); arXiv [2502.18658](https://arxiv.org/abs/2502.18658)

**Ideja.** Tri uvjeta: samo na zahtjev (PromptOnly), proaktivno bez signala prisutnosti (CodeGhost) i proaktivno s vidljivom prisutnošću AI-ja i lokalnim kontekstom (Codellaborator). Within-subject studija, N = 18.

**Evaluacija.**
- Percipirana ometanost (1–7): CodeGhost 4,61, Codellaborator 3,78, PromptOnly 1,56 (p < 0,001).
- Od 398 proaktivnih intervencija 53,3 % dovelo je do angažmana, 34,7 % je ignorirano, a 12,1 % je ometalo.
- Okidači na granicama podzadataka radili su najbolje: angažman nakon višelinijskih izmjena bio je 73,1 %, a nakon pokretanja programa 66,7 %.
- **Okidanje na neaktivnost nije radilo**, jer tišina često znači intenzivno razmišljanje.
- Signali prisutnosti ("Thinking…", AI kursor) smanjili su ometanost i povećali svijest o tome što AI radi (4,17 → 5,44).

**Što nam to znači:**
- Pauza u govoru nije uvijek granica. Može biti govornik koji razmišlja ili traži riječ. Pauzu treba kombinirati sa sintaktičkom ili semantičkom granicom (završena rečenica, diskursni marker), a ne koristiti samu.
- Treba nam **indikator prisutnosti** za govornika, na presenter viewu ili kao diskretni rub na projektoru, npr. "slušam / imam kandidata / prebacujem za 2 s". Tako govornik nije iznenađen, a promjena je predvidljiva.

### 3.5 Chen i sur. (2025) — Need Help? Designing Proactive AI Assistants for Programming

**Citat:** V. Chen, A. Zhu, S. Zhao, H. Mozannar, D. Sontag, A. Talwalkar. CHI 2025. <https://www.microsoft.com/en-us/research/publication/need-help-designing-proactive-ai-assistants-for-programming/> (Pročitan samo sažetak na stranici MSR-a, bez brojki.)

**Nalaz iz sažetka:** proaktivni chat asistent u IDE-u donosi značajne koristi, ali učinak ovisi o dizajnu i o tome kada programeri stvarno koriste prijedloge. Ovdje potvrđuje trend. Detalje nisam provjerio.

---

## 4. JITIR iz govora i sastanaka

### 4.1 Popescu-Belis i sur. — Automatic Content Linking Device (ACLD), Idiap / AMIDA

**Citati:**
- A. Popescu-Belis i sur. *The AMIDA Automatic Content Linking Device: Just-in-Time Document Retrieval in Meetings.* MLMI 2008, LNCS 5237. <https://link.springer.com/chapter/10.1007/978-3-540-85853-9_25>
- A. Popescu-Belis, M. Yazdani, A. Nanchen, P. N. Garner. *A Speech-based Just-in-Time Retrieval System using Semantic Search.* ACL-HLT 2011 System Demonstrations, str. 80–85. <https://aclanthology.org/P11-4014/>
- Isti autori, *A Just-in-Time Document Retrieval System for Dialogues or Monologues*, SIGDIAL 2011 demo. <https://aclanthology.org/W11-2045.pdf>

**Ideja.** Sustav sluša sastanak ili predavanje i u stvarnom vremenu prikazuje dokumente iz repozitorija grupe, snimke prethodnih sastanaka i Wikipediju.

**Mehanizam:**
- ASR riječi iz zadnjeg vremenskog okvira, bez stop-riječi, čine upit. **Unaprijed zadane ključne riječi (keyword spotting) dobivaju boost** u Lucene upitu.
- **Upit se šalje svakih 15–30 s ili na zahtjev.** To je kompromis između toga da se skupi dovoljno riječi i toga da se rezultati osvježavaju dovoljno često.
- **Persistence model:** salience svakog rezultata inicijalizira se iz ranga, zatim opada s vremenom, osim ako ga novi upit ponovno ne vrati. Brzinu opadanja podešava korisnik, a svi prošli rezultati ostaju dostupni.
- Semantička pretraga: random walk po grafu Wikipedije (WEX, 1,2 M članaka), da se nađu tematski povezani dokumenti i kad izgovorene riječi nisu u dokumentu.
- Objašnjenje: hover nad rezultatom prikazuje odlomke koji se poklapaju s riječima upita.

**Evaluacija:**
- WER AMI sustava na RT07 bio je ~38 % s naglavnim mikrofonima i ~41 % s mikrofonskim poljem. Real-time ASR bio je samo ~1 % lošiji od offline načina.
- SUS 68 % ("prihvatljivo"), 9 ispitanika. Zadaci su riješeni za 45–75 s.
- Semantička naspram keyword pretrage: semantička je dobila 72 % glasova. Na 23 isječka s kojima su se ispitanici složili, semantička je bila bolja u 19, a keyword u 4 slučaja.
- Autori kao budući rad navode "modeliranje konteksta radi boljeg timinga rezultata", što je upravo naš problem.

**Što nam to znači:**
- **Keyword boost = naš katalog.** Imena ~100 projekata, njihovi aliasi i ključni pojmovi čine listu za spotting s velikom težinom. Ako govornik izgovori ime projekta, to je najjači signal koji imamo.
- **Persistence model** je izravni predložak za "ostani". Trenutna kartica ima salience koja opada eksponencijalno (poluživot npr. 20–40 s) i obnavlja se svaki put kad je retrieval ponovno vrati u vrh. Kandidat preuzima projektor tek kad njegov score prijeđe salience trenutne za marginu Δ (hysteresis).
- 15–30 s je presporo za scenu s projektorom. Mi ćemo evaluirati svaku rečenicu (kao Ambient Search), ali odluku o prebacivanju vezati uz breakpointe i hysteresis.
- Semantička (embedding) pretraga pomaže kad govornik opisuje projekt, a ne imenuje ga ("onaj alat što sluša podcaste i traži spominjanja"). To je hibrid: lexical ili entity boost plus dense retrieval.

### 4.2 Habibi & Popescu-Belis (2013) — Diverse Keyword Extraction from Conversations

**Citat:** M. Habibi, A. Popescu-Belis. ACL 2013 (short), str. 651–657. <https://aclanthology.org/P13-2115/>. Nastavak: *Keyword extraction and clustering for document recommendation in conversations*, IEEE/ACM TASLP 23(4), 2015 (naveden u radu 4.3, nisam ga zasebno otvarao).

**Ideja.** Razgovor je "bursty" i sadrži više tema. TF-IDF izvlači ključne riječi samo dominantne teme. Njihova metoda koristi LDA teme i submodularnu maksimizaciju pokrivenosti tema (parametar diverziteta λ = 0,75), pa ključne riječi pokrivaju sve teme u fragmentu.

**Evaluacija.** Na Fisher i AMI fragmentima (2–3 min) crowdsourcing ljudi uspoređivao je dva word clouda. Diverzna metoda preferirana je u 78 % slučajeva naspram 22 % za tematsku sličnost (TS), a naspram frekvencije riječi (WF) razlika je 96 % : 4 % na Fisheru. Metoda ima i najviši α-NDCG.

**Što nam to znači.** Iz jednog prozora govora treba generirati **više podupita** (po jedan za svaku podtemu), a ne jedan upit. Tako dobivamo i "trenutnu karticu" i "drugog kandidata" za presenter view. Govornik koji uspoređuje dva projekta ("za razliku od X, Y radi…") mora okinuti oba.

### 4.3 Milde i sur. (2016) — Ambient Search

**Citat:** B. Milde, J. Wacker, S. Radomski, M. Mühlhäuser, C. Biemann. *Ambient Search: A Document Retrieval System for Speech Streams.* COLING 2016, str. 2082–2091. <https://aclanthology.org/C16-1196/>

**Ideja.** Open-source sustav sluša govor (Kaldi online ASR) i uz govor prikazuje do 4 Wikipedia članka. Evaluiran je na TED talkovima, dakle **monologu predavača**, kao i kod nas.

**Mehanizam:**
- ASR emitira parcijalne i konačne rečenice s granicama. **Kod svake završene rečenice** izvlače se kandidati: ključne riječi i višeriječni izrazi (DRUID).
- Rangiranje kandidata: kosinus prema prosječnom Word2Vec vektoru **zadnjih 10 rečenica** × TF-IDF, i uzima se top 10 pojmova.
- Upit je OR upit s minimum-should-match 25 % i težinama pojmova, nad Elasticsearchom.
- Stari rezultati se kod svake nove rečenice množe s d = 0,9 (decay), pa noviji rangiraju više. Prikazuje se n najboljih.
- Korisnik može označiti članak zvjezdicom ili ga ukloniti kao irelevantan.

**Evaluacija** (WER ASR-a 15,6 % na TED-u; NDCG@5 iz ljudskih ocjena):
- TF-IDF bez filtriranja: 0,188. Najbolji TF-IDF s filtriranjem imenica i pridjeva: 0,426.
- Habibi & Popescu-Belis s njihovim preprocessingom: 0,465.
- Njihova metoda bez višeriječnih izraza: **0,471** (najbolja na ASR-u).
- Na **ručnim** transkriptima najbolji rezultat bio je 0,602. Pad zbog ASR-a je dakle oko 0,13 NDCG.
- Višeriječni izrazi pomažu na čistom tekstu, ali ne i na ASR-u.

**Što nam to znači:**
- **Recept za query formation koji je provjeren na TED monologu:** okidač je kraj rečenice, kontekst je zadnjih ~10 rečenica, a ključni pojmovi se težinski biraju kao blizina centroidu prozora × specifičnost.
- Decay 0,9 po rečenici znači da rezultat nestaje za otprilike 10–20 rečenica ako se ne obnovi. Za kartice na projektoru to je razuman red veličine.
- Filtriranje na imenice, pridjeve i imena projekata daje velik skok (0,19 → 0,43). Za hrvatski treba lematizacija, jer padeži razbijaju exact match ("Domovinu AI", "Domovine AI").
- Na ASR-u gubimo oko četvrtinu kvalitete, pa sustav mora biti konzervativan (visok p\*switch).

### 4.4 Samarinas & Zamani (2024) — ProCIS

**Citat:** C. Samarinas, H. Zamani. *ProCIS: A Benchmark for Proactive Retrieval in Conversations.* SIGIR 2024. arXiv [2405.06460](https://arxiv.org/abs/2405.06460)

**Ideja.** Benchmark sadrži 2,8 M Reddit razgovora povezanih s 5,3 M Wikipedia članaka i 100 ručno anotiranih testnih razgovora (3 anotatora, slaganje 0,65). U **proaktivnom** zadatku sustav na svakom iskazu odlučuje hoće li nešto prikazati ili šutjeti.

**Metrika npDCG:** dokument ima "prvi iskaz na kojem postaje relevantan". Prikaz nakon tog trenutka kažnjava se logaritamski, a prazna lista ne košta ništa.

**Evaluacija:**
- Reaktivno (cijeli razgovor): BM25 0,065, ColBERT 0,209, njihov LMGR (LLM generira kandidate, pa dense retrieval, pa re-ranking) 0,341 nDCG@5.
- **Proaktivno:** ColBERT 0,172, LMGR 0,078 npDCG@5.
- Model koji je najbolji reaktivno bio je loš proaktivno.

**Što nam to znači:**
- "Kada" i "što" su **različiti problemi** i treba ih odvojeno mjeriti. Za naš eval treba metrika tipa npDCG: nagrada ako se kartica pojavi blizu trenutka kad je tema počela, kazna za kašnjenje, a šutnja nije kazna.
- LLM-generirani kandidati sami po sebi ne daju dobar timing. Timing mora imati vlastiti modul.

### 4.5 Yang i sur. (2025) — JIR-Arena

**Citat:** K. Yang, K. Ros, S. K. Senthil Kumar, C. Zhai. *JIR-Arena: The First Benchmark Dataset for Just-in-time Information Recommendation.* arXiv [2505.13550](https://arxiv.org/abs/2505.13550). (Pročitan sažetak.)

**Ideja.** Multimodalni benchmark scenarija gustih informacijskih potreba (predavanja, govori). Mjeri tri dimenzije: zaključivanje o potrebama, pravovremenost i relevantnost preporuka, te izbjegavanje ometajućeg irelevantnog sadržaja.

**Nalaz:** sustavi na bazi foundation modela razumno simuliraju korisničke potrebe, ali imaju slab **recall** i slabo dohvaćaju sadržaj iz baze znanja.

**Što nam to znači.** Treba nam **vlastiti mini-benchmark**: 2–3 snimljene probe govora, anotirane trenucima u kojima bi određena kartica trebala biti na ekranu. Na njemu podešavamo pragove.

### 4.6 Abolnejadian & Brehmer (2026) — InsightToast

**Citat:** M. Abolnejadian, M. Brehmer. *InsightToast: Proactive Information Retrieval & Glanceable Visualization in the Side Channel of Data-Rich Meetings.* UIST 2026. arXiv [2608.31115](https://arxiv.org/abs/2608.31115). (Pročitan sažetak.)

**Ideja.** Mixed-initiative aplikacija prati govor, detektira teme i informacijske potrebe kako nastaju, te multi-agentnim LLM + RAG pipelineom proizvodi sažete uvide s izvorima i male interaktivne grafove. Oni se prikazuju kao **efemerni toastovi u sporednom kanalu**. Komparativna studija imala je N = 16 (odluke o politikama nad zakonodavnim dokumentima). Sudionici su zadržali prirodan tok razgovora.

**Što nam to znači.** Ovo je najbliži recentni analog. Njihov izbor je periferni, efemerni prikaz, a naš je glavni ekran. Pouka je da **generirani sadržaj mora biti glanceable**: jedna rečenica ili jedan graf, s izvorom. Generirani slajdovi u letu trebaju slijediti isto pravilo.

### 4.7 Microsoft Meeting Insights (industrijski sustav, blog)

**Izvor:** Microsoft Research blog, *Meeting Insights: Contextual assistance for everyone.* <https://www.microsoft.com/en-us/research/blog/meeting-insights-contextual-assistance-for-everyone/> (Blog, nije recenzirani rad.)

**Podaci:** sustav je aktivan na više od 40 % otvorenih sastanaka u Outlooku, a korisnici oko 2 od 3 prijedloga ocjenjuju korisnima. **Recentnost je jak signal:** 30 % klikova na mailove odnosi se na one iz zadnjih 24 h, a 35 % klikova na fajlove na one mijenjane u zadnjih 24 h.

**Što nam to znači.** Čak i dobar produkcijski sustav ima trećinu nekorisnih prijedloga. U sporednom kanalu to je prihvatljivo, na projektoru nije. Priori poput "ova kartica je u planu govora" ili "sljedeća po redu" imaju ulogu sličnu recentnosti i treba ih uključiti u score.

### 4.8 Meeting Bridges (Microsoft, CSCW 2024)

**Citat:** *Meeting Bridges: Designing Information Artifacts that Bridge from Synchronous Meetings to Asynchronous Collaboration.* PACM HCI 8 (CSCW1), 2024. DOI [10.1145/3637312](https://dl.acm.org/doi/10.1145/3637312); arXiv [2402.03259](https://arxiv.org/abs/2402.03259). (Pročitan sažetak.)

**Relevantnost: niska.** Bavi se artefaktima nastalim tijekom sastanka za rad nakon njega, a ne real-time retrievalom. Za nas je zanimljivo samo kao ideja za kasnije: nakon predavanja generirati "bridge", tj. listu svih prikazanih kartica s timestampovima i linkovima za publiku.

---

## 5. Proaktivni LLM agenti (2023–2026)

### 5.1 Lu i sur. (2024) — Proactive Agent / ProactiveBench

**Citat:** Y. Lu i sur. *Proactive Agent: Shifting LLM Agents from Reactive Responses to Active Assistance.* arXiv [2410.12361](https://arxiv.org/abs/2410.12361) (venue konferencije nisam provjerio).

**Ideja.** Agent promatra događaje iz okoline, aktivnosti korisnika i stanje sustava te predlaže zadatak ili **null** (bez pomoći). Ljudi prijedloge prihvaćaju ili odbijaju, a iz toga se trenira reward model koji glumi ljudsku procjenu. ProactiveBench ima 6 790 događaja.

**Evaluacija:**
- Reward model se s ljudima slaže s F1 91,8 %. Ljudi se međusobno slažu 91,67 %.
- GPT-4o postiže F1 64,6 %, GPT-4o-mini 52,15 %, a fine-tuned Qwen2-7B 66,47 %.
- **Nedotjerani modeli imaju 50–65 % lažnih alarma.** Skloni su pomagati što više, a ne kad treba.

**Što nam to znači.** Ako LLM pitamo "treba li promijeniti slajd?", pristran je prema "da". Zato:
- Odluka o prebacivanju ne smije biti jedno LLM pitanje. Treba je formulirati kao usporedbu scoreova s pragom i hysteresisom.
- U prompt treba eksplicitno ubaciti opciju "ostani" kao zadanu, i to s cijenom promjene.
- Treba logirati prihvaćanja i odbijanja s proba kao malu verziju njihovog reward signala.

### 5.2 Chen i sur. (2025) — LlamaPIE: Proactive In-Ear Conversation Assistants

**Citat:** T. Chen, N. Batchelder, A. Liu, N. A. Smith, S. Gollakota. ACL 2025 Findings. arXiv [2505.04066](https://arxiv.org/abs/2505.04066)

**Mehanizam:**
- **Dvomodelna arhitektura:** mali model neprekidno odlučuje *kada* odgovoriti, a veliki model generira *što*.
- Streaming ASR radi s chunkom od 960 ms i kontekstom od 3 840 ms.
- Arhitektura skraćuje vrijeme obrade za najmanje 64 % u odnosu na jedan veliki model.

**Evaluacija:**
- Trigger ima hard preciznost i recall veće od 70 % i točnost veću od 93 %; soft preciznost i recall su oko 90 %.
- Asistent se javlja u oko 15 % prilika, prosječno s ~2 riječi.
- U studiji s 15 sudionika točnost na testu porasla je s 37 % na 87 % uz proaktivnog asistenta. Sudionici su ga ocijenili manje ometajućim od reaktivnog ChatGPT-a (glas i tekst).

**Što nam to znači.** Arhitektura za naš router je jasna:
- **brzi sloj** koji radi na svakoj ASR rečenici (embedding + keyword/entity match + hysteresis, < 50 ms),
- **spori sloj** (LLM) koji se poziva samo kad brzi sloj detektira kandidata za promjenu ili potrebu za generiranim slajdom.

Stopa javljanja od ~15 % dobra je referenca. Promjena slajda na svaku 6.–7. rečenicu je gornja granica, a ne cilj.

### 5.3 Liu i sur. (2026) — Do Proactive Agents Really Need an LLM to Decide When to Wake and What to Anchor?

**Citat:** X. Liu, R. Zhang, A. H. Abdi, M. Galley, Z. Chen, S. Xiong, X. Wang, J. Gao. arXiv [2605.30152](https://arxiv.org/abs/2605.30152), svibanj 2026. (Pročitan sažetak.)

**Ideja.** Strukturirani tok događaja (actor–verb–object–timestamp) tretira se kao temporalni graf. Mali TGL model za svaki događaj daje vjerojatnost okidanja i routing score po entitetu. LLM se poziva tek kad okidač "opali".

**Evaluacija:**
- F1 je u prosjeku bolji za 16,7 bodova preko 14 backbonea, maksimalno za 46.
- Model radi 11 ms po događaju na GPU-u i ~14 ms na laptopu, što je 4–7× brže na GPU-u i 12–83× brže na laptopu od LLM okidača.
- Model ima ~220 MiB, najbolji trigger AUC i **stabilne pragove pri deploymentu**.

**Što nam to znači.** Ovo je snažna potvrda da "kada" i "na koji entitet" treba odlučiti mali, brz i kalibriran model, a LLM samo za "što reći ili pokazati". Naš "entitet" je kartica projekta.

### 5.4 Liu i sur. (2025) — Proactive Conversational Agents with Inner Thoughts

**Citat:** X. B. Liu, S. Fang, W. Shi, C.-S. Wu, T. Igarashi, X. A. Chen. CHI 2025. DOI [10.1145/3706598.3713760](https://doi.org/10.1145/3706598.3713760); arXiv [2501.00383](https://arxiv.org/abs/2501.00383). (Pročitan sažetak.)

**Ideja.** Agent paralelno s razgovorom vodi prikriveni tok "unutarnjih misli" i ocjenjuje svoju **intrinzičnu motivaciju** da neku misao izrazi. Govori tek kad motivacija prijeđe prag. Formativna studija imala je 24 sudionika. Sustav je bolji od baselineova u antropomorfizmu, koherenciji, inteligenciji i primjerenosti uzimanja riječi (turn-taking).

**Što nam to znači.** Koristan uzorak: director stalno drži "sjenu" kandidata (koju bih karticu sad pokazao i zašto), s motivacijom koja se akumulira kroz rečenice, i tek je na pragu izvršava. To je u biti evidence accumulation, odnosno hysteresis u vremenu.

### 5.5 Khan i sur. (2026) — Speak for Me (CAPA)

**Citat:** M. Khan, F. Kirstein, T. Ruas, B. Gipp. *Speak for Me: Giving LLMs the Situational Awareness to Participate in a Meeting.* arXiv [2609.03923](https://arxiv.org/abs/2609.03923), rujan 2026 (prema sažetku prihvaćeno na EMNLP 2026).

**Mehanizam.** Perceiver prati stanje sastanka iz svakog iskaza, Predictor predviđa tok razgovora, a Controller odlučuje hoće li agent govoriti.

**Evaluacija** (137 AMI snimki):
- Delegati samo s promptom šute na 51,4 % prilika. CAPA to spušta na 2,5 %.
- "Credited recovery" raste s 26,1 % na 52,2 %, a halucinacije ostaju na 0,6 %.
- Slaganje s ljudskim sucem: κ = 0,71.

**Što nam to znači.** Eksplicitno **stanje razgovora** (o čemu se trenutno govori, što je otvoreno, što je sljedeće) bolje je od golog prompta nad transkriptom. Naš director treba strukturirano stanje, primjerice `current_topic`, `current_card`, `card_since`, `candidates[]`, `outline_position`, a ne samo zadnjih N riječi.

### 5.6 Liu i sur. (2026) — Sensing What Surveys Miss

**Citat:** A. Liu, Y. Karoui, F. Draxler, F. Kreuter, F. Chiossi. arXiv [2602.00880](https://arxiv.org/abs/2602.00880), CHI 2026. (Pročitan sažetak.)

**Nalaz.** Pomoć vremenski usklađena sa stvarnim kognitivnim stanjem (EDA i pokreti miša) poboljšala je točnost odgovora za 21 % i smanjila lažno negativne s 50,9 % na 22,9 % (N = 32). Bolja je i od nasumičnog i od neusklađenog timinga.

**Napomena:** tvrdnju "timing objašnjava 40 % varijance, isti prijedlog prihvaćen 3× češće" koja se pojavljuje u sažecima pretraživača **nisam mogao potvrditi** ni u jednom izvoru i zato je ne koristim.

---

## 6. Tema, entiteti i segmentacija na streaming ASR-u

### 6.1 Rahbar i sur. (2026) — Topic Matching in the Wild (Dialpad)

**Citat:** S. Rahbar, X. Zhu, I. Cardoza, D. Rossouw. *Topic Matching in the Wild: Benchmark and Lessons from Real-World ASR Transcripts.* arXiv [2609.00330](https://arxiv.org/abs/2609.00330), kolovoz 2026.

**Zadatak** je gotovo identičan našem. Agent-assist u call centru za svaki od stotina predefiniranih topica odlučuje odgovara li trenutni iskaz s live ASR-a, i ako odgovara, prikazuje **coaching karticu**.

**Mehanizam:**
- Radi nad sirovim ASR-om, bez normalizacije, zbog latencije.
- Uspoređena su tri matchera: regex, šest zero-shot embedding enkodera i Gemini LLM-ovi.
- Uspoređene su dvije reprezentacije topica: lista ključnih fraza i opis na prirodnom jeziku.
- Prag je biran kao max-F1 na 4 folda i testiran na petom.

**Evaluacija:**
- Skup ima 2 655 parova s oko 24 % pozitivnih.
- Gemini Flash-tier s opisom postiže **F1 0,847**. Regex ima 0,721 (P 0,850, R 0,625), a najbolji embedding 0,708.
- Veći LLM (2.5 Pro, 0,818) nije bolji od manjih.
- LLM-ovi rade najbolje s opisom, a embeddingi s listom ključnih fraza. **Reprezentacija topica je jednako odlučujuća kao i izbor matchera.**
- Oko 24 % iskaza sadrži filler ili diskursni marker, a mnogi iskazi su vrlo kratki (≤ 3 tokena).

**Što nam to znači:**
- Svaka kartica treba **dvije reprezentacije**: listu ključnih fraza i aliasa (za lexical i embedding sloj) i kratak opis na prirodnom jeziku (za LLM sloj).
- Lagani, brzi LLM je dovoljan za verifikaciju kandidata. Veći model ne daje bolji rezultat.
- Regex ili keyword ima visoku preciznost (0,85) i nizak recall. Dobar je kao okidač "sigurne" promjene kad se izgovori ime projekta, a ne kao jedini mehanizam.
- Prag treba birati na validacijskom skupu (max-F1 ili, kod nas, max-F0.5, jer je preciznost važnija), a ne napamet.

### 6.2 Solbiati i sur. (2021) — Unsupervised Topic Segmentation of Meetings with BERT Embeddings

**Citat:** A. Solbiati, K. Heffernan, G. Damaskinos, S. Poddar, S. Modi, J. Cali. arXiv [2106.12978](https://arxiv.org/abs/2106.12978) (Facebook).

**Ideja.** TextTiling nad BERT/Sentence-BERT embeddingima: sličnost susjednih blokova, a dubina "doline" označava tematsku granicu. Metoda je nenadzirana.

**Evaluacija.** Na AMI i ICSI korpusima smanjuje grešku (Pk, WindowDiff) za 15,5 % u odnosu na postojeće nenadzirane metode. Na ICSI-ju je Pk bolji od klasičnog TextTilinga za 11,8 %. Nadzirani BiLSTM prošao je lošije (Pk 0,410 na ICSI-ju).

**Što nam to znači.** Online varijantu TextTilinga lako je implementirati: embedding zadnjih k rečenica naspram prethodnih k, a pad sličnosti ispod praga daje kandidata za **coarse breakpoint** (u smislu Iqbala i Baileyja). To je signal "tema se promijenila, smije se promijeniti i ambijentalni ili generirani slajd".

### 6.3 Adams & MacKay (2007) — Bayesian Online Changepoint Detection

**Citat:** R. P. Adams, D. J. C. MacKay. arXiv [0710.3742](https://arxiv.org/abs/0710.3742).

**Ideja.** Egzaktna online inferencija posteriora "duljine trenutnog runa", tj. vremena od zadnje promjene, jednostavnim message-passingom.

**Što nam to znači.** Formalni okvir za "ostani ili prebaci". Umjesto ad-hoc praga, posterior P(promjena teme u zadnjih r rečenica) nad nizom embeddinga rečenica daje principijelan changepoint signal. Za MVP u 8 dana vjerojatno je dovoljan jednostavni hysteresis (odjeljak 8), a BOCPD je opcija za kasnije.

### 6.4 Entity linking na govoru (kratko)

- *Entity Linking for Spoken Language*, NAACL 2015 (autore nisam provjerio): <https://aclanthology.org/N15-1024.pdf>. Pokazuju da ASR greške posebno pogađaju imenovane entitete. (Potvrđeno postojanje, rad nisam detaljno čitao.)
- DAMO-NLP, *Knowledge Enhanced Robust NER for Speech Entity Linking*, NLPCC 2022: arXiv [2209.13187](https://arxiv.org/abs/2209.13187). Speech entity linking pati od šuma ASR-a. Pomaže pojačavanje znanjem iz baze entiteta. (Potvrđeno postojanje, rad nisam detaljno čitao.)

**Što nam to znači.** Imena naših projekata (često engleska, izmišljena ili kraćenice usred hrvatskog govora) bit će najčešće krivo prepoznate riječi. Mjere:
1. **ASR biasing / custom vocabulary** s listom imena projekata, ako ga ASR podržava.
2. **Fuzzy / fonetsko podudaranje** (npr. Double Metaphone ili edit distance na lematiziranom tekstu) prema katalogu aliasa.
3. Rezervni put preko opisa (embedding + LLM verifikacija), za slučaj da ime uopće nije prepoznato.

---

## 7. Pregledna tablica

| Rad (godina) | Domena | Okidač i upit | Kontekst / prozor | Zaglađivanje / stabilnost | Ključna brojka | Pouka za nas |
|---|---|---|---|---|---|---|
| Rhodes & Maes (2000) RA/Jimminy | editor, wearable | svakih nekoliko s, sličnost konteksta | 20 i 500 riječi; polja s težinama | prag relevantnosti (Margin Notes) | RA #1 kod 78,5 %; 3× više pročitanog | multi-scope upit; entiteti ×2; ramping UI na presenter viewu |
| Horvitz (1999) LookOut | email → kalendar | p(G\|E) prema pragovima | poruka u fokusu | time-out ovisan o p; čekanje ovisno o duljini | (principi) | 2 praga: ništa / hint / prebaci |
| Adamczyk & Bailey (2004) | prekidi | granice podzadataka | model zadatka | — | timing mijenja emocije i atribuciju | mijenjaj na granicama govora |
| Iqbal & Bailey (2008) OASIS | obavijesti | defer-to-breakpoint | prozori od 3 s | odgoda do C/M/F granice | preciznost breakpointa 64 %; manje frustracije | točna kartica na kraju rečenice, ambijentalna na promjeni teme |
| Pu i sur. (2025) Codellaborator | IDE | granice podzadataka | aktivnost u editoru | signali prisutnosti | 53 % angažman, 12 % ometanje; neaktivnost loša | pauza ≠ granica; indikator "prebacujem" |
| Popescu-Belis (2008–11) ACLD | sastanci / predavanja | svakih 15–30 s + keyword boost | zadnji vremenski okvir | **persistence model** (salience opada) | semantička 72 % glasova; SUS 68 % | katalog kao boost lista; salience s opadanjem |
| Habibi & P-B (2013) | razgovori | diverzni ključni pojmovi (LDA + submodularnost) | fragment od 2–3 min | — | 78 % vs 22 % preferencija | više podupita po prozoru |
| Milde i sur. (2016) Ambient Search | TED monolog | svaka rečenica | zadnjih 10 rečenica, W2V×TF-IDF | decay 0,9 po rečenici | NDCG@5 0,47 (ASR) vs 0,60 (ručno) | recept za query formation; ASR košta ~25 % |
| Samarinas & Zamani (2024) ProCIS | Reddit + Wikipedia | svaki iskaz: prikaži / šuti | cijeli prefiks | — | proaktivno npDCG@5 ≤ 0,17 | "kada" ≠ "što"; eval metrika s kaznom za kašnjenje |
| Lu i sur. (2024) ProactiveBench | desktop događaji | LLM predloži zadatak ili null | povijest događaja | — | F1 66,5 %; FA 50–65 % | LLM previše proaktivan; "ostani" kao default |
| Chen i sur. (2025) LlamaPIE | razgovor, slušalice | mali model KADA, veliki ŠTO | chunk 960 ms | — | javlja se ~15 %; 37 → 87 % točnost | dvoslojni router |
| Liu i sur. (2026) TGL trigger | tok događaja | mali graf model, LLM samo na okidač | temporalni graf | stabilni pragovi | +16,7 F1; 11 ms/događaj | brz kalibriran trigger |
| Rahbar i sur. (2026) Dialpad | call centar, live ASR | matcher iskaz ↔ topic | trenutni iskaz | max-F1 prag (CV) | LLM + opis 0,847 vs regex 0,721 vs emb 0,708 | kartica = aliasi + opis; lagani LLM verifikator |
| Solbiati i sur. (2021) | segmentacija sastanaka | TextTiling nad BERT-om | susjedni blokovi | — | −15,5 % greške | online detektor promjene teme = coarse breakpoint |
| Liu i sur. (2025) Inner Thoughts | višestrani razgovor | motivacija > prag | tok misli | akumulacija motivacije | bolji turn-taking | akumuliraj dokaze prije promjene |
| Khan i sur. (2026) CAPA | AMI sastanci | Perceiver/Predictor/Controller | stanje sastanka | — | šutnja 51,4 → 2,5 % | eksplicitno stanje directora |

---

## 8. Pravila dizajna za router / director

### 8.1 Horvitzovih 12 principa preslikano na naš sustav

| # | Horvitzov princip | Primjena kod nas |
|---|---|---|
| 1 | Automatizacija sa stvarnom dodanom vrijednošću | Sustav vrijedi jer govornik ne mora klikati po 100+ kartica. Ako se kartice mijenjaju po planu, sustav nije potreban, pa je fokus na **odstupanjima od plana**. |
| 2 | Uzeti u obzir nesigurnost o cilju | Svaka odluka ima p(kartica \| prozor), a ne samo argmax. Pratimo i razliku između top-1 i top-2 kandidata. |
| 3 | Pažnja i timing | Defer-to-breakpoint: kraj rečenice, pauza uz završenu rečenicu, diskursni marker, promjena teme. |
| 4 | Očekivana korisnost i pragovi | Dva praga: p\*hint (prijedlog na presenter viewu) i p\*switch (autonomna promjena projektora). p\*switch raste kad je trenutna kartica "svježa" (< 10–15 s) ili kad ju je govornik ručno odabrao. |
| 5 | Dijalog za razrješavanje nesigurnosti | "Dijalog" je tihi prijedlog na presenter viewu (tipka, klik, clicker) ili glasovna potvrda ("pokaži to"). Nikad pitanje na projektoru. |
| 6 | Efikasno izravno pozivanje i prekid | Govornik uvijek ima override: tipke ←/→, "zamrzni", "natrag", broj kartice, glasovna naredba. **Freeze mode** gasi autonomiju. |
| 7 | Minimizirati cijenu krivih pogađanja | Brzi "undo": jedna tipka vraća prethodnu karticu. Prijelaz je blag (crossfade), ne nagli rez. Krivo prebacivanje ne smije uništiti kontekst. |
| 8 | Preciznost usluge prema nesigurnosti | Srednja sigurnost znači prikaz teme ili kategorije (npr. grid 3 kandidata ili naslov "AI alati za medije"), a ne jedne konkretne kartice. Niska sigurnost znači da ostaje trenutna kartica ili neutralni slajd. |
| 9 | Suradnja na doradi rezultata | Govornik može reći "ne taj, onaj drugi". Director tada uzima sljedećeg kandidata i spušta score odbijenom. |
| 10 | Društveno primjereno ponašanje | Ne prekidati usred rečenice, ne mijenjati kartice više puta u nekoliko sekundi, ne prikazivati "pogađanja" publici. |
| 11 | Radna memorija nedavnih interakcija | Povijest prikazanih kartica služi za "vrati se na onaj od maloprije", za rješavanje anafora ("taj projekt") i za kaznu ponavljanja. |
| 12 | Učenje promatranjem | Logirati svaki prijedlog, prihvaćanje, odbijanje i override s proba. Prije nastupa iz toga podesiti pragove i težine. |

### 8.2 Konkretna pravila (MVP u 8 dana)

1. **Dvoslojni router** (LlamaPIE, TGL trigger). Brzi sloj na svaku finaliziranu ASR rečenicu: lematizacija, spotting aliasa kartica (fuzzy/fonetski), BM25 i embedding nad karticama, score. Spori sloj (LLM) poziva se samo kad je kandidat različit od trenutne kartice i iznad p\*hint, ili kad nijedna kartica ne pokriva temu, pa treba generirati slajd.
2. **Query formation iz kliznog prozora** (RA, Ambient Search, ACLD):
   - kratki prozor = zadnja rečenica ili ~20 riječi (za "imenovan projekt"),
   - srednji prozor = zadnjih ~5 rečenica,
   - dugi prozor = zadnjih ~10 rečenica ili ~60–90 s (za "tema").
   - Filtrirati na imenice, pridjeve i imena. Imena projekata i entitete težinski pojačati (×2 ili više).
   - Generirati 1–3 diverzna podupita (Habibi & Popescu-Belis) kad prozor pokriva više tema.
3. **Salience s opadanjem** (ACLD, Ambient Search). Svaka kartica ima salience s(t) = max(s(t−1)·d, novi_score). Za d uzeti otprilike 0,85–0,9 po rečenici. Trenutna kartica ostaje dok je s(trenutna) ≥ s(kandidat) − Δ.
4. **Hysteresis i minimalno vrijeme boravka.** Promjena se događa samo ako vrijedi sve od navedenog:
   - (a) kandidat je iznad p\*switch,
   - (b) prednost nad trenutnom karticom je ≥ Δ,
   - (c) to vrijedi u ≥ 2 uzastopne rečenice, **ili** je ime projekta izgovoreno eksplicitno (tada je dovoljna 1 rečenica),
   - (d) trenutna kartica je na ekranu već ≥ T_min (npr. 8–10 s).

   Ovo je inženjerski izvod iz persistence modela, Inner Thoughts akumulacije i Horvitzovog p\*. Točne brojke nisu iz literature i treba ih kalibrirati na probama.
5. **Defer-to-breakpoint** (Iqbal & Bailey, Adamczyk & Bailey).
   - Točna kartica (eksplicitno imenovana) mijenja se na kraju rečenice.
   - Tematska, ambijentalna ili generirana promjena čeka coarse granicu: online TextTiling pad sličnosti, diskursni marker ili dulju pauzu nakon završene rečenice.
   - Max-defer iznosi ~5 s. Nakon toga se odluka ili izvršava ili odbacuje.
6. **Pauza sama nije okidač** (Codellaborator): tišina znači razmišljanje. Koristiti pauzu samo u kombinaciji s rečenicom koja je sintaktički završena.
7. **Stopa promjena kao budžet** (LlamaPIE ~15 %, ProactiveBench lažni alarmi). Uvesti budžet promjena, npr. najviše 1 autonomna promjena u 10 s i najviše ~4–6 u minuti. Ako je budžet potrošen, prijedlog ide samo na presenter view.
8. **"Ostani" je default** (ProactiveBench). U LLM promptu directora "zadrži trenutnu karticu" je eksplicitna i zadana opcija s navedenom cijenom promjene. LLM vraća i kalibriranu sigurnost, koju ne uzimamo zdravo za gotovo nego je kombiniramo s brzim scoreom.
9. **Pokazati sigurnost govorniku, ne publici** (Rhodes: ocjena relevantnosti i ključne riječi; Codellaborator: presence). Presenter view prikazuje top-3 kandidata sa scoreom (npr. 0–2 plusa ili traka), ključne riječi koje su ih okinule i stanje directora ("slušam / kandidat X / prebacujem za 2 s"). Projektor dobiva samo odluke.
10. **Graceful degradation** (Horvitz 8). Visoka sigurnost daje konkretnu karticu. Srednja daje kategoriju ili grid kandidata. Niska znači da ostaje trenutna kartica. Nema pokrivenosti znači generirani slajd, ali tek na coarse breakpointu i glanceable (InsightToast).
11. **Dvije reprezentacije svake kartice** (Dialpad 2026): `aliases[]` (ime, kratice, fonetske varijante i hrvatski padežni oblici) i `description` (2–3 rečenice prirodnim jezikom, za LLM verifikator). Lagani, brzi LLM je dovoljan.
12. **Override i undo uvijek dostupni** (Horvitz 6–7): tipke, freeze, natrag, glasovna naredba. Svaki override se logira kao negativni ili pozitivni primjer.
13. **Vlastiti eval prije nastupa** (ProCIS, JIR-Arena). Na 2–3 snimljene probe anotirati za svaku rečenicu "idealnu karticu ili ostani". Mjeriti preciznost promjena, kašnjenje (sekunde od prvog spomena do prikaza, u duhu npDCG) i broj nepotrebnih promjena u minuti. Pragove birati na tom skupu, s prednošću preciznosti (F0.5).
14. **Plan govora kao prior** (Meeting Insights: recentnost). Ako govornik ima okvirni redoslijed, "sljedeća kartica u planu" dobiva prior boost. Odstupanje od plana traži jači dokaz.

---

## Izvori koje nisam uspio potvrditi ili nisam koristio

- Tvrdnja "timing objašnjava 40 % varijance prihvaćanja, 3× više prihvaćanja u pravom trenutku" pojavila se u sažetku pretraživača bez jasnog izvora. **Nije korištena.**
- "Zero-query" pretraga: pronađen je samo Liu, Guo, Song i sur., *Modeling User Interests for Zero-Query Ranking*, ECIR 2016 (LNCS), DOI 10.1007/978-3-319-30671-1_13. Postojanje je potvrđeno preko OpenAlexa, rad nije čitan. Riječ je o mobilnim karticama tipa Google Now, pa je relevantnost umjerena.
- Budzik & Hammond, *User interactions with everyday applications as context for just-in-time information access* (Watson), IUI 2000, DOI 10.1145/325737.325776. Postojanje je potvrđeno preko OpenAlexa, rad nije čitan. Klasični JITIR paralelni s Rhodesom.
- Rhodes, *The wearable remembrance agent: A system for augmented memory*, ISWC 1997, DOI 10.1109/iswc.1997.629928. Postojanje je potvrđeno, a sadržaj je pokriven radom 1.2.
- Deng i sur., *A Survey on Proactive Dialogue Systems: Problems, Methods, and Prospects*, IJCAI 2023, DOI 10.24963/ijcai.2023/738. Postojanje je potvrđeno, rad nije čitan. Dobar pregled za daljnje čitanje.
