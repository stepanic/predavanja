#!/usr/bin/env node
// Generira naslovnu sliku za public kartice koje nemaju ni živu stranicu ni sliku iz repoa
// (API, infrastruktura, skripte, arhivirani projekti). Na slici su naziv, opis, stack i
// brojke iz kartice. 1440×810 u 2× gustoći → data/media/<id>.jpg, kao capture.mjs.
// Kartica dobiva media s origin: "generated", pa se pravi screenshot kasnije samo upiše preko.
// Pokretanje: node tools/catalog/cover.mjs [id1 id2 …] (bez id-ova: sve bez slike + već generirane)

import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const catalog = JSON.parse(await readFile(path.join(ROOT, "data/catalog.json"), "utf8"));
const only = process.argv.slice(2);
const shot = (c) => c.media?.find((m) => m.type === "screenshot");
const targets = catalog.filter((c) => c.visibility === "public").filter((c) =>
  only.length ? only.includes(c.id) : !shot(c) || shot(c).origin === "generated");

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
// 1 commit, 2–4 commita, 5+ commitova (11–14 su uvijek "commitova")
const plural = (x, one, few, many) =>
  `<b>${Number(x).toLocaleString("hr-HR")}</b> ${x % 10 === 1 && x % 100 !== 11 ? one : [2, 3, 4].includes(x % 10) && ![12, 13, 14].includes(x % 100) ? few : many}`;
const month = (d) => (d ? `${d.slice(5, 7)}/${d.slice(0, 4)}` : "");

function html(c) {
  const s = c.stats || {};
  const span = s.first && s.last ? (month(s.first) === month(s.last) ? month(s.first) : `${month(s.first)} – ${month(s.last)}`) : "";
  const nums = [
    s.sessions ? plural(s.sessions, "sesija", "sesije", "sesija") : "",
    s.commits ? plural(s.commits, "commit", "commita", "commitova") : "",
    span,
  ].filter(Boolean).join('<i>·</i>');
  const repo = c.urls?.repos?.find((r) => r.visibility === "public")?.url.replace("https://", "");
  const stack = (c.stack || []).slice(0, 6).map((t) => `<span>${esc(t)}</span>`).join("");
  return `<!doctype html><html lang="hr"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;600;800&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0}
body{width:1440px;height:810px;overflow:hidden;font-family:Inter,system-ui,sans-serif;color:#fff;
  background:radial-gradient(110% 90% at 0% 0%,#1b2140 0%,#0b1020 60%);padding:84px 96px;display:flex;flex-direction:column}
.k{font-weight:600;font-size:26px;letter-spacing:.08em;text-transform:uppercase;color:#ffd23f}
h1{font-weight:800;font-size:${c.title.length > 34 ? 72 : 88}px;line-height:1.04;letter-spacing:-.03em;margin-top:22px;max-width:1200px}
p{font-weight:500;font-size:34px;line-height:1.35;color:#c9d0e6;margin-top:26px;max-width:1180px}
.stack{display:flex;flex-wrap:wrap;gap:12px;margin-top:34px}
.stack span{font-size:22px;font-weight:600;color:#dfe4f4;border:2px solid #2c3556;border-radius:999px;padding:7px 18px}
.foot{margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end;gap:40px;
  border-top:2px solid rgba(255,255,255,.14);padding-top:28px;font-size:26px;color:#aab3cf}
.foot b{color:#fff;font-weight:800}.foot i{font-style:normal;margin:0 14px;color:#4a5375}
.repo{font-family:"JetBrains Mono",monospace;font-size:22px;color:#8f99bb}
</style></head><body>
<div class="k">${esc(c.context || c.category || "")}</div>
<h1>${esc(c.title)}</h1>
<p>${esc(c.one_liner)}</p>
<div class="stack">${stack}</div>
<div class="foot"><div>${nums}</div><div class="repo">${esc(repo || "")}</div></div>
</body></html>`;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 810 }, deviceScaleFactor: 2 });
for (const c of targets) {
  // stack nije u catalog.json, pa se cijela kartica čita iz data/cards
  const file = path.join(ROOT, "data/cards", `${c.id}.json`);
  const text = await readFile(file, "utf8");
  const indent = text.split("\n")[1].match(/^\s*/)[0].length;
  const card = JSON.parse(text);
  await page.setContent(html({ ...card, ...c }), { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(ROOT, "data/media", `${c.id}.jpg`), type: "jpeg", quality: 88 });

  card.media = [...(card.media || []).filter((m) => m.type !== "screenshot"),
    { type: "screenshot", src: `media/${c.id}.jpg`, width: 2880, height: 1620, origin: "generated" }];
  await writeFile(file, JSON.stringify(card, null, indent) + "\n");
  console.log(c.id);
}
await browser.close();
