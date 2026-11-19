"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { hash, type Vec3 } from "@/animation/math";
import { useAssets } from "../context";
import { Box, Cyl, Plane, Rod, Soft } from "../parts/shapes";

/** Cadeirão estofado (área de podcast). Frente em +Z local. */
export function Armchair({ fabric }: { fabric?: THREE.Material }) {
  const { mat } = useAssets();
  const f = fabric ?? mat.fabric;
  return (
    <group>
      <Soft size={[0.72, 0.16, 0.66]} radius={0.06} position={[0, 0.42, 0.02]} material={f} />
      <Soft size={[0.78, 0.6, 0.18]} radius={0.08} position={[0, 0.74, -0.27]} rotation={[-0.12, 0, 0]} material={f} />
      <Soft size={[0.14, 0.32, 0.6]} radius={0.06} position={[-0.38, 0.6, 0]} material={f} />
      <Soft size={[0.14, 0.32, 0.6]} radius={0.06} position={[0.38, 0.6, 0]} material={f} />
      <Soft size={[0.78, 0.12, 0.7]} radius={0.04} position={[0, 0.3, 0]} material={f} />
      {(
        [
          [-0.3, -0.26],
          [0.3, -0.26],
          [-0.3, 0.26],
          [0.3, 0.26],
        ] as Array<[number, number]>
      ).map(([x, z], i) => (
        <Rod key={i} from={[x, 0.25, z]} to={[x * 1.1, 0, z * 1.15]} r={0.015} material={mat.darkMetal} seg={8} />
      ))}
      {/* almofada amarela com a marca */}
      <group position={[0, 0.66, -0.13]} rotation={[-0.18, 0, 0]}>
        <Soft size={[0.38, 0.32, 0.12]} radius={0.05} material={mat.cushionYellow} />
        <Plane size={[0.17, 0.16]} position={[0, 0, 0.071]} material={mat.markDecal} />
      </group>
    </group>
  );
}

/** Sofá de pele preto com almofadas (área de recepção/showcase). */
export function Sofa() {
  const { mat } = useAssets();
  return (
    <group>
      <Soft size={[2.4, 0.3, 0.9]} radius={0.06} position={[0, 0.3, 0]} material={mat.leather} />
      <Soft size={[2.4, 0.55, 0.22]} radius={0.08} position={[0, 0.7, -0.36]} rotation={[-0.08, 0, 0]} material={mat.leather} />
      <Soft size={[0.22, 0.5, 0.9]} radius={0.08} position={[-1.2, 0.5, 0]} material={mat.leather} />
      <Soft size={[0.22, 0.5, 0.9]} radius={0.08} position={[1.2, 0.5, 0]} material={mat.leather} />
      {[-0.72, 0, 0.72].map((x, i) => (
        <Soft key={i} size={[0.74, 0.14, 0.7]} radius={0.05} position={[x, 0.5, 0.05]} material={mat.leather} />
      ))}
      {[-0.62, 0.62].map((x, i) => (
        <group key={i} position={[x, 0.78, -0.2]} rotation={[-0.2, 0, 0]}>
          <Soft size={[0.46, 0.4, 0.14]} radius={0.06} material={mat.cushionYellow} />
          <Plane size={[0.2, 0.19]} position={[0, 0, 0.081]} material={mat.markDecal} />
        </group>
      ))}
      <group position={[0, 0.8, -0.2]} rotation={[-0.2, 0, 0]}>
        <Soft size={[0.56, 0.44, 0.14]} radius={0.06} material={mat.cushionBlack} />
        <Plane size={[0.36, 0.08]} position={[0, -0.02, 0.081]} material={mat.logoDecal} />
      </group>
      {[-1.1, 1.1].map((x, i) => (
        <Cyl key={i} r={0.03} h={0.12} position={[x, 0.06, 0.3]} material={mat.gold} seg={10} />
      ))}
    </group>
  );
}

/** Base da mesa central do podcast (cilindro com ripas luminosas). */
export function PodcastTableBase() {
  const { mat } = useAssets();
  return (
    <group>
      <mesh position={[0, 0.3, 0]} material={mat.tableGlow}>
        <cylinderGeometry args={[0.3, 0.32, 0.56, 40, 1, true]} />
      </mesh>
      <Cyl r={0.29} h={0.56} position={[0, 0.3, 0]} material={mat.matte} seg={32} />
      <Cyl r={0.36} h={0.03} position={[0, 0.015, 0]} material={mat.gold} seg={40} />
    </group>
  );
}

export function PodcastTableTop() {
  const { mat } = useAssets();
  return (
    <group position={[0, 0.6, 0]}>
      <Cyl r={0.5} h={0.035} material={mat.glassTop} seg={48} />
      <mesh rotation={[Math.PI / 2, 0, 0]} material={mat.gold}>
        <torusGeometry args={[0.5, 0.014, 8, 64]} />
      </mesh>
    </group>
  );
}

/** Mesa de apoio dourada (recepção). */
export function CoffeeTable({ r = 0.55 }: { r?: number }) {
  const { mat } = useAssets();
  return (
    <group>
      <Cyl r={r} h={0.025} position={[0, 0.42, 0]} material={mat.glassTop} seg={48} />
      <mesh position={[0, 0.42, 0]} rotation={[Math.PI / 2, 0, 0]} material={mat.gold}>
        <torusGeometry args={[r, 0.015, 8, 64]} />
      </mesh>
      {[0, 1, 2, 3].map((k) => {
        const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
        return <Rod key={k} from={[Math.cos(a) * r * 0.8, 0.41, Math.sin(a) * r * 0.8]} to={[Math.cos(a) * r * 0.55, 0, Math.sin(a) * r * 0.55]} r={0.012} material={mat.gold} seg={8} />;
      })}
    </group>
  );
}

/** Microfone dinâmico de podcast com cubo VIRALIZA. */
export function PodcastMic() {
  const { mat } = useAssets();
  return (
    <group>
      <Cyl r={0.032} h={0.16} material={mat.body} seg={24} />
      <mesh position={[0, 0.09, 0]} material={mat.darkMetal}>
        <sphereGeometry args={[0.036, 20, 14]} />
      </mesh>
      <Cyl r={0.0335} h={0.012} position={[0, 0.05, 0]} material={mat.yellow} seg={24} />
      <group position={[0, -0.02, 0.045]}>
        <Box size={[0.06, 0.06, 0.06]} material={mat.matte} />
        <Plane size={[0.05, 0.05]} position={[0, 0, 0.0305]} material={mat.markDecal} />
      </group>
      <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]} material={mat.darkMetal}>
        <torusGeometry args={[0.05, 0.004, 6, 24]} />
      </mesh>
    </group>
  );
}

/** Auscultadores. */
export function Headphones() {
  const { mat } = useAssets();
  return (
    <group>
      <mesh position={[0, 0.07, 0]} material={mat.body}>
        <torusGeometry args={[0.085, 0.012, 8, 24, Math.PI]} />
      </mesh>
      {[-0.085, 0.085].map((x, i) => (
        <group key={i} position={[x, 0.02, 0]}>
          <Cyl r={0.045} h={0.04} axis="x" material={mat.body} seg={20} />
          <Cyl r={0.046} h={0.008} axis="x" position={[x > 0 ? 0.02 : -0.02, 0, 0]} material={mat.yellow} seg={20} />
        </group>
      ))}
    </group>
  );
}

export function Mug() {
  const { mat } = useAssets();
  return (
    <group>
      <Cyl r={0.04} h={0.1} position={[0, 0.05, 0]} material={mat.matte} seg={18} />
      <Plane size={[0.045, 0.045]} position={[0, 0.05, 0.0405]} material={mat.markDecal} />
      <mesh position={[0.045, 0.055, 0]} material={mat.matte}>
        <torusGeometry args={[0.022, 0.007, 6, 12]} />
      </mesh>
    </group>
  );
}

/** Planta em vaso — folhas instanciadas (1 draw call por planta). */
export function Plant({ height = 1.2, pot = "gold" as "gold" | "black", leaves = 18, seed = 1 }: { height?: number; pot?: "gold" | "black"; leaves?: number; seed?: number }) {
  const { mat } = useAssets();
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 10, 6);
    g.scale(0.07, 0.012, 0.26);
    g.translate(0, 0, 0.24);
    return g;
  }, []);
  const potH = height * 0.32;
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    for (let i = 0; i < leaves; i++) {
      const a = hash(i + seed * 13) * Math.PI * 2;
      const lift = 0.35 + hash(i + seed * 7) * 0.9;
      const y = potH + 0.05 + hash(i + seed * 3) * (height - potH) * 0.75;
      o.position.set(0, y, 0);
      o.rotation.set(-lift * 0.9, a, 0, "YXZ");
      const s = 0.75 + hash(i + seed * 5) * 0.6;
      o.scale.set(s, s, s * (height / 1.2));
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, [leaves, seed, height, potH]);
  return (
    <group>
      <Cyl r={0.17 * (height / 1.2)} rTop={0.2 * (height / 1.2)} h={potH} position={[0, potH / 2, 0]} material={pot === "gold" ? mat.potGold : mat.matte} seg={24} />
      <Rod from={[0, potH, 0]} to={[0, potH + (height - potH) * 0.6, 0]} r={0.012} material={mat.plant} />
      <instancedMesh ref={ref} args={[geo, mat.plant, leaves]} castShadow />
    </group>
  );
}

/** Ecrã de TV com moldura. */
export function Tv({ w = 1.6, h = 0.92 }: { w?: number; h?: number }) {
  const { mat } = useAssets();
  return (
    <group>
      <Box size={[w, h, 0.05]} material={mat.tvBezel} />
      <Plane size={[w - 0.04, h - 0.04]} position={[0, 0, 0.026]} material={mat.tvScreen} />
    </group>
  );
}

/** Corpo simplificado de câmara de estúdio (lente para -X), para os tripés da fase 4. */
export function StudioCameraBody() {
  const { mat } = useAssets();
  return (
    <group>
      <Box size={[0.3, 0.19, 0.15]} material={mat.body} />
      <Plane size={[0.29, 0.18]} position={[0, 0, 0.076]} material={mat.sidePanel} />
      <Cyl r={0.065} h={0.2} axis="x" position={[-0.25, 0, 0]} material={mat.body} seg={28} />
      <Cyl r={0.067} h={0.008} axis="x" position={[-0.3, 0, 0]} material={mat.yellow} seg={28} />
      <group position={[-0.39, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <mesh rotation={[0, Math.PI / 4, 0]} scale={[1, 1, 0.78]} material={mat.softboxShell}>
          <cylinderGeometry args={[0.13, 0.085, 0.09, 4, 1, true]} />
        </mesh>
      </group>
      <mesh position={[-0.351, 0, 0]} rotation={[0, -Math.PI / 2, 0]} material={mat.lensFront}>
        <circleGeometry args={[0.06, 32]} />
      </mesh>
      <Box size={[0.26, 0.025, 0.035]} position={[0, 0.17, 0]} material={mat.body} />
      <Box size={[0.025, 0.07, 0.03]} position={[-0.09, 0.12, 0]} material={mat.body} />
      <Box size={[0.025, 0.07, 0.03]} position={[0.1, 0.12, 0]} material={mat.body} />
      <Cyl r={0.03} h={0.22} axis="x" position={[-0.2, 0.21, 0]} material={mat.foam} seg={20} />
      <Plane size={[0.14, 0.03]} position={[-0.2, 0.21, 0.031]} material={mat.logoDecal} />
      <Box size={[0.05, 0.12, 0.1]} position={[0.175, 0, 0]} material={mat.matte} />
      <group position={[0.02, 0.13, 0.1]} rotation={[0, 0.3, 0]}>
        <Box size={[0.13, 0.085, 0.014]} material={mat.body} />
        <Plane size={[0.12, 0.075]} position={[0, 0, 0.0075]} material={mat.monitorScreen} />
      </group>
      <Box size={[0.34, 0.016, 0.13]} position={[0, -0.103, 0]} material={mat.darkMetal} />
    </group>
  );
}

/** Estante com prateleiras e fitas LED. As prateleiras são animadas pelo Studio. */
export const SHELF = { w: 0.86, h: 3.0, d: 0.36, boards: [0.45, 1.05, 1.65, 2.25, 2.85] };

export function ShelfFrame() {
  const { mat } = useAssets();
  return (
    <group>
      {[-SHELF.w / 2, SHELF.w / 2].map((x, i) => (
        <Box key={i} size={[0.035, SHELF.h, SHELF.d]} position={[x, SHELF.h / 2, 0]} material={mat.matte} />
      ))}
      <Box size={[SHELF.w, SHELF.h, 0.02]} position={[0, SHELF.h / 2, -SHELF.d / 2]} material={mat.wallPanel} />
    </group>
  );
}

export function ShelfBoard() {
  const { mat } = useAssets();
  return (
    <group>
      <Box size={[SHELF.w - 0.04, 0.03, SHELF.d]} material={mat.matte} />
      <Box size={[SHELF.w - 0.08, 0.01, 0.015]} position={[0, -0.02, SHELF.d / 2 - 0.03]} material={mat.shelfLed} castShadow={false} />
    </group>
  );
}

/** Pequenos objectos decorativos para as prateleiras. */
export function ShelfDecor({ variant }: { variant: number }) {
  const { mat } = useAssets();
  switch (variant % 5) {
    case 0:
      return (
        <group>
          {[0, 1, 2, 3].map((i) => (
            <Box key={i} size={[0.05, 0.24 - i * 0.02, 0.18]} position={[i * 0.055, 0.12 - i * 0.01, 0]} material={i === 1 ? mat.yellow : mat.book} />
          ))}
        </group>
      );
    case 1:
      return (
        <group scale={0.5} position={[0, 0.06, 0]}>
          <StudioCameraBody />
        </group>
      );
    case 2:
      // claquete
      return (
        <group rotation={[0, 0.3, 0]}>
          <Box size={[0.26, 0.18, 0.02]} position={[0, 0.09, 0]} material={mat.matte} />
          <Box size={[0.26, 0.04, 0.022]} position={[0, 0.2, 0]} rotation={[0, 0, 0.15]} material={mat.white} />
        </group>
      );
    case 3:
      return <Plant height={0.45} pot="black" leaves={10} seed={variant} />;
    default:
      return (
        <group>
          <Cyl r={0.05} h={0.2} position={[0, 0.1, 0]} material={mat.gold} seg={16} />
          <Box size={[0.12, 0.12, 0.12]} position={[0.16, 0.06, 0]} material={mat.yellow} />
        </group>
      );
  }
}

/** Secretária de produção (frente) — corpo. */
export function DeskBody({ w = 2.6 }: { w?: number }) {
  const { mat } = useAssets();
  return (
    <group>
      <Box size={[w, 0.06, 0.75]} position={[0, 0.9, 0]} material={mat.matte} />
      <Box size={[w, 0.85, 0.05]} position={[0, 0.44, 0.33]} material={mat.body} />
      <Box size={[w, 0.02, 0.02]} position={[0, 0.875, 0.36]} material={mat.stripYellow} castShadow={false} />
      <Box size={[0.05, 0.85, 0.7]} position={[-w / 2 + 0.03, 0.44, 0]} material={mat.body} />
      <Box size={[0.05, 0.85, 0.7]} position={[w / 2 - 0.03, 0.44, 0]} material={mat.body} />
      <Plane size={[0.9, 0.2]} position={[0, 0.5, 0.356]} material={mat.logoDecal} />
    </group>
  );
}

export function Mixer() {
  const { mat } = useAssets();
  return (
    <group>
      <Box size={[0.62, 0.05, 0.32]} position={[0, 0.025, 0]} rotation={[0.08, 0, 0]} material={mat.matte} />
      <Plane size={[0.6, 0.3]} position={[0, 0.054, 0]} rotation={[-Math.PI / 2 + 0.08, 0, 0]} material={mat.mixer} />
    </group>
  );
}

export function ProductionMonitor() {
  const { mat } = useAssets();
  return (
    <group>
      <Box size={[0.25, 0.015, 0.16]} position={[0, 0.008, 0]} material={mat.darkMetal} />
      <Box size={[0.04, 0.28, 0.03]} position={[0, 0.14, -0.04]} material={mat.darkMetal} />
      <group position={[0, 0.36, -0.02]} rotation={[-0.08, 0, 0]}>
        <Box size={[0.72, 0.43, 0.03]} material={mat.tvBezel} />
        <Plane size={[0.69, 0.4]} position={[0, 0, 0.0155]} material={mat.production} />
      </group>
    </group>
  );
}

/** Braço articulado de microfone: devolve os pontos do braço para animação externa. */
export function MicArmRods({ clamp, elbow, tip }: { clamp: Vec3; elbow: Vec3; tip: Vec3 }) {
  const { mat } = useAssets();
  return (
    <group>
      <Box size={[0.05, 0.07, 0.05]} position={clamp} material={mat.darkMetal} />
      <Rod from={clamp} to={elbow} r={0.011} material={mat.body} />
      <mesh position={elbow} material={mat.yellow}>
        <sphereGeometry args={[0.018, 12, 8]} />
      </mesh>
      <Rod from={elbow} to={tip} r={0.01} material={mat.body} />
    </group>
  );
}
