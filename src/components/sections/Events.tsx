"use client";

import Image from "next/image";
import { eventDeliverables } from "@/content/services";
import { openQuote } from "@/components/forms/quoteBus";
import { IconArrow } from "@/components/ui/Icons";
import { Reveal } from "@/components/ui/Reveal";

export function Events() {
  return (
    <section id="eventos" aria-labelledby="eventos-title" className="relative isolate overflow-hidden px-5 py-28 md:px-10 md:py-40">
      <Image src="/images/camera/parte4-frontal.webp" alt="" fill sizes="100vw" className="-z-20 object-cover opacity-60 grayscale" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#d6d9de] via-[#d6d9de]/92 to-[#d6d9de]/35" aria-hidden />
      <div className="absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-[#d3d6db] to-transparent" aria-hidden />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-[#d6d9de] to-transparent" aria-hidden />

      <div className="mx-auto grid max-w-[1400px] gap-14 lg:grid-cols-2 lg:items-center">
        <Reveal>
          <p className="eyebrow mb-5">
            <span className="h-px w-8 bg-brand" aria-hidden />
            Cobertura de eventos corporativos
          </p>
          <h2 id="eventos-title" className="section-title">
            O SEU EVENTO MERECE <span className="mark-gold">SER ETERNIZADO.</span>
          </h2>
          <p className="mt-6 max-w-xl text-base text-soft leading-relaxed md:text-lg">
            Conferências, lançamentos, cerimónias e encontros empresariais registados com equipa dedicada, captação multicâmara e entrega pronta para a sua comunicação institucional.
          </p>
          <button type="button" onClick={() => openQuote("evento")} className="btn-primary mt-10">
            Solicitar proposta comercial <IconArrow />
          </button>
        </Reveal>
        <ul className="grid grid-cols-2 gap-3 sm:gap-4">
          {eventDeliverables.map((d, i) => (
            <Reveal as="li" key={d} delay={i * 60}>
              <div className="group flex h-full min-h-28 flex-col justify-between rounded-2xl border border-[#252525]/10 bg-white/75 p-5 shadow-[0_18px_40px_-28px_rgba(37,37,37,.55)] backdrop-blur-md transition-colors duration-500 hover:border-[#c79c00]">
                <span className="font-display text-xs text-gold-deep">{String(i + 1).padStart(2, "0")}</span>
                <span className="mt-4 text-[15px] leading-snug font-medium md:text-base">{d}</span>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
