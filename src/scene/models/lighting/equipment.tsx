"use client";

import { useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";
import { ease, lerp, range, type Vec3 } from "@/animation/math";
import { useAssets } from "../../context";
import { useAnim } from "../../parts/driver";
import { Box, Cyl, Plane, Rod, Soft } from "../../parts/shapes";
import { BOOM, legLift, type StandParams } from "./kitLayout";

/**
 * MODELOS DO KIT DE ILUMINAÇÃO (geometria 3D, coerente com as imagens oficiais).
 * Cada componente é uma peça física independente; as articulações internas (pernas,
 * colunas telescópicas, abas, softbox, braço) são funções puras do progresso p.
 */

type Win = readonly [number, number];

export function useKitTextures() {
  const t = useTexture({
    caseFront: "/textures/lighting/case-front.webp",
    controller: "/textures/lighting/controller.webp",
    sandbag: "/textures/lighting/sandbag.webp",
    ringBase: "/textures/lighting/ring-base.webp",
  });
  return useMemo(() => {
    Object.values(t).forEach((x) => {
      x.colorSpace = THREE.SRGBColorSpace;
      x.anisotropy = 8;
    });
    const m = (map: THREE.Texture, p: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ map, roughness: 0.45, metalness: 0.15, ...p });
    return {
      caseFront: m(t.caseFront, { roughness: 0.35, metalness: 0.3 }),
      controller: m(t.controller, { emissive: new THREE.Color("#ffffff"), emissiveMap: t.controller, emissiveIntensity: 0.12 }),
      sandbag: m(t.sandbag, { roughness: 0.9, metalness: 0 }),
      ringBase: m(t.ringBase),
    };
  }, [t]);
}

/* ------------------------------------------------------------------ tripé */

/**
 * Tripé com pernas articuladas e coluna telescópica. A peça chega fechada (pernas juntas,
 * coluna recolhida); abre as pernas — descendo até os pés tocarem o chão — e estende a coluna.
 */
export function TripodRig({ s, legs, column, children, wheels = false }: { s: StandParams; legs: Win; column: Win; children?: ReactNode; wheels?: boolean }) {
  const { mat } = useAssets();
  const lift = useRef<THREE.Group>(null);
  const legRefs = useRef<Array<THREE.Group | null>>([]);
  const inner = useRef<THREE.Group>(null);
  useAnim((p) => {
    const a = lerp(0.05, s.legOpen, ease.outCubic(range(p, legs[0], legs[1])));
    legRefs.current.forEach((l) => l && (l.rotation.x = a));
    if (lift.current) lift.current.position.y = legLift(s, a);
    if (inner.current) inner.current.position.y = -(1 - ease.inOutCubic(range(p, column[0], column[1]))) * s.rise;
  });
  const top = s.collar + s.outer;
  const r = s.tube;
  return (
    <group ref={lift}>
      <Cyl r={r * 1.9} h={0.06} position={[0, s.collar, 0]} material={mat.darkMetal} seg={16} />
      <Cyl r={r * 1.7} h={0.035} position={[0, s.collar + 0.055, 0]} material={mat.yellow} seg={16} />
      {[0, 1, 2].map((k) => (
        <group key={k} rotation={[0, (k * Math.PI * 2) / 3, 0]}>
          <group
            ref={(el) => {
              legRefs.current[k] = el;
            }}
            position={[0, s.collar, 0]}
          >
            <Rod from={[0, 0, 0]} to={[0, -s.legLength, 0]} r={r * 0.8} material={mat.body} seg={10} />
            <Rod from={[0, -0.02, 0]} to={[0, -s.legLength * 0.45, -0.0]} r={r * 0.95} material={mat.body} seg={10} />
            {!wheels && <Cyl r={r * 1.25} h={0.03} position={[0, -s.legLength + 0.012, 0]} material={mat.rubber} seg={10} />}
          </group>
        </group>
      ))}
      <Cyl r={r} h={s.outer} position={[0, s.collar + s.outer / 2, 0]} material={mat.body} seg={14} />
      <Cyl r={r * 1.7} h={0.04} position={[0, top, 0]} material={mat.yellow} seg={14} />
      <Cyl r={r * 0.6} h={0.03} axis="x" position={[r * 1.9, top, 0]} material={mat.yellow} seg={10} />
      <group ref={inner}>
        <Cyl r={r * 0.7} h={s.rise + 0.05} position={[0, top + (s.rise + 0.05) / 2 - 0.05, 0]} material={mat.metal} seg={12} />
        <group position={[0, top + s.rise, 0]}>{children}</group>
      </group>
    </group>
  );
}

/** Roda (caster) do C-stand. */
export function Caster() {
  const { mat } = useAssets();
  return (
    <group>
      <Cyl r={0.008} h={0.03} position={[0, 0.06, 0]} material={mat.metal} seg={10} />
      <Box size={[0.03, 0.012, 0.05]} position={[0, 0.045, 0]} material={mat.metal} />
      <Cyl r={0.035} h={0.024} axis="x" position={[0, 0.035, 0.012]} material={mat.rubber} seg={18} />
      <Cyl r={0.018} h={0.026} axis="x" position={[0, 0.035, 0.012]} material={mat.yellow} seg={14} />
    </group>
  );
}

/** Adaptador/conector amarelo que encaixa no colar dos tripés. */
export function Adapter() {
  const { mat } = useAssets();
  return (
    <group>
      <Cyl r={0.022} h={0.03} material={mat.yellow} seg={16} />
      <Cyl r={0.006} h={0.06} axis="x" position={[0.035, 0, 0]} material={mat.metal} seg={8} />
      <Cyl r={0.012} h={0.012} axis="x" position={[0.066, 0, 0]} material={mat.darkMetal} seg={10} />
    </group>
  );
}

/* ------------------------------------------------------------- painel LED */

const PW = 0.52;
const PH = 0.4;

type Aim = { yaw: number; pitch: number };

/** Roda a cabeça de A (kit) para B (set) ao longo da janela `turn`. */
function useAim(from: Aim, to: Aim | undefined, turn: Win | undefined) {
  const yawRef = useRef<THREE.Group>(null);
  const pitchRef = useRef<THREE.Group>(null);
  useAnim((p) => {
    const t = to && turn ? ease.inOutCubic(range(p, turn[0], turn[1])) : 0;
    const tgt = to ?? from;
    if (yawRef.current) yawRef.current.rotation.y = lerp(from.yaw, tgt.yaw, t);
    if (pitchRef.current) pitchRef.current.rotation.x = lerp(from.pitch, tgt.pitch, t);
  });
  return { yawRef, pitchRef };
}

/** Cabeça do painel LED (garfo + painel). Frente em +Z local; pivot no topo do tripé. */
export function LedHead({ face, from, to, turn }: { face: THREE.Material; from: Aim; to?: Aim; turn?: Win }) {
  const { mat } = useAssets();
  const { yawRef, pitchRef } = useAim(from, to, turn);
  return (
    <group ref={yawRef} rotation={[0, from.yaw, 0]}>
      <Cyl r={0.012} h={0.14} position={[0, 0.07, 0]} material={mat.darkMetal} seg={10} />
      <Box size={[PW + 0.1, 0.025, 0.035]} position={[0, 0.14, 0]} material={mat.body} />
      <Box size={[0.025, 0.25, 0.035]} position={[PW / 2 + 0.045, 0.255, 0]} material={mat.body} />
      <Box size={[0.025, 0.25, 0.035]} position={[-PW / 2 - 0.045, 0.255, 0]} material={mat.body} />
      <Cyl r={0.024} h={0.022} axis="x" position={[PW / 2 + 0.068, 0.33, 0]} material={mat.yellow} seg={14} />
      <Cyl r={0.024} h={0.022} axis="x" position={[-PW / 2 - 0.068, 0.33, 0]} material={mat.darkMetal} seg={14} />
      <group ref={pitchRef} position={[0, 0.33, 0]} rotation={[from.pitch, 0, 0]}>
        <Soft size={[PW, PH, 0.085]} radius={0.018} material={mat.body} />
        <Plane size={[PW - 0.05, PH - 0.05]} position={[0, 0, 0.0435]} material={face} />
        {/* moldura amarela e cantos */}
        <Box size={[PW + 0.006, 0.014, 0.09]} position={[0, PH / 2 - 0.004, 0]} material={mat.yellow} />
        <Box size={[PW + 0.006, 0.014, 0.09]} position={[0, -PH / 2 + 0.004, 0]} material={mat.yellow} />
        <Box size={[0.014, PH, 0.09]} position={[PW / 2 - 0.004, 0, 0]} material={mat.yellow} />
        <Box size={[0.014, PH, 0.09]} position={[-PW / 2 + 0.004, 0, 0]} material={mat.yellow} />
        {/* pega superior */}
        <Box size={[0.025, 0.04, 0.025]} position={[-0.09, PH / 2 + 0.02, -0.01]} material={mat.yellow} />
        <Box size={[0.025, 0.04, 0.025]} position={[0.09, PH / 2 + 0.02, -0.01]} material={mat.yellow} />
        <Box size={[0.2, 0.022, 0.03]} position={[0, PH / 2 + 0.045, -0.01]} material={mat.body} />
        {/* lateral com logotipo e traseira */}
        <Plane size={[0.24, 0.052]} position={[PW / 2 + 0.0008, 0, -0.005]} rotation={[0, Math.PI / 2, Math.PI / 2]} material={mat.logoDecal} />
        <Plane size={[0.24, 0.052]} position={[-PW / 2 - 0.0008, 0, -0.005]} rotation={[0, -Math.PI / 2, -Math.PI / 2]} material={mat.logoDecal} />
        <Box size={[0.24, 0.16, 0.035]} position={[0, 0, -0.06]} material={mat.matte} />
        <Plane size={[0.2, 0.045]} position={[0, 0, -0.078]} rotation={[0, Math.PI, 0]} material={mat.logoDecal} />
      </group>
    </group>
  );
}

/** Conjunto de 4 abas direccionais (barn doors) que se abrem mecanicamente. */
export function BarnDoors({ open, from, to, turn }: { open: Win; from: Aim; to?: Aim; turn?: Win }) {
  const { mat } = useAssets();
  const { yawRef, pitchRef } = useAim(from, to, turn);
  const flaps = useRef<Array<THREE.Group | null>>([]);
  useAnim((p) => {
    const t = ease.inOutCubic(range(p, open[0], open[1]));
    // fechadas = dobradas sobre a frente; abertas = em leque
    const a = lerp(Math.PI * 0.97, Math.PI * 0.5 - 0.45, t);
    flaps.current.forEach((d, i) => d && (d.rotation.x = a - (i % 2 ? 0.02 : 0)));
  });
  const z = 0.052;
  const defs: Array<{ pos: Vec3; rotZ: number; len: number; span: number }> = [
    { pos: [0, PH / 2, z], rotZ: 0, len: 0.17, span: PW },
    { pos: [0, -PH / 2, z], rotZ: Math.PI, len: 0.17, span: PW },
    { pos: [PW / 2, 0, z], rotZ: -Math.PI / 2, len: 0.14, span: PH },
    { pos: [-PW / 2, 0, z], rotZ: Math.PI / 2, len: 0.14, span: PH },
  ];
  return (
    <group ref={yawRef} rotation={[0, from.yaw, 0]}>
      <group ref={pitchRef} position={[0, 0.33, 0]} rotation={[from.pitch, 0, 0]}>
        {/* moldura que encaixa na frente do painel */}
        <Box size={[PW + 0.01, 0.016, 0.012]} position={[0, PH / 2, z - 0.004]} material={mat.matte} />
        <Box size={[PW + 0.01, 0.016, 0.012]} position={[0, -PH / 2, z - 0.004]} material={mat.matte} />
        <Box size={[0.016, PH, 0.012]} position={[PW / 2, 0, z - 0.004]} material={mat.matte} />
        <Box size={[0.016, PH, 0.012]} position={[-PW / 2, 0, z - 0.004]} material={mat.matte} />
        {defs.map((d, i) => (
          <group key={i} position={d.pos} rotation={[0, 0, d.rotZ]}>
            <group
              ref={(el) => {
                flaps.current[i] = el;
              }}
            >
              <Box size={[d.span, d.len, 0.006]} position={[0, d.len / 2, 0]} material={mat.matte} />
              <Box size={[d.span, 0.006, 0.008]} position={[0, d.len, 0]} material={mat.darkMetal} />
            </group>
          </group>
        ))}
      </group>
    </group>
  );
}

/* --------------------------------------------------------------- softbox */

const SB = { rTop: 0.07, radius: 0.48, depth: 0.42 };

/** Corpo octogonal da softbox: chega fechado (guarda-chuva) e as varetas abrem a estrutura. */
export function SoftboxBody({ expand }: { expand: Win }) {
  const { mat } = useAssets();
  const shell = useRef<THREE.Group>(null);
  useAnim((p) => {
    const t = ease.outCubic(range(p, expand[0], expand[1]));
    const s = lerp(0.14, 1, t);
    if (shell.current) shell.current.scale.set(s, lerp(1.3, 1, t), s);
  });
  const { rTop, radius, depth } = SB;
  const ribs = useMemo(
    () =>
      Array.from({ length: 8 }, (_, k) => {
        const dr = radius - rTop;
        return { th: (k / 8) * Math.PI * 2, rMid: (rTop + radius) / 2, len: Math.hypot(dr, depth), tilt: Math.atan2(dr, depth) };
      }),
    [radius, rTop, depth],
  );
  const apothem = ((rTop + radius) / 2) * Math.cos(Math.PI / 8);
  return (
    <group>
      <Cyl r={0.06} h={0.07} position={[0, depth / 2 + 0.035, 0]} material={mat.body} seg={16} />
      <Cyl r={0.064} h={0.012} position={[0, depth / 2 + 0.01, 0]} material={mat.yellow} seg={16} />
      <group ref={shell}>
        <mesh material={mat.softboxShell} castShadow>
          <cylinderGeometry args={[rTop, radius, depth, 8, 1, true]} />
        </mesh>
        {ribs.map((r, i) => (
          <group key={i} rotation={[0, r.th, 0]}>
            <mesh position={[0, 0, r.rMid]} rotation={[-r.tilt, 0, 0]} material={mat.yellow}>
              <boxGeometry args={[0.012, r.len, 0.012]} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, -depth / 2 + 0.003, 0]} rotation={[Math.PI / 2, 0, Math.PI / 8]} material={mat.yellow}>
          <torusGeometry args={[radius * 0.995, 0.012, 6, 8]} />
        </mesh>
        {[Math.PI / 8, Math.PI / 8 + Math.PI].map((th) => (
          <group key={th} rotation={[0, th, 0]}>
            <mesh position={[0, -0.02, apothem + 0.004]} rotation={[-Math.atan2(radius - rTop, depth), 0, 0]} material={mat.logoDecal}>
              <planeGeometry args={[0.3, 0.075]} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

/** Difusor branco (tela frontal da softbox). */
export function Diffuser({ face }: { face: THREE.Material }) {
  const { radius, depth } = SB;
  return (
    <group>
      <mesh position={[0, -depth / 2 - 0.004, 0]} rotation={[Math.PI / 2, 0, Math.PI / 8]} material={face}>
        <circleGeometry args={[radius * 0.97, 8]} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------ girafa (boom) */

/** Braço da girafa: chega dobrado na vertical e eleva-se até ao ângulo final. */
export function BoomArm({ yaw, raise }: { yaw: number; raise: Win }) {
  const { mat } = useAssets();
  const arm = useRef<THREE.Group>(null);
  useAnim((p) => {
    if (arm.current) arm.current.rotation.x = lerp(0.06, BOOM.angle, ease.inOutCubic(range(p, raise[0], raise[1])));
  });
  return (
    <group rotation={[0, yaw, 0]}>
      <Box size={[0.07, 0.07, 0.07]} material={mat.darkMetal} />
      <Cyl r={0.03} h={0.03} axis="x" position={[0.05, 0, 0]} material={mat.yellow} seg={14} />
      <group ref={arm}>
        <Cyl r={0.015} h={BOOM.len + 0.45} position={[0, BOOM.len / 2 - 0.225, 0]} material={mat.body} seg={12} />
        <Cyl r={0.05} h={0.14} position={[0, -0.36, 0]} material={mat.darkMetal} seg={16} />
        <Cyl r={0.022} h={0.12} position={[0, -0.24, 0]} material={mat.yellow} seg={12} />
        <Cyl r={0.026} h={0.05} position={[0, BOOM.len, 0]} material={mat.metal} seg={12} />
      </group>
    </group>
  );
}

/* ------------------------------------------------------------ ring light */

export function RingHead({ glow, yaw, baseMat }: { glow: THREE.Material; yaw: number; baseMat: THREE.Material }) {
  const { mat } = useAssets();
  return (
    <group rotation={[0, yaw, 0]}>
      <Cyl r={0.012} h={0.08} position={[0, 0.04, 0]} material={mat.darkMetal} seg={10} />
      <group position={[0, 0.1, 0]}>
        <Soft size={[0.13, 0.07, 0.05]} radius={0.01} material={mat.body} />
        <Plane size={[0.12, 0.066]} position={[0, 0, 0.0262]} material={baseMat} />
      </group>
      <group position={[0, 0.36, 0]}>
        <mesh material={glow}>
          <torusGeometry args={[0.22, 0.022, 14, 72]} />
        </mesh>
        <mesh position={[0, 0, -0.02]} material={mat.matte}>
          <torusGeometry args={[0.226, 0.028, 8, 56]} />
        </mesh>
        <Rod from={[0, -0.22, -0.01]} to={[0, -0.04, -0.01]} r={0.007} material={mat.darkMetal} />
        <Box size={[0.03, 0.03, 0.02]} position={[0, -0.04, -0.005]} material={mat.darkMetal} />
      </group>
    </group>
  );
}

/** Telemóvel com o símbolo V, que encaixa no suporte do ring light. */
export function Phone({ yaw }: { yaw: number }) {
  const { mat } = useAssets();
  return (
    <group rotation={[0, yaw, 0]}>
      <group position={[0, 0.375, 0.008]}>
        <Soft size={[0.07, 0.14, 0.009]} radius={0.008} material={mat.body} />
        <Plane size={[0.06, 0.125]} position={[0, 0, 0.0047]} material={mat.monitorScreen} />
        <Plane size={[0.04, 0.035]} position={[0, 0.005, 0.0049]} material={mat.markDecal} />
      </group>
    </group>
  );
}

/* --------------------------------------------------------- mala e acessórios */

export function KitCase({ front }: { front: THREE.Material }) {
  const { mat } = useAssets();
  const [w0, h0, d0] = [0.74, 0.42, 0.44];
  const t = 0.024;
  const edges: Array<{ s: Vec3; p: Vec3 }> = [];
  for (const y of [-h0 / 2, h0 / 2]) for (const z of [-d0 / 2, d0 / 2]) edges.push({ s: [w0 + t, t, t], p: [0, y, z] });
  for (const x of [-w0 / 2, w0 / 2]) for (const z of [-d0 / 2, d0 / 2]) edges.push({ s: [t, h0, t], p: [x, 0, z] });
  return (
    <group position={[0, h0 / 2, 0]}>
      <Box size={[w0, h0, d0]} material={mat.body} />
      {edges.map((e, i) => (
        <Box key={i} size={e.s} position={e.p} material={mat.yellow} />
      ))}
      <Plane size={[w0 - 0.01, h0 - 0.01]} position={[0, 0, d0 / 2 + 0.0135]} material={front} />
      <Box size={[0.2, 0.025, 0.04]} position={[0, h0 / 2 + 0.02, 0]} material={mat.matte} />
    </group>
  );
}

export function Controller({ front }: { front: THREE.Material }) {
  const { mat } = useAssets();
  return (
    <group position={[0, 0.06, 0]}>
      <Soft size={[0.44, 0.12, 0.24]} radius={0.012} material={mat.matte} />
      <Plane size={[0.43, 0.115]} position={[0, 0, 0.1205]} material={front} />
      <Box size={[0.3, 0.02, 0.03]} position={[0, 0.075, 0]} material={mat.darkMetal} />
    </group>
  );
}

export function Remote() {
  const { mat } = useAssets();
  return (
    <group position={[0, 0.012, 0]}>
      <Soft size={[0.06, 0.022, 0.16]} radius={0.008} material={mat.matte} />
      <Plane size={[0.035, 0.03]} position={[0, 0.0115, -0.04]} rotation={[-Math.PI / 2, 0, 0]} material={mat.monitorScreen} />
      <Plane size={[0.04, 0.01]} position={[0, 0.0115, 0.06]} rotation={[-Math.PI / 2, 0, 0]} material={mat.logoDecal} />
    </group>
  );
}

export function PowerSupply() {
  const { mat } = useAssets();
  return (
    <group position={[0, 0.03, 0]}>
      <Soft size={[0.16, 0.055, 0.09]} radius={0.01} material={mat.matte} />
      <Cyl r={0.006} h={0.12} axis="x" position={[0.14, -0.02, 0]} material={mat.rubber} seg={8} />
    </group>
  );
}

export function Sandbag({ front }: { front: THREE.Material }) {
  const { mat } = useAssets();
  return (
    <group position={[0, 0.11, 0]}>
      <Soft size={[0.28, 0.22, 0.14]} radius={0.05} material={mat.matte} />
      <Plane size={[0.24, 0.19]} position={[0, -0.005, 0.0705]} material={front} />
      <mesh position={[0, 0.13, 0]} rotation={[0, 0, 0]} material={mat.matte}>
        <torusGeometry args={[0.07, 0.008, 6, 16, Math.PI]} />
      </mesh>
    </group>
  );
}

/** Parede de fundo com moldura LED e logotipo (como em Luzes-Parte2). */
export function Backdrop({ frameMat, logoMat }: { frameMat: THREE.Material; logoMat: THREE.Material }) {
  const { mat } = useAssets();
  const W = 4.6;
  const H = 2.7;
  return (
    <group>
      <Box size={[W, H, 0.08]} position={[0, H / 2, 0]} material={mat.wallPanel} />
      <Box size={[W - 0.5, 0.03, 0.03]} position={[0, H - 0.25, 0.05]} material={frameMat} castShadow={false} />
      <Box size={[W - 0.5, 0.03, 0.03]} position={[0, 0.25, 0.05]} material={frameMat} castShadow={false} />
      <Box size={[0.03, H - 0.5, 0.03]} position={[W / 2 - 0.25, H / 2, 0.05]} material={frameMat} castShadow={false} />
      <Box size={[0.03, H - 0.5, 0.03]} position={[-W / 2 + 0.25, H / 2, 0.05]} material={frameMat} castShadow={false} />
      <Plane size={[2.2, 0.47]} position={[0, 1.5, 0.045]} material={logoMat} />
    </group>
  );
}
