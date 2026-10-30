import { C, DISPLAY, Pozadina, Sfx, TEKST, expo, pop, ulaz, useSec } from "../lib";

// S7: druga strana iste moći (13:36–14:12).
const MOZE = ["obrisati disk", "poslati mail u vaše ime"];

export const Oprez = () => {
  const t = useSec();
  const l1 = ulaz(t, 0.2, 0.5, expo);
  const citat = ulaz(t, 3.6, 0.5);
  return (
    <Pozadina boja={C.tinta}>
      <div style={{ position: "absolute", left: 140, top: 140, font: `400 100px/1.05 ${DISPLAY}`, letterSpacing: "-0.03em", color: C.zuta, opacity: l1, transform: `translateY(${(1 - l1) * 40}px)` }}>
        Program na računalu
        <br />
        može raditi sve.
      </div>
      {MOZE.map((m, i) => {
        const p = pop(t, 1.6 + i * 0.93);
        return (
          <div key={m} style={{ position: "absolute", left: 140, top: 420 + i * 120, background: C.crvena, color: C.bijela, font: `800 58px ${TEKST}`, padding: "14px 36px", borderRadius: 16, transform: `scale(${p})`, transformOrigin: "0 50%" }}>
            {m}
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 140, right: 140, top: 720, font: `700 46px/1.35 ${TEKST}`, color: C.bijela, opacity: citat }}>
        „Ja još uvijek radim s dangerously skip permissions.
        <br />
        99,9 % ljudi to ne radi.”
      </div>
      {MOZE.map((m, i) => (
        <Sfx key={m} ime="pop" u={1.6 + i * 0.93} glasnoca={0.45} />
      ))}
    </Pozadina>
  );
};
