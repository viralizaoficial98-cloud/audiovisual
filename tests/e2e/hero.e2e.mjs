// Teste e2e (Playwright) — corre contra um servidor já iniciado (npm run build && npm start).
// Uso: node tests/e2e/hero.e2e.mjs [url]
import { createRequire } from "node:module";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const URL = process.argv[2] || "http://localhost:3000";
const results = [];
const step = async (name, fn) => {
  try {
    await fn();
    results.push(["✔", name]);
  } catch (e) {
    results.push(["✘", name, String(e.message || e).split("\n")[0]]);
  }
};

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });

async function open(viewport) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  // intercepta window.open para validar as mensagens de WhatsApp sem abrir separadores
  await page.addInitScript(() => {
    window.__opened = [];
    window.open = (u) => (window.__opened.push(String(u)), null);
  });
  await page.goto(URL + "?quality=low", { waitUntil: "networkidle" });
  await page.waitForFunction(() => !document.querySelector("[data-hero-loader]"), null, { timeout: 120000 });
  return { ctx, page, errors };
}

const progress = (page) => page.evaluate(() => window.__viralizaHero.progress);
const scrollToP = (page, p) =>
  page.evaluate((p) => {
    const s = document.getElementById("inicio");
    window.scrollTo(0, s.offsetTop + window.__viralizaMap.sceneToScroll(p) * (s.offsetHeight - innerHeight));
  }, p);
const waitP = (page, p) => page.waitForFunction((p) => Math.abs(window.__viralizaHero.progress - p) < 0.003, p, { timeout: 20000 });

for (const vp of [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
]) {
  const { ctx, page, errors } = await open(vp);
  const tag = `[${vp.name}]`;

  await step(`${tag} abre directamente no banner, câmara desmontada (p=0)`, async () => {
    assert.equal(await page.evaluate(() => window.scrollY), 0);
    assert.equal(await progress(page), 0);
    assert.ok(await page.locator("canvas:not([data-dust])").isVisible());
    assert.ok(await page.locator('img[src*="parte1-desmontada"]').isVisible(), "imagem oficial Parte 1 visível");
    assert.ok(await page.getByText("COMEÇA COM UMA VISÃO.").isVisible());
  });

  await step(`${tag} banner fica fixo durante o scroll (sticky)`, async () => {
    await scrollToP(page, 0.5);
    await waitP(page, 0.5);
    const top = await page.evaluate(() => document.querySelector("#inicio > div").getBoundingClientRect().top);
    assert.ok(Math.abs(top) < 1, `top=${top}`);
  });

  await step(`${tag} scroll controla o progresso e é reversível`, async () => {
    for (const p of [0.2, 0.45, 0.7, 0.95]) {
      await scrollToP(page, p);
      await waitP(page, p);
    }
    await scrollToP(page, 0.3);
    await waitP(page, 0.3);
    await scrollToP(page, 0);
    await waitP(page, 0);
  });

  await step(`${tag} estado final mostra título, subtítulo, CTAs e preço`, async () => {
    await scrollToP(page, 1);
    await waitP(page, 1);
    await page.waitForTimeout(300);
    assert.ok(await page.locator("#hero-title").isVisible());
    assert.ok(await page.getByText("Transformamos momentos em experiências memoráveis.").first().isVisible());
    assert.ok(await page.locator("[data-reveal-cta]").first().isVisible());
  });

  await step(`${tag} a página continua depois da animação (sem saltos)`, async () => {
    const before = await page.evaluate(() => document.getElementById("servicos").getBoundingClientRect().top);
    assert.ok(Math.abs(before - (await page.evaluate(() => innerHeight))) < 2, `serviços começa logo após o banner (top=${before})`);
    await page.mouse.move(vp.width / 2, vp.height / 2);
    await page.mouse.wheel(0, 600);
    await page.waitForFunction((b) => document.getElementById("servicos").getBoundingClientRect().top < b - 300, before, { timeout: 5000 }).catch(() => {});
    const after = await page.evaluate(() => document.getElementById("servicos").getBoundingClientRect().top);
    assert.ok(after < before - 300);
  });

  await step(`${tag} SALTAR INTRODUÇÃO avança para o estado final`, async () => {
    await page.evaluate(() => window.scrollTo(0, 0));
    await waitP(page, 0);
    await page.getByRole("button", { name: "Saltar introdução" }).click();
    await waitP(page, 1);
    assert.ok(await page.locator("#hero-title").isVisible());
  });

  await step(`${tag} sem scroll horizontal`, async () => {
    const ok = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
    assert.ok(ok);
  });

  await step(`${tag} pré-reserva: estimativa e envio por WhatsApp`, async () => {
    await page.locator("#reserva").scrollIntoViewIfNeeded();
    assert.ok(await page.getByText("40.000 Kz").first().isVisible());
    const f = page.locator("#reserva form");
    await f.locator('[name="name"]').fill("Ana Teste");
    await f.locator('[name="phone"]').fill("923456789");
    await f.locator('[name="date"]').fill("2099-06-15");
    await f.locator('[name="time"]').fill("10:30");
    await f.getByRole("button", { name: "Mais uma hora" }).click();
    await f.getByRole("button", { name: "Mais uma hora" }).click();
    assert.equal((await f.getByTestId("estimate").textContent()).trim(), "120.000 Kz");
    await f.locator('[name="type"]').selectOption("Podcast em vídeo");
    await f.getByRole("button", { name: /Solicitar reserva pelo WhatsApp/i }).click();
    const opened = await page.evaluate(() => window.__opened);
    assert.equal(opened.length, 1);
    const text = decodeURIComponent(opened[0].split("text=")[1]);
    assert.ok(opened[0].startsWith("https://wa.me/244973581978?text="));
    for (const s of ["Ana Teste", "15/06/2099", "10:30", "3 horas", "120.000 Kz", "Podcast em vídeo"]) assert.ok(text.includes(s), `falta "${s}"`);
  });

  await step(`${tag} pré-reserva: validação bloqueia envio incompleto`, async () => {
    await page.evaluate(() => (window.__opened = []));
    await page.locator("#reserva form [name='name']").fill("");
    await page.locator("#reserva form").getByRole("button", { name: /Solicitar reserva/i }).click();
    assert.equal((await page.evaluate(() => window.__opened)).length, 0);
    assert.ok(await page.getByText("Indique o seu nome completo.").isVisible());
  });

  await step(`${tag} proposta de evento abre modal e envia mensagem contextualizada`, async () => {
    await page.evaluate(() => (window.__opened = []));
    await page.locator("#eventos").scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: /Solicitar proposta comercial/i }).click();
    const dlg = page.getByRole("dialog");
    await dlg.waitFor();
    await dlg.locator('[name="name"]').fill("Carlos");
    await dlg.locator('[name="phone"]').fill("+244 923 000 111");
    await dlg.getByText("Streaming", { exact: true }).click();
    await dlg.getByRole("button", { name: /Enviar pelo WhatsApp/i }).click();
    const text = decodeURIComponent((await page.evaluate(() => window.__opened))[0].split("text=")[1]);
    assert.ok(text.includes("Cobertura de evento") && text.includes("Streaming") && text.includes("Carlos"));
    await page.keyboard.press("Escape");
  });

  await step(`${tag} contacto: sem webhook configurado oferece WhatsApp/e-mail`, async () => {
    const f = page.locator("#contactos form");
    await f.scrollIntoViewIfNeeded();
    await f.locator('[name="name"]').fill("Rita");
    await f.locator('[name="email"]').fill("rita@exemplo.ao");
    await f.locator('[name="message"]').fill("Gostaria de saber mais sobre os serviços.");
    await f.getByRole("button", { name: "Enviar mensagem" }).click();
    await f.getByRole("link", { name: "WhatsApp" }).waitFor({ timeout: 8000 });
  });

  await step(`${tag} sem erros de JavaScript`, async () => assert.deepEqual(errors, []));
  await ctx.close();
}

await step("[reduced-motion] mostra versão estática sem WebGL", async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "networkidle" });
  assert.equal(await page.locator("canvas").count(), 0);
  assert.ok(await page.locator("#hero-title").isVisible());
  await ctx.close();
});

await browser.close();

await step("[sem WebGL] usa sequência de imagens e mantém a navegação", async () => {
  const b = await chromium.launch({ args: ["--disable-webgl", "--disable-webgl2", "--disable-3d-apis"] });
  const page = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(URL, { waitUntil: "networkidle" });
  assert.equal(await page.locator("canvas:not([data-dust])").count(), 0);
  assert.ok(await page.locator('img[src*="parte1-desmontada"]').isVisible());
  await page.getByRole("button", { name: "Saltar introdução" }).click();
  await page.waitForFunction(() => window.__viralizaHero.progress > 0.99, null, { timeout: 10000 });
  await b.close();
});

for (const r of results) console.log(r.join("  "));
const failed = results.filter((r) => r[0] === "✘").length;
console.log(`\n${results.length - failed}/${results.length} verificações passaram`);
process.exit(failed ? 1 : 0);
