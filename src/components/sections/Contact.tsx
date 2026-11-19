"use client";

import { site } from "@/config/site";
import { whatsappLink } from "@/lib/whatsapp";
import { ContactForm } from "@/components/forms/ContactForm";
import { openQuote } from "@/components/forms/quoteBus";
import { IconGlobe, IconMail, IconPin, IconWhatsApp } from "@/components/ui/Icons";
import { Reveal } from "@/components/ui/Reveal";

export function Contact() {
  const rows = [
    { icon: IconMail, label: "E-mail comercial", value: site.email, href: `mailto:${site.email}` },
    { icon: IconWhatsApp, label: "WhatsApp", value: site.whatsapp.display, href: whatsappLink("Olá, VIRALIZA! Gostaria de falar com a equipa audiovisual.") },
    { icon: IconGlobe, label: "Website institucional", value: site.institutionalLabel, href: site.institutionalUrl },
    { icon: IconPin, label: "Área de actuação", value: site.areaServed },
  ];
  return (
    <section id="contactos" aria-labelledby="contactos-title" className="relative overflow-hidden bg-ink-2 px-5 py-24 md:px-10 md:py-36">
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-[36rem] w-[36rem] rounded-full bg-brand/[0.08] blur-[120px]" aria-hidden />
      <div className="relative mx-auto grid max-w-[1400px] gap-14 lg:grid-cols-[1fr_1.1fr]">
        <Reveal>
          <p className="eyebrow mb-5">
            <span className="h-px w-8 bg-brand" aria-hidden />
            Contactos
          </p>
          <h2 id="contactos-title" className="section-title">
            VIRALIZA <span className="text-brand">AUDIOVISUAL &amp; PODCAST</span>
          </h2>
          <ul className="mt-10 space-y-3">
            {rows.map((r) => {
              const Icon = r.icon;
              const inner = (
                <>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                    <Icon size={20} />
                  </span>
                  <span>
                    <span className="block text-[11px] font-semibold tracking-[0.2em] text-white/45 uppercase">{r.label}</span>
                    <span className="block text-base font-medium text-white md:text-lg">{r.value}</span>
                  </span>
                </>
              );
              return (
                <li key={r.label}>
                  {r.href ? (
                    <a href={r.href} target={r.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="flex items-center gap-4 rounded-2xl border border-white/8 p-4 transition hover:border-brand/40 hover:bg-white/[0.03]">
                      {inner}
                    </a>
                  ) : (
                    <div className="flex items-center gap-4 rounded-2xl border border-white/8 p-4">{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="mt-10 flex flex-wrap gap-3">
            <a href={whatsappLink("Olá, VIRALIZA! Gostaria de falar com a equipa.")} target="_blank" rel="noopener noreferrer" className="btn-wa">
              <IconWhatsApp /> Falar com a equipa
            </a>
            <button type="button" className="btn-ghost" onClick={() => openQuote("geral")}>
              Pedir orçamento
            </button>
            <a href="#reserva" className="btn-primary">
              Reservar estúdio
            </a>
          </div>
        </Reveal>
        <Reveal delay={120}>
          <ContactForm />
        </Reveal>
      </div>
    </section>
  );
}
