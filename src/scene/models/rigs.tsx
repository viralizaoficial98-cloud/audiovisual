"use client";

import { useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { ease, lerp, range, type Vec3 } from "@/animation/math";
import { useAssets } from "../context";
import { useAnim } from "../parts/driver";
import { Box, Cyl, Plane, Rod } from "../parts/shapes";

/**
 * Peças de equipamento reutilizáveis (fase 3 e fase 4). Cada uma recebe janelas de
 * progresso e calcula o seu estado a partir de p — sem estado interno, logo reversível.
 */

type Win = readonly [number, number];

export type StandWindows = { stand: Win; legs: Win; column: Win };

type StandProps = {
  position: Vec3;
  /** Altura do colar onde as pernas articulam. */
  collar?: number;
  legLength?: number;
  legOpen?: number;
  /** Comprimento do tubo exterior acima do colar. */
  outer?: number;
  /** Quanto o tubo interior sobe na extensão. */
  rise?: number;
  /** Rotação inicial (deitado no chão) em torno de Y. */
  lieYaw?: number;
  win: StandWindows;
  children?: ReactNode;
  tubeRadius?: number;
  wheels?: boolean;
};

/**
 * Tripé de iluminação: começa deitado no chão com as pernas fechadas, levanta-se,
 * abre as pernas e estende a coluna central. O equipamento (children) fica no topo.
 */
export function LightStand({
  position,
  collar = 0.5,
  legLength = 0.62,
  legOpen = 0.5,
  outer = 0.75,
  rise = 0.55,
  lieYaw = 0,
  win,
  children,
  tubeRadius = 0.016,
  wheels = false,
}: StandProps) {
  const { mat } = useAssets();
  const root = useRef<THREE.Group>(null);
  const tilt = useRef<THREE.Group>(null);
  const legs = useRef<Array<THREE.Group | null>>([]);
  const inner = useRef<THREE.Group>(null);

  useAnim((p) => {
    const r = root.current;
    if (!r) return;
    const tS = ease.inOutCubic(range(p, win.stand[0], win.stand[1]));
    const tL = ease.outCubic(range(p, win.legs[0], win.legs[1]));
    const tC = ease.inOutCubic(range(p, win.column[0], win.column[1]));
    r.visible = p >= win.stand[0] - 0.002;
    const a = lerp(0.05, legOpen, tL);
    legs.current.forEach((l) => l && (l.rotation.x = a));
    // pés sempre no chão: compensa a altura quando as pernas estão fechadas
    const lift = Math.max(0, legLength * Math.cos(a) - collar);
    const lyingLift = 0.03;
    if (tilt.current) {
      tilt.current.rotation.z = (Math.PI / 2) * (1 - tS);
      tilt.current.position.y = lerp(lyingLift, lift, tS);
    }
    if (inner.current) inner.current.position.y = -(1 - tC) * rise;
  });

  const top = collar + outer;
  return (
    <group ref={root} position={position}>
      <group rotation={[0, lieYaw, 0]}>
        <group ref={tilt}>
          {/* colar + pernas */}
          <Cyl r={tubeRadius * 1.9} h={0.06} position={[0, collar, 0]} material={mat.darkMetal} seg={16} />
          <Cyl r={tubeRadius * 1.5} h={0.03} position={[0, collar + 0.05, 0]} material={mat.yellow} seg={16} />
          {[0, 1, 2].map((k) => (
            <group key={k} rotation={[0, (k * Math.PI * 2) / 3, 0]}>
              <group
                ref={(el) => {
                  legs.current[k] = el;
                }}
                position={[0, collar, 0]}
              >
                <Rod from={[0, 0, 0]} to={[0, -legLength, 0]} r={tubeRadius * 0.8} material={mat.body} seg={10} />
                {wheels ? (
                  <Cyl r={0.035} h={0.025} axis="x" position={[0, -legLength, 0]} material={mat.rubber} seg={14} />
                ) : (
                  <Cyl r={tubeRadius * 1.2} h={0.03} position={[0, -legLength + 0.01, 0]} material={mat.rubber} seg={10} />
                )}
              </group>
            </group>
          ))}
          {/* tubo exterior */}
          <Cyl r={tubeRadius} h={outer} position={[0, collar + outer / 2, 0]} material={mat.body} seg={14} />
          <Cyl r={tubeRadius * 1.6} h={0.035} position={[0, top, 0]} material={mat.yellow} seg={14} />
          {/* tubo interior + equipamento */}
          <group ref={inner}>
            <Cyl r={tubeRadius * 0.7} h={rise + 0.05} position={[0, top + (rise + 0.05) / 2 - 0.05, 0]} material={mat.metal} seg={12} />
            <group position={[0, top + rise, 0]}>{children}</group>
          </group>
        </group>
      </group>
    </group>
  );
}

/** Altura final do topo de um LightStand (para posicionar luzes reais). */
export function standTop({ collar = 0.5, outer = 0.75, rise = 0.55 }: { collar?: number; outer?: number; rise?: number }) {
  return collar + outer + rise;
}

/** Painel LED bicolor com barn doors (abas) articuladas. */
export function LedPanel({
  glow,
  doors,
  aimYaw = 0,
  aimPitch = 0,
}: {
  glow: THREE.Material;
  /** Janela em que as abas abrem. */
  doors: Win;
  aimYaw?: number;
  aimPitch?: number;
}) {
  const { mat } = useAssets();
  const doorRefs = useRef<Array<THREE.Group | null>>([]);
  const W = 0.52;
  const H = 0.38;
  useAnim((p) => {
    const t = ease.inOutCubic(range(p, doors[0], doors[1]));
    const a = lerp(Math.PI * 0.97, Math.PI * 0.5 - 0.42, t);
    doorRefs.current.forEach((d) => d && (d.rotation.x = a));
  });
  const doorDefs: Array<{ pos: Vec3; rotZ: number; len: number; span: number }> = [
    { pos: [0, H / 2, 0.036], rotZ: 0, len: 0.16, span: W },
    { pos: [0, -H / 2, 0.036], rotZ: Math.PI, len: 0.16, span: W },
    { pos: [W / 2, 0, 0.036], rotZ: -Math.PI / 2, len: 0.13, span: H },
    { pos: [-W / 2, 0, 0.036], rotZ: Math.PI / 2, len: 0.13, span: H },
  ];
  return (
    <group rotation={[0, aimYaw, 0]}>
      {/* espigão + garfo */}
      <Cyl r={0.012} h={0.14} position={[0, 0.07, 0]} material={mat.darkMetal} seg={10} />
      <Box size={[W + 0.1, 0.025, 0.035]} position={[0, 0.14, 0]} material={mat.body} />
      <Box size={[0.025, 0.24, 0.035]} position={[W / 2 + 0.04, 0.25, 0]} material={mat.body} />
      <Box size={[0.025, 0.24, 0.035]} position={[-W / 2 - 0.04, 0.25, 0]} material={mat.body} />
      <Cyl r={0.022} h={0.02} axis="x" position={[W / 2 + 0.06, 0.33, 0]} material={mat.yellow} seg={14} />
      <group position={[0, 0.33, 0]} rotation={[aimPitch, 0, 0]}>
        <Box size={[W, H, 0.07]} material={mat.body} />
        <Plane size={[W - 0.04, H - 0.04]} position={[0, 0, 0.0355]} material={glow} />
        <Box size={[W, 0.012, 0.074]} position={[0, H / 2 - 0.006, 0]} material={mat.yellow} />
        <Box size={[W, 0.012, 0.074]} position={[0, -H / 2 + 0.006, 0]} material={mat.yellow} />
        <Plane size={[0.3, 0.064]} position={[0, 0, -0.0362]} rotation={[0, Math.PI, 0]} material={mat.logoDecal} />
        <Box size={[0.2, 0.12, 0.04]} position={[0, 0, -0.055]} material={mat.matte} />
        {doorDefs.map((d, i) => (
          <group key={i} position={d.pos} rotation={[0, 0, d.rotZ]}>
            <group
              ref={(el) => {
                doorRefs.current[i] = el;
              }}
            >
              <Box size={[d.span, d.len, 0.006]} position={[0, d.len / 2, 0]} material={mat.matte} />
            </group>
          </group>
        ))}
      </group>
    </group>
  );
}

/** Softbox octogonal: as varetas abrem e a tela expande até à forma final. */
export function Softbox({ face, expand, radius = 0.45, depth = 0.4 }: { face: THREE.Material; expand: Win; radius?: number; depth?: number }) {
  const { mat } = useAssets();
  const shell = useRef<THREE.Group>(null);
  useAnim((p) => {
    const t = ease.outCubic(range(p, expand[0], expand[1]));
    const s = lerp(0.12, 1, t);
    if (shell.current) shell.current.scale.set(s, lerp(1.25, 1, t), s);
  });
  const rTop = 0.07;
  const ribs = useMemo(
    () =>
      Array.from({ length: 8 }, (_, k) => {
        const th = (k / 8) * Math.PI * 2;
        const rMid = (rTop + radius) / 2;
        const dr = radius - rTop;
        const len = Math.hypot(dr, depth);
        const tiltA = Math.atan2(dr, depth);
        return { th, rMid, len, tiltA };
      }),
    [radius, depth],
  );
  const faceTh = Math.PI / 8;
  const apothem = ((rTop + radius) / 2) * Math.cos(Math.PI / 8);
  return (
    <group>
      <Cyl r={0.05} h={0.12} position={[0, depth / 2 + 0.06, 0]} material={mat.body} seg={16} />
      <group ref={shell}>
        <mesh material={mat.softboxShell} castShadow>
          <cylinderGeometry args={[rTop, radius, depth, 8, 1, true]} />
        </mesh>
        {ribs.map((r, i) => (
          <group key={i} rotation={[0, r.th, 0]}>
            <mesh position={[0, 0, r.rMid]} rotation={[-r.tiltA, 0, 0]} material={mat.yellow}>
              <boxGeometry args={[0.012, r.len, 0.012]} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, -depth / 2 - 0.001, 0]} rotation={[Math.PI / 2, 0, Math.PI / 8]} material={face}>
          <circleGeometry args={[radius * 0.98, 8]} />
        </mesh>
        <mesh position={[0, -depth / 2 + 0.002, 0]} rotation={[Math.PI / 2, 0, Math.PI / 8]}>
          <torusGeometry args={[radius * 0.99, 0.012, 6, 8]} />
          <meshStandardMaterial color="#FFCC00" roughness={0.4} />
        </mesh>
        <group rotation={[0, faceTh, 0]}>
          <mesh position={[0, -0.02, apothem + 0.004]} rotation={[-Math.atan2(radius - rTop, depth), 0, 0]} material={mat.logoDecal}>
            <planeGeometry args={[0.28, 0.06]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/** Ring light com suporte de telemóvel. */
export function RingLight({ glow, spin, aimYaw = 0 }: { glow: THREE.Material; spin: Win; aimYaw?: number }) {
  const { mat } = useAssets();
  const ring = useRef<THREE.Group>(null);
  useAnim((p) => {
    const t = ease.outCubic(range(p, spin[0], spin[1]));
    if (ring.current) {
      ring.current.rotation.z = (1 - t) * Math.PI * 1.5;
      const s = lerp(0.35, 1, t);
      ring.current.scale.set(s, s, s);
    }
  });
  return (
    <group rotation={[0, aimYaw, 0]}>
      <Cyl r={0.012} h={0.1} position={[0, 0.05, 0]} material={mat.darkMetal} seg={10} />
      <group position={[0, 0.3, 0]} ref={ring}>
        <mesh material={glow}>
          <torusGeometry args={[0.2, 0.02, 12, 64]} />
        </mesh>
        <mesh position={[0, 0, -0.018]} material={mat.matte}>
          <torusGeometry args={[0.205, 0.026, 8, 48]} />
        </mesh>
        <Rod from={[0, -0.2, -0.01]} to={[0, -0.03, -0.01]} r={0.006} material={mat.darkMetal} />
        <Box size={[0.07, 0.13, 0.008]} position={[0, 0.02, 0]} material={mat.body} />
        <Plane size={[0.05, 0.05]} position={[0, 0.02, 0.0045]} material={mat.markDecal} />
      </group>
      <Plane size={[0.12, 0.026]} position={[0, 0.07, 0.03]} material={mat.logoDecal} />
    </group>
  );
}

/** Cabo desenhado progressivamente ao longo do seu percurso (drawRange). */
export function Cable({ points, at, radius = 0.008 }: { points: Vec3[]; at: Win; radius?: number }) {
  const { mat } = useAssets();
  const geo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), false, "centripetal");
    return new THREE.TubeGeometry(curve, 80, radius, 6, false);
  }, [points, radius]);
  const ref = useRef<THREE.Mesh>(null);
  const total = geo.index ? geo.index.count : 0;
  useAnim((p) => {
    const t = ease.inOutSine(range(p, at[0], at[1]));
    const count = Math.floor((total * t) / 6) * 6;
    geo.setDrawRange(0, count);
    if (ref.current) ref.current.visible = count > 0;
  });
  return <mesh ref={ref} geometry={geo} material={mat.rubber} />;
}

/** Cone de luz volumétrico subtil (aditivo), cuja intensidade segue a luz. */
export function BeamCone({ from, to, radius = 0.9, intensity }: { from: Vec3; to: Vec3; radius?: number; intensity: (p: number) => number }) {
  const { geo, quat } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const dir = b.clone().sub(a);
    const len = dir.length();
    const g = new THREE.ConeGeometry(radius, len, 32, 1, true);
    g.translate(0, -len / 2, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir.normalize());
    return { geo: g, quat };
  }, [from, to, radius]);
  const material = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 4;
    c.height = 128;
    const ctx = c.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, "#000");
    g.addColorStop(0.55, "#333");
    g.addColorStop(1, "#fff");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 128);
    const alpha = new THREE.CanvasTexture(c);
    return new THREE.MeshBasicMaterial({
      color: "#ffe2a0",
      transparent: true,
      opacity: 0,
      alphaMap: alpha,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    });
  }, []);
  const ref = useRef<THREE.Mesh>(null);
  useAnim((p) => {
    const v = intensity(p);
    material.opacity = v;
    if (ref.current) ref.current.visible = v > 0.001;
  });
  return <mesh ref={ref} geometry={geo} material={material} position={from} quaternion={quat} renderOrder={5} />;
}

/** Mala de transporte com controlador por cima. */
export function FlightCase() {
  const { mat } = useAssets();
  const [w, h, d] = [0.72, 0.42, 0.44];
  const edges: Array<{ s: Vec3; p: Vec3 }> = [];
  const t = 0.022;
  for (const y of [-h / 2, h / 2]) for (const z of [-d / 2, d / 2]) edges.push({ s: [w + t, t, t], p: [0, y, z] });
  for (const x of [-w / 2, w / 2]) for (const z of [-d / 2, d / 2]) edges.push({ s: [t, h, t], p: [x, 0, z] });
  return (
    <group position={[0, h / 2, 0]}>
      <Box size={[w, h, d]} material={mat.body} />
      {edges.map((e, i) => (
        <Box key={i} size={e.s} position={e.p} material={mat.yellow} />
      ))}
      <Plane size={[0.42, 0.09]} position={[0, 0, d / 2 + 0.002]} material={mat.logoDecal} />
      <Box size={[0.36, 0.12, 0.24]} position={[0, h / 2 + 0.06, 0]} material={mat.matte} />
      <Plane size={[0.1, 0.05]} position={[-0.08, h / 2 + 0.07, 0.1205]} material={mat.monitorScreen} />
      <Cyl r={0.015} h={0.01} axis="z" position={[0.06, h / 2 + 0.07, 0.122]} material={mat.yellow} seg={12} />
      <Cyl r={0.015} h={0.01} axis="z" position={[0.12, h / 2 + 0.07, 0.122]} material={mat.yellow} seg={12} />
    </group>
  );
}

/** Cabeça de vídeo (fluid head) com braço de pan, para os tripés das câmaras. */
export function FluidHead() {
  const { mat } = useAssets();
  return (
    <group>
      <Cyl r={0.06} h={0.06} position={[0, 0.03, 0]} material={mat.darkMetal} seg={20} />
      <Box size={[0.16, 0.05, 0.1]} position={[0, 0.085, 0]} material={mat.body} />
      <Box size={[0.17, 0.006, 0.105]} position={[0, 0.06, 0]} material={mat.yellow} />
      <Rod from={[0.08, 0.08, 0.03]} to={[0.42, -0.05, 0.12]} r={0.011} material={mat.body} />
      <Cyl r={0.016} h={0.08} axis="x" position={[0.43, -0.055, 0.12]} material={mat.rubber} seg={10} />
    </group>
  );
}
