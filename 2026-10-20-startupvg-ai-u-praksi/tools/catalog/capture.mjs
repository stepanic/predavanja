#!/usr/bin/env node
// Snima oštre screenshotove live stranica public kartica i bilježi smiju li u iframe.
//
// Za svaku karticu s urls.live: viewport 1440×810 u 2× gustoći (<id>.jpg) i cijelu
// stranicu do 6000 px visine (<id>.full.jpg). Preglednik je čist, bez prijave, pa
// nema osobnih podataka iz sesije. U karticu upisuje `embed` (frameable, visina
// stranice) i `media`. Pokretanje: npm run capture [-- id1 id2 …]

import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CARDS = path.join(ROOT, "data/cards");
const MEDIA = path.join(ROOT, "data/media");

// Stranice koje ne idu na projektor: samo JSON/API, login ili podaci o plaćanju.
const SKIP = new Set([
  "https://pay.domovina.ai", "https://pipeline.domovina.ai", "https://firme.domovina.ai",
  "https://cutter.domovina.ai", "https://fiskal-app.domovina.ai", "https://cal.domovina.ai",
]);
// Aplikacije koje zauzimaju cijeli ekran (karte): u iframeu ostaju visine viewporta.
const APP_MODE = new Set(["domovinatv-karta-hrvatske", "domovinatv-oou-domovina-ai",
  "domovinatv-rodjendaonice-domovina-ai", "novcanik-prototipovi", "ss-ss-novcanik-prototip"]);
const MAX_FULL = 6000;

const catalog = JSON.parse(await readFile(path.join(ROOT, "data/catalog.json"), "utf8"));
const only = process.argv.slice(2);
const targets = catalog
  .filter((c) => c.visibility === "public" && c.urls?.live?.length)
  .filter((c) => !only.length || only.includes(c.id))
  .map((c) => ({ id: c.id, url: c.urls.live[0] }))
  .filter((t) => !SKIP.has(t.url.replace(/\/$/, "")));

function frameable(headers) {
  const xfo = headers["x-frame-options"];
  const csp = headers["content-security-policy"] || "";
  const fa = /frame-ancestors\s+([^;]+)/i.exec(csp)?.[1]?.trim();
  if (xfo) return false;
  if (fa && fa !== "*" && !fa.includes("*")) return false;
  return true;
}

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 810 }, deviceScaleFactor: 2, locale: "hr-HR",
  colorScheme: "light",
});
const results = [];
for (const { id, url } of targets) {
  const page = await context.newPage();
  try {
    const resp = await page.goto(url, { waitUntil: "load", timeout: 30000 });
    await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => {});
    await page.waitForTimeout(2500);
    const status = resp?.status() ?? 0;
    const canFrame = resp ? frameable(resp.headers()) : false;
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.screenshot({ path: path.join(MEDIA, `${id}.jpg`), type: "jpeg", quality: 85 });
    // Stranica s hero sekcijom od 100vh u visokom iframeu ili viewportu naraste zajedno s njim
    // (italk.hr: 8506 px hero). Takva ide kao slika snimljena pri visini 810, ne kao iframe.
    await page.setViewportSize({ width: 1440, height: Math.min(height, MAX_FULL) });
    await page.waitForTimeout(800);
    const vhDependent = (await page.evaluate(() => document.documentElement.scrollHeight)) > height * 1.15;
    await page.setViewportSize({ width: 1440, height: 810 });
    await page.waitForTimeout(800);
    const fullH = Math.min(height, MAX_FULL);
    if (fullH > 900) {
      // Sekcije koje se pojavljuju na scroll (IntersectionObserver) bez ovoga ostanu prazne.
      for (let y = 0; y < fullH; y += 400) {
        await page.evaluate((y) => scrollTo(0, y), y);
        await page.waitForTimeout(150);
      }
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(MEDIA, `${id}.full.jpg`), type: "jpeg", quality: 80,
        fullPage: true, clip: { x: 0, y: 0, width: 1440, height: fullH } });
    }
    const cardPath = path.join(CARDS, `${id}.json`);
    const card = JSON.parse(await readFile(cardPath, "utf8"));
    card.embed = {
      url, frameable: canFrame, mode: APP_MODE.has(id) ? "app" : "page",
      page_height: height, ...(vhDependent && { vh_dependent: true }), checked: new Date().toISOString().slice(0, 10),
    };
    card.media = [{ type: "screenshot", src: `media/${id}.jpg`, width: 2880, height: 1620, url }];
    if (fullH > 900) card.media.push({ type: "fullpage", src: `media/${id}.full.jpg`, width: 2880, height: fullH * 2, url });
    await writeFile(cardPath, JSON.stringify(card, null, 2) + "\n");
    results.push(`${canFrame ? "iframe" : "slika "} ${status} ${String(height).padStart(5)}px  ${id}`);
  } catch (e) {
    results.push(`GREŠKA        ${id}: ${e.message.split("\n")[0]}`);
  } finally {
    await page.close();
  }
}
await browser.close();
console.log(results.join("\n"));
