/** Validações simples e testáveis (sem dependências). Mensagens em português. */

export type Errors<T extends string> = Partial<Record<T, string>>;

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

/** Aceita números angolanos (9 dígitos, começando por 9) e internacionais com indicativo. */
export function isPhone(v: string) {
  const digits = v.replace(/[^\d]/g, "");
  if (/^9\d{8}$/.test(digits)) return true;
  if (/^2449\d{8}$/.test(digits)) return true;
  return digits.length >= 9 && digits.length <= 15 && /^\+?[\d\s().-]+$/.test(v.trim());
}

/** Data em formato ISO (aaaa-mm-dd) igual ou posterior a hoje. */
export function isFutureOrToday(iso: string, today = new Date()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return false;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return d.getTime() >= t.getTime();
}

export function todayIso(today = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${today.getFullYear()}-${p(today.getMonth() + 1)}-${p(today.getDate())}`;
}

export type BookingData = {
  name: string;
  company: string;
  phone: string;
  email: string;
  date: string;
  time: string;
  hours: number;
  type: string;
  participants: number;
  notes: string;
};

export function validateBooking(d: BookingData, maxHours = 12): Errors<keyof BookingData> {
  const e: Errors<keyof BookingData> = {};
  if (d.name.trim().length < 3) e.name = "Indique o seu nome completo.";
  if (!isPhone(d.phone)) e.phone = "Indique um número de telefone/WhatsApp válido.";
  if (d.email.trim() && !isEmail(d.email)) e.email = "O e-mail não parece válido.";
  if (!d.date) e.date = "Escolha a data pretendida.";
  else if (!isFutureOrToday(d.date)) e.date = "A data não pode estar no passado.";
  if (!/^\d{2}:\d{2}$/.test(d.time)) e.time = "Escolha a hora pretendida.";
  if (!Number.isInteger(d.hours) || d.hours < 1 || d.hours > maxHours) e.hours = `Entre 1 e ${maxHours} horas.`;
  if (!d.type) e.type = "Escolha o tipo de gravação.";
  if (!Number.isInteger(d.participants) || d.participants < 1 || d.participants > 20) e.participants = "Entre 1 e 20 participantes.";
  return e;
}

export type ContactData = { name: string; email: string; phone: string; subject: string; message: string };

export function validateContact(d: ContactData): Errors<keyof ContactData> {
  const e: Errors<keyof ContactData> = {};
  if (d.name.trim().length < 2) e.name = "Indique o seu nome.";
  if (!d.email.trim() && !d.phone.trim()) e.email = "Indique um e-mail ou telefone para lhe respondermos.";
  if (d.email.trim() && !isEmail(d.email)) e.email = "O e-mail não parece válido.";
  if (d.phone.trim() && !isPhone(d.phone)) e.phone = "O número não parece válido.";
  if (d.message.trim().length < 10) e.message = "Escreva uma mensagem com pelo menos 10 caracteres.";
  return e;
}
