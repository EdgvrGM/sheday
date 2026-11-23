import './storage-polyfill';

import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error(
    'Faltan EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copia .env.example a .env.local y llénalo.'
  );
}

export const supabase = createClient(url, key, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Solo refresca el token mientras la app está en primer plano.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

/** Convierte errores de Supabase/Postgres en un mensaje legible. */
export function errorMessage(error: unknown): string {
  if (!error) return 'Error desconocido';
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    const msg = error.message;
    if (msg.includes('Failed to fetch') || msg.includes('Network request failed')) {
      return 'Sin conexión. Revisa tu internet e intenta de nuevo.';
    }
    if (msg.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos.';
    if (msg.includes('User already registered')) return 'Ese correo ya está registrado.';
    if (msg.includes('Email not confirmed')) return 'Confirma tu correo antes de iniciar sesión.';
    if (msg.includes('Password should be')) return 'La contraseña debe tener al menos 6 caracteres.';
    return msg;
  }
  return 'Error desconocido';
}
