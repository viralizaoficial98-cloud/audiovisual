"use client";

import { useEffect, useRef } from "react";
import { preload } from "react-dom";
import { heroState, onHeroProgress } from "@/animation/heroState";
import { clamp, ease, lerp, range } from "@/animation/math";
import { OVERLAY_TIMING, SHOWCASE as W } from "@/animation/phases";
import type { QualityTier } from "@/lib/quality";

/**
 * INTRODUÇÃO COM AS 4 IMAGENS OFICIAIS DA CÂMARA VIRALIZA (composição 2.5D).
 *
 * As imagens são renders 2D: não contêm geometria, por isso a rotação lateral → frontal
 * é SIMULADA (perspectiva + deslocação + máscara + flare). Nada é redesenhado: as
 * fotografias são mostradas na resolução original, sem deformação.
 *
 * Camadas (de trás para a frente):
 *   cena 3D (bokeh, poeira, luz)  →  fotografias  →  luz/flares  →  partículas douradas
 * Tudo é função do progresso de cena p (mesmo valor que move a cena 3D), logo reversível.
 */

type Pt = [number, number];
type Shot = { src: string; w: number; h: number; alt: string };

const SHOTS: Shot[] = [
  { src: "/images/camera/parte1-desmontada.webp", w: 1536, h: 1024, alt: "Câmara VIRALIZA desmontada: lentes, sensor, circuitos e acessórios separados" },
  { src: "/images/camera/parte2-montagem.webp", w: 1672, h: 941, alt: "Câmara VIRALIZA em montagem, com os componentes internos visíveis" },
  { src: "/images/camera/parte3-montada.webp", w: 1536, h: 1024, alt: "Câmara VIRALIZA totalmente montada, vista lateral com logotipo e selo 4K" },
  { src: "/images/camera/parte4-frontal.webp", w: 1536, h: 1024, alt: "Câmara VIRALIZA em vista frontal com a lente principal em destaque" },
];

/** Pontos de interesse em fracção da imagem (x, y). */
const KP = {
  core1: [0.586, 0.44] as Pt,
  core2: [0.6, 0.47] as Pt,
  sensor2: [0.577, 0.478] as Pt,
  logo3: [0.836, 0.54] as Pt,
  badge3: [0.85, 0.7] as Pt,
  lens4: [0.469, 0.596] as Pt,
};

const bump = (u: number) => Math.sin(Math.PI * clamp(u));
const pct = ([x, y]: Pt) => `${x * 100}% ${y * 100}%`;

export function CameraShowcase({ tier, onFirstImage }: { tier: QualityTier; onFirstImage?: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const planes = useRef<Array<HTMLDivElement | null>>([]);
  const sensorGlow = useRef<HTMLDivElement>(null);
  const sweep = useRef<HTMLDivElement>(null);
  const logoGlow = useRef<HTMLDivElement>(null);
  const badgeGlow = useRef<HTMLDivElement>(null);
  const lensGlow = useRef<HTMLDivElement>(null);
  const lensMark = useRef<HTMLDivElement>(null);
  const lensAnchor = useRef<HTMLDivElement>(null);
  const flare = useRef<HTMLDivElement>(null);
  const flash = useRef<HTMLDivElement>(null);
  const textShade = useRef<HTMLDivElement>(null);
  const vignette = useRef<HTMLDivElement>(null);
  const dust = useRef<HTMLCanvasElement>(null);
  const simple = tier === "low";

  SHOTS.forEach((s, i) => preload(s.src, { as: "image", fetchPriority: i === 0 ? "high" : "low" }));

  useEffect(() => {
    const el = root.current;
    const canvas = dust.current;
    if (!el || !canvas) return;
    const ctx = canvas.getContext("2d");
    const mounted = performance.now();
    const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
    let planeW = 1;
    let raf = 0;
    let running = false;
    let last = performance.now();

    // ---- partículas douradas (primeiro plano, parallax mais rápido que as fotografias)
    const N = simple ? 26 : 70;
    const parts = Array.from({ length: N }, (_, i) => {
      const r = (k: number) => {
        const s = Math.sin((i + 1) * 12.9898 + k * 78.233) * 43758.5453;
        return s - Math.floor(s);
      };
      return { x: r(1), y: r(2), z: 0.25 + r(3) * 0.75, size: 0.6 + r(4) * 1.8, sp: 0.15 + r(5) * 0.5, ph: r(6) * 6.28 };
    });
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(el.clientWidth * dpr);
      canvas.height = Math.round(el.clientHeight * dpr);
      planeW = planes.current[0]?.offsetWidth || el.clientWidth;
    };
    resize();
    window.addEventListener("resize", resize);

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const set = (node: HTMLElement | null, o: number, tf?: string) => {
      if (!node) return;
      node.style.opacity = o.toFixed(3);
      if (tf !== undefined) node.style.transform = tf;
    };
    const mask = (node: HTMLElement | null, m: string) => {
      if (!node) return;
      node.style.maskImage = m;
      node.style.webkitMaskImage = m;
    };

    const render = (time: number, dt: number) => {
      const p = heroState.progress;
      const active = p < W.portal[1] + 0.004;
      el.style.visibility = active ? "visible" : "hidden";
      if (!active) return false;

      const t = (time - mounted) / 1000;
      const k = 1 - Math.exp(-dt * 4);
      pointer.sx += (pointer.x - pointer.sx) * k;
      pointer.sy += (pointer.y - pointer.sy) * k;
      const px = pointer.sx * 10;
      const py = pointer.sy * 6;

      const r = (w: readonly [number, number]) => range(p, w[0], w[1]);
      const u12 = r(W.t12);
      const u23 = r(W.t23);
      const u34 = r(W.t34);
      const uPo = r(W.portal);
      const e12 = ease.inOutCubic(u12);
      const e23 = ease.inOutCubic(u23);
      const e34 = ease.inOutCubic(u34);

      // enquanto o texto da fase "Câmara" está no ecrã (desktop), a câmara afasta-se para a direita
      const T = OVERLAY_TIMING.camera;
      const txt = range(p, T.in[0] - 0.02, T.in[1]) * (1 - range(p, T.out[0], T.out[1]));
      const wide = window.innerWidth >= 768;
      const shift = wide ? ease.inOutSine(txt) : 0;
      // no telemóvel o texto fica por cima: a câmara desce um pouco
      const drop = wide ? 0 : 16 * ease.inOutSine(txt);

      const tf = (tx: number, ty: number, s: number, ry = 0, rz = 0) =>
        `translate(-50%, -50%) translate3d(calc(${tx.toFixed(3)}% + ${px.toFixed(2)}px), calc(${ty.toFixed(3)}% + ${py.toFixed(2)}px), 0) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(3)}deg) scale(${s.toFixed(4)})`;

      // ---------- PARTE 1 — desmontada: flutua, aproxima-se, a luz sobe
      {
        const n = planes.current[0];
        const vis = p < W.t12[1];
        if (n) {
          n.style.visibility = vis ? "visible" : "hidden";
          if (vis) {
            const a = ease.inOutSine(range(p, 0, W.t12[0]));
            const light = Math.max(clamp(t / 1.8), ease.outCubic(range(p, 0, 0.04)));
            const s = 1.02 + 0.06 * a + 0.12 * e12;
            const float = Math.sin(t * 0.6) * 0.35 * (1 - e12);
            n.style.transformOrigin = pct(KP.core1);
            set(n, 1, tf(-1.2 * a, float, s));
            n.style.filter = `brightness(${(lerp(0.6, 1, light) + 0.25 * bump(u12)).toFixed(3)})`;
          }
        }
      }

      // ---------- PARTE 2 — montagem: o núcleo monta-se do centro para fora, estabiliza
      {
        const n = planes.current[1];
        const vis = p >= W.t12[0] && p < W.t23[1];
        if (n) {
          n.style.visibility = vis ? "visible" : "hidden";
          if (vis) {
            const hold = ease.inOutSine(r(W.hold2));
            const jitter = (1 - range(p, W.t12[1], W.t12[1] + 0.03)) * e12;
            const s = 1.16 - 0.1 * e12 + 0.05 * hold + 0.04 * e23;
            const tx = Math.sin(p * 2400) * 0.22 * jitter - 3 * e23;
            const ty = Math.cos(p * 1900) * 0.18 * jitter;
            n.style.transformOrigin = pct(KP.core2);
            set(n, 1, tf(tx, ty, s, 0, Math.sin(p * 1500) * 0.25 * jitter));
            n.style.filter = `brightness(${(1 + 0.22 * bump(u23)).toFixed(3)})`;
            {
              if (u12 < 1) {
                const R = lerp(-0.12, 1.25, e12) * planeW;
                mask(n, `radial-gradient(circle at ${pct(KP.core2)}, #000 ${Math.max(0, R).toFixed(1)}px, transparent ${(Math.max(0, R) + planeW * 0.16).toFixed(1)}px)`);
              } else mask(n, "none");
            }
            set(sensorGlow.current, (0.55 + 0.25 * Math.sin(t * 2.2)) * ease.inOutSine(range(p, W.t12[0] + 0.03, W.hold2[0] + 0.02)) * (1 - e23));
          }
        }
      }

      // ---------- PARTE 3 — montada: varrimento de luz, movimento lateral, destaque da marca
      {
        const n = planes.current[2];
        const vis = p >= W.t23[0] && p < W.t34[1];
        if (n) {
          n.style.visibility = vis ? "visible" : "hidden";
          if (vis) {
            const lateral = ease.inOutSine(range(p, W.t23[0], W.hold3[1]));
            const hold = ease.inOutSine(r(W.hold3));
            const s = (1.08 - 0.04 * e23 + 0.06 * hold) * (1 + 0.16 * e34) * (1 - 0.1 * shift);
            const tx = 1.6 - 3.2 * lateral - 22 * e34 + 10 * shift;
            const ry = simple ? 0 : -30 * e34;
            n.style.transformOrigin = "50% 55%";
            // sai só depois de a cortina da vista frontal a ter coberto (sem fantasmas)
            const out = 1 - ease.inOutSine(range(u34, 0.72, 0.86));
            set(n, out, tf(tx, drop, s, ry));
            n.style.filter = `brightness(${(1 + 0.2 * bump(u23) - 0.35 * e34).toFixed(3)})`;
            {
              if (u23 < 1) {
                const w = lerp(-16, 116, e23);
                mask(n, `linear-gradient(100deg, #000 ${(w - 14).toFixed(2)}%, transparent ${w.toFixed(2)}%)`);
              } else mask(n, "none");
            }
            const sw = range(p, W.hold3[0] - 0.012, W.hold3[1]);
            set(sweep.current, bump(sw) * 0.9, `translateX(${lerp(-60, 160, ease.inOutSine(sw)).toFixed(2)}%) skewX(-18deg)`);
            set(logoGlow.current, bump(range(p, W.hold3[0], W.hold3[1] + 0.01)) * 0.85);
            set(badgeGlow.current, bump(range(p, W.hold3[0] + 0.015, W.t34[0] + 0.01)) * 0.8);
          }
        }
      }

      // ---------- PARTE 4 — frontal: rotação simulada, aproximação à lente, marca, portal
      {
        const n = planes.current[3];
        const vis = p >= W.t34[0] && p < W.portal[1] + 0.002;
        if (n) {
          n.style.visibility = vis ? "visible" : "hidden";
          if (vis) {
            const zoom = ease.inOutSine(r(W.hold4));
            const dive = Math.pow(uPo, 1.6);
            const s = (1.15 - 0.1 * e34) * (1 + 0.5 * zoom) * (1 + 3.2 * dive) * (1 - 0.08 * shift);
            const tx = 22 * (1 - e34) + 8 * shift;
            const ry = simple ? 0 : 30 * (1 - e34);
            n.style.transformOrigin = pct(KP.lens4);
            const inn = ease.inOutSine(range(u34, 0.18, 0.3));
            set(n, inn * (1 - ease.inOutSine(range(uPo, 0.55, 1))), tf(tx, drop, s, ry));
            n.style.filter = `brightness(${(0.85 + 0.15 * e34 + 0.15 * zoom).toFixed(3)})`;
            const wipe = ease.inOutCubic(range(u34, 0.25, 0.72));
            if (wipe < 1) {
              // cortina: a vista frontal entra da direita enquanto a lateral roda para fora
              const w = lerp(-16, 116, wipe);
              mask(n, `linear-gradient(-80deg, #000 ${(w - 14).toFixed(2)}%, transparent ${w.toFixed(2)}%)`);
            } else if (uPo > 0) {
              // a lente abre-se: buraco radial a partir do centro da lente
              const R = Math.pow(uPo, 1.25) * planeW * 0.55;
              mask(n, `radial-gradient(circle at ${pct(KP.lens4)}, transparent ${R.toFixed(1)}px, #000 ${(R + planeW * 0.05).toFixed(1)}px)`);
            } else mask(n, "none");
            set(lensGlow.current, clamp(0.25 * e34 + 0.45 * zoom + 0.6 * bump(uPo)));
            const brand = ease.inOutSine(range(p, W.hold4[0] + 0.006, W.hold4[1] - 0.004)) * (1 - ease.inOutSine(range(uPo, 0, 0.45)));
            set(lensMark.current, brand * 0.9, `translate(-50%, -50%) scale(${(0.75 + 0.25 * brand).toFixed(3)})`);
          }
        }
      }

      // ---------- luz global: flash nas transições + flare anamórfico na lente
      set(flash.current, clamp(0.35 * bump(u12) + 0.45 * bump(u23) + 0.6 * bump(range(u34, 0.2, 0.8))));
      const lensRect = lensAnchor.current?.getBoundingClientRect();
      const rootRect = el.getBoundingClientRect();
      const fx = lensRect ? lensRect.left - rootRect.left : rootRect.width / 2;
      const fy = lensRect ? lensRect.top - rootRect.top : rootRect.height / 2;
      const flareO = p >= W.t34[0] ? clamp(0.35 * bump(u34) + 0.55 * ease.inOutSine(r(W.hold4)) * (1 - uPo) + 0.9 * bump(uPo)) : 0;
      set(flare.current, flareO, `translate3d(${fx.toFixed(1)}px, ${fy.toFixed(1)}px, 0) translate(-50%, -50%) scaleX(${(1 + 0.8 * uPo).toFixed(3)})`);

      // legibilidade do texto da fase "Câmara" (lado esquerdo, desktop)
      set(textShade.current, window.innerWidth >= 768 ? txt * 0.9 : 0);
      set(vignette.current, 1 - ease.inOutSine(range(uPo, 0.3, 1)));

      // ---------- partículas
      if (ctx) {
        const cw = canvas.width;
        const ch = canvas.height;
        ctx.clearRect(0, 0, cw, ch);
        const fade = 1 - ease.inOutSine(range(uPo, 0.2, 0.9));
        if (fade > 0.01) {
          ctx.globalCompositeOperation = "lighter";
          for (const q of parts) {
            const yy = (((q.y - t * q.sp * 0.025 * q.z - p * 2.2 * q.z) % 1) + 1) % 1;
            const xx = q.x + Math.sin(t * 0.3 + q.ph) * 0.01 + pointer.sx * 0.02 * q.z;
            const rad = q.size * q.z * (cw / 900) * (1 + 1.5 * sq(uPo) * q.z);
            const a = fade * (0.35 + 0.45 * Math.sin(t * 1.3 + q.ph) ** 2) * q.z;
            const g = ctx.createRadialGradient(xx * cw, yy * ch, 0, xx * cw, yy * ch, rad * 4);
            g.addColorStop(0, `rgba(255,214,110,${a.toFixed(3)})`);
            g.addColorStop(1, "rgba(255,180,40,0)");
            ctx.fillStyle = g;
            ctx.fillRect(xx * cw - rad * 4, yy * ch - rad * 4, rad * 8, rad * 8);
          }
          ctx.globalCompositeOperation = "source-over";
        }
      }
      return true;
    };
    const sq = (u: number) => u * u;

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const keep = render(now, dt) && heroState.visible;
      if (keep) raf = requestAnimationFrame(tick);
      else running = false;
    };
    const start = () => {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };
    start();
    const off = onHeroProgress(() => start());

    return () => {
      cancelAnimationFrame(raf);
      off();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
    };
  }, [simple]);

  const at = ([x, y]: Pt) => ({ left: `${x * 100}%`, top: `${y * 100}%` });

  return (
    <div ref={root} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {SHOTS.map((s, i) => (
        <div
          key={s.src}
          className="shot-wrap absolute inset-0"
          style={{ perspective: "1600px" }}
        >
          <div
            ref={(n) => {
              planes.current[i] = n;
            }}
            className="shot-plane absolute top-1/2 left-1/2 will-change-[transform,opacity]"
            style={{ ["--ratio" as string]: String(s.w / s.h), visibility: i === 0 ? "visible" : "hidden", transform: "translate(-50%, -50%)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.src}
              alt={s.alt}
              width={s.w}
              height={s.h}
              decoding="async"
              fetchPriority={i === 0 ? "high" : "low"}
              loading="eager"
              draggable={false}
              className="block h-full w-full select-none"
              onLoad={i === 0 ? onFirstImage : undefined}
              ref={(img) => {
                // imagem já em cache: o onLoad pode ter disparado antes da hidratação
                if (i === 0 && img?.complete && img.naturalWidth > 0) onFirstImage?.();
              }}
            />
            {i === 1 && <div ref={sensorGlow} className="glow-spot" style={{ ...at(KP.sensor2), width: "18%", opacity: 0, background: "radial-gradient(circle, rgba(140,120,255,.55) 0%, rgba(255,204,0,.25) 35%, transparent 70%)" }} />}
            {i === 2 && (
              <>
                <div className="absolute inset-0 overflow-hidden mix-blend-screen">
                  <div ref={sweep} className="absolute inset-y-[-10%] left-0 w-[22%] opacity-0" style={{ background: "linear-gradient(90deg, transparent, rgba(255,214,120,.0) 15%, rgba(255,214,120,.55) 50%, rgba(255,214,120,0) 85%, transparent)" }} />
                </div>
                <div ref={logoGlow} className="glow-spot" style={{ ...at(KP.logo3), width: "34%", opacity: 0 }} />
                <div ref={badgeGlow} className="glow-spot" style={{ ...at(KP.badge3), width: "16%", opacity: 0 }} />
              </>
            )}
            {i === 3 && (
              <>
                <div ref={lensGlow} className="glow-spot" style={{ ...at(KP.lens4), width: "46%", opacity: 0, background: "radial-gradient(circle, rgba(255,214,110,.35) 0%, rgba(255,170,30,.18) 30%, transparent 65%)" }} />
                <div ref={lensMark} className="absolute w-[9%] mix-blend-screen" style={{ ...at(KP.lens4), opacity: 0, transform: "translate(-50%, -50%)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/brand/viraliza-mark.png" alt="" className="h-auto w-full drop-shadow-[0_0_18px_rgba(255,204,0,.9)]" />
                </div>
                <div ref={lensAnchor} className="absolute h-px w-px" style={at(KP.lens4)} />
              </>
            )}
          </div>
        </div>
      ))}

      {/* luz global */}
      <div ref={flash} className="absolute inset-0 opacity-0 mix-blend-screen" style={{ background: "radial-gradient(ellipse 55% 45% at 55% 50%, rgba(255,210,110,.55), rgba(255,170,40,.15) 45%, transparent 70%)" }} />
      <div ref={flare} className="absolute top-0 left-0 h-[46vmin] w-[150vmin] opacity-0 mix-blend-screen" style={{ background: "radial-gradient(ellipse 50% 3.2% at 50% 50%, rgba(255,240,200,.95), rgba(255,200,80,.35) 40%, transparent 70%), radial-gradient(circle at 50% 50%, rgba(255,220,140,.55) 0%, rgba(255,170,40,.18) 14%, transparent 30%)" }} />
      <div ref={vignette} className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 75% at 55% 50%, transparent 55%, rgba(8,8,8,.7) 100%)" }} />
      <div ref={textShade} className="absolute inset-y-0 left-0 w-[60%] opacity-0" style={{ background: "linear-gradient(90deg, rgba(8,8,8,.82) 0%, rgba(8,8,8,.55) 45%, transparent 100%)" }} />
      <canvas ref={dust} data-dust className="absolute inset-0 h-full w-full" />
    </div>
  );
}
