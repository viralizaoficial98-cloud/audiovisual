import { sceneToScroll, scrollToScene } from "./phases";

/**
 * Estado partilhado entre a timeline GSAP (escrita) e a cena WebGL (leitura por frame).
 * É um objecto mutável de propósito: actualizá-lo não provoca re-renders do React,
 * o que mantém o scroll a 60 FPS.
 */
export const heroState = {
  /** Progresso global da sequência (0 → 1), já suavizado pelo scrub do ScrollTrigger. */
  progress: 0,
  /** true quando a secção do banner está visível (a cena pausa o render fora do ecrã). */
  visible: true,
};

type Listener = (p: number) => void;
const listeners = new Set<Listener>();

export function setHeroProgress(p: number) {
  heroState.progress = p;
  listeners.forEach((l) => l(p));
}

export function onHeroProgress(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

// Exposto para testes automáticos (e2e) e depuração — apenas leitura.
if (typeof window !== "undefined") {
  const w = window as unknown as { __viralizaHero?: typeof heroState; __viralizaMap?: { sceneToScroll: typeof sceneToScroll; scrollToScene: typeof scrollToScene } };
  w.__viralizaHero = heroState;
  w.__viralizaMap = { sceneToScroll, scrollToScene };
}
