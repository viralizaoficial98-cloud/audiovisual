/** Utilitários matemáticos puros usados pela timeline e pela cena 3D. */

export const clamp = (v: number, min = 0, max = 1) => (v < min ? min : v > max ? max : v);

/** Converte p em [a,b] para [0,1] (com clamp). É a base de todas as janelas de animação. */
export const range = (p: number, a: number, b: number) => clamp((p - a) / (b - a));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export type Ease = (t: number) => number;

export const ease = {
  linear: ((t) => t) as Ease,
  inOutSine: ((t) => -(Math.cos(Math.PI * t) - 1) / 2) as Ease,
  inOutCubic: ((t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)) as Ease,
  outCubic: ((t) => 1 - Math.pow(1 - t, 3)) as Ease,
  outQuart: ((t) => 1 - Math.pow(1 - t, 4)) as Ease,
  outExpo: ((t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t))) as Ease,
  inOutQuart: ((t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2)) as Ease,
  /** Encaixe mecânico: chega à posição com um pequeno assentamento (overshoot ~3%). */
  snap: ((t) => {
    const c1 = 1.2;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }) as Ease,
};

/** Interpolação Catmull-Rom (uniforme) num eixo. */
export function catmull(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

export type Vec3 = [number, number, number];

/**
 * Amostra uma sequência de keyframes {at, value[]} com interpolação Catmull-Rom.
 * O parâmetro local de cada segmento é suavizado (inOutSine) para que o movimento
 * de câmara abrande junto aos keyframes, como um operador de câmara real.
 */
export function sampleKeys<T extends number[]>(keys: Array<{ at: number; v: T }>, p: number, out: number[]): number[] {
  const n = keys.length;
  if (p <= keys[0].at) return copyInto(out, keys[0].v);
  if (p >= keys[n - 1].at) return copyInto(out, keys[n - 1].v);
  let i = 0;
  while (i < n - 2 && p > keys[i + 1].at) i++;
  const k0 = keys[Math.max(0, i - 1)].v;
  const k1 = keys[i].v;
  const k2 = keys[i + 1].v;
  const k3 = keys[Math.min(n - 1, i + 2)].v;
  const raw = (p - keys[i].at) / (keys[i + 1].at - keys[i].at);
  const t = lerp(raw, ease.inOutSine(raw), 0.55);
  for (let d = 0; d < k1.length; d++) out[d] = catmull(k0[d], k1[d], k2[d], k3[d], t);
  return out;
}

function copyInto(out: number[], v: number[]) {
  for (let d = 0; d < v.length; d++) out[d] = v[d];
  return out;
}

/** Ruído determinístico barato (0..1) a partir de um inteiro — evita Math.random() em render. */
export function hash(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}
