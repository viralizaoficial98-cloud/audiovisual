import * as THREE from "three";
import type { Vec3 } from "@/animation/math";
import { lightAt as at } from "@/animation/phases";
import { HERO_TRIPOD, LIGHT_POS, SET_FOCUS, yawFrontTo } from "../../layout";

/**
 * PLANTA E COREOGRAFIA DO KIT DE ILUMINAÇÃO.
 * Posições finais = composição da imagem oficial Luzes-Parte2 (vista do espectador):
 * LED à esquerda, ring light à frente-esquerda, mala + controlador ao centro, softbox
 * suspensa na girafa (C-stand com rodas e saco de areia), LED à direita, parede com logotipo.
 * Posições iniciais = flat-lay da imagem Luzes-Parte1 (tudo desmontado no chão).
 * Janelas expressas em fracções da fase LUZ (0 → 1) via `at()`.
 */

export const w = (a: number, b: number) => [at(a), at(b)] as const;

/** Parâmetros dos tripés. */
export const STANDS = {
  led: { collar: 0.5, legLength: 0.62, legOpen: 0.5, outer: 0.75, rise: 0.55, tube: 0.016, baseY: 0 },
  ring: { collar: 0.45, legLength: 0.55, legOpen: 0.5, outer: 0.55, rise: 0.35, tube: 0.013, baseY: 0 },
  cstand: { collar: 0.55, legLength: 0.62, legOpen: 0.5, outer: 0.8, rise: 0.45, tube: 0.018, baseY: 0.064 },
  hero: { collar: 1.1, legLength: 1.2, legOpen: 0.36, outer: 0.05, rise: 0.05, tube: 0.02, baseY: 0 },
};
export type StandParams = (typeof STANDS)["led"];

/** Elevação automática para os pés tocarem o chão (pernas mais fechadas = tripé mais alto). */
export const legLift = (s: StandParams, a: number) => Math.max(0, s.legLength * Math.cos(a) - s.collar);
/** Altura final do topo da coluna (pernas abertas, coluna estendida). */
export const standTopY = (s: StandParams) => s.baseY + legLift(s, s.legOpen) + s.collar + s.outer + s.rise;
/** Altura final do colar onde as pernas articulam. */
export const collarY = (s: StandParams) => s.baseY + legLift(s, s.legOpen) + s.collar;

/** Ponta de cada perna (onde encaixam as rodas do C-stand). */
export function legEnd(pos: Vec3, s: StandParams, k: number): Vec3 {
  const th = (k * Math.PI * 2) / 3;
  const a = s.legOpen;
  return [pos[0] - s.legLength * Math.sin(a) * Math.sin(th), collarY(s) - s.legLength * Math.cos(a), pos[2] - s.legLength * Math.sin(a) * Math.cos(th)];
}

/** Orientação para apontar a frente (+Z local) a um alvo (por omissão o set), com inclinação. */
export function aim(pos: Vec3, y: number, target: Vec3 = SET_FOCUS) {
  const yaw = yawFrontTo(pos, target);
  const dist = Math.hypot(target[0] - pos[0], target[2] - pos[2]);
  return { yaw, pitch: Math.atan2(y - target[1], dist) };
}

/**
 * Durante a fase LUZ os painéis apontam para o centro do kit, à frente (composição de
 * Luzes-Parte2: faces LED visíveis); quando o estúdio começa a ser construído, rodam para o set.
 */
export const KIT_FOCUS: Vec3 = [2.1, 1.1, 1.7];
export const REAIM: readonly [number, number] = [0.552, 0.6];

// ---------------- posições finais ----------------
export const LED_L = LIGHT_POS.ledLeft;
export const LED_R = LIGHT_POS.ledRight;
export const RING = LIGHT_POS.ring;
export const CSTAND = LIGHT_POS.softbox;
export const CASE = LIGHT_POS.case;
export const HERO = HERO_TRIPOD;

export const LED_PANEL_DY = 0.33;
export const ledHeadPos = (p: Vec3): Vec3 => [p[0], standTopY(STANDS.led), p[2]];
export const RING_HEAD: Vec3 = [RING[0], standTopY(STANDS.ring), RING[2]];

// girafa (boom) e softbox suspensa
export const BOOM = { len: 1.25, angle: 1.2, tilt: -0.95, hang: 0.27 };
export const BOOM_PIVOT: Vec3 = [CSTAND[0], standTopY(STANDS.cstand), CSTAND[2]];
export const BOOM_YAW = yawFrontTo(CSTAND, SET_FOCUS);

/** Pose final da softbox (fim do braço, inclinada para o set). */
export const SOFTBOX_POSE = (() => {
  const m = new THREE.Matrix4()
    .makeTranslation(...BOOM_PIVOT)
    .multiply(new THREE.Matrix4().makeRotationY(BOOM_YAW))
    .multiply(new THREE.Matrix4().makeRotationX(BOOM.angle))
    .multiply(new THREE.Matrix4().makeTranslation(0, BOOM.len, 0))
    .multiply(new THREE.Matrix4().makeRotationX(BOOM.tilt - BOOM.angle))
    .multiply(new THREE.Matrix4().makeTranslation(0, -BOOM.hang, 0));
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  m.decompose(pos, quat, new THREE.Vector3());
  return { pos: pos.toArray() as Vec3, quat, euler: new THREE.Euler().setFromQuaternion(quat).toArray().slice(0, 3) as Vec3 };
})();

/** Parede de fundo com o logotipo (como na imagem Luzes-Parte2). */
export const BACKDROP: Vec3 = [2.1, 0, -3.25];
