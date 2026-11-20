import Image from "next/image";
import { site } from "@/config/site";
import { formatKz } from "@/lib/format";
import { BookingForm } from "@/components/forms/BookingForm";
import { Reveal, SectionHeading } from "@/components/ui/Reveal";
import { PricingTable } from "./PricingTable";

export function PodcastRental() {
  return (
    <section id="reserva" aria-labelledby="reserva-title" className="silver-band relative overflow-hidden px-5 py-24 md:px-10 md:py-32">
      <div className="relative mx-auto max-w-[1400px]">
        <SectionHeading
          eyebrow="Aluguer de sala de podcast · Luanda"
          title={
            <span id="reserva-title">
              O SEU PODCAST MERECE UM <span className="mark-gold">ESTÚDIO PROFISSIONAL.</span>
            </span>
          }
        />

        <div className="mb-16 grid items-center gap-10 lg:mb-24 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
          <Reveal className="photo-frame relative overflow-hidden rounded-3xl">
            <Image src="/images/estudio-podcast.webp" alt="Sala de podcast VIRALIZA com duas cadeiras, microfones, câmaras e iluminação (visualização conceptual)" width={1672} height={941} sizes="(min-width: 1024px) 55vw, 100vw" className="h-auto w-full" />
            <span className="absolute top-4 left-4 rounded-full bg-ink/70 px-3 py-1 text-[10px] font-semibold tracking-[0.2em] text-white/85 uppercase backdrop-blur">Visualização conceptual</span>
          </Reveal>
          <Reveal delay={100}>
            <p className="text-[11px] font-semibold tracking-[0.24em] uppercase opacity-70">A partir de</p>
            <p className="font-display text-5xl font-extrabold tracking-tight md:text-7xl">
              {formatKz(site.podcast.hourlyRate)}
              <span className="ml-2 align-middle text-xl font-semibold opacity-70 md:text-2xl">/ 1 hora</span>
            </p>
            <p className="text-muted mt-5 max-w-xl text-base leading-relaxed md:text-lg">
              Grave o seu podcast num ambiente profissional, preparado para entrevistas, conversas, programas e criação de conteúdos audiovisuais.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#precos" className="btn-primary">
                Ver preços e pacotes
              </a>
              <a href="#pre-reserva" className="btn-ghost">
                Pré-reserva
              </a>
            </div>
          </Reveal>
        </div>

        <PricingTable />

        <div className="mx-auto mt-16 max-w-4xl md:mt-24">
          <Reveal>
            <BookingForm />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
