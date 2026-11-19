"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { ease, lerp, range, type Vec3 } from "@/animation/math";
import { LIGHTS, STUDIO_STEPS } from "@/animation/phases";
import { useAssets } from "../context";
import { Assemble } from "../parts/Assemble";
import { useAnim, useTier } from "../parts/driver";
import { HERO_TRIPOD, LIGHT_POS, SET_FOCUS, yawFrontTo } from "../layout";
import { BeamCone, Cable, FlightCase, FluidHead, LedPanel, LightStand, RingLight, Softbox, standTop } from "./rigs";

/**
 * FASE 3 — Sistema de iluminação. Os tripés levantam-se do chão, abrem as pernas,
 * as colunas sobem, as cabeças encaixam, a softbox expande-se, os cabos são passados
 * e, por fim, as luzes acendem (luzes reais da cena + emissivos + volume subtil).
 */

const STAND_WIN = (delay: number) => ({
  stand: [LIGHTS.standUp[0] + delay, LIGHTS.standUp[1] + delay] as const,
  legs: [LIGHTS.legsOpen[0] + delay, LIGHTS.legsOpen[1] + delay] as const,
  column: [LIGHTS.columnRise[0] + delay, LIGHTS.columnRise[1] + delay] as const,
});

const LED_STAND = { collar: 0.5, outer: 0.75, rise: 0.55 };
const LED_TOP = standTop(LED_STAND);
const PANEL_CENTER_Y = LED_TOP + 0.33;

const BOOM_STAND = { collar: 0.55, outer: 0.8, rise: 0.45 };
const BOOM_TOP = standTop(BOOM_STAND);
const BOOM_LEN = 1.25;
const BOOM_ANGLE = 1.2;
/** Inclinação da softbox (aponta para baixo e para a frente). */
const SOFTBOX_TILT = -0.95;

const RING_STAND = { collar: 0.45, outer: 0.55, rise: 0.35 };

const aim = (pos: Vec3, y: number) => {
  const yaw = yawFrontTo(pos, SET_FOCUS);
  const dist = Math.hypot(SET_FOCUS[0] - pos[0], SET_FOCUS[2] - pos[2]);
  const pitch = Math.atan2(y - SET_FOCUS[1], dist);
  return { yaw, pitch };
};

export const power = (p: number) => ease.inOutSine(range(p, LIGHTS.powerOn[0], LIGHTS.powerOn[1]));

export function LightingKit() {
  const { mat } = useAssets();
  const tier = useTier();

  const ledL = aim(LIGHT_POS.ledLeft, PANEL_CENTER_Y);
  const ledR = aim(LIGHT_POS.ledRight, PANEL_CENTER_Y);
  const boomYaw = yawFrontTo(LIGHT_POS.softbox, SET_FOCUS);
  const ringYaw = yawFrontTo(LIGHT_POS.ring, SET_FOCUS);

  // posição final da softbox (para a luz real e o cone)
  const softboxWorld = useMemo<Vec3>(() => {
    const dirX = Math.sin(boomYaw);
    const dirZ = Math.cos(boomYaw);
    const reach = BOOM_LEN * Math.sin(BOOM_ANGLE);
    const up = BOOM_LEN * Math.cos(BOOM_ANGLE);
    return [LIGHT_POS.softbox[0] + dirX * reach, BOOM_TOP + up - 0.15, LIGHT_POS.softbox[2] + dirZ * reach];
  }, [boomYaw]);

  const headL: Vec3 = [LIGHT_POS.ledLeft[0], PANEL_CENTER_Y, LIGHT_POS.ledLeft[2]];
  const headR: Vec3 = [LIGHT_POS.ledRight[0], PANEL_CENTER_Y, LIGHT_POS.ledRight[2]];

  // emissivos: acendem com a timeline (e reforçam na luz final do estúdio)
  useAnim((p) => {
    const on = power(p);
    const boost = 1 + 0.25 * ease.inOutSine(range(p, STUDIO_STEPS.finalLight[0], STUDIO_STEPS.finalLight[1]));
    (mat.ledPanelL as THREE.MeshStandardMaterial).emissiveIntensity = on * 2.6 * boost;
    (mat.ledPanelR as THREE.MeshStandardMaterial).emissiveIntensity = ease.inOutSine(range(p, LIGHTS.powerOn[0] + 0.012, LIGHTS.powerOn[1])) * 2.6 * boost;
    (mat.softboxFace as THREE.MeshStandardMaterial).emissiveIntensity = ease.inOutSine(range(p, LIGHTS.powerOn[0] + 0.02, LIGHTS.powerOn[1])) * 2.2 * boost;
    (mat.ringLight as THREE.MeshStandardMaterial).emissiveIntensity = ease.inOutSine(range(p, LIGHTS.powerOn[0] + 0.006, LIGHTS.powerOn[1])) * 3 * boost;
  });

  const cable = (base: Vec3, topY: number, to: Vec3, side = 1): Vec3[] => [
    [base[0] + 0.03, topY, base[2] + 0.03],
    [base[0] + 0.035, topY * 0.55, base[2] + 0.035],
    [base[0] + 0.06 * side, 0.12, base[2] + 0.08],
    [base[0] + 0.25 * side, 0.012, base[2] + 0.2],
    [(base[0] + to[0]) / 2, 0.012, (base[2] + to[2]) / 2 + 0.25],
    [to[0], 0.012, to[2] + 0.1],
    [to[0], 0.25, to[2] + 0.23],
  ];

  return (
    <group name="lighting-kit">
      {/* LED esquerdo */}
      <LightStand position={LIGHT_POS.ledLeft} lieYaw={0.4} win={STAND_WIN(0)} {...LED_STAND}>
        <Assemble at={LIGHTS.heads} from={{ p: [0, 1.6, 0.2], r: [0.6, 1.2, 0] }} ease={ease.outCubic}>
          <LedPanel glow={mat.ledPanelL} doors={[LIGHTS.heads[1] - 0.01, LIGHTS.powerOn[0] + 0.01]} aimYaw={ledL.yaw} aimPitch={ledL.pitch} />
        </Assemble>
      </LightStand>

      {/* LED direito */}
      <LightStand position={LIGHT_POS.ledRight} lieYaw={-2.2} win={STAND_WIN(0.012)} {...LED_STAND}>
        <Assemble at={[LIGHTS.heads[0] + 0.012, LIGHTS.heads[1] + 0.008]} from={{ p: [0, 1.6, 0.2], r: [0.6, -1.2, 0] }} ease={ease.outCubic}>
          <LedPanel glow={mat.ledPanelR} doors={[LIGHTS.heads[1], LIGHTS.powerOn[0] + 0.018]} aimYaw={ledR.yaw} aimPitch={ledR.pitch} />
        </Assemble>
      </LightStand>

      {/* Softbox em girafa (boom) */}
      <LightStand position={LIGHT_POS.softbox} lieYaw={-0.9} win={STAND_WIN(0.02)} wheels {...BOOM_STAND}>
        <Boom yaw={boomYaw} />
      </LightStand>
      <Assemble at={[0.43, 0.48]} from={{ p: [0.8, 0, 0.5], r: [0, 1, 0] }} position={[LIGHT_POS.softbox[0] + 0.18, 0.08, LIGHT_POS.softbox[2] - 0.12]} hideBefore>
        <mesh material={mat.matte} castShadow>
          <capsuleGeometry args={[0.07, 0.22, 4, 10]} />
        </mesh>
      </Assemble>

      {/* Ring light */}
      <LightStand position={LIGHT_POS.ring} lieYaw={2.6} win={STAND_WIN(0.028)} tubeRadius={0.013} legLength={0.55} {...RING_STAND}>
        <Assemble at={[LIGHTS.heads[0] + 0.02, LIGHTS.heads[1] + 0.02]} from={{ p: [0, 1.2, 0], r: [0, 2, 0] }} ease={ease.outCubic}>
          <RingLight glow={mat.ringLight} spin={[LIGHTS.heads[0] + 0.02, LIGHTS.heads[1] + 0.03]} aimYaw={ringYaw} />
        </Assemble>
      </LightStand>

      {/* Tripé de vídeo onde a câmara principal vai pousar */}
      <LightStand
        position={HERO_TRIPOD}
        lieYaw={-1.2}
        win={{ stand: [0.395, 0.445], legs: [0.415, 0.462], column: [0.43, 0.468] }}
        collar={1.1}
        legLength={1.2}
        legOpen={0.36}
        outer={0.05}
        rise={0.05}
        tubeRadius={0.02}
      >
        <FluidHead />
      </LightStand>

      {/* Mala + controlador */}
      <Assemble at={[0.4, 0.475]} from={{ p: [-1.6, 0, 0.8], r: [0, -1.1, 0] }} position={LIGHT_POS.case} rotation={[0, -0.25, 0]} hideBefore ease={ease.outCubic}>
        <FlightCase />
      </Assemble>

      {/* Cabos */}
      <Cable points={cable(LIGHT_POS.ledLeft, LED_TOP + 0.1, LIGHT_POS.case, 1)} at={LIGHTS.cables} />
      <Cable points={cable(LIGHT_POS.ledRight, LED_TOP + 0.1, LIGHT_POS.case, -1)} at={[LIGHTS.cables[0] + 0.008, LIGHTS.cables[1]]} />
      <Cable points={cable(LIGHT_POS.softbox, BOOM_TOP, LIGHT_POS.case, -1)} at={[LIGHTS.cables[0] + 0.014, LIGHTS.cables[1] + 0.004]} />
      <Cable points={cable(LIGHT_POS.ring, standTop(RING_STAND), LIGHT_POS.case, 1)} at={[LIGHTS.cables[0] + 0.02, LIGHTS.cables[1] + 0.006]} />

      {/* Luzes reais da cena */}
      <KitSpot position={headL} delay={0} intensity={15} />
      <KitSpot position={headR} delay={0.012} intensity={15} />
      <KitSpot position={softboxWorld} delay={0.02} intensity={20} castShadow={tier === "high"} angle={0.75} />

      {tier !== "low" && (
        <>
          <BeamCone from={headL} to={SET_FOCUS} radius={0.75} intensity={(p) => power(p) * 0.05} />
          <BeamCone from={headR} to={SET_FOCUS} radius={0.75} intensity={(p) => power(p) * 0.05} />
        </>
      )}
    </group>
  );
}

/** Braço girafa: dobrado na vertical, roda até à posição e a softbox expande-se. */
function Boom({ yaw }: { yaw: number }) {
  const { mat } = useAssets();
  const arm = useRef<THREE.Group>(null);
  const box = useRef<THREE.Group>(null);
  useAnim((p) => {
    const t = ease.inOutCubic(range(p, LIGHTS.heads[0] + 0.01, LIGHTS.heads[1] + 0.01));
    const a = lerp(0.05, BOOM_ANGLE, t);
    if (arm.current) arm.current.rotation.x = a;
    if (box.current) box.current.rotation.x = SOFTBOX_TILT - a;
  });
  return (
    <group rotation={[0, yaw, 0]}>
      <Assemble at={[LIGHTS.heads[0], LIGHTS.heads[0] + 0.03]} from={{ p: [0, 1.5, 0], r: [0, 1.5, 0] }} ease={ease.outCubic}>
        <mesh material={mat.darkMetal}>
          <boxGeometry args={[0.06, 0.06, 0.06]} />
        </mesh>
        <group ref={arm}>
          <mesh position={[0, BOOM_LEN / 2 - 0.25, 0]} material={mat.body} castShadow>
            <cylinderGeometry args={[0.014, 0.014, BOOM_LEN + 0.5, 10]} />
          </mesh>
          <mesh position={[0, -0.32, 0]} material={mat.darkMetal}>
            <cylinderGeometry args={[0.045, 0.045, 0.12, 14]} />
          </mesh>
          <group position={[0, BOOM_LEN, 0]} ref={box}>
            <group position={[0, -0.27, 0]}>
              <Softbox face={mat.softboxFace} expand={LIGHTS.softboxExpand} />
            </group>
          </group>
        </group>
      </Assemble>
    </group>
  );
}

function KitSpot({ position, delay, intensity, castShadow = false, angle = 0.62 }: { position: Vec3; delay: number; intensity: number; castShadow?: boolean; angle?: number }) {
  const light = useRef<THREE.SpotLight>(null);
  const target = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(...SET_FOCUS);
    return o;
  }, []);
  useAnim((p) => {
    if (!light.current) return;
    const on = ease.inOutSine(range(p, LIGHTS.powerOn[0] + delay, LIGHTS.powerOn[1]));
    const fin = ease.inOutSine(range(p, STUDIO_STEPS.finalLight[0], STUDIO_STEPS.finalLight[1]));
    light.current.intensity = on * intensity * (1 + 0.2 * fin);
  });
  return (
    <>
      <primitive object={target} />
      <spotLight
        ref={light}
        position={position}
        target={target}
        angle={angle}
        penumbra={0.85}
        decay={1.6}
        distance={14}
        intensity={0}
        color="#ffe9c4"
        castShadow={castShadow}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
    </>
  );
}
