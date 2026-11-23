import { Linking } from 'react-native';

import { formatMoney, toWhatsAppNumber } from './format';
import { notify } from './dialog';
import type { Order } from './types';

export async function openWhatsApp(phone: string, text: string): Promise<void> {
  const number = toWhatsAppNumber(phone);
  if (!number) {
    notify('WhatsApp no configurado', 'La tienda aún no ha registrado su número de WhatsApp.');
    return;
  }
  const url = `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
  try {
    await Linking.openURL(url);
  } catch {
    notify('No se pudo abrir WhatsApp', 'Verifica que WhatsApp esté instalado.');
  }
}

/** Mensaje que la clienta envía a la tienda para dar seguimiento a su pedido. */
export function customerOrderMessage(order: Order): string {
  const lines = order.order_items.map(
    (i) =>
      `• ${i.quantity} x ${i.product_name} (${[i.size, i.color].filter(Boolean).join(', ')})` +
      `${i.is_preorder ? ' [sobre pedido]' : ''} — ${formatMoney(i.unit_price * i.quantity)}`
  );
  const parts = [
    `¡Hola Sheday! 👋 Acabo de hacer el pedido *#${order.id}*`,
    '',
    ...lines,
    '',
    `*Total: ${formatMoney(order.subtotal)}*`,
  ];
  if (Number(order.deposit_required) > 0) {
    parts.push(`Anticipo sobre pedido: ${formatMoney(order.deposit_required)}`);
  }
  parts.push('', `Nombre: ${order.customer_name}`, `Entrega en: ${order.delivery_address}`);
  return parts.join('\n');
}

/** Mensaje que la tienda envía a la clienta. */
export function storeOrderMessage(order: Order): string {
  return `¡Hola ${order.customer_name.split(' ')[0]}! Te escribimos de Sheday sobre tu pedido #${order.id} por ${formatMoney(order.subtotal)}.`;
}
