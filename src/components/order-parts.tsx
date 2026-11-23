import { CheckCircle2, Circle, Shirt } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { formatDate, formatMoney, ORDER_FLOW, ORDER_STATUS } from "@/lib/format";
import { imageUrl } from "@/lib/images";
import { formatPhone } from "@/lib/input";
import type { Order, OrderItem } from "@/lib/types";

import { Badge, Card, cn } from "./ui";

export function StatusBadge({ status }: { status: Order["status"] }) {
  const s = ORDER_STATUS[status];
  return <Badge className={s.className}>{s.label}</Badge>;
}

export function Thumb({ path, className }: { path: string | null; className?: string }) {
  return (
    <div className={cn("relative shrink-0 overflow-hidden rounded-lg bg-surface", className ?? "h-16 w-12")}>
      {path ? (
        <Image src={imageUrl(path)!} alt="" fill sizes="96px" className="object-cover" />
      ) : (
        <Shirt className="absolute inset-0 m-auto size-5 text-line" />
      )}
    </div>
  );
}

export function OrderItemRow({ item }: { item: OrderItem }) {
  return (
    <div className="flex items-start gap-3">
      <Thumb path={item.image_path} />
      <div className="flex-1">
        <p className="line-clamp-2 text-sm">{item.product_name}</p>
        <p className="text-xs text-muted">
          {[item.size, item.color].filter(Boolean).join(" · ")} · {item.quantity} pza
          {item.is_preorder ? " · Sobre pedido" : ""}
        </p>
      </div>
      <p className="text-sm font-semibold">{formatMoney(item.unit_price * item.quantity)}</p>
    </div>
  );
}

export function OrderTotals({ order }: { order: Order }) {
  const deposit = Number(order.deposit_required);
  return (
    <Card className="gap-3">
      {order.order_items.map((i) => (
        <OrderItemRow key={i.id} item={i} />
      ))}
      <hr className="border-line" />
      <div className="flex justify-between text-lg font-bold">
        <span>Total</span>
        <span>{formatMoney(order.subtotal)}</span>
      </div>
      {deposit > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-muted">Anticipo (sobre pedido)</span>
          <span className="font-semibold">{formatMoney(deposit)}</span>
        </div>
      )}
      <p className="text-xs text-muted">Pago en efectivo al recibir.</p>
    </Card>
  );
}

export function OrderTimeline({ order }: { order: Order }) {
  if (order.status === "cancelled") {
    return <Card className="border-red-100 bg-red-50 font-semibold text-red-700">Este pedido fue cancelado.</Card>;
  }
  const hasPreorder = order.order_items.some((i) => i.is_preorder);
  const steps = ORDER_FLOW.filter((s) => s !== "ordered" || hasPreorder);
  const current = steps.indexOf(order.status);
  return (
    <Card>
      {steps.map((s, idx) => {
        const done = idx <= current;
        return (
          <div key={s} className="flex items-center gap-2">
            {done ? <CheckCircle2 className="size-5 text-brand" /> : <Circle className="size-5 text-line" />}
            <span className={done ? "" : "text-muted"}>{ORDER_STATUS[s].label}</span>
          </div>
        );
      })}
    </Card>
  );
}

export function OrderCard({ order, href, showCustomer }: { order: Order; href: string; showCustomer?: boolean }) {
  const pieces = order.order_items.reduce((n, i) => n + i.quantity, 0);
  return (
    <Link href={href} className="transition active:scale-[0.99]">
      <Card className="hover:border-brand/40">
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold">Pedido #{order.id}</span>
          <StatusBadge status={order.status} />
        </div>
        {showCustomer && (
          <p className="text-sm">
            {order.customer_name} · {formatPhone(order.customer_phone)}
          </p>
        )}
        <p className="text-xs text-muted">{formatDate(order.created_at)}</p>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">
            {pieces} {pieces === 1 ? "pieza" : "piezas"}
            {order.order_items.some((i) => i.is_preorder) ? " · incluye sobre pedido" : ""}
          </span>
          <span className="font-bold text-brand">{formatMoney(order.subtotal)}</span>
        </div>
      </Card>
    </Link>
  );
}
