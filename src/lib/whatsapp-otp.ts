import "server-only";

// Envío del código de verificación por la API de WhatsApp de Meta (Cloud API)
// y verificación de la firma del hook "Send SMS" de Supabase Auth.
// Variables (solo servidor; en Cloudflare van como *Secret* de runtime):
//   SEND_SMS_HOOK_SECRET      "v1,whsec_…" (Supabase > Auth Hooks > Send SMS)
//   WHATSAPP_TOKEN            token permanente del usuario del sistema (Meta)
//   WHATSAPP_PHONE_NUMBER_ID  id del número remitente (WhatsApp > Configuración de la API)
//   WHATSAPP_TEMPLATE         nombre de la plantilla de autenticación (sheday_codigo)
//   WHATSAPP_TEMPLATE_LANG    idioma de la plantilla (es_MX)
//   WHATSAPP_API_VERSION      versión de la Graph API (v23.0)

const encoder = new TextEncoder();

function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes: ArrayBuffer): string {
  let bin = "";
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b);
  return btoa(bin);
}

/** Comparación en tiempo constante (evita filtrar la firma por tiempos). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Verifica la firma Standard Webhooks que manda Supabase:
 * HMAC-SHA256 de "{webhook-id}.{webhook-timestamp}.{body}" con el secreto
 * (base64, sin el prefijo "v1,whsec_"). `webhook-signature` trae una o más
 * firmas "v1,<base64>" separadas por espacio. Rechaza si pasaron más de 5 min.
 */
export async function verifyHookSignature(headers: Headers, body: string, secret: string): Promise<boolean> {
  const id = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const signatures = headers.get("webhook-signature");
  if (!id || !timestamp || !signatures) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 5 * 60) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    base64ToBytes(secret.replace(/^v1,whsec_/, "")),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(`${id}.${timestamp}.${body}`));
  const expected = bytesToBase64(mac);

  return signatures
    .split(" ")
    .map((s) => s.split(",", 2))
    .some(([version, sig]) => version === "v1" && !!sig && safeEqual(sig, expected));
}

export class WhatsAppError extends Error {}

/**
 * Manda la plantilla de autenticación (botón "Copiar código") con el código.
 * `to`: número con lada de país, solo dígitos ("523312345678").
 */
export async function sendWhatsAppCode(to: string, code: string): Promise<void> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) throw new WhatsAppError("Faltan WHATSAPP_TOKEN o WHATSAPP_PHONE_NUMBER_ID.");

  const version = process.env.WHATSAPP_API_VERSION || "v23.0";
  const res = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "template",
      template: {
        name: process.env.WHATSAPP_TEMPLATE || "sheday_codigo",
        language: { code: process.env.WHATSAPP_TEMPLATE_LANG || "es_MX" },
        components: [
          { type: "body", parameters: [{ type: "text", text: code }] },
          // El botón "Copiar código" también recibe el código
          { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] },
        ],
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new WhatsAppError(`Meta respondió ${res.status}: ${detail.slice(0, 500)}`);
  }
}
