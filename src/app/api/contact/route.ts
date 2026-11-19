import { NextResponse } from "next/server";
import { validateContact, type ContactData } from "@/lib/validation";

/**
 * Recebe o formulário de contacto e reencaminha-o (JSON) para CONTACT_WEBHOOK_URL
 * — por exemplo um fluxo n8n/Make/Zapier que envia e-mail para comercial@viralizahost.com.
 * Sem webhook configurado responde 503 e o cliente usa WhatsApp/e-mail como alternativa.
 */
export async function POST(req: Request) {
  let body: Partial<ContactData>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const data: ContactData = {
    name: String(body.name ?? "").slice(0, 120),
    email: String(body.email ?? "").slice(0, 160),
    phone: String(body.phone ?? "").slice(0, 40),
    subject: String(body.subject ?? "").slice(0, 120),
    message: String(body.message ?? "").slice(0, 4000),
  };
  const errors = validateContact(data);
  if (Object.keys(errors).length) return NextResponse.json({ ok: false, errors }, { status: 422 });

  const hook = process.env.CONTACT_WEBHOOK_URL;
  if (!hook) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });

  try {
    const res = await fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, source: "viraliza-audiovisual", receivedAt: new Date().toISOString() }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return NextResponse.json({ ok: false, error: "upstream" }, { status: 502 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "upstream" }, { status: 502 });
  }
}
