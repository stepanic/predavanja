# Explaineri

Kratki animirani filmovi koji sporije i slikom prepričavaju pojedine ideje s predavanja. Nisu isječci snimke. Rađeni su u [HyperFrames](https://hyperframes.heygen.com) (HTML + GSAP, render u video): Claude Code je iz prijepisa predavanja napisao priče (`STORYLINES.md`), specifikaciju (`SPEC.md`) i scene u `compositions/`.

## Zašto je AI danas tako jeftin

[`zasto-je-ai-jeftin/`](zasto-je-ai-jeftin/): 67,7 s, 1080p30, hrvatski, bez naracije, 7 scena.

```bash
cd zasto-je-ai-jeftin
npx hyperframes preview   # pregled u pregledniku
npx hyperframes render    # render u MP4
```

- Brojke na ekranu provjerene su u prijepisu predavanja; procjene su označene s ≈ ili „procjena”.
- Fontovi su puni TTF-ovi iz `google/fonts` (Archivo Black, Inter, SIL OFL) u `assets/fonts/`, jer ugrađeni skup nema č, ć, š, ž i đ.
- Zvučni efekti su s Pixabaya (`assets/sfx/CREDITS.md`).
- Glazba nije u repou (13 MB, HeyGen katalog). Bez nje film radi, samo je tiši; vlastiti zapis stavi u `assets/bgm/glazba.mp3`.
- Glasnoća je nakon rendera izjednačena na −14 LUFS: `ffmpeg -i in.mp4 -af loudnorm=I=-14:TP=-1.5 -c:v copy out.mp4`.
