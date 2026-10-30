import { Html5Audio, interpolate, Sequence, staticFile } from "remotion";
import { FPS } from "./lib";
import { Funkcija } from "./scenes/Funkcija";
import { Gmail } from "./scenes/Gmail";
import { Hook } from "./scenes/Hook";
import { Kraj } from "./scenes/Kraj";
import { Oprez } from "./scenes/Oprez";
import { Sam } from "./scenes/Sam";
import { Uticnice } from "./scenes/Uticnice";
import { WhatsApp } from "./scenes/WhatsApp";

// Rezovi u sekundama, na udarcima glazbe (129 BPM, drop na 28,9 s, pad energije na 74,5 s).
const SCENE = [
  { od: 0, Komp: Hook },
  { od: 5.87, Komp: Sam },
  { od: 14.1, Komp: Uticnice },
  { od: 28.9, Komp: WhatsApp },
  { od: 44.0, Komp: Gmail },
  { od: 56.0, Komp: Funkcija },
  { od: 65.5, Komp: Oprez },
  { od: 72.0, Komp: Kraj },
];
const KRAJ = 78;
export const TRAJANJE = KRAJ * FPS;

export const Mcp = () => (
  <>
    {SCENE.map(({ od, Komp }, i) => {
      const from = Math.round(od * FPS);
      const doKraja = Math.round((SCENE[i + 1]?.od ?? KRAJ) * FPS);
      return (
        <Sequence key={i} from={from} durationInFrames={doKraja - from}>
          <Komp />
        </Sequence>
      );
    })}
    <Html5Audio
      src={staticFile("bgm/glazba.mp3")}
      volume={(f) => 0.8 * interpolate(f, [0, 8, 75 * FPS, TRAJANJE], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
    />
  </>
);
