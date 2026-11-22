import { gsap } from "gsap";
import { OVERLAY_TIMING, sceneToTime as S, timeToScene } from "./phases";
import { setHeroProgress } from "./heroState";

/**
 * Timeline principal da experiência: UMA timeline GSAP com duração 1 (= fracção do tempo da
 * sequência), em pausa — quem a faz avançar é o leitor (HeroPlayer, em CinematicHero), no
 * tempo, e NÃO o scroll. Ela anima:
 *  1. o progresso global lido pela cena WebGL a cada frame (montagem 3D);
 *  2. os textos de cada fase (DOM), organizados por funções independentes.
 *
 * Antes, a timeline estava presa ao scroll (ScrollTrigger + scrub) numa secção de 1120vh com o
 * palco "sticky": para passar o banner era preciso fazer scroll ~10 ecrãs. Agora o banner tem
 * a altura de um ecrã e o scroll da página é inteiramente nativo.
 */

const q = (root: HTMLElement, sel: string) => Array.from(root.querySelectorAll<HTMLElement>(sel));

function words(root: HTMLElement, phase: string) {
  return q(root, `[data-phase="${phase}"] [data-word]`);
}

/** Entrada de uma fase: palavras sobem de dentro da máscara, com stagger. */
function phaseIn(tl: gsap.core.Timeline, root: HTMLElement, phase: string, [pa, pb]: readonly [number, number]) {
  const [a, b] = [S(pa), S(pb)];
  const block = q(root, `[data-phase="${phase}"]`);
  const span = b - a;
  tl.fromTo(block, { autoAlpha: 0 }, { autoAlpha: 1, duration: span * 0.25 }, a);
  tl.fromTo(words(root, phase), { yPercent: 115, rotate: 4 }, { yPercent: 0, rotate: 0, duration: span * 0.75, stagger: span * 0.06, ease: "power3.out" }, a);
  tl.fromTo(q(root, `[data-phase="${phase}"] [data-fade]`), { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: span * 0.6, ease: "power2.out" }, a + span * 0.35);
}

/** Saída de uma fase: palavras saem para cima e o bloco desvanece. */
function phaseOut(tl: gsap.core.Timeline, root: HTMLElement, phase: string, [pa, pb]: readonly [number, number]) {
  const [a, b] = [S(pa), S(pb)];
  const span = b - a;
  tl.to(words(root, phase), { yPercent: -115, duration: span * 0.8, stagger: span * 0.04, ease: "power2.in" }, a);
  tl.to(q(root, `[data-phase="${phase}"] [data-fade]`), { autoAlpha: 0, y: -12, duration: span * 0.6 }, a);
  tl.to(q(root, `[data-phase="${phase}"]`), { autoAlpha: 0, duration: span * 0.3 }, b - span * 0.3);
}

export function buildHeroTimeline(stage: HTMLElement) {
  const state = { progress: 0 };
  const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });

  // 1) progresso global para a cena 3D (o easing vive em cada peça; as proporções entre
  //    fases vêm de timeToScene — ver phases.ts)
  tl.to(state, { progress: 1, duration: 1, ease: timeToScene, onUpdate: () => setHeroProgress(state.progress) }, 0);

  // 2) textos por fase
  const T = OVERLAY_TIMING;
  // Fase 1 — já visível no carregamento; sai quando a montagem começa
  phaseOut(tl, stage, "intro", T.intro.out);

  phaseIn(tl, stage, "camera", T.camera.in);
  phaseOut(tl, stage, "camera", T.camera.out);

  phaseIn(tl, stage, "lights", T.lights.in);
  phaseOut(tl, stage, "lights", T.lights.out);

  phaseIn(tl, stage, "studio", T.studio.in);
  phaseOut(tl, stage, "studio", T.studio.out);

  // o selo "deslize para descobrir" fica visível durante a montagem (convida a explorar a
  // página) e sai quando a revelação começa, para não tapar os botões
  tl.to(q(stage, "[data-scroll-hint]"), { autoAlpha: 0, y: 20, duration: 0.03 }, S(T.reveal.in[0] - 0.04));

  // Fase 5 — revelação: escurecimento para legibilidade, título, subtítulo e botões
  tl.fromTo(q(stage, "[data-reveal-shade]"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.08 }, S(T.reveal.in[0] - 0.02));
  phaseIn(tl, stage, "reveal", T.reveal.in);
  tl.fromTo(
    q(stage, "[data-reveal-cta]"),
    { autoAlpha: 0, y: 24 },
    { autoAlpha: 1, y: 0, duration: 0.025, stagger: 0.006, ease: "power2.out" },
    S(T.reveal.in[1] - 0.02),
  );
  tl.to({}, { duration: 0.0001 }, 1);
  // A timeline TEM de durar exactamente 1 (= 100% da sequência).
  if (process.env.NODE_ENV !== "production" && tl.duration() > 1.0001) {
    console.warn(`[heroTimeline] duração ${tl.duration().toFixed(4)} > 1 — o progresso vai desalinhar`);
  }
  return tl;
}
