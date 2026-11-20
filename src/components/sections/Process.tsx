import { process } from "@/content/studio";
import { Reveal, SectionHeading } from "@/components/ui/Reveal";

export function Process() {
  return (
    <section id="processo" aria-labelledby="processo-title" className="silver-band px-5 py-24 md:px-10 md:py-36">
      <div className="mx-auto max-w-[1400px]">
        <SectionHeading eyebrow="Como trabalhamos" title={<span id="processo-title">DA IDEIA <span className="mark-gold">À ENTREGA.</span></span>} />
        <div className="relative">
        <div className="absolute top-8 right-[12%] left-[12%] hidden h-px bg-gradient-to-r from-coal/0 via-[#c79c00] to-coal/0 md:block" aria-hidden />
        <ol className="relative grid gap-10 md:grid-cols-4 md:gap-5">
          {process.map((s, i) => (
            <Reveal as="li" key={s.n} delay={i * 140} className="relative">
              <div className="group h-full">
                <span className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full border border-brand/60 bg-coal font-display text-lg font-bold text-brand transition-[background-color,color] duration-500 group-hover:bg-brand group-hover:text-ink">
                  {s.n}
                </span>
                <h3 className="mt-6 font-display text-2xl font-semibold">{s.title}</h3>
                <p className="mt-2 max-w-xs text-sm text-muted leading-relaxed">{s.text}</p>
              </div>
            </Reveal>
          ))}
        </ol>
        </div>
      </div>
    </section>
  );
}
