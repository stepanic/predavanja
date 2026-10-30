import { C, DISPLAY, Pozadina, Sfx, TEKST, Upit, expo, ulaz, useSec } from "../lib";

// S6: ništa od toga nije novo; novo je da Claudeu to možete reći riječima (13:22, 26:15).
const STARO = ["WhatsApp bridge", "vektorska baza", "Gmail"];

export const Funkcija = () => {
  const t = useSec();
  const l1 = ulaz(t, 0.3, 0.5, expo);
  const l2 = ulaz(t, 3.9, 0.5, expo);
  return (
    <Pozadina boja={C.zuta}>
      <div style={{ position: "absolute", left: 140, top: 120, font: `400 104px/1.05 ${DISPLAY}`, letterSpacing: "-0.03em", color: C.tinta, opacity: l1, transform: `translateY(${(1 - l1) * 40}px)` }}>
        Sve je to postojalo
        <br />i prije AI-a.
      </div>
      <div style={{ position: "absolute", left: 140, top: 390, display: "flex", gap: 24 }}>
        {STARO.map((s, i) => {
          const p = ulaz(t, 1.3 + i * 0.465, 0.4, expo);
          return (
            <div key={s} style={{ border: `6px solid ${C.tinta}`, borderRadius: 999, padding: "12px 34px", font: `700 42px ${TEKST}`, color: C.tinta, opacity: p, transform: `translateY(${(1 - p) * 20}px)` }}>
              {s}
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 140, top: 590, font: `700 56px ${TEKST}`, color: C.tinta, opacity: l2 }}>
        Novo je samo to što Claudeu možete reći:
      </div>
      <Upit t={t} od={4.8} do={6.6} tekst="daj mi sad pozovi tu neku funkciju" style={{ left: 140, top: 700 }} />
      {STARO.map((s, i) => (
        <Sfx key={s} ime="click-soft" u={1.3 + i * 0.465} glasnoca={0.45} />
      ))}
      <Sfx ime="typing" u={4.8} glasnoca={0.35} trajanje={1.8} />
    </Pozadina>
  );
};
