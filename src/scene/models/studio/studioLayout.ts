import * as THREE from "three";
import type { Vec3 } from "@/animation/math";
import { studioAt } from "@/animation/phases";

/**
 * PLANTA DO ESTÚDIO DE PODCAST — composição da imagem oficial Podcast Parte3.
 *
 * Vista do espectador (câmara virtual em +Z a olhar para a parede do fundo):
 *  - parede central: logotipo "VIRALIZA AUDIOVISUAL & PODCAST", ecrã VIRALIZA PODCAST,
 *    fitas LED douradas verticais; prateleiras de cada lado; ripas acústicas pretas atrás;
 *  - parede esquerda: painéis AUDIOVISUAL / PODCAST / PRODUÇÃO e ar condicionado;
 *  - parede direita: espuma acústica em pirâmide;
 *  - centro: tapete, mesa redonda luminosa com o logotipo, dois cadeirões cinzentos,
 *    microfones em braços articulados, canecas;
 *  - esquerda: dois cadeirões pretos com almofadas amarelas, mesa de apoio, planta;
 *  - extremos: câmara em tripé à esquerda (nova) e à direita (a câmara principal, já no tripé);
 *  - frente: mesa de produção com mesa de mistura, monitor, auscultadores, caneca e planta;
 *  - luz: o kit montado na fase LUZ + softbox à esquerda e à direita + LEDs baixos.
 */

export const ROOM = { minX: -1.9, maxX: 5.9, backZ: -4.5, frontZ: 2.9, height: 4.0 };
export const CX = 2.0;
export const WALL = ROOM.backZ + 0.06;

/** Janela de uma peça em fracções da montagem do estúdio (0 → 1). */
export const sw = (a: number, b: number) => [studioAt(a), studioAt(b)] as const;

/* ------------------------------------------------------------- parede central */
export const NICHE = { x0: 0.45, x1: 3.55 };
export const TV = { pos: [CX, 1.85, WALL + 0.1] as Vec3, w: 2.25, h: 1.27 };
export const LOGO = { pos: [CX, 3.15, WALL + 0.09] as Vec3, w: 2.3, h: 1.26 };
export const SHELF_L: Vec3 = [-0.05, 0, WALL + 0.19];
export const SHELF_R: Vec3 = [4.05, 0, WALL + 0.19];
export const SLATS_L = { x: -1.12, w: 1.05 };
export const SLATS_R = { x: 5.12, w: 1.05 };

/* ------------------------------------------------------------------ set */
export const TABLE: Vec3 = [CX, 0, -2.3];
export const CHAIR_L: Vec3 = [1.1, 0, -2.12];
export const CHAIR_R: Vec3 = [2.9, 0, -2.12];
export const LOUNGE_A: Vec3 = [-1.05, 0, -1.25];
export const LOUNGE_B: Vec3 = [-0.6, 0, -0.35];
export const SIDE_TABLE: Vec3 = [-0.05, 0, -0.95];
export const CAM2: Vec3 = [-0.55, 0, 0.55];
export const CASE2: Vec3 = [4.95, 0, -0.75];
export const SOFTBOX_L: Vec3 = [-1.35, 0, -2.25];
export const SOFTBOX_R: Vec3 = [5.25, 0, -1.75];
export const LED_LOW_L: Vec3 = [-0.25, 0, -2.05];
export const LED_LOW_R: Vec3 = [4.55, 0, -2.2];
export const DESK: Vec3 = [CX, 0, 1.55];

/** Parâmetros dos tripés baixos (LEDs a meia altura, como na referência). */
export const LOW_STAND = { collar: 0.45, legLength: 0.55, legOpen: 0.5, outer: 0.45, rise: 0.25, tube: 0.013, baseY: 0 };

/* -------------------------------------------------------------- orientação */
const Qy = (a: number) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), a);
const Qx = (a: number) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), a);
const Qz = (a: number) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), a);
const E = new THREE.Euler();

/** Converte a orientação desejada no chão para o formato `lie` do MagneticPart, dada a orientação final da peça. */
export function lieFor(childQuat: THREE.Quaternion, desired: THREE.Quaternion): Vec3 {
  const q = desired.clone().multiply(childQuat.clone().invert());
  E.setFromQuaternion(q, "YXZ");
  return [E.x, E.y, E.z];
}
export const qYaw = Qy;
/** Pousada de face para cima (painéis, ecrãs). */
export const faceUp = (yaw = 0) => Qy(yaw).multiply(Qx(-Math.PI / 2));
/** Pousada de face para cima com o lado comprido ao longo do chão (ripas, prateleiras). */
export const longFlat = (yaw = 0) => Qy(yaw).multiply(Qx(-Math.PI / 2)).multiply(Qz(Math.PI / 2));
/** Deitada de costas (cadeiras). */
export const onBack = (yaw = 0) => Qy(yaw).multiply(Qx(-Math.PI / 2));
/** Deitada de lado (tripés, objectos cilíndricos). */
export const onSide = (yaw = 0) => Qy(yaw).multiply(Qz(Math.PI / 2));

/**
 * Onda de activação magnética: as peças levitam por ordem de distância ao centro do set,
 * entre 6% e 24% da montagem (sw).
 */
export function wave(x: number, z: number, len = 0.06): readonly [number, number] {
  const d = Math.min(1, Math.hypot(x - CX, z + 1) / 6.5);
  const a = 0.06 + d * 0.12;
  return sw(a, a + len);
}
