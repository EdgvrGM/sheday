"use client";

import { Receipt } from "lucide-react";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { OrderCard } from "@/components/order-parts";
import { ButtonLink, EmptyState, ErrorBox, PageTitle, Spinner } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { fetchOrders } from "@/lib/queries";
import { getSupabase } from "@/lib/supabase/browser";
import type { Order } from "@/lib/types";

export function MyOrders() {
  const { session } = useAuth();
  const userId = session!.user.id;
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders(getSupabase(), { userId })
      .then(setOrders)
      .catch((e) => setError(errorMessage(e)));
  }, [userId]);

  if (error) return <ErrorBox message={error} />;
  if (!orders) return <Spinner />;
  if (orders.length === 0) {
    return (
      <EmptyState icon={Receipt} title="Aún no tienes pedidos">
        <ButtonLink href="/">Ver la tienda</ButtonLink>
      </EmptyState>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
      <PageTitle>Mis pedidos</PageTitle>
      {orders.map((o) => (
        <OrderCard key={o.id} order={o} href={`/pedidos/${o.id}`} />
      ))}
    </div>
  );
}
