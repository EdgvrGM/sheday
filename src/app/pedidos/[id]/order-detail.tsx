"use client";

import { CheckCircle2, MessageCircle, Receipt } from "lucide-react";
import { useEffect, useState } from "react";

import { OrderTimeline, OrderTotals } from "@/components/order-parts";
import { useToast } from "@/components/toast";
import { Button, ButtonLink, Card, EmptyState, PageTitle, Spinner } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { formatPhone } from "@/lib/input";
import { formatDate } from "@/lib/format";
import { fetchOrder, fetchSettings } from "@/lib/queries";
import { getSupabase } from "@/lib/supabase/browser";
import type { Order, StoreSettings } from "@/lib/types";
import { customerOrderMessage, whatsappLink } from "@/lib/whatsapp";

export function OrderDetail({ id, isNew }: { id: number; isNew: boolean }) {
  const toast = useToast();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const [version, setVersion] = useState(0);
  const load = () => setVersion((v) => v + 1);

  useEffect(() => {
    const sb = getSupabase();
    Promise.all([fetchOrder(sb, id), fetchSettings(sb).catch(() => null)])
      .then(([o, s]) => {
        setOrder(o);
        setSettings(s);
      })
      .catch(() => setOrder(null));
  }, [id, version]);

  if (order === undefined) return <Spinner />;
  if (!order) return <EmptyState icon={Receipt} title="Pedido no encontrado" />;

  const waLink = settings ? whatsappLink(settings.whatsapp_number, customerOrderMessage(order)) : null;

  async function cancel() {
    if (!window.confirm(`¿Seguro que quieres cancelar el pedido #${order!.id}?`)) return;
    setCancelling(true);
    const { error } = await getSupabase().rpc("cancel_my_order", { p_order_id: order!.id });
    setCancelling(false);
    if (error) return toast(errorMessage(error), "error");
    toast("Pedido cancelado");
    load();
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <PageTitle sub={`Realizado el ${formatDate(order.created_at)}`}>Pedido #{order.id}</PageTitle>

      {isNew && (
        <Card className="items-center border-green-100 bg-green-50 text-center">
          <CheckCircle2 className="size-12 text-green-600" />
          <h2 className="text-lg font-bold">¡Pedido recibido!</h2>
          <p>Envíanos tu pedido por WhatsApp para confirmarlo y acordar la entrega.</p>
        </Card>
      )}

      {waLink ? (
        <ButtonLink href={waLink} external kind="whatsapp" icon={MessageCircle}>
          Dar seguimiento por WhatsApp
        </ButtonLink>
      ) : (
        settings && <p className="text-sm text-muted">La tienda aún no ha configurado su WhatsApp.</p>
      )}

      <h2 className="font-bold">Estado</h2>
      <OrderTimeline order={order} />

      <h2 className="font-bold">Artículos</h2>
      <OrderTotals order={order} />

      <Card>
        <h2 className="text-sm font-semibold">Entrega</h2>
        <p>
          {order.customer_name} · {formatPhone(order.customer_phone)}
        </p>
        <p className="text-muted">{order.delivery_address}</p>
        {order.notes && <p className="text-muted">Notas: {order.notes}</p>}
      </Card>

      {order.status === "pending" && (
        <Button kind="danger" onClick={cancel} loading={cancelling}>
          Cancelar pedido
        </Button>
      )}
    </div>
  );
}
