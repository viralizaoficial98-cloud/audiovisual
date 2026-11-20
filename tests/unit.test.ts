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

test("montagem magnética: blocos ordenados, contíguos e mapeamento scroll↔cena reversível", async () => {
  const { ASSEMBLY, sceneToScroll, scrollToScene, LIGHTS: L, PHASES: P } = await import("@/animation/phases");
  const order = [ASSEMBLY.rest, ASSEMBLY.lift, ASSEMBLY.structure, ASSEMBLY.electronics, ASSEMBLY.lens, ASSEMBLY.body, ASSEMBLY.reveal];
  assert.equal(order[0][0], 0);
  for (let i = 1; i < order.length; i++) assert.ok(order[i][0] <= order[i - 1][1] + 1e-9 && order[i][0] >= order[i - 1][0], "blocos encadeados");
  assert.equal(ASSEMBLY.reveal[1], P.camera.end, "a revelação termina com a fase da câmara");
  assert.ok(L.cameraMove[0] >= ASSEMBLY.reveal[1], "a câmara só parte para o tripé depois de montada");
  let prev = -1;
  for (let i = 0; i <= 100; i++) {
    const t = i / 100;
    const p = scrollToScene(t);
    assert.ok(p >= prev, "monótono");
    prev = p;
    assert.ok(Math.abs(sceneToScroll(p) - t) < 1e-9, "inverso exacto");
  }
});

test("fase LUZ: 6 sub-fases contíguas, dentro da fase e depois da câmara", async () => {
  const { LIGHT_PHASES: LP, PHASES: P, ASSEMBLY, lightAt, scrollToScene } = await import("@/animation/phases");
  const seq = [LP.disassembled, LP.activation, LP.supports, LP.equipment, LP.power, LP.reveal];
  assert.equal(seq[0][0], P.lights.start);
  assert.equal(seq[seq.length - 1][1], P.lights.end);
  for (let i = 1; i < seq.length; i++) assert.ok(Math.abs(seq[i][0] - seq[i - 1][1]) < 1e-9);
  assert.ok(P.lights.start >= ASSEMBLY.reveal[1], "a luz começa depois de a câmara estar montada");
  assert.equal(lightAt(0), 0.4);
  assert.equal(lightAt(1), 0.55);
  // a câmara mantém o mesmo comprimento de scroll (0.407 do banner de 910vh ≈ 370vh)
  assert.ok(Math.abs(scrollToScene(0.407) - 0.4) < 1e-9);
});
