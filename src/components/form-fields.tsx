"use client";

import { Eye, EyeOff } from "lucide-react";
import { useLayoutEffect, useRef, useState, type InputHTMLAttributes } from "react";

import { groupPhone, MAX, phoneInput } from "@/lib/input";

import { cn, inputClass } from "./ui";

type BaseProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  label: string;
  hint?: string;
  error?: string | null;
  value: string;
  onChange: (value: string) => void;
};

function Wrapper({ label, hint, error, children }: { label: string; hint?: string; error?: string | null; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-semibold">{label}</span>
      {children}
      {error ? <span className="text-xs text-red-700">{error}</span> : hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

/**
 * Celular mexicano: "+52" fijo y 10 dígitos agrupados ("33 1234 5678").
 * `value` / `onChange` manejan solo los 10 dígitos, sin espacios.
 */
export function PhoneField({ label, hint, error, value, onChange, className, ...props }: BaseProps) {
  const incomplete = value.length > 0 && value.length < 10;
  const inputRef = useRef<HTMLInputElement>(null);
  // Cuántos dígitos deben quedar antes del cursor tras re-formatear
  const pendingCaret = useRef<number | null>(null);

  // Mantiene el cursor en su lugar aunque cambien los espacios
  useLayoutEffect(() => {
    const el = inputRef.current;
    const digits = pendingCaret.current;
    if (!el || digits == null || document.activeElement !== el) return;
    pendingCaret.current = null;
    let pos = 0;
    let seen = 0;
    while (pos < el.value.length && seen < digits) {
      if (/\d/.test(el.value[pos])) seen++;
      pos++;
    }
    el.setSelectionRange(pos, pos);
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const el = e.target;
    const raw = el.value;
    const caret = el.selectionStart ?? raw.length;
    let digitsBeforeCaret = raw.slice(0, caret).replace(/\D/g, "").length;
    let next = phoneInput(raw);

    // Si borraron un espacio, en realidad quieren borrar el dígito anterior
    if (next === value && raw.length < groupPhone(value).length && digitsBeforeCaret > 0) {
      next = value.slice(0, digitsBeforeCaret - 1) + value.slice(digitsBeforeCaret);
      digitsBeforeCaret -= 1;
    }
    pendingCaret.current = digitsBeforeCaret;
    onChange(next);
  }

  return (
    <Wrapper label={label} hint={hint ?? "10 dígitos"} error={error}>
      <div className="relative">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 flex items-center border-r border-line pr-2.5 pl-3 font-medium text-muted">
          +52
        </span>
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="33 1234 5678"
          maxLength={18}
          title="Escribe 10 dígitos"
          aria-label={`${label} (+52)`}
          value={groupPhone(value)}
          onChange={handleChange}
          aria-invalid={incomplete || !!error}
          className={cn(inputClass, "pl-16 tracking-wide", className)}
          {...props}
        />
      </div>
    </Wrapper>
  );
}

/** Contraseña con botón para mostrarla u ocultarla. */
export function PasswordField({ label, hint, error, value, onChange, className, ...props }: BaseProps) {
  const [visible, setVisible] = useState(false);
  return (
    <Wrapper label={label} hint={hint} error={error}>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          maxLength={MAX.password}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, MAX.password))}
          className={cn(inputClass, "pr-12", className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted hover:text-ink">
          {visible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      </div>
    </Wrapper>
  );
}
