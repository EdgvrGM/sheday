"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { useCaptcha } from "@/components/captcha";
import { PasswordField, PhoneField } from "@/components/form-fields";
import { OtpForm } from "@/components/otp-form";
import { Button, ErrorBox, Field, PageTitle } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { authPhone, emailInput, isValidEmail, isValidPhone, MAX } from "@/lib/input";
import { getSupabase } from "@/lib/supabase/browser";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const { session } = useAuth();
  const captcha = useCaptcha();
  const [useEmail, setUseEmail] = useState(false);
  // "code": la cuenta existe pero el celular no se confirmó al registrarse
  const [step, setStep] = useState<"form" | "code">("form");
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
    const supabase = getSupabase();
    let error;
    try {
      const captchaToken = await captcha.getToken();
      ({ error } = useEmail
        ? await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } })
        : await supabase.auth.signInWithPassword({ phone: authPhone(phone), password, options: { captchaToken } }));
    } catch (e) {
      setLoading(false);
      return setError(errorMessage(e));
    }
    if (!error) return; // el efecto de sesión redirige

    if (!useEmail && error.message.includes("Phone not confirmed")) {
      // Se registró pero no escribió el código: mandar uno nuevo
      const resendError = await resend();
      setLoading(false);
      if (resendError) return setError(resendError);
      return setStep("code");
    }
    setLoading(false);
    if (error.message.includes("Invalid login credentials")) {
      return setError(useEmail ? "Correo o contraseña incorrectos." : "Celular o contraseña incorrectos.");
    }
    setError(errorMessage(error));
  }

  async function verify(code: string): Promise<string | null> {
    const { error } = await getSupabase().auth.verifyOtp({ phone: authPhone(phone), token: code, type: "sms" });
    return error ? errorMessage(error) : null;
  }

  async function resend(): Promise<string | null> {
    try {
      const captchaToken = await captcha.getToken();
      const { error } = await getSupabase().auth.resend({ type: "sms", phone: authPhone(phone), options: { captchaToken } });
      return error ? errorMessage(error) : null;
    } catch (e) {
      return errorMessage(e);
    }
  }

  const nextQuery = next !== "/" ? `?next=${encodeURIComponent(next)}` : "";

  if (step === "code") {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 py-4">
        <PageTitle sub="Falta confirmar tu celular para que puedas entrar.">Confirma tu celular</PageTitle>
        <OtpForm phone={phone} onVerify={verify} onResend={resend} onBack={() => setStep("form")} backLabel="Volver" />
        {captcha.widget}
      </div>
    );
  }

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
      {captcha.widget}
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
