import { formatMoney, toWhatsAppNumber } from "./format";
import type { Order } from "./types";

/** Enlace wa.me con el mensaje ya escrito (o null si no hay número). */
export function whatsappLink(phone: string, text: string): string | null {
  const number = toWhatsAppNumber(phone);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

/** Mensaje que la clienta envía a la tienda para dar seguimiento a su pedido. */
export function customerOrderMessage(order: Order): string {
  const lines = order.order_items.map(
    (i) =>
      `• ${i.quantity} x ${i.product_name} (${[i.size, i.color].filter(Boolean).join(", ")})` +
      `${i.is_preorder ? " [sobre pedido]" : ""} — ${formatMoney(i.unit_price * i.quantity)}`
  );
  const parts = [
    `¡Hola Sheday! 👋 Acabo de hacer el pedido *#${order.id}*`,
    "",
    ...lines,
    "",
    `*Total: ${formatMoney(order.subtotal)}*`,
  ];
  if (Number(order.deposit_required) > 0) {
    parts.push(`Anticipo sobre pedido: ${formatMoney(order.deposit_required)}`);
  }
  parts.push("", `Nombre: ${order.customer_name}`, `Entrega en: ${order.delivery_address}`);
  return parts.join("\n");
}

/** Mensaje que la tienda envía a la clienta. */
export function storeOrderMessage(order: Order): string {
  return `¡Hola ${order.customer_name.split(" ")[0]}! Te escribimos de Sheday sobre tu pedido #${order.id} por ${formatMoney(order.subtotal)}.`;
}

/** Mensaje para preguntar por un producto desde su página. */
export function productQuestionMessage(name: string, url: string): string {
  return `¡Hola Sheday! Me interesa este producto: ${name}\n${url}`;
}
