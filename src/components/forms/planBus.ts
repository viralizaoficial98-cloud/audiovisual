import type { BookingPlan } from "@/content/pricing";

/** Liga os botões "Reservar" da tabela de preços ao formulário de pré-reserva. */
export type PlanRequest = { plan: BookingPlan; hours?: number };
const EVENT = "viraliza:plan";

export function selectPlan(plan: BookingPlan, hours?: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<PlanRequest>(EVENT, { detail: { plan, hours } }));
  // leva o utilizador ao formulário (sem saltos bruscos)
  const form = document.getElementById("pre-reserva");
  if (form) {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    form.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }
}

export function onPlan(cb: (r: PlanRequest) => void) {
  const h = (e: Event) => cb((e as CustomEvent<PlanRequest>).detail);
  window.addEventListener(EVENT, h);
  return () => window.removeEventListener(EVENT, h);
}
