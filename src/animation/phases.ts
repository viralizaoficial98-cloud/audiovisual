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
  /** Fase 4 — montagem magnética da sala de podcast (0% → 100%) */
  studio: { start: 0.55, end: 0.9 },
  /** Fase 5 — banner final: estúdio completo, aproximação e estabilização */
  reveal: { start: 0.9, end: 1 },
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
/** Converte uma fracção (0..1) da montagem do estúdio em progresso de cena (0.55 → 0.90). */
export const studioAt = (f: number) => 0.55 + 0.35 * f;
const sw = (a: number, b: number) => [studioAt(a), studioAt(b)] as const;

/**
 * FASE 4 — MONTAGEM MAGNÉTICA DO ESTÚDIO (marcos pedidos: 0% desmontado, 25%, 50%, 75%, 100%).
 * Janelas em progresso de cena; cada peça tem a sua sub-janela em src/scene/models/studio/.
 */
export const STUDIO_STEPS = {
  /** estrutura base (paredes, tecto) e chão de peças a emergir */
  structure: sw(0, 0.08),
  /** onda de activação magnética: as peças levitam */
  activation: sw(0.06, 0.24),
  /** painéis acústicos, ripas, tecto acústico */
  acoustic: sw(0.1, 0.28),
  /** suportes, tripés, iluminação, prateleiras, painéis de identidade */
  supports: sw(0.22, 0.48),
  /** cadeiras, mesa central, tapete, cadeirões */
  scene: sw(0.4, 0.62),
  /** microfones, câmaras, áudio, ecrã, decoração */
  equipment: sw(0.58, 0.88),
  /** logotipo VIRALIZA na parede central (última peça) */
  logo: sw(0.86, 0.97),
  /** fitas LED douradas e iluminação final */
  finalLight: sw(0.84, 1),
};


/** Textos sobrepostos por fase (in/out em progresso global). */
export const OVERLAY_TIMING = {
  intro: { out: [0.07, 0.11] },
  camera: { in: [0.3, 0.34], out: [0.385, 0.415] },
  lights: { in: [0.505, 0.518], out: [0.534, 0.543] },
  studio: { in: [0.6, 0.63], out: [0.69, 0.715] },
  reveal: { in: [0.935, 0.975] },
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
 * Mapeamento tempo → cena (antes: scroll → cena). A montagem da câmara (cena 0 → 0.40)
 * recebe ~33% da duração; o resto da narrativa mantém todas as janelas originais. Linear por
 * troços, contínuo e monótono.
 */
/**
 * Troços (fracção do tempo, cena). Proporções herdadas da versão por scroll (1120vh):
 * câmara ≈ 8.6 s, luzes ≈ 5.3 s + pausa ≈ 1 s, estúdio ≈ 8.4 s, revelação ≈ 2.6 s.
 */
const KNOTS: Array<[number, number]> = [
  [0, 0],
  [0.3307, 0.4], // câmara: 370vh de 1120vh (igual ao aprovado)
  [0.5363, 0.545], // luzes: ~230vh
  [0.5769, 0.55], // pausa da revelação das luzes: ~45vh
  [0.8983, 0.9], // montagem do estúdio: ~360vh
  [1, 1], // banner final: ~114vh
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

/**
 * A sequência é reproduzida no TEMPO (não pelo scroll): as mesmas proporções entre fases,
 * agora como fracção da duração total. O scroll da página fica 100% nativo e livre.
 */
export const HERO_DURATION_S = 26;
export const timeToScene = scrollToScene;
export const sceneToTime = sceneToScroll;
