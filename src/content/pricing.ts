/**
 * TABELA COMERCIAL — Sala de podcast.
 * Valores fornecidos pela Viraliza. NÃO acrescentar durações incluídas, duração dos vídeos,
 * revisões, prazos ou extras: essas condições são confirmadas pela equipa comercial.
 */

export type RawOption = { id: string; label: string; hours: number; price: number; extra?: boolean };
export type EditPackage = { id: string; name: string; price: number; videos: number; featured?: boolean };

export const RAW_HOURLY = 40000;

export const rawRecording: RawOption[] = [
  { id: "bruta-1h", label: "1 hora de gravação", hours: 1, price: 40000 },
  { id: "bruta-2h", label: "2 horas de gravação", hours: 2, price: 80000 },
  { id: "bruta-3h", label: "3 horas de gravação", hours: 3, price: 120000 },
  { id: "bruta-extra", label: "Hora adicional", hours: 1, price: 40000, extra: true },
];

export const RAW_DISCLAIMER =
  "Os valores apresentados incluem apenas a gravação bruta no estúdio. Não incluem edição, montagem, pós-produção ou finalização dos vídeos pela equipa Viraliza.";

export const RAW_NOTE = "O cliente poderá contratar a gravação bruta e receber o material captado, de acordo com as condições comerciais a confirmar.";

export const editPackages: EditPackage[] = [
  { id: "essencial", name: "Pacote Essencial", price: 100000, videos: 3 },
  { id: "profissional", name: "Pacote Profissional", price: 200000, videos: 6, featured: true },
  { id: "premium", name: "Pacote Premium", price: 300000, videos: 9 },
  { id: "empresarial", name: "Pacote Empresarial", price: 400000, videos: 12 },
];

export const PACKAGE_INCLUDES = (videos: number) => ["Gravação pela equipa Viraliza", "Edição profissional", `Entrega de ${videos} vídeos editados`];

export const PACKAGE_CONDITIONS =
  "Duração da gravação incluída, duração de cada vídeo, número de revisões e prazos de entrega: condições sujeitas a confirmação comercial.";

/** Selecção no formulário de reserva: gravação bruta (por hora) ou um pacote com edição. */
export type BookingPlan = { kind: "bruta" } | { kind: "pacote"; id: string };

export const RAW_PLAN_LABEL = "Gravação bruta (sem edição)";

export function planLabel(plan: BookingPlan): string {
  if (plan.kind === "bruta") return RAW_PLAN_LABEL;
  return editPackages.find((p) => p.id === plan.id)?.name ?? "Pacote";
}

/**
 * Valor de referência da pré-reserva.
 *  - gravação bruta: horas × 40.000 Kz;
 *  - pacote com edição: preço fixo do pacote — NÃO é multiplicado pelas horas.
 */
export function planPrice(plan: BookingPlan, hours: number): number {
  if (plan.kind === "pacote") return editPackages.find((p) => p.id === plan.id)?.price ?? 0;
  if (!Number.isFinite(hours) || hours <= 0) return 0;
  return Math.round(hours) * RAW_HOURLY;
}
