"use client";

import { ArrowLeft, MessageCircle, Receipt } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { OrderTotals, StatusBadge } from "@/components/order-parts";
import { useToast } from "@/components/toast";
import { Button, ButtonLink, Card, Chip, EmptyState, PageTitle, Spinner, TextArea } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { formatPhone, phoneInput } from "@/lib/input";
import { formatDate, ORDER_STATUS } from "@/lib/format";
import { fetchOrder } from "@/lib/queries";
import { getSupabase } from "@/lib/supabase/browser";
import type { Order, OrderStatus } from "@/lib/types";
import { storeOrderMessage, whatsappLink } from "@/lib/whatsapp";

export default function AdminOrderPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  // null = sin editar (se muestra lo guardado)
  const [notesDraft, setNotes] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [version, setVersion] = useState(0);
  const load = () => setVersion((v) => v + 1);

  useEffect(() => {
    fetchOrder(getSupabase(), Number(id))
      .then(setOrder)
      .catch(() => setOrder(null));
  }, [id, version]);

  if (order === undefined) return <Spinner />;
  if (!order) return <EmptyState icon={Receipt} title="Pedido no encontrado" />;

  const notes = notesDraft ?? order.admin_notes;
  const hasPreorder = order.order_items.some((i) => i.is_preorder);
  const options = (Object.keys(ORDER_STATUS) as OrderStatus[]).filter((s) => s !== "ordered" || hasPreorder);
  const waLink = whatsappLink(order.customer_phone, storeOrderMessage(order));

  async function setStatus(next: OrderStatus) {
    if (next === order!.status) return;
    if (
      next === "cancelled" &&
      !window.confirm("Las piezas en stock regresarán al inventario. Un pedido cancelado no se puede reactivar. ¿Cancelar?")
    ) {
      return;
    }
    setSaving(true);
    const { error } = await getSupabase().rpc("admin_set_order_status", {
      p_order_id: order!.id,
      p_status: next,
      p_admin_notes: notes,
    });
    setSaving(false);
    if (error) return toast(errorMessage(error), "error");
    toast(`Estado: ${ORDER_STATUS[next].label}`);
    load();
  }

  async function saveNotes() {
    setSaving(true);
    const { error } = await getSupabase().from("orders").update({ admin_notes: notes }).eq("id", order!.id);
    setSaving(false);
    if (error) return toast(errorMessage(error), "error");
    toast("Notas guardadas");
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <Link href="/admin" className="flex items-center gap-1 text-sm text-muted">
        <ArrowLeft className="size-4" /> Administración
      </Link>
      <PageTitle sub={`Realizado el ${formatDate(order.created_at)}`}>Pedido #{order.id}</PageTitle>

      <Card>
        <div className="flex items-center justify-between gap-2">
          <span className="text-lg font-bold">{order.customer_name}</span>
          <StatusBadge status={order.status} />
        </div>
        <a href={`tel:+52${phoneInput(order.customer_phone)}`} className="text-brand">
          {formatPhone(order.customer_phone)}
        </a>
        <p className="text-muted">{order.delivery_address}</p>
        {order.notes && <p className="text-muted">Notas de la clienta: {order.notes}</p>}
      </Card>

      {waLink && (
        <ButtonLink href={waLink} external kind="whatsapp" icon={MessageCircle}>
          Escribirle por WhatsApp
        </ButtonLink>
      )}

      <h2 className="font-bold">Cambiar estado</h2>
      <div className="flex flex-wrap gap-2">
        {options.map((s) => (
          <Chip
            key={s}
            selected={order.status === s}
            disabled={saving || (order.status === "cancelled" && s !== "cancelled")}
            onClick={() => setStatus(s)}>
            {ORDER_STATUS[s].label}
          </Chip>
        ))}
      </div>

      <OrderTotals order={order} />

      <TextArea
        label="Notas internas (no se muestran en la página de la clienta)"
        value={notes}
        onChange={(e) => setNotes(e.target.value.slice(0, 1000))}
        maxLength={1000}
        placeholder="Ej. anticipo recibido $200, entregar el sábado"
      />
      <Button kind="secondary" onClick={saveNotes} loading={saving}>
        Guardar notas
      </Button>
    </div>
  );
}
