"use client";

import { useEffect, useRef } from "react";
import { heroState, onHeroProgress } from "@/animation/heroState";
import { ease, range } from "@/animation/math";
import { ASSEMBLY } from "@/animation/phases";
import type { QualityTier } from "@/lib/quality";

/**
 * Partículas douradas em primeiro plano (canvas 2D por cima da cena 3D) durante a montagem
 * da câmara. Movem-se mais depressa do que a cena com o scroll (parallax) e reagem ao rato.
 * Desligam-se depois da revelação para não consumir recursos.
 */
export function GoldParticles({ tier }: { tier: QualityTier }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const N = tier === "low" ? 18 : coarse ? 24 : 70;
    const parts = Array.from({ length: N }, (_, i) => {
      const r = (k: number) => {
        const s = Math.sin((i + 1) * 12.9898 + k * 78.233) * 43758.5453;
        return s - Math.floor(s);
      };
      return { x: r(1), y: r(2), z: 0.25 + r(3) * 0.75, size: 0.6 + r(4) * 1.8, sp: 0.15 + r(5) * 0.5, ph: r(6) * 6.28 };
    });
    const pointer = { x: 0, sx: 0 };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "mouse") pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    };
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
    };
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });

    // sprite do brilho desenhado UMA vez (antes: 70 gradientes criados por frame → lixo/GC).
    // gradiente igual ao anterior; a opacidade de cada partícula vai em globalAlpha.
    const sprite = document.createElement("canvas");
    sprite.width = sprite.height = 64;
    const sg = sprite.getContext("2d")!;
    const grad = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,214,110,1)");
    grad.addColorStop(1, "rgba(255,180,40,0)");
    sg.fillStyle = grad;
    sg.fillRect(0, 0, 64, 64);

    const end = ASSEMBLY.reveal[1];
    let raf = 0;
    let running = false;
    const t0 = performance.now();
    let lastDraw = 0;
    const tick = (now: number) => {
      // dispositivos de toque: 30 fps chegam para as partículas (poupa bateria)
      if (coarse && now - lastDraw < 32) {
        raf = requestAnimationFrame(tick);
        return;
      }
      lastDraw = now;
      const p = heroState.progress;
      const fade = 1 - ease.inOutSine(range(p, end - 0.02, end + 0.04));
      const cw = canvas.width;
      const ch = canvas.height;
      ctx.clearRect(0, 0, cw, ch);
      if (fade <= 0.01 || !heroState.visible) {
        running = false;
        return;
      }
      const t = (now - t0) / 1000;
      pointer.sx += (pointer.x - pointer.sx) * 0.05;
      ctx.globalCompositeOperation = "lighter";
      for (const q of parts) {
        const yy = (((q.y - t * q.sp * 0.025 * q.z - p * 2.2 * q.z) % 1) + 1) % 1;
        const xx = q.x + Math.sin(t * 0.3 + q.ph) * 0.01 + pointer.sx * 0.02 * q.z;
        const rad = q.size * q.z * (cw / 900);
        const a = fade * (0.3 + 0.45 * Math.sin(t * 1.3 + q.ph) ** 2) * q.z;
        ctx.globalAlpha = a;
        ctx.drawImage(sprite, xx * cw - rad * 4, yy * ch - rad * 4, rad * 8, rad * 8);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(tick);
    };
    const start = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(tick);
    };
    start();
    const off = onHeroProgress(start);
    return () => {
      cancelAnimationFrame(raf);
      off();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
    };
  }, [tier]);

  return <canvas ref={ref} data-dust aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />;
}
