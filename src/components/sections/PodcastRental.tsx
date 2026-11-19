import Image from "next/image";
import { site } from "@/config/site";
import { formatKz } from "@/lib/format";
import { BookingForm } from "@/components/forms/BookingForm";
import { Reveal, SectionHeading } from "@/components/ui/Reveal";

export function PodcastRental() {
  return (
    <section id="reserva" aria-labelledby="reserva-title" className="relative overflow-hidden bg-ink-2 px-5 py-24 md:px-10 md:py-36">
      <div className="pointer-events-none absolute top-0 left-1/2 h-[40rem] w-[60rem] -translate-x-1/2 rounded-full bg-brand/[0.07] blur-[120px]" aria-hidden />
      <div className="relative mx-auto max-w-[1400px]">
        <SectionHeading
          eyebrow="Aluguer de sala de podcast · Luanda"
          title={
            <span id="reserva-title">
              O SEU PODCAST MERECE UM <span className="text-brand">ESTÚDIO PROFISSIONAL.</span>
            </span>
          }
        />
        <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
          <div>
            <Reveal className="relative overflow-hidden rounded-3xl border border-white/10">
              <Image src="/images/estudio-podcast.webp" alt="Sala de podcast VIRALIZA com duas cadeiras, microfones, câmaras e iluminação (visualização conceptual)" width={1600} height={900} sizes="(min-width: 1024px) 50vw, 100vw" className="h-auto w-full" />
              <span className="absolute top-4 left-4 rounded-full bg-ink/70 px-3 py-1 text-[10px] font-semibold tracking-[0.2em] text-white/80 uppercase backdrop-blur">Visualização conceptual</span>
            </Reveal>
            <Reveal delay={100} className="mt-8">
              <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
                <p className="text-[11px] font-semibold tracking-[0.24em] text-white/55 uppercase">A partir de</p>
              </div>
              <p className="font-display text-5xl font-extrabold tracking-tight text-brand md:text-7xl">
                {formatKz(site.podcast.hourlyRate)}
                <span className="ml-2 align-middle text-xl font-semibold text-white/70 md:text-2xl">/ 1 hora</span>
              </p>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-white/70 md:text-lg">
                Grave o seu podcast num ambiente profissional, preparado para entrevistas, conversas, programas e criação de conteúdos audiovisuais.
              </p>
              <p className="mt-4 max-w-xl text-sm text-white/45">
                O valor de {formatKz(site.podcast.hourlyRate)} é o preço inicial de referência por hora. Condições e disponibilidade são confirmadas pela equipa após o pedido.
              </p>
              <div className="mt-8 grid max-w-xl grid-cols-3 gap-3 text-center">
                {[1, 2, 3].map((h) => (
                  <div key={h} className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-4">
                    <p className="text-xs text-white/50">
                      {h} {h === 1 ? "hora" : "horas"}
                    </p>
                    <p className="mt-1 font-display text-lg font-semibold">{formatKz(h * site.podcast.hourlyRate)}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
          <Reveal delay={150}>
            <BookingForm />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
