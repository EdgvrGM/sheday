"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { setThemePreference, useThemePreference, type ThemePreference } from "@/lib/theme";

import { cn } from "./ui";

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "system", label: "Automático", icon: Monitor },
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
];

/** Control segmentado Automático / Claro / Oscuro (grupo de radios accesible). */
export function ThemeSwitch({ className }: { className?: string }) {
  const pref = useThemePreference();
  const labelId = useId();

  function onKeyDown(e: React.KeyboardEvent) {
    const i = OPTIONS.findIndex((o) => o.value === pref);
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = OPTIONS[(i + step + OPTIONS.length) % OPTIONS.length];
    setThemePreference(next.value);
    e.currentTarget.querySelector<HTMLElement>(`[data-value="${next.value}"]`)?.focus();
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span id={labelId} className="text-sm font-semibold text-muted">
        Apariencia
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        onKeyDown={onKeyDown}
        className="grid grid-cols-3 gap-1 rounded-full border border-line bg-surface p-1">
        {OPTIONS.map(({ value, label, icon: Icon }) => {
          const selected = pref === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              data-value={value}
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => setThemePreference(value)}
              className={cn(
                "flex min-h-11 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-medium transition",
                selected ? "bg-ink text-paper" : "text-ink hover:bg-raised"
              )}>
              <Icon className="size-4" aria-hidden />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Botón del encabezado en escritorio: abre un panel pequeño con el selector de tema. */
export function ThemeMenu() {
  const pref = useThemePreference();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const Icon = pref === "dark" ? Moon : pref === "light" ? Sun : Monitor;

  // Abierto: Esc o un clic fuera lo cierran
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    root.current?.querySelector<HTMLElement>('[role="radio"][tabindex="0"]')?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="Apariencia"
        className="flex size-11 items-center justify-center rounded-full text-ink transition hover:bg-surface">
        <Icon className="size-5" aria-hidden />
      </button>
      {open && (
        <div
          id={panelId}
          className="panel-lift absolute top-full right-0 z-50 mt-2 w-80 rounded-xl border border-line bg-overlay p-3 shadow-lg">
          <ThemeSwitch />
        </div>
      )}
    </div>
  );
}
