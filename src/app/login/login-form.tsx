"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { Button, ErrorBox, Field, PageTitle } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { getSupabase } from "@/lib/supabase/browser";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const { session } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Si ya hay sesión (o se acaba de iniciar), continuar
  useEffect(() => {
    if (session) router.replace(next);
  }, [session, next, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) setError(errorMessage(error));
  }

  const nextQuery = next !== "/" ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <form onSubmit={submit} className="mx-auto flex w-full max-w-md flex-col gap-4 py-4">
      <PageTitle sub="Inicia sesión para hacer tu pedido.">Hola de nuevo 👋</PageTitle>
      {error && <ErrorBox message={error} />}
      <Field label="Correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      <Field
        label="Contraseña"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        required
      />
      <Link href="/recuperar" className="-mt-2 self-end text-sm text-brand">
        ¿Olvidaste tu contraseña?
      </Link>
      <Button type="submit" loading={loading}>
        Iniciar sesión
      </Button>
      <p className="text-center text-sm">
        ¿No tienes cuenta?{" "}
        <Link href={`/registro${nextQuery}`} className="font-semibold text-brand">
          Regístrate
        </Link>
      </p>
    </form>
  );
}
