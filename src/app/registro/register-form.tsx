"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { useCaptcha } from "@/components/captcha";
import { PasswordField, PhoneField } from "@/components/form-fields";
import { OtpForm } from "@/components/otp-form";
import { useToast } from "@/components/toast";
import { Button, ErrorBox, Field, PageTitle, TextArea } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { authPhone, emailInput, isValidEmail, isValidName, isValidPhone, MAX, nameInput, textInput } from "@/lib/input";
import { getSupabase } from "@/lib/supabase/browser";

const DUPLICATE_PHONE = "Ese celular ya tiene una cuenta. Inicia sesión o recupera tu contraseña.";

export function RegisterForm({ next }: { next: string }) {
  const router = useRouter();
  const toast = useToast();
  const { session } = useAuth();
  const captcha = useCaptcha();
  const [step, setStep] = useState<"form" | "code">("form");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Errores junto a cada campo (se muestran al intentar enviar)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<"name" | "phone" | "email" | "password", string>>>({});
  const [loading, setLoading] = useState(false);
  // Mientras se termina el alta (correo opcional), no redirigir todavía
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    if (session && !finishing) router.replace(next);
  }, [session, finishing, next, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const errs: typeof fieldErrors = {};
    if (!isValidName(fullName)) errs.name = "Escribe tu nombre.";
    if (!isValidPhone(phone)) errs.phone = phone ? `Faltan ${10 - phone.length} dígitos.` : "Escribe tu celular.";
    if (email && !isValidEmail(email)) errs.email = "Revisa el correo, por ejemplo ana@gmail.com.";
    if (password.length < 6) errs.password = "Usa al menos 6 caracteres.";
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      // Lleva el foco al primer campo con error (después de pintar los errores)
      const form = e.currentTarget as HTMLFormElement;
      setTimeout(() => form.querySelector<HTMLElement>("[aria-invalid=true]")?.focus(), 0);
      return;
    }

    setLoading(true);
    let captchaToken: string | undefined;
    try {
      captchaToken = await captcha.getToken();
    } catch (err) {
      setLoading(false);
      return setError(errorMessage(err));
    }
    const { data, error } = await getSupabase().auth.signUp({
      phone: authPhone(phone),
      password,
      options: { data: { full_name: fullName.trim(), phone, address: address.trim() }, captchaToken },
    });
    setLoading(false);
    if (error) {
      // El índice único de celulares de profiles hace fallar el alta con este error genérico
      if (error.message.includes("Database error saving new user")) return setError(DUPLICATE_PHONE);
      return setError(errorMessage(error));
    }
    // Si el celular ya estaba verificado, Supabase responde sin error pero sin identidades
    if (data.user && data.user.identities?.length === 0) return setError(DUPLICATE_PHONE);
    setStep("code");
  }

  async function verify(code: string): Promise<string | null> {
    setFinishing(true);
    const supabase = getSupabase();
    const { error } = await supabase.auth.verifyOtp({ phone: authPhone(phone), token: code, type: "sms" });
    if (error) {
      setFinishing(false);
      return errorMessage(error);
    }
    // Correo opcional: Supabase manda un enlace para confirmarlo
    if (email) {
      const { error: emailError } = await supabase.auth.updateUser(
        { email },
        { emailRedirectTo: `${window.location.origin}/cuenta` }
      );
      if (emailError) toast(`Tu cuenta quedó lista, pero no pudimos guardar el correo: ${errorMessage(emailError)}`, "error");
      else toast("Cuenta creada. Te mandamos un enlace para confirmar tu correo.");
    } else {
      toast("Cuenta creada");
    }
    setFinishing(false);
    return null;
  }

  async function resend(): Promise<string | null> {
    try {
      const captchaToken = await captcha.getToken();
      const { error } = await getSupabase().auth.resend({ type: "sms", phone: authPhone(phone), options: { captchaToken } });
      return error ? errorMessage(error) : null;
    } catch (err) {
      return errorMessage(err);
    }
  }

  const nextQuery = next !== "/" ? `?next=${encodeURIComponent(next)}` : "";

  if (step === "code") {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 py-4">
        <PageTitle sub="Es el último paso para crear tu cuenta.">Confirma tu celular</PageTitle>
        <OtpForm
          phone={phone}
          onVerify={verify}
          onResend={resend}
          onBack={() => setStep("form")}
          submitLabel="Crear cuenta"
        />
        {captcha.widget}
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="mx-auto flex w-full max-w-md flex-col gap-4 py-4">
      <PageTitle sub="Iniciarás sesión con tu celular. Te mandaremos un código por WhatsApp para confirmarlo.">
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
        hint="Con este número iniciarás sesión. Debe tener WhatsApp."
        error={fieldErrors.phone}
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
      <Field
        label="Correo (opcional)"
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
        hint="Por si algún día no puedes recibir WhatsApp y necesitas recuperar tu contraseña."
      />
      <TextArea
        label="Dirección de entrega (opcional)"
        value={address}
        onChange={(e) => setAddress(textInput(e.target.value, MAX.address))}
        maxLength={MAX.address}
        placeholder="Calle, número, colonia, referencias"
        autoComplete="street-address"
      />
      {captcha.widget}
      <Button type="submit" loading={loading}>
        Enviar código por WhatsApp
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
