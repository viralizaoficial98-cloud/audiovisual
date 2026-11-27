// Teste e2e (Playwright) — corre contra um servidor já iniciado (npm run build && npm start).
// Uso: node tests/e2e/hero.e2e.mjs [url]
import { createRequire } from "node:module";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { chromium, devices } = require("playwright");

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
    window.__draws = 0;
    for (const C of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
      const o = C?.prototype.drawElements;
      if (o) C.prototype.drawElements = function (...a) { window.__draws++; return o.apply(this, a); };
    }
    window.__opened = [];
    window.open = (u) => (window.__opened.push(String(u)), null);
  });
  await page.goto(URL + "?quality=low", { waitUntil: "networkidle" });
  await page.waitForFunction(() => !document.querySelector("[data-hero-loader]"), null, { timeout: 120000 });
  return { ctx, page, errors };
}

const progress = (page) => page.evaluate(() => window.__viralizaHero.progress);
/** Leva a sequência (no tempo) ao ponto de cena p — a página NÃO se move. */
const seekP = (page, p) => page.evaluate((p) => window.__viralizaPlayer.seek(window.__viralizaMap.sceneToScroll(p)), p);
const waitP = (page, p) => page.waitForFunction((p) => Math.abs(window.__viralizaHero.progress - p) < 0.003, p, { timeout: 20000 });
/** Gestos de roda (100 px) até a secção #servicos chegar ao topo do ecrã. */
async function wheelsToServices(page, max = 60) {
  let n = 0;
  while (n < max && (await page.evaluate(() => document.getElementById("servicos").getBoundingClientRect().top)) > 2) {
    await page.mouse.wheel(0, 100);
    n++;
    await page.waitForTimeout(40);
  }
  return n;
}

for (const vp of [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
]) {
  const { ctx, page, errors } = await open(vp);
  const tag = `[${vp.name}]`;

  await step(`${tag} abre no banner com a câmara desmontada; o título de abertura fica legível`, async () => {
    assert.equal(await page.evaluate(() => window.scrollY), 0);
    assert.ok((await progress(page)) < 0.02, "a montagem ainda não começou (pausa no título)");
    assert.ok(await page.locator("canvas:not([data-dust])").isVisible());
    // a câmara é montada em 3D: nenhuma fotografia da câmara (slide) no banner
    assert.equal(await page.locator('#inicio img[src*="/images/camera/"]').count(), 0, "sem slides de fotografias da câmara");
    assert.ok(await page.getByText("COMEÇA COM UMA VISÃO.").isVisible());
  });

  await step(`${tag} o banner tem a altura de um ecrã e não é "sticky" (sem scroll-jacking)`, async () => {
    const r = await page.evaluate(() => {
      const sec = document.getElementById("inicio");
      const stage = sec.firstElementChild;
      return { h: sec.offsetHeight, vh: innerHeight, pos: getComputedStyle(stage).position, snap: getComputedStyle(document.documentElement).scrollSnapType };
    });
    assert.ok(r.h <= Math.max(r.vh, 560) + 1, `altura do banner ${r.h}px para um ecrã de ${r.vh}px`);
    assert.notEqual(r.pos, "sticky");
    assert.ok(!r.snap || r.snap === "none", "sem scroll snapping");
  });

  await step(`${tag} a animação avança sozinha (no tempo), sem precisar de scroll`, async () => {
    await page.waitForFunction(() => window.__viralizaHero.progress > 0.05, null, { timeout: 20000 });
    assert.equal(await page.evaluate(() => window.scrollY), 0, "a página não se moveu");
  });

  await step(`${tag} um gesto normal de scroll passa logo para a secção seguinte (antes de a animação terminar)`, async () => {
    assert.ok((await progress(page)) < 0.9, "animação ainda a decorrer");
    await page.mouse.move(vp.width / 2, vp.height / 2);
    const n = await wheelsToServices(page);
    const limit = Math.ceil((vp.height + 260) / 100) + 2; // um ecrã + faixa de transição
    assert.ok(n <= limit, `${n} gestos de roda (máximo ${limit})`);
  });

  await step(`${tag} fora do banner o 3D deixa de desenhar mas o tempo continua; ao voltar está na fase correspondente`, async () => {
    await page.waitForTimeout(400);
    const a = await progress(page);
    const draws0 = await page.evaluate(() => window.__draws);
    await page.waitForTimeout(1500);
    const [b, draws1, gated] = await page.evaluate(() => [window.__viralizaHero.progress, window.__draws, window.__viralizaHero.prepared]);
    // (a sequência só espera numa fronteira de fase ainda não preparada na GPU)
    assert.ok(b > a || (gated < 2 && b > 0.39), `o tempo continua fora do ecrã (${a} → ${b})`);
    // (a preparação da GPU, se ainda decorrer, continua fora do ecrã com desenhos de 4×4 px)
    if (gated >= 2) assert.equal(draws1 - draws0, 0, "sem desenho 3D fora do ecrã");
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    assert.ok((await progress(page)) >= b, "ao voltar, continua a partir da fase correspondente (nunca recua)");
  });

  await step(`${tag} scroll rápido e repetido não prende a página nem faz recuar a animação`, async () => {
    const p0 = await progress(page);
    for (let i = 0; i < 12; i++) {
      await page.mouse.wheel(0, i % 2 ? -900 : 900);
      await page.waitForTimeout(30);
    }
    await page.mouse.wheel(0, 3000);
    await page.waitForFunction(() => document.getElementById("servicos").getBoundingClientRect().top < innerHeight / 2, null, { timeout: 10000 });
    assert.ok((await progress(page)) >= p0, "a animação nunca recua com o scroll");
    await page.evaluate(() => window.scrollTo(0, 0));
  });

  await step(`${tag} estado final mostra título, subtítulo, CTAs e preço`, async () => {
    await seekP(page, 1);
    await waitP(page, 1);
    await page.waitForTimeout(300);
    assert.ok(await page.locator("#hero-title").isVisible());
    assert.ok(await page.getByText("Transformamos momentos em experiências memoráveis.").first().isVisible());
    assert.ok(await page.locator("[data-reveal-cta]").first().isVisible());
  });

  await step(`${tag} a página continua logo depois do banner (sem saltos)`, async () => {
    // banner → faixa de transição escuro→prata → Serviços, sem espaços nem sobreposições
    const [band, bandH, serv, heroH] = await page.evaluate(() => {
      const b = document.querySelector(".silver-transition").getBoundingClientRect();
      return [b.top, b.height, document.getElementById("servicos").getBoundingClientRect().top, document.getElementById("inicio").offsetHeight];
    });
    assert.ok(Math.abs(band - heroH) < 2, `transição começa logo após o banner (top=${band})`);
    assert.ok(Math.abs(serv - (heroH + bandH)) < 2, `serviços começa logo após a transição (top=${serv})`);
  });

  await step(`${tag} SALTAR INTRODUÇÃO vai para o estado final sem mover a página`, async () => {
    await page.evaluate(() => window.scrollTo(0, 0));
    await seekP(page, 0.2);
    await page.getByRole("button", { name: "Saltar introdução" }).click();
    await waitP(page, 1);
    assert.ok(await page.locator("#hero-title").isVisible());
    assert.equal(await page.evaluate(() => window.scrollY), 0);
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

  await step(`${tag} tabela de preços: "Reservar" selecciona o pacote (preço fixo)`, async () => {
    await page.evaluate(() => (window.__opened = []));
    await page.locator("#precos").scrollIntoViewIfNeeded();
    const t = page.locator("#precos");
    for (const s of ["40.000 Kz", "80.000 Kz", "120.000 Kz", "Não incluem edição, montagem, pós-produção ou finalização dos vídeos pela equipa Viraliza."]) assert.ok((await t.textContent()).includes(s), `falta "${s}"`);
    await t.getByRole("button", { name: "Reservar Profissional" }).click();
    const f = page.locator("#reserva form");
    await page.waitForFunction(() => document.querySelector('[data-testid="plan-name"]')?.textContent?.includes("Profissional"));
    assert.equal(await f.locator('[name="plan"]').inputValue(), "profissional");
    assert.equal((await f.getByTestId("estimate").textContent()).trim(), "200.000 Kz");
    // mudar as horas NÃO multiplica o pacote
    await f.getByRole("button", { name: "Mais uma hora" }).click();
    assert.equal((await f.getByTestId("estimate").textContent()).trim(), "200.000 Kz");
    await f.getByRole("button", { name: /Solicitar reserva pelo WhatsApp/i }).click();
    const opened = await page.evaluate(() => window.__opened);
    assert.equal(opened.length, 1);
    const text = decodeURIComponent(opened[0].split("text=")[1]);
    assert.ok(opened[0].startsWith("https://wa.me/244973581978?text="));
    for (const s of ["Pacote Profissional", "200.000 Kz (pacote)", "Ana Teste", "pré-reserva"]) assert.ok(text.toLowerCase().includes(s.toLowerCase()), `falta "${s}"`);
    assert.ok(!text.includes("800.000"), "o pacote não deve ser multiplicado");
    // voltar à gravação bruta: 1h
    await page.locator("#precos").getByRole("button", { name: /^Reservar 1 hora/ }).click();
    await page.waitForFunction(() => document.querySelector('[data-testid="estimate"]')?.textContent?.trim() === "40.000 Kz");
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

await step("[reduced-motion] mostra versão estática sem WebGL e o scroll segue livre", async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "networkidle" });
  assert.equal(await page.locator("canvas").count(), 0);
  assert.ok(await page.locator("#hero-title").isVisible());
  await page.mouse.move(640, 400);
  const n = await wheelsToServices(page);
  assert.ok(n <= 14, `${n} gestos até à secção seguinte`);
  await ctx.close();
});

// ---------------------------------------------------------------------------
// Toque (swipe real via CDP) em viewports de Android e iPhone
// ---------------------------------------------------------------------------
for (const [name, dev] of [["android", devices["Pixel 7"]], ["iphone", devices["iPhone 13"]]]) {
  await step(`[${name}] swipe durante a introdução (antes de o 3D estar pronto) passa para a secção seguinte em ≤ 3 gestos`, async () => {
    const ctx = await browser.newContext({ ...dev });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    const cdp = await ctx.newCDPSession(page);
    await page.goto(URL + "?quality=low", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector("[data-hero-poster] img")?.naturalWidth > 0, null, { timeout: 20000 });
    const vh = await page.evaluate(() => innerHeight);
    const swipe = async (dy) => {
      const x = 180, y0 = Math.round(vh * 0.8), steps = 8;
      const pts = (y) => [{ x, y, radiusX: 4, radiusY: 4, force: 1, id: 1 }];
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: pts(y0) });
      for (let k = 1; k <= steps; k++) {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: pts(Math.round(y0 - (dy * k) / steps)) });
        await page.waitForTimeout(12);
      }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    };
    let n = 0;
    while (n < 6 && (await page.evaluate(() => document.getElementById("servicos").getBoundingClientRect().top)) > 2) {
      const y = await page.evaluate(() => scrollY);
      await swipe(Math.round(vh * 0.55));
      n++;
      // o documento responde ao gesto (não fica preso no banner)
      await page.waitForFunction((y) => scrollY > y, y, { timeout: 3000 });
    }
    assert.ok(n <= 3, `${n} swipes até à secção seguinte`);
    // e volta ao topo com swipes no sentido inverso
    for (let i = 0; i < 4 && (await page.evaluate(() => scrollY)) > 0; i++) await swipe(-Math.round(vh * 0.6));
    await page.waitForFunction(() => scrollY === 0, null, { timeout: 5000 });
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}

// ---------------------------------------------------------------------------
// Mudança de rota: sair da página e voltar (histórico) — sem erros, um só contexto WebGL
// ---------------------------------------------------------------------------
await step("[rota] sair para outra página e voltar: o banner volta a funcionar, sem erros nem contextos duplicados", async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(URL + "?quality=low", { waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-scene-ready]", { timeout: 120000 });
  await page.goto(URL + "/pagina-que-nao-existe", { waitUntil: "domcontentloaded" });
  await page.goBack({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("[data-scene-ready]", { timeout: 120000 });
  assert.equal(await page.locator("#inicio canvas:not([data-dust])").count(), 1);
  await page.waitForFunction(() => window.__viralizaHero.progress > 0.02, null, { timeout: 20000 });
  await page.mouse.move(640, 360);
  assert.ok((await wheelsToServices(page)) <= 12);
  assert.deepEqual(errors, []);
  await ctx.close();
});

// ---------------------------------------------------------------------------
// Carregamento progressivo e fluidez
// ---------------------------------------------------------------------------
await step("[carregamento] o 1.º ecrã vem no HTML (imagem inicial prioritária, sem ecrã preto bloqueante)", async () => {
  const ctx = await browser.newContext();
  const html = await (await ctx.request.get(URL)).text();
  assert.ok(html.includes("data-hero-poster"), "imagem inicial no HTML");
  assert.ok(/\/hero\/poster-[a-z0-9-]+\.avif/.test(html), "AVIF");
  assert.ok(/fetchpriority="high"/i.test(html), "prioridade alta");
  const loader = html.match(/<div[^>]*data-hero-loader[^>]*>/)?.[0] ?? "";
  assert.ok(loader.includes("pointer-events-none") && !loader.includes("inset-0"), "o indicador não cobre o ecrã nem bloqueia cliques");
  await ctx.close();
});

await step("[carregamento] navegação livre enquanto o motor 3D carrega; troca suave para a cena", async () => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  // atrasa as texturas da câmara: a cena 3D fica "a carregar" durante alguns segundos
  let release;
  const gate = new Promise((r) => (release = r));
  await page.route("**/textures/camera/**", async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto(URL + "?quality=low", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.querySelector("[data-hero-poster] img")?.naturalWidth > 0, null, { timeout: 15000 });
  assert.equal(await page.locator("[data-scene-ready]").count(), 0, "a cena ainda está a carregar");
  const box = await page.locator("[data-hero-loader]").boundingBox();
  assert.ok(box && box.height < 80 && box.width < 1440 * 0.5, "indicador discreto");
  const atCenter = await page.evaluate(() => document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.closest("[data-hero-loader]"));
  assert.equal(atCenter, null, "o centro do ecrã não está tapado pelo indicador");
  // o utilizador já pode navegar e saltar a introdução
  await page.getByRole("button", { name: "Saltar introdução" }).click();
  await page.waitForFunction(() => window.__viralizaHero.progress > 0.99, null, { timeout: 10000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('header a[href="#servicos"]').first().click();
  await page.waitForFunction(() => Math.abs(document.getElementById("servicos").getBoundingClientRect().top) < 120, null, { timeout: 10000 });
  // liberta as texturas: a cena fica pronta e a imagem inicial sai (sem flash: transição de opacidade)
  release();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForSelector("[data-scene-ready]", { timeout: 120000 });
  await page.waitForFunction(() => !document.querySelector("[data-hero-poster]"), null, { timeout: 5000 });
  await ctx.close();
});

await step("[fluidez] depois da preparação em segundo plano, nenhum shader é compilado durante a animação", async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    window.__links = 0;
    for (const C of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
      const o = C?.prototype.linkProgram;
      if (o) C.prototype.linkProgram = function (p) { window.__links++; return o.call(this, p); };
    }
  });
  await page.goto(URL + "?quality=low&perf", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__viralizaHero?.prepared >= 2, null, { timeout: 300000, polling: 500 });
  await page.waitForTimeout(1500);
  const before = await page.evaluate(() => window.__links);
  // percorre todas as fases em pontos exactos (leitor em pausa para posições deterministas)
  await page.evaluate(() => window.__viralizaPlayer.setPaused(true));
  for (const p of [0.1, 0.3, 0.41, 0.45, 0.5, 0.56, 0.62, 0.7, 0.8, 0.9, 1, 0.6, 0.45, 0.2, 0]) {
    await seekP(page, p);
    await waitP(page, p);
    await page.waitForTimeout(150);
  }
  const after = await page.evaluate(() => window.__links);
  assert.equal(after - before, 0, `${after - before} shaders compilados durante a animação`);
  await ctx.close();
});

// ---------------------------------------------------------------------------
// Sequência automática completa: termina, sem loop, e o 3D deixa de desenhar
// ---------------------------------------------------------------------------
await step("[automático] começa sem interacção, passa por todas as fases, termina montado, sem loop, e pára de desenhar", async () => {
  const ctx = await browser.newContext({ viewport: { width: 640, height: 360 } });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    window.__draws = 0;
    for (const C of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
      const o = C?.prototype.drawElements;
      if (o) C.prototype.drawElements = function (...a) { window.__draws++; return o.apply(this, a); };
    }
    window.__seen = [];
    const t = setInterval(() => {
      const h = window.__viralizaHero;
      if (h) window.__seen.push(h.progress);
    }, 100);
  });
  // nenhuma interacção: só carregar a página
  await page.goto(URL + "?quality=low", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__viralizaPlayer?.finished, null, { timeout: 600000, polling: 500 });
  const seen = await page.evaluate(() => window.__seen);
  for (const [name, p] of [["câmara", 0.2], ["luzes", 0.45], ["estúdio", 0.7], ["revelação", 0.95]]) assert.ok(seen.some((x) => x >= p), `passou pela fase ${name}`);
  for (let i = 1; i < seen.length; i++) assert.ok(seen[i] >= seen[i - 1] - 1e-9, "o progresso nunca recua");
  assert.equal(await progress(page), 1);
  assert.ok(await page.locator("#hero-title").isVisible(), "estado final com o título");
  // sem loop: continua no fim; o desenho pára depois de o estado final assentar
  await page.waitForTimeout(3000);
  const d0 = await page.evaluate(() => window.__draws);
  await page.waitForTimeout(3000);
  const d1 = await page.evaluate(() => window.__draws);
  assert.equal(await progress(page), 1, "não recomeça");
  assert.equal(d1 - d0, 0, `o 3D deixou de desenhar no fim (${d1 - d0} draws em 3 s)`);
  // botão comercial funcional no estado final
  await page.locator('[data-reveal-cta][href="#reserva"]').click();
  await page.waitForFunction(() => Math.abs(document.getElementById("reserva").getBoundingClientRect().top) < 120, null, { timeout: 10000 });
  await ctx.close();
});

await step("[orientação] rodar o ecrã a meio da sequência não a reinicia", async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(URL + "?quality=low", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__viralizaHero?.progress > 0.08, null, { timeout: 120000 });
  const a = await progress(page);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(1200);
  const b = await progress(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1200);
  const c = await progress(page);
  assert.ok(b >= a && c >= b, `sem reinício (${a} → ${b} → ${c})`);
  assert.equal(await page.locator("#inicio canvas:not([data-dust])").count(), 1, "um só canvas");
  await ctx.close();
});

// ---------------------------------------------------------------------------
// Detecção automática de qualidade SEM ?quality (condições normais de utilização).
// O nome da GPU, os núcleos e a memória são os que um navegador real reportaria
// (simulados aqui); o desenho continua a ser feito pelo WebGL por software deste ambiente.
// ---------------------------------------------------------------------------
const spoof = (gpu, cores, memory) => ({ gpu, cores, memory });
for (const [name, ctxOpts, env, expect3D] of [
  ["desktop com GPU dedicada (NVIDIA)", { viewport: { width: 960, height: 540 } }, spoof("ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0)", 12, 16), true],
  ["iPhone 13 (Apple GPU; Safari reporta 2 núcleos)", { ...devices["iPhone 13"] }, spoof("Apple GPU", 2, undefined), true],
  ["Android de gama média (Adreno, 8 núcleos, 4 GB)", { ...devices["Pixel 7"] }, spoof("Adreno (TM) 642L", 8, 4), true],
  ["Android modesto (2 GB) → composição estática", { ...devices["Pixel 7"] }, spoof("Mali-G52", 8, 2), false],
  ["sem GPU real (renderização por software) → composição estática", { viewport: { width: 960, height: 540 } }, null, false],
]) {
  await step(`[detecção automática] ${name}`, async () => {
    const ctx = await browser.newContext(ctxOpts);
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    if (env)
      await page.addInitScript((env) => {
        for (const C of [WebGLRenderingContext, WebGL2RenderingContext]) {
          const o = C.prototype.getParameter;
          C.prototype.getParameter = function (p) {
            if (p === 0x9246 || p === 0x1f01) return env.gpu; // UNMASKED_RENDERER_WEBGL / RENDERER
            return o.call(this, p);
          };
        }
        Object.defineProperty(Navigator.prototype, "hardwareConcurrency", { get: () => env.cores });
        Object.defineProperty(Navigator.prototype, "deviceMemory", { get: () => env.memory });
      }, env);
    await page.goto(URL, { waitUntil: "domcontentloaded" }); // sem ?quality
    if (expect3D) {
      await page.waitForSelector("[data-scene-ready]", { timeout: 180000 });
      assert.equal(await page.locator("#inicio canvas:not([data-dust])").count(), 1, "cena 3D");
      // começa sozinha, sem interacção
      await page.waitForFunction(() => window.__viralizaHero.progress > 0.02, null, { timeout: 60000 });
    } else {
      await page.waitForSelector("#hero-title", { timeout: 20000 });
      assert.equal(await page.locator("canvas").count(), 0, "composição estática (sem WebGL)");
      assert.ok(await page.locator("#hero-title").isVisible());
    }
    assert.deepEqual(errors, []);
    await ctx.close();
  });
}

await browser.close();

await step("[sem WebGL] usa sequência de imagens e mantém a navegação", async () => {
  const b = await chromium.launch({ args: ["--disable-webgl", "--disable-webgl2", "--disable-3d-apis"] });
  const page = await b.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(URL, { waitUntil: "networkidle" });
  assert.equal(await page.locator("canvas:not([data-dust])").count(), 0);
  assert.ok(await page.locator('#inicio img[src*="parte3-montada"]').first().isVisible(), "fallback mostra a câmara oficial (imagem única)");
  await page.getByRole("button", { name: "Saltar introdução" }).click();
  await page.waitForFunction(() => window.__viralizaHero.progress > 0.99, null, { timeout: 10000 });
  await b.close();
});

for (const r of results) console.log(r.join("  "));
const failed = results.filter((r) => r[0] === "✘").length;
console.log(`\n${results.length - failed}/${results.length} verificações passaram`);
process.exit(failed ? 1 : 0);
