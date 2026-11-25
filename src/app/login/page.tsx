import type { Metadata } from "next";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Iniciar sesión", robots: { index: false } };

// Estática: `?next=` se lee en el navegador (nextFromLocation / KeepNextLink)
export default function LoginPage() {
  return <LoginForm />;
}
