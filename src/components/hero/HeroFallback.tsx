"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { onHeroProgress } from "@/animation/heroState";
import { range } from "@/animation/math";
import { site } from "@/config/site";
import { formatKz } from "@/lib/format";
import { openQuote } from "@/components/forms/quoteBus";

/**
 * FALLBACK sem WebGL: sequência de renders conceptuais sincronizada com o scroll.
 * É assumidamente uma alternativa 2D (transições entre imagens) — a montagem 3D
 * real só existe no modo WebGL.
 */
const FRAMES = [
  // Sem WebGL não há montagem 3D: mostra-se a câmara oficial (uma única imagem, sem slides)
  { src: "/images/camera/parte3-montada.webp", at: [0, 0.42] },
  { src: "/images/iluminacao/parte1-desmontada.webp", at: [0.4, 0.48] },
  { src: "/images/iluminacao/parte2-montada.webp", at: [0.47, 0.58] },
  { src: "/images/estudio-kit.webp", at: [0.55, 0.66] },
  { src: "/images/estudio-montagem.webp", at: [0.63, 0.76] },
  { src: "/images/estudio-podcast.webp", at: [0.72, 0.88] },
  { src: "/images/estudio-completo.webp", at: [0.84, 1.01] },
] as const;

export function ImageSequenceFallback() {
  const refs = useRef<Array<HTMLDivElement | null>>([]);
  useEffect(
    () =>
      onHeroProgress((p) => {
        FRAMES.forEach((f, i) => {
          const el = refs.current[i];
          if (!el) return;
          const fadeIn = i === 0 ? 1 : range(p, f.at[0], f.at[0] + 0.05);
          const fadeOut = i === FRAMES.length - 1 ? 1 : 1 - range(p, f.at[1] - 0.04, f.at[1]);
          el.style.opacity = String(Math.min(fadeIn, fadeOut));
          el.style.transform = `scale(${1.04 + (p - f.at[0]) * 0.12})`;
        });
      }),
    [],
  );
  return (
    <div className="absolute inset-0">
      {FRAMES.map((f, i) => (
        <div
          key={f.src}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className="absolute inset-0 will-change-[opacity,transform]"
          style={{ opacity: i === 0 ? 1 : 0 }}
        >
          <Image src={f.src} alt="" fill priority={i < 2} sizes="100vw" className="object-cover" />
        </div>
      ))}
      <div className="absolute inset-0 bg-ink/35" />
    </div>
  );
}

/** Versão estática para quem prefere movimento reduzido (prefers-reduced-motion). */
export function StaticHero() {
  return (
    <section id="inicio" className="relative flex min-h-[100svh] items-end overflow-hidden bg-ink">
      <Image src="/images/estudio-completo.webp" alt="Visualização conceptual do estúdio de podcast VIRALIZA totalmente montado" fill priority sizes="100vw" className="object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/10" />
      <div className="relative z-10 w-full px-5 pt-40 pb-20 text-center text-white md:pb-28">
        <p className="mb-4 text-[11px] font-semibold tracking-[0.36em] text-brand uppercase">Luanda · Angola</p>
        <h1 id="hero-title" className="font-display text-[2.5rem] leading-[0.95] font-extrabold tracking-tight sm:text-6xl md:text-[5.5rem]">
          VIRALIZA
          <br />
          <span className="text-brand">AUDIOVISUAL &amp; PODCAST</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-white/80 md:text-xl">Transformamos momentos em experiências memoráveis.</p>
        <div className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <a href="#reserva" className="btn-primary">
            Reservar sala de podcast
          </a>
          <button type="button" onClick={() => openQuote("evento")} className="btn-ghost">
            Solicitar cobertura de evento
          </button>
        </div>
        <p className="mt-4 text-xs text-white/60">
          Sala de podcast a partir de <strong className="text-white">{formatKz(site.podcast.hourlyRate)}</strong> / hora · Imagem: visualização conceptual
        </p>
      </div>
    </section>
  );
}
