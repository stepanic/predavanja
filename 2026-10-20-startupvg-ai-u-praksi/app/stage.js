// Stage: prikazuje kartice projekata kao živi iframe, oštru sliku ili tekst,
// s kamerom (scroll i zoom) i pretapanjem između projekata.
//
// Upravljanje: tipkovnica, window.stage u konzoli, ili BroadcastChannel("stage")
// iz drugog taba ({cmd: "show", id} itd.), što će kasnije koristiti redatelj.

const BASE_W = 1440;
const BASE_H = 810;
const MAX_CONTENT_H = 6000;
const LOAD_TIMEOUT = 15000; // nakon ovoga se stranica smatra neučitanom
const SHOW_WAIT = 1500; // najdulje čekanje prije prikaza neučitane stranice
const POOL_MAX = 5; // koliko projekata drži učitano (trenutni + susjedi)
const AUTOSCROLL_PX_PER_S = 70;
const SLIDE_MS = 20000; // auto-slide: sljedeći projekt nakon ovoliko ms

const params = new URLSearchParams(location.search);

// Događaji i greške idu na poslužitelj (logs/stage.ndjson) radi dijagnostike uživo.
// Na javnom deployu nema poslužitelja za logove, pa se šalje samo lokalno.
const LOCAL = ["localhost", "127.0.0.1"].includes(location.hostname);
function log(event, data = {}) {
  if (!LOCAL) return;
  fetch("/api/log", { method: "POST", body: JSON.stringify({ event, ...data }) }).catch(() => {});
}
addEventListener("error", (e) => log("error", { message: e.message, source: e.filename, line: e.lineno }));
addEventListener("unhandledrejection", (e) => log("error", { message: String(e.reason) }));
const includeReview = params.has("all");

const stageEl = document.getElementById("stage");
const lower = document.getElementById("lower");
const ticker = document.getElementById("ticker");

const catalog = await (await fetch("/data/catalog.json")).json();
const cards = catalog.filter((c) => c.visibility === "public" || (includeReview && c.visibility === "review"));
const byId = new Map(cards.map((c) => [c.id, c]));

// ---------- geometrija ----------
let W = 0;
function layout() {
  W = Math.min(innerWidth, (innerHeight * 16) / 9);
  const H = (W * 9) / 16;
  Object.assign(stageEl.style, { width: `${W}px`, height: `${H}px` });
  stageEl.style.setProperty("--u", `${W / 100}px`);
  document.body.style.setProperty("--u", `${W / 100}px`);
  // Traka s gumbima: gore desno u slajdu, a kad ispod slajda ima mjesta (mobitel u portretu), ispod njega.
  const bar = document.getElementById("bar");
  const top = (innerHeight - H) / 2;
  const side = (innerWidth - W) / 2;
  if (top > 80) Object.assign(bar.style, { top: `${top + H + 12}px`, right: "16px", left: "16px" });
  else Object.assign(bar.style, { top: `${top + H * 0.02}px`, right: `${side + W * 0.012}px`, left: "auto" });
  applyCamera(false);
}
addEventListener("resize", layout);

// ---------- kamera ----------
// x, y su gornji lijevi kut vidljivog dijela u CSS pikselima sadržaja (širina 1440).
const cam = { el: null, h: BASE_H, z: 1, x: 0, y: 0, auto: false };

function clampCam() {
  const vw = BASE_W / cam.z;
  const vh = BASE_H / cam.z;
  cam.z = Math.min(Math.max(cam.z, 1), 4);
  cam.x = Math.min(Math.max(cam.x, 0), Math.max(0, BASE_W - vw));
  cam.y = Math.min(Math.max(cam.y, 0), Math.max(0, cam.h - vh));
}

function applyCamera(animate = true, ms = 900) {
  if (!cam.el) return;
  clampCam();
  const s = (W / BASE_W) * cam.z;
  cam.el.classList.toggle("animate", animate);
  cam.el.style.setProperty("--dur", `${ms}ms`);
  cam.el.style.transform = `translate(${-cam.x * s}px, ${-cam.y * s}px) scale(${s})`;
}

function scrollBy(dy, ms = 700) {
  cam.y += dy;
  applyCamera(true, ms);
}

function scrollTo(y, ms = 1200) {
  cam.y = y;
  applyCamera(true, ms);
}

// Zoom oko točke (fx, fy) u koordinatama vidljivog okvira, 0..1.
function zoomTo(z, fx = 0.5, fy = 0.5, ms = 900) {
  const px = cam.x + (BASE_W / cam.z) * fx;
  const py = cam.y + (BASE_H / cam.z) * fy;
  cam.z = Math.min(Math.max(z, 1), 4);
  cam.x = px - (BASE_W / cam.z) * fx;
  cam.y = py - (BASE_H / cam.z) * fy;
  applyCamera(true, ms);
}

// ---------- auto-slide ----------
// Brojač X/TOTAL ujedno je gumb za pauzu, a crta ispod njega pokazuje koliko je ostalo.
const countEl = document.getElementById("count");
const linksEl = document.getElementById("links");
const slide = { on: params.get("auto") !== "0", left: SLIDE_MS };

function slidePaused() {
  return document.body.classList.contains("interactive") || search.classList.contains("on") || document.hidden || !!linksEl.querySelector("details[open]");
}

function setAutoSlide(on) {
  slide.on = on;
  slide.left = SLIDE_MS;
  countEl.classList.toggle("off", !on);
  countEl.title = on ? "Auto-slide uključen, klik za pauzu (a)" : "Auto-slide pauziran, klik za nastavak (a)";
}
countEl.addEventListener("click", () => { setAutoSlide(!slide.on); stageEl.focus({ preventScroll: true }); });

function renderBar(card) {
  const i = cards.findIndex((c) => c.id === card.id);
  countEl.querySelector("span").textContent = `${i + 1}/${cards.length}`;
  const live = card.embed?.url || card.urls?.live?.[0];
  const repos = (card.urls?.repos || []).filter((r) => r.visibility === "public"); // privatni bi posjetitelju dali 404
  // Svaka poveznica ima uz sebe gumb koji kopira njezin URL.
  const pair = (url, label, title = url) =>
    `<span class="pair"><a href="${escapeHtml(url)}" target="_blank" rel="noopener" title="${escapeHtml(title)}">${escapeHtml(label)} ↗</a>` +
    `<button class="copy" data-copy="${escapeHtml(url)}" title="Kopiraj ${escapeHtml(url)}" aria-label="Kopiraj URL">⧉</button></span>`;
  const repoPair = (r, label) => pair(r.url, label, r.url.replace("https://github.com/", ""));
  const repoName = (r) => r.url.split("/").pop();
  const links = [];
  if (live) links.push(pair(live, "Otvori"));
  // Više od dva repoa ide u padajući popis, inače traka na mobitelu prekrije slajd.
  if (repos.length > 2) links.push(`<details><summary>GitHub (${repos.length}) ▾</summary><div>${repos.map((r) => repoPair(r, repoName(r))).join("")}</div></details>`);
  else for (const r of repos) links.push(repoPair(r, repos.length > 1 ? `GitHub: ${repoName(r)}` : "GitHub"));
  linksEl.innerHTML = links.join("");
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Stariji preglednici i http bez dozvole za clipboard.
    const ta = Object.assign(document.createElement("textarea"), { value: text });
    document.body.append(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}

linksEl.addEventListener("click", async (e) => {
  const btn = e.target.closest("button.copy");
  if (!btn) return;
  await copyText(btn.dataset.copy);
  btn.textContent = "✓";
  btn.classList.add("done");
  setTimeout(() => { btn.textContent = "⧉"; btn.classList.remove("done"); }, 1500);
  stageEl.focus({ preventScroll: true });
});

let lastT = 0;
function tick(t) {
  const dtMs = Math.min(t - lastT, 100);
  if (slide.on && current && !slidePaused()) {
    slide.left -= dtMs;
    if (slide.left <= 0) { slide.left = SLIDE_MS; step(1); }
  }
  countEl.querySelector("i").style.width = slide.on ? `${100 * (1 - slide.left / SLIDE_MS)}%` : "0";
  if (cam.auto && cam.el) {
    const dt = Math.min(t - lastT, 100) / 1000;
    const before = cam.y;
    cam.y += AUTOSCROLL_PX_PER_S * dt;
    applyCamera(false);
    if (cam.y === before) cam.auto = false; // došli smo do dna
  }
  lastT = t;
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

// ---------- prikaz kartice ----------
function contentFor(card) {
  const shot = card.media?.find((m) => m.type === "screenshot");
  const full = card.media?.find((m) => m.type === "fullpage");
  const embed = card.embed;
  // vh_dependent: stranica u visokom iframeu razvuče hero na cijelu visinu, pa ide kao slika.
  if (embed?.frameable && !embed.vh_dependent && !params.has("noframe")) {
    const h = embed.mode === "app" ? BASE_H : Math.min(Math.max(embed.page_height || BASE_H, BASE_H), MAX_CONTENT_H);
    const el = document.createElement("iframe");
    el.className = "content";
    el.src = embed.url;
    el.style.height = `${h}px`;
    el.setAttribute("loading", "eager");
    el.setAttribute("referrerpolicy", "no-referrer");
    el.setAttribute("sandbox", "allow-scripts allow-same-origin allow-popups allow-forms");
    return { el, h, kind: "iframe" };
  }
  const img = full || shot;
  if (img) {
    const el = document.createElement("img");
    el.className = "content";
    el.src = `/data/${img.src}`;
    const h = img.height / 2;
    el.style.height = `${h}px`;
    return { el, h, kind: "image" };
  }
  const el = document.createElement("div");
  el.className = "textcard";
  const facts = (card.facts || []).slice(0, 4).map((f) => `<li>${escapeHtml(f)}</li>`).join("");
  el.innerHTML = `<h1>${escapeHtml(card.title)}</h1><p>${escapeHtml(card.one_liner || "")}</p><ul>${facts}</ul>`;
  return { el, h: BASE_H, kind: "text" };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]);
}

function whenLoaded({ el, kind }) {
  if (kind === "text") return Promise.resolve("text");
  return new Promise((resolve) => {
    el.addEventListener("load", () => resolve("load"), { once: true });
    el.addEventListener("error", () => resolve("error"), { once: true });
    setTimeout(() => resolve("timeout"), LOAD_TIMEOUT);
  });
}

let current = null;
let showSeq = 0;
let lowerTimer = 0;

// Svaki pripremljeni projekt ima svoj sloj; iframe se nikad ne premješta po DOM-u
// jer bi se time ponovno učitao. Susjedi se učitavaju unaprijed, pa je strelica trenutna.
const pool = new Map();

function prepare(card) {
  let entry = pool.get(card.id);
  if (entry) return entry;
  const layer = document.createElement("div");
  layer.className = "layer";
  stageEl.insertBefore(layer, lower);
  const content = contentFor(card);
  layer.append(content.el);
  if (content.kind !== "text") content.el.style.transform = `scale(${W / BASE_W})`;
  entry = { layer, content, state: "loading", used: performance.now() };
  entry.ready = whenLoaded(content).then((r) => (entry.state = r));
  pool.set(card.id, entry);
  evict();
  return entry;
}

function evict() {
  while (pool.size > POOL_MAX) {
    const [id, entry] = [...pool].filter(([id]) => id !== current?.id).sort((a, b) => a[1].used - b[1].used)[0];
    entry.layer.remove();
    pool.delete(id);
  }
}

function neighbours(card) {
  const i = cards.findIndex((c) => c.id === card.id);
  return [cards[(i + 1) % cards.length], cards[(i - 1 + cards.length) % cards.length]];
}

async function show(id, { autoscroll = true } = {}) {
  const card = byId.get(id);
  if (!card || card.id === current?.id) return;
  const seq = ++showSeq;
  const t0 = performance.now();
  const entry = prepare(card);
  entry.used = performance.now();
  const loaded = entry.state !== "loading"
    ? entry.state
    : await Promise.race([entry.ready, new Promise((r) => setTimeout(() => r("pending"), SHOW_WAIT))]);
  if (seq !== showSeq) return; // u međuvremenu je zatražen drugi projekt

  for (const e of pool.values()) e.layer.classList.toggle("on", e === entry);
  const { content } = entry;
  current = card;
  Object.assign(cam, { el: content.kind === "text" ? null : content.el, h: content.h, z: 1, x: 0, y: 0, auto: false });
  applyCamera(false);
  location.hash = card.id;
  document.title = `${card.title} · Projekti · Matija Stepanić`;
  slide.left = SLIDE_MS;
  renderBar(card);
  log("show", { id: card.id, kind: content.kind, ms: Math.round(performance.now() - t0), loaded });
  if (content.kind === "text") lower.classList.add("hidden");
  else showLower(card);
  if (autoscroll && content.h > BASE_H + 200) {
    setTimeout(() => { if (current === card) cam.auto = true; }, 3500);
  }
  setTimeout(() => { if (current === card) neighbours(card).forEach(prepare); }, 400);
}

function showLower(card, ms = 7000) {
  lower.querySelector(".t").textContent = card.title;
  lower.querySelector(".d").textContent = card.one_liner || "";
  const url = card.embed?.url || card.urls?.live?.[0] || "";
  lower.querySelector(".u").textContent = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  lower.classList.remove("hidden");
  clearTimeout(lowerTimer);
  if (ms) lowerTimer = setTimeout(() => lower.classList.add("hidden"), ms);
}

function say(html, ms = 6000) {
  ticker.innerHTML = html;
  ticker.classList.add("on");
  clearTimeout(say.t);
  if (ms) say.t = setTimeout(() => ticker.classList.remove("on"), ms);
}

function step(dir) {
  const i = cards.findIndex((c) => c.id === current?.id);
  const next = cards[(i + dir + cards.length) % cards.length];
  show(next.id);
}

// Na mobitelu nema strelica na tipkovnici: gumbi ‹ › u traci i swipe lijevo/desno.
for (const [id, dir] of [["prev", -1], ["next", 1]]) {
  document.getElementById(id).addEventListener("click", () => { step(dir); stageEl.focus({ preventScroll: true }); });
}
let touch = null;
addEventListener("touchstart", (e) => {
  touch = e.touches.length === 1 && !e.target.closest?.("#bar, #search") ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
}, { passive: true });
addEventListener("touchend", (e) => {
  if (!touch) return;
  const dx = e.changedTouches[0].clientX - touch.x;
  const dy = e.changedTouches[0].clientY - touch.y;
  touch = null;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
}, { passive: true });

// ---------- pretraga ----------
const search = document.getElementById("search");
const input = search.querySelector("input");
const list = search.querySelector("ol");
let hits = [];
let sel = 0;

function norm(s) {
  return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
}

function renderHits() {
  const q = norm(input.value.trim());
  hits = cards
    .map((c) => {
      const hay = [c.title, c.id, ...(c.aliases || [])].map(norm);
      const score = !q ? 0 : hay.some((h) => h === q) ? 3 : hay.some((h) => h.startsWith(q)) ? 2 : hay.some((h) => h.includes(q)) ? 1 : -1;
      return { c, score };
    })
    .filter((h) => h.score >= 0)
    .sort((a, b) => b.score - a.score || (b.c.showcase_score || 0) - (a.c.showcase_score || 0))
    .slice(0, 12)
    .map((h) => h.c);
  sel = 0;
  list.innerHTML = hits
    .map((c, i) => `<li data-i="${i}" class="${i === sel ? "sel" : ""}">${escapeHtml(c.title)}<small>${c.embed?.frameable ? "live" : c.media?.length ? "slika" : "tekst"}</small></li>`)
    .join("");
}

function openSearch() {
  search.classList.add("on");
  input.value = "";
  renderHits();
  input.focus();
}

function closeSearch() {
  search.classList.remove("on");
  input.blur();
}

input.addEventListener("input", renderHits);
input.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeSearch();
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    sel = Math.min(Math.max(sel + (e.key === "ArrowDown" ? 1 : -1), 0), hits.length - 1);
    [...list.children].forEach((li, i) => li.classList.toggle("sel", i === sel));
    e.preventDefault();
  }
  if (e.key === "Enter" && hits[sel]) {
    show(hits[sel].id);
    closeSearch();
  }
  e.stopPropagation();
});
list.addEventListener("click", (e) => {
  const li = e.target.closest("li");
  if (li) { show(hits[Number(li.dataset.i)].id); closeSearch(); }
});

// ---------- tipkovnica ----------
// Neke ugrađene stranice (npr. Flutter) same uzmu fokus, pa tipke odlaze u iframe.
// Dok interakcija nije uključena (e), fokus se vraća projektoru.
stageEl.tabIndex = -1;
function reclaimFocus() {
  if (!document.body.classList.contains("interactive") && !search.classList.contains("on")) stageEl.focus({ preventScroll: true });
}
addEventListener("blur", () => setTimeout(reclaimFocus, 0));
setInterval(() => { if (document.activeElement?.tagName === "IFRAME") reclaimFocus(); }, 500);
addEventListener("keydown", (e) => {
  if (search.classList.contains("on")) return;
  const k = e.key;
  if (k === "ArrowRight") step(1);
  else if (k === "ArrowLeft") step(-1);
  else if (k === "ArrowDown") { cam.auto = false; scrollBy(BASE_H * 0.6 / cam.z); }
  else if (k === "ArrowUp") { cam.auto = false; scrollBy(-BASE_H * 0.6 / cam.z); }
  else if (k === "+" || k === "=") zoomTo(cam.z * 1.4);
  else if (k === "-") zoomTo(cam.z / 1.4);
  else if (k === "0") { cam.auto = false; cam.z = 1; cam.x = 0; scrollTo(0); }
  else if (k === " ") { cam.auto = !cam.auto; e.preventDefault(); }
  else if (k === "/") { openSearch(); e.preventDefault(); }
  else if (k === "i") current && (lower.classList.contains("hidden") ? showLower(current, 0) : lower.classList.add("hidden"));
  else if (k === "a") setAutoSlide(!slide.on);
  else if (k === "e") document.body.classList.toggle("interactive");
  else if (k === "f") document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
  else if (k === "h") document.getElementById("help").hidden ^= true;
  else if (k === "Escape") location.href = `./${location.search}#${current?.id || ""}`;
});

// ---------- vanjsko upravljanje ----------
const api = {
  show, say, scrollTo, scrollBy, zoomTo,
  autoscroll: (on = true) => { cam.auto = on; },
  autoslide: (on = true) => setAutoSlide(on),
  next: () => step(1), prev: () => step(-1),
  get current() { return current?.id; },
  cards: () => cards.map((c) => c.id),
};
window.stage = api;

const channel = new BroadcastChannel("stage");
channel.addEventListener("message", ({ data }) => {
  const { cmd, ...args } = data || {};
  if (cmd === "show") show(args.id, args);
  else if (cmd === "say") say(args.html, args.ms);
  else if (cmd === "scrollTo") scrollTo(args.y, args.ms);
  else if (cmd === "zoom") zoomTo(args.z, args.fx, args.fy, args.ms);
  else if (cmd === "autoscroll") api.autoscroll(args.on);
  else if (cmd === "autoslide") api.autoslide(args.on);
});

layout();
setAutoSlide(slide.on);
const start = decodeURIComponent(location.hash.slice(1));
show(byId.has(start) ? start : cards[0].id);
