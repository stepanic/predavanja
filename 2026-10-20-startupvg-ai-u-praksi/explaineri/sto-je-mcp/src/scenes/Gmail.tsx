import { C, DISPLAY, Naslov, Pozadina, Sfx, TEKST, Upit, expo, pop, ulaz, useSec } from "../lib";

// S5: Gmail MCP na primjeru reklamacije, kako ga je govornik opisao (57:09–57:47).
const UPIT = "Pročitaj mailove od trgovine, poveži plaćanja i dostave, složi mail, spremi ga u arhivu i pošalji.";
const KORACI = ["pročitao mailove", "povezao plaćanja i dostave", "složio mail", "spremio ga u arhivu", "poslao"];
const UPIT_KRAJ = 4.4;

export const Gmail = () => {
  const t = useSec();
  const zig = pop(t, 8.6);
  return (
    <Pozadina boja={C.zuta}>
      <Naslov t={t} u={0.05}>Primjer: Gmail</Naslov>
      <Upit t={t} od={0.6} do={UPIT_KRAJ} tekst={UPIT} style={{ left: 140, top: 210, width: 1640, boxSizing: "border-box" }} />
      {KORACI.map((k, i) => {
        const u = UPIT_KRAJ + 0.5 + i * 0.465;
        const p = ulaz(t, u, 0.35, expo);
        return (
          <div key={k} style={{ position: "absolute", left: 140, top: 480 + i * 92, display: "flex", alignItems: "center", gap: 28, opacity: p, transform: `translateX(${(1 - p) * -40}px)` }}>
            <div style={{ width: 56, height: 56, borderRadius: 12, background: C.tinta, color: C.zuta, display: "flex", alignItems: "center", justifyContent: "center", font: `400 40px ${DISPLAY}` }}>✓</div>
            <div style={{ font: `700 50px ${TEKST}`, color: C.tinta }}>{k}</div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 1000, top: 600, width: 760, padding: "36px 44px", boxSizing: "border-box", border: `10px solid ${C.crvena}`, borderRadius: 24, color: C.crvena, font: `400 70px/1.08 ${DISPLAY}`, letterSpacing: "-0.02em", transform: `rotate(-5deg) scale(${zig > 0 ? 1.6 - 0.6 * zig : 0})`, opacity: Math.min(1, zig * 1.5) }}>
        Inbox nije trebalo ni otvoriti.
      </div>
      <Sfx ime="typing" u={0.6} glasnoca={0.35} trajanje={UPIT_KRAJ - 0.6} />
      {KORACI.map((k, i) => (
        <Sfx key={k} ime="key-press" u={UPIT_KRAJ + 0.5 + i * 0.465} glasnoca={0.5} />
      ))}
      <Sfx ime="impact-bass-1" u={8.6} glasnoca={0.6} />
    </Pozadina>
  );
};
