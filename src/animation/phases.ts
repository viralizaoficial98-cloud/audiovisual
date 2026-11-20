/**
 * Mapa das fases da animação principal. Todas as janelas são expressas em progresso
 * global (0 → 1) da timeline controlada pelo scroll. Alterar aqui reorganiza a narrativa
 * inteira — a cena 3D e os textos leem estas mesmas constantes.
 */

export const PHASES = {
  /** Fase 1 — câmara desmontada no chão; as peças levitam */
  exploded: { start: 0, end: 0.12 },
  /** Fase 2 — montagem magnética da câmara + revelação */
  camera: { start: 0.12, end: 0.4 },
  /** Fase 3 — montagem do sistema de iluminação */
  lights: { start: 0.4, end: 0.55 },
  /** Fase 4 — construção da sala de podcast */
  studio: { start: 0.55, end: 0.85 },
  /** Fase 5 — revelação do estúdio completo */
  reveal: { start: 0.85, end: 1 },
} as const;

export type PhaseKey = keyof typeof PHASES;

/**
 * FASE 3 — MONTAGEM MAGNÉTICA DO KIT DE ILUMINAÇÃO (progresso de cena 0.40 → 0.55).
 * Sub-fases pedidas: desmontagem total, activação magnética, suportes, equipamentos,
 * activação da iluminação e revelação (seguida de uma pausa para apreciar o resultado).
 */
export const LIGHT_PHASES = {
  disassembled: [0.4, 0.4225] as const,
  activation: [0.4225, 0.445] as const,
  supports: [0.445, 0.475] as const,
  equipment: [0.475, 0.5125] as const,
  power: [0.5125, 0.535] as const,
  reveal: [0.535, 0.55] as const,
};

/** Converte uma fracção (0..1) da fase LUZ em progresso de cena. */
export const lightAt = (f: number) => 0.4 + 0.15 * f;

/** Janelas usadas por outros módulos (câmara a caminho do tripé, cabos, acendimento). */
export const LIGHTS = {
  cameraMove: [0.4, 0.48] as const,
  standUp: [0.445, 0.475] as const,
  legsOpen: [0.457, 0.469] as const,
  columnRise: [0.463, 0.4735] as const,
  heads: [0.475, 0.5125] as const,
  softboxExpand: [0.478, 0.49] as const,
  cables: [0.502, 0.5125] as const,
  powerOn: [0.5125, 0.535] as const,
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
  intro: { out: [0.07, 0.11] },
  camera: { in: [0.3, 0.34], out: [0.385, 0.415] },
  lights: { in: [0.505, 0.518], out: [0.534, 0.543] },
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

/**
 * MONTAGEM MAGNÉTICA DA CÂMARA (progresso de cena). Cada peça tem a sua própria janela
 * dentro destes blocos — ver src/scene/models/CinemaCamera.tsx.
 */
export const ASSEMBLY = {
  /** peças pousadas no chão (vibram no fim) */
  rest: [0, 0.06] as const,
  /** levitação magnética até à constelação */
  lift: [0.06, 0.125] as const,
  /** estrutura metálica interna */
  structure: [0.12, 0.18] as const,
  /** sensor e electrónica */
  electronics: [0.18, 0.24] as const,
  /** conjunto óptico */
  lens: [0.24, 0.3] as const,
  /** painéis exteriores e acessórios */
  body: [0.3, 0.362] as const,
  /** revelação cinematográfica */
  reveal: [0.362, 0.4] as const,
};

/**
 * Mapeamento scroll → cena. A montagem da câmara (cena 0 → 0.40) recebe 40,7% do
 * scroll; o resto da narrativa mantém todas as janelas originais. Linear por troços,
 * contínuo e monótono, portanto reversível.
 */
/**
 * Troços (scroll, cena). A câmara mantém 40,7% do scroll (≈ os mesmos 370vh de antes);
 * a fase LUZ recebe ~25% e a sua cena final fica parada durante 5% (pausa de apreciação).
 */
const KNOTS: Array<[number, number]> = [
  [0, 0],
  [0.407, 0.4],
  [0.66, 0.545],
  [0.71, 0.55],
  [1, 1],
];

function piecewise(t: number, from: 0 | 1, to: 0 | 1) {
  const c = t < 0 ? 0 : t > 1 ? 1 : t;
  for (let i = 1; i < KNOTS.length; i++) {
    const a = KNOTS[i - 1];
    const b = KNOTS[i];
    if (c <= b[from]) return a[to] + ((c - a[from]) / (b[from] - a[from])) * (b[to] - a[to]);
  }
  return 1;
}

export const scrollToScene = (t: number) => piecewise(t, 0, 1);
export const sceneToScroll = (p: number) => piecewise(p, 1, 0);
