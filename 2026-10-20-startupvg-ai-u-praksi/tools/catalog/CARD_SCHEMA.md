# Kartica projekta

Jedna kartica = jedan projekt koji redatelj može staviti na projektor dok
govornik o njemu priča. Datoteka: `data/cards/<id>.json`, UTF-8, bez komentara.

Kartice čita LLM redatelj (odabir po ID-u) i brzi ruter (aliasi, embeddinzi),
a projektor ih prikazuje publici. Zato su tekstovi kratki, konkretni i na
hrvatskom.

```json
{
  "id": "domovinatv-karta-hrvatske",
  "title": "Karta Hrvatske",
  "one_liner": "Interaktivna GIS karta s 40+ slojeva javnih podataka o Hrvatskoj.",
  "description": "2–3 rečenice: što je, za koga, što je zanimljivo. Bez žargona.",
  "category": "web-app | mobile-app | data-pipeline | ai-agent | automation | landing | tool | research | prototype | infra | other",
  "context": "Domovina | Pinka | Airkuna | ZEF | klijent | osobno | open-source | ...",
  "visibility": "public | review | private",
  "visibility_reason": "zašto (samo ako nije public)",
  "status": "live | building | prototype | archived | internal",
  "tags": ["gis", "maplibre", "otvoreni podaci"],
  "aliases": ["karta hrvatske", "karti hrvatske", "kartu", "gis domovina", "gis.domovina.ai", "karta rh"],
  "facts": [
    "Kratka, provjerljiva činjenica s brojkom, npr. '82 inkubatora geokodirana sa 100 % preciznosti'.",
    "3–6 činjenica, najzanimljivije prvo."
  ],
  "talk_hooks": [
    "1–2 rečenice koje govornik može reći o ovome na predavanju o AI-ju (kako je Claude Code pomogao, iznenađenje, zanimljiv problem)."
  ],
  "stack": ["React", "MapLibre", "Cloudflare Pages", "Python"],
  "urls": { "live": ["https://gis.domovina.ai"], "repos": [{ "url": "https://github.com/domovinatv/…", "visibility": "public" }] },
  "stats": { "sessions": 15, "user_prompts": 109, "automated_runs": 0, "first": "2026-05-17", "last": "2026-09-14", "commits": null },
  "showcase_score": 1,
  "showcase_reason": "zašto je (ne)zanimljivo za predavanje o AI-ju",
  "related": ["domovinatv-oou-domovina-ai"],
  "media": [],
  "sources": ["putanje iz kojih je kartica izvedena"]
}
```

## Pravila

**Privatnost je najvažnija.** Kartice se prikazuju publici.
- Nikad: imena privatnih osoba (osim samog govornika), emailovi, telefoni, OIB-ovi,
  iznosi računa ili dugova, plaće, cijene iz pregovora, podaci o djeci i obitelji,
  interni endpointi, ključevi, imena bucketa.
- `private`: osobne financije, obitelj, traženje posla, CV, zdravlje, privatne
  poruke. Takva kartica ima samo `id`, `title`, `visibility`, `visibility_reason`,
  `stats` i `sources`, bez opisa.
- `review`: rad za klijenta ili poslodavca, neobjavljeni planovi, fundraising,
  podaci o članovima ili trećim osobama. Opis je neutralan i bez povjerljivih detalja;
  govornik odlučuje.
- Politička ili vjerska tema **sama nije razlog** za `review` (odluka govornika, 2026-09-24).
- `public`: vlastiti projekti koji su već javni (live URL, javni repo) ili bezopasni.

**Aliasi** su ključni jer ih ruter uspoređuje s transkriptom govora:
- hrvatski padeži i množina (karta, karte, karti, kartu, kartom)
- kako se ime izgovara i kako ga ASR tipično krivo zapiše (npr. "domovina ai",
  "domovina a i", "klaud kod" za Claude Code)
- domena bez https, kratice, engleski i hrvatski naziv
- 5–15 aliasa, sve malim slovima

**showcase_score** od 1 do 5 govori koliko je projekt zanimljiv za predavanje o
tome što se s AI-jem može napraviti u godinu dana. 5 znači vizualno upečatljiv,
živ, s dobrom pričom. 1 znači interni alat bez priče.

**Činjenice** moraju biti izvedene iz izvora (MEMORY.md, sažeci sessiona, README,
git). Ništa se ne izmišlja. Ako nešto nije poznato, polje ostaje prazno.

**Repo bez Claude sessiona** (`no_claude_sessions: true`) je rad iz vremena prije
Claude Codea ili bez njega. Označi to u `tags` kao `prije-claude-codea` ako su
commitovi stariji od 2026-04, jer je to dobar kontrast na predavanju.

**Repoi** (`urls.repos`) se ne pišu ručno nego ih puni `tools/catalog/repos.py` iz git
remotea lokalnih kopija. Projekt može imati 0..N repoa (npr. web i aplikacija). Na
projekti.domovina.ai idu samo oni koje GitHub pri buildu vidi kao javne.
