import { interpolate } from "remotion";
import { C, DISPLAY, Pozadina, Sfx, TEKST, expo, inOut, pop, ulaz, useSec } from "../lib";
import { ClaudeKutija } from "./Sam";

// S3: svaki MCP je jedna utičnica; nabrojani su oni koje je govornik pokazao (24:13–26:49).
const ALATI = ["WhatsApp", "Gmail", "Google kalendar", "Google Drive", "Jira", "LinkedIn", "Domovina AI", "Figma"];
const CX = 960;
const CY = 590;
const RX = 690;
const RY = 330;
const KORAK = 0.93; // dva udarca na 129 BPM

const polozaj = (i: number) => {
  const kut = (-90 + i * 45) * (Math.PI / 180);
  return { x: CX + RX * Math.cos(kut), y: CY + RY * Math.sin(kut) };
};

export const Uticnice = () => {
  const t = useSec();
  const naslov = ulaz(t, 0.2, 0.5, expo);
  // Kad su svi spojeni, prsten se odmakne gore da ispod stane citat.
  const kamera = interpolate(t, [10.2, 11.6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: inOut });
  const citat = ulaz(t, 11.4, 0.5);
  return (
    <Pozadina boja={C.zuta}>
      <div style={{ position: "absolute", left: 140, top: 70, font: `400 64px ${DISPLAY}`, letterSpacing: "-0.02em", color: C.tinta, opacity: naslov * (1 - kamera) }}>
        Svaki MCP je jedan novi alat
      </div>
      <div style={{ position: "absolute", inset: 0, transform: `translateY(${-110 * kamera}px) scale(${1 - 0.2 * kamera})`, transformOrigin: "50% 30%" }}>
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          {ALATI.map((_, i) => {
            const { x, y } = polozaj(i);
            const d = ulaz(t, 0.8 + i * KORAK, 0.45);
            return <line key={i} x1={CX} y1={CY} x2={CX + (x - CX) * d} y2={CY + (y - CY) * d} stroke={C.tinta} strokeWidth={8} strokeLinecap="round" />;
          })}
        </svg>
        <div style={{ position: "absolute", left: CX - 300, top: CY - 120 }}>
          <ClaudeKutija sirina={600} visina={240} natpis="" />
        </div>
        {ALATI.map((ime, i) => {
          const { x, y } = polozaj(i);
          const p = pop(t, 1.2 + i * KORAK);
          return (
            <div key={ime} style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) scale(${p})`, background: C.bijela, border: `6px solid ${C.tinta}`, borderRadius: 999, padding: "16px 40px", font: `800 46px ${TEKST}`, color: C.tinta, whiteSpace: "nowrap" }}>
              {ime}
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 140, right: 140, top: 870, font: `400 60px/1.15 ${DISPLAY}`, letterSpacing: "-0.02em", color: C.tinta, opacity: citat, transform: `translateY(${(1 - citat) * 30}px)` }}>
        „Možete instalirati što god vam padne na pamet.”
      </div>
      {ALATI.map((ime, i) => (
        <Sfx key={ime} ime="pop" u={1.2 + i * KORAK} glasnoca={0.35} />
      ))}
      <Sfx ime="riser" u={10.5} glasnoca={0.5} trajanje={4.4} />
    </Pozadina>
  );
};
