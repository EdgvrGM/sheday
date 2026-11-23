import type { OrderStatus } from "./types";

const mxn = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

export function formatMoney(value: number | string): string {
  return mxn.format(Number(value));
}

const dateFmt = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Mexico_City",
});

export function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}

/** Etiqueta y clases de Tailwind para cada estado de pedido. */
export const ORDER_STATUS: Record<OrderStatus, { label: string; className: string }> = {
  pending: { label: "Pendiente", className: "bg-amber-50 text-amber-700" },
  confirmed: { label: "Confirmado", className: "bg-blue-50 text-blue-700" },
  ordered: { label: "Pedido al proveedor", className: "bg-blue-50 text-blue-700" },
  on_the_way: { label: "En camino", className: "bg-brand-soft text-brand" },
  delivered: { label: "Entregado", className: "bg-green-50 text-green-700" },
  cancelled: { label: "Cancelado", className: "bg-red-50 text-red-700" },
};

/** Orden en que avanza un pedido (para la línea de tiempo). */
export const ORDER_FLOW: OrderStatus[] = ["pending", "confirmed", "ordered", "on_the_way", "delivered"];

export function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** Normaliza un celular mexicano de 10 dígitos al formato de WhatsApp (52XXXXXXXXXX). */
export function toWhatsAppNumber(phone: string): string {
  const d = digitsOnly(phone);
  return d.length === 10 ? `52${d}` : d;
}

/** "123-vestido-midi-floral": URL legible para SEO y para compartir. */
export function productSlug(id: number, name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug ? `${id}-${slug}` : String(id);
}

export function productHref(id: number, name: string): string {
  return `/producto/${productSlug(id, name)}`;
}

/** Extrae el id de "123-vestido-midi-floral". */
export function parseProductId(slug: string): number | null {
  const id = Number.parseInt(slug, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}
