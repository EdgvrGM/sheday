// Limpieza de lo que se escribe en los campos (se aplica en cada onChange)
// y validaciones para antes de enviar.

/** Límites de largo de los campos de texto. */
export const MAX = {
  name: 80,
  email: 254,
  password: 72, // bcrypt (Supabase) ignora lo que pase de 72 bytes
  address: 300,
  notes: 300,
  search: 60,
  productName: 120,
  description: 2000,
  size: 20,
  color: 30,
  category: 40,
  adminNotes: 1000,
  deliveryNotes: 300,
} as const;

/** Solo dígitos, con un máximo de `max`. */
export function digitsInput(value: string, max: number): string {
  return value.replace(/\D/g, "").slice(0, max);
}

/**
 * Celular mexicano: solo 10 dígitos.
 * Si pegan "+52 1 33 1234 5678" o "52 33 1234 5678", quita la lada de país.
 */
export function phoneInput(value: string): string {
  const d = value.replace(/\D/g, "");
  if ((d.length === 12 && d.startsWith("52")) || (d.length === 13 && d.startsWith("521"))) {
    return d.slice(-10);
  }
  return d.slice(0, 10);
}

/** Letras (con acentos y ñ), espacios, punto, guion y apóstrofo. */
export function nameInput(value: string): string {
  return value
    .replace(/[^\p{L}\s.'-]/gu, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^\s+/, "")
    .slice(0, MAX.name);
}

/** Correo: sin espacios y en minúsculas. */
export function emailInput(value: string): string {
  return value.replace(/\s/g, "").toLowerCase().slice(0, MAX.email);
}

/** Precio: dígitos y un solo punto decimal con máximo 2 decimales (hasta 999,999.99). */
export function priceInput(value: string): string {
  const s = value.replace(/,/g, ".").replace(/[^\d.]/g, "");
  const dot = s.indexOf(".");
  if (dot === -1) return s.slice(0, 6);
  const int = s.slice(0, dot).slice(0, 6);
  const dec = s.slice(dot + 1).replace(/\./g, "").slice(0, 2);
  return `${int || "0"}.${dec}`;
}

/** Un número en centímetros: hasta 3 enteros y 1 decimal ("105.5"). */
function cmNumber(value: string): string {
  const s = value.replace(/[^\d.]/g, "");
  const dot = s.indexOf(".");
  if (dot === -1) return s.slice(0, 3);
  return `${s.slice(0, dot).slice(0, 3) || "0"}.${s.slice(dot + 1).replace(/\./g, "").slice(0, 1)}`;
}

/** Medida en centímetros: un número ("105.5") o un rango ("62-92", telas que estiran). */
export function cmInput(value: string): string {
  const s = value.replace(/,/g, ".").replace(/–/g, "-");
  const dash = s.indexOf("-");
  if (dash === -1) return cmNumber(s);
  return `${cmNumber(s.slice(0, dash))}-${cmNumber(s.slice(dash + 1))}`;
}

/** Texto libre: quita espacios al inicio y limita el largo. */
export function textInput(value: string, max: number): string {
  return value.replace(/^\s+/, "").slice(0, max);
}

// ---------- Validaciones ----------
export function isValidPhone(value: string): boolean {
  return /^\d{10}$/.test(value);
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

export function isValidName(value: string): boolean {
  return value.trim().replace(/[^\p{L}]/gu, "").length >= 2;
}

// Lada de 2 dígitos en CDMX, Guadalajara y Monterrey; 3 en el resto
const TWO_DIGIT_AREA = ["33", "55", "56", "81"];

/**
 * Agrupa los dígitos con espacios mientras se escribe:
 * "3312345678" → "33 1234 5678", "4921234567" → "492 123 4567".
 * Funciona con números incompletos ("4921" → "492 1").
 */
export function groupPhone(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 10);
  const groups = TWO_DIGIT_AREA.includes(d.slice(0, 2)) ? [2, 4, 4] : [3, 3, 4];
  const parts: string[] = [];
  let i = 0;
  for (const size of groups) {
    if (i >= d.length) break;
    parts.push(d.slice(i, i + size));
    i += size;
  }
  return parts.join(" ");
}

/** Celular de 10 dígitos en el formato que usa Supabase Auth: "+523312345678". */
export function authPhone(digits: string): string {
  return `+52${digits}`;
}

/** Código de verificación: solo dígitos, 6 como máximo. */
export function codeInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, 6);
}

/** Muestra un celular guardado como "+52 33 1234 5678". */
export function formatPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(-10);
  return d.length === 10 ? `+52 ${groupPhone(d)}` : value;
}
