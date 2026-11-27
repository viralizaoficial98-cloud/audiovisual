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

/** Características do aparelho (as que o navegador revela). */
function device() {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const ua = nav.userAgent || "";
  return {
    // o Safari (iOS) não revela a memória e pode reportar menos núcleos do que os reais
    ios: /iPad|iPhone|iPod/.test(ua) || (nav.platform === "MacIntel" && nav.maxTouchPoints > 1),
    cores: nav.hardwareConcurrency || 4,
    memory: nav.deviceMemory ?? 8,
    coarse: window.matchMedia("(pointer: coarse)").matches,
    small: Math.min(window.innerWidth, window.innerHeight) < 600,
    software: /swiftshader|llvmpipe|softpipe|software|basic render/i.test(gpuName),
  };
}

/**
 * Aparelho que à partida não consegue reproduzir a montagem 3D → composição final estática.
 * Só sem GPU real (renderização por software). Todos os outros — incluindo telemóveis
 * modestos — recebem a sequência 3D com a qualidade reduzida progressivamente (nível,
 * resolução adaptativa, partículas, sombras, pós-processamento); só se, mesmo na qualidade
 * mínima, a animação ficar abaixo de ~8 fps é que o banner passa à composição estática
 * (ver AdaptiveResolution em HeroScene.tsx).
 */
export function isWeakDevice(): boolean {
  if (typeof window === "undefined") return false;
  return device().software;
}

export function detectTier(): QualityTier {
  if (typeof window === "undefined") return "medium";
  const params = new URLSearchParams(window.location.search);
  const forced = params.get("quality");
  if (forced === "high" || forced === "medium" || forced === "low") return forced;

  const d = device();
  // renderização por software (sem GPU real): só o essencial
  if (d.software) return "low";
  // telemóveis e tablets: qualidade optimizada (sem pós-processamento, resolução ≤ 1.25×);
  // "low" só para aparelhos claramente modestos
  if (d.coarse || d.small) return !d.ios && (d.memory <= 3 || d.cores <= 4) ? "low" : "medium";
  // computadores modestos
  if (d.cores <= 2 || d.memory <= 2) return "low";
  // computadores convencionais: GPU integrada (Intel HD/UHD/Iris, APUs AMD "Radeon Graphics",
  // ARM) ou 4 núcleos → qualidade equilibrada (pós-processamento sim, sombras não).
  // GPUs dedicadas e Apple Silicon com mais núcleos → qualidade cinematográfica elevada.
  if (d.cores <= 4 || /intel(?!.*\barc\b)|radeon\(tm\) graphics|radeon graphics|vega \d+ graphics|mali|adreno|powervr/i.test(gpuName)) return "medium";
  return "high";
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
