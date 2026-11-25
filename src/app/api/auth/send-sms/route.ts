import { NextResponse } from "next/server";

import { sendWhatsAppCode, verifyHookSignature } from "@/lib/whatsapp-otp";

/**
 * Hook "Send SMS" de Supabase Auth: Supabase genera el código (registro,
 * recuperación, cambio de celular) y nos lo manda aquí; lo enviamos por WhatsApp.
 * Configuración: Supabase > Authentication > Auth Hooks > Send SMS > HTTPS,
 * URL https://<dominio>/api/auth/send-sms. Sin la firma correcta no se envía nada.
 */

interface HookPayload {
  user?: { phone?: string };
  // `phone` es el número al que Supabase decidió mandar ESTE código
  // (en cambio de celular, el nuevo; en registro, login o recuperación, el actual).
  sms?: { otp?: string; phone?: string };
}

function hookError(message: string, httpCode = 500) {
  // Supabase espera este formato (y siempre JSON) para mostrar el error
  return NextResponse.json({ error: { http_code: httpCode, message } }, { status: httpCode });
}

export async function POST(request: Request) {
  const secret = process.env.SEND_SMS_HOOK_SECRET;
  if (!secret) {
    console.error("send-sms: falta SEND_SMS_HOOK_SECRET");
    return hookError("El envío de códigos no está configurado.");
  }

  const body = await request.text();
  if (!(await verifyHookSignature(request.headers, body, secret))) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  let payload: HookPayload;
  try {
    payload = JSON.parse(body) as HookPayload;
  } catch {
    return hookError("Solicitud inválida.", 400);
  }

  const code = payload.sms?.otp ?? "";
  // No usar user.new_phone: se queda guardado si un cambio de celular no se terminó,
  // y entonces los códigos de login o recuperación se irían a ese número.
  const to = (payload.sms?.phone || payload.user?.phone || "").replace(/\D/g, "");
  if (!/^\d{6}$/.test(code) || !/^52\d{10}$/.test(to)) {
    return hookError("Solo podemos enviar códigos a celulares de México.", 400);
  }

  try {
    await sendWhatsAppCode(to, code);
  } catch (e) {
    console.error("send-sms:", e instanceof Error ? e.message : e);
    return hookError("No pudimos enviar el código por WhatsApp. Intenta de nuevo en un momento.");
  }
  return NextResponse.json({}, { headers: { "Cache-Control": "no-store" } });
}
