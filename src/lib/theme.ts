"use client";

import { useSyncExternalStore } from "react";

import { THEME_KEY, type ThemePreference } from "./theme-script";

export type { ThemePreference };

const listeners = new Set<() => void>();

function read(): ThemePreference {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  // Otra pestaña cambió el tema
  const onStorage = (e: StorageEvent) => {
    if (e.key !== THEME_KEY) return;
    applyTheme();
    cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function applyTheme() {
  (window as unknown as { __shedayApplyTheme?: () => void }).__shedayApplyTheme?.();
}

export function setThemePreference(pref: ThemePreference) {
  try {
    if (pref === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, pref);
  } catch {
    // Modo privado sin almacenamiento: se aplica igual, solo no se recuerda
  }
  const before = document.documentElement.getAttribute("data-theme");
  const run = () => {
    applyTheme();
    // Sin almacenamiento, el script no puede leer la elección: se aplica a mano
    if (pref !== "system" && read() !== pref) document.documentElement.setAttribute("data-theme", pref);
    listeners.forEach((l) => l());
  };
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  // Fundido suave solo si de verdad cambia el tema
  const next = pref === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : pref;
  if (!reduce && doc.startViewTransition && before !== next) doc.startViewTransition(run);
  else run();
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, read, () => "system");
}
