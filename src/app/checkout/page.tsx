import type { Metadata } from "next";

import { RequireAuth } from "@/components/guards";

import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = { title: "Confirmar pedido", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <RequireAuth>
      <CheckoutForm />
    </RequireAuth>
  );
}
