"use client";

import { useRef } from "react";
import type { Group } from "three";
import { ease, lerp, range, type Vec3 } from "@/animation/math";
import { CAMERA_3D_FROM, LIGHTS, PHASES } from "@/animation/phases";
import { useAssets } from "../context";
import { Assemble } from "../parts/Assemble";
import { useAnim } from "../parts/driver";
import { Box, Cyl, Plane, Rod } from "../parts/shapes";
import { HERO_ASSEMBLY, HERO_SCALE, HERO_TRIPOD, HERO_TRIPOD_HEAD_Y, SET_FOCUS, yawLensTo } from "../layout";

/**
 * Câmara de cinema VIRALIZA construída peça a peça (geometria real, não imagem).
 * Eixo local: a objectiva aponta para -X, o painel lateral com o logotipo fica em +Z.
 *
 * Cada <Assemble> recebe uma janela dentro da fase 2 e um deslocamento "explodido".
 * Na fase 1 as peças estão suspensas e afastam-se ligeiramente (spread) à medida
 * que o utilizador começa a fazer scroll, antes de convergirem na fase 2.
 */

const { start: P2a, end: P2b } = PHASES.camera;
/** Converte uma janela local da fase 2 (0..1) em progresso global. */
const w = (a: number, b: number) => [P2a + (P2b - P2a) * a, P2a + (P2b - P2a) * b] as const;
/** Na fase 1 o conjunto "respira": o afastamento cresce 22% até ao início da montagem. */
const spread = (p: number) => 1 + 0.22 * ease.inOutSine(range(p, 0, PHASES.exploded.end));

const BOB = 0.006;

export function CinemaCamera() {
  const { mat } = useAssets();
  const root = useRef<Group>(null);

  // Transformação global da câmara: rotação durante a montagem e viagem até ao tripé na fase 3.
  const targetYaw = yawLensTo([HERO_TRIPOD[0], 0, HERO_TRIPOD[2]], SET_FOCUS);
  useAnim((p) => {
    const g = root.current;
    if (!g) return;
    // Durante a introdução fotográfica (4 imagens oficiais) a câmara 3D fica escondida
    // para não haver duplicados; reaparece já montada quando a lente "abre" o mundo 3D.
    g.visible = p >= CAMERA_3D_FROM - 0.002;
    const intro = ease.inOutSine(range(p, 0, PHASES.exploded.end));
    const build = ease.inOutCubic(range(p, P2a, P2b));
    const move = ease.inOutCubic(range(p, LIGHTS.cameraMove[0], LIGHTS.cameraMove[1]));

    const yawBuild = 0.12 + 0.06 * intro + (0.5 - 0.18) * build;
    const pitchBuild = -0.08 + 0.1 * build;
    const end: Vec3 = [HERO_TRIPOD[0], HERO_TRIPOD_HEAD_Y + 0.12 * HERO_SCALE, HERO_TRIPOD[2]];
    const arc = Math.sin(move * Math.PI) * 0.35;

    g.position.set(
      lerp(HERO_ASSEMBLY[0], end[0], move),
      lerp(HERO_ASSEMBLY[1], end[1], move) + arc,
      lerp(HERO_ASSEMBLY[2], end[2], move),
    );
    g.rotation.set(0, lerp(yawBuild, targetYaw, move), lerp(pitchBuild, -0.02, move));
  });

  return (
    <group ref={root} scale={HERO_SCALE} name="hero-camera">
      {/* ---------- Núcleo / chassis ---------- */}
      <Assemble at={w(0, 0.25)} from={{ p: [0, -0.03, 0], r: [0, 0.2, 0] }} spread={spread} bob={BOB}>
        <Box size={[0.24, 0.15, 0.11]} position={[0.02, 0, 0]} material={mat.matte} />
        <Box size={[0.06, 0.12, 0.1]} position={[-0.085, 0, 0]} material={mat.darkMetal} />
      </Assemble>

      {/* Estrutura metálica (gaiola) — aproxima-se do corpo */}
      <Assemble at={w(0, 0.32)} from={{ p: [0.04, 0.02, -0.26], r: [0.2, 0.5, 0] }} spread={spread} bob={BOB}>
        <Cage />
      </Assemble>

      {/* Sensor */}
      <Assemble at={w(0.08, 0.38)} from={{ p: [-0.2, 0.07, 0.16], r: [0, 0.8, 0.2] }} spread={spread} bob={BOB}>
        <group position={[-0.118, 0, 0]}>
          <Box size={[0.012, 0.075, 0.075]} material={mat.darkMetal} />
          <Plane size={[0.05, 0.04]} position={[-0.0065, 0, 0]} rotation={[0, -Math.PI / 2, 0]} material={mat.sensor} />
        </group>
      </Assemble>

      {/* Circuitos */}
      <Assemble at={w(0.14, 0.44)} from={{ p: [0.12, 0.03, 0.3], r: [0.1, -0.5, 0.1] }} spread={spread} bob={BOB}>
        <group position={[0.03, 0, 0.05]}>
          <Box size={[0.16, 0.115, 0.004]} material={mat.pcb} />
          <Box size={[0.03, 0.03, 0.01]} position={[0.03, 0.02, 0.006]} material={mat.matte} />
          <Box size={[0.02, 0.02, 0.008]} position={[-0.04, -0.03, 0.005]} material={mat.gold} />
        </group>
      </Assemble>

      {/* Ventoinha */}
      <Assemble at={w(0.2, 0.46)} from={{ p: [0.3, -0.12, 0.16], r: [0.4, -0.4, 0] }} spread={spread} bob={BOB}>
        <group position={[0.13, 0.02, 0]}>
          <Box size={[0.02, 0.07, 0.07]} material={mat.matte} />
          <Cyl r={0.029} h={0.004} axis="x" position={[0.011, 0, 0]} material={mat.darkMetal} />
          <Cyl r={0.01} h={0.006} axis="x" position={[0.013, 0, 0]} material={mat.yellow} />
        </group>
      </Assemble>

      {/* Placa base + calhas */}
      <Assemble at={w(0.05, 0.35)} from={{ p: [0, -0.2, 0.05], r: [0.2, 0, 0] }} spread={spread} bob={BOB}>
        <Box size={[0.3, 0.016, 0.12]} position={[0.0, -0.088, 0]} material={mat.darkMetal} />
        <Box size={[0.26, 0.012, 0.03]} position={[0.0, -0.102, 0.03]} material={mat.metal} />
        <Box size={[0.26, 0.012, 0.03]} position={[0.0, -0.102, -0.03]} material={mat.metal} />
      </Assemble>

      {/* Tampa esquerda */}
      <Assemble at={w(0.3, 0.55)} from={{ p: [0.02, 0, -0.3], r: [0, 0.6, 0] }} spread={spread} bob={BOB}>
        <Box size={[0.25, 0.16, 0.01]} position={[0.02, 0, -0.064]} material={mat.body} />
      </Assemble>

      {/* Tampa superior */}
      <Assemble at={w(0.34, 0.58)} from={{ p: [0.02, 0.22, -0.04], r: [0.3, 0, 0.1] }} spread={spread} bob={BOB}>
        <Box size={[0.25, 0.012, 0.13]} position={[0.02, 0.083, 0]} material={mat.body} />
        <Box size={[0.25, 0.006, 0.012]} position={[0.02, 0.089, 0.059]} material={mat.yellow} />
      </Assemble>

      {/* Painel lateral VIRALIZA (lado do operador) */}
      <Assemble at={w(0.45, 0.74)} from={{ p: [0.42, 0.02, 0.14], r: [0.1, -0.7, 0] }} spread={spread} bob={BOB}>
        <group position={[0.02, 0, 0.066]}>
          <Box size={[0.25, 0.16, 0.012]} material={mat.body} />
          <Plane size={[0.236, 0.15]} position={[0, 0, 0.0065]} material={mat.sidePanel} />
          <Cyl r={0.009} h={0.008} axis="z" position={[-0.1, 0.04, 0.009]} material={mat.red} />
          <Cyl r={0.016} h={0.012} axis="z" position={[-0.1, -0.02, 0.01]} material={mat.grip} seg={18} />
          <Cyl r={0.017} h={0.003} axis="z" position={[-0.1, -0.02, 0.006]} material={mat.red} />
        </group>
      </Assemble>

      {/* Bateria */}
      <Assemble at={w(0.55, 0.8)} from={{ p: [0.3, -0.06, 0.02], r: [0, 0, -0.4] }} spread={spread} bob={BOB}>
        <group position={[0.168, -0.005, 0]}>
          <Box size={[0.045, 0.11, 0.09]} material={mat.matte} />
          <Box size={[0.047, 0.012, 0.092]} position={[0, 0.045, 0]} material={mat.yellow} />
          <Plane size={[0.07, 0.016]} position={[0.024, -0.01, 0]} rotation={[0, Math.PI / 2, 0]} material={mat.logoDecal} />
        </group>
      </Assemble>

      {/* Módulo de entradas XLR */}
      <Assemble at={w(0.6, 0.85)} from={{ p: [0.16, 0.2, 0.08], r: [0, 0.6, 0.3] }} spread={spread} bob={BOB}>
        <group position={[0.1, 0.11, -0.02]}>
          <Box size={[0.07, 0.035, 0.06]} material={mat.body} />
          <Cyl r={0.009} h={0.012} axis="x" position={[0.04, 0, 0.014]} material={mat.metal} />
          <Cyl r={0.009} h={0.012} axis="x" position={[0.04, 0, -0.014]} material={mat.metal} />
        </group>
      </Assemble>

      {/* Encaixe da objectiva */}
      <Assemble at={w(0.3, 0.55)} from={{ p: [-0.16, 0, 0.02], r: [0.8, 0, 0] }} spread={spread} bob={BOB}>
        <group position={[-0.125, 0, 0]}>
          <Cyl r={0.05} h={0.014} axis="x" material={mat.metal} />
          <mesh rotation={[0, Math.PI / 2, 0]} material={mat.darkMetal}>
            <torusGeometry args={[0.046, 0.005, 10, 40]} />
          </mesh>
        </group>
      </Assemble>

      {/* Elementos ópticos (entram no interior do barril) */}
      {[0, 1, 2].map((i) => (
        <Assemble
          key={i}
          at={w(0.38 + i * 0.05, 0.66 + i * 0.05)}
          from={{ p: [-0.26 - i * 0.045, 0.015 + i * 0.006, 0.005], r: [0, 0.35 - i * 0.15, 0] }}
          spread={spread}
          bob={BOB * 0.8}
        >
          <mesh position={[-0.16 - i * 0.04, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={mat.glass}>
            <cylinderGeometry args={[0.042 - i * 0.002, 0.042 - i * 0.002, 0.007, 40]} />
          </mesh>
        </Assemble>
      ))}

      {/* Barril da objectiva */}
      <Assemble at={w(0.46, 0.76)} from={{ p: [-0.3, 0.02, 0], r: [Math.PI * 0.6, 0.15, 0] }} spread={spread} bob={BOB}>
        <group position={[-0.2, 0, 0]}>
          <Cyl r={0.052} h={0.14} axis="x" material={mat.body} seg={40} />
          <Cyl r={0.057} h={0.045} axis="x" position={[0.02, 0, 0]} material={mat.grip} seg={24} />
          <Cyl r={0.0575} h={0.006} axis="x" position={[-0.04, 0, 0]} material={mat.yellow} seg={40} />
          <Cyl r={0.054} h={0.02} axis="x" position={[-0.062, 0, 0]} material={mat.darkMetal} seg={40} />
          <Box size={[0.03, 0.012, 0.004]} position={[0.0, 0.0, 0.056]} material={mat.yellow} />
          <mesh position={[-0.0725, 0, 0]} rotation={[0, -Math.PI / 2, 0]} material={mat.lensFront}>
            <circleGeometry args={[0.047, 48]} />
          </mesh>
        </group>
      </Assemble>

      {/* Pára-sol (lens hood) */}
      <Assemble at={w(0.56, 0.86)} from={{ p: [-0.46, 0.04, 0.03], r: [0, 0.45, 0.15] }} spread={spread} bob={BOB}>
        <group position={[-0.305, 0, 0]}>
          <group rotation={[0, 0, Math.PI / 2]}>
            <mesh rotation={[0, Math.PI / 4, 0]} scale={[1, 1, 0.78]} material={mat.softboxShell}>
              <cylinderGeometry args={[0.11, 0.068, 0.075, 4, 1, true]} />
            </mesh>
          </group>
          <Box size={[0.05, 0.004, 0.06]} position={[-0.004, 0.063, 0]} material={mat.yellow} />
        </group>
      </Assemble>

      {/* Pega superior */}
      <Assemble at={w(0.5, 0.76)} from={{ p: [0.02, 0.3, 0.02], r: [0, 0, 0.25] }} spread={spread} bob={BOB}>
        <group position={[0, 0.09, 0]}>
          <Box size={[0.02, 0.06, 0.024]} position={[-0.07, 0.03, 0]} material={mat.body} />
          <Box size={[0.02, 0.06, 0.024]} position={[0.1, 0.03, 0]} material={mat.body} />
          <Box size={[0.24, 0.022, 0.03]} position={[0.015, 0.068, 0]} material={mat.body} />
          <Box size={[0.24, 0.004, 0.032]} position={[0.015, 0.08, 0]} material={mat.yellow} />
          <Box size={[0.05, 0.02, 0.026]} position={[-0.11, 0.066, 0]} material={mat.darkMetal} />
        </group>
      </Assemble>

      {/* Microfone shotgun */}
      <Assemble at={w(0.7, 0.96)} from={{ p: [-0.3, 0.26, 0.05], r: [0.5, 0, 0.35] }} spread={spread} bob={BOB}>
        <group position={[-0.2, 0.16, 0]}>
          <Cyl r={0.027} h={0.2} axis="x" material={mat.foam} seg={28} />
          <Cyl r={0.022} h={0.02} axis="x" position={[0.105, 0, 0]} material={mat.darkMetal} />
          <Box size={[0.012, 0.035, 0.035]} position={[0.075, -0.012, 0]} material={mat.darkMetal} />
          <Plane size={[0.13, 0.028]} position={[-0.01, 0, 0.0285]} material={mat.logoDecal} />
          <Rod from={[0.115, 0, 0]} to={[0.16, -0.06, 0.02]} r={0.003} material={mat.rubber} />
        </group>
      </Assemble>

      {/* Monitor */}
      <Assemble at={w(0.62, 0.9)} from={{ p: [0.3, -0.26, 0.24], r: [0.3, -0.6, 0.1] }} spread={spread} bob={BOB}>
        <group position={[-0.04, 0.13, 0.095]} rotation={[0, 0.25, 0]}>
          <Box size={[0.11, 0.075, 0.014]} material={mat.body} />
          <Plane size={[0.1, 0.066]} position={[0, 0, 0.0075]} material={mat.monitorScreen} />
          <Box size={[0.11, 0.004, 0.016]} position={[0, -0.039, 0]} material={mat.yellow} />
          <Rod from={[0, -0.04, -0.01]} to={[0.02, -0.07, -0.035]} r={0.004} material={mat.darkMetal} />
        </group>
      </Assemble>

      {/* Cartões de memória — deslizam para a ranhura */}
      {[0, 1].map((i) => (
        <Assemble
          key={`sd${i}`}
          at={w(0.76 + i * 0.05, 0.96 + i * 0.03)}
          from={{ p: [0.34 + i * 0.07, -0.24, 0.08], r: [0.3, -0.6, 0.2] }}
          ease={ease.outQuart}
          spread={spread}
          bob={BOB}
        >
          <group position={[0.07 + i * 0.03, -0.05, 0.06]}>
            <Box size={[0.024, 0.032, 0.002]} material={mat.yellow} />
          </group>
        </Assemble>
      ))}

      {/* Parafusos: aproximam-se e roscam (rotação de várias voltas) */}
      {(
        [
          [-0.095, 0.07],
          [0.135, 0.07],
          [-0.095, -0.07],
          [0.135, -0.07],
        ] as Array<[number, number]>
      ).map(([x, y], i) => (
        <Assemble
          key={`sc${i}`}
          at={w(0.82 + i * 0.03, 0.98 + i * 0.005)}
          from={{ p: [0.06 * Math.sign(x), 0.05 * Math.sign(y), 0.16], r: [0, 0, Math.PI * 8] }}
          ease={ease.outCubic}
          spread={spread}
          bob={BOB}
        >
          <Cyl r={0.0045} h={0.006} axis="z" position={[x, y, 0.075]} material={mat.metal} seg={10} />
        </Assemble>
      ))}
    </group>
  );
}

/** Gaiola metálica: 12 arestas finas à volta do corpo. */
function Cage() {
  const { mat } = useAssets();
  const [sx, sy, sz] = [0.26, 0.17, 0.125];
  const t = 0.008;
  const cx = 0.02;
  const bars: Array<{ s: Vec3; p: Vec3 }> = [];
  for (const y of [-sy / 2, sy / 2])
    for (const z of [-sz / 2, sz / 2]) bars.push({ s: [sx, t, t], p: [cx, y, z] });
  for (const x of [-sx / 2, sx / 2])
    for (const z of [-sz / 2, sz / 2]) bars.push({ s: [t, sy, t], p: [cx + x, 0, z] });
  for (const x of [-sx / 2, sx / 2])
    for (const y of [-sy / 2, sy / 2]) bars.push({ s: [t, t, sz], p: [cx + x, y, 0] });
  return (
    <group>
      {bars.map((b, i) => (
        <Box key={i} size={b.s} position={b.p} material={i % 5 === 0 ? mat.yellow : mat.metal} />
      ))}
    </group>
  );
}
