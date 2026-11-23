import type { Metadata } from "next";

import { safeNext } from "@/lib/safe-next";

import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Crear cuenta", robots: { index: false } };

export default async function RegisterPage(props: PageProps<"/registro">) {
  const sp = await props.searchParams;
  return <RegisterForm next={safeNext(sp.next)} />;
}
