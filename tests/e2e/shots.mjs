// Captura o banner em vários pontos do progresso. Uso: node tests/e2e/shots.mjs [url] [outDir] [w] [h] [p1,p2,...]
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const url = process.argv[2] || "http://localhost:3000";
const out = process.argv[3] || "screenshots";
const w = +(process.argv[4] || 1440), h = +(process.argv[5] || 810);
const ps = (process.argv[6] || "0,0.1,0.2,0.3,0.36,0.42,0.48,0.55,0.62,0.68,0.74,0.8,0.86,0.93,1").split(",").map(Number);
const quality = process.argv[7] || "";
import fs from "node:fs";
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errors.push(m.type() + ": " + m.text()); });
await page.goto(url + (quality ? `?quality=${quality}` : ""), { waitUntil: "networkidle" });
await page.waitForFunction(() => !document.querySelector("[data-hero-loader]"), null, { timeout: 120000 });
for (const p of ps) {
  // a sequência é reproduzida no tempo: leva o leitor ao ponto p (a página não se move)
  await page.evaluate((p) => window.__viralizaPlayer.seek(window.__viralizaMap.sceneToScroll(p)), p);
  await page.waitForFunction((p) => Math.abs(window.__viralizaHero.progress - p) < 0.002, p, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(600);
  const t0 = Date.now();
  await page.screenshot({ path: `${out}/p${String(Math.round(p * 1000)).padStart(4, "0")}.jpg`, quality: 80, type: "jpeg" });
  console.log("p", p, "prog", await page.evaluate(() => window.__viralizaHero.progress.toFixed(3)), Date.now() - t0, "ms");
}
console.log("ERRORS:", errors.slice(0, 15).join("\n"));
await browser.close();
