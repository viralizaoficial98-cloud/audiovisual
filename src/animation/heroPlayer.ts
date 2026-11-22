import type { gsap } from "gsap";
import { HERO_DURATION_S, sceneToTime } from "./phases";
import { heroState } from "./heroState";

/**
 * Leitor da sequência cinematográfica. A montagem avança no TEMPO, independentemente do
 * scroll da página (que é sempre nativo e livre):
 *  - reproduz só enquanto o banner está visível (≥ 35%) e o separador está activo;
 *  - ao sair do banner pausa; ao voltar retoma do mesmo ponto (estado consistente);
 *  - "Saltar introdução" vai para o estado final sem mover a página;
 *  - se a fase seguinte ainda não estiver preparada na GPU, é a ANIMAÇÃO que espera uns
 *    instantes na fronteira da fase — nunca o scroll do utilizador.
 * Um único ciclo de requestAnimationFrame, parado quando não há nada a animar.
 */
export type HeroPlayer = {
  /** A cena está pronta: a sequência pode começar. */
  start: () => void;
  /** Banner visível (≥ 35%) ou não. */
  setVisible: (v: boolean) => void;
  skip: () => void;
  /** Fracção do tempo (0–1) — usado por testes e diagnóstico. */
  seek: (u: number) => void;
  readonly time: number;
  destroy: () => void;
};

/** Fronteiras de fase (cena) que exigem o estágio da GPU preparado. */
const GATES: Array<[number, number]> = [
  [0.3985, 1], // kit de iluminação
  [0.549, 2], // estúdio
];

export function createHeroPlayer(tl: gsap.core.Timeline, opts: { gated: boolean; duration?: number; introHold?: number }): HeroPlayer {
  const duration = opts.duration ?? HERO_DURATION_S;
  // pausa inicial no título de abertura (legível) antes de a montagem começar
  const introHold = (opts.introHold ?? 2.5) * 1000;
  let holdUntil = 0;
  let started = false;
  let visible = true;
  let raf = 0;
  let last = 0;
  let u = heroState.time;

  const limit = () => {
    if (!opts.gated) return 1;
    for (const [p, stage] of GATES) if (heroState.prepared < stage) return sceneToTime(p);
    return 1;
  };
  const apply = () => {
    heroState.time = u;
    tl.progress(u);
  };
  const playing = () => started && visible && u < 1 && !document.hidden;

  const tick = (now: number) => {
    raf = 0;
    if (!playing()) return;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0; // sem saltos depois de pausas
    last = now;
    if (now < holdUntil) {
      raf = requestAnimationFrame(tick);
      return;
    }
    // a fronteira de uma fase por preparar só impede de AVANÇAR (nunca faz recuar)
    const lim = limit();
    const next = u >= lim ? u : Math.min(lim, u + dt / duration);
    if (next !== u) {
      u = next;
      apply();
    }
    raf = requestAnimationFrame(tick);
  };
  const kick = () => {
    if (raf || !playing()) return;
    last = 0;
    raf = requestAnimationFrame(tick);
  };
  const onVis = () => kick();
  document.addEventListener("visibilitychange", onVis);
  apply();

  return {
    start() {
      if (started) return;
      started = true;
      if (u === 0) holdUntil = performance.now() + introHold;
      kick();
    },
    setVisible(v) {
      visible = v;
      kick();
    },
    skip() {
      u = 1;
      apply();
    },
    seek(t) {
      u = Math.max(0, Math.min(1, t));
      apply();
      kick();
    },
    get time() {
      return u;
    },
    destroy() {
      cancelAnimationFrame(raf);
      raf = 0;
      document.removeEventListener("visibilitychange", onVis);
    },
  };
}
