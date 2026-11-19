/** Pequeno "bus" para abrir o formulário de orçamento a partir de qualquer botão. */
export type QuoteKind = "evento" | "servico" | "geral";

export type QuoteRequest = { kind: QuoteKind; service?: string };

const EVENT = "viraliza:quote";

export function openQuote(kind: QuoteKind = "geral", service?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<QuoteRequest>(EVENT, { detail: { kind, service } }));
}

export function onQuote(cb: (r: QuoteRequest) => void) {
  const h = (e: Event) => cb((e as CustomEvent<QuoteRequest>).detail);
  window.addEventListener(EVENT, h);
  return () => window.removeEventListener(EVENT, h);
}
