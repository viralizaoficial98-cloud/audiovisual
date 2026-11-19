import { site } from "@/config/site";

/** Gera um link wa.me com a mensagem codificada. */
export function whatsappLink(message?: string): string {
  const base = `https://wa.me/${site.whatsapp.number}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** Gera um link mailto com assunto e corpo. */
export function mailtoLink(subject: string, body?: string): string {
  const params = new URLSearchParams({ subject });
  if (body) params.set("body", body);
  // URLSearchParams codifica espaços como "+", que alguns clientes de e-mail não convertem.
  return `mailto:${site.email}?${params.toString().replace(/\+/g, "%20")}`;
}

/** Constrói uma mensagem organizada em linhas "Rótulo: valor", ignorando campos vazios. */
export function buildMessage(title: string, fields: Array<[string, string | number | undefined | null]>, footer?: string) {
  const lines = [`*${title}*`, ""];
  for (const [label, value] of fields) {
    if (value === undefined || value === null) continue;
    const v = String(value).trim();
    if (!v) continue;
    lines.push(`*${label}:* ${v}`);
  }
  if (footer) lines.push("", footer);
  return lines.join("\n");
}

export function openExternal(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}
