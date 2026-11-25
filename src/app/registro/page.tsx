import type { Metadata } from "next";

import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Crear cuenta", robots: { index: false } };

// Estática: `?next=` se lee en el navegador (nextFromLocation / KeepNextLink)
export default function RegisterPage() {
  return <RegisterForm />;
}
