"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { PasswordField, PhoneField } from "@/components/form-fields";
import { Button, ErrorBox, Field, PageTitle } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { emailInput, isValidEmail, isValidPhone, MAX } from "@/lib/input";
import { getSupabase } from "@/lib/supabase/browser";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const { session } = useAuth();
  const [useEmail, setUseEmail] = useState(false);
  const [phone, setPhone] = useState("");
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
    if (useEmail ? !isValidEmail(email) : !isValidPhone(phone)) {
      return setError(useEmail ? "Escribe un correo válido." : "Escribe tu celular a 10 dígitos.");
    }
    if (!password) return setError("Escribe tu contraseña.");

    setLoading(true);
    try {
      // El servidor busca la cuenta por celular y valida la contraseña
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: useEmail ? email : phone, password }),
      });
      const body = (await res.json()) as { error?: string; access_token?: string; refresh_token?: string };
      if (!res.ok || !body.access_token || !body.refresh_token) {
        setError(body.error ?? "No pudimos iniciar sesión.");
        return;
      }
      const { error } = await getSupabase().auth.setSession({
        access_token: body.access_token,
        refresh_token: body.refresh_token,
      });
      if (error) setError(errorMessage(error));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const nextQuery = next !== "/" ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <form onSubmit={submit} noValidate className="mx-auto flex w-full max-w-md flex-col gap-4 py-4">
      <PageTitle sub="Entra con tu celular para hacer tu pedido.">Inicia sesión</PageTitle>
      {error && <ErrorBox message={error} />}
      {useEmail ? (
        <Field
          label="Correo"
          type="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(emailInput(e.target.value))}
          autoComplete="username"
          maxLength={MAX.email}
          required
        />
      ) : (
        <PhoneField label="Celular" value={phone} onChange={setPhone} autoComplete="username" hint="" required />
      )}
      <PasswordField
        label="Contraseña"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
        required
      />
      <div className="-mt-2 flex justify-between text-sm">
        <button
          type="button"
          onClick={() => {
            setUseEmail(!useEmail);
            setError(null);
          }}
          className="text-muted underline-offset-2 hover:underline">
          {useEmail ? "Entrar con celular" : "Entrar con correo"}
        </button>
        <Link href="/recuperar" className="text-brand">
          ¿Olvidaste tu contraseña?
        </Link>
      </div>
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
