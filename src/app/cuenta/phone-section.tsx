"use client";

import { useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { useCaptcha } from "@/components/captcha";
import { PhoneField } from "@/components/form-fields";
import { OtpForm } from "@/components/otp-form";
import { useToast } from "@/components/toast";
import { Button, ErrorBox } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { authPhone, formatPhone, isValidPhone } from "@/lib/input";
import { getSupabase } from "@/lib/supabase/browser";

/**
 * Cambiar el celular (que es el usuario de inicio de sesión): se confirma con
 * un código por WhatsApp al número nuevo. Un trigger copia el número al perfil.
 */
export function PhoneSection({ current }: { current: string }) {
  const { refreshProfile } = useAuth();
  const captcha = useCaptcha();
  const toast = useToast();
  const [step, setStep] = useState<"idle" | "form" | "code">("idle");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function reset() {
    setStep("idle");
    setPhone("");
    setError(null);
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isValidPhone(phone)) return setError("Escribe el celular nuevo a 10 dígitos.");
    if (phone === current) return setError("Es el mismo celular que ya tienes.");
    setLoading(true);
    const { error } = await getSupabase().auth.updateUser({ phone: authPhone(phone) });
    setLoading(false);
    if (error) return setError(errorMessage(error));
    setStep("code");
  }

  async function verify(code: string): Promise<string | null> {
    const { error } = await getSupabase().auth.verifyOtp({
      phone: authPhone(phone),
      token: code,
      type: "phone_change",
    });
    if (error) return errorMessage(error);
    await refreshProfile();
    toast(`Listo. Desde ahora entras con ${formatPhone(phone)}.`);
    reset();
    return null;
  }

  // El primer código lo manda updateUser (no pide captcha); el reenvío sí lo pide
  async function resend(): Promise<string | null> {
    try {
      const captchaToken = await captcha.getToken();
      const { error } = await getSupabase().auth.resend({
        type: "phone_change",
        phone: authPhone(phone),
        options: { captchaToken },
      });
      return error ? errorMessage(error) : null;
    } catch (err) {
      return errorMessage(err);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-bold">Celular</h2>
      {step === "idle" && (
        <>
          <p className="text-sm text-muted">
            Inicias sesión con {current ? formatPhone(current) : "tu celular"}. Para cambiarlo te mandaremos un código por
            WhatsApp al número nuevo.
          </p>
          <Button kind="secondary" onClick={() => setStep("form")}>
            Cambiar celular
          </Button>
        </>
      )}
      {step === "form" && (
        <form onSubmit={sendCode} noValidate className="flex flex-col gap-3">
          {error && <ErrorBox message={error} />}
          <PhoneField
            label="Celular nuevo (WhatsApp)"
            value={phone}
            onChange={(v) => {
              setPhone(v);
              setError(null);
            }}
            hint="Desde que lo confirmes, iniciarás sesión con este número."
            autoFocus
          />
          <Button type="submit" loading={loading}>
            Enviar código por WhatsApp
          </Button>
          <Button kind="ghost" onClick={reset}>
            Cancelar
          </Button>
        </form>
      )}
      {step === "code" && (
        <OtpForm
          phone={phone}
          onVerify={verify}
          onResend={resend}
          onBack={reset}
          backLabel="Cancelar"
          submitLabel="Confirmar celular"
        />
      )}
      {step === "code" && captcha.widget}
    </section>
  );
}
