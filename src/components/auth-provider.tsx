"use client";

import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import { getSupabase } from "@/lib/supabase/browser";
import type { Profile } from "@/lib/types";

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  /** true mientras se recupera la sesión guardada */
  initializing: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

async function loadProfile(userId: string): Promise<Profile | null> {
  const { data } = await getSupabase().from("profiles").select("*").eq("id", userId).maybeSingle();
  return (data as Profile | null) ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();
    let active = true;

    // INITIAL_SESSION llega primero con la sesión guardada (o null).
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      setSession(next);
      if (!next) {
        setProfile(null);
        setInitializing(false);
        return;
      }
      // No hacer await dentro del callback (recomendación de Supabase).
      setTimeout(() => {
        loadProfile(next.user.id).then((p) => {
          if (!active) return;
          setProfile(p);
          if (event === "INITIAL_SESSION" || event === "SIGNED_IN") setInitializing(false);
        });
      }, 0);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session) setProfile(await loadProfile(session.user.id));
  }, [session]);

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
  }, []);

  return (
    <AuthContext.Provider
      value={{ session, profile, isAdmin: profile?.role === "admin", initializing, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
