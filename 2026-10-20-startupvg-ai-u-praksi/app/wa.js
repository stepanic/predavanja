// QR WhatsApp grupe predavanja, stalno u kutu dok je katalog na platnu.
// Na mobitelu je umjesto QR-a poveznica, jer vlastiti ekran se ne može skenirati.
// Tipka w: mali → veliki → skriven. ?wa=0 ga isključuje, a nakon WA_UNTIL se ne prikazuje,
// da link grupe ne ostane trajno na javnoj stranici.

// Poveznica pozivnice nije u repou: postavi window.WA_URL (npr. u wa.config.js) i stavi svoj wa-qr.svg.
const WA_URL = window.WA_URL || "";
const WA_UNTIL = new Date("2026-10-21T12:00:00+02:00");
const MODES = ["small", "big", "off"];

const params = new URLSearchParams(location.search);
if (WA_URL && params.get("wa") !== "0" && (Date.now() < WA_UNTIL || params.get("wa") === "1")) mount();

function mount() {
  // Na stageu je QR unutar slajda i skalira se s njim (--u = 1 % širine slajda), na gridu s prozorom.
  const stage = document.getElementById("stage");
  const mobile = matchMedia("(max-width: 700px), (pointer: coarse)");
  let mode = "small";

  const style = document.createElement("style");
  style.textContent = `
    .wa { --wu: var(--u, 1vw); z-index: 6; color: #f4f5f8; font-family: Inter, system-ui, sans-serif; }
    .wa.qr { position: ${stage ? "absolute" : "fixed"}; right: calc(var(--wu) * 1.6); bottom: calc(var(--wu) * 1.6);
      display: flex; flex-direction: column; align-items: center; gap: calc(var(--wu) * 0.4);
      padding: calc(var(--wu) * 0.6); background: rgba(8, 10, 16, 0.86); backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.14); border-radius: calc(var(--wu) * 0.5);
      font-size: max(12px, calc(var(--wu) * 0.95)); font-weight: 600; transition: all 400ms ease; }
    .wa.qr img { display: block; width: calc(var(--wu) * 10.5); height: auto; border-radius: calc(var(--wu) * 0.3); }
    .wa.qr small { display: none; color: #a3a8b8; font-weight: 400; }
    .wa.qr.big { right: 50%; bottom: 50%; transform: translate(50%, 50%); padding: calc(var(--wu) * 1.6);
      gap: calc(var(--wu) * 0.8); font-size: calc(var(--wu) * 2); border-radius: calc(var(--wu) * 1); }
    .wa.qr.big img { width: calc(var(--wu) * 30); }
    .wa.qr.big small { display: block; font-size: 0.6em; }
    .wa.qr.off { display: none; }
    .wa.link { position: fixed; left: 50%; bottom: 12px; transform: translateX(-50%); font-size: 14px; font-weight: 600;
      padding: 8px 14px; border-radius: 999px; background: #1f8f4e; text-decoration: none; white-space: nowrap;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4); }
    .wa.link.off { display: none; }
    ${stage ? "#stage:has(.wa.qr.small) #ticker { right: calc(var(--u) * 15); }" : ""}
  `;
  document.head.append(style);

  let el;
  function render() {
    el?.remove();
    if (mobile.matches) {
      el = Object.assign(document.createElement("a"), { className: "wa link", href: WA_URL, target: "_blank", rel: "noopener",
        textContent: "Pitanja: WhatsApp grupa ↗" });
      document.body.append(el);
    } else {
      el = document.createElement("div");
      el.className = "wa qr";
      el.innerHTML = `<span>Pitanja → WhatsApp</span><img src="wa-qr.svg" alt="QR kod WhatsApp grupe predavanja">` +
        `<small>Članovi grupe vide brojeve jedni drugih.</small>`;
      (stage || document.body).append(el);
    }
    el.classList.add(mode);
  }
  mobile.addEventListener("change", render);
  render();

  addEventListener("keydown", (e) => {
    if (e.key !== "w" || e.metaKey || e.ctrlKey || e.altKey || /INPUT|TEXTAREA/.test(document.activeElement?.tagName)) return;
    mode = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
    el.classList.remove(...MODES);
    el.classList.add(mode);
  });
}
