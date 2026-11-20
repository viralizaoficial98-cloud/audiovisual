"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { heroState } from "@/animation/heroState";
import type { QualityTier } from "@/lib/quality";

/**
 * Um único useFrame percorre todos os "updaters" registados pelas peças.
 * Cada updater recebe o progresso global p e calcula o seu estado de forma pura
 * (posição = f(p)), por isso a animação é totalmente reversível: scroll para cima
 * produz exactamente o estado inverso.
 */
export type Updater = (p: number, time: number, dt: number) => void;

type Ctx = {
  add: (u: Updater) => () => void;
  tier: QualityTier;
  /**
   * Aplica, de forma síncrona, o estado de TODA a cena para o progresso p (sem desenhar).
   * Usado no "aquecimento" da GPU: coloca a cena no estado de uma fase futura, prepara os
   * shaders dessa fase e repõe o estado actual na mesma tarefa — nada chega ao ecrã.
   */
  applyAt: (p: number, time?: number) => void;
};
const DriverCtx = createContext<Ctx | null>(null);

export function AnimationDriver({ children, tier }: { children: ReactNode; tier: QualityTier }) {
  const set = useRef(new Set<Updater>());
  const clock = useRef(0);
  const ctx = useRef<Ctx>({
    add: (u) => {
      set.current.add(u);
      return () => set.current.delete(u);
    },
    tier,
    applyAt: (p, time = clock.current) => set.current.forEach((u) => u(p, time, 0)),
  });
  ctx.current.tier = tier;

  useFrame((state, dt) => {
    const p = heroState.progress;
    const t = state.clock.elapsedTime;
    clock.current = t;
    set.current.forEach((u) => u(p, t, dt));
  });

  return <DriverCtx.Provider value={ctx.current}>{children}</DriverCtx.Provider>;
}

/** Regista uma função chamada a cada frame com o progresso global. */
export function useAnim(fn: Updater) {
  const ctx = useContext(DriverCtx);
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!ctx) return;
    return ctx.add((p, t, dt) => ref.current(p, t, dt));
  }, [ctx]);
}

/** Acesso ao driver (aquecimento da GPU por fase). */
export function useDriver() {
  return useContext(DriverCtx);
}

export function useTier(): QualityTier {
  return useContext(DriverCtx)?.tier ?? "medium";
}
