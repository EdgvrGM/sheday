"use client";

import type { User } from "@supabase/supabase-js";
import { useState } from "react";

import { useToast } from "@/components/toast";
import { Button, ErrorBox, Field } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { emailInput, isValidEmail, MAX } from "@/lib/input";
import { getSupabase } from "@/lib/supabase/browser";

/** Correo opcional de respaldo (para recuperar la contraseña sin WhatsApp). */
export function EmailSection({ user }: { user: User }) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const saved = user.email ?? "";
  const pending = user.new_email ?? "";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isValidEmail(email)) return setError("Revisa el correo, por ejemplo ana@gmail.com.");
    if (email === saved) return setError("Ese ya es tu correo.");
    setSaving(true);
    const { error } = await getSupabase().auth.updateUser(
      { email },
      { emailRedirectTo: `${window.location.origin}/cuenta` }
    );
    setSaving(false);
    if (error) return setError(errorMessage(error));
    setEmail("");
    toast(`Te mandamos un enlace a ${email} para confirmarlo.`);
  }

  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-3">
      <h2 className="font-bold">Correo de respaldo (opcional)</h2>
      <p className="text-sm text-muted">
        {saved ? (
          <>
            Tu correo es <span className="break-all font-semibold text-ink">{saved}</span>. Te sirve para recuperar tu
            contraseña si no puedes recibir WhatsApp.
          </>
        ) : (
          "Agrégalo por si algún día no puedes recibir WhatsApp y necesitas recuperar tu contraseña."
        )}
      </p>
      {pending && (
        <p role="status" className="rounded-xl bg-warning-soft p-3 text-sm text-warning">
          Falta confirmar <span className="break-all font-semibold">{pending}</span>. Abre el enlace que te mandamos (revisa
          también la carpeta de spam).
        </p>
      )}
      {error && <ErrorBox message={error} />}
      <Field
        label={saved ? "Correo nuevo" : "Correo"}
        type="email"
        inputMode="email"
        value={email}
        onChange={(e) => {
          setEmail(emailInput(e.target.value));
          setError(null);
        }}
        autoComplete="email"
        maxLength={MAX.email}
        placeholder="ana@gmail.com"
      />
      <Button type="submit" kind="secondary" loading={saving} disabled={!email}>
        {saved ? "Cambiar correo" : "Agregar correo"}
      </Button>
    </form>
  );
}
