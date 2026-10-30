import { C, DISPLAY, Pozadina, Sfx, TEKST, expo, pop, ulaz, useSec } from "../lib";

// S2: Claude Code na računalu, a WhatsApp, mail i kalendar su izvan dohvata.
export const ClaudeKutija = ({ sirina = 640, visina = 300, natpis = "na vašem računalu" }: { sirina?: number; visina?: number; natpis?: string }) => (
  <div style={{ width: sirina, height: visina, background: C.tinta, borderRadius: 28, color: C.zuta, display: "flex", flexDirection: "column", justifyContent: "center", paddingLeft: 56, boxSizing: "border-box" }}>
    <div style={{ font: `400 76px/1 ${DISPLAY}`, letterSpacing: "-0.02em" }}>Claude Code</div>
    {natpis && <div style={{ font: `700 38px ${TEKST}`, color: C.bijela, marginTop: 22 }}>{natpis}</div>}
  </div>
);

const IZVAN = ["WhatsApp", "Gmail", "Kalendar"];

export const Sam = () => {
  const t = useSec();
  const k = pop(t, 0.2);
  const red = ulaz(t, 5.0, 0.45);
  return (
    <Pozadina boja={C.zuta}>
      <div style={{ position: "absolute", left: 140, top: 330, transform: `scale(${0.85 + 0.15 * k})`, transformOrigin: "0 50%", opacity: Math.min(1, k * 2) }}>
        <ClaudeKutija />
      </div>
      {IZVAN.map((ime, i) => {
        const u = 1.6 + i * 0.93;
        const p = ulaz(t, u, 0.5, expo);
        const x = ulaz(t, u + 0.45, 0.3);
        return (
          <div key={ime} style={{ position: "absolute", left: 1150, top: 250 + i * 170, width: 520, height: 120, border: `6px dashed ${C.tinta}`, borderRadius: 22, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px", opacity: p, transform: `translateX(${(1 - p) * 80}px)` }}>
            <span style={{ font: `700 50px ${TEKST}`, color: C.tinta }}>{ime}</span>
            <span style={{ font: `400 64px ${DISPLAY}`, color: C.crvena, transform: `scale(${x})` }}>×</span>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 140, top: 840, font: `700 54px/1.3 ${TEKST}`, color: C.tinta, opacity: red, transform: `translateY(${(1 - red) * 24}px)` }}>
        Sam po sebi ne dohvaća vaš WhatsApp, mail ni kalendar.
      </div>
      {IZVAN.map((ime, i) => (
        <Sfx key={ime} ime="click-soft" u={2.05 + i * 0.93} glasnoca={0.5} />
      ))}
    </Pozadina>
  );
};
