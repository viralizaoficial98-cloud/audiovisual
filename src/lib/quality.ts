/**
 * Detecção do nível de qualidade gráfica. A cena adapta resolução, sombras, pós-processamento
 * e quantidade de adereços consoante o nível. O PerformanceMonitor do drei pode ainda
 * baixar a resolução em tempo real se o FPS cair.
 */
export type QualityTier = "high" | "medium" | "low";

export function detectWebGL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2") || canvas.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return false;
    const ok = typeof gl.getParameter === "function";
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return ok;
  } catch {
    return false;
  }
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

  if (cores <= 4 || memory <= 3) return "low";
  if (coarse || small) return "medium";
  return "high";
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
