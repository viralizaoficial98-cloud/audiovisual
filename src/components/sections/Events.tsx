"use client";

import Image from "next/image";
import { eventDeliverables } from "@/content/services";
import { openQuote } from "@/components/forms/quoteBus";
import { IconArrow } from "@/components/ui/Icons";
import { Reveal } from "@/components/ui/Reveal";

export function Events() {
  return (
    <section id="eventos" aria-labelledby="eventos-title" className="relative isolate overflow-hidden px-5 py-28 md:px-10 md:py-40">
      <Image src="/images/camera-frontal.webp" alt="" fill sizes="100vw" className="-z-20 object-cover opacity-40" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/90 to-ink/40" aria-hidden />
      <div className="absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-ink to-transparent" aria-hidden />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-ink to-transparent" aria-hidden />

      <div className="mx-auto grid max-w-[1400px] gap-14 lg:grid-cols-2 lg:items-center">
        <Reveal>
          <p className="eyebrow mb-5">
            <span className="h-px w-8 bg-brand" aria-hidden />
            Cobertura de eventos corporativos
          </p>
          <h2 id="eventos-title" className="section-title">
            O SEU EVENTO MERECE <span className="text-brand">SER ETERNIZADO.</span>
          </h2>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-white/70 md:text-lg">
            Conferências, lançamentos, cerimónias e encontros empresariais registados com equipa dedicada, captação multicâmara e entrega pronta para a sua comunicação institucional.
          </p>
          <button type="button" onClick={() => openQuote("evento")} className="btn-primary mt-10">
            Solicitar proposta comercial <IconArrow />
          </button>
        </Reveal>
        <ul className="grid grid-cols-2 gap-3 sm:gap-4">
          {eventDeliverables.map((d, i) => (
            <Reveal as="li" key={d} delay={i * 60}>
              <div className="group flex h-full min-h-28 flex-col justify-between rounded-2xl border border-white/10 bg-ink/50 p-5 backdrop-blur-md transition-colors duration-500 hover:border-brand/50">
                <span className="font-display text-xs text-brand/80">{String(i + 1).padStart(2, "0")}</span>
                <span className="mt-4 text-[15px] leading-snug font-medium text-white/90 md:text-base">{d}</span>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
