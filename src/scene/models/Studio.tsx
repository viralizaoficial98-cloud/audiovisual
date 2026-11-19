"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { ease, lerp, range, type Vec3 } from "@/animation/math";
import { STUDIO_STEPS as S } from "@/animation/phases";
import { useAssets } from "../context";
import { Assemble, type AssembleFrom } from "../parts/Assemble";
import { InstancedAssemble, type InstanceSpec } from "../parts/InstancedAssemble";
import { useAnim, useTier } from "../parts/driver";
import { Box, Cyl, Plane } from "../parts/shapes";
import { CAM2_TRIPOD, ROOM, SET, SET_FOCUS, yawFrontTo, yawLensTo } from "../layout";
import {
  Armchair,
  CoffeeTable,
  DeskBody,
  Headphones,
  MicArmRods,
  Mixer,
  Mug,
  Plant,
  PodcastMic,
  PodcastTableBase,
  PodcastTableTop,
  ProductionMonitor,
  SHELF,
  ShelfBoard,
  ShelfDecor,
  ShelfFrame,
  Sofa,
  StudioCameraBody,
  Tv,
} from "./props";
import { FluidHead, LedPanel, LightStand, Softbox } from "./rigs";

/**
 * FASE 4 — Construção da sala de podcast, nas 14 etapas pedidas.
 * Regras de movimento para evitar "aparições":
 *  - mobiliário e equipamento entram pela frente (abaixo do enquadramento) e deslizam;
 *  - paredes, estantes e bases sobem do chão como elevadores de palco;
 *  - revestimentos voam em fluxo escalonado até às paredes;
 *  - fitas LED crescem ao longo do seu comprimento;
 *  - só objectos pequenos (adereços) entram com escala.
 */

const FRONT_Z = 4.8;
/** Deslocamento para uma peça entrar pela frente da sala, ao nível do chão. */
const fromFront = (pos: Vec3, dx = 0, extra: Partial<AssembleFrom> = {}): AssembleFrom => ({ p: [dx, 0, FRONT_Z - pos[2]], ...extra });
/** Deslocamento para subir do chão. */
const fromFloor = (h: number, extra: Partial<AssembleFrom> = {}): AssembleFrom => ({ p: [0, -h - 0.05, 0], ...extra });

const sub = (w: readonly [number, number], a: number, b: number) => [w[0] + (w[1] - w[0]) * a, w[0] + (w[1] - w[0]) * b] as const;

const BACK = ROOM.backZ;
const WALL_IN = BACK + 0.06; // face interior da parede de fundo

export function Studio() {
  return (
    <group name="studio">
      <Structure />
      <Acoustic />
      <Coverings />
      <LedStrips />
      <Identity />
      <TvUnit />
      <Shelves />
      <Seating />
      <Tables />
      <Mics />
      <Accessories />
      <StudioCameras />
      <ExtraLighting />
      <Production />
      <FinalLighting />
    </group>
  );
}

/* 0. Estrutura (paredes e tecto) ------------------------------------------------ */
function Structure() {
  const { mat } = useAssets();
  const W = ROOM.width + 0.24;
  const depth = ROOM.frontZ - ROOM.backZ + 0.1;
  const zMid = (ROOM.frontZ + ROOM.backZ) / 2;
  return (
    <group>
      <Assemble at={sub(S.structure, 0, 0.75)} from={fromFloor(4.1)} ease={ease.outCubic} hideBefore>
        <Box size={[W, ROOM.height, 0.12]} position={[0, ROOM.height / 2, BACK - 0.06]} material={mat.wallDark} />
      </Assemble>
      <Assemble at={sub(S.structure, 0.1, 0.85)} from={fromFloor(4.1)} ease={ease.outCubic} hideBefore>
        <Box size={[5.0, ROOM.height, 0.02]} position={[-4.5, ROOM.height / 2, WALL_IN + 0.01]} material={mat.wallYellow} />
      </Assemble>
      <Assemble at={sub(S.structure, 0.15, 0.9)} from={fromFloor(4.1)} ease={ease.outCubic} hideBefore>
        <Box size={[0.12, ROOM.height, depth]} position={[ROOM.minX - 0.06, ROOM.height / 2, zMid]} material={mat.wallDark} />
      </Assemble>
      <Assemble at={sub(S.structure, 0.2, 0.95)} from={fromFloor(4.1)} ease={ease.outCubic} hideBefore>
        <Box size={[0.12, ROOM.height, depth]} position={[ROOM.maxX + 0.06, ROOM.height / 2, zMid]} material={mat.wallDark} />
      </Assemble>
      <Assemble at={sub(S.structure, 0.35, 1)} from={{ p: [0, 3.2, 0] }} ease={ease.outCubic} hideBefore>
        <Box size={[W, 0.12, depth]} position={[0, ROOM.height + 0.06, zMid]} material={mat.ceiling} />
      </Assemble>
    </group>
  );
}

/* 1. Painéis acústicos ------------------------------------------------------------ */
function pyramidGeo(facing: "x" | "z") {
  const h = 0.12;
  const g = new THREE.ConeGeometry(0.355, h, 4, 1);
  g.translate(0, h / 2, 0);
  g.rotateY(Math.PI / 4);
  if (facing === "x") g.rotateZ(Math.PI / 2);
  else g.rotateX(Math.PI / 2);
  return g;
}

function Acoustic() {
  const { mat } = useAssets();
  const tier = useTier();
  const geoX = useMemo(() => pyramidGeo("x"), []);
  const geoZ = useMemo(() => pyramidGeo("z"), []);

  const right = useMemo<InstanceSpec[]>(() => {
    const items: InstanceSpec[] = [];
    const cols = tier === "low" ? 8 : 11;
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < cols; c++) {
        const z = -3.95 + c * (5.6 / (cols - 1));
        const y = 0.95 + r * 0.56;
        const pos: Vec3 = [ROOM.maxX, y, z];
        items.push({ position: pos, from: [-3.2 - (c % 3) * 0.4, -y - 0.6, FRONT_Z - z], fromRot: [1.4, 2.2, 0.6] });
      }
    return items;
  }, [tier]);

  const back = useMemo<InstanceSpec[]>(() => {
    const items: InstanceSpec[] = [];
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 5; c++) {
        const x = 4.4 + c * 0.56;
        const y = 0.95 + r * 0.56;
        const pos: Vec3 = [x, y, WALL_IN];
        items.push({ position: pos, from: [-(x - 3) * 0.6, -y - 0.5, FRONT_Z - WALL_IN], fromRot: [2, 1.4, 0] });
      }
    return items;
  }, []);

  return (
    <group>
      <InstancedAssemble items={right} geometry={geoX} material={mat.foamTile} at={S.acoustic} stagger={0.65} />
      <InstancedAssemble items={back} geometry={geoZ} material={mat.foamTile} at={sub(S.acoustic, 0.15, 1)} stagger={0.6} />
      {/* nuvens acústicas no tecto */}
      {(
        [
          [-4.2, -2.6, 3.4, 2.2],
          [2.0, -2.2, 3.6, 2.2],
        ] as Array<[number, number, number, number]>
      ).map(([x, z, w, d], i) => (
        <Assemble key={i} at={sub(S.acoustic, 0.3 + i * 0.15, 0.9 + i * 0.1)} from={{ p: [0, 0.6, 0] }} ease={ease.outCubic} hideBefore>
          <Box size={[w, 0.1, d]} position={[x, ROOM.height - 0.12, z]} material={mat.acoustic} />
        </Assemble>
      ))}
    </group>
  );
}

/* 2. Revestimentos decorativos ---------------------------------------------------- */
function Coverings() {
  const { mat } = useAssets();
  const tier = useTier();
  const slatGeo = useMemo(() => new THREE.BoxGeometry(0.06, 3.7, 0.08), []);
  const darkSlatGeo = useMemo(() => new THREE.BoxGeometry(0.04, 3.6, 0.06), []);

  const wood = useMemo<InstanceSpec[]>(() => {
    const n = tier === "low" ? 16 : 26;
    return Array.from({ length: n }, (_, i) => {
      const z = -4.25 + i * (6.9 / (n - 1));
      return { position: [ROOM.minX + 0.05, 1.95, z] as Vec3, from: [3.5, -1.9, FRONT_Z - z] as Vec3, fromRot: [0.5, 0, 1.2] as Vec3 };
    });
  }, [tier]);

  const darkSlats = useMemo<InstanceSpec[]>(() => {
    const xs = [1.0, 1.06, 1.12, 2.88, 2.94, 3.0];
    return xs.map((x) => ({ position: [x, 1.85, WALL_IN + 0.05] as Vec3, from: [0, -3.8, 0] as Vec3, fromRot: [0, 0, 0] as Vec3 }));
  }, []);

  return (
    <group>
      <InstancedAssemble items={wood} geometry={slatGeo} material={mat.wood} at={S.coverings} stagger={0.7} />
      <InstancedAssemble items={darkSlats} geometry={darkSlatGeo} material={mat.matte} at={sub(S.coverings, 0.2, 1)} stagger={0.5} />
      {/* painel escuro do set de podcast e nicho da TV */}
      <Assemble at={sub(S.coverings, 0, 0.6)} from={fromFloor(4)} ease={ease.outCubic} hideBefore>
        <Box size={[4.3, 3.9, 0.05]} position={[2.0, 1.95, WALL_IN + 0.025]} material={mat.wallPanel} />
      </Assemble>
      <Assemble at={sub(S.coverings, 0.2, 0.8)} from={fromFloor(4)} ease={ease.outCubic} hideBefore>
        <Box size={[1.62, 3.8, 0.03]} position={[2.0, 1.9, WALL_IN + 0.06]} material={mat.wallDark} />
      </Assemble>
      {/* rodapé dourado da recepção */}
      <Assemble at={sub(S.coverings, 0.4, 1)} from={{ p: [-5, 0, 0] }} ease={ease.outCubic} hideBefore>
        <Box size={[5.0, 0.08, 0.04]} position={[-4.5, 0.04, WALL_IN + 0.04]} material={mat.gold} />
      </Assemble>
    </group>
  );
}

/* 3. Fitas LED -------------------------------------------------------------------- */
function Strip({ from, to, at, thickness = 0.03, material }: { from: Vec3; to: Vec3; at: readonly [number, number]; thickness?: number; material: THREE.Material }) {
  const ref = useRef<THREE.Group>(null);
  const { len, quat } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const d = b.sub(a);
    return { len: d.length(), quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), d.normalize()) };
  }, [from, to]);
  useAnim((p) => {
    const t = ease.inOutSine(range(p, at[0], at[1]));
    const g = ref.current;
    if (!g) return;
    g.scale.x = Math.max(t, 1e-4);
    g.visible = t > 0;
  });
  return (
    <group position={from} quaternion={quat}>
      <group ref={ref}>
        <mesh position={[len / 2, 0, 0]} material={material}>
          <boxGeometry args={[len, thickness, thickness]} />
        </mesh>
      </group>
    </group>
  );
}

const BANNER = { x: -4.3, y: 2.3, w: 3.9, h: 1.65 };

function LedStrips() {
  const { mat } = useAssets();
  const top = ROOM.height - 0.07;
  const zb = WALL_IN + 0.04;
  const L = S.ledStrips;
  const bx0 = BANNER.x - BANNER.w / 2 - 0.05;
  const bx1 = BANNER.x + BANNER.w / 2 + 0.05;
  const by0 = BANNER.y - BANNER.h / 2 - 0.05;
  const by1 = BANNER.y + BANNER.h / 2 + 0.05;
  const strips: Array<{ f: Vec3; t: Vec3; a: number; b: number; th?: number; m?: THREE.Material }> = [
    { f: [0, top, zb], t: [ROOM.maxX - 0.05, top, zb], a: 0, b: 0.6 },
    { f: [0, top, zb], t: [ROOM.minX + 0.05, top, zb], a: 0, b: 0.6 },
    { f: [ROOM.minX + 0.07, top, zb], t: [ROOM.minX + 0.07, top, ROOM.frontZ], a: 0.45, b: 1 },
    { f: [ROOM.maxX - 0.07, top, zb], t: [ROOM.maxX - 0.07, top, ROOM.frontZ], a: 0.45, b: 1 },
    { f: [1.2, 0.08, zb + 0.06], t: [1.2, 3.75, zb + 0.06], a: 0.2, b: 0.7, th: 0.035 },
    { f: [2.8, 0.08, zb + 0.06], t: [2.8, 3.75, zb + 0.06], a: 0.25, b: 0.75, th: 0.035 },
    { f: [-6.75, 0.1, zb], t: [-2.25, 0.1, zb], a: 0.3, b: 0.8 },
    { f: [bx0, by0, zb], t: [bx1, by0, zb], a: 0.35, b: 0.8, th: 0.025 },
    { f: [bx1, by0, zb], t: [bx1, by1, zb], a: 0.45, b: 0.85, th: 0.025 },
    { f: [bx1, by1, zb], t: [bx0, by1, zb], a: 0.5, b: 0.95, th: 0.025 },
    { f: [bx0, by1, zb], t: [bx0, by0, zb], a: 0.6, b: 1, th: 0.025 },
    { f: [-0.2, top - 0.08, -3.3], t: [4.2, top - 0.08, -3.3], a: 0.4, b: 0.9, m: mat.stripWarm },
    { f: [-0.2, top - 0.08, -1.1], t: [4.2, top - 0.08, -1.1], a: 0.45, b: 0.95, m: mat.stripWarm },
    { f: [-6.2, top - 0.08, -1.4], t: [-2.2, top - 0.08, -1.4], a: 0.5, b: 1, m: mat.stripWarm },
  ];
  return (
    <group>
      {strips.map((s, i) => (
        <Strip key={i} from={s.f} to={s.t} at={sub(L, s.a, s.b)} thickness={s.th ?? 0.03} material={s.m ?? mat.stripYellow} />
      ))}
    </group>
  );
}

/* 4. Identidade: painel do logotipo, banner e painéis de ícones ------------------- */
function Identity() {
  const { mat } = useAssets();
  const icons = [mat.iconAudiovisual, mat.iconPodcast, mat.iconProducao];
  return (
    <group>
      <Assemble
        at={S.logoPanel}
        from={{ p: [0, -2.2, FRONT_Z - BACK], r: [-1.3, 0, 0.2] }}
        position={[2.0, 3.05, WALL_IN + 0.09]}
        ease={ease.inOutCubic}
        hideBefore
      >
        <Plane size={[2.1, 1.15]} material={mat.logoWall} />
      </Assemble>
      <Assemble at={sub(S.logoPanel, 0, 0.9)} from={{ p: [-4, -1.2, 3.5], r: [0, 1.2, 0] }} position={[BANNER.x, BANNER.y, WALL_IN + 0.03]} ease={ease.inOutCubic} hideBefore>
        <Box size={[BANNER.w + 0.06, BANNER.h + 0.06, 0.03]} position={[0, 0, -0.012]} material={mat.matte} />
        <Plane size={[BANNER.w, BANNER.h]} position={[0, 0, 0.005]} material={mat.banner} />
      </Assemble>
      {icons.map((m, i) => (
        <Assemble
          key={i}
          at={sub(S.logoPanel, 0.15 + i * 0.15, 0.7 + i * 0.1)}
          from={{ p: [0, 0, 1.4], r: [0, Math.PI, 0] }}
          position={[-1.6 + i * 0.6, 2.25, WALL_IN + 0.05]}
          ease={ease.inOutCubic}
          hideBefore
          scale={1}
        >
          <Box size={[0.5, 1.0, 0.04]} material={mat.matte} />
          <Plane size={[0.48, 0.96]} position={[0, 0, 0.021]} material={m} />
        </Assemble>
      ))}
    </group>
  );
}

/* 5. Televisão -------------------------------------------------------------------- */
function TvUnit() {
  const { mat } = useAssets();
  useAnim((p) => {
    const on = ease.inOutSine(range(p, S.tv[1] - 0.01, S.tv[1] + 0.02));
    const fin = range(p, S.finalLight[0], S.finalLight[1]);
    (mat.tvScreen as THREE.MeshStandardMaterial).emissiveIntensity = on * (0.75 + 0.25 * fin);
  });
  return (
    <Assemble at={S.tv} from={{ p: [0, -0.6, FRONT_Z - BACK - 1], r: [0.4, 0.9, 0] }} position={[2.0, 1.72, WALL_IN + 0.12]} ease={ease.inOutCubic} hideBefore>
      <Tv />
    </Assemble>
  );
}

/* 6. Estantes e decoração ------------------------------------------------------- */
function Shelves() {
  const xs = [0.55, 3.45];
  const z = WALL_IN + SHELF.d / 2 + 0.01;
  return (
    <group>
      {xs.map((x, si) => (
        <group key={si} position={[x, 0, z]}>
          <Assemble at={sub(S.shelves, si * 0.1, 0.45 + si * 0.1)} from={fromFloor(SHELF.h)} ease={ease.outCubic} hideBefore>
            <ShelfFrame />
          </Assemble>
          {SHELF.boards.map((y, bi) => (
            <Assemble
              key={bi}
              at={sub(S.shelves, 0.3 + bi * 0.07 + si * 0.05, 0.6 + bi * 0.07 + si * 0.05)}
              from={{ p: [0, -y + 0.1, FRONT_Z - z], r: [0, si ? -0.6 : 0.6, 0] }}
              position={[0, y, 0]}
              ease={ease.outCubic}
              hideBefore
            >
              <ShelfBoard />
            </Assemble>
          ))}
          {SHELF.boards.slice(0, 4).map((y, bi) => (
            <Assemble
              key={`d${bi}`}
              at={sub(S.shelves, 0.7 + bi * 0.06, 0.95 + bi * 0.012)}
              from={{ p: [0, 0.3, 0.2], r: [0, 1.6, 0], s: 0.01 }}
              position={[si ? 0.08 : -0.12, y + 0.016, 0]}
              ease={ease.outCubic}
              hideBefore
            >
              <ShelfDecor variant={bi + si * 2} />
            </Assemble>
          ))}
        </group>
      ))}
    </group>
  );
}

/* 7. Cadeiras, sofás e tapete ---------------------------------------------------- */
const CHAIR_L: Vec3 = [1.15, 0, -2.2];
const CHAIR_R: Vec3 = [2.85, 0, -2.2];

function Seating() {
  const { mat } = useAssets();
  const sofaPos: Vec3 = [-4.3, 0, -3.65];
  const loungeA: Vec3 = [-1.55, 0, -1.55];
  const loungeB: Vec3 = [-0.45, 0, -1.2];
  return (
    <group>
      <Assemble at={sub(S.seating, 0, 0.45)} from={{ s: [0.02, 1, 1], r: [0, 0, 0] }} position={[SET[0], 0.006, SET[2]]} ease={ease.inOutCubic} hideBefore>
        <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[1.3, 1, 1]} material={mat.rug} receiveShadow>
          <circleGeometry args={[1.55, 48]} />
        </mesh>
      </Assemble>
      <Assemble at={sub(S.seating, 0, 0.45)} from={{ s: [0.02, 1, 1] }} position={[-4.3, 0.006, -2.6]} ease={ease.inOutCubic} hideBefore>
        <mesh rotation={[-Math.PI / 2, 0, 0]} material={mat.rug} receiveShadow>
          <planeGeometry args={[3.4, 2.4]} />
        </mesh>
      </Assemble>
      <Assemble at={sub(S.seating, 0.15, 0.8)} from={fromFront(CHAIR_L, -1.2, { r: [0, -1.4, 0] })} position={CHAIR_L} rotation={[0, 0.62, 0]} ease={ease.inOutCubic} hideBefore>
        <Armchair />
      </Assemble>
      <Assemble at={sub(S.seating, 0.25, 0.9)} from={fromFront(CHAIR_R, 1.2, { r: [0, 1.4, 0] })} position={CHAIR_R} rotation={[0, -0.62, 0]} ease={ease.inOutCubic} hideBefore>
        <Armchair />
      </Assemble>
      <Assemble at={sub(S.seating, 0.2, 1)} from={fromFront(sofaPos, -1.5, { r: [0, -0.8, 0] })} position={sofaPos} ease={ease.inOutCubic} hideBefore>
        <Sofa />
      </Assemble>
      <Assemble at={sub(S.seating, 0.35, 1)} from={fromFront(loungeA, -0.6, { r: [0, -1, 0] })} position={loungeA} rotation={[0, 0.9, 0]} ease={ease.inOutCubic} hideBefore>
        <Armchair fabric={mat.leather} />
      </Assemble>
      <Assemble at={sub(S.seating, 0.42, 1)} from={fromFront(loungeB, 0.4, { r: [0, 1, 0] })} position={loungeB} rotation={[0, 0.5, 0]} ease={ease.inOutCubic} hideBefore>
        <Armchair fabric={mat.leather} />
      </Assemble>
      {/* balcão de recepção / showcase */}
      <Assemble at={sub(S.seating, 0.3, 1)} from={fromFront([-4.4, 0, 0.9], -1)} position={[-4.4, 0, 0.9]} ease={ease.inOutCubic} hideBefore>
        <Box size={[2.6, 1.0, 0.6]} position={[0, 0.5, 0]} material={mat.matte} />
        <Box size={[2.7, 0.05, 0.7]} position={[0, 1.02, 0]} material={mat.body} />
        <Plane size={[2.56, 0.95]} position={[0, 0.5, 0.301]} material={mat.reception} />
      </Assemble>
    </group>
  );
}

/* 8. Mesas ------------------------------------------------------------------------ */
function Tables() {
  return (
    <group>
      <Assemble at={sub(S.table, 0, 0.6)} from={fromFloor(0.7)} position={SET} ease={ease.outCubic} hideBefore>
        <PodcastTableBase />
      </Assemble>
      <Assemble at={sub(S.table, 0.25, 1)} from={{ p: [0, -0.6, FRONT_Z - SET[2]], r: [0, Math.PI, 0] }} position={SET} ease={ease.inOutCubic} hideBefore>
        <PodcastTableTop />
      </Assemble>
      <Assemble at={sub(S.table, 0.2, 0.9)} from={fromFront([-4.3, 0, -2.4], -0.8, { r: [0, 1, 0] })} position={[-4.3, 0, -2.4]} ease={ease.inOutCubic} hideBefore>
        <CoffeeTable />
      </Assemble>
      <Assemble at={sub(S.table, 0.3, 1)} from={fromFloor(0.5)} position={[-1.0, 0, -1.2]} ease={ease.outCubic} hideBefore>
        <CoffeeTable r={0.3} />
      </Assemble>
    </group>
  );
}

/* 9. Microfones e braços articulados -------------------------------------------- */
function MicArm({ side }: { side: -1 | 1 }) {
  const ref = useRef<THREE.Group>(null);
  const mic = useRef<THREE.Group>(null);
  const clamp: Vec3 = [SET[0] + side * 0.36, 0.64, SET[2] - 0.08];
  const elbow: Vec3 = [SET[0] + side * 0.42, 1.12, SET[2] - 0.12];
  const tip: Vec3 = [SET[0] + side * 0.62, 1.06, SET[2] + 0.06];
  const local = (v: Vec3): Vec3 => [v[0] - clamp[0], v[1] - clamp[1], v[2] - clamp[2]];
  const w = sub(S.mics, side > 0 ? 0.15 : 0, side > 0 ? 0.85 : 0.7);
  useAnim((p) => {
    const raw = range(p, w[0], w[1]);
    const t = ease.inOutCubic(raw);
    const g = ref.current;
    if (g) {
      g.visible = raw > 0;
      g.rotation.z = side * lerp(1.35, 0, t);
      g.rotation.y = lerp(side * 0.8, 0, t);
      const s = lerp(0.2, 1, ease.outCubic(Math.min(1, raw * 2)));
      g.scale.set(s, s, s);
    }
    if (mic.current) {
      const tm = ease.outCubic(range(p, w[0] + (w[1] - w[0]) * 0.55, w[1] + 0.008));
      mic.current.scale.setScalar(Math.max(tm, 1e-3));
      mic.current.visible = tm > 0;
    }
  });
  const yaw = yawFrontTo(tip, [SET[0] + side * 1.1, 1.0, SET[2] + 0.4]);
  return (
    <group position={clamp}>
      <group ref={ref}>
        <MicArmRods clamp={[0, 0, 0]} elbow={local(elbow)} tip={local(tip)} />
        <group position={local(tip)} rotation={[0, yaw, 0]}>
          <group ref={mic} position={[0, -0.06, 0]} rotation={[-0.35, 0, 0]}>
            <PodcastMic />
          </group>
        </group>
      </group>
    </group>
  );
}

function Mics() {
  return (
    <group>
      <MicArm side={-1} />
      <MicArm side={1} />
    </group>
  );
}

/* 10. Auscultadores e acessórios ------------------------------------------------- */
function Accessories() {
  const { mat } = useAssets();
  const A = S.accessories;
  const small = (i: number) => ({ at: sub(A, i * 0.1, 0.6 + i * 0.08), from: { p: [0, 0.5, 0] as Vec3, r: [0, 2, 0] as Vec3, s: 0.01 }, ease: ease.outCubic, hideBefore: true });
  return (
    <group>
      <Assemble {...small(0)} position={[SET[0] - 0.2, 0.62, SET[2] + 0.18]} rotation={[0, 0.4, 0]}>
        <Headphones />
      </Assemble>
      <Assemble {...small(1)} position={[SET[0] + 0.22, 0.62, SET[2] + 0.2]} rotation={[0, -0.5, 0]}>
        <Headphones />
      </Assemble>
      <Assemble {...small(2)} position={[SET[0] + 0.05, 0.62, SET[2] - 0.25]}>
        <Mug />
      </Assemble>
      <Assemble {...small(3)} position={[-4.1, 0.43, -2.3]}>
        <Mug />
      </Assemble>
      {/* plantas crescem */}
      {(
        [
          [-6.5, -3.95, 1.5, "gold"],
          [-2.05, -3.95, 1.35, "gold"],
          [4.15, -3.9, 1.1, "black"],
          [-0.15, -3.9, 0.9, "black"],
          [6.3, 0.9, 1.4, "gold"],
        ] as Array<[number, number, number, "gold" | "black"]>
      ).map(([x, z, h, pot], i) => (
        <Assemble key={`pl${i}`} at={sub(A, 0.05 + i * 0.08, 0.7 + i * 0.06)} from={{ s: [0.01, 0.01, 0.01], r: [0, 2.5, 0] }} position={[x, 0, z]} ease={ease.outCubic} hideBefore>
          <Plant height={h} pot={pot} seed={i + 3} />
        </Assemble>
      ))}
      {/* sinal ON AIR e ar condicionado saem da parede */}
      <Assemble at={sub(A, 0.2, 0.8)} from={{ p: [0, 0, -0.25] }} position={[3.45, 3.45, WALL_IN + 0.06]} ease={ease.outCubic} hideBefore>
        <Box size={[0.66, 0.26, 0.08]} material={mat.matte} />
        <Plane size={[0.62, 0.22]} position={[0, 0, 0.041]} material={mat.onAir} />
      </Assemble>
      <Assemble at={sub(A, 0.3, 0.9)} from={{ p: [0.4, 0, 0] }} position={[ROOM.maxX - 0.15, 3.35, 1.0]} rotation={[0, -Math.PI / 2, 0]} ease={ease.outCubic} hideBefore>
        <Box size={[1.0, 0.32, 0.24]} material={mat.white} />
        <Box size={[0.95, 0.03, 0.02]} position={[0, -0.12, 0.12]} material={mat.darkMetal} />
        <Plane size={[0.22, 0.05]} position={[0.3, 0.06, 0.121]} material={mat.logoDecal} />
      </Assemble>
    </group>
  );
}

/* 11. Câmaras nos tripés --------------------------------------------------------- */
function StudioCameras() {
  const C = S.cameras;
  const yaw = yawLensTo(CAM2_TRIPOD, SET_FOCUS);
  return (
    <group>
      <Assemble at={sub(C, 0, 0.35)} from={fromFront(CAM2_TRIPOD, -0.5)} ease={ease.outCubic} hideBefore>
        <LightStand
          position={CAM2_TRIPOD}
          lieYaw={0.6}
          win={{ stand: sub(C, 0.25, 0.6), legs: sub(C, 0.4, 0.75), column: sub(C, 0.55, 0.8) }}
          collar={1.1}
          legLength={1.2}
          legOpen={0.36}
          outer={0.05}
          rise={0.05}
          tubeRadius={0.02}
        >
          <FluidHead />
        </LightStand>
      </Assemble>
      <Assemble
        at={sub(C, 0.6, 1)}
        from={{ p: [0, 1.4, 0.6], r: [0, -1.6, 0.4] }}
        position={[CAM2_TRIPOD[0], 1.43, CAM2_TRIPOD[2]]}
        rotation={[0, yaw, 0]}
        ease={ease.inOutCubic}
        hideBefore
      >
        <group scale={1.2}>
          <StudioCameraBody />
        </group>
      </Assemble>
    </group>
  );
}

/* 12. Iluminação distribuída pelo estúdio ---------------------------------------- */
function ExtraLighting() {
  const { mat } = useAssets();
  const Lw = S.lighting;
  const sbPos: Vec3 = [-1.15, 0, -0.35];
  const ledPos: Vec3 = [5.6, 0, -2.8];
  const sbYaw = yawFrontTo(sbPos, SET_FOCUS);
  const ledYaw = yawFrontTo(ledPos, SET_FOCUS);
  const ledPitch = Math.atan2(2.1 - SET_FOCUS[1], Math.hypot(SET_FOCUS[0] - ledPos[0], SET_FOCUS[2] - ledPos[2]));
  const win = (d: number) => ({ stand: sub(Lw, 0.2 + d, 0.55 + d), legs: sub(Lw, 0.35 + d, 0.7 + d), column: sub(Lw, 0.5 + d, 0.85 + d) });
  return (
    <group>
      <Assemble at={sub(Lw, 0, 0.3)} from={fromFront(sbPos, -1)} ease={ease.outCubic} hideBefore>
        <LightStand position={sbPos} lieYaw={0.3} win={win(0)}>
          <group rotation={[0, sbYaw, 0]}>
            <group rotation={[-1.25, 0, 0]} position={[0, 0.15, 0]}>
              <group position={[0, -0.25, 0]}>
                <Softbox face={mat.softboxFaceX} expand={sub(Lw, 0.6, 1)} radius={0.5} />
              </group>
            </group>
          </group>
        </LightStand>
      </Assemble>
      <Assemble at={sub(Lw, 0.05, 0.35)} from={fromFront(ledPos, 1)} ease={ease.outCubic} hideBefore>
        <LightStand position={ledPos} lieYaw={-0.4} win={win(0.08)}>
          <LedPanel glow={mat.ledPanelX} doors={sub(Lw, 0.8, 1)} aimYaw={ledYaw} aimPitch={ledPitch} />
        </LightStand>
      </Assemble>
      {/* calhas no tecto com projectores */}
      {(
        [
          [2.0, -1.7, 4.2],
          [-4.2, -2.4, 3.6],
        ] as Array<[number, number, number]>
      ).map(([x, z, len], ti) => (
        <Assemble key={ti} at={sub(Lw, 0.1 + ti * 0.15, 0.6 + ti * 0.15)} from={{ p: [0, 0.6, 0] }} position={[x, ROOM.height - 0.3, z]} ease={ease.outCubic} hideBefore>
          <Box size={[len, 0.04, 0.05]} position={[0, 0.06, 0]} material={mat.body} />
          {[-0.375, -0.125, 0.125, 0.375].map((f, i) => (
            <group key={i} position={[f * len, 0, 0]} rotation={[0.5, 0, 0]}>
              <Cyl r={0.05} h={0.16} position={[0, -0.06, 0]} material={mat.body} seg={16} />
              <mesh position={[0, -0.141, 0]} rotation={[Math.PI / 2, 0, 0]} material={mat.ceilingSpot}>
                <circleGeometry args={[0.04, 16]} />
              </mesh>
            </group>
          ))}
        </Assemble>
      ))}
      {/* downlights embutidos */}
      {[-5.6, -3, 0, 4.2, 5.8].map((x, i) => (
        <Assemble key={`dl${i}`} at={sub(Lw, 0.3 + i * 0.1, 0.7 + i * 0.06)} from={{ p: [0, 0.3, 0] }} position={[x, ROOM.height - 0.005, 0.8]} ease={ease.outCubic} hideBefore>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={mat.ceilingSpot}>
            <circleGeometry args={[0.08, 20]} />
          </mesh>
        </Assemble>
      ))}
    </group>
  );
}

/* 13. Mesa de produção, mistura e computador ------------------------------------- */
function Production() {
  const P = S.production;
  const desk: Vec3 = [2.0, 0, 1.6];
  return (
    <group>
      <Assemble at={sub(P, 0, 0.55)} from={fromFront(desk)} position={desk} ease={ease.inOutCubic} hideBefore>
        <DeskBody />
      </Assemble>
      <Assemble at={sub(P, 0.4, 0.8)} from={{ p: [0, 0.9, 0.2], r: [0.6, 0, 0], s: 0.3 }} position={[desk[0] - 0.2, 0.93, desk[2] + 0.05]} ease={ease.outCubic} hideBefore>
        <Mixer />
      </Assemble>
      <Assemble at={sub(P, 0.5, 0.9)} from={{ p: [0, 1.1, 0], r: [0, 1.2, 0], s: 0.3 }} position={[desk[0] + 0.65, 0.93, desk[2] - 0.12]} rotation={[0, -0.2, 0]} ease={ease.outCubic} hideBefore>
        <ProductionMonitor />
      </Assemble>
      <Assemble at={sub(P, 0.6, 1)} from={{ p: [0, 0.6, 0], r: [0, 2, 0], s: 0.01 }} position={[desk[0] - 0.85, 0.93, desk[2] + 0.05]} ease={ease.outCubic} hideBefore>
        <Headphones />
      </Assemble>
      <Assemble at={sub(P, 0.65, 1)} from={{ s: 0.01, r: [0, 2, 0] }} position={[desk[0] + 1.05, 0.93, desk[2] - 0.1]} ease={ease.outCubic} hideBefore>
        <Plant height={0.5} pot="gold" leaves={12} seed={9} />
      </Assemble>
      <Assemble at={sub(P, 0.7, 1)} from={{ p: [0, 0.5, 0], s: 0.01 }} position={[desk[0] + 0.25, 0.93, desk[2] + 0.12]} ease={ease.outCubic} hideBefore>
        <Mug />
      </Assemble>
    </group>
  );
}

/* 14. Iluminação final ------------------------------------------------------------ */
function FinalLighting() {
  const { mat } = useAssets();
  const warmA = useRef<THREE.PointLight>(null);
  const warmB = useRef<THREE.PointLight>(null);
  const warmC = useRef<THREE.PointLight>(null);
  useAnim((p) => {
    const f = ease.inOutSine(range(p, S.finalLight[0], S.finalLight[1]));
    const strips = range(p, S.ledStrips[0], S.ledStrips[1]);
    const shelves = range(p, S.shelves[0] + 0.02, S.shelves[1]);
    const set = (m: THREE.Material, v: number) => ((m as THREE.MeshStandardMaterial).emissiveIntensity = v);
    set(mat.stripYellow, strips * 1.3 + f * 2.2);
    set(mat.stripWarm, strips * 1.0 + f * 1.8);
    set(mat.shelfLed, shelves * 0.9 + f * 1.6);
    set(mat.tableGlow, range(p, S.table[0], S.table[1]) * 0.8 + f * 1.6);
    set(mat.ceilingSpot, range(p, S.lighting[0], S.lighting[1]) * 0.6 + f * 3);
    set(mat.softboxFaceX, f * 2.2);
    set(mat.ledPanelX, f * 2.4);
    set(mat.onAir, range(p, S.accessories[0], S.accessories[1]) * 0.6 + f * 2.2);
    set(mat.iconAudiovisual, f * 0.9);
    set(mat.iconPodcast, f * 0.9);
    set(mat.iconProducao, f * 0.9);
    set(mat.logoWall, 0.35 + f * 0.75);
    set(mat.banner, 0.08 + f * 0.3);
    set(mat.reception, 0.15 + f * 0.45);
    set(mat.mixer, 0.25 + f * 0.5);
    if (warmA.current) warmA.current.intensity = f * 9;
    if (warmB.current) warmB.current.intensity = f * 7;
    if (warmC.current) warmC.current.intensity = f * 6;
  });
  return (
    <group>
      <pointLight ref={warmA} position={[2.0, 3.2, -2.0]} color="#ffc76a" distance={9} decay={1.5} intensity={0} />
      <pointLight ref={warmB} position={[-4.2, 3.2, -2.2]} color="#ffcf7a" distance={9} decay={1.5} intensity={0} />
      <pointLight ref={warmC} position={[1.5, 3.0, 1.6]} color="#ffe2b0" distance={8} decay={1.5} intensity={0} />
    </group>
  );
}
