"use client";

import { useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ease, lerp, range, type Vec3 } from "@/animation/math";
import { STUDIO_STEPS as ST } from "@/animation/phases";
import { useAssets } from "../../context";
import { Assemble } from "../../parts/Assemble";
import { useAnim } from "../../parts/driver";
import { MagneticField, MagneticPart, type MagneticSpec } from "../../parts/MagneticPart";
import { Box, Cyl, Plane } from "../../parts/shapes";
import { SET_FOCUS, yawFrontTo, yawLensTo } from "../../layout";
import { FluidHead } from "../rigs";
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
  StudioCameraBody,
  Tv,
} from "../props";
import { Diffuser, KitCase, LedHead, SoftboxBody, TripodRig, useKitTextures } from "../lighting/equipment";
import { STANDS, aim, standTopY } from "../lighting/kitLayout";
import {
  CAM2,
  CASE2,
  CHAIR_L,
  CHAIR_R,
  CX,
  DESK,
  LED_LOW_L,
  LED_LOW_R,
  LOGO,
  LOUNGE_A,
  LOUNGE_B,
  LOW_STAND,
  NICHE,
  ROOM,
  SHELF_L,
  SHELF_R,
  SIDE_TABLE,
  SLATS_L,
  SLATS_R,
  SOFTBOX_L,
  SOFTBOX_R,
  TABLE,
  TV,
  WALL,
  faceUp,
  lieFor,
  longFlat,
  onBack,
  onSide,
  qYaw,
  sw,
  wave,
} from "./studioLayout";

/**
 * FASE ESTÚDIO — MONTAGEM ROBÓTICA MAGNÉTICA DA SALA DE PODCAST (composição Podcast Parte3).
 *
 *   0%      sala vazia e escura; todas as peças desmontadas, pousadas no chão em filas organizadas
 *   6–24%   onda de activação: as peças levitam (por ordem de distância ao set) e rodam no ar
 *   10–28%  painéis acústicos: ripas, tecto acústico, espuma
 *   22–48%  prateleiras, tripés, softboxes, LEDs, painéis de identidade, ar condicionado
 *   40–62%  tapete, mesa central, cadeirões
 *   58–88%  microfones e braços, câmara no tripé, mesa de produção e áudio, ecrã, decoração
 *   84–100% fitas LED douradas, iluminação final; o logotipo VIRALIZA é a última peça
 *   banner  (0.90 → 1) brilho dourado no logotipo, aproximação da câmara, estabilização
 *
 * Usa o motor MagneticPart (o mesmo da câmara e das luzes). Tudo é função do scroll.
 */

type Piece = { key: string; spec: MagneticSpec; node: ReactNode };

/** Hash estável (0..1) a partir do nome da peça. */
function hash(k: string) {
  let h = 2166136261;
  for (let i = 0; i < k.length; i++) h = Math.imul(h ^ k.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

/** Helper: peça que levita na onda e é atraída na janela [a, b] (fracções do estúdio). */
function piece(
  key: string,
  node: ReactNode,
  o: {
    floor: [number, number];
    lie?: Vec3;
    restY?: number;
    hover: Vec3;
    hoverRot?: Vec3;
    at: [number, number];
    staging?: Vec3;
    dock?: [number, number];
    spin?: MagneticSpec["spin"];
    seat?: number;
  },
): Piece {
  // Peças que esperam a meio ou à frente da sala sobem para uma "nuvem" alta (y ≥ 2.7 m,
  // em camadas) — nunca ficam entre a câmara virtual e o set.
  let hover = o.hover;
  if (hover[2] > -2.25) {
    const layer = (hash(key) * 4) | 0;
    hover = [hover[0], Math.max(hover[1], 2.72 + layer * 0.2), Math.min(hover[2], 0.6)];
  }
  return {
    key,
    node,
    spec: {
      floor: o.floor,
      lie: o.lie,
      restY: o.restY,
      hover: [0, 0, 0],
      hoverAbs: hover,
      hoverRot: o.hoverRot,
      lift: wave(o.floor[0], o.floor[1]),
      attract: sw(o.at[0], o.at[1]),
      staging: o.staging,
      dock: o.dock ? sw(o.dock[0], o.dock[1]) : undefined,
      spin: o.spin,
      seat: o.seat,
    },
  };
}

/** Painel de espuma acústica em pirâmide (geometria fundida: 1 draw call por painel). */
function useFoamPanelGeo(cols: number, rows: number, cell: number) {
  return useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    const back = new THREE.BoxGeometry(cols * cell, rows * cell, 0.03);
    back.translate(0, 0, -0.015);
    parts.push(back);
    for (let i = 0; i < cols; i++)
      for (let j = 0; j < rows; j++) {
        const g = new THREE.ConeGeometry(cell * 0.7, cell * 0.5, 4, 1);
        g.rotateY(Math.PI / 4);
        g.translate(0, cell * 0.25, 0);
        g.rotateX(Math.PI / 2);
        g.translate((i - (cols - 1) / 2) * cell, (j - (rows - 1) / 2) * cell, 0);
        parts.push(g.toNonIndexed());
      }
    const merged = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)));
    merged.computeVertexNormals();
    return merged;
  }, [cols, rows, cell]);
}

/** Painel de ripas verticais (geometria fundida). */
function useSlatGeo(width: number, height: number) {
  return useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    const back = new THREE.BoxGeometry(width, height, 0.02);
    back.translate(0, 0, -0.04);
    parts.push(back);
    const n = Math.round(width / 0.12);
    for (let i = 0; i < n; i++) {
      const g = new THREE.BoxGeometry(0.065, height, 0.06);
      g.translate(-width / 2 + 0.06 + i * ((width - 0.12) / (n - 1)), 0, 0);
      parts.push(g);
    }
    return mergeGeometries(parts.map((p) => p.toNonIndexed()));
  }, [width, height]);
}

/** Fita LED que cresce ao longo do comprimento (instalação) — iluminação arquitectónica. */
function Strip({ from, to, at, t = 0.03, material }: { from: Vec3; to: Vec3; at: readonly [number, number]; t?: number; material: THREE.Material }) {
  const ref = useRef<THREE.Group>(null);
  const { len, quat } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const d = new THREE.Vector3(...to).sub(a);
    return { len: d.length(), quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), d.normalize()) };
  }, [from, to]);
  useAnim((p) => {
    const k = ease.inOutSine(range(p, at[0], at[1]));
    if (ref.current) {
      ref.current.scale.x = Math.max(k, 1e-4);
      ref.current.visible = k > 0;
    }
  });
  return (
    <group position={from} quaternion={quat}>
      <group ref={ref}>
        <mesh position={[len / 2, 0, 0]} material={material}>
          <boxGeometry args={[len, t, t]} />
        </mesh>
      </group>
    </group>
  );
}

export function PodcastStudio() {
  const { mat } = useAssets();
  const kitTex = useKitTextures();
  const root = useRef<THREE.Group>(null);
  const pieces = useRef<THREE.Group>(null);

  // materiais próprios (cada luz acende no seu momento)
  const M = useMemo(() => {
    const { tex } = { tex: (mat.ledPanelX as THREE.MeshStandardMaterial).emissiveMap };
    const led = () =>
      new THREE.MeshStandardMaterial({ color: "#3a3226", map: tex, emissive: new THREE.Color("#fff1d6"), emissiveMap: tex, emissiveIntensity: 0, roughness: 0.5, toneMapped: false });
    const diff = () => new THREE.MeshStandardMaterial({ color: "#d9d6cf", emissive: new THREE.Color("#fff6e6"), emissiveIntensity: 0, roughness: 0.9, side: THREE.DoubleSide, toneMapped: false });
    return { ledL: led(), ledR: led(), diffL: diff(), diffR: diff() };
  }, [mat]);

  const foamGeo = useFoamPanelGeo(3, 3, 0.3);
  const slatGeo = useSlatGeo(SLATS_L.w, ROOM.height - 0.1);

  // o estúdio só existe a partir da fase ESTÚDIO (as fases aprovadas ficam iguais)
  useAnim((p) => {
    if (root.current) root.current.visible = p >= 0.5502;
    // as peças emergem do chão (como uma plataforma) antes da onda de activação
    if (pieces.current) pieces.current.position.y = -0.7 * (1 - ease.outCubic(range(p, ST.structure[0], ST.structure[0] + 0.018)));
  });

  const P = useMemo<Piece[]>(() => {
    const list: Piece[] = [];
    const set = SET_FOCUS;

    // ====================== PAINÉIS ACÚSTICOS E REVESTIMENTOS (10–28%) ======================
    list.push(
      piece("ripas-esq", <mesh geometry={slatGeo} position={[SLATS_L.x, ROOM.height / 2 - 0.02, WALL + 0.07]} material={mat.matte} castShadow />, {
        floor: [-1.42, -2.2],
        lie: lieFor(new THREE.Quaternion(), longFlat(Math.PI / 2)),
        hover: [SLATS_L.x, 2.15, -3.0],
        at: [0.1, 0.17],
        staging: [0, 0, 0.6],
        dock: [0.17, 0.2],
      }),
      piece("ripas-dir", <mesh geometry={slatGeo} position={[SLATS_R.x, ROOM.height / 2 - 0.02, WALL + 0.07]} material={mat.matte} castShadow />, {
        floor: [5.42, -2.2],
        lie: lieFor(new THREE.Quaternion(), longFlat(Math.PI / 2)),
        hover: [SLATS_R.x, 2.15, -3.0],
        at: [0.12, 0.19],
        staging: [0, 0, 0.6],
        dock: [0.19, 0.22],
      }),
      piece("tecto-esq", <Box size={[1.7, 0.09, 1.5]} position={[0.35, ROOM.height - 0.1, -3.3]} material={mat.acoustic} />, {
        floor: [-0.55, 3.55],
        lie: [0, 0.3, 0],
        hover: [0.35, 2.9, -2.4],
        at: [0.14, 0.22],
        staging: [0, -0.35, 0],
        dock: [0.22, 0.25],
      }),
      piece("tecto-dir", <Box size={[1.7, 0.09, 1.5]} position={[3.65, ROOM.height - 0.1, -3.3]} material={mat.acoustic} />, {
        floor: [3.3, -3.55],
        lie: [0, -0.2, 0],
        hover: [3.65, 2.9, -2.4],
        at: [0.16, 0.24],
        staging: [0, -0.35, 0],
        dock: [0.24, 0.27],
      }),
    );
    // espuma na parede direita (6 painéis)
    const foamSpots: Array<[number, number]> = [
      [-4.0, 1.75],
      [-3.1, 1.75],
      [-2.2, 1.75],
      [-4.0, 2.65],
      [-3.1, 2.65],
      [-2.2, 2.65],
    ];
    foamSpots.forEach(([z, y], i) => {
      const qWall = qYaw(-Math.PI / 2);
      list.push(
        piece(
          `espuma-${i}`,
          <group position={[ROOM.maxX - 0.02, y, z]} rotation={[0, -Math.PI / 2, 0]}>
            <mesh geometry={foamGeo} material={mat.foamTile} castShadow />
          </group>,
          {
            floor: [6.5 + (i % 2) * 0.95, 3.4 + Math.floor(i / 2) * 0.95],
            lie: lieFor(qWall, faceUp(0.2 * i)),
            hover: [4.9, 2.2 + (i % 3) * 0.35, z + 0.2],
            at: [0.15 + i * 0.022, 0.22 + i * 0.022],
            staging: [-0.45, 0, 0],
            dock: [0.22 + i * 0.022, 0.245 + i * 0.022],
          },
        ),
      );
    });

    // ====================== PRATELEIRAS (22–48%) ======================
    ([SHELF_L, SHELF_R] as Vec3[]).forEach((sp, si) => {
      list.push(
        piece(
          `prateleira-${si}`,
          <group position={sp}>
            <ShelfFrame />
          </group>,
          {
            floor: si ? [4.62, -2.55] : [-0.55, -2.45],
            lie: lieFor(new THREE.Quaternion(), longFlat(Math.PI / 2)),
            hover: [sp[0], 1.85, -3.3],
            at: [0.22 + si * 0.03, 0.3 + si * 0.03],
            staging: [0, 0, 0.55],
            dock: [0.3 + si * 0.03, 0.33 + si * 0.03],
          },
        ),
      );
      SHELF.boards.forEach((y, bi) => {
        list.push(
          piece(
            `tabua-${si}-${bi}`,
            <group position={[sp[0], y, sp[2]]}>
              <ShelfBoard />
            </group>,
            {
              floor: [-1.3 + (si * 4 + bi) * 0.95, 6.25],
              lie: [0, 0, 0],
              hover: [sp[0] + (si ? 0.5 : -0.5), 1.0 + bi * 0.5, -3.0],
              at: [0.33 + si * 0.02 + bi * 0.018, 0.39 + si * 0.02 + bi * 0.018],
              staging: [0, 0, 0.5],
              dock: [0.39 + si * 0.02 + bi * 0.018, 0.41 + si * 0.02 + bi * 0.018],
            },
          ),
        );
      });
      // decoração das prateleiras (entra na etapa final)
      [0, 1, 2, 3].forEach((bi) => {
        list.push(
          piece(
            `deco-${si}-${bi}`,
            <group position={[sp[0] + (si ? 0.06 : -0.1), SHELF.boards[bi] + 0.016, sp[2]]}>
              <ShelfDecor variant={bi + si * 2} />
            </group>,
            {
              floor: [-1.4 + (si * 4 + bi) * 0.42, 6.85],
              lie: [0, (si * 4 + bi) * 0.7, 0],
              hover: [sp[0] + (bi - 1.5) * 0.25, 2.95 + (bi % 2) * 0.2, -2.6],
              at: [0.7 + (si * 4 + bi) * 0.018, 0.76 + (si * 4 + bi) * 0.018],
              staging: [0, 0.12, 0.25],
              dock: [0.76 + (si * 4 + bi) * 0.018, 0.78 + (si * 4 + bi) * 0.018],
            },
          ),
        );
      });
    });

    // ====================== PAINÉIS DE IDENTIDADE + AR CONDICIONADO (parede esquerda) ======================
    // (do fundo para a frente: PRODUÇÃO, PODCAST, AUDIOVISUAL — como em Podcast Parte3)
    const icons = [mat.iconProducao, mat.iconPodcast, mat.iconAudiovisual];
    const qLeft = qYaw(Math.PI / 2);
    icons.forEach((m, i) => {
      const z = -3.75 + i * 0.85;
      list.push(
        piece(
          `icone-${i}`,
          <group position={[ROOM.minX + 0.05, 2.35, z]} rotation={[0, Math.PI / 2, 0]}>
            <Box size={[0.62, 1.24, 0.05]} material={mat.matte} />
            <Plane size={[0.6, 1.2]} position={[0, 0, 0.026]} material={m} />
          </group>,
          {
            floor: [-1.15 + i * 0.7, 4.75],
            lie: lieFor(qLeft, faceUp(0)),
            hover: [-0.9, 2.5 + i * 0.25, z],
            at: [0.36 + i * 0.03, 0.43 + i * 0.03],
            staging: [0.5, 0, 0],
            dock: [0.43 + i * 0.03, 0.46 + i * 0.03],
          },
        ),
      );
    });
    list.push(
      piece(
        "ar-condicionado",
        <group position={[ROOM.minX + 0.14, 3.4, -1.55]} rotation={[0, Math.PI / 2, 0]}>
          <Box size={[1.0, 0.32, 0.24]} material={mat.white} />
          <Box size={[0.95, 0.03, 0.02]} position={[0, -0.12, 0.12]} material={mat.darkMetal} />
          <Plane size={[0.24, 0.055]} position={[0.28, 0.06, 0.121]} material={mat.logoDecal} />
        </group>,
        {
          floor: [5.4, 3.5],
          lie: [0, 0.4, 0],
          hover: [-0.6, 3.2, -1.2],
          at: [0.4, 0.47],
          staging: [0.4, 0, 0],
          dock: [0.47, 0.5],
        },
      ),
    );

    // ====================== ILUMINAÇÃO DO ESTÚDIO (22–48% suportes, 58–75% cabeças) ======================
    const sbStand = (pos: Vec3, key: string, floor: [number, number], at: [number, number], legs: [number, number], col: [number, number]) =>
      piece(
        key,
        <group position={[pos[0], 0, pos[2]]}>
          <TripodRig s={STANDS.led} legs={sw(...legs)} column={sw(...col)} />
        </group>,
        { floor, lie: lieFor(new THREE.Quaternion(), onSide(0)), hover: [pos[0], 0.9, pos[2] + 0.6], at, staging: [0, 0.25, 0], dock: [at[1], at[1] + 0.02] },
      );
    list.push(sbStand(SOFTBOX_L, "tripe-softbox-esq", [-0.55, 5.65], [0.24, 0.31], [0.33, 0.38], [0.36, 0.42]));
    list.push(sbStand(SOFTBOX_R, "tripe-softbox-dir", [1.55, 5.65], [0.26, 0.33], [0.35, 0.4], [0.38, 0.44]));
    const lowStand = (pos: Vec3, key: string, floor: [number, number], at: [number, number]) =>
      piece(
        key,
        <group position={[pos[0], 0, pos[2]]}>
          <TripodRig s={LOW_STAND} legs={sw(at[1] + 0.02, at[1] + 0.07)} column={sw(at[1] + 0.05, at[1] + 0.1)} />
        </group>,
        { floor, lie: lieFor(new THREE.Quaternion(), onSide(0)), hover: [pos[0], 0.85, pos[2] + 0.5], at, staging: [0, 0.2, 0], dock: [at[1], at[1] + 0.02] },
      );
    list.push(lowStand(LED_LOW_L, "tripe-led-baixo-esq", [3.3, 5.65], [0.27, 0.33]));
    list.push(lowStand(LED_LOW_R, "tripe-led-baixo-dir", [4.85, 5.65], [0.29, 0.35]));

    // softboxes: o corpo chega fechado, sobe ao tripé e abre; o difusor encaixa
    const sbPose = (pos: Vec3) => {
      const top = standTopY(STANDS.led);
      const yaw = yawFrontTo(pos, set);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.3, yaw, 0, "YXZ"));
      const off = new THREE.Vector3(0, -0.27, 0).applyQuaternion(q);
      return { pos: [pos[0] + off.x, top + 0.12 + off.y, pos[2] + off.z] as Vec3, q, axis: new THREE.Vector3(0, -1, 0).applyQuaternion(q) };
    };
    ([
      [SOFTBOX_L, "esq", M.diffL, 2.75, 0.58],
      [SOFTBOX_R, "dir", M.diffR, 3.4, 0.61],
    ] as Array<[Vec3, string, THREE.Material, number, number]>).forEach(([pos, k, dm, fx, a0]) => {
      const pose = sbPose(pos);
      list.push(
        piece(
          `softbox-${k}`,
          <group position={pose.pos} quaternion={pose.q}>
            <SoftboxBody expand={sw(a0 + 0.07, a0 + 0.12)} />
          </group>,
          {
            floor: [fx, 4.4],
            lie: lieFor(pose.q, qYaw(0.4).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2))),
            restY: 0.075,
            hover: [pose.pos[0], 2.9, pose.pos[2] + 0.4],
            at: [a0, a0 + 0.06],
            staging: [0, 0.3, 0],
            dock: [a0 + 0.06, a0 + 0.075],
          },
        ),
      );
      list.push(
        piece(
          `difusor-${k}`,
          <group position={pose.pos} quaternion={pose.q}>
            <Diffuser face={dm} />
          </group>,
          {
            floor: [k === "esq" ? 4.2 : 5.25, 4.75],
            lie: lieFor(pose.q, qYaw(0.2).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI))),
            hover: [pose.pos[0], 2.4, pose.pos[2] + 0.8],
            at: [a0 + 0.1, a0 + 0.15],
            staging: pose.axis.clone().multiplyScalar(0.35).toArray() as Vec3,
            dock: [a0 + 0.15, a0 + 0.165],
          },
        ),
      );
    });
    // LEDs baixos (cabeças), orientados para o set
    ([
      [LED_LOW_L, "esq", M.ledL, 0.6],
      [LED_LOW_R, "dir", M.ledR, 0.62],
    ] as Array<[Vec3, string, THREE.Material, number]>).forEach(([pos, k, face, a0], i) => {
      const top = standTopY(LOW_STAND);
      const a = aim(pos, top + 0.33);
      list.push(
        piece(
          `led-baixo-${k}`,
          <group position={[pos[0], top, pos[2]]}>
            <LedHead face={face} from={a} />
          </group>,
          {
            floor: [5.0 + i * 0.65, 7.4],
            lie: lieFor(qYaw(a.yaw), faceUp(0.2)),
            restY: 0.06,
            hover: [pos[0], 2.75, pos[2] + 0.4],
            at: [a0, a0 + 0.06],
            staging: [0, 0.25, 0],
            dock: [a0 + 0.06, a0 + 0.08],
          },
        ),
      );
    });
    // calha de projectores no tecto
    list.push(
      piece(
        "calha-tecto",
        <group position={[CX, ROOM.height - 0.32, -1.7]}>
          <Box size={[1.9, 0.04, 0.05]} position={[0, 0.06, 0]} material={mat.body} />
          {[-0.6, 0, 0.6].map((x) => (
            <group key={x} position={[x, 0, 0]} rotation={[0.55, 0, 0]}>
              <Cyl r={0.055} h={0.17} position={[0, -0.06, 0]} material={mat.body} seg={16} />
              <mesh position={[0, -0.146, 0]} rotation={[Math.PI / 2, 0, 0]} material={mat.ceilingSpot}>
                <circleGeometry args={[0.045, 16]} />
              </mesh>
            </group>
          ))}
        </group>,
        { floor: [3.0, 7.95], lie: [0, 0, 0], hover: [CX, 3.0, -1.0], at: [0.3, 0.37], staging: [0, -0.3, 0], dock: [0.37, 0.4] },
      ),
    );

    // ====================== CENÁRIO: MESA, CADEIRÕES (40–62%) ======================
    list.push(
      piece(
        "mesa-base",
        <group position={TABLE}>
          <PodcastTableBase />
          <group position={[0, 0.3, 0.33]}>
            <mesh material={mat.matte}>
              <circleGeometry args={[0.15, 40]} />
            </mesh>
            <Plane size={[0.2, 0.05]} position={[0, -0.03, 0.002]} material={mat.logoDecal} />
            <Plane size={[0.07, 0.065]} position={[0, 0.04, 0.002]} material={mat.markDecal} />
          </group>
        </group>,
        { floor: [2.95, -0.45], lie: lieFor(new THREE.Quaternion(), onSide(0.2)), hover: [CX, 1.6, -1.6], at: [0.44, 0.5], staging: [0, 0.25, 0], dock: [0.5, 0.52] },
      ),
    );
    list.push(
      piece(
        "mesa-tampo",
        <group position={TABLE}>
          <PodcastTableTop />
        </group>,
        { floor: [2.0, -0.3], lie: [0, 0, 0], hover: [CX, 2.2, -1.9], at: [0.49, 0.54], staging: [0, 0.2, 0], dock: [0.54, 0.56], spin: { axis: "y", turns: 1 } },
      ),
    );
    ([
      [CHAIR_L, 0.55, "cadeira-esq", [5.42, -0.35], 0.46],
      [CHAIR_R, -0.55, "cadeira-dir", [5.42, 0.85], 0.49],
    ] as Array<[Vec3, number, string, [number, number], number]>).forEach(([pos, yaw, key, floor, a0]) => {
      list.push(
        piece(
          key,
          <group position={pos} rotation={[0, yaw, 0]}>
            <Armchair />
          </group>,
          { floor, lie: lieFor(qYaw(yaw), onBack(-Math.PI / 2)), hover: [pos[0], 1.5, pos[2] + 0.9], at: [a0, a0 + 0.07], staging: [0, 0.18, 0], dock: [a0 + 0.07, a0 + 0.09] },
        ),
      );
    });
    ([
      [LOUNGE_A, 0.75, "cadeirao-a", [-1.3, -0.4], 0.52],
      [LOUNGE_B, 1.05, "cadeirao-b", [-1.3, 0.85], 0.55],
    ] as Array<[Vec3, number, string, [number, number], number]>).forEach(([pos, yaw, key, floor, a0]) => {
      list.push(
        piece(
          key,
          <group position={pos} rotation={[0, yaw, 0]}>
            <Armchair fabric={mat.leather} />
          </group>,
          { floor, lie: lieFor(qYaw(yaw), onBack(Math.PI / 2)), hover: [pos[0] + 0.3, 1.55, pos[2]], at: [a0, a0 + 0.07], staging: [0, 0.18, 0], dock: [a0 + 0.07, a0 + 0.09] },
        ),
      );
    });
    list.push(
      piece(
        "mesa-apoio",
        <group position={SIDE_TABLE}>
          <CoffeeTable r={0.26} />
        </group>,
        { floor: [-0.4, -0.1], lie: lieFor(new THREE.Quaternion(), onSide(0.5)), hover: [SIDE_TABLE[0], 1.4, SIDE_TABLE[2] + 0.4], at: [0.58, 0.63], staging: [0, 0.15, 0], dock: [0.63, 0.65] },
      ),
    );

    // ====================== EQUIPAMENTO FINAL (58–88%) ======================
    // braços articulados dos microfones + microfones
    ([-1, 1] as const).forEach((side, i) => {
      const clamp: Vec3 = [TABLE[0] + side * 0.36, 0.64, TABLE[2] - 0.08];
      const elbow: Vec3 = [TABLE[0] + side * 0.42, 1.12, TABLE[2] - 0.12];
      const tip: Vec3 = [TABLE[0] + side * 0.62, 1.06, TABLE[2] + 0.06];
      const micYaw = yawFrontTo(tip, [TABLE[0] + side * 1.1, 1.0, TABLE[2] + 0.4]);
      list.push(
        piece(`braco-mic-${i}`, <MicArmRods clamp={clamp} elbow={elbow} tip={tip} />, {
          floor: [-1.3 + i * 0.45, 7.4],
          lie: lieFor(new THREE.Quaternion(), onSide(0.3)),
          hover: [TABLE[0] + side * 0.9, 2.3, TABLE[2] + 0.5],
          at: [0.6 + i * 0.02, 0.66 + i * 0.02],
          staging: [0, 0.18, 0],
          dock: [0.66 + i * 0.02, 0.68 + i * 0.02],
          spin: { axis: "y", turns: 0.5 * side },
        }),
      );
      list.push(
        piece(
          `microfone-${i}`,
          <group position={tip} rotation={[0, micYaw, 0]}>
            <group position={[0, -0.06, 0]} rotation={[-0.35, 0, 0]}>
              <PodcastMic />
            </group>
          </group>,
          {
            floor: [-0.4 + i * 0.4, 7.4],
            lie: lieFor(qYaw(micYaw), onSide(0.4)),
            hover: [TABLE[0] + side * 0.7, 2.05, TABLE[2] + 0.8],
            at: [0.66 + i * 0.02, 0.71 + i * 0.02],
            staging: [0, 0.14, 0],
            dock: [0.71 + i * 0.02, 0.73 + i * 0.02],
          },
        ),
      );
      list.push(
        piece(
          `caneca-mesa-${i}`,
          <group position={[TABLE[0] + side * 0.2, 0.62, TABLE[2] + 0.12]}>
            <Mug />
          </group>,
          { floor: [0.4 + i * 0.4, 7.4], lie: lieFor(new THREE.Quaternion(), onSide(i)), hover: [TABLE[0] + side * 0.35, 1.7, TABLE[2] + 0.6], at: [0.73 + i * 0.015, 0.77 + i * 0.015] },
        ),
      );
    });
    list.push(
      piece(
        "caneca-apoio",
        <group position={[SIDE_TABLE[0] + 0.05, 0.43, SIDE_TABLE[2]]}>
          <Mug />
        </group>,
        { floor: [1.2, 7.4], lie: lieFor(new THREE.Quaternion(), onSide(1)), hover: [SIDE_TABLE[0], 1.6, SIDE_TABLE[2] + 0.5], at: [0.75, 0.79] },
      ),
    );

    // câmara de estúdio à esquerda: tripé e corpo
    const camTop = standTopY(STANDS.hero) + 0.13;
    const camYaw = yawLensTo(CAM2, set);
    list.push(
      piece(
        "tripe-camara",
        <group position={[CAM2[0], 0, CAM2[2]]}>
          <TripodRig s={STANDS.hero} legs={sw(0.36, 0.42)} column={sw(0.4, 0.44)}>
            <FluidHead />
          </TripodRig>
        </group>,
        { floor: [1.5, 4.35], lie: lieFor(new THREE.Quaternion(), onSide(0)), hover: [CAM2[0] + 0.3, 1.0, CAM2[2] + 0.5], at: [0.28, 0.35], staging: [0, 0.25, 0], dock: [0.35, 0.37] },
      ),
    );
    list.push(
      piece(
        "camara-estudio",
        <group position={[CAM2[0], camTop, CAM2[2]]} rotation={[0, camYaw, 0]}>
          <group scale={1.2}>
            <StudioCameraBody />
          </group>
        </group>,
        {
          floor: [1.75, 7.4],
          lie: lieFor(qYaw(camYaw), qYaw(0.6)),
          hover: [CAM2[0] + 0.4, 2.4, CAM2[2] + 0.2],
          at: [0.64, 0.7],
          staging: [0, 0.22, 0],
          dock: [0.7, 0.72],
        },
      ),
    );
    // mala de transporte (direita)
    list.push(
      piece(
        "mala-direita",
        <group position={CASE2} rotation={[0, -0.35, 0]}>
          <KitCase front={kitTex.caseFront} />
        </group>,
        { floor: [4.2, 3.5], lie: [0, 0.3, 0], hover: [CASE2[0], 1.3, CASE2[2] + 0.4], at: [0.47, 0.53], staging: [0, 0.15, 0], dock: [0.53, 0.55] },
      ),
    );

    // mesa de produção e áudio
    list.push(
      piece(
        "mesa-producao",
        <group position={DESK}>
          <DeskBody w={3.0} />
        </group>,
        { floor: [2.0, 3.5], lie: lieFor(new THREE.Quaternion(), onBack(0)), hover: [5.1, 3.35, -0.3], hoverRot: [Math.PI / 2, Math.PI / 2, 0], at: [0.66, 0.73], staging: [0, 0.2, 0], dock: [0.73, 0.75] },
      ),
    );
    const deskY = 0.93;
    const deskItems: Array<[string, ReactNode, Vec3, number, number]> = [
      ["mesa-mistura", <Mixer key="m" />, [DESK[0] - 0.15, deskY, DESK[2] + 0.05], 0, 0.75],
      ["monitor-producao", <group key="p" scale={0.62}><ProductionMonitor /></group>, [DESK[0] + 0.95, deskY, DESK[2] + 0.05], -0.2, 0.77],
      ["auscultadores", <Headphones key="h" />, [DESK[0] - 0.95, deskY, DESK[2] + 0.05], 0.4, 0.79],
      ["caneca-producao", <Mug key="c" />, [DESK[0] - 1.25, deskY, DESK[2] + 0.12], 0, 0.8],
      ["planta-producao", <Plant key="pl" height={0.5} pot="gold" leaves={12} seed={9} />, [DESK[0] + 1.25, deskY, DESK[2] - 0.05], 0, 0.81],
    ];
    deskItems.forEach(([key, node, pos, yaw, a0], i) => {
      list.push(
        piece(
          key,
          <group position={pos} rotation={[0, yaw, 0]}>
            {node}
          </group>,
          {
            floor: [2.4 + i * 0.5, 7.4],
            lie: i === 1 ? lieFor(qYaw(yaw), faceUp(0)) : [0, i * 0.8, 0],
            hover: [pos[0], 1.8 + (i % 2) * 0.25, pos[2] + 0.6],
            at: [a0, a0 + 0.05],
            staging: [0, 0.18, 0],
            dock: [a0 + 0.05, a0 + 0.065],
          },
        ),
      );
    });

    // plantas (crescem depois de pousadas)
    ([
      [[-1.45, 0, 0.35], 1.6, "gold", [-1.0, 7.95]],
      [[5.4, 0, 0.05], 1.15, "gold", [-0.15, 7.95]],
      [[5.45, 0, -2.85], 1.3, "black", [0.7, 7.95]],
      [[4.75, 0, 1.25], 0.7, "gold", [1.5, 7.95]],
    ] as Array<[Vec3, number, "gold" | "black", [number, number]]>).forEach(([pos, h, pot, floor], i) => {
      list.push(
        piece(
          `planta-${i}`,
          <group position={pos}>
            <Plant height={h} pot={pot} seed={i + 3} />
          </group>,
          { floor, lie: lieFor(new THREE.Quaternion(), onSide(i)), hover: [pos[0], 1.9, pos[2] + 0.3], at: [0.56 + i * 0.03, 0.62 + i * 0.03], staging: [0, 0.2, 0], dock: [0.62 + i * 0.03, 0.64 + i * 0.03] },
        ),
      );
    });

    // ecrã central
    list.push(
      piece(
        "ecra",
        <group position={TV.pos}>
          <Tv w={TV.w} h={TV.h} />
        </group>,
        { floor: [1.2, -3.55], lie: lieFor(new THREE.Quaternion(), faceUp(0)), hover: [CX - 0.6, 3.35, -2.6], hoverRot: [Math.PI / 2, 0.3, 0], at: [0.68, 0.76], staging: [0, 0, 0.55], dock: [0.76, 0.79] },
      ),
    );
    // logotipo VIRALIZA (última peça)
    list.push(
      piece(
        "logotipo",
        <group position={LOGO.pos}>
          <Box size={[LOGO.w + 0.08, LOGO.h + 0.08, 0.04]} position={[0, 0, -0.03]} material={mat.matte} />
          <Plane size={[LOGO.w, LOGO.h]} material={mat.logoWall} />
        </group>,
        { floor: [2.0, -2.05], lie: lieFor(new THREE.Quaternion(), faceUp(0)), hover: [CX + 0.7, 3.55, -2.0], hoverRot: [Math.PI / 2, -0.4, 0], at: [0.86, 0.95], staging: [0, 0, 0.5], dock: [0.95, 0.97], seat: 0.04 },
      ),
    );

    return list;
  }, [mat, M, kitTex, foamGeo, slatGeo]);

  return (
    <group ref={root} name="estudio" visible={false}>
      <Structure />
      <group ref={pieces}>
        <MagneticField floorY={0}>
          {P.map((x) => (
            <MagneticPart key={x.key} spec={x.spec} name={x.key}>
              {x.node}
            </MagneticPart>
          ))}
        </MagneticField>
      </group>
      <Rug />
      <LedStrips />
      <StudioLighting M={M} />
    </group>
  );
}

/* ---------------------------------------------------------------- estrutura */
function Structure() {
  const { mat } = useAssets();
  const W0 = ROOM.maxX - ROOM.minX;
  const D = ROOM.frontZ - ROOM.backZ;
  const zMid = (ROOM.frontZ + ROOM.backZ) / 2;
  const S = ST.structure;
  const up = (a: number, b: number) => [lerp(S[0], S[1], a), lerp(S[0], S[1], b)] as const;
  return (
    <group>
      <Assemble at={up(0, 0.7)} from={{ p: [0, -ROOM.height - 0.1, 0] }} ease={ease.outCubic} hideBefore>
        <Box size={[W0 + 0.24, ROOM.height, 0.12]} position={[CX, ROOM.height / 2, ROOM.backZ - 0.06]} material={mat.wallDark} />
        <Box size={[NICHE.x1 - NICHE.x0, ROOM.height, 0.04]} position={[(NICHE.x0 + NICHE.x1) / 2, ROOM.height / 2, WALL - 0.02]} material={mat.wallPanel} />
      </Assemble>
      <Assemble at={up(0.1, 0.8)} from={{ p: [0, -ROOM.height - 0.1, 0] }} ease={ease.outCubic} hideBefore>
        <Box size={[0.12, ROOM.height, D]} position={[ROOM.minX - 0.06, ROOM.height / 2, zMid]} material={mat.wallDark} />
      </Assemble>
      <Assemble at={up(0.15, 0.85)} from={{ p: [0, -ROOM.height - 0.1, 0] }} ease={ease.outCubic} hideBefore>
        <Box size={[0.12, ROOM.height, D]} position={[ROOM.maxX + 0.06, ROOM.height / 2, zMid]} material={mat.wallDark} />
      </Assemble>
      <Assemble at={up(0.35, 1)} from={{ p: [0, 3.2, 0] }} ease={ease.outCubic} hideBefore>
        <Box size={[W0 + 0.24, 0.12, D]} position={[CX, ROOM.height + 0.06, zMid]} material={mat.ceiling} />
      </Assemble>
    </group>
  );
}

/** Tapete: desenrola-se no lugar (é a única peça que não voa — é flexível). */
function Rug() {
  const { mat } = useAssets();
  return (
    <Assemble at={sw(0.4, 0.46)} from={{ s: [0.02, 1, 1] }} position={[CX - 1.9, 0.006, TABLE[2] + 0.05]} ease={ease.inOutCubic} hideBefore>
      <mesh position={[1.9, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.9, 0.92, 1]} material={mat.rug} receiveShadow>
        <circleGeometry args={[1, 56]} />
      </mesh>
    </Assemble>
  );
}

/** Fitas LED douradas (crescem) — nicho central, prateleiras, sancas do tecto, cantos. */
function LedStrips() {
  const { mat } = useAssets();
  const top = ROOM.height - 0.07;
  const z = WALL + 0.05;
  const L: Array<{ f: Vec3; t: Vec3; a: number; b: number; th?: number; m?: THREE.Material }> = [
    { f: [NICHE.x0, 0.05, z + 0.04], t: [NICHE.x0, top, z + 0.04], a: 0.78, b: 0.88, th: 0.04 },
    { f: [NICHE.x1, 0.05, z + 0.04], t: [NICHE.x1, top, z + 0.04], a: 0.79, b: 0.89, th: 0.04 },
    { f: [CX, top, z], t: [ROOM.minX + 0.05, top, z], a: 0.84, b: 0.94 },
    { f: [CX, top, z], t: [ROOM.maxX - 0.05, top, z], a: 0.84, b: 0.94 },
    { f: [ROOM.minX + 0.07, top, z], t: [ROOM.minX + 0.07, top, ROOM.frontZ], a: 0.9, b: 0.99 },
    { f: [ROOM.maxX - 0.07, top, z], t: [ROOM.maxX - 0.07, top, ROOM.frontZ], a: 0.9, b: 0.99 },
    { f: [ROOM.minX + 0.07, 0.05, z], t: [ROOM.minX + 0.07, top, z], a: 0.88, b: 0.97 },
    { f: [ROOM.maxX - 0.07, 0.05, z], t: [ROOM.maxX - 0.07, top, z], a: 0.88, b: 0.97 },
    { f: [0.6, top - 0.1, -1.1], t: [3.4, top - 0.1, -1.1], a: 0.86, b: 0.96, m: mat.stripWarm },
  ];
  // ícones da parede esquerda: moldura luminosa
  return (
    <group>
      {L.map((s, i) => (
        <Strip key={i} from={s.f} to={s.t} at={sw(s.a, s.b)} t={s.th ?? 0.03} material={s.m ?? mat.stripYellow} />
      ))}
    </group>
  );
}

/* --------------------------------------------------------- iluminação do estúdio */
function StudioLighting({ M }: { M: { ledL: THREE.MeshStandardMaterial; ledR: THREE.MeshStandardMaterial; diffL: THREE.MeshStandardMaterial; diffR: THREE.MeshStandardMaterial } }) {
  const { mat } = useAssets();
  const work = useRef<THREE.SpotLight>(null);
  const warmA = useRef<THREE.PointLight>(null);
  const warmB = useRef<THREE.PointLight>(null);
  const warmC = useRef<THREE.PointLight>(null);
  const glint = useRef<THREE.PointLight>(null);
  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(CX, 0, -1.6);
    return o;
  }, []);

  useAnim((p) => {
    const set = (m: THREE.Material, v: number) => ((m as THREE.MeshStandardMaterial).emissiveIntensity = v);
    const on = (a: number, b: number) => ease.inOutSine(range(p, ...sw(a, b)));
    const fin = ease.inOutSine(range(p, ST.finalLight[0], ST.finalLight[1]));
    const active = p > 0.5502;
    // luz de trabalho durante a montagem (a sala está escura); cede à iluminação final
    if (work.current) work.current.intensity = active ? on(0, 0.08) * lerp(40, 8, fin) : 0;
    // acendem à medida que os componentes são instalados
    set(mat.shelfLed, on(0.42, 0.5) * 1.2 + fin * 1.4);
    set(mat.ceilingSpot, on(0.4, 0.45) * 1.2 + fin * 2.4);
    set(mat.tableGlow, on(0.52, 0.58) * 1.2 + fin * 1.4);
    set(mat.tvScreen, on(0.79, 0.82) * (0.8 + 0.25 * fin));
    set(mat.iconAudiovisual, on(0.46, 0.52) * 0.7 + fin * 0.4);
    set(mat.iconPodcast, on(0.49, 0.55) * 0.7 + fin * 0.4);
    set(mat.iconProducao, on(0.52, 0.58) * 0.7 + fin * 0.4);
    set(mat.stripYellow, on(0.78, 0.9) * 1.6 + fin * 1.4);
    set(mat.stripWarm, on(0.86, 0.96) * 1.2 + fin * 1.2);
    set(mat.mixer, 0.25 + on(0.8, 0.84) * 0.5);
    M.ledL.emissiveIntensity = on(0.69, 0.73) * 2.4;
    M.ledR.emissiveIntensity = on(0.71, 0.75) * 2.4;
    M.diffL.emissiveIntensity = on(0.76, 0.8) * 2.0;
    M.diffR.emissiveIntensity = on(0.79, 0.83) * 2.0;
    // banner final: o logotipo recebe um brilho dourado subtil (pico + assentamento)
    const logoOn = on(0.95, 0.99);
    const pulse = Math.sin(Math.PI * range(p, 0.9, 0.94));
    set(mat.logoWall, 0.25 + logoOn * 0.75 + pulse * 0.6);
    if (glint.current) {
      const g = range(p, 0.9, 0.935);
      glint.current.position.set(lerp(NICHE.x0, NICHE.x1, ease.inOutSine(g)), LOGO.pos[1] + 0.1, LOGO.pos[2] + 0.5);
      glint.current.intensity = Math.sin(Math.PI * g) * 3;
    }
    if (warmA.current) warmA.current.intensity = fin * 16;
    if (warmB.current) warmB.current.intensity = fin * 11;
    if (warmC.current) warmC.current.intensity = fin * 8;
  });

  return (
    <group>
      <primitive object={target} />
      <spotLight ref={work} position={[CX, ROOM.height - 0.2, 3.4]} target={target} angle={1.0} penumbra={1} decay={1.2} distance={14} intensity={0} color="#ffe6c0" castShadow={false} />
      <pointLight ref={warmA} position={[CX, 3.2, -2.0]} color="#ffc76a" distance={9} decay={1.5} intensity={0} />
      <pointLight ref={warmB} position={[CX, 3.0, 1.2]} color="#ffe2b0" distance={8} decay={1.5} intensity={0} />
      <pointLight ref={warmC} position={[CX, 2.2, -3.6]} color="#ffb84a" distance={6} decay={1.6} intensity={0} />
      <pointLight ref={glint} color="#ffd36b" distance={1.8} decay={2} intensity={0} />
    </group>
  );
}
