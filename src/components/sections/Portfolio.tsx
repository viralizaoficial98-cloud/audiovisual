"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { portfolioCategories, projects, type PortfolioCategory, type Project } from "@/content/portfolio";
import { openQuote } from "@/components/forms/quoteBus";
import { IconClose, IconPlay } from "@/components/ui/Icons";
import { SectionHeading } from "@/components/ui/Reveal";
import { cn } from "@/lib/cn";

/**
 * Portfólio com filtros, thumbnails e leitor de vídeo. Os projectos vêm de
 * src/content/portfolio.ts — enquanto a lista estiver vazia, mostra um estado
 * honesto ("em breve") em vez de projectos fictícios.
 */
export function Portfolio() {
  const [filter, setFilter] = useState<PortfolioCategory | "todos">("todos");
  const [playing, setPlaying] = useState<Project | null>(null);
  const list = useMemo(() => (filter === "todos" ? projects : projects.filter((p) => p.category === filter)), [filter]);
  const label = (id: PortfolioCategory) => portfolioCategories.find((c) => c.id === id)?.label ?? id;

  return (
    <section id="portfolio" aria-labelledby="portfolio-title" className="bg-ink-2 px-5 py-24 md:px-10 md:py-36">
      <div className="mx-auto max-w-[1400px]">
        <SectionHeading eyebrow="Portfólio" title={<span id="portfolio-title">PROJECTOS QUE <span className="text-brand">FALAM POR SI.</span></span>} />

        <div role="tablist" aria-label="Filtrar por categoria" className="-mx-5 mb-10 flex gap-2 overflow-x-auto px-5 pb-2 md:mx-0 md:flex-wrap md:px-0">
          {[{ id: "todos" as const, label: "Todos" }, ...portfolioCategories].map((c) => (
            <button
              key={c.id}
              role="tab"
              aria-selected={filter === c.id}
              onClick={() => setFilter(c.id)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-[12px] font-semibold tracking-[0.1em] uppercase transition",
                filter === c.id ? "border-brand bg-brand text-ink" : "border-white/12 text-white/65 hover:border-white/40 hover:text-white",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        {list.length > 0 ? (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((p) => (
              <li key={p.id}>
                <article className="card group overflow-hidden">
                  <button type="button" className="relative block aspect-video w-full overflow-hidden" onClick={() => p.video && setPlaying(p)} aria-label={p.video ? `Ver vídeo: ${p.title}` : p.title} disabled={!p.video}>
                    <Image src={p.thumbnail} alt={p.title} fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                    {p.video && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-ink shadow-lg">
                          <IconPlay />
                        </span>
                      </span>
                    )}
                  </button>
                  <div className="p-6">
                    <p className="text-[11px] font-semibold tracking-[0.2em] text-brand uppercase">
                      {label(p.category)}
                      {p.year ? ` · ${p.year}` : ""}
                    </p>
                    <h3 className="mt-2 font-display text-xl font-semibold">{p.title}</h3>
                    {p.client && <p className="mt-1 text-sm text-white/50">{p.client}</p>}
                    <p className="mt-3 text-sm leading-relaxed text-white/65">{p.description}</p>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className={cn("card relative aspect-[4/3] overflow-hidden", i > 0 && "hidden sm:block", i > 1 && "sm:hidden lg:block")} aria-hidden>
                <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_30%,rgba(255,204,0,.06)_50%,transparent_70%)]" />
                <div className="absolute bottom-6 left-6 space-y-2">
                  <div className="h-2 w-20 rounded bg-brand/30" />
                  <div className="h-3 w-40 rounded bg-white/10" />
                  <div className="h-3 w-28 rounded bg-white/10" />
                </div>
                <span className="absolute top-1/2 left-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 text-white/30">
                  <IconPlay />
                </span>
              </div>
            ))}
            <div className="flex flex-col items-start justify-center gap-4 sm:col-span-2 lg:col-span-3" role="status">
              <p className="text-lg text-white/80">
                {filter === "todos" ? "Os nossos projectos estão a ser preparados para publicação." : `Em breve: projectos de ${label(filter as PortfolioCategory)}.`}
              </p>
              <p className="text-sm text-white/50">Quer ver exemplos do nosso trabalho? Pedimos-lhe apenas o contexto do seu projecto.</p>
              <button type="button" className="btn-ghost" onClick={() => openQuote("geral")}>
                Pedir exemplos e orçamento
              </button>
            </div>
          </div>
        )}
      </div>

      {playing?.video && (
        <div role="dialog" aria-modal="true" aria-label={playing.title} className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/95 p-4" onClick={() => setPlaying(null)}>
          <button type="button" autoFocus className="absolute top-5 right-5 flex h-11 w-11 items-center justify-center rounded-full border border-white/15" aria-label="Fechar vídeo" onClick={() => setPlaying(null)}>
            <IconClose />
          </button>
          <div className="aspect-video w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <iframe src={playing.video} title={playing.title} className="h-full w-full rounded-2xl" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
          </div>
        </div>
      )}
    </section>
  );
}
