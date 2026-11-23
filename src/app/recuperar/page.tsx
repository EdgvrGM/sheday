"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button, EmptyState, ErrorBox, Field, PageTitle } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { emailInput, isValidEmail, MAX } from "@/lib/input";
import { getSupabase } from "@/lib/supabase/browser";

export default function RecoverPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isValidEmail(email)) return setError("Escribe un correo válido, por ejemplo ana@gmail.com.");
    setLoading(true);
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/restablecer`,
    });
    setLoading(false);
    if (error) return setError(errorMessage(error));
    setSent(true);
  }

  if (sent) {
    return (
      <EmptyState
        icon={MailCheck}
        title="Revisa tu correo"
        message={`Si ${email} tiene cuenta, te llegará un enlace para crear una contraseña nueva. Ábrelo desde este mismo dispositivo; después inicias sesión con tu celular y la contraseña nueva.`}
      />
    );
  }

  return (
    <form onSubmit={submit} noValidate className="mx-auto flex w-full max-w-md flex-col gap-4 py-4">
      <PageTitle sub="Te enviaremos un enlace para crear una nueva.">Recuperar contraseña</PageTitle>
      {error && <ErrorBox message={error} />}
      <Field
        label="Correo con el que te registraste"
        type="email"
        inputMode="email"
        value={email}
        onChange={(e) => setEmail(emailInput(e.target.value))}
        maxLength={MAX.email}
        autoComplete="email"
        hint="¿No lo recuerdas? Escríbenos por WhatsApp y te ayudamos."
        required
      />
      <Button type="submit" loading={loading}>
        Enviar enlace
      </Button>
      <Link href="/login" className="text-center text-sm text-brand">
        Volver a iniciar sesión
      </Link>
    </form>
  );
}
