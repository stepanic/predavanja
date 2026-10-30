# Što je MCP

Drugi explainer iz predavanja „AI u praksi”, napravljen u [Remotionu](https://www.remotion.dev) radi usporedbe s HyperFramesom iz prvog filma. Plan je u `SPEC.md`, a scene su u `src/scenes/`.

```bash
npm install
npm run dev                     # Remotion Studio
npx remotion render src/index.ts Mcp renders/sto-je-mcp.mp4
ffmpeg -i renders/sto-je-mcp.mp4 -af loudnorm=I=-14:TP=-1.5 -c:v copy -c:a aac -b:a 192k sto-je-mcp_-14lufs.mp4
```

Remotion je besplatan za pojedince i tvrtke do 3 zaposlena (Free License).

## HyperFrames ili Remotion

| | HyperFrames (prvi film) | Remotion (ovaj film) |
|---|---|---|
| Scene | HTML + GSAP timeline | React komponente, sve je funkcija broja framea |
| Render | CLI, kvota na HeyGen računu | lokalno, Chromium + ffmpeg, 78 s filma za ~26 s |
| Gotovi dijelovi | registry s ~450 blokova, Studio, `check` s upozorenjima | nema; tajming i animacije pišu se ručno (`interpolate`, `spring`) |
| Fontovi | `@font-face` u svakoj sceni | `loadFont` iz `@remotion/fonts` jednom |
| Provjera | `hyperframes check`, snapshot | `tsc`, `remotion still` za kontrolne kadrove |
