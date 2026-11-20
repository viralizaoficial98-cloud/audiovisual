"use client";

import { useState, type FormEvent } from "react";
import { validateContact, type ContactData, type Errors } from "@/lib/validation";
import { buildMessage, mailtoLink, whatsappLink } from "@/lib/whatsapp";
import { SelectField, TextArea, TextField } from "./Field";

const initial: ContactData = { name: "", email: "", phone: "", subject: "Informações gerais", message: "" };
const subjects = ["Informações gerais", "Reserva da sala de podcast", "Cobertura de evento", "Produção de vídeo", "Fotografia", "Transmissão ao vivo", "Outro assunto"];

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "ok" } | { kind: "fallback"; wa: string; mail: string };

/**
 * Formulário de contacto. Envia para /api/contact (que reencaminha para o webhook
 * configurado em CONTACT_WEBHOOK_URL). Se o envio não estiver configurado ou falhar,
 * oferece de imediato WhatsApp e e-mail com a mensagem já preenchida — nunca se perde o pedido.
 */
export function ContactForm() {
  const [d, setD] = useState<ContactData>(initial);
  const [errors, setErrors] = useState<Errors<keyof ContactData>>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const set = <K extends keyof ContactData>(k: K, v: ContactData[K]) => {
    setD((s) => ({ ...s, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs = validateContact(d);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setStatus({ kind: "sending" });
    const text = buildMessage(`Contacto pelo site — ${d.subject}`, [
      ["Nome", d.name],
      ["E-mail", d.email],
      ["Telefone", d.phone],
      ["Assunto", d.subject],
      ["Mensagem", d.message],
    ]);
    try {
      const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) });
      if (res.ok) {
        setStatus({ kind: "ok" });
        setD(initial);
        return;
      }
    } catch {
      /* segue para o plano B */
    }
    setStatus({ kind: "fallback", wa: whatsappLink(text), mail: mailtoLink(`Contacto pelo site — ${d.subject}`, text.replace(/\*/g, "")) });
  };

  return (
    <form onSubmit={submit} noValidate className="card grid gap-5 p-6 sm:grid-cols-2 md:p-8" aria-label="Formulário de contacto">
      <TextField label="Nome" name="name" autoComplete="name" value={d.name} onChange={(e) => set("name", e.target.value)} error={errors.name} />
      <SelectField label="Assunto" name="subject" options={subjects} value={d.subject} onChange={(e) => set("subject", e.target.value)} />
      <TextField label="E-mail" name="email" type="email" autoComplete="email" value={d.email} onChange={(e) => set("email", e.target.value)} error={errors.email} />
      <TextField label="Telefone" name="phone" type="tel" optional autoComplete="tel" value={d.phone} onChange={(e) => set("phone", e.target.value)} error={errors.phone} />
      <TextArea label="Mensagem" name="message" rows={4} value={d.message} onChange={(e) => set("message", e.target.value)} error={errors.message} className="sm:col-span-2" />
      <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center">
        <button type="submit" className="btn-primary" disabled={status.kind === "sending"}>
          {status.kind === "sending" ? "A enviar…" : "Enviar mensagem"}
        </button>
        <div aria-live="polite" className="text-sm">
          {status.kind === "ok" && <p className="form-ok">Mensagem enviada. Obrigado — responderemos em breve.</p>}
          {status.kind === "fallback" && (
            <p className="text-soft">
              Envie-nos a mensagem directamente:{" "}
              <a href={status.wa} target="_blank" rel="noopener noreferrer" className="font-semibold underline decoration-brand decoration-2">
                WhatsApp
              </a>{" "}
              ou{" "}
              <a href={status.mail} className="font-semibold underline decoration-brand decoration-2">
                e-mail
              </a>
              .
            </p>
          )}
        </div>
      </div>
    </form>
  );
}
