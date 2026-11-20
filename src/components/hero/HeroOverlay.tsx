"use client";

import { useEffect, useRef } from "react";
import { CHAPTERS, PHASES } from "@/animation/phases";
import { onHeroProgress } from "@/animation/heroState";
import { site } from "@/config/site";
import { formatKz } from "@/lib/format";
import { openQuote } from "@/components/forms/quoteBus";

/** Divide o texto em palavras mascaradas para a animação de entrada/saída. */
function Words({ text }: { text: string }) {
  const parts = text.split(" ");
  return (
    <>
      {parts.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <span data-word className="inline-block will-change-transform">
            {w}
            {i < parts.length - 1 ? " " : ""}
          </span>
        </span>
      ))}
    </>
  );
}

function Eyebrow({ n, label }: { n: string; label: string }) {
  return (
    <p data-fade className="mb-4 flex items-center gap-3 text-[11px] font-semibold tracking-[0.32em] text-brand uppercase">
      <span className="h-px w-8 bg-brand" aria-hidden />
      {n} — {label}
    </p>
  );
}

export function HeroOverlay({ onSkip }: { onSkip: () => void }) {
  const barRef = useRef<HTMLDivElement>(null);
  const mobileBar = useRef<HTMLDivElement>(null);
  const chapterRefs = useRef<Array<HTMLLIElement | null>>([]);
  const skipRef = useRef<HTMLButtonElement>(null);

  // indicador de capítulos e botão "saltar" — actualizados sem re-render
  useEffect(() => {
    const keys = CHAPTERS.map((c) => PHASES[c.key]);
    return onHeroProgress((p) => {
      if (barRef.current) barRef.current.style.transform = `scaleY(${p})`;
      if (mobileBar.current) mobileBar.current.style.transform = `scaleX(${p})`;
      keys.forEach((k, i) => {
        const el = chapterRefs.current[i];
        if (!el) return;
        const on = p >= k.start - 0.001 && (p < k.end || (i === keys.length - 1 && p >= k.start));
        el.dataset.active = on ? "true" : "false";
        el.dataset.done = p >= k.end ? "true" : "false";
      });
      const sk = skipRef.current;
      if (sk) {
        const hide = p > 0.965;
        sk.style.opacity = hide ? "0" : "1";
        sk.style.pointerEvents = hide ? "none" : "auto";
        sk.tabIndex = hide ? -1 : 0;
      }
    });
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 text-white">
      {/* gradientes para legibilidade sem tapar a cena */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-ink/80 to-transparent" aria-hidden />
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-ink/85 to-transparent" aria-hidden />
      <div data-reveal-shade className="invisible absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-ink/92 via-ink/55 to-transparent" aria-hidden />

      <h1 className="sr-only">VIRALIZA Audiovisual &amp; Podcast — estúdio de podcast e produção audiovisual em Luanda, Angola</h1>

      {/* FASE 1 */}
      <div data-phase="intro" className="absolute bottom-28 left-5 max-w-xl md:bottom-20 md:left-12">
        <p data-fade className="mb-3 text-[11px] font-semibold tracking-[0.32em] text-white/60 uppercase">
          Viraliza · Audiovisual &amp; Podcast
        </p>
        <p className="font-display text-2xl leading-[1.08] font-semibold tracking-tight md:text-[2.6rem]">
          <Words text="CADA GRANDE PRODUÇÃO" /> <br />
          <span className="text-brand">
            <Words text="COMEÇA COM UMA VISÃO." />
          </span>
        </p>
      </div>

      {/* indicador de scroll */}
      <div data-scroll-hint className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 md:bottom-10 md:left-auto md:right-14 md:translate-x-0">
        <ScrollBadge />
      </div>

      {/* FASE 2 */}
      <div data-phase="camera" className="invisible absolute top-[18%] left-5 max-w-[34rem] md:top-1/2 md:left-12 md:-translate-y-1/2">
        <Eyebrow n="01" label="Câmara" />
        <h2 className="font-display text-[2rem] leading-[1.02] font-bold tracking-tight md:text-6xl">
          <Words text="TECNOLOGIA QUE" /> <span className="text-brand"><Words text="TRANSFORMA IDEIAS" /></span> <Words text="EM IMAGENS." />
        </h2>
        <p data-fade className="mt-5 max-w-sm text-sm leading-relaxed text-white/70 md:text-base">
          Equipamento profissional de captação em 4K, montado e operado pela nossa equipa.
        </p>
      </div>

      {/* FASE 3 */}
      <div data-phase="lights" className="invisible absolute top-[16%] right-5 max-w-[32rem] text-right md:top-[22%] md:right-28">
        <div className="flex justify-end">
          <Eyebrow n="02" label="Iluminação" />
        </div>
        <h2 className="font-display text-[2rem] leading-[1.02] font-bold tracking-tight md:text-6xl">
          <Words text="A LUZ CERTA" /> <span className="text-brand"><Words text="TRANSFORMA" /></span> <Words text="CADA HISTÓRIA." />
        </h2>
      </div>

      {/* FASE 4 */}
      <div data-phase="studio" className="invisible absolute top-[14%] left-5 max-w-[38rem] md:top-[16%] md:left-12">
        <Eyebrow n="03" label="Estúdio" />
        <h2 className="font-display text-[1.9rem] leading-[1.02] font-bold tracking-tight md:text-[3.4rem]">
          <Words text="UM ESPAÇO PREPARADO PARA" /> <span className="text-brand"><Words text="DAR VOZ ÀS SUAS IDEIAS." /></span>
        </h2>
      </div>

      {/* FASE 5 — revelação */}
      <div data-phase="reveal" className="invisible absolute inset-x-0 bottom-[7%] flex flex-col items-center px-5 text-center md:bottom-[6%]">
        <p data-fade className="mb-4 text-[11px] font-semibold tracking-[0.36em] text-brand uppercase">
          Luanda · Angola
        </p>
        <h2 id="hero-title" tabIndex={-1} className="font-display text-[1.85rem] leading-[0.98] font-extrabold tracking-tight outline-none sm:text-5xl md:text-[2.9rem]">
          <Words text="VIRALIZA" />
          <br className="md:hidden" /> <span className="text-brand">
            <Words text="AUDIOVISUAL & PODCAST" />
          </span>
        </h2>
        <p data-fade className="mt-3 max-w-xl text-base text-white/80 md:text-lg">
          Transformamos momentos em experiências memoráveis.
        </p>
        <div className="pointer-events-auto mt-6 flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <a data-reveal-cta href="#reserva" className="btn-primary invisible">
            Reservar sala de podcast
          </a>
          <button data-reveal-cta type="button" onClick={() => openQuote("evento")} className="btn-ghost invisible">
            Solicitar cobertura de evento
          </button>
        </div>
        <p data-reveal-cta className="invisible mt-4 text-xs tracking-wide text-white/60">
          Sala de podcast a partir de <strong className="text-white">{formatKz(site.podcast.hourlyRate)}</strong> / hora
        </p>
      </div>

      {/* capítulos (desktop) */}
      <nav aria-label="Progresso da introdução" className="absolute top-1/2 right-6 hidden -translate-y-1/2 items-stretch gap-4 lg:flex">
        <ol className="flex flex-col justify-between gap-5 text-right text-[10px] font-semibold tracking-[0.28em] uppercase">
          {CHAPTERS.map((c, i) => (
            <li
              key={c.key}
              ref={(el) => {
                chapterRefs.current[i] = el;
              }}
              data-active={i === 0 ? "true" : "false"}
              className="text-white/35 transition-colors duration-500 data-[active=true]:text-brand data-[done=true]:text-white/70"
            >
              {c.label}
            </li>
          ))}
        </ol>
        <div className="relative w-px bg-white/15">
          <div ref={barRef} className="absolute inset-0 origin-top scale-y-0 bg-brand" />
        </div>
      </nav>
      <div className="absolute inset-x-0 top-0 h-[2px] bg-white/10 lg:hidden" aria-hidden>
        <div ref={mobileBar} className="h-full origin-left scale-x-0 bg-brand" />
      </div>

      {/* saltar introdução */}
      <button
        ref={skipRef}
        type="button"
        onClick={onSkip}
        className="pointer-events-auto absolute top-[4.75rem] right-5 flex items-center gap-2 rounded-full border border-white/15 bg-ink/40 px-4 py-2 text-[11px] font-semibold tracking-[0.22em] text-white/75 uppercase backdrop-blur-md transition-[opacity,color,border-color] duration-300 hover:border-brand hover:text-brand md:top-24 md:right-12"
      >
        Saltar introdução
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
          <path d="M6 1v9M2 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </button>
    </div>
  );
}

/** Selo circular rotativo "DESLIZE PARA DESCOBRIR". */
function ScrollBadge() {
  return (
    <div className="relative h-24 w-24 md:h-28 md:w-28">
      <svg viewBox="0 0 120 120" className="animate-spin-slow absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <path id="circlePath" d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0" />
        </defs>
        <text fill="currentColor" className="text-white/80" style={{ fontSize: 10.5, letterSpacing: "0.32em", fontWeight: 600 }}>
          <textPath href="#circlePath">DESLIZE PARA DESCOBRIR • DESLIZE PARA DESCOBRIR •</textPath>
        </text>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-11 w-7 justify-center rounded-full border border-brand/80 pt-2">
          <span className="animate-scroll-dot h-2 w-1 rounded-full bg-brand" />
        </span>
      </div>
      <span className="sr-only">Deslize para descobrir</span>
    </div>
  );
}
