import Image from "next/image";
import { nav, site } from "@/config/site";
import { whatsappLink } from "@/lib/whatsapp";
import { IconWhatsApp } from "@/components/ui/Icons";

export function Footer() {
  return (
    <footer className="site-footer border-t border-[#252525]/10 px-5 pt-16 pb-10 md:px-10">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-10 md:flex-row md:items-start md:justify-between">
        <div>
          <span className="footer-logo inline-flex rounded-2xl px-5 py-3.5">
            <Image src="/brand/viraliza-logo.png" alt="VIRALIZA" width={1162} height={248} className="h-6 w-auto" />
          </span>
          <p className="mt-4 text-muted max-w-sm text-sm">{site.tagline} Estúdio de podcast e produção audiovisual em Luanda, Angola.</p>
        </div>
        <nav aria-label="Rodapé">
          <ul className="grid grid-cols-2 gap-x-10 text-soft gap-y-3 text-sm">
            {nav.map((n) => (
              <li key={n.href}>
                <a href={n.href} className="hover:text-gold-deep hover:underline">
                  {n.label}
                </a>
              </li>
            ))}
            <li>
              <a href="#reserva" className="hover:text-gold-deep hover:underline">
                Reservar podcast
              </a>
            </li>
          </ul>
        </nav>
        <div className="text-soft text-sm">
          <a href={`mailto:${site.email}`} className="block hover:text-gold-deep hover:underline">
            {site.email}
          </a>
          <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-2 hover:text-gold-deep hover:underline">
            <IconWhatsApp size={16} /> {site.whatsapp.display}
          </a>
          <a href={site.institutionalUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block hover:text-gold-deep hover:underline">
            {site.institutionalLabel}
          </a>
        </div>
      </div>
      <p className="mx-auto mt-14 max-w-[1400px] text-faint border-t border-[#252525]/10 pt-6 text-xs">
        © {new Date().getFullYear()} Viraliza — Audiovisual &amp; Podcast. Angola. Imagens do estúdio: visualizações conceptuais.
      </p>
    </footer>
  );
}
