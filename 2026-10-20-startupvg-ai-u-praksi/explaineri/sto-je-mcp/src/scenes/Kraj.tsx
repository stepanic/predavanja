import { Img, staticFile } from "remotion";
import { C, DISPLAY, Pozadina, Sfx, TEKST, expo, power3, ulaz, useSec } from "../lib";

// S8: sažetak u jednoj rečenici, pa odjava ista kao u prvom filmu.
const RIJECI = ["MCP:", "jedan", "dodatak,", "jedan", "novi", "alat."];

export const Kraj = () => {
  const t = useSec();
  const tinta = ulaz(t, 2.6, 0.45, power3);
  return (
    <Pozadina boja={C.zuta}>
      <div style={{ position: "absolute", left: 140, top: 380, font: `400 130px/1.05 ${DISPLAY}`, letterSpacing: "-0.03em", color: C.tinta, opacity: t < 3.05 ? 1 : 0 }}>
        {RIJECI.map((r, i) => {
          const p = ulaz(t, 0.1 + i * 0.232, 0.35, expo);
          return (
            <span key={i} style={{ display: "inline-block", marginRight: "0.22em", opacity: p, transform: `translateY(${(1 - p) * 50}px)` }}>
              {r}
              {i === 2 && <br />}
            </span>
          );
        })}
      </div>
      <div style={{ position: "absolute", inset: 0, background: C.tinta, transformOrigin: "0 50%", transform: `scaleX(${tinta})` }} />
      <div style={{ position: "absolute", left: 140, top: 250, color: C.zuta }}>
        <div style={{ font: `400 104px/1.05 ${DISPLAY}`, letterSpacing: "-0.02em", opacity: ulaz(t, 3.08, 0.5, expo), transform: `translateX(${(1 - ulaz(t, 3.08, 0.5, expo)) * -60}px)` }}>
          AI u praksi:
          <br />
          Claude Code uživo
        </div>
        <div style={{ marginTop: 36, font: `700 46px/1.35 ${TEKST}`, color: C.bijela, opacity: ulaz(t, 3.56, 0.35) }}>Matija Stepanić · StartupVG Masterclass · 20. 10. 2026.</div>
        <div style={{ marginTop: 26, font: `700 46px ${TEKST}`, opacity: ulaz(t, 3.8, 0.35) }}>Cijelo predavanje: domovina.ai/v/QkcpHsj43rE</div>
      </div>
      <Img src={staticFile("startupvg-white.png")} style={{ position: "absolute", left: 1330, top: 640, width: 450, opacity: ulaz(t, 4.04, 0.5, expo), transform: `scale(${1.25 - 0.25 * ulaz(t, 4.04, 0.5, expo)})` }} />
      <Sfx ime="whoosh" u={2.55} glasnoca={0.35} />
    </Pozadina>
  );
};
