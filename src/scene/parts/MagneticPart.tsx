"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { clamp, ease, range, type Vec3 } from "@/animation/math";
import { useAnim, useTier } from "./driver";

/**
 * MONTAGEM MAGNÉTICA — cada peça da câmara é um objecto 3D com o seu próprio percurso:
 *
 *   chão (pousada, orientação de repouso)
 *     → vibração (o "campo" começa a actuar)
 *     → levitação com aceleração suave e balanço lateral
 *     → espera na constelação (rotação lenta)
 *     → atracção numa trajectória curva (Bézier), orientação progressiva, oscilação amortecida
 *     → aproximação ao longo do eixo de inserção (desaceleração forte)
 *     → [opcional] acoplamento (dock) — ex.: o conjunto óptico desliza para o corpo
 *     → encaixe com micro-impacto e faísca dourada no ponto de ligação
 *
 * Tudo é função pura do progresso de scroll p (sem estado temporal), logo a montagem
 * pára quando o scroll pára e desfaz-se exactamente ao recuar.
 */

type Win = readonly [number, number];

export type MagneticSpec = {
  /** Posição (x, z) no chão, em coordenadas locais da câmara. */
  floor: [number, number];
  /** Repouso no chão: [rx, guinada, rz] — deita a peça (rx/rz) e depois roda-a no chão (guinada). */
  lie?: Vec3;
  /** Deslocamento da posição de espera (constelação) relativamente à posição final. */
  hover: Vec3;
  /**
   * Posição absoluta de levitação (no referencial do pai). Quando definida substitui `hover`
   * — útil para peças que levitam por cima do sítio onde estavam pousadas (kit de iluminação).
   */
  hoverAbs?: Vec3;
  /** Altura do centro quando pousada (sobrepõe o cálculo automático — peças que mudam de forma). */
  restY?: number;
  /** Rotação na constelação (euler, rad). */
  hoverRot?: Vec3;
  lift: Win;
  attract: Win;
  /** Ponto intermédio antes do acoplamento final (offset relativo à posição final). */
  staging?: Vec3;
  dock?: Win;
  /** Rotação contínua durante a atracção (ex.: anéis ópticos, parafusos a roscar). */
  spin?: { axis: "x" | "y" | "z"; turns: number };
  /** Distância de inserção ao longo do eixo de encaixe. */
  seat?: number;
};

type Ctx = { floorY: number; sparkMap: THREE.Texture; lines: boolean };
const MagCtx = createContext<Ctx | null>(null);

export function MagneticField({ floorY, children }: { floorY: number; children: ReactNode }) {
  const tier = useTier();
  const sparkMap = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, "rgba(255,255,255,1)");
    r.addColorStop(0.18, "rgba(255,226,140,.9)");
    r.addColorStop(0.5, "rgba(255,180,40,.25)");
    r.addColorStop(1, "rgba(255,160,0,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  const value = useMemo(() => ({ floorY, sparkMap, lines: tier !== "low" }), [floorY, sparkMap, tier]);
  return <MagCtx.Provider value={value}>{children}</MagCtx.Provider>;
}

const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _qs = new THREE.Quaternion();
const _e = new THREE.Euler();
const AX = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
let seedN = 0;

/** Ease "magnético": arranque suave, aceleração, travagem marcada antes do encaixe. */
const magnet = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 4) / 2);

export function MagneticPart({ children, spec, name }: { children: ReactNode; spec: MagneticSpec; name?: string }) {
  const ctx = useContext(MagCtx)!;
  const outer = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const spark = useRef<THREE.Sprite>(null);
  const line = useRef<THREE.Line>(null);
  const seed = useMemo(() => ++seedN * 1.37, []);

  // dados geométricos calculados na montagem (centro e altura de repouso)
  const geo = useRef<{
    ready: boolean;
    c: THREE.Vector3;
    floorPos: THREE.Vector3;
    hoverPos: THREE.Vector3;
    staged: THREE.Vector3;
    insert: THREE.Vector3;
    side: THREE.Vector3;
    qFloor: THREE.Quaternion;
    qHover: THREE.Quaternion;
  }>({
    ready: false,
    c: new THREE.Vector3(),
    floorPos: new THREE.Vector3(),
    hoverPos: new THREE.Vector3(),
    staged: new THREE.Vector3(),
    insert: new THREE.Vector3(),
    side: new THREE.Vector3(),
    qFloor: new THREE.Quaternion(),
    qHover: new THREE.Quaternion(),
  });

  const sparkMat = useMemo(
    () => new THREE.SpriteMaterial({ map: ctx.sparkMap, color: "#ffd77a", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    [ctx.sparkMap],
  );
  const lineObj = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
    const m = new THREE.LineBasicMaterial({ color: "#ffb21f", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const l = new THREE.Line(g, m);
    l.frustumCulled = false;
    return l;
  }, []);

  // liberta os recursos GPU próprios da peça se ela for desmontada
  useEffect(
    () => () => {
      sparkMat.dispose();
      lineObj.geometry.dispose();
      (lineObj.material as THREE.Material).dispose();
    },
    [sparkMat, lineObj],
  );

  useLayoutEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    // 1) centro real da peça (caixa envolvente das malhas, no referencial da câmara)
    o.position.set(0, 0, 0);
    o.quaternion.identity();
    i.position.set(0, 0, 0);
    o.updateWorldMatrix(true, true);
    const inv = o.matrixWorld.clone().invert();
    const box = new THREE.Box3();
    const corners: THREE.Vector3[] = [];
    i.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh || !mesh.geometry) return;
      mesh.geometry.computeBoundingBox();
      const bb = mesh.geometry.boundingBox!;
      const m = inv.clone().multiply(mesh.matrixWorld);
      for (const x of [bb.min.x, bb.max.x])
        for (const y of [bb.min.y, bb.max.y])
          for (const z of [bb.min.z, bb.max.z]) {
            const p = new THREE.Vector3(x, y, z).applyMatrix4(m);
            corners.push(p);
            box.expandByPoint(p);
          }
    });
    const g = geo.current;
    box.getCenter(g.c);
    i.position.copy(g.c).multiplyScalar(-1);

    // 2) orientação de repouso e altura exacta para a peça ficar pousada no chão
    const [lx, ly, lz] = spec.lie ?? [0, 0, 0];
    g.qFloor
      .setFromAxisAngle(AX.y, ly)
      .multiply(_q.setFromAxisAngle(AX.x, lx))
      .multiply(_q.setFromAxisAngle(AX.z, lz));
    let minY = Infinity;
    for (const p of corners) minY = Math.min(minY, _v.copy(p).sub(g.c).applyQuaternion(g.qFloor).y);
    g.floorPos.set(spec.floor[0], spec.restY ?? ctx.floorY - minY + 0.001, spec.floor[1]);

    // 3) constelação, ponto de inserção e direcções
    if (spec.hoverAbs) g.hoverPos.set(...spec.hoverAbs);
    else g.hoverPos.copy(g.c).add(_v.set(...spec.hover));
    g.qHover.setFromEuler(_e.set(...(spec.hoverRot ?? [0, 0, 0])));
    g.staged.copy(g.c).add(_v.set(...(spec.staging ?? [0, 0, 0])));
    if (spec.staging) g.insert.set(...spec.staging).normalize();
    else if (spec.hoverAbs) g.insert.copy(g.hoverPos).sub(g.c).normalize();
    else g.insert.set(...spec.hover).normalize();
    g.side.crossVectors(g.insert, AX.y);
    if (g.side.lengthSq() < 1e-4) g.side.set(1, 0, 0);
    g.side.normalize();
    spark.current?.position.copy(g.c);
    g.ready = true;
  }, [spec, ctx.floorY]);

  useAnim((p) => {
    const o = outer.current;
    const g = geo.current;
    if (!o || !g.ready) return;
    const { lift, attract, dock, seat = 0.03, spin } = spec;
    const uL = range(p, lift[0], lift[1]);
    const uA = range(p, attract[0], attract[1]);
    const uD = dock ? range(p, dock[0], dock[1]) : 1;
    const pos = _v;
    let lineO = 0;

    if (uL <= 0) {
      // pousada; vibra quando o campo começa a actuar
      const vib = range(p, lift[0] - 0.022, lift[0]);
      pos.copy(g.floorPos);
      pos.y += Math.abs(Math.sin(p * 2600 + seed)) * 0.006 * vib;
      o.quaternion.copy(g.qFloor);
      if (vib > 0) o.quaternion.multiply(_q.setFromEuler(_e.set(0, 0, Math.sin(p * 3100 + seed) * 0.05 * vib)));
    } else if (uA <= 0) {
      // levitação + espera na constelação
      const e = ease.inOutSine(uL);
      pos.lerpVectors(g.floorPos, g.hoverPos, e);
      pos.addScaledVector(g.side, Math.sin(Math.PI * uL) * 0.035);
      const drift = Math.max(0, p - lift[1]) * 0.9;
      o.quaternion.slerpQuaternions(g.qFloor, g.qHover, e).multiply(_q.setFromAxisAngle(AX.y, drift * (1 - uA)));
    } else if (uA < 1) {
      // atracção: Bézier quadrática até ao ponto de inserção, depois entrada recta
      const p0 = g.hoverPos;
      const p2x = g.staged.x + g.insert.x * seat;
      const p2y = g.staged.y + g.insert.y * seat;
      const p2z = g.staged.z + g.insert.z * seat;
      const mx = (p0.x + p2x) / 2 + g.side.x * 0.05;
      const my = (p0.y + p2y) / 2 + 0.07;
      const mz = (p0.z + p2z) / 2 + g.side.z * 0.05;
      const b = magnet(clamp(uA / 0.82));
      const ib = 1 - b;
      pos.set(ib * ib * p0.x + 2 * ib * b * mx + b * b * p2x, ib * ib * p0.y + 2 * ib * b * my + b * b * p2y, ib * ib * p0.z + 2 * ib * b * mz + b * b * p2z);
      const s2 = ease.outCubic(range(uA, 0.82, 1));
      pos.x += (g.staged.x - p2x) * s2;
      pos.y += (g.staged.y - p2y) * s2;
      pos.z += (g.staged.z - p2z) * s2;
      // oscilação amortecida durante o voo
      const wob = Math.sin(uA * Math.PI * 5 + seed) * 0.005 * Math.sin(Math.PI * uA) * (1 - uA);
      pos.addScaledVector(g.side, wob);
      const drift = Math.max(0, attract[0] - lift[1]) * 0.9;
      _qs.copy(g.qHover).multiply(_q.setFromAxisAngle(AX.y, drift));
      o.quaternion.slerpQuaternions(_qs, _q.identity(), ease.inOutCubic(clamp(uA * 1.25)));
      if (spin) o.quaternion.multiply(_q.setFromAxisAngle(AX[spin.axis], spin.turns * Math.PI * 2 * (1 - ease.outCubic(uA))));
      lineO = Math.sin(Math.PI * uA) * 0.55;
    } else {
      // acoplamento final (opcional) e repouso
      pos.lerpVectors(g.staged, g.c, ease.inOutCubic(uD));
      o.quaternion.identity();
      if (spin && dock && uD < 1) o.quaternion.multiply(_q.setFromAxisAngle(AX[spin.axis], spin.turns * 0.25 * Math.PI * 2 * (1 - uD)));
    }

    // micro-impacto no momento do encaixe + faísca no ponto de ligação
    const contact = dock ? dock[1] : attract[1];
    const k = range(p, contact, contact + 0.0055);
    const hit = k > 0 && k < 1 ? Math.sin(Math.PI * k) : 0;
    if (hit) pos.addScaledVector(g.insert, -0.004 * hit * (1 - k));
    o.position.copy(pos);
    const sc = 1 + 0.018 * hit;
    o.scale.setScalar(sc);
    sparkMat.opacity = hit * 0.95;
    if (spark.current) {
      spark.current.visible = hit > 0.01;
      const ss = 0.06 + 0.12 * k;
      spark.current.scale.set(ss, ss, 1);
    }

    // linha guia "de engenharia" entre a peça e o seu destino
    if (ctx.lines && line.current) {
      const attr = lineObj.geometry.getAttribute("position") as THREE.BufferAttribute;
      attr.setXYZ(0, pos.x, pos.y, pos.z);
      attr.setXYZ(1, g.c.x, g.c.y, g.c.z);
      attr.needsUpdate = true;
      (lineObj.material as THREE.LineBasicMaterial).opacity = lineO;
      line.current.visible = lineO > 0.01;
    }
  });

  return (
    <>
      <group ref={outer} name={name}>
        <group ref={inner}>{children}</group>
      </group>
      <sprite ref={spark} material={sparkMat} visible={false} />
      {ctx.lines && <primitive ref={line} object={lineObj} />}
    </>
  );
}
