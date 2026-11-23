import type { Metadata } from "next";

import { RequireAuth } from "@/components/guards";

import { OrderDetail } from "./order-detail";

export const metadata: Metadata = { title: "Pedido", robots: { index: false } };

export default async function OrderPage(props: PageProps<"/pedidos/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  return (
    <RequireAuth>
      <OrderDetail id={Number(id)} isNew={sp.nuevo === "1"} />
    </RequireAuth>
  );
}
