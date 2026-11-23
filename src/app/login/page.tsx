import type { Metadata } from "next";

import { safeNext } from "@/lib/safe-next";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Iniciar sesión", robots: { index: false } };

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  return <LoginForm next={safeNext(sp.next)} />;
}
