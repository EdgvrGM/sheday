// Guías de tallas. Cada producto guarda la suya en `products.size_guide` (0007) y se
// edita en su ficha del admin. Las PLANTILLAS de aquí abajo son puntos de partida
// para "Copiar de…" y dan los botones rápidos de talla de su categoría.
//
// Una guía tiene una o varias PARTES (un conjunto: "Pantalón" y "Top"), cada una con su
// tipo de prenda (para el dibujo), sus medidas y sus tallas. En la tienda, varias partes
// se ven como pestañas. La parte "Tu cuerpo" (figure "body") lleva las medidas de la
// clienta en lugar de las de la prenda.
// Una medida es un número o un rango [mín, máx] (telas que estiran: "62-92").

export type Measure =
  | "cintura"
  | "cadera"
  | "entrepierna"
  | "largo"
  | "muslo"
  | "pecho"
  | "hombro"
  | "manga"
  | "biceps"
  | "puno"
  | "altura";

/** Cómo se mide cada cosa (el número sale del orden en `measures` de la parte). */
export const MEASURES: Record<Measure, { label: string; text: string }> = {
  cintura: { label: "Cintura", text: "Contorno completo de la pretina, por la orilla de arriba." },
  cadera: { label: "Cadera", text: "Contorno completo en la parte más ancha de la cadera." },
  entrepierna: { label: "Entrepierna", text: "Desde el cruce de la entrepierna hasta el dobladillo, por la costura interior." },
  largo: { label: "Largo", text: "Desde la orilla de arriba de la cintura hasta el dobladillo, por el costado." },
  muslo: { label: "Muslo", text: "Contorno completo de la pierna, justo debajo de la entrepierna." },
  pecho: { label: "Pecho", text: "Contorno completo del pecho, justo debajo de las axilas." },
  hombro: { label: "Hombro", text: "De la costura de un hombro a la del otro, por la espalda." },
  manga: { label: "Manga", text: "Desde la costura del hombro hasta el puño." },
  biceps: { label: "Bíceps", text: "Contorno completo de la manga en la parte más ancha del brazo, justo debajo de la axila." },
  puno: { label: "Puño", text: "Contorno completo de la orilla de la manga." },
  altura: { label: "Altura", text: "Tu estatura, sin zapatos." },
};

/** Tipos de prenda con dibujo de "Cómo medir". */
export type Figure = "pants" | "shorts" | "skirt" | "top" | "tubeTop" | "dress" | "dressSleeves" | "body";
/**
 * `measures`: las que se pueden marcar en su dibujo; `defaults`: las de una parte nueva;
 * `texts`: cómo se mide algo distinto en esta prenda (el largo de un top no va desde la cintura).
 */
export const FIGURES: Record<
  Figure,
  { label: string; measures: Measure[]; defaults: Measure[]; texts?: Partial<Record<Measure, string>> }
> = {
  pants: {
    label: "Pantalón",
    measures: ["cintura", "cadera", "largo", "entrepierna", "muslo"],
    defaults: ["cintura", "cadera", "entrepierna"],
  },
  // Falda con short por dentro (skort): mismas medidas, pierna corta
  shorts: {
    label: "Falda short",
    measures: ["cintura", "cadera", "largo", "entrepierna", "muslo"],
    defaults: ["cintura", "cadera", "largo", "entrepierna"],
  },
  skirt: { label: "Falda", measures: ["cintura", "cadera", "largo"], defaults: ["cintura", "cadera", "largo"] },
  top: {
    label: "Top",
    measures: ["pecho", "largo", "hombro", "manga", "biceps", "puno"],
    defaults: ["pecho", "largo"],
    texts: { largo: "Desde el punto más alto del hombro hasta el dobladillo." },
  },
  // Top sin tirantes (tubo), escote de corazón
  tubeTop: {
    label: "Top strapless",
    measures: ["pecho", "cintura", "largo"],
    defaults: ["pecho", "cintura", "largo"],
    texts: {
      pecho: "Contorno completo a la altura del busto.",
      cintura: "Contorno completo en la parte más angosta.",
      largo: "Desde la orilla de arriba hasta el dobladillo, por el costado (no por el centro del escote).",
    },
  },
  dress: {
    label: "Vestido",
    measures: ["pecho", "cintura", "cadera", "largo"],
    defaults: ["pecho", "cintura", "largo"],
    texts: {
      cintura: "Contorno completo en la parte más angosta del vestido.",
      largo: "Desde el punto más alto del hombro hasta el dobladillo.",
    },
  },
  // Vestido ajustado de manga larga
  dressSleeves: {
    label: "Vestido de manga",
    measures: ["hombro", "pecho", "cintura", "cadera", "largo", "manga"],
    defaults: ["pecho", "cintura", "largo"],
    texts: {
      cintura: "Contorno completo en la parte más angosta del vestido.",
      largo: "Desde donde el hombro se une al cuello hasta el dobladillo.",
    },
  },
  // Medidas de la clienta (la "tabla del cuerpo"), no de la prenda
  body: {
    label: "Tu cuerpo",
    measures: ["altura", "pecho", "cintura", "cadera"],
    defaults: ["altura", "pecho", "cintura", "cadera"],
    texts: {
      pecho: "Contorno de tu busto, en la parte más llena.",
      cintura: "Contorno de tu cintura natural, en la parte más angosta.",
      cadera: "Contorno de tus caderas, en la parte más ancha.",
    },
  },
};

/** Una medida: número, rango [mín, máx] o null (sin dato). */
export type GuideValue = number | [number, number] | null;

const fmt = (n: number) => n.toLocaleString("es-MX");

/** Para la tabla de la tienda: "65", "62–92" o "—". */
export function formatValue(v: GuideValue): string {
  if (v == null) return "—";
  return Array.isArray(v) ? `${fmt(v[0])}–${fmt(v[1])}` : fmt(v);
}

/** Para el campo del admin: "65" o "62-92". */
export function valueToText(v: GuideValue): string {
  if (v == null) return "";
  return Array.isArray(v) ? `${v[0]}-${v[1]}` : String(v);
}

/** Lee lo que se escribió en el admin: null si está vacío, undefined si no es válido. */
export function parseValue(text: string | undefined): GuideValue | undefined {
  const t = (text ?? "").trim();
  if (!t) return null;
  const range = t.match(/^(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)$/);
  if (range) {
    const [a, b] = [Number(range[1]), Number(range[2])];
    return a > 0 && b > a ? [a, b] : undefined;
  }
  const n = Number(t);
  return /^\d+(?:\.\d+)?$/.test(t) && n > 0 ? n : undefined;
}

function isValue(v: unknown): v is Exclude<GuideValue, null> {
  const ok = (n: unknown) => typeof n === "number" && Number.isFinite(n);
  return ok(v) || (Array.isArray(v) && v.length === 2 && ok(v[0]) && ok(v[1]));
}

/** Cómo se mide una medida en una prenda. */
export function measureText(figure: Figure, m: Measure): string {
  return FIGURES[figure].texts?.[m] ?? MEASURES[m].text;
}

export interface GuidePart {
  /** Nombre de la pestaña ("Pantalón", "Top"); puede ir vacío si la guía tiene una sola parte. */
  label: string;
  figure: Figure;
  /** Columnas de la tabla, en centímetros. */
  measures: Measure[];
  /** `values` va en el orden de `measures`; null = sin dato. */
  rows: { size: string; values: GuideValue[] }[];
}

export interface SizeGuide {
  parts: GuidePart[];
}

/** Categorías con plantillas (se reconocen por nombre, sin acentos). */
type CategoryKey = "pants" | "skirts" | "sets" | "dresses" | "tops";

/** Guía de una sola parte (sin nombre de pestaña). */
function single(figure: Figure, measures: Measure[], rows: GuidePart["rows"]): SizeGuide {
  return { parts: [{ label: "", figure, measures, rows }] };
}

export const TEMPLATES: { name: string; category: CategoryKey; guide: SizeGuide }[] = [
  {
    name: "Pantalón MX3–MX15",
    category: "pants",
    guide: single(
      "pants",
      ["cintura", "cadera", "entrepierna"],
      [
        { size: "MX3", values: [57, 85, 75] },
        { size: "MX5", values: [59.5, 87.5, 75] },
        { size: "MX7", values: [62, 90, 75] },
        { size: "MX9", values: [65, 94, 76] },
        { size: "MX11", values: [67.5, 97.5, 76] },
        { size: "MX13", values: [69.5, 101.5, 76] },
        { size: "MX15", values: [72.5, 105.5, 76] },
      ]
    ),
  },
  {
    name: "Pantalón CH–XG",
    category: "pants",
    guide: single(
      "pants",
      ["cintura", "cadera", "largo", "entrepierna", "muslo"],
      [
        { size: "CH", values: [70, 97, 101, 75, 58.5] },
        { size: "M", values: [74, 101, 102.5, 75, 60.5] },
        { size: "G", values: [80, 107, 104, 75, 63.5] },
        { size: "XG", values: [86, 113, 105.5, 75, 66.5] },
      ]
    ),
  },
  {
    name: "Falda short MX3–MX15",
    category: "skirts",
    guide: single(
      "shorts",
      ["cintura", "cadera", "largo", "entrepierna"],
      [
        { size: "MX3", values: [56, 77, 38.5, 12] },
        { size: "MX5", values: [58.6, 81.6, 39, 13] },
        { size: "MX7", values: [61.2, 86.2, 39.5, 14] },
        { size: "MX9", values: [63.8, 90.8, 40, 15] },
        { size: "MX11", values: [66.2, 95.4, 40.5, 16] },
        { size: "MX13", values: [68.8, 100, 41, 17] },
        { size: "MX15", values: [71.4, 104.6, 41.5, 18] },
      ]
    ),
  },
  {
    name: "Falda 25–31",
    category: "skirts",
    guide: single(
      "skirt",
      ["cintura", "cadera", "largo"],
      [
        { size: "25", values: [58, 80, 33] },
        { size: "26", values: [61, 82, 33.7] },
        { size: "27", values: [64, 84, 34.4] },
        { size: "28", values: [67, 86, 35.1] },
        { size: "29", values: [70, 88, 35.8] },
        { size: "30", values: [73, 90, 36.5] },
        { size: "31", values: [76, 92, 37.2] },
      ]
    ),
  },
  {
    name: "Conjunto pantalón y top XXCH–XG",
    category: "sets",
    guide: {
      parts: [
        {
          label: "Pantalón",
          figure: "pants",
          measures: ["cintura", "cadera", "largo", "entrepierna"],
          rows: [
            { size: "XXCH", values: [60, 95, 99.2, 76] },
            { size: "XCH", values: [63, 99, 100.1, 76.5] },
            { size: "CH", values: [66, 103, 101, 77] },
            { size: "M", values: [69, 107, 101.9, 77.5] },
            { size: "G", values: [74, 113, 102.5, 77.5] },
            { size: "XG", values: [79, 119, 103.1, 77.5] },
          ],
        },
        {
          label: "Top",
          figure: "top",
          measures: ["pecho", "largo"],
          rows: [
            { size: "XXCH", values: [102, 32.5] },
            { size: "XCH", values: [106, 33.5] },
            { size: "CH", values: [110, 34.5] },
            { size: "M", values: [114, 35.5] },
            { size: "G", values: [120, 36.5] },
            { size: "XG", values: [126, 37.5] },
          ],
        },
      ],
    },
  },
  {
    name: "Vestido elástico XCH–G (prenda y cuerpo)",
    category: "dresses",
    guide: {
      parts: [
        {
          label: "Prenda",
          figure: "dress",
          measures: ["pecho", "cintura", "largo"],
          rows: [
            { size: "XCH", values: [[62, 92], [65, 92], 106] },
            { size: "CH", values: [[66, 96], [69, 96], 107] },
            { size: "M", values: [[70, 100], [73, 100], 108] },
            { size: "G", values: [[76, 106], [79, 106], 109] },
          ],
        },
        {
          label: "Tu cuerpo",
          figure: "body",
          measures: ["altura", "pecho", "cintura", "cadera"],
          rows: [
            { size: "XCH", values: [[160, 165], [82, 86], [62, 66], [87, 91]] },
            { size: "CH", values: [[165, 170], [86, 90], [66, 70], [91, 95]] },
            { size: "M", values: [[165, 170], [90, 94], [70, 74], [95, 99]] },
            { size: "G", values: [[170, 175], [94, 100], [74, 80], [99, 105]] },
          ],
        },
      ],
    },
  },
  {
    name: "Vestido de manga XXCH–XG",
    category: "dresses",
    guide: single(
      "dressSleeves",
      ["pecho", "cintura", "largo"],
      [
        { size: "XXCH", values: [68, 63, 80] },
        { size: "XCH", values: [72, 67, 81] },
        { size: "CH", values: [76, 71, 82] },
        { size: "M", values: [80, 75, 83] },
        { size: "G", values: [86, 81, 84.5] },
        { size: "XG", values: [92, 87, 86] },
      ]
    ),
  },
  {
    name: "Blusa CH–XG (prenda y cuerpo)",
    category: "tops",
    guide: {
      parts: [
        {
          label: "Prenda",
          figure: "top",
          measures: ["pecho", "largo", "manga", "biceps", "puno"],
          rows: [
            { size: "CH", values: [98, 63.5, 63.5, 41, 21] },
            { size: "M", values: [102, 64.5, 64.5, 42.4, 22] },
            { size: "G", values: [108, 66, 65.5, 44.6, 23.5] },
            { size: "XG", values: [114, 67.5, 66.5, 46.8, 25] },
          ],
        },
        {
          label: "Tu cuerpo",
          figure: "body",
          measures: ["altura", "pecho", "cintura", "cadera"],
          rows: [
            { size: "CH", values: [[165, 170], [86, 90], [66, 70], [91, 95]] },
            { size: "M", values: [[165, 170], [90, 94], [70, 74], [95, 99]] },
            { size: "G", values: [[170, 175], [94, 100], [74, 80], [99, 105]] },
            { size: "XG", values: [[170, 175], [100, 106], [80, 86], [105, 111]] },
          ],
        },
      ],
    },
  },
  {
    name: "Top strapless XCH–XG (prenda y cuerpo)",
    category: "tops",
    guide: {
      parts: [
        {
          label: "Prenda",
          figure: "tubeTop",
          measures: ["pecho", "cintura", "largo"],
          rows: [
            { size: "XCH", values: [66.5, 65, 80] },
            { size: "CH", values: [70.5, 69, 81] },
            { size: "M", values: [74.5, 73, 82] },
            { size: "G", values: [80.5, 79, 83.5] },
            { size: "XG", values: [86.5, 85, 85] },
          ],
        },
        {
          label: "Tu cuerpo",
          figure: "body",
          measures: ["altura", "pecho", "cintura", "cadera"],
          rows: [
            { size: "XCH", values: [[160, 165], [82, 86], [62, 66], [87, 91]] },
            { size: "CH", values: [[165, 170], [86, 90], [66, 70], [91, 95]] },
            { size: "M", values: [[165, 170], [90, 94], [70, 74], [95, 99]] },
            { size: "G", values: [[170, 175], [94, 100], [74, 80], [99, 105]] },
            { size: "XG", values: [[170, 175], [100, 106], [80, 86], [105, 111]] },
          ],
        },
      ],
    },
  },
];

/** Equivalencias de tallas de letra (en la tienda se venden como XXCH, XCH, CH, M, G, XG). */
const EQUIVALENT: Record<string, string> = {
  xxch: "XXS",
  xxs: "XXCH",
  xch: "XS",
  xs: "XCH",
  ch: "S",
  s: "CH",
  g: "L",
  l: "G",
  xg: "XL",
  xl: "XG",
};

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Su equivalente para mostrar debajo en la tabla (CH → S), si tiene. */
export function sizeEquivalent(size: string): string | undefined {
  return EQUIVALENT[normalize(size)];
}

/** ¿Son la misma talla? Acepta equivalentes y la forma "CH (S)". */
export function sameSize(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const names = (s: string) => {
    const n = normalize(s);
    const m = n.match(/^(\S+)\s*\((\S+)\)$/);
    const base = m ? [m[1], m[2]] : [n];
    return base.flatMap((x) => [x, normalize(EQUIVALENT[x] ?? "")]).filter(Boolean);
  };
  const na = names(a);
  return names(b).some((x) => na.includes(x));
}

function parsePart(raw: unknown): GuidePart | null {
  if (!raw || typeof raw !== "object") return null;
  const g = raw as Partial<GuidePart>;
  if (!g.figure || !(g.figure in FIGURES) || !Array.isArray(g.measures) || !Array.isArray(g.rows)) return null;
  const measures = g.measures.filter((m): m is Measure => typeof m === "string" && m in MEASURES);
  if (measures.length === 0 || measures.length !== g.measures.length) return null;
  const rows = g.rows
    .filter((r) => r && typeof r.size === "string" && Array.isArray(r.values))
    .map((r) => ({
      size: r.size,
      values: measures.map((_, i) => (isValue(r.values[i]) ? r.values[i] : null)),
    }))
    // Una talla sin ninguna medida no aporta nada a la tabla
    .filter((r) => r.values.some((v) => v != null));
  if (rows.length === 0) return null;
  return { label: typeof g.label === "string" ? g.label : "", figure: g.figure, measures, rows };
}

/**
 * Lee la guía que viene de la BD; si no tiene la forma esperada, null (no se muestra).
 * Acepta las guías de una sola parte guardadas antes de las partes ({figure, measures, rows}).
 */
export function parseGuide(raw: unknown): SizeGuide | null {
  if (!raw || typeof raw !== "object") return null;
  const list = Array.isArray((raw as { parts?: unknown }).parts) ? (raw as { parts: unknown[] }).parts : [raw];
  const parts = list.map(parsePart).filter((p): p is GuidePart => p != null);
  return parts.length > 0 ? { parts } : null;
}

/**
 * Lo que cada categoría con plantillas usa en el admin: tipo de prenda de una guía nueva
 * y si sus botones rápidos de talla conservan los de siempre (XS–XL) además de los de
 * sus plantillas. Pantalones y conjuntos solo usan los suyos (MX, CH–XG, XXCH–XG).
 */
const CATEGORIES: Record<CategoryKey, { figure: Figure; keepDefaultSizes: boolean; sizes?: string[] }> = {
  pants: { figure: "pants", keepDefaultSizes: false },
  skirts: { figure: "skirt", keepDefaultSizes: true },
  sets: { figure: "top", keepDefaultSizes: false },
  // Vestidos: todas las tallas de letra (no solo las de su plantilla, que llega a G) y Unitalla
  dresses: { figure: "dress", keepDefaultSizes: false, sizes: ["XXCH", "XCH", "CH", "M", "G", "XG", "Unitalla"] },
  tops: { figure: "top", keepDefaultSizes: false, sizes: ["XXCH", "XCH", "CH", "M", "G", "XG", "Unitalla"] },
};

function categoryKey(categoryName: string | null | undefined): CategoryKey | null {
  const name = normalize(categoryName ?? "");
  if (name.includes("pantalon")) return "pants";
  if (name.includes("falda")) return "skirts";
  if (name.includes("conjunto")) return "sets";
  if (name.includes("vestido")) return "dresses";
  if (name.includes("blusa") || name.includes("top")) return "tops";
  return null;
}

/** Tipo de prenda que le corresponde a una categoría (para una guía nueva). */
export function figureFor(categoryName: string | null | undefined): Figure {
  const key = categoryKey(categoryName);
  return key ? CATEGORIES[key].figure : "pants";
}

/** Botones rápidos de talla del admin: los de las plantillas de la categoría (sin repetir) y, si aplica, los de siempre. */
export function quickSizesFor(categoryName: string | null | undefined, defaults: string[]): string[] {
  const key = categoryKey(categoryName);
  if (!key) return defaults;
  const own = CATEGORIES[key].sizes;
  const sizes = own ?? TEMPLATES.filter((t) => t.category === key).flatMap((t) => t.guide.parts.flatMap((p) => p.rows.map((r) => r.size)));
  return [...new Set([...sizes, ...(CATEGORIES[key].keepDefaultSizes ? defaults : [])])];
}
