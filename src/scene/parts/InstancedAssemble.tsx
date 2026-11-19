"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { ease as E, range, type Ease, type Vec3 } from "@/animation/math";
import { useAnim } from "./driver";

export type InstanceSpec = {
  position: Vec3;
  rotation?: Vec3;
  scale?: Vec3;
  /** Deslocamento inicial (desmontado). */
  from: Vec3;
  /** Rotação inicial adicional. */
  fromRot?: Vec3;
};

/**
 * Muitas peças iguais (painéis acústicos, ripas) num único draw call, cada uma com
 * a sua própria trajectória e um atraso escalonado dentro da janela.
 */
export function InstancedAssemble({
  items,
  geometry,
  material,
  at,
  stagger = 0.6,
  ease = E.outCubic,
  fromScale = 0.001,
}: {
  items: InstanceSpec[];
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  at: readonly [number, number];
  /** Fracção da janela usada para escalonar (0 = todos juntos). */
  stagger?: number;
  ease?: Ease;
  fromScale?: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const o = useMemo(() => new THREE.Object3D(), []);
  const last = useRef(-1);
  const n = items.length;

  useAnim((p) => {
    const m = ref.current;
    if (!m) return;
    // fora da janela o estado é estável: só recalcula quando o valor efectivo muda
    const cp = Math.min(Math.max(p, at[0] - 1e-4), at[1] + 1e-4);
    if (cp === last.current) return;
    last.current = cp;
    const span = at[1] - at[0];
    const each = span * (1 - stagger);
    let anyVisible = false;
    for (let i = 0; i < n; i++) {
      const it = items[i];
      const a = at[0] + (n > 1 ? (i / (n - 1)) * span * stagger : 0);
      const raw = range(p, a, a + each);
      const t = ease(raw);
      const k = 1 - t;
      const s = fromScale + (1 - fromScale) * Math.min(1, raw * 3);
      const sc = it.scale ?? [1, 1, 1];
      o.position.set(it.position[0] + it.from[0] * k, it.position[1] + it.from[1] * k, it.position[2] + it.from[2] * k);
      const r = it.rotation ?? [0, 0, 0];
      const fr = it.fromRot ?? [0, 0, 0];
      o.rotation.set(r[0] + fr[0] * k, r[1] + fr[1] * k, r[2] + fr[2] * k);
      const vis = raw > 0;
      anyVisible ||= vis;
      const ss = vis ? s : 0.0001;
      o.scale.set(sc[0] * ss, sc[1] * ss, sc[2] * ss);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    m.visible = anyVisible;
  });

  return <instancedMesh ref={ref} args={[geometry, material, n]} castShadow receiveShadow frustumCulled={false} />;
}
