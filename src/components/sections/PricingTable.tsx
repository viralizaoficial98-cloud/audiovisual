"use client";

import { PACKAGE_CONDITIONS, PACKAGE_INCLUDES, RAW_DISCLAIMER, RAW_NOTE, editPackages, rawRecording } from "@/content/pricing";
import { formatKz } from "@/lib/format";
import { cn } from "@/lib/cn";
import { selectPlan } from "@/components/forms/planBus";
import { IconCheck, IconCut, IconInfo, IconMic, IconVideo } from "@/components/ui/Icons";
import { Reveal } from "@/components/ui/Reveal";

/**
 * Tabela comercial da sala de podcast: Modalidade A (gravação bruta, por hora) e
 * Modalidade B (pacotes de gravação + edição). Os botões "Reservar" seleccionam a opção
 * no formulário de pré-reserva.
 */
export function PricingTable() {
  return (
    <div id="precos" className="scroll-mt-24">
      {/* ---------------- MODALIDADE A ---------------- */}
      <Reveal className="mb-14 md:mb-20">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-3">
              <span className="h-px w-8 bg-brand" aria-hidden />
              Modalidade A
            </p>
            <h3 className="font-display text-2xl font-bold tracking-tight md:text-4xl">Gravação bruta</h3>
            <p className="text-muted mt-2 max-w-xl">Gravação profissional no estúdio, sem edição de vídeo.</p>
          </div>
          <span className="pill-tag">
            <IconMic size={16} /> Sem edição
          </span>
        </div>

        <div className="card overflow-hidden">
          <table className="price-table w-full text-left">
            <caption className="sr-only">Preços da gravação bruta no estúdio</caption>
            <thead>
              <tr>
                <th scope="col">Serviço</th>
                <th scope="col" className="text-right">
                  Preço
                </th>
                <th scope="col" className="hidden w-48 sm:table-cell">
                  <span className="sr-only">Acção</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rawRecording.map((r) => (
                <tr key={r.id}>
                  <th scope="row" className="font-medium">
                    {r.label}
                    {r.extra && <span className="text-muted block text-xs font-normal">acresce a qualquer duração</span>}
                    {!r.extra && (
                      <button type="button" className="btn-reserve mt-3 whitespace-nowrap sm:hidden" onClick={() => selectPlan({ kind: "bruta" }, r.hours)}>
                        Reservar {r.hours} {r.hours === 1 ? "hora" : "horas"}
                      </button>
                    )}
                  </th>
                  <td className="text-right font-display text-xl font-bold whitespace-nowrap md:text-2xl">{formatKz(r.price)}</td>
                  <td className="hidden text-right sm:table-cell">
                    {!r.extra && (
                      <button type="button" className="btn-reserve" onClick={() => selectPlan({ kind: "bruta" }, r.hours)} aria-label={`Reservar ${r.label}`}>
                        Reservar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="notice mt-5 flex gap-3 rounded-2xl p-5" role="note">
          <IconInfo size={20} className="mt-0.5 shrink-0" />
          <div className="text-sm leading-relaxed">
            <p className="font-semibold">{RAW_DISCLAIMER}</p>
            <p className="text-muted mt-1">{RAW_NOTE}</p>
          </div>
        </div>
      </Reveal>

      {/* ---------------- MODALIDADE B ---------------- */}
      <Reveal>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-3">
              <span className="h-px w-8 bg-brand" aria-hidden />
              Modalidade B
            </p>
            <h3 className="font-display text-2xl font-bold tracking-tight md:text-4xl">Gravação + edição profissional</h3>
            <p className="text-muted mt-2 max-w-xl">Gravamos e editamos por si. Recebe os vídeos prontos a publicar.</p>
          </div>
          <span className="pill-tag">
            <IconCut size={16} /> Com edição
          </span>
        </div>
      </Reveal>
      <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {editPackages.map((p, i) => (
          <Reveal as="li" key={p.id} delay={i * 90} className="h-full">
            <article className={cn("package group relative flex h-full flex-col rounded-3xl p-6 md:p-7", p.featured && "package-featured")} aria-label={`${p.name}, ${formatKz(p.price)}`}>
              {p.featured && <span className="package-badge">Recomendado</span>}
              <span className="package-icon flex h-12 w-12 items-center justify-center rounded-2xl">
                <IconVideo size={24} />
              </span>
              <h4 className="mt-5 font-display text-xl font-semibold">{p.name}</h4>
              <p className="mt-3 flex items-baseline gap-1">
                <span className="package-price font-display text-4xl font-extrabold tracking-tight">{formatKz(p.price).replace(" Kz", "")}</span>
                <span className="text-lg font-semibold opacity-75">Kz</span>
              </p>
              <ul className="mt-6 space-y-3 text-sm">
                {PACKAGE_INCLUDES(p.videos).map((it) => (
                  <li key={it} className="flex items-start gap-2.5">
                    <IconCheck size={18} className="package-check mt-px shrink-0" />
                    {it}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-8">
                <button type="button" className={cn("w-full", p.featured ? "btn-primary" : "btn-reserve btn-reserve-block")} onClick={() => selectPlan({ kind: "pacote", id: p.id })}>
                  Reservar {p.name.replace("Pacote ", "")}
                </button>
              </div>
            </article>
          </Reveal>
        ))}
      </ul>
      <p className="text-muted mt-6 flex items-start gap-2 text-sm">
        <IconInfo size={18} className="mt-0.5 shrink-0" />
        {PACKAGE_CONDITIONS}
      </p>
    </div>
  );
}
