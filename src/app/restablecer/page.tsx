"use client";

import { KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toast";
import { PasswordField } from "@/components/form-fields";
import { Button, ButtonLink, EmptyState, ErrorBox, PageTitle, Spinner } from "@/components/ui";
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
    <form onSubmit={submit} noValidate className="mx-auto flex w-full max-w-md flex-col gap-4 py-4">
      <PageTitle>Nueva contraseña</PageTitle>
      {error && <ErrorBox message={error} />}
      <PasswordField
        label="Contraseña nueva"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        hint="Mínimo 6 caracteres"
        minLength={6}
        required
      />
      <PasswordField
        label="Repite la contraseña"
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
        error={confirm.length > 0 && confirm !== password ? "Las contraseñas no coinciden" : null}
        required
      />
      <Button type="submit" loading={loading}>
        Guardar
      </Button>
    </form>
  );
}
