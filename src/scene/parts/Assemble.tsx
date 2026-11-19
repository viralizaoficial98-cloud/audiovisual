"use client";

import { useRef, type ReactNode } from "react";
import type { Group } from "three";
import { ease as E, hash, range, type Ease, type Vec3 } from "@/animation/math";
import { useAnim } from "./driver";

export type AssembleFrom = {
  /** Deslocamento de posição no estado desmontado (relativo à posição final). */
  p?: Vec3;
  /** Rotação adicional (radianos) no estado desmontado. */
  r?: Vec3;
  /** Escala inicial (multiplicativa). 1 = sem alteração. */
  s?: number | Vec3;
};

type Props = {
  children?: ReactNode;
  /** Janela [início, fim] em progresso global durante a qual a peça encaixa. */
  at: readonly [number, number];
  from?: AssembleFrom;
  ease?: Ease;
  position?: Vec3;
  rotation?: Vec3;
  scale?: number | Vec3;
  /** Amplitude da flutuação enquanto a peça está solta no espaço (metros). */
  bob?: number;
  /**
   * Multiplicador opcional do deslocamento em função de p (ex.: na fase 1 as peças
   * afastam-se ligeiramente mais antes de começarem a montar).
   */
  spread?: (p: number) => number;
  /** Esconde a peça antes da janela começar (útil para peças que entram por escala). */
  hideBefore?: boolean;
  /** Callback extra com o progresso local já suavizado (0..1). */
  onT?: (t: number, p: number, time: number) => void;
  name?: string;
};

const toVec = (s: number | Vec3 | undefined): Vec3 => (s === undefined ? [1, 1, 1] : typeof s === "number" ? [s, s, s] : s);

let seedCounter = 0;

/**
 * Componente base da montagem: interpola posição, rotação e escala de um grupo entre
 * o estado "desmontado" (from) e o estado final (props position/rotation/scale).
 * Opacidade não é usada — as peças movem-se fisicamente para o lugar.
 */
export function Assemble({
  children,
  at,
  from = {},
  ease = E.inOutCubic,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale,
  bob = 0,
  spread,
  hideBefore = false,
  onT,
  name,
}: Props) {
  const ref = useRef<Group>(null);
  const seed = useRef(++seedCounter * 1.731);
  const fp = from.p ?? [0, 0, 0];
  const fr = from.r ?? [0, 0, 0];
  const fs = toVec(from.s);
  const bs = toVec(scale);

  useAnim((p, time) => {
    const g = ref.current;
    if (!g) return;
    const raw = range(p, at[0], at[1]);
    const t = ease(raw);
    const k = 1 - t;
    const m = spread ? spread(p) : 1;
    const loose = 1 - E.outCubic(raw); // 1 enquanto solta, 0 encaixada

    let bx = 0,
      by = 0,
      br = 0;
    if (bob > 0 && loose > 0.001) {
      const s = seed.current;
      bx = Math.sin(time * 0.53 + s) * bob * 0.6 * loose;
      by = Math.sin(time * 0.71 + s * 2.1) * bob * loose;
      br = Math.sin(time * 0.37 + s * 3.7) * bob * 1.6 * loose;
    }

    g.position.set(position[0] + fp[0] * k * m + bx, position[1] + fp[1] * k * m + by, position[2] + fp[2] * k * m);
    g.rotation.set(rotation[0] + fr[0] * k + br, rotation[1] + fr[1] * k + br * 0.6, rotation[2] + fr[2] * k);

    const sx = bs[0] * (fs[0] + (1 - fs[0]) * t);
    const sy = bs[1] * (fs[1] + (1 - fs[1]) * t);
    const sz = bs[2] * (fs[2] + (1 - fs[2]) * t);
    g.scale.set(Math.max(sx, 1e-4), Math.max(sy, 1e-4), Math.max(sz, 1e-4));

    g.visible = !(hideBefore && raw <= 0.0001);
    onT?.(t, p, time);
  });

  return (
    <group ref={ref} name={name} position={position} rotation={rotation}>
      {children}
    </group>
  );
}

/** Gera um deslocamento pseudo-aleatório estável para peças repetidas. */
export function scatter(i: number, amp: Vec3, base: Vec3 = [0, 0, 0]): Vec3 {
  return [base[0] + (hash(i) - 0.5) * 2 * amp[0], base[1] + (hash(i + 17) - 0.5) * 2 * amp[1], base[2] + (hash(i + 41) - 0.5) * 2 * amp[2]];
}
