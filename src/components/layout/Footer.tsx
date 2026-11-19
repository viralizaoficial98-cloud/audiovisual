import Image from "next/image";
import { nav, site } from "@/config/site";
import { whatsappLink } from "@/lib/whatsapp";
import { IconWhatsApp } from "@/components/ui/Icons";

export function Footer() {
  return (
    <footer className="border-t border-white/8 px-5 pt-16 pb-10 md:px-10">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-10 md:flex-row md:items-start md:justify-between">
        <div>
          <Image src="/brand/viraliza-logo.png" alt="VIRALIZA" width={1162} height={248} className="h-7 w-auto" />
          <p className="mt-4 max-w-sm text-sm text-white/50">{site.tagline} Estúdio de podcast e produção audiovisual em Luanda, Angola.</p>
        </div>
        <nav aria-label="Rodapé">
          <ul className="grid grid-cols-2 gap-x-10 gap-y-3 text-sm text-white/65">
            {nav.map((n) => (
              <li key={n.href}>
                <a href={n.href} className="hover:text-brand">
                  {n.label}
                </a>
              </li>
            ))}
            <li>
              <a href="#reserva" className="hover:text-brand">
                Reservar podcast
              </a>
            </li>
          </ul>
        </nav>
        <div className="text-sm text-white/65">
          <a href={`mailto:${site.email}`} className="block hover:text-brand">
            {site.email}
          </a>
          <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-2 hover:text-brand">
            <IconWhatsApp size={16} /> {site.whatsapp.display}
          </a>
          <a href={site.institutionalUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block hover:text-brand">
            {site.institutionalLabel}
          </a>
        </div>
      </div>
      <p className="mx-auto mt-14 max-w-[1400px] border-t border-white/5 pt-6 text-xs text-white/35">
        © {new Date().getFullYear()} Viraliza — Audiovisual &amp; Podcast. Angola. Imagens do estúdio: visualizações conceptuais.
      </p>
    </footer>
  );
}
