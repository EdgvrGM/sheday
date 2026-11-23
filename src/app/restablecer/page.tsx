"use client";

import { KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toast";
import { Button, ButtonLink, EmptyState, ErrorBox, Field, PageTitle, Spinner } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { getSupabase } from "@/lib/supabase/browser";

/** Destino del enlace de "Recuperar contraseña" (Supabase abre una sesión temporal). */
export default function ResetPasswordPage() {
  const { session, initializing } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (initializing) return <Spinner />;
  if (!session) {
    return (
      <EmptyState icon={KeyRound} title="Enlace inválido o vencido" message="Pide un enlace nuevo para restablecer tu contraseña.">
        <ButtonLink href="/recuperar">Pedir otro enlace</ButtonLink>
      </EmptyState>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) return setError("La contraseña debe tener al menos 6 caracteres.");
    if (password !== confirm) return setError("Las contraseñas no coinciden.");
    setLoading(true);
    const { error } = await getSupabase().auth.updateUser({ password });
    setLoading(false);
    if (error) return setError(errorMessage(error));
    toast("Contraseña actualizada");
    router.replace("/");
  }

  return (
    <form onSubmit={submit} className="mx-auto flex w-full max-w-md flex-col gap-4 py-4">
      <PageTitle>Nueva contraseña</PageTitle>
      {error && <ErrorBox message={error} />}
      <Field label="Contraseña nueva" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
      <Field label="Repite la contraseña" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
      <Button type="submit" loading={loading}>
        Guardar
      </Button>
    </form>
  );
}
