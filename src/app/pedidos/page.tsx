import type { Metadata } from "next";

import { RequireAuth } from "@/components/guards";

import { MyOrders } from "./my-orders";

export const metadata: Metadata = { title: "Mis pedidos", robots: { index: false } };

export default function OrdersPage() {
  return (
    <RequireAuth>
      <MyOrders />
    </RequireAuth>
  );
}
