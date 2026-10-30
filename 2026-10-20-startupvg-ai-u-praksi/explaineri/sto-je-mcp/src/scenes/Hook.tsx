import { C, DISPLAY, Pozadina, Sfx, TEKST, expo, pop, ulaz, useSec } from "../lib";

// S1: „MCP” slovo po slovo na taktove, pa definicija s predavanja (10:04).
export const Hook = () => {
  const t = useSec();
  const crta = ulaz(t, 3.3, 0.6, expo);
  const def = ulaz(t, 2.1, 0.45);
  return (
    <Pozadina boja={C.zuta}>
      <div style={{ position: "absolute", left: 130, top: 150, font: `400 460px/1 ${DISPLAY}`, letterSpacing: "-0.04em", color: C.tinta, display: "flex" }}>
        {"MCP".split("").map((s, i) => {
          const p = pop(t, 0.26 + i * 0.465);
          return (
            <span key={i} style={{ display: "inline-block", transform: `translateY(${(1 - p) * 90}px) scale(${0.6 + 0.4 * p})`, opacity: Math.min(1, p * 2) }}>
              {s}
            </span>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 145, top: 650, font: `700 88px ${TEKST}`, letterSpacing: "-0.02em", color: C.tinta, opacity: def, transform: `translateY(${(1 - def) * 30}px)` }}>
        = mali dodatak za Claude
      </div>
      <div style={{ position: "absolute", left: 145, top: 770, height: 14, width: 1030, background: C.crvena, transformOrigin: "0 50%", transform: `scaleX(${crta})` }} />
      {[0, 1, 2].map((i) => (
        <Sfx key={i} ime="pop" u={0.26 + i * 0.465} glasnoca={0.45} />
      ))}
      <Sfx ime="whoosh-short" u={2.0} glasnoca={0.35} />
    </Pozadina>
  );
};
