# Donacije po projektu na projekti.domovina.ai: MPT Safe + GitHub Sponsors

Ideja: svaki public projekt u katalogu ima gumb „Podrži" s dva puta, i po iznosima
se vidi gdje ulagati vrijeme. MPT put je ujedno promocija MPT-a, koji je i sam
kartica u katalogu.

Vezani dokumenti: `pay.domovina.ai/docs/2026-10-11-funding-po-projektu.md` (Safe po
projektu, Monerium memo, stanje sandboxa) · [2026-09-30 sync kataloga](2026-09-30-sync-kataloga-i-whatsapp-pitanja.md)

## 1. MPT / Monerium (EUR → EURe u Safe projekta)

- Safe po projektu radi `pay.domovina.ai/tools/funding/funding-init.mjs`; registar
  adresa je `tools/funding/projects.<env>.json`.
- Opis plaćanja: `gnosis:0x<Safe> sid:<sid>` (razmak iza adrese je obavezan).
- Na sandboxu postoji `domovinatv-karta-hrvatske` → `0xb3438D62…8720` (Chiado).

## 2. GitHub Sponsors (istraženo 11. 10. 2026.)

| Pitanje | Odgovor |
|---|---|
| Naknada | 0 % za sponzore s osobnih računa (docs); s org računa do 6 %, plaća sponzor. Additional Terms §2.2 spominju 3 % + 3 % bez te razlike, docs i uvjeti se razilaze |
| Hrvatska | podržana (Stripe Connect), isplata u USD → EUR po tečaju GitHuba, mjesečno, prag 100 $, prva nakon 60 dana |
| Porez | W-8BEN s OIB-om; GitHub ne zadržava porez; prijava u HR (pitati knjigovođu: drugi dohodak ili ITalk) |
| Po repou? | **ne**, Sponsors je po računu. Javni repo nije uvjet, treba samo za gumb iz `FUNDING.yml` |
| Pripisivanje projektu | jedino `?metadata_<ključ>=<vrijednost>` u linku, npr. `github.com/sponsors/stepanic?metadata_project=<slug>`; znakovi `[A-Za-z0-9_-]`, max 10 parova |
| API | GraphQL/webhook **ne vraćaju metadata**; per-projekt iznosi samo iz mjesečnog exporta transakcija (CSV/JSON na mail). Bez parametra = „unattributed" |
| Fiscal host | Open Collective Europe (EUR, 8–10 %), bira se samo pri prijavi |
| Matching fund | ugašen |

Preporučeni `FUNDING.yml` u svakom public repou:

```yaml
github: stepanic
custom: ["https://github.com/sponsors/stepanic?metadata_project=<slug>&metadata_src=repo"]
```

Alternative s per-repo transparentnošću: Open Collective (javni ledger, 8–10 %),
Drips (on-chain po repou, ali nije na Gnosis Chainu).

## 3. Što treba u ovom repou

- Opcionalno polje na kartici, npr.
  `funding: { safe, chain_id, campaign_id, sponsors_url }`.
- **Dodati ga u `DIRECTOR_FIELDS` u `tools/catalog/finalize.py:31`**, inače ga
  pipeline tiho izbaci.
- Prikaz u `app/stage.js` (detalj) i po želji značka u `app/index.html` (`tileHtml`).
- Deploy (`tools/deploy/build.py`) zadržava samo public kartice; adrese Safeova su
  javne pa smiju van.

## Otvoreno

- Uključiti GitHub Sponsors na `stepanic` (2FA, Stripe, W-8BEN) — mora Matija.
- Generirati `FUNDING.yml` za sve public repoe s `metadata_project`.
- Polje `funding` + gumb „Podrži" nakon što rail dobije način „direct" (pay docs).
