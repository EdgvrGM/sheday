"use client";

import { useCallback, useEffect, useRef } from "react";

import { TURNSTILE_SITE_KEY } from "@/lib/env";

/**
 * Cloudflare Turnstile: comprueba que no sea un bot antes de cada llamada a
 * Supabase Auth que manda un código por WhatsApp (cuestan dinero) o que prueba
 * contraseñas. Supabase valida el token (Authentication > Attack Protection).
 *
 * Sin NEXT_PUBLIC_TURNSTILE_SITE_KEY no hace nada: `getToken()` regresa undefined.
 * Casi siempre es invisible; solo muestra la casilla si Cloudflare tiene dudas.
 * Cada token sirve una sola vez, por eso se pide uno nuevo en cada llamada.
 */

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
export const CAPTCHA_ERROR = "No pudimos comprobar que no eres un robot. Intenta de nuevo.";

interface Turnstile {
  render(el: HTMLElement, options: Record<string, unknown>): string;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

let scriptPromise: Promise<Turnstile> | null = null;

function loadTurnstile(): Promise<Turnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptPromise ??= new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error(CAPTCHA_ERROR)));
    script.onerror = () => {
      // Permite reintentar si falló la red
      scriptPromise = null;
      script.remove();
      reject(new Error("No se pudo cargar la verificación de seguridad. Revisa tu internet e intenta de nuevo."));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

function removeWidget(id: string | null) {
  if (!id) return;
  try {
    window.turnstile?.remove(id);
  } catch {
    // El contenedor ya no existe (cambió el paso del formulario)
  }
}

/**
 * `widget` va dentro del formulario (ahí aparece la casilla si hace falta).
 * `getToken()` se llama justo antes de la llamada a Supabase; si falla, lanza
 * un Error con un mensaje para la clienta.
 */
export function useCaptcha() {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    // Precarga: la primera verificación sale más rápido
    loadTurnstile().catch(() => {});
    return () => {
      removeWidget(widgetId.current);
      widgetId.current = null;
    };
  }, []);

  const getToken = useCallback(async (): Promise<string | undefined> => {
    if (!TURNSTILE_SITE_KEY) return undefined;
    const turnstile = await loadTurnstile();
    const el = container.current;
    if (!el) throw new Error(CAPTCHA_ERROR);
    removeWidget(widgetId.current);
    return new Promise<string>((resolve, reject) => {
      widgetId.current = turnstile.render(el, {
        sitekey: TURNSTILE_SITE_KEY,
        appearance: "interaction-only",
        retry: "never",
        callback: (token: string) => resolve(token),
        "error-callback": () => {
          reject(new Error(CAPTCHA_ERROR));
          return true; // ya lo manejamos: que Turnstile no lo lance a la consola
        },
        "timeout-callback": () => reject(new Error(CAPTCHA_ERROR)),
      });
    });
  }, []);

  const widget = TURNSTILE_SITE_KEY ? <div ref={container} className="flex justify-center empty:hidden" /> : null;
  return { getToken, widget };
}
