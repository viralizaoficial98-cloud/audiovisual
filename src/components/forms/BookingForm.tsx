"use client";

import { useMemo, useState, type FormEvent } from "react";
import { site } from "@/config/site";
import { recordingTypes } from "@/content/services";
import { estimatePodcast, formatDatePt, formatKz } from "@/lib/format";
import { todayIso, validateBooking, type BookingData, type Errors } from "@/lib/validation";
import { buildMessage, openExternal, whatsappLink } from "@/lib/whatsapp";
import { IconWhatsApp } from "@/components/ui/Icons";
import { SelectField, TextArea, TextField } from "./Field";

const initial: BookingData = { name: "", company: "", phone: "", email: "", date: "", time: "", hours: 1, type: "", participants: 2, notes: "" };

/**
 * Pré-reserva da sala de podcast. Calcula a estimativa (40.000 Kz/h) e envia o pedido
 * organizado por WhatsApp. NÃO confirma disponibilidade — é sempre um pedido.
 */
export function BookingForm() {
  const [d, setD] = useState<BookingData>(initial);
  const [errors, setErrors] = useState<Errors<keyof BookingData>>({});
  const [sent, setSent] = useState(false);
  const estimate = useMemo(() => estimatePodcast(d.hours), [d.hours]);

  const set = <K extends keyof BookingData>(k: K, v: BookingData[K]) => {
    setD((s) => ({ ...s, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const message = () =>
    buildMessage(
      "Pedido de pré-reserva — Sala de Podcast VIRALIZA",
      [
        ["Nome", d.name],
        ["Empresa", d.company],
        ["Telefone/WhatsApp", d.phone],
        ["E-mail", d.email],
        ["Data pretendida", formatDatePt(d.date)],
        ["Hora pretendida", d.time],
        ["Duração", `${d.hours} ${d.hours === 1 ? "hora" : "horas"}`],
        ["Tipo de gravação", d.type],
        ["Participantes", d.participants],
        ["Valor estimado", `${formatKz(estimate)} (base: ${formatKz(site.podcast.hourlyRate)}/hora)`],
        ["Observações", d.notes],
      ],
      "Aguardo confirmação da disponibilidade. Obrigado!",
    );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs = validateBooking(d, site.podcast.maxHours);
    setErrors(errs);
    const first = Object.keys(errs)[0];
    if (first) {
      (e.currentTarget as HTMLFormElement).querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    openExternal(whatsappLink(message()));
    setSent(true);
  };

  return (
    <form onSubmit={submit} noValidate className="card relative p-6 md:p-8" aria-labelledby="reserva-form-title">
      <h3 id="reserva-form-title" className="font-display text-xl font-semibold md:text-2xl">
        Pré-reserva da sala
      </h3>
      <p className="mt-2 text-sm text-white/55">Preencha os dados e envie o pedido pelo WhatsApp. Confirmamos a disponibilidade consigo.</p>

      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <TextField label="Nome completo" name="name" autoComplete="name" required value={d.name} onChange={(e) => set("name", e.target.value)} error={errors.name} className="sm:col-span-2" />
        <TextField label="Empresa" name="company" optional autoComplete="organization" value={d.company} onChange={(e) => set("company", e.target.value)} />
        <TextField label="Telefone / WhatsApp" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="9XX XXX XXX" required value={d.phone} onChange={(e) => set("phone", e.target.value)} error={errors.phone} />
        <TextField label="E-mail" name="email" type="email" optional autoComplete="email" value={d.email} onChange={(e) => set("email", e.target.value)} error={errors.email} className="sm:col-span-2" />
        <TextField label="Data pretendida" name="date" type="date" min={todayIso()} required value={d.date} onChange={(e) => set("date", e.target.value)} error={errors.date} />
        <TextField label="Hora pretendida" name="time" type="time" step={900} required value={d.time} onChange={(e) => set("time", e.target.value)} error={errors.time} />
        <div>
          <span className="field-label" id="horas-label">
            Quantidade de horas
          </span>
          <div className="flex items-center gap-2" role="group" aria-labelledby="horas-label">
            <button type="button" className="h-12 w-12 shrink-0 rounded-xl border border-white/12 text-xl hover:border-brand hover:text-brand disabled:opacity-30" onClick={() => set("hours", Math.max(1, d.hours - 1))} disabled={d.hours <= 1} aria-label="Menos uma hora">
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
            <button type="button" className="h-12 w-12 shrink-0 rounded-xl border border-white/12 text-xl hover:border-brand hover:text-brand disabled:opacity-30" onClick={() => set("hours", Math.min(site.podcast.maxHours, d.hours + 1))} disabled={d.hours >= site.podcast.maxHours} aria-label="Mais uma hora">
              +
            </button>
          </div>
          {errors.hours && <p className="mt-1.5 text-xs text-red-300">{errors.hours}</p>}
        </div>
        <TextField label="Participantes" name="participants" type="number" inputMode="numeric" min={1} max={20} value={d.participants} onChange={(e) => set("participants", Math.floor(Number(e.target.value) || 0))} error={errors.participants} />
        <SelectField label="Tipo de gravação" name="type" options={recordingTypes} placeholder="Seleccione…" value={d.type} onChange={(e) => set("type", e.target.value)} error={errors.type} className="sm:col-span-2" />
        <TextArea label="Observações" name="notes" optional rows={3} value={d.notes} onChange={(e) => set("notes", e.target.value)} className="sm:col-span-2" placeholder="Formato, necessidades técnicas, convidados…" />
      </div>

      <div className="mt-7 flex flex-col gap-5 rounded-2xl border border-brand/25 bg-brand/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div aria-live="polite">
          <p className="text-[11px] font-semibold tracking-[0.2em] text-white/55 uppercase">Valor estimado</p>
          <p className="font-display text-3xl font-bold whitespace-nowrap text-brand" data-testid="estimate">
            {formatKz(estimate)}
          </p>
          <p className="mt-1 text-xs text-white/50">
            {d.hours} {d.hours === 1 ? "hora" : "horas"} × {formatKz(site.podcast.hourlyRate)} · preço inicial de referência
          </p>
        </div>
        <button type="submit" className="btn-wa shrink-0">
          <IconWhatsApp />
          Solicitar reserva pelo WhatsApp
        </button>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-white/45">
        Este formulário envia um <strong className="text-white/70">pedido de reserva</strong>, sujeito à confirmação de disponibilidade pela equipa VIRALIZA. Nenhum horário fica reservado
        automaticamente.
      </p>
      {sent && (
        <p className="mt-4 rounded-xl bg-white/5 p-4 text-sm text-white/80" role="status">
          Abrimos o WhatsApp com o seu pedido. Se não abriu,{" "}
          <a className="text-brand underline" href={whatsappLink(message())} target="_blank" rel="noopener noreferrer">
            clique aqui
          </a>
          .
        </p>
      )}
    </form>
  );
}
