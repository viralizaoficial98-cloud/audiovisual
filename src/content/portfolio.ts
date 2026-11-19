/**
 * Portfólio. A lista começa VAZIA de propósito: não inventamos clientes nem projectos.
 * Para publicar um projecto, acrescente um objecto a `projects`, por exemplo:
 *
 * {
 *   id: "conferencia-2026",
 *   title: "Nome do projecto",
 *   client: "Nome do cliente (com autorização)",
 *   category: "eventos",
 *   year: 2026,
 *   description: "Breve descrição do trabalho realizado.",
 *   thumbnail: "/images/portfolio/conferencia-2026.webp",
 *   video: "https://www.youtube.com/embed/ID_DO_VIDEO", // opcional (YouTube/Vimeo embed)
 * }
 */
export type PortfolioCategory = "eventos" | "podcasts" | "institucionais" | "publicidade" | "fotografia" | "lives";

export const portfolioCategories: Array<{ id: PortfolioCategory; label: string }> = [
  { id: "eventos", label: "Eventos Corporativos" },
  { id: "podcasts", label: "Podcasts" },
  { id: "institucionais", label: "Vídeos Institucionais" },
  { id: "publicidade", label: "Publicidade" },
  { id: "fotografia", label: "Fotografia" },
  { id: "lives", label: "Transmissões ao Vivo" },
];

export type Project = {
  id: string;
  title: string;
  client?: string;
  category: PortfolioCategory;
  year?: number;
  description: string;
  thumbnail: string;
  video?: string;
};

export const projects: Project[] = [];
