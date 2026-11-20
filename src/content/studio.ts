/**
 * Galeria do estúdio. As imagens fornecidas são renders/visualizações conceptuais —
 * estão identificadas como tal no site. Quando houver fotografias reais das instalações,
 * substitua `src` e mude `kind` para "foto".
 */
export type GalleryItem = { src: string; title: string; caption: string; kind: "conceito" | "foto"; wide?: boolean };

export const gallery: GalleryItem[] = [
  { src: "/images/estudio-podcast.webp", title: "Sala de podcast", caption: "Set para duas pessoas, multicâmara e iluminação de estúdio.", kind: "conceito", wide: true },
  { src: "/images/camera/parte3-montada.webp", title: "Equipamento de filmagem", caption: "Captação em 4K com áudio dedicado.", kind: "conceito" },
  { src: "/images/iluminacao/parte2-montada.webp", title: "Iluminação profissional", caption: "Painéis LED, softboxes e ring light.", kind: "conceito" },
  { src: "/images/estudio-completo.webp", title: "Área de gravação e recepção", caption: "Espaço de gravação e área de recepção/showcase.", kind: "conceito", wide: true },
  { src: "/images/recepcao-showcase.webp", title: "Área de recepção", caption: "Acolhimento de convidados e identidade da marca.", kind: "conceito" },
  { src: "/images/estudio-recepcao.webp", title: "Mesa de produção e identidade visual", caption: "Produção ao vivo e identidade visual do espaço.", kind: "conceito" },
];

export const process = [
  { n: "01", title: "Briefing", text: "Compreendemos o projecto, os objectivos e o público." },
  { n: "02", title: "Planeamento", text: "Definimos a produção: equipa, equipamento, guião e calendário." },
  { n: "03", title: "Execução", text: "Captamos os melhores momentos com rigor técnico." },
  { n: "04", title: "Entrega", text: "Finalizamos e disponibilizamos os conteúdos nos formatos certos." },
];
