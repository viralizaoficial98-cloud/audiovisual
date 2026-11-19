/**
 * Mapa das fases da animação principal. Todas as janelas são expressas em progresso
 * global (0 → 1) da timeline controlada pelo scroll. Alterar aqui reorganiza a narrativa
 * inteira — a cena 3D e os textos leem estas mesmas constantes.
 */

export const PHASES = {
  /** Fase 1 — câmara totalmente desmontada (vista explodida) */
  exploded: { start: 0, end: 0.15 },
  /** Fase 2 — montagem progressiva da câmara */
  camera: { start: 0.15, end: 0.35 },
  /** Fase 3 — montagem do sistema de iluminação */
  lights: { start: 0.35, end: 0.55 },
  /** Fase 4 — construção da sala de podcast */
  studio: { start: 0.55, end: 0.85 },
  /** Fase 5 — revelação do estúdio completo */
  reveal: { start: 0.85, end: 1 },
} as const;

export type PhaseKey = keyof typeof PHASES;

/** Sub-janelas da fase 3 (sistema de iluminação). */
export const LIGHTS = {
  cameraMove: [0.355, 0.47] as const,
  standUp: [0.38, 0.44] as const,
  legsOpen: [0.405, 0.46] as const,
  columnRise: [0.42, 0.48] as const,
  heads: [0.44, 0.5] as const,
  softboxExpand: [0.45, 0.51] as const,
  cables: [0.47, 0.525] as const,
  powerOn: [0.5, 0.55] as const,
};

/**
 * Sub-janelas da fase 4: as 14 etapas de construção do estúdio, pela ordem pedida.
 * Ligeiramente sobrepostas para que a montagem tenha continuidade (sem "esperas" vazias).
 */
export const STUDIO_STEPS = {
  structure: [0.55, 0.6] as const,
  acoustic: [0.572, 0.63] as const,
  coverings: [0.588, 0.645] as const,
  ledStrips: [0.606, 0.66] as const,
  logoPanel: [0.622, 0.67] as const,
  tv: [0.638, 0.68] as const,
  shelves: [0.648, 0.7] as const,
  seating: [0.665, 0.72] as const,
  table: [0.69, 0.735] as const,
  mics: [0.706, 0.75] as const,
  accessories: [0.722, 0.762] as const,
  cameras: [0.732, 0.782] as const,
  lighting: [0.748, 0.795] as const,
  production: [0.762, 0.81] as const,
  finalLight: [0.8, 0.86] as const,
};

/** Textos sobrepostos por fase (in/out em progresso global). */
export const OVERLAY_TIMING = {
  intro: { out: [0.1, 0.145] },
  camera: { in: [0.22, 0.26], out: [0.33, 0.365] },
  lights: { in: [0.43, 0.47], out: [0.535, 0.57] },
  studio: { in: [0.615, 0.655], out: [0.8, 0.84] },
  reveal: { in: [0.885, 0.95] },
} as const;

/** Etiquetas do indicador lateral de progresso. */
export const CHAPTERS: Array<{ key: PhaseKey; label: string }> = [
  { key: "exploded", label: "Visão" },
  { key: "camera", label: "Câmara" },
  { key: "lights", label: "Luz" },
  { key: "studio", label: "Estúdio" },
  { key: "reveal", label: "Revelação" },
];
