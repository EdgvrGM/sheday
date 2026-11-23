"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { Button, EmptyState, ErrorBox, Field, PageTitle, TextArea } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { digitsOnly } from "@/lib/format";
import { getSupabase } from "@/lib/supabase/browser";

export function RegisterForm({ next }: { next: string }) {
  const router = useRouter();
  const { session } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    if (session) router.replace(next);
  }, [session, next, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!fullName.trim()) return setError("Escribe tu nombre.");
    if (digitsOnly(phone).length < 10) return setError("Escribe tu celular a 10 dígitos.");
    if (password.length < 6) return setError("La contraseña debe tener al menos 6 caracteres.");

    setLoading(true);
    const { data, error } = await getSupabase().auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim(), phone: phone.trim(), address: address.trim() },
        emailRedirectTo: `${window.location.origin}${next}`,
      },
    });
    setLoading(false);
    if (error) return setError(errorMessage(error));
    // Si Supabase pide confirmar el correo, no hay sesión todavía
    if (!data.session) setCheckEmail(true);
  }

  if (checkEmail) {
    return (
      <EmptyState
        icon={MailCheck}
        title="Revisa tu correo"
        message={`Te enviamos un enlace a ${email} para confirmar tu cuenta. Ábrelo desde este mismo dispositivo.`}
      />
    );
  }

  const nextQuery = next !== "/" ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <form onSubmit={submit} className="mx-auto flex w-full max-w-md flex-col gap-4 py-4">
      <PageTitle sub="Usaremos tus datos para coordinar la entrega por WhatsApp.">Crea tu cuenta</PageTitle>
      {error && <ErrorBox message={error} />}
      <Field label="Nombre completo" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" required />
      <Field
        label="Celular (WhatsApp)"
        type="tel"
        inputMode="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        autoComplete="tel"
        placeholder="10 dígitos"
        required
      />
      <TextArea
        label="Dirección de entrega (opcional)"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="Calle, número, colonia, referencias"
        autoComplete="street-address"
      />
      <Field label="Correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      <Field
        label="Contraseña"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
        hint="Mínimo 6 caracteres"
        required
      />
      <Button type="submit" loading={loading}>
        Crear cuenta
      </Button>
      <p className="text-center text-sm">
        ¿Ya tienes cuenta?{" "}
        <Link href={`/login${nextQuery}`} className="font-semibold text-brand">
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}
