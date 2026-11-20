"use client";

import { useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import type { Vec3 } from "@/animation/math";
import { useAnim } from "../../parts/driver";
import { MagneticField, MagneticPart, type MagneticSpec } from "../../parts/MagneticPart";
import { Cable, FluidHead } from "../rigs";
import { useKitMaterials, KitEffects } from "./effects";
import {
  Adapter,
  BarnDoors,
  BoomArm,
  Caster,
  Controller,
  Diffuser,
  KitCase,
  LedHead,
  Phone,
  PowerSupply,
  Remote,
  RingHead,
  Sandbag,
  SoftboxBody,
  TripodRig,
  useKitTextures,
} from "./equipment";
import {
  BOOM_PIVOT,
  BOOM_YAW,
  CASE,
  CSTAND,
  HERO,
  KIT_FOCUS,
  REAIM,
  LED_L,
  LED_PANEL_DY,
  LED_R,
  RING,
  RING_HEAD,
  SOFTBOX_POSE,
  STANDS,
  aim,
  collarY,
  ledHeadPos,
  legEnd,
  standTopY,
  w,
} from "./kitLayout";
import { SET_FOCUS, yawFrontTo } from "../../layout";

/**
 * FASE LUZ — MONTAGEM ROBÓTICA MAGNÉTICA DO KIT DE ILUMINAÇÃO.
 *
 *  F1 (0–15%)   flat-lay: tudo desmontado no chão (imagem Luzes-Parte1), reflexo dourado a percorrer
 *  F2 (15–30%)  activação: onda de energia; conectores, adaptadores, rodas e peças levitam
 *  F3 (30–50%)  suportes: tripés chegam de pé, abrem pernas, colunas telescópicas sobem,
 *               rodas encaixam na base do C-stand, adaptadores, girafa sobe e encaixa
 *  F4 (50–75%)  equipamentos: painéis LED descem nos espigões, abas encaixam e abrem,
 *               softbox abre o octógono e sobe para a girafa, difusor encaixa, ring light
 *               e telemóvel, controlador, comando, fontes e cabos ligam-se
 *  F5 (75–90%)  acendimento sequencial, reflexos nas estruturas, parede com logotipo
 *  F6 (90–100%) revelação (afastamento da câmara) + pausa para apreciar (composição Luzes-Parte2)
 *
 * Reutiliza o motor MagneticPart da câmara. Tudo é função do scroll — reversível.
 */

const Q = new THREE.Quaternion();
const E = new THREE.Euler();

/** Orientação "pousada" (em formato lie [rx, guinada, rz]) que deita a peça com a pose desejada. */
function lieFor(childQuat: THREE.Quaternion, desired: THREE.Quaternion): Vec3 {
  Q.copy(desired).multiply(childQuat.clone().invert());
  E.setFromQuaternion(Q, "YXZ");
  return [E.x, E.y, E.z];
}
const qY = (a: number) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), a);
const qX = (a: number) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), a);
const qZ = (a: number) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), a);
const faceUp = (yaw: number) => qY(yaw).multiply(qX(-Math.PI / 2));

export function LightingKit() {
  const tex = useKitTextures();
  const m = useKitMaterials();
  const root = useRef<THREE.Group>(null);

  // o kit só existe a partir da fase LUZ (a fase da câmara fica exactamente como estava)
  useAnim((p) => {
    if (root.current) root.current.visible = p >= 0.3995;
  });

  const L = useMemo(() => {
    const aL = aim(LED_L, standTopY(STANDS.led) + LED_PANEL_DY, KIT_FOCUS);
    const aR = aim(LED_R, standTopY(STANDS.led) + LED_PANEL_DY, KIT_FOCUS);
    const sL = aim(LED_L, standTopY(STANDS.led) + LED_PANEL_DY);
    const sR = aim(LED_R, standTopY(STANDS.led) + LED_PANEL_DY);
    const ringYaw = yawFrontTo(RING, SET_FOCUS);
    const front = (a: { yaw: number; pitch: number }, d: number): Vec3 => {
      const v = new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(a.pitch, a.yaw, 0, "YXZ")).multiplyScalar(d);
      return v.toArray() as Vec3;
    };
    const ringFront = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), ringYaw).multiplyScalar(0.14).toArray() as Vec3;
    const sbAxis = new THREE.Vector3(0, -1, 0).applyQuaternion(SOFTBOX_POSE.quat).multiplyScalar(0.32).toArray() as Vec3;
    const spec = (s: MagneticSpec) => s;
    const upright = (yaw: number): Vec3 => [0, yaw, Math.PI / 2];

    return {
      aL,
      aR,
      sL,
      sR,
      ringYaw,
      // ---------- suportes (F3) ----------
      hero: spec({ floor: [4.3, 1.08], lie: upright(0.15), hoverAbs: [4.3, 0.55, 1.0], hover: [0, 0, 0], lift: w(0.17, 0.27), attract: w(0.29, 0.38) }),
      standL: spec({ floor: [0.95, 0.22], lie: upright(0), hoverAbs: [0.95, 0.55, 0.18], hover: [0, 0, 0], lift: w(0.2, 0.3), attract: w(0.3, 0.4) }),
      standR: spec({ floor: [1.0, 0.58], lie: upright(0.04), hoverAbs: [1.4, 0.6, 0.5], hover: [0, 0, 0], lift: w(0.21, 0.31), attract: w(0.32, 0.42) }),
      standRing: spec({ floor: [2.45, 0.6], lie: upright(0.08), hoverAbs: [2.4, 0.5, 0.6], hover: [0, 0, 0], lift: w(0.22, 0.31), attract: w(0.34, 0.43) }),
      standC: spec({ floor: [3.2, 0.22], lie: upright(-0.08), hoverAbs: [3.25, 0.55, 0.25], hover: [0, 0, 0], lift: w(0.2, 0.3), attract: w(0.33, 0.42) }),
      casters: [0, 1, 2].map((k) =>
        spec({ floor: [3.72 + k * 0.24, -0.38], lie: [0, k * 0.9, 0], hoverAbs: [3.72 + k * 0.24, 0.42, -0.36], hover: [0, 0, 0], lift: w(0.15 + k * 0.012, 0.23 + k * 0.012), attract: w(0.46 + k * 0.012, 0.5 + k * 0.012), seat: 0.02 }),
      ),
      adapters: [0, 1, 2, 3].map((k) =>
        spec({ floor: [2.05 + k * 0.17, -0.38], lie: [0, k * 0.7, 0], hoverAbs: [2.05 + k * 0.17, 0.62, -0.36], hover: [0, 0, 0], lift: w(0.15 + k * 0.01, 0.22 + k * 0.01), attract: w(0.47 + k * 0.012, 0.52 + k * 0.012), spin: { axis: "y", turns: 2 }, seat: 0.02 }),
      ),
      boom: spec({ floor: [2.45, 0.98], lie: [0, 0, Math.PI / 2], hoverAbs: [2.5, 0.6, 0.92], hover: [0, 0, 0], lift: w(0.22, 0.3), attract: w(0.45, 0.51), staging: [0, 0.18, 0], dock: w(0.51, 0.53) }),
      sandbag: spec({ floor: [3.85, 0.98], lie: [0, 0.4, 0], hoverAbs: [3.85, 0.42, 0.95], hover: [0, 0, 0], lift: w(0.2, 0.28), attract: w(0.47, 0.53) }),
      kitCase: spec({ floor: [0.62, 0.98], lie: [0, 0.35, 0], hoverAbs: [0.75, 0.5, 0.95], hover: [0, 0, 0], lift: w(0.2, 0.28), attract: w(0.36, 0.46), staging: [0, 0.12, 0], dock: w(0.46, 0.49) }),

      // ---------- equipamentos (F4) ----------
      headL: spec({ floor: [0.95, -1.05], lie: lieFor(qY(aL.yaw), faceUp(0.2)), restY: 0.06, hoverAbs: [0.95, 0.75, -1.0], hover: [0, 0, 0], lift: w(0.22, 0.32), attract: w(0.5, 0.59), staging: [0, 0.25, 0], dock: w(0.59, 0.62) }),
      headR: spec({ floor: [3.35, -1.05], lie: lieFor(qY(aR.yaw), faceUp(-0.2)), restY: 0.06, hoverAbs: [3.35, 0.75, -1.0], hover: [0, 0, 0], lift: w(0.23, 0.33), attract: w(0.53, 0.62), staging: [0, 0.25, 0], dock: w(0.62, 0.65) }),
      doorsL: spec({ floor: [0.22, -1.05], lie: lieFor(qY(aL.yaw), faceUp(0.5)), hoverAbs: [0.25, 0.65, -1.0], hover: [0, 0, 0], lift: w(0.18, 0.27), attract: w(0.6, 0.66), staging: front(aL, 0.28), dock: w(0.66, 0.68) }),
      doorsR: spec({ floor: [4.08, -1.05], lie: lieFor(qY(aR.yaw), faceUp(-0.5)), hoverAbs: [4.05, 0.65, -1.0], hover: [0, 0, 0], lift: w(0.19, 0.28), attract: w(0.63, 0.69), staging: front(aR, 0.28), dock: w(0.69, 0.71) }),
      softbox: spec({ floor: [1.85, -1.05], lie: lieFor(SOFTBOX_POSE.quat, qY(0.4).multiply(qZ(Math.PI / 2))), restY: 0.075, hoverAbs: [2.5, 0.95, -0.55], hover: [0, 0, 0], lift: w(0.22, 0.34), attract: w(0.6, 0.68), staging: [0, -0.3, 0], dock: w(0.68, 0.7) }),
      diffuser: spec({ floor: [2.6, -1.05], lie: lieFor(SOFTBOX_POSE.quat, qY(0.2).multiply(qX(Math.PI))), hoverAbs: [2.6, 0.6, -1.0], hover: [0, 0, 0], lift: w(0.2, 0.3), attract: w(0.69, 0.735), staging: sbAxis, dock: w(0.735, 0.75) }),
      ringHead: spec({ floor: [1.2, -0.38], lie: lieFor(qY(ringYaw), faceUp(0.3)), hoverAbs: [1.2, 0.7, -0.36], hover: [0, 0, 0], lift: w(0.19, 0.28), attract: w(0.55, 0.63), staging: [0, 0.2, 0], dock: w(0.63, 0.66), spin: { axis: "z", turns: 1.25 } }),
      phone: spec({ floor: [1.72, -0.38], lie: lieFor(qY(ringYaw), faceUp(-0.3)), hoverAbs: [1.72, 0.62, -0.36], hover: [0, 0, 0], lift: w(0.16, 0.24), attract: w(0.64, 0.69), staging: ringFront, dock: w(0.69, 0.71) }),
      controller: spec({ floor: [1.72, 0.98], lie: [0, -0.3, 0], hoverAbs: [1.7, 0.55, 0.95], hover: [0, 0, 0], lift: w(0.18, 0.26), attract: w(0.58, 0.66), staging: [0, 0.14, 0], dock: w(0.66, 0.69) }),
      remote: spec({ floor: [1.32, 0.98], lie: [0, 0.6, 0], hoverAbs: [1.32, 0.55, 0.95], hover: [0, 0, 0], lift: w(0.15, 0.22), attract: w(0.65, 0.71) }),
      psuL: spec({ floor: [0.35, -0.38], lie: [0, 0.3, 0], hoverAbs: [0.38, 0.5, -0.36], hover: [0, 0, 0], lift: w(0.17, 0.24), attract: w(0.62, 0.69) }),
      psuR: spec({ floor: [3.2, -0.38], lie: [0, -0.3, 0], hoverAbs: [3.2, 0.5, -0.36], hover: [0, 0, 0], lift: w(0.17, 0.25), attract: w(0.63, 0.7) }),
    };
  }, []);

  // pontos de encaixe derivados da geometria final
  const casterAt = [0, 1, 2].map((k) => legEnd(CSTAND, STANDS.cstand, k));
  const adapterAt: Vec3[] = [
    [LED_L[0] + 0.03, collarY(STANDS.led) + STANDS.led.outer * 0.55, LED_L[2]],
    [LED_R[0] + 0.03, collarY(STANDS.led) + STANDS.led.outer * 0.55, LED_R[2]],
    [RING[0] + 0.025, collarY(STANDS.ring) + STANDS.ring.outer * 0.55, RING[2]],
    [CSTAND[0] + 0.035, collarY(STANDS.cstand) + STANDS.cstand.outer * 0.55, CSTAND[2]],
  ];
  const hL = ledHeadPos(LED_L);
  const hR = ledHeadPos(LED_R);
  const panelL: Vec3 = [hL[0], hL[1] + LED_PANEL_DY, hL[2]];
  const panelR: Vec3 = [hR[0], hR[1] + LED_PANEL_DY, hR[2]];
  const PSU_L: Vec3 = [0.6, 0, -0.62];
  const PSU_R: Vec3 = [3.62, 0, -0.78];
  const caseTop = 0.42 + 0.032;

  const cable = (from: Vec3, to: Vec3): Vec3[] => [
    [from[0] + 0.03, from[1], from[2] + 0.03],
    [from[0] + 0.035, from[1] * 0.55, from[2] + 0.035],
    [from[0] + 0.06, 0.12, from[2] + 0.08],
    [from[0] + 0.2, 0.012, from[2] + 0.18],
    [(from[0] + to[0]) / 2, 0.012, (from[2] + to[2]) / 2 + 0.2],
    [to[0], 0.012, to[2] + 0.12],
    [to[0], 0.2, to[2] + 0.22],
  ];

  const stand = (pos: Vec3, s: typeof STANDS.led, legs: readonly [number, number], column: readonly [number, number], children?: ReactNode, wheels = false) => (
    <group position={[pos[0], s.baseY, pos[2]]}>
      <TripodRig s={s} legs={legs} column={column} wheels={wheels}>
        {children}
      </TripodRig>
    </group>
  );

  return (
    <group ref={root} name="kit-iluminacao">
      <MagneticField floorY={0}>
        {/* ===================== SUPORTES ===================== */}
        <MagneticPart spec={L.hero} name="tripe-camera">
          {stand(HERO, STANDS.hero, w(0.36, 0.42), w(0.4, 0.45), <FluidHead />)}
        </MagneticPart>
        <MagneticPart spec={L.standL} name="tripe-led-esq">
          {stand(LED_L, STANDS.led, w(0.38, 0.46), w(0.42, 0.49))}
        </MagneticPart>
        <MagneticPart spec={L.standR} name="tripe-led-dir">
          {stand(LED_R, STANDS.led, w(0.4, 0.48), w(0.44, 0.5))}
        </MagneticPart>
        <MagneticPart spec={L.standRing} name="tripe-ring">
          {stand(RING, STANDS.ring, w(0.41, 0.47), w(0.45, 0.5))}
        </MagneticPart>
        <MagneticPart spec={L.standC} name="c-stand">
          {stand(CSTAND, STANDS.cstand, w(0.4, 0.47), w(0.45, 0.5), undefined, true)}
        </MagneticPart>
        {L.casters.map((sp, k) => (
          <MagneticPart key={`cs${k}`} spec={sp} name={`roda-${k}`}>
            <group position={[casterAt[k][0], 0, casterAt[k][2]]} rotation={[0, (k * Math.PI * 2) / 3, 0]}>
              <Caster />
            </group>
          </MagneticPart>
        ))}
        {L.adapters.map((sp, k) => (
          <MagneticPart key={`ad${k}`} spec={sp} name={`adaptador-${k}`}>
            <group position={adapterAt[k]}>
              <Adapter />
            </group>
          </MagneticPart>
        ))}
        <MagneticPart spec={L.boom} name="girafa">
          <group position={BOOM_PIVOT}>
            <BoomArm yaw={BOOM_YAW} raise={w(0.51, 0.57)} />
          </group>
        </MagneticPart>
        <MagneticPart spec={L.sandbag} name="saco-areia">
          <group position={[CSTAND[0] + 0.12, 0, CSTAND[2] + 0.2]} rotation={[0, -0.3, 0]}>
            <Sandbag front={tex.sandbag} />
          </group>
        </MagneticPart>
        <MagneticPart spec={L.kitCase} name="mala">
          <group position={CASE}>
            <KitCase front={tex.caseFront} />
          </group>
        </MagneticPart>

        {/* ===================== EQUIPAMENTOS ===================== */}
        <MagneticPart spec={L.headL} name="painel-led-esq">
          <group position={hL}>
            <LedHead face={m.ledL} from={L.aL} to={L.sL} turn={REAIM} />
          </group>
        </MagneticPart>
        <MagneticPart spec={L.headR} name="painel-led-dir">
          <group position={hR}>
            <LedHead face={m.ledR} from={L.aR} to={L.sR} turn={REAIM} />
          </group>
        </MagneticPart>
        <MagneticPart spec={L.doorsL} name="abas-esq">
          <group position={hL}>
            <BarnDoors open={w(0.68, 0.74)} from={L.aL} to={L.sL} turn={REAIM} />
          </group>
        </MagneticPart>
        <MagneticPart spec={L.doorsR} name="abas-dir">
          <group position={hR}>
            <BarnDoors open={w(0.71, 0.76)} from={L.aR} to={L.sR} turn={REAIM} />
          </group>
        </MagneticPart>
        <MagneticPart spec={L.softbox} name="softbox">
          <group position={SOFTBOX_POSE.pos} quaternion={SOFTBOX_POSE.quat}>
            <SoftboxBody expand={w(0.5, 0.6)} />
          </group>
        </MagneticPart>
        <MagneticPart spec={L.diffuser} name="difusor">
          <group position={SOFTBOX_POSE.pos} quaternion={SOFTBOX_POSE.quat}>
            <Diffuser face={m.diffuser} />
          </group>
        </MagneticPart>
        <MagneticPart spec={L.ringHead} name="ring-light">
          <group position={RING_HEAD}>
            <RingHead glow={m.ring} yaw={L.ringYaw} baseMat={tex.ringBase} />
          </group>
        </MagneticPart>
        <MagneticPart spec={L.phone} name="telemovel">
          <group position={RING_HEAD}>
            <Phone yaw={L.ringYaw} />
          </group>
        </MagneticPart>
        <MagneticPart spec={L.controller} name="controlador">
          <group position={[CASE[0], caseTop, CASE[2]]}>
            <Controller front={tex.controller} />
          </group>
        </MagneticPart>
        <MagneticPart spec={L.remote} name="comando">
          <group position={[CASE[0] + 0.28, caseTop, CASE[2] + 0.1]} rotation={[0, 0.35, 0]}>
            <Remote />
          </group>
        </MagneticPart>
        <MagneticPart spec={L.psuL} name="fonte-esq">
          <group position={PSU_L} rotation={[0, 0.5, 0]}>
            <PowerSupply />
          </group>
        </MagneticPart>
        <MagneticPart spec={L.psuR} name="fonte-dir">
          <group position={PSU_R} rotation={[0, -0.4, 0]}>
            <PowerSupply />
          </group>
        </MagneticPart>
      </MagneticField>

      {/* cabos ligam-se aos equipamentos (desenho progressivo) */}
      <Cable points={cable([LED_L[0], standTopY(STANDS.led), LED_L[2]], PSU_L)} at={w(0.68, 0.74)} />
      <Cable points={cable([LED_R[0], standTopY(STANDS.led), LED_R[2]], PSU_R)} at={w(0.7, 0.75)} />
      <Cable points={cable([CSTAND[0], standTopY(STANDS.cstand), CSTAND[2]], CASE)} at={w(0.71, 0.75)} />
      <Cable points={cable([RING[0], standTopY(STANDS.ring), RING[2]], CASE)} at={w(0.72, 0.75)} />

      <KitEffects m={m} ledL={panelL} ledR={panelR} softbox={SOFTBOX_POSE.pos} ring={[RING_HEAD[0], RING_HEAD[1] + 0.36, RING_HEAD[2]]} />
    </group>
  );
}
