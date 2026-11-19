import type { Metadata, Viewport } from "next";
import "@fontsource-variable/sora";
import "@fontsource-variable/inter";
import "./globals.css";
import { site } from "@/config/site";

const title = "VIRALIZA Audiovisual & Podcast | Estúdio de Podcast em Luanda e Cobertura de Eventos";
const description =
  "Aluguer de sala de podcast em Luanda a partir de 40.000 Kz/hora, cobertura audiovisual de eventos corporativos, produção de vídeos institucionais, fotografia profissional e transmissões ao vivo em Angola.";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: title, template: "%s | VIRALIZA Audiovisual" },
  description,
  applicationName: site.name,
  keywords: [
    "aluguer de sala de podcast em Luanda",
    "estúdio de podcast em Angola",
    "estúdio de podcast Luanda",
    "cobertura audiovisual de eventos corporativos",
    "produção de vídeos institucionais",
    "filmagem de eventos em Luanda",
    "serviços de fotografia e vídeo",
    "produção audiovisual profissional",
    "transmissão ao vivo Angola",
    "Viraliza",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: site.locale,
    url: site.url,
    siteName: site.name,
    title,
    description,
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Estúdio de podcast VIRALIZA (visualização conceptual)" }],
  },
  twitter: { card: "summary_large_image", title, description, images: ["/og-image.jpg"] },
  icons: {
    icon: [{ url: "/favicon-32.png", sizes: "32x32", type: "image/png" }, { url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: "/apple-icon.png",
  },
  formatDetection: { telephone: false },
  category: "business",
};

export const viewport: Viewport = {
  themeColor: "#080808",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": `${site.url}/#organizacao`,
  name: site.name,
  description: site.description,
  url: site.url,
  logo: `${site.url}/brand/viraliza-logo.png`,
  image: `${site.url}/og-image.jpg`,
  email: site.email,
  telephone: site.whatsapp.display.replace(/\s/g, ""),
  areaServed: { "@type": "Country", name: "Angola" },
  parentOrganization: { "@type": "Organization", name: "Viraliza", url: site.institutionalUrl },
  sameAs: [site.institutionalUrl],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Serviços audiovisuais",
    itemListElement: [
      {
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: "Aluguer de sala de podcast", areaServed: "Angola" },
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: site.podcast.hourlyRate,
          priceCurrency: site.podcast.currency,
          unitText: "HUR",
          description: "Preço inicial de referência por hora, sujeito a confirmação",
        },
      },
      ...[
        "Cobertura de eventos corporativos",
        "Produção de vídeo",
        "Fotografia profissional",
        "Transmissão ao vivo",
        "Produção e pós-produção",
        "Produção de podcasts",
      ].map((name) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name, areaServed: "Angola" } })),
    ],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-AO">
      <body>
        <a href="#conteudo" className="sr-only z-[100] rounded-full bg-brand px-5 py-3 font-semibold text-ink focus:not-sr-only focus:fixed focus:top-4 focus:left-4">
          Saltar para o conteúdo
        </a>
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </body>
    </html>
  );
}
