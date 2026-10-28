#!/usr/bin/env node
// Lokalni poslužitelj za projektor: servira app/ i data/ iz korijena repoa.
// Pokretanje: npm run stage  →  http://localhost:4173/app/stage.html

import http from "node:http";
import { appendFile, mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT || 4173);
const ALLOWED = ["app", "data"];
const LOG = path.join(ROOT, "logs/stage.ndjson");
await mkdir(path.dirname(LOG), { recursive: true });
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml",
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/api/log" && req.method === "POST") {
    let body = "";
    for await (const chunk of req) body += chunk;
    let data;
    try { data = JSON.parse(body || "{}"); } catch { data = { event: "bad-log", body: body.slice(0, 200) }; }
    const line = JSON.stringify({ t: new Date().toISOString(), ...data });
    await appendFile(LOG, line + "\n");
    if (process.env.VERBOSE !== "0") console.log(line);
    res.writeHead(204).end();
    return;
  }
  if (url.pathname === "/") {
    res.writeHead(302, { location: "/app/" }).end();
    return;
  }
  const rel = path.normalize(decodeURIComponent(url.pathname)).replace(/^\/+/, "").replace(/(^|\/)$/, "$1index.html");
  const file = path.join(ROOT, rel);
  if (!ALLOWED.includes(rel.split(path.sep)[0]) || !file.startsWith(ROOT)) {
    res.writeHead(404).end("not found");
    return;
  }
  try {
    if (!(await stat(file)).isFile()) throw new Error("not a file");
    res.writeHead(200, {
      "content-type": TYPES[path.extname(file)] || "application/octet-stream",
      "cache-control": "no-cache",
    });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404).end("not found");
  }
}).listen(PORT, () => console.log(`katalog: http://localhost:${PORT}/app/`));
