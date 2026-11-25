"use client";

import { MessageCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { codeInput, formatPhone } from "@/lib/input";

import { Button, cn, ErrorBox, FieldNote, inputClass } from "./ui";

/** Segundos de espera para pedir otro código (Supabase también limita a 1 por minuto). */
const RESEND_SECONDS = 60;

/**
 * Paso "Escribe el código que te mandamos por WhatsApp".
 * `onVerify` / `onResend` regresan un mensaje de error o null si salió bien.
 * Se envía solo al completar los 6 dígitos.
 */
export function OtpForm({
  phone,
  onVerify,
  onResend,
  onBack,
  backLabel = "Cambiar número",
  submitLabel = "Continuar",
}: {
  /** 10 dígitos */
  phone: string;
  onVerify: (code: string) => Promise<string | null>;
  onResend: () => Promise<string | null>;
  onBack?: () => void;
  backLabel?: string;
  submitLabel?: string;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [wait, setWait] = useState(RESEND_SECONDS);
  const [notice, setNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Evita mandar el mismo código dos veces (auto-envío + botón)
  const lastTried = useRef<string | null>(null);

  // Cuenta regresiva para "Reenviar código"
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function verify(value: string) {
    if (loading || lastTried.current === value) return;
    if (value.length !== 6) {
      setFieldError(value ? `Faltan ${6 - value.length} dígitos.` : "Escribe el código.");
      inputRef.current?.focus();
      return;
    }
    lastTried.current = value;
    setError(null);
    setNotice(null);
    setLoading(true);
    const err = await onVerify(value);
    setLoading(false);
    if (err) {
      setError(err);
      inputRef.current?.select();
    }
  }

  async function resend() {
    setError(null);
    setNotice(null);
    setResending(true);
    const err = await onResend();
    setResending(false);
    if (err) return setError(err);
    setCode("");
    lastTried.current = null;
    setWait(RESEND_SECONDS);
    setNotice("Te mandamos un código nuevo.");
    inputRef.current?.focus();
  }

  const minutes = Math.floor(wait / 60);
  const seconds = String(wait % 60).padStart(2, "0");

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        lastTried.current = null;
        verify(code);
      }}
      className="flex flex-col gap-4">
      <div className="flex items-start gap-3 rounded-xl bg-surface p-4">
        <MessageCircle className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
        <p className="text-sm">
          Te mandamos un código de 6 dígitos por <strong>WhatsApp</strong> al{" "}
          <strong className="whitespace-nowrap">{formatPhone(phone)}</strong>.
        </p>
      </div>
      {error && <ErrorBox message={error} />}
      {notice && (
        <p role="status" className="text-sm font-medium text-success">
          {notice}
        </p>
      )}
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold">Código</span>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          placeholder="000000"
          autoFocus
          value={code}
          onChange={(e) => {
            const next = codeInput(e.target.value);
            setCode(next);
            setFieldError(null);
            if (next.length === 6) verify(next);
          }}
          aria-invalid={fieldError ? true : undefined}
          aria-describedby="otp-note"
          className={cn(inputClass, "pl-[calc(0.875rem+0.5em)] text-center font-semibold text-2xl tracking-[0.5em] tabular-nums")}
        />
        <FieldNote id="otp-note" hint="Vence en 10 minutos." error={fieldError} />
      </label>
      <Button type="submit" loading={loading}>
        {submitLabel}
      </Button>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        {onBack ? (
          <button type="button" onClick={onBack} className="min-h-11 text-muted underline-offset-2 hover:underline">
            {backLabel}
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={resend}
          disabled={wait > 0 || resending}
          className="min-h-11 font-semibold text-brand disabled:font-normal disabled:text-muted">
          {resending ? "Enviando…" : wait > 0 ? `Reenviar código en ${minutes}:${seconds}` : "Reenviar código"}
        </button>
      </div>
    </form>
  );
}
