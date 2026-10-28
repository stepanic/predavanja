# Plan predavanja StartupVG 20. 10. — iz probe od 17. 10.

Izvor: dvije audio bilješke (`~/Downloads/ms - priprema za predavanje 001.m4a`, 26 min, i
`002.m4a`, 16 min), proba s jednom osobom kao publikom. ASR: Speechmatics batch, `hr`, Enhanced,
dijarizacija govornika (račun domovinaenergy, ~$0,56). Transkripti nisu u ovom repou. U 002 su oznake S1/S2 obrnute u odnosu na 001,
a prvi blok 002 miješa Matijin sažetak i sugovornicine riječi.

## Što se dogodilo na probi

1. **Proba 001 (0–17 min):** prolaz kroz projekte redom (domovina.tv, domovina.ai,
   pay.domovina.ai / Monerium, wallet, MCP, glasanje za Maksimir, Pinka crowdfunding,
   Shipyard prijava, Magisterium, wallet za nogometne klubove, karta Hrvatske). Za 17 min
   prošlo je ~10 od 96 projekata.
2. **Povratna informacija s probe:** zvuči kao „životopis, ja sam napravio ovo”. Nedostaje *kako* je AI
   korišten. Predavanje treba glavu, razradu i rep. Uvod: tko sam, kako sam koristio AI kroz
   godine (10 g. programiranja → zadnje 2 g. intenzivno s agentima). Publika je mješovita
   (programeri, ljudi drugih struka); netko izvan IT-a želi otići s nečim
   konkretnim: „mogu napraviti jednostavnu igricu za dijete ili olakšati administraciju”.
   Zanima ga kako netko s velikim iskustvom to integrira u cijeli život.
3. **Matijine ideje usput:**
   - projekti se vrte u pozadini na slajdovima (~10 s po projektu, s brojem i QR-om), ne
     objašnjavaju se jedan po jedan;
   - QR stalno na ekranu → WhatsApp i/ili Telegram grupa; publika šalje pitanja, a Claude
     Code čita poruke paralelno, klasificira ih i svakome odgovara personalizirano. To je
     „čista demonstracija AI-ja u stvarnom svijetu”;
   - publika glasa koji projekti ih zanimaju → top 3 se objasne detaljnije;
   - unaprijed pripremljeni promptovi pa uživo AI autonomno radi aplikaciju na ekranu;
   - uvod s rekvizitom: 450 stranica dokumentacije za građevinsku dozvolu, od kojih je
     zidaru korisno 10. sugovornica: skreće s teme;
   - teza: sve što netko želi pitati efikasnije je pitati Claudea, ali ovdje smo da
     razmijenimo iskustva (trikovi, prednosti, nedostaci, ubrzanja).
4. **Zaključak probe:** linearno objašnjavanje projekata je prespor. Treba kostur koji se
   najavi na početku, pa publika zna što je čeka. Format: **30 min izlaganje + 30 min
   pitanja i odgovori.**

## Prijedlog toka (30 + 30 min)

| Vrijeme | Dio | Što se događa |
|---|---|---|
| 0–3 | **Otvaranje** | Pozdrav, tko sam i čime se bavim. Najava tijeka u tri rečenice. QR na ekranu: „skenirajte, pišite pitanja od sada”. |
| 3–6 | **Tko je u dvorani** | Dizanje ruku: programeri / drugi posao / koristi AI svakodnevno / tek počinje. Kratko prilagodi razinu. |
| 6–12 | **Moj put s AI-jem** | 10 g. programiranja bez AI-ja → ChatGPT → zadnjih ~1,5 g. agenti (Claude Code, 5.000+ sesija). Što se promijenilo u danu, ne samo u kodu. Jedna rečenica cilja: prijenos iskustva, ne tehnologije. |
| 12–20 | **Demo uživo** | Pripremljen prompt; agent sam gradi malu aplikaciju za nekog iz publike (npr. igrica za dijete, obrazac za administraciju). Dok radi, govoriš što radi i zašto. |
| 20–27 | **Paralelno odgovaranje** | Otvori grupu: Claude čita sve dosad stigle poruke, grupira ih i odgovara svakom pitaču. To je drugi demo i prijelaz na Q&A. |
| 27–30 | **Zatvaranje izlaganja** | 2–3 projekta koja je publika izglasala/najviše pitala, po minutu: što je i *kako je AI pomogao*. Gdje je katalog (projekti.domovina.ai). |
| 30–60 | **Pitanja i razmjena** | Naglas i iz grupe. Pozvati i publiku da podijeli svoje trikove. Pozadina cijelo vrijeme: rotacija kartica projekata s brojem i QR-om. |

Pozadina cijelo vrijeme: rotator projekata (~10 s po kartici, broj + QR), pa nitko ne čeka
da dođe „njegov” projekt; pita kroz grupu.

## Što izbaciti ili odlučiti

- **Izbaciti:** prolaz kroz projekte redom (proba je pokazala ~1,5 min po projektu).
- **Izbaciti ili skratiti na 30 s:** priča o 450 stranica za građevinsku dozvolu. Ako ostane,
  samo kao jedna slika u uvodu „AI mijenja i papirologiju”, ne kao tema.
- **Odlučiti:** WhatsApp, Telegram ili oboje (Matija: oboje, dio ljudi ne koristi WhatsApp;
  sugovornica sumnja). Oboje znači dvostruku infrastrukturu; ako vrijeme ne dopušta, jedan kanal.
- **Odlučiti:** glasanje za projekte (anketa u grupi ili dizanje ruku) ili samo „najviše
  pitanja u grupi” kao signal.
- **Rizik:** demo uživo i paralelno odgovaranje ovise o mreži i agentu. Pripremiti snimku
  oba kao rezervu.
- **Provjeriti:** u snimci 001 spomenuto je „utorak u 20:30”, a `luma.md` kaže 18:00. Vjerojatno
  greška ASR-a, ali potvrdi s Domagojem.

## Slajdovi (2026-10-18)

Prezentacija je Slides artifact: https://claude.ai/artifact/SkCynn9RLYBDH2S4rVhtA3 (privatna; izvoz u
PPTX/PDF). Izvorni fajlovi su samo u artifactu, ne u repou.

Prva verzija (noć 17./18. 10.) slijedila je plan s probe i nije odgovarala objavljenom opisu na Lumi
(https://luma.com/bsd0tedr, isti tekst kao `docs/event/luma.md`): nije imala nijedan od pet najavljenih
projekata, a ton je bio teatralan. Matija je tražio usklađivanje s Lumom i neutralan ton.

Verzija 4 (18. 10.) ima 15 slajdova redom kao opis na Lumi:

1. naslov; 2. kako ide večer (žive stranice, pitanja u bilo kojem trenutku, bez fiksnog scenarija);
3. četiri vrste pitanja iz opisa, s brojem slajda koji odgovara; 4. WhatsApp i Telegram grupa (QR);
5. „Što ćete vidjeti” (popis); 6–10. po slajd za svaki najavljeni projekt (Maksimir, Lopta je okrugla,
Domovina.ai i Podcasterium, otvoreni podaci, automatizacije) s brojkama iz kataloga i URL-om ili QR-om;
11. koliko traje i koliko košta; 12. greške i slijepe ulice; 13. prvi korak; 14. predavač
(na kraju kao na Lumi); 15. pitanja.

Izbačeno: priča o probi i greškama ASR-a kao otvaranje, tijek 30+30, dizanje ruku (ostalo u
bilješkama), „moj put” s `[godina]`, odvojeni slajdovi za demo.

Otvoreno prije utorka:

- QR kodovi WhatsApp i Telegram grupe (okviri na slajdovima 4 i 15). WhatsApp grupa postoji od 19. 10.,
  a link i QR su u `docs/event/whatsapp-grupa/`. Telegram je još otvoren;
- iznos ~104 €/mj. (1.975 € bruto, 42 računa, telemetrija 13. 10.) na slajdu 11: potvrditi da smije javno;
- incident 30. 9. je samo u bilješkama slajda 12, opcionalno;
- Telegram bot i WhatsApp most za nove grupe, snimke demoa kao rezerva;
- slajdovi nisu vizualno pregledani.
