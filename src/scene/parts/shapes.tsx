"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { Vec3 } from "@/animation/math";

type MatProps = { material: THREE.Material; castShadow?: boolean };

/** Caixa simples. */
export function Box({ size, position, rotation, material, castShadow = true }: MatProps & { size: Vec3; position?: Vec3; rotation?: Vec3 }) {
  return (
    <mesh position={position} rotation={rotation} material={material} castShadow={castShadow} receiveShadow>
      <boxGeometry args={size} />
    </mesh>
  );
}

/** Cilindro orientado ao longo do eixo indicado. */
export function Cyl({
  r,
  rTop,
  h,
  axis = "y",
  position,
  rotation,
  material,
  seg = 32,
  open = false,
  castShadow = true,
}: MatProps & { r: number; rTop?: number; h: number; axis?: "x" | "y" | "z"; position?: Vec3; rotation?: Vec3; seg?: number; open?: boolean }) {
  const rot: Vec3 = axis === "x" ? [0, 0, Math.PI / 2] : axis === "z" ? [Math.PI / 2, 0, 0] : [0, 0, 0];
  return (
    <group position={position} rotation={rotation}>
      <mesh rotation={rot} material={material} castShadow={castShadow} receiveShadow>
        <cylinderGeometry args={[rTop ?? r, r, h, seg, 1, open]} />
      </mesh>
    </group>
  );
}

/** Tubo recto entre dois pontos (pernas de tripé, braços articulados, postes). */
export function Rod({ from, to, r, material, seg = 12 }: MatProps & { from: Vec3; to: Vec3; r: number; seg?: number }) {
  const { pos, quat, len } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const dir = b.clone().sub(a);
    const len = dir.length();
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return { pos: a.add(b).multiplyScalar(0.5), quat, len };
  }, [from, to]);
  return (
    <mesh position={pos} quaternion={quat} material={material} castShadow receiveShadow>
      <cylinderGeometry args={[r, r, len, seg]} />
    </mesh>
  );
}

/** Plano com textura (decalques de logotipo, ecrãs). */
export function Plane({ size, position, rotation, material }: MatProps & { size: [number, number]; position?: Vec3; rotation?: Vec3 }) {
  return (
    <mesh position={position} rotation={rotation} material={material}>
      <planeGeometry args={size} />
    </mesh>
  );
}

/** Caixa arredondada leve (estofos, almofadas) — evita depender de geometrias pesadas. */
export function Soft({ size, radius = 0.05, position, rotation, material }: MatProps & { size: Vec3; radius?: number; position?: Vec3; rotation?: Vec3 }) {
  const geo = useMemo(() => roundedBox(size[0], size[1], size[2], radius), [size, radius]);
  return <mesh geometry={geo} position={position} rotation={rotation} material={material} castShadow receiveShadow />;
}

const roundedCache = new Map<string, THREE.BufferGeometry>();
function roundedBox(w: number, h: number, d: number, r: number) {
  const key = [w, h, d, r].join("|");
  const hit = roundedCache.get(key);
  if (hit) return hit;
  const rr = Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3);
  const shape = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  shape.moveTo(x + rr, y);
  shape.lineTo(x + w - rr, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + rr);
  shape.lineTo(x + w, y + h - rr);
  shape.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  shape.lineTo(x + rr, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - rr);
  shape.lineTo(x, y + rr);
  shape.quadraticCurveTo(x, y, x + rr, y);
  const bevel = Math.min(r, d / 2 - 1e-3);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(d - bevel * 2, 1e-3),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel * 0.6,
    bevelSegments: 3,
    curveSegments: 4,
  });
  geo.translate(0, 0, -(d - bevel * 2) / 2);
  geo.computeVertexNormals();
  roundedCache.set(key, geo);
  return geo;
}
