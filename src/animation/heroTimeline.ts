import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { OVERLAY_TIMING } from "./phases";
import { setHeroProgress } from "./heroState";

/**
 * Timeline principal da experiência. Uma única timeline GSAP com duração 1 (= progresso),
 * controlada por ScrollTrigger com scrub. Ela anima:
 *  1. o objecto `progress` lido pela cena WebGL a cada frame (montagem 3D);
 *  2. os textos de cada fase (DOM), organizados por funções independentes.
 * Por ser scrubbed, é reversível por definição: scroll para cima = timeline para trás.
 */

const q = (root: HTMLElement, sel: string) => Array.from(root.querySelectorAll<HTMLElement>(sel));

function words(root: HTMLElement, phase: string) {
  return q(root, `[data-phase="${phase}"] [data-word]`);
}

/** Entrada de uma fase: palavras sobem de dentro da máscara, com stagger. */
function phaseIn(tl: gsap.core.Timeline, root: HTMLElement, phase: string, [a, b]: readonly [number, number]) {
  const block = q(root, `[data-phase="${phase}"]`);
  const span = b - a;
  tl.fromTo(block, { autoAlpha: 0 }, { autoAlpha: 1, duration: span * 0.25 }, a);
  tl.fromTo(words(root, phase), { yPercent: 115, rotate: 4 }, { yPercent: 0, rotate: 0, duration: span * 0.75, stagger: span * 0.06, ease: "power3.out" }, a);
  tl.fromTo(q(root, `[data-phase="${phase}"] [data-fade]`), { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: span * 0.6, ease: "power2.out" }, a + span * 0.35);
}

/** Saída de uma fase: palavras saem para cima e o bloco desvanece. */
function phaseOut(tl: gsap.core.Timeline, root: HTMLElement, phase: string, [a, b]: readonly [number, number]) {
  const span = b - a;
  tl.to(words(root, phase), { yPercent: -115, duration: span * 0.8, stagger: span * 0.04, ease: "power2.in" }, a);
  tl.to(q(root, `[data-phase="${phase}"] [data-fade]`), { autoAlpha: 0, y: -12, duration: span * 0.6 }, a);
  tl.to(q(root, `[data-phase="${phase}"]`), { autoAlpha: 0, duration: span * 0.3 }, b - span * 0.3);
}

export function buildHeroTimeline(section: HTMLElement, stage: HTMLElement, opts: { scrub: number }) {
  gsap.registerPlugin(ScrollTrigger);

  const state = { progress: 0 };
  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      scrub: opts.scrub,
      invalidateOnRefresh: true,
    },
  });

  // 1) progresso global para a cena 3D (linear: o easing vive em cada peça)
  tl.to(state, { progress: 1, duration: 1, onUpdate: () => setHeroProgress(state.progress) }, 0);

  // 2) textos por fase
  const T = OVERLAY_TIMING;
  // Fase 1 — já visível no carregamento; sai quando a montagem começa
  phaseOut(tl, stage, "intro", T.intro.out);
  tl.to(q(stage, "[data-scroll-hint]"), { autoAlpha: 0, y: 20, duration: 0.04 }, 0.015);

  phaseIn(tl, stage, "camera", T.camera.in);
  phaseOut(tl, stage, "camera", T.camera.out);

  phaseIn(tl, stage, "lights", T.lights.in);
  phaseOut(tl, stage, "lights", T.lights.out);

  phaseIn(tl, stage, "studio", T.studio.in);
  phaseOut(tl, stage, "studio", T.studio.out);

  // Fase 5 — revelação: escurecimento para legibilidade, título, subtítulo e botões
  tl.fromTo(q(stage, "[data-reveal-shade]"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.08 }, T.reveal.in[0] - 0.02);
  phaseIn(tl, stage, "reveal", T.reveal.in);
  tl.fromTo(
    q(stage, "[data-reveal-cta]"),
    { autoAlpha: 0, y: 24 },
    { autoAlpha: 1, y: 0, duration: 0.05, stagger: 0.012, ease: "power2.out" },
    T.reveal.in[1] - 0.04,
  );
  // pausa final: mantém o estado completo antes de libertar o scroll
  tl.to({}, { duration: 0.0001 }, 1);

  return tl;
}

export { ScrollTrigger };
