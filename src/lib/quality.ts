/**
 * Detecção do nível de qualidade gráfica. A cena adapta resolução, sombras, pós-processamento
 * e quantidade de adereços consoante o nível (a sequência de montagem é igual em todos).
 * Em tempo real, a resolução adaptativa da cena (AdaptiveResolution) ajusta ainda o
 * devicePixelRatio se o ritmo dos frames cair.
 */
export type QualityTier = "high" | "medium" | "low";

/** Nome da GPU (quando o navegador o revela), lido no teste de WebGL. */
let gpuName = "";

export function detectWebGL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2") || canvas.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return false;
    const ok = typeof gl.getParameter === "function";
    try {
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      gpuName = String(gl.getParameter(dbg ? dbg.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? "");
    } catch {
      gpuName = "";
    }
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return ok;
  } catch {
    return false;
  }
}

/** O nível foi imposto por parâmetro (?quality=…) — diagnóstico e testes. */
export function isTierForced(): boolean {
  if (typeof window === "undefined") return false;
  return /[?&]quality=(high|medium|low)\b/.test(window.location.search);
}

export function detectTier(): QualityTier {
  if (typeof window === "undefined") return "medium";
  const params = new URLSearchParams(window.location.search);
  const forced = params.get("quality");
  if (forced === "high" || forced === "medium" || forced === "low") return forced;

  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency || 4;
  const memory = nav.deviceMemory ?? 8;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const small = Math.min(window.innerWidth, window.innerHeight) < 600;

  // renderização por software (sem GPU real): só o essencial
  if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(gpuName)) return "low";
  if (cores <= 4 || memory <= 3) return "low";
  if (coarse || small) return "medium";
  // computadores intermédios: GPU integrada (Intel HD/UHD/Iris, APUs AMD "Radeon Graphics",
  // ARM) → pós-processamento sim, sombras não. GPUs dedicadas e Apple Silicon → alto.
  if (/intel(?!.*\barc\b)|radeon\(tm\) graphics|radeon graphics|vega \d+ graphics|mali|adreno|powervr/i.test(gpuName)) return "medium";
  return "high";
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
