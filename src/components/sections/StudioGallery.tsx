"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { gallery } from "@/content/studio";
import { IconClose } from "@/components/ui/Icons";
import { Reveal, SectionHeading } from "@/components/ui/Reveal";
import { cn } from "@/lib/cn";

/** Galeria imersiva do estúdio com visualizador em ecrã inteiro. */
export function StudioGallery() {
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i === null ? i : (i + 1) % gallery.length));
      if (e.key === "ArrowLeft") setOpen((i) => (i === null ? i : (i - 1 + gallery.length) % gallery.length));
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <section id="estudio" aria-labelledby="estudio-title" className="px-5 py-24 md:px-10 md:py-36">
      <div className="mx-auto max-w-[1400px]">
        <SectionHeading
          eyebrow="Nosso estúdio"
          title={
            <span id="estudio-title">
              UM ESPAÇO PENSADO PARA <span className="text-brand">PRODUZIR.</span>
            </span>
          }
          intro="Sala de podcast, equipamento de filmagem, iluminação profissional, área de gravação, recepção e mesa de produção — com a identidade visual VIRALIZA em cada detalhe."
        />
        <ul className="grid auto-rows-[220px] grid-cols-1 gap-4 sm:grid-cols-2 md:auto-rows-[280px] lg:grid-cols-4">
          {gallery.map((g, i) => (
            <Reveal as="li" key={g.src} delay={(i % 4) * 80} className={cn(g.wide && "sm:col-span-2", i === 0 && "lg:row-span-2")}>
              <button type="button" onClick={() => setOpen(i)} className="group relative block h-full w-full overflow-hidden rounded-3xl border border-white/8 text-left" aria-label={`Ampliar: ${g.title}`}>
                <Image src={g.src} alt={`${g.title} — ${g.caption}`} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
                  <p className="font-display text-lg font-semibold md:text-xl">{g.title}</p>
                  <p className="mt-1 text-xs text-white/60 md:text-sm">{g.caption}</p>
                </div>
                {g.kind === "conceito" && (
                  <span className="absolute top-4 right-4 rounded-full bg-ink/70 px-2.5 py-1 text-[9px] font-semibold tracking-[0.2em] text-white/75 uppercase backdrop-blur">Conceito</span>
                )}
              </button>
            </Reveal>
          ))}
        </ul>
        <p className="mt-6 text-xs text-white/40">
          As imagens apresentadas são visualizações conceptuais do estúdio e dos equipamentos. Fotografias das instalações serão publicadas assim que disponíveis.
        </p>
      </div>

      {open !== null && (
        <div role="dialog" aria-modal="true" aria-label={gallery[open].title} className="fixed inset-0 z-[70] flex flex-col bg-ink/95 backdrop-blur-xl" onClick={() => setOpen(null)}>
          <div className="flex items-center justify-between p-5">
            <p className="text-sm text-white/70">
              {open + 1} / {gallery.length} · {gallery[open].title}
            </p>
            <button type="button" autoFocus className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15" aria-label="Fechar galeria" onClick={() => setOpen(null)}>
              <IconClose />
            </button>
          </div>
          <div className="relative flex-1" onClick={(e) => e.stopPropagation()}>
            <Image src={gallery[open].src} alt={gallery[open].caption} fill sizes="100vw" className="object-contain p-4" />
          </div>
          <div className="flex justify-center gap-3 p-5" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="btn-ghost" onClick={() => setOpen((open - 1 + gallery.length) % gallery.length)}>
              Anterior
            </button>
            <button type="button" className="btn-ghost" onClick={() => setOpen((open + 1) % gallery.length)}>
              Seguinte
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
