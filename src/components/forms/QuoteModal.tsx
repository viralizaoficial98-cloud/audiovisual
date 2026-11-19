"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { eventDeliverables, eventTypes, services } from "@/content/services";
import { formatDatePt } from "@/lib/format";
import { isEmail, isPhone, todayIso, type Errors } from "@/lib/validation";
import { buildMessage, mailtoLink, openExternal, whatsappLink } from "@/lib/whatsapp";
import { IconClose, IconMail, IconWhatsApp } from "@/components/ui/Icons";
import { SelectField, TextArea, TextField } from "./Field";
import { onQuote, type QuoteRequest } from "./quoteBus";

type Data = {
  name: string;
  company: string;
  phone: string;
  email: string;
  service: string;
  eventType: string;
  date: string;
  location: string;
  guests: string;
  deliverables: string[];
  notes: string;
};

const empty: Data = { name: "", company: "", phone: "", email: "", service: "", eventType: "", date: "", location: "", guests: "", deliverables: [], notes: "" };

/**
 * Formulário de orçamento/proposta comercial (modal). Aberto por qualquer botão
 * "Pedir orçamento" via openQuote(). Envia por WhatsApp (ou e-mail) com a mensagem
 * contextualizada ao serviço escolhido.
 */
export function QuoteModal() {
  const [req, setReq] = useState<QuoteRequest | null>(null);
  const [d, setD] = useState<Data>(empty);
  const [errors, setErrors] = useState<Errors<keyof Data>>({});
  const dialog = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  useEffect(
    () =>
      onQuote((r) => {
        lastFocus.current = document.activeElement as HTMLElement;
        setReq(r);
        setErrors({});
        setD({ ...empty, service: r.kind === "evento" ? "Cobertura de Eventos Corporativos" : r.service ?? "" });
      }),
    [],
  );

  const close = () => setReq(null);

  useEffect(() => {
    if (!req) return;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => dialog.current?.querySelector<HTMLElement>("input,select,textarea")?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab" && dialog.current) {
        const els = Array.from(dialog.current.querySelectorAll<HTMLElement>("button,input,select,textarea,a[href]")).filter((x) => !x.hasAttribute("disabled"));
        const [f, l] = [els[0], els[els.length - 1]];
        if (e.shiftKey && document.activeElement === f) {
          e.preventDefault();
          l.focus();
        } else if (!e.shiftKey && document.activeElement === l) {
          e.preventDefault();
          f.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      lastFocus.current?.focus?.();
    };
  }, [req]);

  if (!req) return null;
  const isEvent = d.service === "Cobertura de Eventos Corporativos";

  const set = <K extends keyof Data>(k: K, v: Data[K]) => {
    setD((s) => ({ ...s, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const validate = () => {
    const e: Errors<keyof Data> = {};
    if (d.name.trim().length < 2) e.name = "Indique o seu nome.";
    if (!isPhone(d.phone)) e.phone = "Indique um telefone/WhatsApp válido.";
    if (d.email.trim() && !isEmail(d.email)) e.email = "O e-mail não parece válido.";
    if (!d.service) e.service = "Escolha o serviço.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const message = () =>
    buildMessage(
      isEvent ? "Pedido de proposta comercial — Cobertura de evento" : `Pedido de orçamento — ${d.service}`,
      [
        ["Nome", d.name],
        ["Empresa", d.company],
        ["Telefone/WhatsApp", d.phone],
        ["E-mail", d.email],
        ["Serviço", d.service],
        ["Tipo de evento", isEvent ? d.eventType : ""],
        ["Data", d.date ? formatDatePt(d.date) : ""],
        ["Local", d.location],
        ["Participantes previstos", isEvent ? d.guests : ""],
        ["Entregáveis pretendidos", isEvent ? d.deliverables.join(", ") : ""],
        ["Detalhes", d.notes],
      ],
      "Aguardo a vossa proposta. Obrigado!",
    );

  const send = (via: "wa" | "mail") => (e?: FormEvent) => {
    e?.preventDefault();
    if (!validate()) return;
    if (via === "wa") openExternal(whatsappLink(message()));
    else window.location.href = mailtoLink(isEvent ? "Pedido de proposta — Cobertura de evento" : `Pedido de orçamento — ${d.service}`, message().replace(/\*/g, ""));
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="quote-title" className="max-h-[92svh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-white/10 bg-ink-2 p-6 shadow-2xl sm:rounded-3xl md:p-9">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow mb-3">
              <span className="h-px w-6 bg-brand" aria-hidden />
              {isEvent ? "Proposta comercial" : "Orçamento"}
            </p>
            <h2 id="quote-title" className="font-display text-2xl font-semibold md:text-3xl">
              {isEvent ? "O seu evento merece ser eternizado." : "Conte-nos o que precisa."}
            </h2>
          </div>
          <button type="button" onClick={close} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 hover:border-brand hover:text-brand" aria-label="Fechar">
            <IconClose />
          </button>
        </div>

        <form onSubmit={send("wa")} noValidate className="mt-7 grid gap-5 sm:grid-cols-2">
          <TextField label="Nome" name="name" autoComplete="name" value={d.name} onChange={(e) => set("name", e.target.value)} error={errors.name} />
          <TextField label="Empresa" name="company" optional autoComplete="organization" value={d.company} onChange={(e) => set("company", e.target.value)} />
          <TextField label="Telefone / WhatsApp" name="phone" type="tel" autoComplete="tel" value={d.phone} onChange={(e) => set("phone", e.target.value)} error={errors.phone} />
          <TextField label="E-mail" name="email" type="email" optional autoComplete="email" value={d.email} onChange={(e) => set("email", e.target.value)} error={errors.email} />
          <SelectField label="Serviço" name="service" options={services.map((s) => s.title)} placeholder="Seleccione…" value={d.service} onChange={(e) => set("service", e.target.value)} error={errors.service} className="sm:col-span-2" />
          {isEvent && <SelectField label="Tipo de evento" name="eventType" optional options={eventTypes} placeholder="Seleccione…" value={d.eventType} onChange={(e) => set("eventType", e.target.value)} />}
          <TextField label="Data" name="date" type="date" optional min={todayIso()} value={d.date} onChange={(e) => set("date", e.target.value)} />
          <TextField label="Local" name="location" optional placeholder="Ex.: Luanda, Talatona" value={d.location} onChange={(e) => set("location", e.target.value)} className={isEvent ? "" : "sm:col-span-1"} />
          {isEvent && <TextField label="Participantes previstos" name="guests" optional inputMode="numeric" value={d.guests} onChange={(e) => set("guests", e.target.value)} />}
          {isEvent && (
            <fieldset className="sm:col-span-2">
              <legend className="field-label">O que pretende?</legend>
              <div className="flex flex-wrap gap-2">
                {eventDeliverables.map((x) => {
                  const on = d.deliverables.includes(x);
                  return (
                    <label key={x} className={`cursor-pointer rounded-full border px-3.5 py-2 text-xs transition ${on ? "border-brand bg-brand text-ink" : "border-white/15 text-white/70 hover:border-white/40"}`}>
                      <input type="checkbox" className="sr-only" checked={on} onChange={() => set("deliverables", on ? d.deliverables.filter((y) => y !== x) : [...d.deliverables, x])} />
                      {x}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}
          <TextArea label="Detalhes do projecto" name="notes" optional rows={3} value={d.notes} onChange={(e) => set("notes", e.target.value)} className="sm:col-span-2" />
          <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row">
            <button type="submit" className="btn-wa flex-1">
              <IconWhatsApp /> Enviar pelo WhatsApp
            </button>
            <button type="button" onClick={send("mail")} className="btn-ghost flex-1">
              <IconMail size={18} /> Enviar por e-mail
            </button>
          </div>
          <p className="text-xs text-white/45 sm:col-span-2">Responderemos com uma proposta adaptada. Os valores dependem do âmbito do projecto.</p>
        </form>
      </div>
    </div>,
    document.body,
  );
}
