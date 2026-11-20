import { RAW_HOURLY, planLabel, planPrice, type BookingPlan } from "@/content/pricing";
import { formatDatePt, formatKz } from "./format";
import type { BookingData } from "./validation";
import { buildMessage } from "./whatsapp";

/** Mensagem de pré-reserva para o WhatsApp (exportada para testes). */
export function bookingMessage(d: BookingData, plan: BookingPlan) {
  const price = planPrice(plan, d.hours);
  const isRaw = plan.kind === "bruta";
  return buildMessage(
    "Pedido de pré-reserva — Sala de Podcast VIRALIZA",
    [
      ["Nome", d.name],
      ["Empresa", d.company],
      ["Telefone/WhatsApp", d.phone],
      ["E-mail", d.email],
      ["Modalidade", planLabel(plan)],
      ["Valor de referência", isRaw ? `${formatKz(price)} (${d.hours} × ${formatKz(RAW_HOURLY)})` : `${formatKz(price)} (pacote)`],
      ["Data pretendida", formatDatePt(d.date)],
      ["Hora pretendida", d.time],
      [isRaw ? "Duração" : "Duração pretendida (a confirmar)", `${d.hours} ${d.hours === 1 ? "hora" : "horas"}`],
      ["Tipo de gravação", d.type],
      ["Participantes", d.participants],
      ["Observações", d.notes],
    ],
    isRaw
      ? "Gravação bruta: sem edição, montagem ou pós-produção. Aguardo confirmação da disponibilidade. Obrigado!"
      : "Condições do pacote (duração, revisões, prazos) a confirmar pela equipa. Aguardo confirmação da disponibilidade. Obrigado!",
  );
}
