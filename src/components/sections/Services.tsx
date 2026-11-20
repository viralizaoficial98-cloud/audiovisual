import { services } from "@/content/services";
import { whatsappLink } from "@/lib/whatsapp";
import { IconWhatsApp, serviceIcons } from "@/components/ui/Icons";
import { Reveal, SectionHeading } from "@/components/ui/Reveal";

export function Services() {
  return (
    <section id="servicos" aria-labelledby="servicos-title" className="relative px-5 py-24 md:px-10 md:py-36">
      <div className="mx-auto max-w-[1400px]">
        <SectionHeading
          eyebrow="Serviços audiovisuais"
          title={
            <span id="servicos-title">
              PRODUZIMOS EXPERIÊNCIAS. <span className="mark-gold">CONTAMOS HISTÓRIAS.</span>
            </span>
          }
          intro="Equipa, equipamento e processo para empresas e instituições que precisam de comunicar com qualidade profissional em Angola."
        />
        <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {services.map((s, i) => {
            const Icon = serviceIcons[s.icon];
            const msg = `Olá, VIRALIZA! Gostaria de pedir um orçamento para: ${s.title}.`;
            return (
              <Reveal as="li" key={s.id} delay={(i % 3) * 90} className="h-full">
                <article id={s.id} className="card group relative flex h-full flex-col overflow-hidden p-7 transition-[border-color,transform] duration-500 hover:-translate-y-1 hover:border-[#c79c00] md:p-8">
                  <div className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-brand/25 opacity-0 blur-3xl transition-opacity duration-700 group-hover:opacity-100" aria-hidden />
                  <div className="flex items-center justify-between">
                    <span className="flex h-14 w-14 items-center justify-center icon-chip rounded-2xl">
                      <Icon size={26} />
                    </span>
                    <span className="font-display text-faint text-sm">0{i + 1}</span>
                  </div>
                  <h3 className="mt-7 font-display text-2xl leading-tight font-semibold">{s.title}</h3>
                  <p className="mt-3 text-sm text-muted leading-relaxed">{s.summary}</p>
                  <ul className="mt-6 flex flex-wrap gap-2">
                    {s.items.map((it) => (
                      <li key={it} className="chip rounded-full px-3 py-1.5 text-xs">
                        {it}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto pt-8">
                    <a href={whatsappLink(msg)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[13px] font-semibold tracking-[0.12em] text-coal uppercase underline decoration-brand decoration-2 underline-offset-[6px] transition hover:gap-3">
                      <IconWhatsApp /> Solicitar orçamento
                    </a>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
