"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";
import { ease, lerp, range, type Vec3 } from "@/animation/math";
import { ASSEMBLY as A, LIGHTS } from "@/animation/phases";
import { useAssets } from "../context";
import { useAnim, useTier } from "../parts/driver";
import { MagneticField, MagneticPart, type MagneticSpec } from "../parts/MagneticPart";
import { Box, Cyl, Plane, Rod, Soft } from "../parts/shapes";
import { HERO_ASSEMBLY, HERO_SCALE, HERO_TRIPOD, HERO_TRIPOD_HEAD_Y, SET_FOCUS, yawLensTo } from "../layout";

/**
 * CÂMARA VIRALIZA — MONTAGEM MAGNÉTICA PEÇA A PEÇA.
 *
 * Uma única câmara 3D. ~35 peças independentes começam pousadas no chão, levitam,
 * formam uma constelação (o estado "desmontado" das referências) e são atraídas para
 * o seu lugar: estrutura → sensor e electrónica → conjunto óptico → painéis → acessórios.
 *
 * As superfícies visíveis usam texturas recortadas das 4 imagens oficiais
 * (scripts/extract-camera-textures.py): painel VIRALIZA/4K, microfone, objectiva,
 * vidro da lente, placa electrónica, sensor, monitor, cartões, bateria e ventoinha.
 *
 * Eixo local: objectiva para -X, painel com o logotipo em +Z (lado do espectador).
 */

const w = (block: readonly [number, number], a: number, b: number) => [lerp(block[0], block[1], a), lerp(block[0], block[1], b)] as const;
const LIFT = (i: number, len = 0.032) => [A.lift[0] + i * 0.0021, A.lift[0] + i * 0.0021 + len] as const;

/** Chão local (o grupo raiz está a HERO_ASSEMBLY.y metros do chão, com escala HERO_SCALE). */
const FLOOR_Y = -HERO_ASSEMBLY[1] / HERO_SCALE;
const YAW_ASSEMBLY = 0.42;
const YAW_REVEAL = 1.3;

function usePhotoTextures() {
  const t = useTexture({
    side: "/textures/camera/side-panel.webp",
    mic: "/textures/camera/mic.webp",
    barrel: "/textures/camera/lens-barrel.webp",
    glass: "/textures/camera/lens-glass.webp",
    top: "/textures/camera/top-module.webp",
    pcb: "/textures/camera/pcb.webp",
    sensor: "/textures/camera/sensor.webp",
    monitor: "/textures/camera/monitor.webp",
    sd: "/textures/camera/sd-card.webp",
    battery: "/textures/camera/battery.webp",
    fan: "/textures/camera/fan.webp",
  });
  return useMemo(() => {
    Object.values(t).forEach((x) => {
      x.colorSpace = THREE.SRGBColorSpace;
      x.anisotropy = 8;
    });
    // texturas enroladas em cilindros: metade frontal mostra a fotografia inteira
    for (const x of [t.mic, t.barrel]) {
      x.wrapS = THREE.RepeatWrapping;
      x.repeat.set(2, 1);
      x.offset.set(0.5, 0);
    }
    const std = (map: THREE.Texture, p: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ map, roughness: 0.42, metalness: 0.15, ...p });
    return {
      side: std(t.side, { roughness: 0.32, metalness: 0.25 }),
      mic: std(t.mic, { roughness: 0.95, metalness: 0 }),
      barrel: std(t.barrel, { roughness: 0.38, metalness: 0.3 }),
      glass: new THREE.MeshPhysicalMaterial({ map: t.glass, transparent: true, roughness: 0.06, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.4 }),
      top: std(t.top, { roughness: 0.4 }),
      pcb: std(t.pcb, { roughness: 0.5, metalness: 0.3 }),
      sensor: std(t.sensor, { roughness: 0.15, metalness: 0.5, emissive: new THREE.Color("#4a7cff"), emissiveMap: t.sensor, emissiveIntensity: 0.25 }),
      monitor: std(t.monitor, { roughness: 0.2, emissive: new THREE.Color("#ffffff"), emissiveMap: t.monitor, emissiveIntensity: 0.55 }),
      sd: std(t.sd, { roughness: 0.35 }),
      battery: std(t.battery, { roughness: 0.5 }),
      fan: std(t.fan, { roughness: 0.5 }),
    };
  }, [t]);
}

/** Moldura metálica rectangular com furos (estrutura interna, como nas referências). */
function useFrameGeo(w0: number, h0: number, bar: number, depth: number, holes = 3) {
  return useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-w0 / 2, -h0 / 2);
    s.lineTo(w0 / 2, -h0 / 2);
    s.lineTo(w0 / 2, h0 / 2);
    s.lineTo(-w0 / 2, h0 / 2);
    s.closePath();
    const hole = new THREE.Path();
    const iw = w0 / 2 - bar;
    const ih = h0 / 2 - bar;
    hole.moveTo(-iw, -ih);
    hole.lineTo(-iw, ih);
    hole.lineTo(iw, ih);
    hole.lineTo(iw, -ih);
    hole.closePath();
    s.holes.push(hole);
    const r = bar * 0.22;
    for (let i = 0; i < holes; i++) {
      const y = -ih + ((i + 0.5) / holes) * 2 * ih;
      for (const x of [-w0 / 2 + bar / 2, w0 / 2 - bar / 2]) {
        const c = new THREE.Path();
        c.absarc(x, y, r, 0, Math.PI * 2, true);
        s.holes.push(c);
      }
    }
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: depth * 0.15, bevelSize: depth * 0.15, bevelSegments: 1, curveSegments: 10 });
    g.translate(0, 0, -depth / 2);
    return g;
  }, [w0, h0, bar, depth, holes]);
}

/** Anel de encaixe da objectiva (prateado, com 8 furos). */
function useMountGeo() {
  return useMemo(() => {
    const s = new THREE.Shape();
    s.absarc(0, 0, 0.088, 0, Math.PI * 2, false);
    const inner = new THREE.Path();
    inner.absarc(0, 0, 0.064, 0, Math.PI * 2, true);
    s.holes.push(inner);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const h = new THREE.Path();
      h.absarc(Math.cos(a) * 0.076, Math.sin(a) * 0.076, 0.0045, 0, Math.PI * 2, true);
      s.holes.push(h);
    }
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: false, curveSegments: 40 });
    g.translate(0, 0, -0.006);
    g.rotateY(Math.PI / 2);
    return g;
  }, []);
}

/** Interior estriado do pára-sol. */
function useRibMaterial() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 256;
    const g = c.getContext("2d")!;
    g.fillStyle = "#0b0b0c";
    g.fillRect(0, 0, 64, 256);
    for (let y = 0; y < 256; y += 10) {
      g.fillStyle = "#2a2a2d";
      g.fillRect(0, y, 64, 3);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1, 2);
    return new THREE.MeshStandardMaterial({ color: "#3a3a3c", map: t, roughness: 0.85, metalness: 0.2, side: THREE.DoubleSide });
  }, []);
}

export function CinemaCamera() {
  const { mat } = useAssets();
  const tier = useTier();
  const photo = usePhotoTextures();
  const frameFront = useFrameGeo(0.13, 0.19, 0.017, 0.01, 4);
  const frameRear = useFrameGeo(0.13, 0.19, 0.017, 0.01, 4);
  const mountGeo = useMountGeo();
  const ribs = useRibMaterial();
  const hoodRim = useFrameGeo(0.212, 0.258, 0.012, 0.012, 0);
  const root = useRef<THREE.Group>(null);

  // ---------- transformação global: flutua durante a montagem, roda na revelação, voa para o tripé
  const targetYaw = yawLensTo([HERO_TRIPOD[0], 0, HERO_TRIPOD[2]], SET_FOCUS);
  useAnim((p) => {
    const g = root.current;
    if (!g) return;
    const turn = ease.inOutCubic(range(p, A.reveal[0] + 0.004, A.reveal[1] - 0.008));
    const move = ease.inOutCubic(range(p, LIGHTS.cameraMove[0], LIGHTS.cameraMove[1]));
    const settle = Math.sin(Math.PI * range(p, A.reveal[0], A.reveal[1])) * 0.03;
    const end: Vec3 = [HERO_TRIPOD[0], HERO_TRIPOD_HEAD_Y + 0.15 * HERO_SCALE, HERO_TRIPOD[2]];
    const arc = Math.sin(move * Math.PI) * 0.45;
    g.position.set(lerp(HERO_ASSEMBLY[0], end[0], move), lerp(HERO_ASSEMBLY[1] + settle, end[1], move) + arc, lerp(HERO_ASSEMBLY[2], end[2], move));
    g.rotation.set(0, lerp(lerp(YAW_ASSEMBLY, YAW_REVEAL, turn), targetYaw, move), lerp(0, -0.02, move));
  });

  // ---------- especificações das peças (chão → constelação → encaixe)
  const S = useMemo(() => {
    const st = A.structure;
    const el = A.electronics;
    const ln = A.lens;
    const bd = A.body;
    const LENS_STAGE: Vec3 = [-0.24, 0, 0];
    const lensDock = w(ln, 0.74, 0.97);
    const spec = (s: MagneticSpec) => s;
    return {
      core: spec({ floor: [-0.04, -0.06], lie: [0, 0.5, 0], hover: [0, 0.02, 0], lift: LIFT(0, 0.04), attract: w(st, 0, 0.3) }),
      base: spec({ floor: [0.08, -0.33], lie: [0, -0.3, 0], hover: [0, -0.13, 0.02], lift: LIFT(2), attract: w(st, 0.12, 0.42), staging: [0, -0.05, 0], dock: w(st, 0.4, 0.5) }),
      frameF: spec({ floor: [-0.3, -0.12], lie: [0, 0.9, Math.PI / 2], hover: [-0.08, 0.04, 0.2], hoverRot: [0.3, 0.6, 0], lift: LIFT(4), attract: w(st, 0.25, 0.55), staging: [-0.06, 0, 0], dock: w(st, 0.55, 0.66) }),
      frameR: spec({ floor: [0.26, -0.12], lie: [0, -0.7, Math.PI / 2], hover: [0.1, 0.04, -0.2], hoverRot: [-0.3, -0.5, 0], lift: LIFT(6), attract: w(st, 0.35, 0.65), staging: [0.06, 0, 0], dock: w(st, 0.65, 0.76) }),
      rails: spec({ floor: [-0.12, -0.4], lie: [0, 0.2, 0], hover: [0, 0.16, 0.1], hoverRot: [0, 0.4, 0.2], lift: LIFT(8), attract: w(st, 0.5, 0.82), staging: [0, 0.06, 0], dock: w(st, 0.82, 0.96) }),

      sensor: spec({ floor: [-0.2, 0.34], lie: [0, 0.3, -Math.PI / 2], hover: [-0.12, 0.05, 0.14], hoverRot: [0, 0.8, 0.3], lift: LIFT(10), attract: w(el, 0, 0.3), staging: [-0.07, 0, 0], dock: w(el, 0.3, 0.42) }),
      pcb: spec({ floor: [0.0, 0.2], lie: [-Math.PI / 2, 0.2, 0], hover: [0.08, 0.02, 0.16], hoverRot: [0.2, -0.5, 0.1], lift: LIFT(12), attract: w(el, 0.15, 0.48), staging: [0, 0, 0.09], dock: w(el, 0.48, 0.62) }),
      fan: spec({ floor: [0.16, 0.2], lie: [-Math.PI / 2, -0.4, 0], hover: [0.18, -0.08, 0.12], hoverRot: [0.4, 0.3, 0], lift: LIFT(14), attract: w(el, 0.35, 0.65), staging: [0, 0, 0.07], dock: w(el, 0.65, 0.75) }),
      sd1: spec({ floor: [0.22, 0.34], lie: [-Math.PI / 2, 0.5, 0], hover: [0.2, -0.16, 0.14], hoverRot: [0.4, 0.9, 0.3], lift: LIFT(16), attract: w(el, 0.55, 0.8), staging: [0, 0, 0.06], dock: w(el, 0.8, 0.88) }),
      sd2: spec({ floor: [0.28, 0.36], lie: [-Math.PI / 2, -0.4, 0], hover: [0.25, -0.18, 0.15], hoverRot: [0.3, -0.8, 0.2], lift: LIFT(17), attract: w(el, 0.6, 0.85), staging: [0, 0, 0.06], dock: w(el, 0.85, 0.93) }),
      xlr: spec({ floor: [0.5, 0.2], lie: [0, 0.9, 0], hover: [-0.04, 0.17, 0.06], hoverRot: [0.3, 1.2, 0], lift: LIFT(18), attract: w(el, 0.72, 0.98) }),

      mount: spec({ floor: [-0.3, 0.2], lie: [0, 0, Math.PI / 2], hover: [-0.12, 0.0, 0.03], hoverRot: [0, 0.6, 0], lift: LIFT(20), attract: w(ln, 0, 0.22), staging: [-0.07, 0, 0], dock: w(ln, 0.22, 0.3), spin: { axis: "x", turns: 1 } }),
      glass0: spec({ floor: [-0.38, 0.34], lie: [0, 0, Math.PI / 2], hover: [-0.16, 0.03, 0.05], hoverRot: [0, 0.9, 0.2], lift: LIFT(22), attract: w(ln, 0.12, 0.38), staging: LENS_STAGE, dock: lensDock, spin: { axis: "x", turns: 1.5 } }),
      glass1: spec({ floor: [-0.47, 0.36], lie: [0, 0, Math.PI / 2], hover: [-0.18, 0.04, 0.06], hoverRot: [0, 1.1, -0.2], lift: LIFT(23), attract: w(ln, 0.18, 0.44), staging: LENS_STAGE, dock: lensDock, spin: { axis: "x", turns: -1.5 } }),
      glass2: spec({ floor: [-0.56, 0.34], lie: [0, 0, Math.PI / 2], hover: [-0.2, 0.05, 0.07], hoverRot: [0, 1.3, 0.2], lift: LIFT(24), attract: w(ln, 0.24, 0.5), staging: LENS_STAGE, dock: lensDock, spin: { axis: "x", turns: 1.5 } }),
      ring0: spec({ floor: [-0.66, 0.32], lie: [0, 0, Math.PI / 2], hover: [-0.2, 0.08, 0.03], lift: LIFT(25), attract: w(ln, 0.3, 0.54), staging: LENS_STAGE, dock: lensDock, spin: { axis: "x", turns: 3 } }),
      ring1: spec({ floor: [-0.7, 0.3], lie: [0, 0, Math.PI / 2], hover: [-0.22, -0.06, 0.04], lift: LIFT(26), attract: w(ln, 0.34, 0.58), staging: LENS_STAGE, dock: lensDock, spin: { axis: "x", turns: -3 } }),
      barrel: spec({ floor: [-0.52, 0.16], lie: [0, 0.35, 0], hover: [-0.28, 0.03, 0.05], hoverRot: [0.4, 0.3, 0], lift: LIFT(27), attract: w(ln, 0.42, 0.72), staging: LENS_STAGE, dock: lensDock, spin: { axis: "x", turns: 0.75 } }),
      hood: spec({ floor: [-0.8, 0.12], lie: [0, 0.6, 0], hover: [-0.36, 0.05, 0.06], hoverRot: [0, 0.5, 0.2], lift: LIFT(28), attract: w(ln, 0.5, 0.8), staging: LENS_STAGE, dock: w(ln, 0.8, 1) }),

      shellL: spec({ floor: [0.3, -0.4], lie: [Math.PI / 2, 0.2, 0], hover: [0.02, 0.0, -0.3], hoverRot: [0, -0.4, 0], lift: LIFT(30), attract: w(bd, 0, 0.26), staging: [0, 0, -0.09], dock: w(bd, 0.26, 0.36) }),
      topCover: spec({ floor: [0.62, -0.38], lie: [0, -0.4, 0], hover: [0.06, 0.3, -0.08], hoverRot: [0.4, 0.3, 0], lift: LIFT(32), attract: w(bd, 0.08, 0.34), staging: [0, 0.07, 0], dock: w(bd, 0.34, 0.44) }),
      side: spec({ floor: [0.55, -0.1], lie: [-Math.PI / 2, -0.25, 0], hover: [0.26, 0.06, 0.12], hoverRot: [0.1, -0.7, 0], lift: LIFT(34), attract: w(bd, 0.16, 0.44), staging: [0, 0, 0.1], dock: w(bd, 0.44, 0.55) }),
      battery: spec({ floor: [0.82, -0.08], lie: [0, 0.7, 0], hover: [0.3, -0.06, 0.04], hoverRot: [0, 0.6, 0], lift: LIFT(36), attract: w(bd, 0.3, 0.55), staging: [0.08, 0, 0], dock: w(bd, 0.55, 0.64) }),
      handle: spec({ floor: [0.02, -0.46], lie: [Math.PI / 2, 0.1, 0], hover: [0.0, 0.28, -0.04], hoverRot: [0, 0.4, 0.25], lift: LIFT(38), attract: w(bd, 0.42, 0.66), staging: [0, 0.07, 0], dock: w(bd, 0.66, 0.74) }),
      monitor: spec({ floor: [0.34, 0.2], lie: [-Math.PI / 2, 0.3, 0], hover: [0.3, -0.18, 0.12], hoverRot: [0.3, -0.6, 0], lift: LIFT(40), attract: w(bd, 0.5, 0.74), staging: [0, 0.05, 0.04], dock: w(bd, 0.74, 0.8) }),
      mic: spec({ floor: [-0.46, -0.38], lie: [0, -0.3, 0], hover: [-0.12, 0.24, 0.06], hoverRot: [0.2, 0.3, 0.15], lift: LIFT(42), attract: w(bd, 0.6, 0.82), staging: [-0.12, 0, 0], dock: w(bd, 0.82, 0.9) }),
      screws: [0, 1, 2, 3].map((i) =>
        spec({
          floor: [-0.08 + i * 0.07, 0.38],
          lie: [0, i, Math.PI / 2],
          hover: [0.06 * (i % 2 ? 1 : -1), 0.1 * (i < 2 ? 1 : -1), 0.18],
          lift: LIFT(44 + i, 0.028),
          attract: w(bd, 0.72 + i * 0.04, 0.88 + i * 0.03),
          staging: [0, 0, 0.035],
          dock: w(bd, 0.88 + i * 0.03, 0.92 + i * 0.026),
          spin: { axis: "z", turns: 6 },
        }),
      ),
    };
  }, []);

  const screwPos: Array<[number, number]> = [
    [-0.098, 0.088],
    [0.138, 0.088],
    [-0.098, -0.088],
    [0.138, -0.088],
  ];

  return (
    <group ref={root} scale={HERO_SCALE} name="hero-camera">
      <MagneticField floorY={FLOOR_Y}>
        {/* ================= ESTRUTURA INTERNA ================= */}
        <MagneticPart spec={S.core} name="nucleo">
          <Soft size={[0.18, 0.15, 0.06]} radius={0.01} position={[0.03, 0, -0.028]} material={mat.matte} />
          <Box size={[0.17, 0.01, 0.062]} position={[0.03, 0.07, -0.028]} material={mat.yellow} />
          <Box size={[0.04, 0.12, 0.055]} position={[-0.075, 0, -0.02]} material={mat.darkMetal} />
        </MagneticPart>
        <MagneticPart spec={S.base} name="base">
          <Soft size={[0.3, 0.02, 0.13]} radius={0.006} position={[0.02, -0.118, 0]} material={mat.darkMetal} />
          {[-0.11, 0.13].map((x) =>
            [-0.045, 0.045].map((z) => <Cyl key={`${x}${z}`} r={0.013} h={0.014} position={[x, -0.135, z]} material={mat.gold} seg={16} />),
          )}
          <Box size={[0.26, 0.008, 0.03]} position={[0.02, -0.106, 0]} material={mat.metal} />
        </MagneticPart>
        <MagneticPart spec={S.frameF} name="estrutura-frontal">
          <mesh geometry={frameFront} position={[-0.104, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={mat.metal} castShadow />
        </MagneticPart>
        <MagneticPart spec={S.frameR} name="estrutura-traseira">
          <mesh geometry={frameRear} position={[0.146, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={mat.metal} castShadow />
        </MagneticPart>
        <MagneticPart spec={S.rails} name="calhas">
          {[0.097, -0.097].map((y) =>
            [0.06, -0.06].map((z) => <Box key={`${y}${z}`} size={[0.25, 0.012, 0.012]} position={[0.02, y, z]} material={mat.metal} />),
          )}
          {[-0.04, 0.08].map((x) => (
            <Box key={x} size={[0.014, 0.014, 0.134]} position={[x, 0.097, 0]} material={mat.yellow} />
          ))}
        </MagneticPart>

        {/* ================= SENSOR E ELECTRÓNICA ================= */}
        <MagneticPart spec={S.sensor} name="sensor">
          <Box size={[0.012, 0.095, 0.095]} position={[-0.09, 0, 0]} material={mat.darkMetal} />
          <Plane size={[0.064, 0.078]} position={[-0.0966, 0, 0]} rotation={[0, -Math.PI / 2, 0]} material={photo.sensor} />
        </MagneticPart>
        <MagneticPart spec={S.pcb} name="placa">
          <Box size={[0.1, 0.165, 0.004]} position={[0.05, 0, 0.05]} material={mat.pcb} />
          <Plane size={[0.1, 0.165]} position={[0.05, 0, 0.0525]} material={photo.pcb} />
        </MagneticPart>
        <MagneticPart spec={S.fan} name="ventoinha">
          <Box size={[0.058, 0.052, 0.022]} position={[0.118, 0.045, 0.045]} material={mat.matte} />
          <Plane size={[0.056, 0.05]} position={[0.118, 0.045, 0.0565]} material={photo.fan} />
        </MagneticPart>
        <MagneticPart spec={S.sd1} name="cartao-1">
          <Box size={[0.026, 0.034, 0.002]} position={[0.112, -0.07, 0.058]} material={mat.matte} />
          <Plane size={[0.026, 0.034]} position={[0.112, -0.07, 0.0592]} material={photo.sd} />
        </MagneticPart>
        <MagneticPart spec={S.sd2} name="cartao-2">
          <Box size={[0.026, 0.034, 0.002]} position={[0.142, -0.07, 0.058]} material={mat.matte} />
          <Plane size={[0.026, 0.034]} position={[0.142, -0.07, 0.0592]} material={photo.sd} />
        </MagneticPart>
        <MagneticPart spec={S.xlr} name="modulo-audio">
          <Soft size={[0.07, 0.05, 0.095]} radius={0.008} position={[-0.075, 0.14, 0]} material={mat.body} />
          <Plane size={[0.095, 0.054]} position={[-0.1115, 0.14, 0]} rotation={[0, -Math.PI / 2, 0]} material={photo.top} />
          <Cyl r={0.011} h={0.014} axis="z" position={[-0.075, 0.14, 0.054]} material={mat.darkMetal} seg={14} />
          <Cyl r={0.011} h={0.014} axis="z" position={[-0.075, 0.14, -0.054]} material={mat.darkMetal} seg={14} />
        </MagneticPart>

        {/* ================= CONJUNTO ÓPTICO ================= */}
        <MagneticPart spec={S.mount} name="anel-encaixe">
          <mesh geometry={mountGeo} position={[-0.122, 0, 0]} material={mat.metal} castShadow />
          <Cyl r={0.066} h={0.01} axis="x" position={[-0.112, 0, 0]} material={mat.darkMetal} seg={40} />
        </MagneticPart>
        {[0, 1, 2].map((i) => (
          <MagneticPart key={i} spec={[S.glass0, S.glass1, S.glass2][i]} name={`elemento-optico-${i}`}>
            <mesh position={[-0.17 - i * 0.04, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mat.glass}>
              <cylinderGeometry args={[0.066, 0.066, 0.009, 48]} />
            </mesh>
            <mesh position={[-0.17 - i * 0.04, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={mat.gold}>
              <torusGeometry args={[0.067, 0.0025, 6, 48]} />
            </mesh>
          </MagneticPart>
        ))}
        {[0, 1].map((i) => (
          <MagneticPart key={`r${i}`} spec={i ? S.ring1 : S.ring0} name={`anel-optico-${i}`}>
            <mesh position={[-0.19 - i * 0.04, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={i ? mat.yellow : mat.metal}>
              <torusGeometry args={[0.07, 0.005, 8, 56]} />
            </mesh>
          </MagneticPart>
        ))}
        <MagneticPart spec={S.barrel} name="objectiva">
          <Cyl r={0.078} h={0.17} axis="x" position={[-0.215, 0, 0]} material={photo.barrel} seg={56} open />
          <Cyl r={0.077} h={0.168} axis="x" position={[-0.215, 0, 0]} material={mat.body} seg={40} />
          <Cyl r={0.082} h={0.014} axis="x" position={[-0.295, 0, 0]} material={mat.body} seg={56} />
          <Cyl r={0.083} h={0.004} axis="x" position={[-0.287, 0, 0]} material={mat.yellow} seg={56} />
          <Cyl r={0.062} h={0.012} axis="x" position={[-0.127, 0, 0]} material={mat.metal} seg={40} />
          <mesh position={[-0.3025, 0, 0]} rotation={[0, -Math.PI / 2, 0]} material={photo.glass}>
            <circleGeometry args={[0.074, 64]} />
          </mesh>
        </MagneticPart>
        <MagneticPart spec={S.hood} name="para-sol">
          <group position={[-0.358, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <group scale={[1, 1, 0.82]}>
              <mesh rotation={[0, Math.PI / 4, 0]} material={mat.softboxShell} castShadow>
                <cylinderGeometry args={[0.178, 0.128, 0.115, 4, 1, true]} />
              </mesh>
              <mesh rotation={[0, Math.PI / 4, 0]} scale={[0.985, 0.995, 0.985]} material={ribs}>
                <cylinderGeometry args={[0.178, 0.128, 0.114, 4, 1, true]} />
              </mesh>
            </group>
          </group>
          <mesh geometry={hoodRim} position={[-0.416, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={mat.body} castShadow />
        </MagneticPart>

        {/* ================= PAINÉIS E ACESSÓRIOS ================= */}
        <MagneticPart spec={S.shellL} name="painel-esquerdo">
          <Soft size={[0.27, 0.21, 0.014]} radius={0.012} position={[0.02, 0, -0.082]} material={mat.body} />
          {[-0.06, -0.03, 0].map((y) => (
            <Box key={y} size={[0.02, 0.012, 0.006]} position={[-0.08, y, -0.091]} material={mat.grip} />
          ))}
          <Box size={[0.27, 0.01, 0.004]} position={[0.02, -0.09, -0.0895]} material={mat.yellow} />
        </MagneticPart>
        <MagneticPart spec={S.topCover} name="tampa-superior">
          <Soft size={[0.27, 0.014, 0.164]} radius={0.006} position={[0.02, 0.112, 0]} material={mat.body} />
          <Box size={[0.25, 0.004, 0.012]} position={[0.02, 0.12, 0.07]} material={mat.yellow} />
        </MagneticPart>
        <MagneticPart spec={S.side} name="painel-viraliza">
          <Soft size={[0.27, 0.212, 0.014]} radius={0.012} position={[0.02, 0, 0.082]} material={mat.body} />
          <Plane size={[0.266, 0.213]} position={[0.02, 0, 0.0897]} material={photo.side} />
        </MagneticPart>
        <MagneticPart spec={S.battery} name="bateria">
          <Soft size={[0.062, 0.16, 0.124]} radius={0.01} position={[0.187, 0, 0]} material={mat.matte} />
          <Plane size={[0.058, 0.057]} position={[0.187, 0.02, 0.0625]} material={photo.battery} />
          <Box size={[0.064, 0.012, 0.126]} position={[0.187, -0.06, 0]} material={mat.yellow} />
        </MagneticPart>
        <MagneticPart spec={S.handle} name="pega">
          <Soft size={[0.03, 0.08, 0.032]} radius={0.008} position={[-0.075, 0.155, 0]} material={mat.body} />
          <Soft size={[0.03, 0.08, 0.032]} radius={0.008} position={[0.11, 0.155, 0]} material={mat.body} />
          <Soft size={[0.24, 0.032, 0.036]} radius={0.012} position={[0.018, 0.208, 0]} material={mat.body} />
          <Box size={[0.2, 0.004, 0.038]} position={[0.018, 0.225, 0]} material={mat.yellow} />
          <Cyl r={0.019} h={0.1} axis="x" position={[0.02, 0.208, 0]} material={mat.rubber} seg={18} />
        </MagneticPart>
        <MagneticPart spec={S.monitor} name="monitor">
          <Rod from={[0.13, 0.12, 0.05]} to={[0.13, 0.16, 0.066]} r={0.005} material={mat.darkMetal} />
          <group position={[0.13, 0.172, 0.078]} rotation={[-0.15, 0.25, 0]}>
            <Soft size={[0.122, 0.074, 0.014]} radius={0.005} material={mat.body} />
            <Plane size={[0.112, 0.063]} position={[0, 0, 0.0075]} material={photo.monitor} />
          </group>
        </MagneticPart>
        <MagneticPart spec={S.mic} name="microfone">
          <Cyl r={0.034} h={0.24} axis="x" position={[-0.25, 0.205, 0]} material={photo.mic} seg={48} />
          <mesh position={[-0.37, 0.205, 0]} material={mat.foam}>
            <sphereGeometry args={[0.034, 24, 12]} />
          </mesh>
          <Cyl r={0.028} h={0.03} axis="x" position={[-0.115, 0.205, 0]} material={mat.darkMetal} seg={24} />
          {[-0.15, -0.2].map((x) => (
            <mesh key={x} position={[x, 0.205, 0]} rotation={[0, Math.PI / 2, 0]} material={mat.darkMetal}>
              <torusGeometry args={[0.039, 0.003, 6, 32]} />
            </mesh>
          ))}
          <Rod from={[-0.175, 0.166, 0]} to={[-0.1, 0.166, 0]} r={0.006} material={mat.darkMetal} />
          <Rod from={[-0.12, 0.166, 0]} to={[-0.11, 0.205, 0.02]} r={0.003} material={mat.rubber} />
        </MagneticPart>
        {S.screws.map((sp, i) => (
          <MagneticPart key={`sc${i}`} spec={sp} name={`parafuso-${i}`}>
            <Cyl r={0.0055} h={0.006} axis="z" position={[0.02 + screwPos[i][0], screwPos[i][1], 0.0915]} material={mat.metal} seg={12} />
          </MagneticPart>
        ))}
      </MagneticField>

      <RevealFX tier={tier} />
    </group>
  );
}

/**
 * Efeitos da revelação (no referencial da câmara): campo magnético no chão durante a
 * montagem, varrimento de luz dourada, destaque do logotipo e reflexo óptico na lente.
 */
function RevealFX({ tier }: { tier: string }) {
  const sweep = useRef<THREE.PointLight>(null);
  const logo = useRef<THREE.SpotLight>(null);
  const lensSweep = useRef<THREE.PointLight>(null);
  const flare = useRef<THREE.Sprite>(null);
  const field = useRef<THREE.Group>(null);
  const R = A.reveal;

  const logoTarget = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(0.02, 0, 0.09);
    return o;
  }, []);

  const flareMat = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 128;
    const g = c.getContext("2d")!;
    const streak = g.createLinearGradient(0, 0, 512, 0);
    streak.addColorStop(0, "rgba(255,190,60,0)");
    streak.addColorStop(0.5, "rgba(255,240,210,1)");
    streak.addColorStop(1, "rgba(255,190,60,0)");
    g.fillStyle = streak;
    g.fillRect(0, 60, 512, 8);
    const glow = g.createRadialGradient(256, 64, 0, 256, 64, 60);
    glow.addColorStop(0, "rgba(255,255,255,1)");
    glow.addColorStop(0.3, "rgba(255,210,120,.6)");
    glow.addColorStop(1, "rgba(255,170,30,0)");
    g.fillStyle = glow;
    g.fillRect(196, 4, 120, 120);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.SpriteMaterial({ map: t, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, toneMapped: false });
  }, []);

  // poça de luz dourada no chão (como nas renders oficiais)
  const poolMat = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d")!;
    const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    r.addColorStop(0, "rgba(255,190,60,.55)");
    r.addColorStop(0.45, "rgba(255,160,20,.18)");
    r.addColorStop(1, "rgba(255,140,0,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  }, []);
  const ringMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#ffb800", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }),
    [],
  );

  useAnim((p) => {
    // campo magnético no chão: aparece quando as peças levitam e apaga-se na revelação
    const on = range(p, A.lift[0] - 0.01, A.lift[0] + 0.02) * (1 - range(p, R[0], R[0] + 0.02));
    ringMat.opacity = on * (0.28 + 0.12 * Math.sin(p * 260));
    poolMat.opacity = 0.75 * (1 - range(p, LIGHTS.cameraMove[0], LIGHTS.cameraMove[0] + 0.03));
    if (field.current) {
      field.current.visible = on > 0.001;
      const s = 1 + 0.06 * Math.sin(p * 140);
      field.current.scale.set(s, 1, s);
      field.current.rotation.y = p * 6;
    }
    // reflexo dourado a percorrer a estrutura
    const sw = range(p, R[0] + 0.002, R[0] + 0.018);
    if (sweep.current) {
      sweep.current.position.set(lerp(0.35, -0.45, ease.inOutSine(sw)), 0.12, 0.3);
      sweep.current.intensity = Math.sin(Math.PI * sw) * 2.2;
    }
    // logotipo em destaque (mantém-se até a câmara partir para o tripé)
    if (logo.current) logo.current.intensity = ease.inOutSine(range(p, R[0] + 0.006, R[0] + 0.02)) * (1 - range(p, LIGHTS.cameraMove[0] + 0.02, LIGHTS.cameraMove[1])) * 1.3;
    // reflexo óptico a atravessar a lente, depois da rotação para a frente
    const ls = range(p, R[1] - 0.016, R[1]);
    if (lensSweep.current) {
      lensSweep.current.position.set(-0.62, 0.08, lerp(0.16, -0.16, ls));
      lensSweep.current.intensity = Math.sin(Math.PI * ls) * 0.5;
    }
    const f = Math.sin(Math.PI * range(p, R[1] - 0.02, R[1] + 0.012));
    flareMat.opacity = f * 0.95;
    if (flare.current) {
      flare.current.visible = f > 0.01;
      flare.current.scale.set(0.45 + 0.25 * f, 0.1 + 0.05 * f, 1);
    }
  });

  return (
    <group>
      <mesh position={[0.0, FLOOR_Y + 0.001, 0.05]} rotation={[-Math.PI / 2, 0, 0]} material={poolMat}>
        <planeGeometry args={[2.4, 1.6]} />
      </mesh>
      <group ref={field} position={[0.02, FLOOR_Y + 0.002, 0]}>
        {[0.42, 0.62, 0.86].map((r) => (
          <mesh key={r} rotation={[-Math.PI / 2, 0, 0]} material={ringMat}>
            <ringGeometry args={[r, r + 0.006, 96]} />
          </mesh>
        ))}
      </group>
      <pointLight ref={sweep} color="#ffcf5a" distance={0.9} decay={2} intensity={0} />
      <primitive object={logoTarget} />
      <spotLight ref={logo} position={[0.1, 0.3, 0.55]} target={logoTarget} angle={0.45} penumbra={0.9} distance={2} decay={2} intensity={0} color="#fff1cf" />
      <pointLight ref={lensSweep} color="#ffe0a0" distance={0.5} decay={2} intensity={0} />
      {tier !== "low" && <sprite ref={flare} material={flareMat} position={[-0.31, 0, 0]} visible={false} />}
    </group>
  );
}
