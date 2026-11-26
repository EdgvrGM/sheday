// Guías de tallas. Cada producto guarda la suya en `products.size_guide` (0007) y se
// edita en su ficha del admin. Las PLANTILLAS de aquí abajo son puntos de partida
// para "Copiar de…" y dan los botones rápidos de talla de su categoría.

export type Measure = "cintura" | "cadera" | "entrepierna" | "largo" | "muslo";

/** Cómo se mide cada cosa (el número sale del orden en `measures` de la guía). */
export const MEASURES: Record<Measure, { label: string; text: string }> = {
  cintura: { label: "Cintura", text: "Contorno completo de la pretina, por la orilla de arriba." },
  cadera: { label: "Cadera", text: "Contorno completo en la parte más ancha de la cadera." },
  entrepierna: { label: "Entrepierna", text: "Desde el cruce de la entrepierna hasta el dobladillo, por la costura interior." },
  largo: { label: "Largo", text: "Desde la orilla de arriba de la cintura hasta el dobladillo, por el costado." },
  muslo: { label: "Muslo", text: "Contorno completo de la pierna, justo debajo de la entrepierna." },
};

/** Tipos de prenda con dibujo de "Cómo medir" y las medidas que se pueden marcar en él. */
export type Figure = "pants";
export const FIGURES: Record<Figure, { label: string; measures: Measure[] }> = {
  pants: { label: "Pantalón", measures: ["cintura", "cadera", "largo", "entrepierna", "muslo"] },
};

export interface SizeGuide {
  figure: Figure;
  /** Columnas de la tabla, en centímetros. */
  measures: Measure[];
  /** `values` va en el orden de `measures`; null = sin dato. */
  rows: { size: string; values: (number | null)[] }[];
}

export const TEMPLATES: { name: string; category: "pants"; guide: SizeGuide }[] = [
  {
    name: "Pantalón MX3–MX15",
    category: "pants",
    guide: {
      figure: "pants",
      measures: ["cintura", "cadera", "entrepierna"],
      rows: [
        { size: "MX3", values: [57, 85, 75] },
        { size: "MX5", values: [59.5, 87.5, 75] },
        { size: "MX7", values: [62, 90, 75] },
        { size: "MX9", values: [65, 94, 76] },
        { size: "MX11", values: [67.5, 97.5, 76] },
        { size: "MX13", values: [69.5, 101.5, 76] },
        { size: "MX15", values: [72.5, 105.5, 76] },
      ],
    },
  },
  {
    name: "Pantalón CH–XG",
    category: "pants",
    guide: {
      figure: "pants",
      measures: ["cintura", "cadera", "largo", "entrepierna", "muslo"],
      rows: [
        { size: "CH", values: [70, 97, 101, 75, 58.5] },
        { size: "M", values: [74, 101, 102.5, 75, 60.5] },
        { size: "G", values: [80, 107, 104, 75, 63.5] },
        { size: "XG", values: [86, 113, 105.5, 75, 66.5] },
      ],
    },
  },
];

/** Equivalencias de tallas de letra (las de pantalón se venden como CH, M, G, XG). */
const EQUIVALENT: Record<string, string> = { ch: "S", s: "CH", g: "L", l: "G", xg: "XL", xl: "XG" };

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
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

/** Lee la guía que viene de la BD; si no tiene la forma esperada, null (no se muestra). */
export function parseGuide(raw: unknown): SizeGuide | null {
  if (!raw || typeof raw !== "object") return null;
  const g = raw as Partial<SizeGuide>;
  if (!g.figure || !(g.figure in FIGURES) || !Array.isArray(g.measures) || !Array.isArray(g.rows)) return null;
  const measures = g.measures.filter((m): m is Measure => typeof m === "string" && m in MEASURES);
  if (measures.length === 0 || measures.length !== g.measures.length) return null;
  const rows = g.rows
    .filter((r) => r && typeof r.size === "string" && Array.isArray(r.values))
    .map((r) => ({
      size: r.size,
      values: measures.map((_, i) => (typeof r.values[i] === "number" && Number.isFinite(r.values[i]) ? r.values[i] : null)),
    }))
    // Una talla sin ninguna medida no aporta nada a la tabla
    .filter((r) => r.values.some((v) => v != null));
  return rows.length > 0 ? { figure: g.figure, measures, rows } : null;
}

function categoryKey(categoryName: string | null | undefined): "pants" | null {
  return normalize(categoryName ?? "").includes("pantalon") ? "pants" : null;
}

/** Tipo de prenda que le corresponde a una categoría (para una guía nueva). */
export function figureFor(categoryName: string | null | undefined): Figure {
  return categoryKey(categoryName) ?? "pants";
}

/** Tallas de las plantillas de la categoría (botones rápidos del admin), o null si no tiene. */
export function templateSizesFor(categoryName: string | null | undefined): string[] | null {
  const key = categoryKey(categoryName);
  if (!key) return null;
  return TEMPLATES.filter((t) => t.category === key).flatMap((t) => t.guide.rows.map((r) => r.size));
}
