import { interpolate } from "remotion";
import { C, DISPLAY, Naslov, Pozadina, Sfx, TEKST, expo, inOut, pop, ulaz, useSec } from "../lib";

// S4: put zahtjeva klijenta od poruke do promjene u aplikaciji (10:04–10:56, 23:22–24:03).
const CVOROVI = [
  { ime: "Klijent", opis: "tekst, screenshot ili glasovna" },
  { ime: "~30 WhatsApp grupa", opis: "zahtjevi stižu tijekom dana" },
  { ime: "WhatsApp bridge", opis: "mala aplikacija u pozadini", oznaka: "nije AI" },
  { ime: "WhatsApp MCP", opis: "napravila ga je zajednica" },
  { ime: "Claude Code", opis: "pročita zahtjev i radi", tamni: true },
  { ime: "Aplikacija", opis: "„želim ovu promjenu”" },
];
const SIRINA = 440;
const KORAK = 560;
const RITAM = 1.86; // jedan takt
const PRVI = 0.5;
const kada = (i: number) => PRVI + i * RITAM;
// Kamera drži zadnji čvor u kadru: x lijevog ruba trake za čvor i.
const pomak = (i: number) => Math.min(140, 1780 - SIRINA - i * KORAK);

export const WhatsApp = () => {
  const t = useSec();
  const vremena = CVOROVI.map((_, i) => kada(i) - 0.3);
  const pomaci = CVOROVI.map((_, i) => pomak(i));
  let x = interpolate(t, vremena, pomaci, { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: inOut });
  // Na kraju se cijeli lanac vidi odjednom: kartice se suze, opisi nestanu, ništa se ne smanjuje ispod čitljivog.
  const odmak = interpolate(t, [11.5, 12.9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: inOut });
  const lerp = (a: number, b: number) => a + (b - a) * odmak;
  x = lerp(x, 150);
  const sirina = lerp(SIRINA, 236);
  const korak = lerp(KORAK, 280);
  const visina = lerp(320, 200);
  const imeFont = lerp(50, 36);
  const citat = ulaz(t, 13.0, 0.5);
  return (
    <Pozadina boja={C.tinta}>
      <Naslov t={t} u={0.05} boja={C.zuta}>Primjer: WhatsApp</Naslov>
      <div style={{ position: "absolute", left: 0, top: 340 + odmak * 60, transform: `translateX(${x}px)` }}>
        {CVOROVI.map((c, i) => {
          const p = pop(t, kada(i));
          const strelica = ulaz(t, kada(i) + 0.9, 0.6, expo);
          return (
            <div key={c.ime}>
              <div style={{ position: "absolute", left: i * korak, top: 0, width: sirina, height: visina, boxSizing: "border-box", borderRadius: 26, padding: `${lerp(36, 26)}px ${lerp(34, 22)}px`, background: c.tamni ? C.crvena : C.zuta, color: C.tinta, transform: `scale(${p})`, opacity: Math.min(1, p * 2) }}>
                <div style={{ font: `400 ${imeFont}px/1.05 ${DISPLAY}`, letterSpacing: "-0.02em", color: c.tamni ? C.bijela : C.tinta }}>{c.ime}</div>
                <div style={{ font: `700 32px/1.3 ${TEKST}`, marginTop: 20, opacity: 1 - odmak, color: c.tamni ? C.bijela : C.tinta }}>{c.opis}</div>
                {c.oznaka && (
                  <div style={{ position: "absolute", right: -18, top: -30, background: C.crvena, color: C.bijela, font: `800 34px ${TEKST}`, padding: "8px 22px", borderRadius: 999, transform: `rotate(6deg) scale(${pop(t, kada(i) + 0.6)})` }}>
                    {c.oznaka}
                  </div>
                )}
              </div>
              {i < CVOROVI.length - 1 && strelica > 0 && (
                <svg style={{ position: "absolute", left: i * korak + sirina + lerp(10, 2), top: visina / 2 - 30 }} width={100} height={60}>
                  <line x1={0} y1={30} x2={lerp(80, 24) * strelica} y2={30} stroke={C.zuta} strokeWidth={8} strokeLinecap="round" />
                  <polygon points={`${lerp(72, 18)},12 ${lerp(98, 40)},30 ${lerp(72, 18)},48`} fill={C.zuta} opacity={strelica > 0.9 ? 1 : 0} />
                </svg>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 140, right: 140, top: 780, font: `700 52px/1.3 ${TEKST}`, color: C.bijela, opacity: citat, transform: `translateY(${(1 - citat) * 24}px)` }}>
        Programeru ostaje fokus: da aplikacije rade dobro, brzo i sigurno.
      </div>
      {CVOROVI.map((c, i) => (
        <Sfx key={c.ime} ime={i === 4 ? "impact-bass-1" : "pop"} u={kada(i)} glasnoca={i === 4 ? 0.55 : 0.4} />
      ))}
      <Sfx ime="whoosh" u={11.5} glasnoca={0.35} />
    </Pozadina>
  );
};
