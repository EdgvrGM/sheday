import { Colors } from '@/constants/theme';
import type { OrderStatus } from './types';

const mxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

export function formatMoney(value: number | string): string {
  return mxn.format(Number(value));
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`;
}

export const ORDER_STATUS: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pendiente', color: Colors.warning, bg: Colors.warningSoft },
  confirmed: { label: 'Confirmado', color: Colors.info, bg: Colors.infoSoft },
  ordered: { label: 'Pedido al proveedor', color: Colors.info, bg: Colors.infoSoft },
  on_the_way: { label: 'En camino', color: Colors.primary, bg: Colors.primarySoft },
  delivered: { label: 'Entregado', color: Colors.success, bg: Colors.successSoft },
  cancelled: { label: 'Cancelado', color: Colors.danger, bg: Colors.dangerSoft },
};

/** Orden en que avanza un pedido (para la línea de tiempo). */
export const ORDER_FLOW: OrderStatus[] = ['pending', 'confirmed', 'ordered', 'on_the_way', 'delivered'];

/** Deja solo dígitos de un teléfono. */
export function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, '');
}

/** Normaliza un celular mexicano de 10 dígitos al formato de WhatsApp (52XXXXXXXXXX). */
export function toWhatsAppNumber(phone: string): string {
  const d = digitsOnly(phone);
  if (d.length === 10) return `52${d}`;
  return d;
}
