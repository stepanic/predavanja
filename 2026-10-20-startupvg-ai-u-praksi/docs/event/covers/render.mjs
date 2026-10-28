// Renderira sve covers/*.html u PNG 3200×3200 (2×; *16x9* → 3840×2160, *9x16* → 2160×3840, *4x5* → 2160×2700) i PDF iste veličine za HD slanje.
import { chromium } from "playwright";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const only = process.argv.slice(2);
const files = (await readdir(DIR)).filter((f) => f.endsWith(".html") && (!only.length || only.some((o) => f.startsWith(o))));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1600 }, deviceScaleFactor: 2 });
for (const f of files) {
  const [w, h] = f.includes("16x9") ? [1920, 1080] : f.includes("9x16") ? [1080, 1920] : f.includes("4x5") ? [1080, 1350] : [1600, 1600];
  await page.setViewportSize({ width: w, height: h });
  await page.goto("file://" + path.join(DIR, f), { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const out = path.join(DIR, f.replace(".html", ".png"));
  await page.screenshot({ path: out });
  console.log(out);
}
await browser.close();
