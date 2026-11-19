/** Serviços audiovisuais (secção 1). Editar aqui para alterar textos e listas. */
export type Service = {
  id: string;
  title: string;
  icon: "event" | "video" | "photo" | "live" | "post" | "podcast";
  summary: string;
  items: string[];
};

export const services: Service[] = [
  {
    id: "eventos-corporativos",
    title: "Cobertura de Eventos Corporativos",
    icon: "event",
    summary: "Registo completo de eventos empresariais, com equipa e equipamento profissional.",
    items: [
      "Conferências",
      "Seminários",
      "Congressos",
      "Workshops",
      "Lançamentos de produtos",
      "Eventos empresariais",
      "Cerimónias institucionais",
      "Reuniões e apresentações corporativas",
    ],
  },
  {
    id: "producao-video",
    title: "Produção de Vídeo",
    icon: "video",
    summary: "Do guião à entrega final, vídeos que comunicam a sua marca com clareza.",
    items: [
      "Vídeos institucionais",
      "Vídeos publicitários",
      "Vídeos promocionais",
      "Entrevistas",
      "Depoimentos",
      "Documentários empresariais",
      "Conteúdos para redes sociais",
    ],
  },
  {
    id: "fotografia",
    title: "Fotografia Profissional",
    icon: "photo",
    summary: "Imagens com direcção, luz controlada e tratamento profissional.",
    items: ["Fotografia corporativa", "Cobertura fotográfica de eventos", "Retratos profissionais", "Fotografia de produtos", "Fotografia publicitária"],
  },
  {
    id: "transmissao-ao-vivo",
    title: "Transmissão ao Vivo",
    icon: "live",
    summary: "Leve o seu evento a quem não está na sala, com qualidade de produção.",
    items: ["Lives corporativas", "Conferências online", "Webinars", "Eventos híbridos", "Streaming para plataformas digitais"],
  },
  {
    id: "pos-producao",
    title: "Produção e Pós-Produção",
    icon: "post",
    summary: "Edição, cor, som e grafismo para um resultado final cuidado.",
    items: [
      "Edição de vídeo",
      "Motion graphics",
      "Animações",
      "Tratamento de imagem",
      "Correcção de cor",
      "Tratamento de áudio",
      "Legendagem",
      "Produção de conteúdos digitais",
    ],
  },
  {
    id: "podcasts",
    title: "Produção de Podcasts",
    icon: "podcast",
    summary: "Gravação e produção de podcasts em áudio e vídeo, do início ao fim.",
    items: ["Gravação de podcasts", "Podcasts em vídeo", "Entrevistas", "Produção multicâmara", "Captação de áudio profissional", "Edição e pós-produção"],
  },
];

/** Opções do formulário de reserva. */
export const recordingTypes = ["Podcast em áudio", "Podcast em vídeo", "Entrevista", "Programa / talk-show", "Conteúdo para redes sociais", "Outro"];

/** Opções do formulário de proposta para eventos. */
export const eventTypes = ["Conferência", "Seminário", "Congresso", "Workshop", "Lançamento de produto", "Cerimónia institucional", "Evento empresarial", "Outro"];

export const eventDeliverables = [
  "Fotografia de eventos",
  "Videografia",
  "Captação multicâmara",
  "Entrevistas",
  "Streaming",
  "Aftermovie",
  "Vídeo de resumo",
  "Conteúdo para comunicação institucional",
];
