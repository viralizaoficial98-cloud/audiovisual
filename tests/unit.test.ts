import { test } from "node:test";
import assert from "node:assert/strict";
import { estimatePodcast, formatDatePt, formatKz } from "@/lib/format";
import { buildMessage, mailtoLink, whatsappLink } from "@/lib/whatsapp";
import { isEmail, isFutureOrToday, isPhone, validateBooking, validateContact } from "@/lib/validation";
import { clamp, ease, range, sampleKeys } from "@/animation/math";
import { LIGHTS, PHASES, STUDIO_STEPS } from "@/animation/phases";
import { CAMERA_KEYS } from "@/scene/CameraRig";

test("preço da sala: 40.000 Kz por hora", () => {
  assert.equal(formatKz(estimatePodcast(1)), "40.000 Kz");
  assert.equal(formatKz(estimatePodcast(2)), "80.000 Kz");
  assert.equal(formatKz(estimatePodcast(3)), "120.000 Kz");
  assert.equal(estimatePodcast(0), 0);
  assert.equal(formatDatePt("2026-12-05"), "05/12/2026");
});

test("links de WhatsApp e e-mail", () => {
  assert.equal(whatsappLink(), "https://wa.me/244973581978");
  const l = whatsappLink("Olá & bom dia");
  assert.ok(l.startsWith("https://wa.me/244973581978?text="));
  assert.equal(decodeURIComponent(l.split("text=")[1]), "Olá & bom dia");
  assert.ok(mailtoLink("Assunto teste").startsWith("mailto:comercial@viralizahost.com?subject=Assunto%20teste"));
  const msg = buildMessage("Título", [["Nome", "Ana"], ["Empresa", ""], ["Horas", 2]]);
  assert.equal(msg, "*Título*\n\n*Nome:* Ana\n*Horas:* 2");
});

test("validações", () => {
  assert.ok(isEmail("a@b.co"));
  assert.ok(!isEmail("a@b"));
  assert.ok(isPhone("923 456 789"));
  assert.ok(isPhone("+244 973 581 978"));
  assert.ok(!isPhone("123"));
  const today = new Date(2026, 10, 19);
  assert.ok(isFutureOrToday("2026-11-19", today));
  assert.ok(!isFutureOrToday("2026-11-18", today));
  const ok = { name: "Ana Silva", company: "", phone: "923456789", email: "", date: "2099-01-01", time: "10:00", hours: 2, type: "Podcast em vídeo", participants: 2, notes: "" };
  assert.deepEqual(validateBooking(ok), {});
  const bad = validateBooking({ ...ok, name: "", hours: 0, date: "2000-01-01", time: "" });
  assert.deepEqual(Object.keys(bad).sort(), ["date", "hours", "name", "time"]);
  assert.ok(validateContact({ name: "Ana", email: "", phone: "", subject: "x", message: "olá olá olá" }).email);
});

test("fases da timeline são contínuas e ordenadas", () => {
  const order = [PHASES.exploded, PHASES.camera, PHASES.lights, PHASES.studio, PHASES.reveal];
  assert.equal(order[0].start, 0);
  assert.equal(order[order.length - 1].end, 1);
  for (let i = 1; i < order.length; i++) assert.equal(order[i].start, order[i - 1].end);
  for (const [a, b] of Object.values(LIGHTS)) assert.ok(a < b && a >= PHASES.lights.start - 0.01 && b <= PHASES.lights.end + 0.001);
  for (const [a, b] of Object.values(STUDIO_STEPS)) assert.ok(a < b && a >= PHASES.studio.start && b <= PHASES.reveal.start + 0.02);
  for (let i = 1; i < CAMERA_KEYS.length; i++) assert.ok(CAMERA_KEYS[i].at > CAMERA_KEYS[i - 1].at);
});

test("matemática da animação é reversível (pura)", () => {
  assert.equal(range(0.5, 0, 1), 0.5);
  assert.equal(range(-1, 0, 1), 0);
  assert.equal(clamp(2), 1);
  for (const f of Object.values(ease)) {
    assert.ok(Math.abs(f(0)) < 1e-9 && Math.abs(f(1) - 1) < 1e-9);
  }
  const keys = [{ at: 0, v: [0] }, { at: 0.5, v: [10] }, { at: 1, v: [20] }];
  const out = [0];
  const a = sampleKeys(keys, 0.3, out)[0];
  sampleKeys(keys, 0.9, out);
  assert.equal(sampleKeys(keys, 0.3, out)[0], a, "mesmo p → mesmo estado (ida e volta)");
  assert.equal(sampleKeys(keys, 1, out)[0], 20);
});

test("introdução fotográfica: janelas ordenadas e mapeamento scroll↔cena reversível", async () => {
  const { SHOWCASE, CAMERA_3D_FROM, sceneToScroll, scrollToScene, LIGHTS: L } = await import("@/animation/phases");
  const ws = Object.values(SHOWCASE);
  for (let i = 1; i < ws.length; i++) assert.equal(ws[i][0], ws[i - 1][1], "janelas contíguas");
  assert.equal(ws[0][0], 0);
  assert.ok(CAMERA_3D_FROM <= L.cameraMove[0], "a câmara 3D reaparece antes de partir para o tripé");
  let prev = -1;
  for (let i = 0; i <= 100; i++) {
    const t = i / 100;
    const p = scrollToScene(t);
    assert.ok(p >= prev, "monótono");
    prev = p;
    assert.ok(Math.abs(sceneToScroll(p) - t) < 1e-9, "inverso exacto");
  }
  assert.equal(scrollToScene(0), 0);
  assert.equal(scrollToScene(1), 1);
});
