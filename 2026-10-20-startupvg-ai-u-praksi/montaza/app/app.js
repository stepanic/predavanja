// Montaža: pregled poravnatih tragova, odabir početka i kraja za YouTube.
// Vremenska crta T (s) je ona iz manifest.json: t_izvor = (T − offset − nudge) / scale.

const $ = (s, el = document) => el.querySelector(s);
const FRAME = 0.04;            // 25p (LUMIX); za korak i nudge
const LANE_H = 44, RULER_H = 24;

const st = {
  m: null, T: 0, playing: false, rate: 1, listen: null,
  anchorT: 0, anchorPerf: 0,
  view: { a: 0, b: 1 },
  nudges: {}, peaks: {}, els: {}, audios: {}, volumes: {},
  tr: null, trNow: -1,
  prog: null, crops: {},
};
const MAIN_SPEAKER = "Matija Stepanić";

// ---------- pomoćno ----------
const pad = (n, w = 2) => String(n).padStart(w, "0");
function fmt(t, ms = true) {
  const s = Math.max(0, t), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, sec = Math.floor(s % 60);
  return `${t < 0 ? "−" : ""}${h}:${pad(m)}:${pad(sec)}` + (ms ? `.${pad(Math.floor((s % 1) * 1000), 3)}` : "");
}
function fmtSigned(t) { return (t < 0 ? "−" : "+") + fmt(Math.abs(t)); }
function wall(t) {
  const d = new Date(Date.parse(st.m.timelineZeroWallClock) + t * 1000);
  return d.toLocaleTimeString("hr-HR", { timeZone: "Europe/Zagreb", hour12: false }) + "." + pad(d.getMilliseconds(), 3).slice(0, 1);
}
function parseTime(s) {
  s = s.trim().replace(",", ".");
  if (!s) return null;
  const p = s.split(":").map(Number);
  if (p.some(isNaN)) return null;
  return p.reduce((acc, v) => acc * 60 + v, 0);
}
const off = (tr) => tr.offsetSeconds + (st.nudges[tr.id] || 0);
const local = (tr, T) => (T - off(tr)) / tr.scale;
const inside = (tr, T) => { const l = local(tr, T); return l >= 0 && l < tr.durationSeconds - 0.05; };
const end = (tr) => off(tr) + tr.scale * tr.durationSeconds;

// ---------- spremanje ----------
let saveTimer;
function save() {
  clearTimeout(saveTimer);
  $("#save-state").textContent = "…";
  saveTimer = setTimeout(async () => {
    try {
      const r = await fetch("/api/manifest", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rev: st.m.rev ?? 0, edit: st.m.edit, nudges: st.nudges }),
      });
      if (r.status === 409) { $("#save-state").innerHTML = '<b style="color:var(--out)">manifest je promijenjen u drugom tabu — osvježi stranicu, ova izmjena nije spremljena</b>'; return; }
      if (r.ok) st.m.rev = (await r.json()).rev;
      $("#save-state").textContent = r.ok ? "spremljeno u manifest.json" : "greška pri spremanju";
    } catch { $("#save-state").textContent = "server ne odgovara"; }
  }, 400);
}

// ---------- mediji ----------
function build() {
  const m = st.m;
  $("#title").textContent = m.title;
  document.title = "Montaža — " + m.title;
  const pbox = document.createElement("div");
  pbox.className = "monitor prog";
  pbox.innerHTML = `<canvas width="960" height="540"></canvas><div class="cap"><span>Program</span><span class="lt"></span></div>`;
  $("#monitors").append(pbox);
  st.prog = { cv: $("canvas", pbox), box: pbox };
  for (const L of m.layouts || []) {
    if (!st.crops[L.cam]) {
      st.crops[L.cam] = "…";
      fetch(`crop/${L.cam}.json`).then((r) => r.ok && r.json()).then((c) => { st.crops[L.cam] = c || null; drawProgram(); });
    }
  }
  for (const tr of m.tracks) {
    st.nudges[tr.id] = tr.nudgeSeconds || 0;
    if (tr.videoProxy) {
      const box = document.createElement("div");
      box.className = "monitor";
      box.innerHTML = `<video muted playsinline preload="auto"></video>
        <div class="cap"><span>${tr.label}</span><span class="lt"></span></div>
        <div class="gap">nema snimke u ovom trenutku</div>`;
      const v = $("video", box);
      v.addEventListener("error", () => {
        box.classList.add("outside");
        $(".gap", box).textContent = "proxy još nije spreman — osvježi stranicu kad bude";
        box.dataset.missing = "1";
      });
      v.src = "/media/" + tr.videoProxy;
      v.addEventListener("seeked", () => drawProgram());
      v.addEventListener("click", () => tr.audioProxy && listen(tr.id));
      $("#monitors").append(box);
      st.els[tr.id] = { el: v, box, tr };
    }
    if (tr.audioProxy) {
      // src dobiva tek trag koji se sluša (vidi listen): Chrome drži najviše 6 veza po hostu,
      // pa bi 3 videa + 4 zvuka s preloadom ostavila glavni zvuk bez veze.
      const a = new Audio();
      a.preload = "auto";
      st.audios[tr.id] = { el: a, tr, url: "/media/" + tr.audioProxy };
      st.volumes[tr.id] = 1;
      fetch(`peaks/${tr.id}.json`).then((r) => r.ok && r.json()).then((p) => { if (p) { st.peaks[tr.id] = p; draw(); } });
    }
  }
  buildLabels();
  buildCards();
  $("#notes").value = m.edit.notes || "";
  buildCuts();
  st.view = { a: 0, b: m.timelineEndSeconds };
  const saved = parseFloat(localStorage.getItem("montaza.T"));
  const firstListen = m.tracks.find((t) => t.audioProxy);
  listen(firstListen && firstListen.id);
  seek(isFinite(saved) ? saved : (m.edit.inSeconds ?? 0));
}

function listen(id) {
  st.listen = st.listen === id ? null : id;
  for (const [k, a] of Object.entries(st.audios)) {
    if (k === st.listen) { if (!a.el.getAttribute("src")) a.el.src = a.url; }
    else if (a.el.getAttribute("src")) { a.el.pause(); a.el.removeAttribute("src"); a.el.load(); }
  }
  for (const { box, tr } of Object.values(st.els)) box.classList.toggle("listening", tr.id === st.listen);
  document.querySelectorAll(".track").forEach((c) => {
    const b = $(".listen", c);
    if (b) b.classList.toggle("on", c.dataset.id === st.listen);
  });
  reanchor();
  syncAll(true);
}

function reanchor() { st.anchorT = st.T; st.anchorPerf = performance.now(); }

function seek(T) {
  st.T = Math.max(-300, Math.min(st.m.timelineEndSeconds, T));
  reanchor();
  syncAll(true);
  render();
}

function media() {
  const list = Object.values(st.els).map((x) => ({ ...x, audio: false }));
  if (st.listen) list.push({ ...st.audios[st.listen], audio: true });
  return list;
}

// Drži svaki element na T. Glavni zvuk vodi sat (nema pucketanja), slike prate.
function syncAll(hard = false) {
  for (const { el, tr, box, audio } of media()) {
    const inn = inside(tr, st.T);
    if (box?.dataset.missing) continue;
    if (box) box.classList.toggle("outside", !inn);
    if (!inn) { if (!el.paused) el.pause(); continue; }
    const want = local(tr, st.T);
    if (audio) el.volume = st.volumes[tr.id];
    if (!st.playing) {
      if (!el.paused) el.pause();
      if (hard || Math.abs(el.currentTime - want) > 0.02) el.currentTime = want;
      continue;
    }
    const diff = el.currentTime - want, isClock = audio && tr.id === st.listen;
    if (el.paused) { el.currentTime = want; el.playbackRate = st.rate; el.play().catch(() => {}); continue; }
    // glavni zvuk je sat: T prati njega, pa ga se premotava samo na izričit seek
    if (isClock && !hard) { el.playbackRate = st.rate; continue; }
    if (hard || Math.abs(diff) > 0.3) { el.currentTime = want; el.playbackRate = st.rate; continue; }
    el.playbackRate = isClock ? st.rate : st.rate * (1 - Math.max(-0.08, Math.min(0.08, diff * 0.8)));
  }
}

function clockTick() {
  if (st.playing) {
    const a = st.listen && st.audios[st.listen];
    if (a && inside(a.tr, st.T) && !a.el.paused && !a.el.seeking && a.el.readyState >= 3) {
      st.T = off(a.tr) + a.tr.scale * a.el.currentTime;
      reanchor();
    } else if (a && inside(a.tr, st.T) && (a.el.seeking || a.el.readyState < 3)) {
      reanchor();   // glavni zvuk se još puni: sat stoji, inače bi ga slike pretekle
    } else {
      st.T = st.anchorT + (performance.now() - st.anchorPerf) / 1000 * st.rate;
    }
    if (st.T >= st.m.timelineEndSeconds) togglePlay(false);
    syncAll();
    // pratiti glavu kad izađe iz pogleda
    const w = st.view.b - st.view.a;
    if (st.T > st.view.b || st.T < st.view.a) { st.view.a = st.T - w * 0.1; st.view.b = st.view.a + w; }
    render();
  }
  requestAnimationFrame(clockTick);
}

function togglePlay(on = !st.playing) {
  st.playing = on;
  $("#play").textContent = on ? "❚❚ Pauza" : "▶︎ Play";
  if (!on) for (const x of [...Object.values(st.audios), ...Object.values(st.els)]) x.el.pause();
  reanchor();
  syncAll(true);
}

// ---------- prikaz ----------
function render() {
  $("#tc").textContent = fmt(st.T);
  $("#wall").textContent = "zidni sat " + wall(st.T);
  for (const { tr, box } of Object.values(st.els)) $(".lt", box).textContent = inside(tr, st.T) ? fmt(local(tr, st.T), false) : "";
  const { inSeconds: i, outSeconds: o } = st.m.edit;
  $("#inout-info").innerHTML =
    `<span style="color:var(--in)">početak ${i == null ? "—" : fmt(i) + " (" + wall(i) + ")"}</span> · ` +
    `<span style="color:var(--out)">kraj ${o == null ? "—" : fmt(o) + " (" + wall(o) + ")"}</span>` +
    (i != null && o != null ? ` · trajanje <b>${fmt(o - i, false)}</b>` : "");
  try { localStorage.setItem("montaza.T", st.T); } catch {}
  applyProgram();
  markTranscript();
  draw();
}

function buildLabels() {
  const L = $("#lanes-labels");
  L.innerHTML = "<div></div>" + st.m.tracks.map((t) => `<div title="${t.file}">${t.label}<br><span class="muted">${t.kind}</span></div>`).join("") +
    (st.tr ? `<div>Govor<br><span class="muted"><span style="color:var(--wave)">predavač</span> · <span style="color:#f0a35e">ostali</span></span></div>` : "") +
    `<div>Program<br><span class="muted">slika · zvuk</span></div>`;
}

const cv = $("#timeline");
function draw() {
  const m = st.m; if (!m) return;
  const lanes = m.tracks.length + (st.tr ? 1 : 0) + 1;
  const dpr = devicePixelRatio || 1, W = cv.clientWidth, H = RULER_H + LANE_H * lanes;
  if (cv.width !== W * dpr || cv.height !== H * dpr) { cv.width = W * dpr; cv.height = H * dpr; cv.style.height = H + "px"; }
  const g = cv.getContext("2d");
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const css = getComputedStyle(document.documentElement), c = (n) => css.getPropertyValue(n).trim();
  g.fillStyle = c("--panel"); g.fillRect(0, 0, W, H);
  const { a, b } = st.view, X = (t) => (t - a) / (b - a) * W;

  // ravnalo
  const span = b - a, steps = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600];
  const step = steps.find((s) => span / s < W / 90) || 3600;
  g.fillStyle = c("--muted"); g.strokeStyle = c("--line"); g.font = "11px ui-monospace, Menlo, monospace";
  for (let t = Math.ceil(a / step) * step; t <= b; t += step) {
    const x = Math.round(X(t)) + 0.5;
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke();
    g.fillText(fmt(t, false), x + 3, 15);
  }

  // in/out
  const { inSeconds: i, outSeconds: o } = m.edit;
  if (i != null || o != null) {
    g.fillStyle = "rgba(0,0,0,0.45)";
    if (i != null) g.fillRect(0, RULER_H, Math.max(0, X(i)), H);
    if (o != null) g.fillRect(X(o), RULER_H, W, H);
  }

  // tragovi
  m.tracks.forEach((tr, k) => {
    const y = RULER_H + k * LANE_H;
    g.strokeStyle = c("--line"); g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); g.stroke();
    const x0 = X(off(tr)), x1 = X(end(tr));
    g.fillStyle = tr.id === st.listen ? "#3d5f95" : c("--cover");
    g.fillRect(x0, y + 4, x1 - x0, LANE_H - 8);
    const p = st.peaks[tr.id];
    if (p) {
      g.fillStyle = c("--wave");
      const mid = y + LANE_H / 2, amp = (LANE_H - 12) / 2;
      for (let px = Math.max(0, Math.floor(x0)); px < Math.min(W, x1); px++) {
        const t0 = local(tr, a + px / W * span), t1 = local(tr, a + (px + 1) / W * span);
        let j0 = Math.floor(t0 / p.hopSeconds), j1 = Math.max(j0 + 1, Math.ceil(t1 / p.hopSeconds));
        let mx = 0;
        for (let j = Math.max(0, j0); j < Math.min(p.peaks.length, j1); j++) if (p.peaks[j] > mx) mx = p.peaks[j];
        const h = mx / 255 * amp;
        g.fillRect(px, mid - h, 1, h * 2 || 1);
      }
    } else if (tr.kind !== "audio") {
      g.fillStyle = "rgba(255,255,255,0.5)"; g.font = "11px sans-serif";
      g.fillText("slika", Math.max(4, x0 + 4), y + LANE_H / 2 + 4);
    }
  });

  // govornici iz transkripta
  if (st.tr) {
    const y = RULER_H + m.tracks.length * LANE_H;
    g.strokeStyle = c("--line"); g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); g.stroke();
    for (const sg of st.tr.segments) {
      if (!sg.text || sg.end < a || sg.start > b) continue;
      const main = sg.name === MAIN_SPEAKER;
      g.fillStyle = main ? c("--wave") : "#f0a35e";
      g.fillRect(X(sg.start), main ? y + 6 : y + LANE_H / 2 + 2, Math.max(1, X(sg.end) - X(sg.start)), LANE_H / 2 - 8);
    }
  }

  // program: gore slika, dolje zvuk; crveno gdje izabrani izvor nema snimke
  {
    const y = RULER_H + (m.tracks.length + (st.tr ? 1 : 0)) * LANE_H, list = m.edit.cuts || [], hh = LANE_H / 2 - 6;
    g.strokeStyle = c("--line"); g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); g.stroke();
    list.forEach((cu, k) => {
      const t1 = list[k + 1]?.t ?? Math.max(cu.t, o ?? m.timelineEndSeconds);
      if (t1 < a || cu.t > b) return;
      for (const [f, yy] of [["video", y + 5], ["audio", y + LANE_H / 2 + 1]]) {
        const tr = trById(cu[f]); if (!tr) continue;
        const x0 = X(cu.t), x1 = X(t1);
        g.fillStyle = "#c0392b"; g.fillRect(x0, yy, x1 - x0, hh);
        const c0 = X(Math.max(cu.t, off(tr))), c1 = X(Math.min(t1, end(tr)));
        g.fillStyle = SRC_COL[tr.id] || c("--wave");
        if (c1 > c0) g.fillRect(c0, yy, c1 - c0, hh);
        if (x1 - Math.max(0, x0) > 40) { g.fillStyle = "#000"; g.font = "10px sans-serif"; g.fillText(short(tr), Math.max(0, x0) + 4, yy + 11); }
      }
      g.fillStyle = "#fff"; g.fillRect(X(cu.t) - 1, y + 2, 2, LANE_H - 4);
    });
  }

  // prijedlozi iz semantika.json: isprekidana crta i zastavica u ravnalu
  for (const mk of st.sem?.markeri || []) {
    if (mk.t < a || mk.t > b) continue;
    const x = Math.round(X(mk.t)) + 0.5, col = mk.kind === "in" ? c("--in") : c("--out");
    g.save();
    g.globalAlpha = mk.primary ? 0.95 : 0.55;
    g.strokeStyle = col; g.lineWidth = mk.primary ? 1.5 : 1; g.setLineDash([4, 3]);
    g.beginPath(); g.moveTo(x, RULER_H); g.lineTo(x, H); g.stroke();
    g.setLineDash([]); g.fillStyle = col;
    g.beginPath(); g.moveTo(x, RULER_H); g.lineTo(x + (mk.kind === "in" ? 7 : -7), RULER_H - 6); g.lineTo(x, RULER_H - 12); g.fill();
    g.restore();
  }

  // oznake in/out i glava
  const line = (t, col, w = 2) => { if (t == null) return; const x = X(t); g.fillStyle = col; g.fillRect(x - w / 2, 0, w, H); };
  line(i, c("--in")); line(o, c("--out")); line(st.T, "#fff", 1.5);
}

// interakcija s vremenskom crtom
let drag = null;
cv.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, a: st.view.a, b: st.view.b, moved: false }; cv.setPointerCapture(e.pointerId); });
cv.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x;
  if (Math.abs(dx) > 3) drag.moved = true;
  if (drag.moved) {
    const dt = -dx / cv.clientWidth * (drag.b - drag.a);
    st.view = { a: drag.a + dt, b: drag.b + dt }; draw();
  }
});
cv.addEventListener("pointerup", (e) => {
  if (drag && !drag.moved) {
    const r = cv.getBoundingClientRect();
    seek(st.view.a + (e.clientX - r.left) / r.width * (st.view.b - st.view.a));
  }
  drag = null;
});
cv.addEventListener("wheel", (e) => {
  e.preventDefault();
  const r = cv.getBoundingClientRect(), f = (e.clientX - r.left) / r.width, { a, b } = st.view, span = b - a;
  if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
    const dt = (e.deltaX || e.deltaY) / r.width * span;
    st.view = { a: a + dt, b: b + dt };
  } else {
    const z = Math.exp(e.deltaY * 0.002), ns = Math.max(4, Math.min(st.m.timelineEndSeconds * 1.2, span * z)), t = a + f * span;
    st.view = { a: t - f * ns, b: t - f * ns + ns };
  }
  draw();
}, { passive: false });
addEventListener("resize", draw);

// ---------- kartice tragova ----------
function buildCards() {
  $("#tracks").innerHTML = "";
  for (const tr of st.m.tracks) {
    const s = tr.sync || {};
    const good = s.method === "master" || (s.residualRmsMs != null && s.residualRmsMs < 10);
    const badge = s.method === "master" ? "referenca" : s.residualRmsMs != null ? `rezidual ${s.residualRmsMs.toFixed(1)} ms` : `±${s.uncertaintySeconds} s`;
    const card = document.createElement("div");
    card.className = "track"; card.dataset.id = tr.id;
    card.innerHTML = `
      <h3><span>${tr.label}</span><span class="badge ${good ? "ok" : "warn"}">${badge}</span></h3>
      <div class="muted" style="font-size:12px">${tr.file}<br>${tr.media}</div>
      <dl>
        <dt>počinje</dt><dd class="start"></dd>
        <dt>završava</dt><dd class="end"></dd>
        <dt>trajanje</dt><dd>${fmt(tr.durationSeconds, false)}</dd>
        <dt>poravnanje</dt><dd>${s.method}${s.driftPPM != null ? ` · drift ${s.driftPPM} ppm` : ""}${s.medianPSR ? ` · PSR ${s.medianPSR.toFixed(1)}` : ""}</dd>
        ${s.note ? `<dt>bilješka</dt><dd style="font-family:inherit">${s.note}</dd>` : ""}
        <dt>ručni pomak</dt><dd class="nudge"></dd>
      </dl>
      <div class="row">
        ${tr.audioProxy ? `<button class="listen">🔊 Slušaj</button><input type="range" class="vol" min="0" max="2" step="0.05" value="1" title="glasnoća">` : ""}
      </div>
      ${tr.sync?.method === "master" ? "" : `<div class="row">
        <span class="muted" style="font-size:12px">pomakni:</span>
        <button data-n="-1">−1 s</button><button data-n="-${FRAME}">−1 fr</button><button data-n="-0.01">−10 ms</button>
        <button data-n="0.01">+10 ms</button><button data-n="${FRAME}">+1 fr</button><button data-n="1">+1 s</button>
        <button data-n="reset">0</button></div>`}`;
    const lb = $(".listen", card);
    if (lb) lb.onclick = () => listen(tr.id);
    const vol = $(".vol", card);
    if (vol) vol.oninput = () => { st.volumes[tr.id] = +vol.value; const a = st.audios[tr.id]; a.el.volume = Math.min(1, +vol.value); };
    card.querySelectorAll("[data-n]").forEach((b) => b.onclick = () => {
      st.nudges[tr.id] = b.dataset.n === "reset" ? 0 : Math.round(((st.nudges[tr.id] || 0) + +b.dataset.n) * 1000) / 1000;
      updateCards(); syncAll(true); draw(); save();
    });
    $("#tracks").append(card);
  }
  updateCards();
}
function updateCards() {
  for (const tr of st.m.tracks) {
    const c = $(`.track[data-id="${tr.id}"]`);
    $(".start", c).textContent = `${fmtSigned(off(tr))} (${wall(off(tr))})`;
    $(".end", c).textContent = `${fmt(end(tr))} (${wall(end(tr))})`;
    const n = st.nudges[tr.id] || 0;
    $(".nudge", c).textContent = n ? `${n > 0 ? "+" : ""}${(n * 1000).toFixed(0)} ms` : "0";
  }
}

// ---------- kontrole ----------
$("#play").onclick = () => togglePlay();
document.querySelectorAll("[data-step]").forEach((b) => b.onclick = () => seek(st.T + +b.dataset.step));
$("#rate").onchange = (e) => { st.rate = +e.target.value; reanchor(); syncAll(true); };
$("#goto").onkeydown = (e) => { if (e.key === "Enter") { const t = parseTime(e.target.value); if (t != null) seek(t); e.target.blur(); } };
const setIn = () => { st.m.edit.inSeconds = Math.round(st.T * 1000) / 1000; render(); save(); };
const setOut = () => { st.m.edit.outSeconds = Math.round(st.T * 1000) / 1000; render(); save(); };
$("#set-in").onclick = setIn; $("#set-out").onclick = setOut;
$("#go-in").onclick = () => st.m.edit.inSeconds != null && seek(st.m.edit.inSeconds);
$("#go-out").onclick = () => st.m.edit.outSeconds != null && seek(st.m.edit.outSeconds);
$("#notes").oninput = (e) => { st.m.edit.notes = e.target.value; save(); };

addEventListener("keydown", (e) => {
  if (e.target.matches("input, textarea, select")) return;
  const k = e.key, big = e.shiftKey;
  // blur: inače fokusirani gumb na keyup dobije i klik, pa se play okine dvaput
  if (k === " ") { e.preventDefault(); e.target.blur?.(); togglePlay(); }
  else if (k === "ArrowLeft") { e.preventDefault(); seek(st.T - (big ? 10 : 1)); }
  else if (k === "ArrowRight") { e.preventDefault(); seek(st.T + (big ? 10 : 1)); }
  else if (k === ",") seek(st.T - FRAME);
  else if (k === ".") seek(st.T + FRAME);
  else if (k === "i") setIn();
  else if (k === "o") setOut();
  else if (k === "I") $("#go-in").click();
  else if (k === "O") $("#go-out").click();
  else if (k === "p") addCut();
  else if (/^[1-9]$/.test(k)) {
    const ids = st.m.tracks.filter((t) => t.audioProxy).map((t) => t.id);
    if (ids[+k - 1]) listen(ids[+k - 1]);
  }
});

// ---------- transkript ----------
function esc(t) { return t.replace(/[&<>]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[ch]); }
function loadTranscript() {
  fetch("transkript.json").then((r) => r.ok && r.json()).then((tr) => {
    if (!tr) return;
    st.tr = tr;
    $("#tr-source").textContent = tr.source === "gemini" ? "· Gemini nad Speechmatics + pyannote" : "· Speechmatics + pyannote (Gemini prijepis još radi)";
    const box = $("#transcript");
    box.innerHTML = tr.segments.map((sg, k) =>
      `<div class="seg${sg.name === MAIN_SPEAKER ? " main" : ""}${sg.text ? "" : " empty"}" data-k="${k}">
        <span class="t">${fmt(sg.start, false)}</span><span class="who">${esc(sg.name)}</span><span class="x">${esc(sg.text)}</span></div>`).join("");
    box.onclick = (e) => { const el = e.target.closest(".seg"); if (el) seek(tr.segments[+el.dataset.k].start); };
    buildLabels(); render();
  });
}
function markTranscript() {
  const tr = st.tr; if (!tr) return;
  const segs = tr.segments;
  let lo = 0, hi = segs.length - 1, k = -1;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (segs[mid].start <= st.T) { k = mid; lo = mid + 1; } else hi = mid - 1; }
  while (k > 0 && !segs[k].text) k--;
  if (k === st.trNow) return;
  const box = $("#transcript");
  box.querySelector(".seg.now")?.classList.remove("now");
  st.trNow = k;
  const el = k >= 0 && box.querySelector(`.seg[data-k="${k}"]`);
  if (!el) return;
  el.classList.add("now");
  if ($("#tr-follow").checked && !$("#tr-search").value) box.scrollTop = el.offsetTop - box.offsetTop - box.clientHeight / 3;
}
$("#tr-search").oninput = (e) => {
  const q = e.target.value.trim().toLowerCase();
  document.querySelectorAll("#transcript .seg").forEach((el) => {
    const sg = st.tr.segments[+el.dataset.k], x = $(".x", el);
    const hit = !q || sg.text.toLowerCase().includes(q);
    el.classList.toggle("hidden", !hit);
    x.innerHTML = q && hit ? esc(sg.text).replace(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), (mm) => `<mark>${mm}</mark>`) : esc(sg.text);
  });
};

// ---------- program: točke reza ----------
// Točka {t, video, audio}: od t do iduće točke u montaži su ova slika i ovaj zvuk.
const SRC_COL = { rode: "#4f9cff", lumix: "#b98cff", moto: "#5fd3c6", m4a: "#ff8a65", screen: "#f2c14e", "pip-moto": "#e96fa8", "pip-lumix": "#d7a1ff" };
const trById = (id) => st.m.tracks.find((t) => t.id === id) || layoutTrack(id);
// Raspored se ponaša kao trag koji pokriva presjek screensharea i kamere.
function layoutTrack(id) {
  const L = (st.m.layouts || []).find((l) => l.id === id); if (!L) return null;
  const a = trById(L.screen), b = trById(L.cam), s = Math.max(off(a), off(b)), e = Math.min(end(a), end(b));
  return { id, label: L.label, offsetSeconds: s, scale: 1, durationSeconds: Math.max(0, e - s), layout: L };
}
const short = (tr) => tr.label.replace(/ \(.*\)$/, "");
const cuts = () => (st.m.edit.cuts ||= []);
function activeAt(T) { let s = null; for (const cu of cuts()) { if (cu.t <= T) s = cu; else break; } return s; }

function addCut() {
  const T = Math.round(st.T * 1000) / 1000, cur = activeAt(T), list = cuts();
  if (list.some((cu) => Math.abs(cu.t - T) < 0.02)) return;
  const vids = [...(st.m.layouts || []).map((L) => trById(L.id)), ...st.m.tracks.filter((t) => t.videoProxy)];
  list.push({ t: T, video: cur?.video ?? (vids.find((t) => inside(t, T)) || vids[0]).id, audio: cur?.audio ?? st.listen ?? "rode" });
  list.sort((x, y) => x.t - y.t);
  buildCuts(); render(); save();
}

function buildCuts() {
  const vids = [...(st.m.layouts || []).map((L) => trById(L.id)), ...st.m.tracks.filter((t) => t.videoProxy)], auds = st.m.tracks.filter((t) => t.audioProxy), list = cuts();
  const opt = (arr, sel) => arr.map((t) => `<option value="${t.id}"${t.id === sel ? " selected" : ""}>${short(t)}</option>`).join("");
  $("#cuts-list").innerHTML = list.length ? list.map((cu, k) => {
    const t1 = list[k + 1]?.t ?? (st.m.edit.outSeconds ?? st.m.timelineEndSeconds);
    const gaps = [cu.video, cu.audio].map(trById).filter(Boolean).flatMap((t) => [
      ...(off(t) > cu.t + 0.01 ? [`${short(t)} počinje tek u ${fmt(off(t), false)}`] : []),
      ...(end(t) < t1 - 0.01 ? [`${short(t)} završava u ${fmt(end(t), false)}, prije kraja ovog dijela`] : [])]);
    return `<div class="cut" data-k="${k}">
      <button data-a="go" class="t" title="Skoči na točku">${fmt(cu.t)}</button>
      <label>slika <select data-f="video">${opt(vids, cu.video)}</select></label>
      <label>zvuk <select data-f="audio">${opt(auds, cu.audio)}</select></label>
      ${cu.why ? `<span class="muted why">${esc(cu.why)}</span>` : ""}
      <span class="warn-x">${gaps.map((w) => `<span class="badge warn">${esc(w)}</span>`).join(" ")}</span>
      <span class="act"><button data-a="here" title="Pomakni točku na glavu">= ovdje</button><button data-a="del" title="Obriši točku">✕</button></span></div>`;
  }).join("") : `<div class="muted cut-empty">Nema točaka. Na mjestu gdje se mijenja slika ili zvuk stisni „+ točka ovdje” ili P.</div>`;
}

$("#cuts-list").onchange = (e) => {
  const el = e.target.closest(".cut"); if (!el || !e.target.dataset.f) return;
  const cu = cuts()[+el.dataset.k];
  cu[e.target.dataset.f] = e.target.value;
  if (cu.why) cu.why = "ručno";
  buildCuts(); render(); save();
};
$("#cuts-list").onclick = (e) => {
  const b = e.target.closest("button"); if (!b) return;
  const k = +b.closest(".cut").dataset.k, cu = cuts()[k];
  if (b.dataset.a === "go") return seek(cu.t);
  if (b.dataset.a === "del") cuts().splice(k, 1);
  if (b.dataset.a === "here") { cu.t = Math.round(st.T * 1000) / 1000; cuts().sort((x, y) => x.t - y.t); }
  buildCuts(); render(); save();
};
$("#cut-add").onclick = addCut;

// Monitor izabrane slike dobiva crveni okvir; uz „prati program” sluša se izabrani zvuk.
function applyProgram() {
  const cu = activeAt(st.T);
  const L = cu && trById(cu.video)?.layout;
  for (const { box, tr } of Object.values(st.els)) box.classList.toggle("program", !!cu && (cu.video === tr.id || L?.screen === tr.id || L?.cam === tr.id));
  drawProgram();
  if (cu && $("#program-follow").checked && st.listen !== cu.audio && st.audios[cu.audio]) listen(cu.audio);
  $("#program-now").textContent = cu ? `sad: slika ${short(trById(cu.video))} · zvuk ${short(trById(cu.audio))}` : "prije prve točke";
}

// Monitor „Program”: složena slika kao u renderu (izlaz 1920×1080, crta se na 960×540).
function drawProgram() {
  const P = st.prog; if (!P || !st.m) return;
  const g = P.cv.getContext("2d"), W = P.cv.width, H = P.cv.height, cu = activeAt(st.T);
  g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
  const tr = cu && trById(cu.video);
  $(".lt", P.box).textContent = tr ? short(tr) : "nema točke";
  if (!tr || !inside(tr, st.T)) return;
  const L = tr.layout;
  if (!L) {
    const v = st.els[tr.id]?.el; if (!v || v.readyState < 2) return;
    const k = Math.min(W / v.videoWidth, H / v.videoHeight), w = v.videoWidth * k, h = v.videoHeight * k;
    return g.drawImage(v, (W - w) / 2, (H - h) / 2, w, h);
  }
  const k = W / 1920, sv = st.els[L.screen].el, camV = st.els[L.cam].el, cr = st.crops[L.cam];
  if (sv.readyState >= 2) { const s = sv.videoWidth / 1920, [x, y, w, h] = L.screenCrop; g.drawImage(sv, x * s, y * s, w * s, h * s, 0, 0, W, H); }
  if (!cr || typeof cr !== "object" || camV.readyState < 2) return;
  const i = Math.max(0, Math.min(cr.x.length - 1, Math.round(local(trById(L.cam), st.T) / cr.step)));
  const s = camV.videoWidth / cr.srcW, p = L.pip, cx = cr.x[i], cy = cr.y[i];
  const dw = p.w * k, dh = p.h * k, dx = W - (p.w + p.margin) * k, dy = H - (p.h + p.margin) * k, b = p.border * k;
  g.fillStyle = "#fff"; g.fillRect(dx - b, dy - b, dw + 2 * b, dh + 2 * b);
  g.drawImage(camV, cx * s, cy * s, cr.w * s, cr.h * s, dx, dy, dw, dh);
  // WiFi papir na govornici: zamućen kao u renderu
  const [bx, by, bw, bh] = cr.blur, x0 = Math.max(bx, cx), y0 = Math.max(by, cy), x1 = Math.min(bx + bw, cx + cr.w), y1 = Math.min(by + bh, cy + cr.h);
  if (x1 > x0 && y1 > y0) {
    const m = dw / cr.w;
    g.save(); g.beginPath(); g.rect(dx + (x0 - cx) * m, dy + (y0 - cy) * m, (x1 - x0) * m, (y1 - y0) * m); g.clip();
    g.filter = "blur(5px)"; g.drawImage(camV, cx * s, cy * s, cr.w * s, cr.h * s, dx, dy, dw, dh); g.restore();
  }
}

// ---------- prijedlog početka i kraja ----------
function loadSuggestions() {
  fetch("semantika.json").then((r) => r.ok && r.json()).then((sem) => {
    if (!sem) return;
    st.sem = sem;
    const mk = sem.markeri, box = $("#suggest");
    box.hidden = false;
    $("#suggest-list").innerHTML = mk.map((s, k) =>
      `<div class="sug ${s.kind}${s.primary ? " primary" : ""}">
        <span class="t">${s.kind === "in" ? "početak" : "kraj"} ${fmt(s.t)}</span>
        <span class="x"><b>${esc(s.label)}</b>${s.primary ? ' <span class="badge ok">prijedlog</span>' : ""}<br><span class="muted">${esc(s.why)}</span></span>
        <span class="act"><button data-k="${k}" data-a="hear" title="Pusti od ${s.kind === "in" ? "5 s prije" : "15 s prije"}">▶︎ poslušaj</button>
        <button data-k="${k}" data-a="set">postavi</button></span></div>`).join("");
    $("#suggest-list").onclick = (e) => {
      const b = e.target.closest("button"); if (!b) return;
      const s = mk[+b.dataset.k];
      if (b.dataset.a === "hear") { seek(s.t - (s.kind === "in" ? 5 : 15)); togglePlay(true); }
      else { st.m.edit[s.kind === "in" ? "inSeconds" : "outSeconds"] = s.t; render(); save(); }
    };
    $("#suggest-accept").onclick = () => {
      for (const s of mk) if (s.primary) st.m.edit[s.kind === "in" ? "inSeconds" : "outSeconds"] = s.t;
      render(); save();
    };
    draw();
  });
}

fetch("/api/manifest").then((r) => r.json()).then((m) => { st.m = m; build(); loadTranscript(); loadSuggestions(); requestAnimationFrame(clockTick); });
