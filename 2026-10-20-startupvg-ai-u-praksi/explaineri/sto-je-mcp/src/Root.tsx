import { Composition } from "remotion";
import { Mcp, TRAJANJE } from "./Mcp";

export const Root = () => (
  <Composition id="Mcp" component={Mcp} durationInFrames={TRAJANJE} fps={30} width={1920} height={1080} />
);
