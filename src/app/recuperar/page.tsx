"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button, EmptyState, ErrorBox, Field, PageTitle } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { getSupabase } from "@/lib/supabase/browser";

export default function RecoverPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim(), {
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
        message={`Si ${email} tiene cuenta, te llegará un enlace para crear una contraseña nueva. Ábrelo desde este mismo dispositivo.`}
      />
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto flex w-full max-w-md flex-col gap-4 py-4">
      <PageTitle sub="Te enviaremos un enlace para crear una nueva.">Recuperar contraseña</PageTitle>
      {error && <ErrorBox message={error} />}
      <Field label="Correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      <Button type="submit" loading={loading}>
        Enviar enlace
      </Button>
      <Link href="/login" className="text-center text-sm text-brand">
        Volver a iniciar sesión
      </Link>
    </form>
  );
}
