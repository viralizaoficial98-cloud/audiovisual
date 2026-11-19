/**
 * Configuração central do site. Alterar aqui contactos, preços e URLs.
 * Todos os componentes leem destes valores — nada de contactos "hard-coded" noutros ficheiros.
 */
export const site = {
  name: "VIRALIZA Audiovisual & Podcast",
  shortName: "VIRALIZA Audiovisual",
  tagline: "Transformamos momentos em experiências memoráveis.",
  description:
    "Estúdio de podcast em Luanda, cobertura audiovisual de eventos corporativos, produção de vídeos institucionais, fotografia profissional e transmissões ao vivo em Angola.",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://audiovisual.viralizahost.com").replace(/\/$/, ""),
  institutionalUrl: "https://www.viralizahost.com",
  institutionalLabel: "www.viralizahost.com",
  email: "comercial@viralizahost.com",
  whatsapp: {
    display: "+244 973 581 978",
    /** Número em formato internacional sem "+" nem espaços, usado nos links wa.me */
    number: "244973581978",
  },
  areaServed: "Angola",
  locale: "pt_AO",
  podcast: {
    /** Preço inicial de referência por hora (Kz). Não representa pacote nem condição final. */
    hourlyRate: 40000,
    currency: "AOA",
    maxHours: 12,
  },
} as const;

export const nav = [
  { href: "#servicos", label: "Serviços" },
  { href: "#estudio", label: "Estúdio" },
  { href: "#eventos", label: "Eventos" },
  { href: "#portfolio", label: "Portfólio" },
  { href: "#contactos", label: "Contactos" },
] as const;
