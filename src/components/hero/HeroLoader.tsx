"use client";

import { useEffect, useState } from "react";

/**
 * Indicador DISCRETO de carregamento da cena 3D. Não bloqueia nada: a imagem inicial
 * (HeroPoster), os textos, o menu e o scroll já funcionam enquanto o motor 3D carrega
 * em segundo plano. Desaparece quando o primeiro frame 3D real foi desenhado — não há
 * temporizador a escondê-lo antes disso.
 */
export function HeroLoader({ done }: { done: boolean }) {
  const [gone, setGone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setGone(true), 700);
    return () => clearTimeout(t);
  }, [done]);
  if (gone) return null;
  return (
    <div
      className={`pointer-events-none absolute top-[4.75rem] left-5 z-20 flex items-center gap-2.5 rounded-full border border-white/10 bg-ink/45 px-3.5 py-2 backdrop-blur-md transition-opacity duration-500 md:top-24 md:left-12 ${done ? "opacity-0" : "opacity-100"}`}
      role="status"
      data-hero-loader
      aria-live="polite"
    >
      <span className="relative flex h-2 w-2" aria-hidden>
        <span className="animate-pulse-soft absolute inset-0 rounded-full bg-brand" />
      </span>
      <span className="text-[10px] font-semibold tracking-[0.28em] text-white/70 uppercase">{done ? "Estúdio 3D pronto" : "A preparar o estúdio 3D"}</span>
    </div>
  );
}

/**
 * Primeiro ecrã imediato: um render da PRÓPRIA cena 3D no início da animação (p = 0),
 * em AVIF/WebP leve, servido no HTML. A cena WebGL desenha-se por baixo e, quando o
 * primeiro frame real está pronto, a imagem desvanece — sem flash preto nem salto de layout.
 */
export function HeroPoster({ hidden }: { hidden: boolean }) {
  const [gone, setGone] = useState(false);
  useEffect(() => {
    if (!hidden) return;
    const t = setTimeout(() => setGone(true), 900);
    return () => clearTimeout(t);
  }, [hidden]);
  if (gone) return null;
  return (
    <picture className={`pointer-events-none absolute inset-0 transition-opacity duration-700 ease-out ${hidden ? "opacity-0" : "opacity-100"}`} data-hero-poster aria-hidden>
      <source media="(max-aspect-ratio: 1/1)" type="image/avif" srcSet="/hero/poster-mobile-860.avif" />
      <source media="(max-aspect-ratio: 1/1)" type="image/webp" srcSet="/hero/poster-mobile-860.webp" />
      <source type="image/avif" srcSet="/hero/poster-desktop-1280.avif 1280w, /hero/poster-desktop-1920.avif 1920w" sizes="100vw" />
      <source type="image/webp" srcSet="/hero/poster-desktop-1280.webp 1280w, /hero/poster-desktop-1920.webp 1920w" sizes="100vw" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/hero/poster-desktop-1280.webp" alt="" width={1920} height={1080} fetchPriority="high" decoding="async" className="h-full w-full object-cover" />
    </picture>
  );
}
