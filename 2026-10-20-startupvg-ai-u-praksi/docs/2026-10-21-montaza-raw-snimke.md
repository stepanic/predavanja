# Montaža predavanja 20.10.: raw snimke i prijenos

Ovo je sirovi materijal za montažu predavanja „AI u praksi” (StartupVG, 20. 10. 2026).
Cilj je montaža s poravnanjem po zvuku i pametnim lipsyncom. Ovaj dokument pokriva
samo prvi korak, prikupljanje snimki na disk.

## Gdje su fajlovi

Mapa: `/Volumes/DOMOVINA2TB/ai_edukacija_startupvg_20261020_raw_montaza/`

| Fajl | Izvor | Veličina | Provjera |
|---|---|---|---|
| `VID_20261020_174551574.mp4` | moto g86 5G, `/sdcard/DCIM/Camera/` | 55.576.509.375 B | veličina = mobitel, md5 spoja, korisnik pregledao |
| `P1400725.MP4` | LUMIX SD, `DCIM/140_PANA/` | 56.253.671.036 B | veličina = izvor (Finder kopija) |
| `StartupVG AI radionica 2026-10-20.m4a` | Google Drive `1yyB6e48PchIqBOaweACowMkznQgK_aOT` | 62.295.200 B | md5 = Drive; AAC 48 kHz mono, 1 h 58 min 26 s |

Kratki video s mobitela od 17:33 i fotku korisnik namjerno nije htio.

## Zamke pri prijenosu

**Android ne postoji u Finderu.** Mobitel dijeli datoteke preko MTP-a, a Finder MTP
ne čita. Mobitel se vidi samo kroz `adb`, a za pregled u prozoru treba OpenMTP ili MacDroid.

**Moto g86 je spojen na USB 2.0 (480 Mb/s).** `adb pull` daje oko 16 MB/s, a
nastavak preko `exec-out` oko 5,5 MB/s. Brži kabel ne pomaže, jer je link 480 Mb/s.
Brzinu linka pokazuje `system_profiler SPUSBHostDataType`.

**Prekinuti `adb pull` se može nastaviti, ne treba ga ponavljati.** Ova sesija je
smrznula iTerm na 51.027.312.640 / 55.576.509.375 B. `adb pull` piše redom, pa je
početak fajla bio ispravan. Postupak:

```bash
L=$(stat -f %z "$D")                       # lokalna veličina
# provjeri zadnjih 64 MiB prije L na obje strane (md5 mora biti isti)
adb shell "dd if=$F bs=1048576 skip=$((L/1048576-64)) count=64 | md5sum"
dd if="$D" bs=1048576 skip=$((L/1048576-64)) count=64 | md5 -q
# dopiši ostatak; bs mora dijeliti L (ovdje 65536)
adb exec-out "dd if=$F bs=65536 skip=$((L/65536)) 2>/dev/null" >> "$D"
```

**Drive link u mailu nije privitak.** Gmail chip vodi na Drive fajl. Drive MCP
vraća sadržaj kao base64 u kontekst, što za desetke MB nije izvedivo. Umjesto
toga ide `rclone backend copyid google_drive_ms: <fileId> <odredište>`.

**Dugi poslovi u pozadini, bez praćenja napretka.** Sesija koja je čekala `adb pull`
završila je sa smrznutim iTermom. Javljati se samo na kraju posla.

## Otvoreno

- RØDE audio i screenshare dodani su 2026-10-26 (rclone iz Drive mape), a poravnanje je u [2026-10-26-montaza-sinkronizacija.md](2026-10-26-montaza-sinkronizacija.md).
- `P1400725.MP4` provjeren je samo po veličini, nije pregledan.

## Vezani dokumenti

- [2026-10-20-demo-web-tvrtka-uzivo.md](2026-10-20-demo-web-tvrtka-uzivo.md): demo s istog predavanja
