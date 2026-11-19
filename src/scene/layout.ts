import type { Vec3 } from "@/animation/math";

/**
 * Planta do mundo 3D (metros). O estúdio é construído em torno destas posições,
 * por isso a câmara montada na fase 2 e as luzes da fase 3 acabam por fazer parte
 * do estúdio final — a narrativa é contínua, sem cortes.
 */
export const ROOM = {
  width: 14,
  minX: -7,
  maxX: 7,
  backZ: -4.5,
  frontZ: 3,
  height: 4,
};

/** Centro do set de podcast (mesa redonda). */
export const SET: Vec3 = [2, 0, -2.4];
/** Ponto para onde apontam câmaras e luzes. */
export const SET_FOCUS: Vec3 = [2, 1.05, -2.35];

/** Onde a câmara principal é montada (fases 1–2). */
export const HERO_ASSEMBLY: Vec3 = [2.3, 1.5, 2.4];
/** Escala da câmara principal (ligeiramente heroica face ao real). */
export const HERO_SCALE = 1.25;
/** Posição final da câmara principal: no tripé, à direita, a filmar o set. */
export const HERO_TRIPOD: Vec3 = [4.55, 0, 0.55];
export const HERO_TRIPOD_HEAD_Y = 1.3;

/** Sistema de iluminação (fase 3). */
export const LIGHT_POS = {
  ledLeft: [0.25, 0, -0.95] as Vec3,
  ledRight: [3.95, 0, -1.15] as Vec3,
  softbox: [3.2, 0, 0.25] as Vec3,
  ring: [0.95, 0, 0.25] as Vec3,
  case: [1.85, 0, 0.6] as Vec3,
};

/** Câmara de estúdio secundária (fase 4, etapa 11). */
export const CAM2_TRIPOD: Vec3 = [-0.35, 0, 0.75];

/** Ângulo (yaw) para um objecto em `from` com a frente em -X local apontar para `to`. */
export function yawLensTo(from: Vec3, to: Vec3) {
  const dx = to[0] - from[0];
  const dz = to[2] - from[2];
  const l = Math.hypot(dx, dz) || 1;
  return Math.atan2(dz / l, -dx / l);
}

/** Ângulo (yaw) para um objecto com a frente em +Z local apontar para `to`. */
export function yawFrontTo(from: Vec3, to: Vec3) {
  return Math.atan2(to[0] - from[0], to[2] - from[2]);
}
