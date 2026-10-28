// thumbnail.html → thumbnail.png (2560×1440) i thumbnail.jpg (1280×720, YouTube traži < 2 MB)
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
await page.goto("file://" + path.join(DIR, "thumbnail.html"), { waitUntil: "networkidle" });
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(DIR, "thumbnail.png") });
await browser.close();
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", path.join(DIR, "thumbnail.png"), "-vf", "scale=1280:720:flags=lanczos", "-q:v", "2", path.join(DIR, "thumbnail.jpg")]);
console.log(path.join(DIR, "thumbnail.jpg"));
