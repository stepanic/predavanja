# WhatsApp grupa predavanja „AI u praksi” (20. 10. 2026.)

Grupu je Matija napravio 19. 10. 2026. Ime grupe je „AI u praksi 2026-10-20”, a slika grupe je StartupVG logo.

Link za pozivnicu: [link uklonjen]

| File | Što je |
|---|---|
| `qr.png`, `qr.svg`, `qr-whatsapp-screenshot.png` | (QR kodovi pozivnice nisu u ovom repou) |

`zbarimg` oba čita kao isti link. Na WhatsAppovom QR-u je još `?mode=gi_t`, a čisti QR je
generiran bez tog parametra.

Regeneriranje:

```bash
URL='[link uklonjen]'
qrencode -l M -m 2 -s 40 -o docs/event/whatsapp-grupa/qr.png "$URL"
qrencode -t SVG -l M -m 2 -o docs/event/whatsapp-grupa/qr.svg "$URL"
```

## QR na projekti.domovina.ai (od 20. 10.)

Grid i `/stage` stalno prikazuju QR grupe (`app/wa.js`, slika `app/wa-qr.svg` = kopija `qr.svg`):

- na platnu mali QR dolje desno unutar slajda (~11 % širine slajda, ~200 px na 1920×1080);
  tipka `w` ga mijenja: mali → veliki u sredini (s napomenom o vidljivim brojevima) → skriven;
- na mobitelu (`max-width: 700px` ili `pointer: coarse`) umjesto QR-a zeleni gumb s linkom,
  jer vlastiti ekran se ne može skenirati;
- `?wa=0` ga isključuje, `?wa=1` ga prikazuje i nakon isteka;
- nakon `WA_UNTIL` (21. 10. 2026. u 12:00) se sam ne prikazuje, da link grupe ne ostane
  trajno na javnoj stranici. Za produženje promijeni konstantu i `npm run deploy`.

Provjereno Playwrightom (1920×1080 mali i veliki, iPhone 13) i `zbarimg` na snimkama s platna.
Ako se link grupe promijeni: novi `qr.svg`, kopiraj u `app/wa-qr.svg`, promijeni `WA_URL` i redeploy.

Ako se link resetira u postavkama grupe („Reset link”), stari link i oba QR-a prestaju vrijediti.

Praćenje uživo: `python3 tools/wa_watch.py "AI u praksi"`. Na slajdu s QR-om treba reći da
članovi grupe vide brojeve jedni drugih (vidi `docs/2026-09-30-sync-kataloga-i-whatsapp-pitanja.md`).
