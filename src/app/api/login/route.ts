import { NextResponse } from "next/server";

import { errorMessage } from "@/lib/errors";
import { digitsOnly } from "@/lib/format";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getPublicSupabase } from "@/lib/supabase/public";

const INVALID = "Celular o contraseña incorrectos.";

/**
 * Inicio de sesión con celular + contraseña.
 * El navegador manda { identifier, password }; aquí se busca el correo
 * de esa cuenta (con la llave secreta) y se valida la contraseña.
 * El correo nunca se envía al navegador: solo los tokens de sesión.
 * `identifier` también acepta un correo (cuentas antiguas / admin).
 */
export async function POST(request: Request) {
  let identifier = "";
  let password = "";
  try {
    const body = (await request.json()) as { identifier?: unknown; password?: unknown };
    identifier = typeof body.identifier === "string" ? body.identifier.trim() : "";
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  if (!identifier || !password) {
    return NextResponse.json({ error: "Escribe tu celular y contraseña." }, { status: 400 });
  }

  let email = identifier;
  if (!identifier.includes("@")) {
    if (digitsOnly(identifier).length < 10) {
      return NextResponse.json({ error: "Escribe tu celular a 10 dígitos." }, { status: 400 });
    }
    try {
      const { data, error } = await getAdminSupabase().rpc("auth_email_for_phone", { p_phone: identifier });
      if (error) throw error;
      if (!data) return NextResponse.json({ error: INVALID }, { status: 401 });
      email = data as string;
    } catch (e) {
      console.error("auth_email_for_phone", e);
      return NextResponse.json({ error: "No pudimos iniciar sesión. Intenta de nuevo en un momento." }, { status: 500 });
    }
  }

  const { data, error } = await getPublicSupabase().auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    const msg = error?.message ?? "";
    if (msg.includes("Email not confirmed")) {
      return NextResponse.json(
        { error: "Confirma tu correo antes de iniciar sesión. Revisa tu bandeja de entrada (y spam)." },
        { status: 403 }
      );
    }
    if (msg.includes("Invalid login credentials")) return NextResponse.json({ error: INVALID }, { status: 401 });
    return NextResponse.json({ error: errorMessage(error) }, { status: error?.status ?? 500 });
  }

  return NextResponse.json(
    { access_token: data.session.access_token, refresh_token: data.session.refresh_token },
    { headers: { "Cache-Control": "no-store" } }
  );
}
