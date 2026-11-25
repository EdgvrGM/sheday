"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useCaptcha } from "@/components/captcha";
import { PhoneField } from "@/components/form-fields";
import { OtpForm } from "@/components/otp-form";
import { Button, EmptyState, ErrorBox, Field, PageTitle } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { authPhone, emailInput, isValidEmail, isValidPhone, MAX } from "@/lib/input";
import { getSupabase } from "@/lib/supabase/browser";

/**
 * Recuperar contraseña: código por WhatsApp (abre una sesión y lleva a
 * /restablecer) o, si la clienta registró un correo, enlace por correo.
 */
export default function RecoverPage() {
  const router = useRouter();
  const captcha = useCaptcha();
  const [useEmail, setUseEmail] = useState(false);
  const [step, setStep] = useState<"form" | "code" | "emailSent">("form");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendCode(): Promise<string | null> {
    try {
      const captchaToken = await captcha.getToken();
      const { error } = await getSupabase().auth.signInWithOtp({
        phone: authPhone(phone),
        options: { shouldCreateUser: false, captchaToken },
      });
      return error ? errorMessage(error) : null;
    } catch (err) {
      return errorMessage(err);
    }
  }

  async function sendEmail(): Promise<string | null> {
    try {
      const captchaToken = await captcha.getToken();
      const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/restablecer`,
        captchaToken,
      });
      return error ? errorMessage(error) : null;
    } catch (err) {
      return errorMessage(err);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (useEmail) {
      if (!isValidEmail(email)) return setError("Escribe un correo válido, por ejemplo ana@gmail.com.");
      setLoading(true);
      const err = await sendEmail();
      setLoading(false);
      if (err) return setError(err);
      return setStep("emailSent");
    }

    if (!isValidPhone(phone)) return setError("Escribe tu celular a 10 dígitos.");
    setLoading(true);
    const err = await sendCode();
    setLoading(false);
    if (err) return setError(err);
    setStep("code");
  }

  async function verify(code: string): Promise<string | null> {
    const { error } = await getSupabase().auth.verifyOtp({ phone: authPhone(phone), token: code, type: "sms" });
    if (error) return errorMessage(error);
    router.replace("/restablecer");
    return null;
  }

  if (step === "emailSent") {
    return (
      <EmptyState
        icon={MailCheck}
        title="Revisa tu correo"
        message={`Si ${email} tiene cuenta, te llegará un enlace para crear una contraseña nueva. Ábrelo desde este mismo dispositivo; después inicias sesión con tu celular y la contraseña nueva.`}
      />
    );
  }

  if (step === "code") {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 py-4">
        <PageTitle sub="Después podrás crear una contraseña nueva.">Recuperar contraseña</PageTitle>
        <OtpForm phone={phone} onVerify={verify} onResend={sendCode} onBack={() => setStep("form")} />
        {captcha.widget}
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="mx-auto flex w-full max-w-md flex-col gap-4 py-4">
      <PageTitle
        sub={
          useEmail
            ? "Te enviaremos un enlace para crear una contraseña nueva."
            : "Te mandaremos un código por WhatsApp para crear una contraseña nueva."
        }>
        Recuperar contraseña
      </PageTitle>
      {error && <ErrorBox message={error} />}
      {useEmail ? (
        <Field
          label="Correo que registraste"
          type="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(emailInput(e.target.value))}
          maxLength={MAX.email}
          autoComplete="email"
          hint="Solo funciona si agregaste un correo a tu cuenta."
          required
        />
      ) : (
        <PhoneField label="Celular con el que te registraste" value={phone} onChange={setPhone} required />
      )}
      {captcha.widget}
      <Button type="submit" loading={loading}>
        {useEmail ? "Enviar enlace" : "Enviar código por WhatsApp"}
      </Button>
      <button
        type="button"
        onClick={() => {
          setUseEmail(!useEmail);
          setError(null);
        }}
        className="min-h-11 text-sm text-muted underline-offset-2 hover:underline">
        {useEmail ? "Mejor recibir un código por WhatsApp" : "Prefiero recibir un enlace por correo"}
      </button>
      <Link href="/login" className="text-center text-sm text-brand">
        Volver a iniciar sesión
      </Link>
    </form>
  );
}
