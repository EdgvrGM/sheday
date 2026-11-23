"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { PasswordField, PhoneField } from "@/components/form-fields";
import { Button, ButtonLink, EmptyState, ErrorBox, Field, PageTitle, TextArea } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { emailInput, isValidEmail, isValidName, isValidPhone, MAX, nameInput, textInput } from "@/lib/input";
import { getSupabase } from "@/lib/supabase/browser";

export function RegisterForm({ next }: { next: string }) {
  const router = useRouter();
  const { session } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Errores junto a cada campo (se muestran al intentar enviar)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<"name" | "phone" | "email" | "password", string>>>({});
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    if (session) router.replace(next);
  }, [session, next, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const errs: typeof fieldErrors = {};
    if (!isValidName(fullName)) errs.name = "Escribe tu nombre.";
    if (!isValidPhone(phone)) errs.phone = phone ? `Faltan ${10 - phone.length} dígitos.` : "Escribe tu celular.";
    if (!isValidEmail(email)) errs.email = email ? "Revisa el correo, por ejemplo ana@gmail.com." : "Escribe tu correo.";
    if (password.length < 6) errs.password = "Usa al menos 6 caracteres.";
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      // Lleva el foco al primer campo con error (después de pintar los errores)
      const form = e.currentTarget as HTMLFormElement;
      setTimeout(() => form.querySelector<HTMLElement>("[aria-invalid=true]")?.focus(), 0);
      return;
    }

    setLoading(true);
    const { data, error } = await getSupabase().auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName.trim(), phone, address: address.trim() },
        emailRedirectTo: `${window.location.origin}/login${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`,
      },
    });
    setLoading(false);
    if (error) {
      // El índice único de celulares hace fallar el alta con este error genérico
      if (error.message.includes("Database error saving new user")) {
        return setError("Ese celular ya tiene una cuenta. Inicia sesión o recupera tu contraseña.");
      }
      return setError(errorMessage(error));
    }
    // Con "Confirm email" activo en Supabase, no hay sesión hasta verificar
    if (!data.session) setCheckEmail(true);
  }

  if (checkEmail) {
    return (
      <EmptyState
        icon={MailCheck}
        title="Confirma tu correo"
        message={`Te enviamos un enlace a ${email}. Ábrelo para activar tu cuenta y después inicia sesión con tu celular y contraseña. Si no lo ves, revisa la carpeta de spam.`}>
        <ButtonLink href="/login">Ir a iniciar sesión</ButtonLink>
      </EmptyState>
    );
  }

  const nextQuery = next !== "/" ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <form onSubmit={submit} noValidate className="mx-auto flex w-full max-w-md flex-col gap-4 py-4">
      <PageTitle sub="Iniciarás sesión con tu celular. Tu correo sirve para confirmar tu cuenta y recuperar tu contraseña.">
        Crea tu cuenta
      </PageTitle>
      {error && <ErrorBox message={error} />}
      <Field
        label="Nombre completo"
        value={fullName}
        onChange={(e) => {
          setFullName(nameInput(e.target.value));
          setFieldErrors((f) => ({ ...f, name: undefined }));
        }}
        error={fieldErrors.name}
        autoComplete="name"
        autoCapitalize="words"
        maxLength={MAX.name}
        required
      />
      <PhoneField
        label="Celular (WhatsApp)"
        value={phone}
        onChange={(v) => {
          setPhone(v);
          setFieldErrors((f) => ({ ...f, phone: undefined }));
        }}
        hint="Con este número iniciarás sesión."
        error={fieldErrors.phone}
        required
      />
      <Field
        label="Correo"
        type="email"
        inputMode="email"
        value={email}
        onChange={(e) => {
          setEmail(emailInput(e.target.value));
          setFieldErrors((f) => ({ ...f, email: undefined }));
        }}
        error={fieldErrors.email}
        autoComplete="email"
        maxLength={MAX.email}
        hint="Te enviaremos un enlace para confirmar tu cuenta."
        required
      />
      <PasswordField
        label="Contraseña"
        value={password}
        onChange={(v) => {
          setPassword(v);
          setFieldErrors((f) => ({ ...f, password: undefined }));
        }}
        autoComplete="new-password"
        hint="Mínimo 6 caracteres"
        error={fieldErrors.password}
        minLength={6}
        required
      />
      <TextArea
        label="Dirección de entrega (opcional)"
        value={address}
        onChange={(e) => setAddress(textInput(e.target.value, MAX.address))}
        maxLength={MAX.address}
        placeholder="Calle, número, colonia, referencias"
        autoComplete="street-address"
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
