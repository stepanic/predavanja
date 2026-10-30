import type { CSSProperties, ReactNode } from "react";
import { Easing, Html5Audio, interpolate, Sequence, spring, staticFile, useCurrentFrame } from "remotion";
import { loadFont } from "@remotion/fonts";

// Ugrađeni fontovi nemaju č/ć/š/ž/đ, pa idu puni TTF-ovi kao u prvom filmu.
loadFont({ family: "Archivo Black HR", url: staticFile("fonts/ArchivoBlack-Regular.ttf"), weight: "400" });
loadFont({ family: "Inter HR", url: staticFile("fonts/Inter.ttf"), weight: "100 900" });

export const FPS = 30;
export const C = { zuta: "#FFD21F", tinta: "#121212", crvena: "#E5322D", bijela: "#FFFFFF" };
export const DISPLAY = '"Archivo Black HR"';
export const TEKST = '"Inter HR"';

export const expo = Easing.out(Easing.exp);
export const power3 = Easing.out(Easing.cubic);
export const inOut = Easing.inOut(Easing.quad);

// Vrijeme scene u sekundama, da se tajming piše kao u SPEC.md.
export const useSec = () => useCurrentFrame() / FPS;

export const ulaz = (t: number, start: number, trajanje = 0.4, easing = power3) =>
  interpolate(t, [start, start + trajanje], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });

export const pop = (t: number, start: number) =>
  t < start ? 0 : spring({ frame: (t - start) * FPS, fps: FPS, config: { damping: 11, stiffness: 190 } });

export const Sfx = ({ ime, u, glasnoca = 0.5, trajanje = 2 }: { ime: string; u: number; glasnoca?: number; trajanje?: number }) => (
  <Sequence from={Math.round(u * FPS)} durationInFrames={Math.round(trajanje * FPS)} layout="none">
    <Html5Audio src={staticFile(`sfx/${ime}.mp3`)} volume={glasnoca} />
  </Sequence>
);

export const Pozadina = ({ boja, children }: { boja: string; children: ReactNode }) => (
  <div style={{ position: "absolute", inset: 0, background: boja, overflow: "hidden" }}>{children}</div>
);

export const Naslov = ({ t, u, children, boja = C.tinta }: { t: number; u: number; children: ReactNode; boja?: string }) => {
  const p = ulaz(t, u, 0.5, expo);
  return (
    <div style={{ position: "absolute", left: 140, top: 90, font: `400 64px ${DISPLAY}`, letterSpacing: "-0.02em", color: boja, opacity: p, transform: `translateX(${(1 - p) * -40}px)` }}>
      {children}
    </div>
  );
};

// Crna traka s upitom i kursorom, ista kao u prvom filmu.
export const Upit = ({ t, od, do: kraj, tekst, style }: { t: number; od: number; do: number; tekst: string; style?: CSSProperties }) => {
  const n = Math.floor(interpolate(t, [od, kraj], [0, tekst.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const vidljiv = ulaz(t, od - 0.35, 0.3);
  const kursor = Math.floor(t * 2.15) % 2 === 0 || (t > od && t < kraj);
  return (
    <div style={{ position: "absolute", background: C.tinta, color: C.bijela, borderRadius: 20, padding: "34px 44px", font: `600 46px/1.35 ${TEKST}`, opacity: vidljiv, ...style }}>
      {tekst.slice(0, n)}
      <span style={{ display: "inline-block", width: 22, height: 50, marginLeft: 4, verticalAlign: "-8px", background: C.zuta, opacity: kursor ? 1 : 0 }} />
    </div>
  );
};
