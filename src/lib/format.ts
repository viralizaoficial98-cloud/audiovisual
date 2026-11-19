import { site } from "@/config/site";

/** Formata um valor em Kwanzas no padrão "40.000 Kz". */
export function formatKz(value: number): string {
  const rounded = Math.round(value);
  const s = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${s} Kz`;
}

/** Estimativa do aluguer da sala com base no preço inicial por hora. */
export function estimatePodcast(hours: number, rate: number = site.podcast.hourlyRate): number {
  if (!Number.isFinite(hours) || hours <= 0) return 0;
  return Math.round(hours * rate);
}

/** Converte "2026-11-30" em "30/11/2026" (sem depender do fuso horário). */
export function formatDatePt(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}
