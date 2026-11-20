"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { site } from "@/config/site";
import { recordingTypes } from "@/content/services";
import { PACKAGE_CONDITIONS, RAW_DISCLAIMER, RAW_HOURLY, editPackages, planLabel, planPrice, type BookingPlan } from "@/content/pricing";
import { formatKz } from "@/lib/format";
import { bookingMessage } from "@/lib/booking";
import { todayIso, validateBooking, type BookingData, type Errors } from "@/lib/validation";
import { openExternal, whatsappLink } from "@/lib/whatsapp";
import { IconWhatsApp } from "@/components/ui/Icons";
import { SelectField, TextArea, TextField } from "./Field";
import { onPlan } from "./planBus";

const initial: BookingData = { name: "", company: "", phone: "", email: "", date: "", time: "", hours: 1, type: "", participants: 2, notes: "" };

/** Valor do <select> de modalidade: "bruta" ou o id do pacote. */
const planKey = (p: BookingPlan) => (p.kind === "bruta" ? "bruta" : p.id);
const keyToPlan = (k: string): BookingPlan => (k === "bruta" ? { kind: "bruta" } : { kind: "pacote", id: k });

const PLAN_OPTIONS = [
  { value: "bruta", label: `Gravação bruta — ${formatKz(RAW_HOURLY)} / hora (sem edição)` },
  ...editPackages.map((p) => ({ value: p.id, label: `${p.name} — ${formatKz(p.price)} (${p.videos} vídeos editados)` })),
];

/**
 * Pré-reserva da sala de podcast. Modalidades: gravação bruta (40.000 Kz/h × horas) ou
 * pacote de gravação + edição (preço fixo, não multiplicado pelas horas). Envia o pedido
 * organizado por WhatsApp. NÃO confirma disponibilidade — é sempre um pedido.
 */
export function BookingForm() {
  const [d, setD] = useState<BookingData>(initial);
  const [plan, setPlan] = useState<BookingPlan>({ kind: "bruta" });
  const [errors, setErrors] = useState<Errors<keyof BookingData>>({});
  const [sent, setSent] = useState(false);
  const [flash, setFlash] = useState(0);
  const estimate = useMemo(() => planPrice(plan, d.hours), [plan, d.hours]);
  const isRaw = plan.kind === "bruta";
  const pkg = plan.kind === "pacote" ? editPackages.find((p) => p.id === plan.id) : undefined;

  // botões "Reservar" da tabela de preços
  useEffect(
    () =>
      onPlan(({ plan: p, hours }) => {
        setPlan(p);
        if (hours) setD((s) => ({ ...s, hours }));
        setFlash((n) => n + 1);
      }),
    [],
  );

  const set = <K extends keyof BookingData>(k: K, v: BookingData[K]) => {
    setD((s) => ({ ...s, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs = validateBooking(d, site.podcast.maxHours);
    setErrors(errs);
    const first = Object.keys(errs)[0];
    if (first) {
      (e.currentTarget as HTMLFormElement).querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    openExternal(whatsappLink(bookingMessage(d, plan)));
    setSent(true);
  };

  return (
    <form id="pre-reserva" onSubmit={submit} noValidate className="card relative scroll-mt-24 p-6 md:p-8" aria-labelledby="reserva-form-title">
      <h3 id="reserva-form-title" className="font-display text-xl font-semibold md:text-2xl">
        Pré-reserva da sala
      </h3>
      <p className="text-muted mt-2 text-sm">Escolha a modalidade, preencha os dados e envie o pedido pelo WhatsApp. Confirmamos a disponibilidade consigo.</p>

      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <SelectField
          label="Modalidade / pacote"
          name="plan"
          options={PLAN_OPTIONS.map((o) => o.value)}
          value={planKey(plan)}
          onChange={(e) => setPlan(keyToPlan(e.target.value))}
          className="sm:col-span-2"
          optionLabels={Object.fromEntries(PLAN_OPTIONS.map((o) => [o.value, o.label]))}
        />
        <TextField label="Nome completo" name="name" autoComplete="name" required value={d.name} onChange={(e) => set("name", e.target.value)} error={errors.name} className="sm:col-span-2" />
        <TextField label="Empresa" name="company" optional autoComplete="organization" value={d.company} onChange={(e) => set("company", e.target.value)} />
        <TextField label="Telefone / WhatsApp" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="9XX XXX XXX" required value={d.phone} onChange={(e) => set("phone", e.target.value)} error={errors.phone} />
        <TextField label="E-mail" name="email" type="email" optional autoComplete="email" value={d.email} onChange={(e) => set("email", e.target.value)} error={errors.email} className="sm:col-span-2" />
        <TextField label="Data pretendida" name="date" type="date" min={todayIso()} required value={d.date} onChange={(e) => set("date", e.target.value)} error={errors.date} />
        <TextField label="Hora pretendida" name="time" type="time" step={900} required value={d.time} onChange={(e) => set("time", e.target.value)} error={errors.time} />
        <div>
          <span className="field-label" id="horas-label">
            {isRaw ? "Quantidade de horas" : "Duração pretendida (horas)"}
          </span>
          <div className="flex items-center gap-2" role="group" aria-labelledby="horas-label">
            <button type="button" className="stepper" onClick={() => set("hours", Math.max(1, d.hours - 1))} disabled={d.hours <= 1} aria-label="Menos uma hora">
              −
            </button>
            <input
              name="hours"
              type="number"
              inputMode="numeric"
              min={1}
              max={site.podcast.maxHours}
              className="field text-center"
              aria-label="Horas"
              aria-invalid={!!errors.hours}
              value={d.hours}
              onChange={(e) => set("hours", Math.max(0, Math.floor(Number(e.target.value) || 0)))}
            />
            <button type="button" className="stepper" onClick={() => set("hours", Math.min(site.podcast.maxHours, d.hours + 1))} disabled={d.hours >= site.podcast.maxHours} aria-label="Mais uma hora">
              +
            </button>
          </div>
          {errors.hours && <p className="field-error mt-1.5 text-xs">{errors.hours}</p>}
        </div>
        <TextField label="Participantes" name="participants" type="number" inputMode="numeric" min={1} max={20} value={d.participants} onChange={(e) => set("participants", Math.floor(Number(e.target.value) || 0))} error={errors.participants} />
        <SelectField label="Tipo de gravação" name="type" options={recordingTypes} placeholder="Seleccione…" value={d.type} onChange={(e) => set("type", e.target.value)} error={errors.type} className="sm:col-span-2" />
        <TextArea label="Observações" name="notes" optional rows={3} value={d.notes} onChange={(e) => set("notes", e.target.value)} className="sm:col-span-2" placeholder="Formato, necessidades técnicas, convidados…" />
      </div>

      {/* resumo da pré-reserva */}
      <div key={flash} className="booking-summary mt-7 flex flex-col gap-5 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between" data-testid="summary">
        <div aria-live="polite">
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase opacity-70">{isRaw ? "Valor estimado" : "Valor de referência"}</p>
          <p className="text-muted text-sm font-semibold" data-testid="plan-name">
            {planLabel(plan)}
          </p>
          <p className="font-display text-3xl font-bold whitespace-nowrap" data-testid="estimate">
            {formatKz(estimate)}
          </p>
          <p className="text-muted mt-1 text-xs">
            {isRaw ? `${d.hours} ${d.hours === 1 ? "hora" : "horas"} × ${formatKz(RAW_HOURLY)} · gravação sem edição` : `${pkg?.videos} vídeos editados · preço do pacote (não multiplicado pelas horas)`}
          </p>
        </div>
        <button type="submit" className="btn-wa shrink-0">
          <IconWhatsApp />
          Solicitar reserva pelo WhatsApp
        </button>
      </div>
      <p className="text-muted mt-4 text-xs leading-relaxed">
        {isRaw ? RAW_DISCLAIMER : PACKAGE_CONDITIONS} Este formulário envia um <strong>pedido de pré-reserva</strong>, sujeito à confirmação de disponibilidade pela equipa VIRALIZA. Nenhum horário fica reservado
        automaticamente.
      </p>
      {sent && (
        <p className="booking-sent mt-4 rounded-xl p-4 text-sm" role="status">
          Abrimos o WhatsApp com o seu pedido. Se não abriu,{" "}
          <a className="font-semibold underline" href={whatsappLink(bookingMessage(d, plan))} target="_blank" rel="noopener noreferrer">
            clique aqui
          </a>
          .
        </p>
      )}
    </form>
  );
}
