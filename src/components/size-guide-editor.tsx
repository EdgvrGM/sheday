"use client";

import { Plus, Ruler, Trash2, X } from "lucide-react";
import { useId } from "react";

import { cmInput, MAX, textInput } from "@/lib/input";
import {
  type Figure,
  FIGURES,
  type GuidePart,
  type Measure,
  MEASURES,
  parseValue,
  sameSize,
  type SizeGuide,
  TEMPLATES,
  valueToText,
} from "@/lib/size-guides";

import { Button, Chip, cn, inputClass } from "./ui";

/**
 * Guía en edición: una o varias partes (un conjunto: "Pantalón" y "Top"). Las filas de
 * cada parte son propias (no dependen de las tallas en stock): una plantilla trae todas
 * sus tallas, y se pueden agregar o quitar.
 */
export interface GuideDraft {
  parts: PartDraft[];
}

interface PartDraft {
  key: string;
  label: string;
  figure: Figure;
  measures: Measure[];
  rows: RowDraft[];
}

interface RowDraft {
  key: string;
  size: string;
  /** values[medida] = "65.5" o un rango "62-92" */
  values: Partial<Record<Measure, string>>;
}

let keySeq = 0;
const newKey = () => `g${++keySeq}`;

function partFrom(part: GuidePart): PartDraft {
  return {
    key: newKey(),
    label: part.label,
    figure: part.figure,
    measures: part.measures,
    rows: part.rows.map((r) => ({
      key: newKey(),
      size: r.size,
      values: Object.fromEntries(part.measures.flatMap((m, i) => (r.values[i] == null ? [] : [[m, valueToText(r.values[i])]]))),
    })),
  };
}

function newPart(figure: Figure, sizes: string[], label = ""): PartDraft {
  return {
    key: newKey(),
    label,
    figure,
    measures: FIGURES[figure].defaults,
    rows: (sizes.length > 0 ? sizes : [""]).map((size) => ({ key: newKey(), size, values: {} })),
  };
}

export function draftFromGuide(guide: SizeGuide): GuideDraft {
  return { parts: guide.parts.map(partFrom) };
}

const partName = (p: PartDraft, i: number) => p.label.trim() || `Parte ${i + 1}`;

/** Guía lista para guardar, o el error que lo impide. */
export function validateGuide(draft: GuideDraft): { guide: SizeGuide } | { error: string } {
  const multi = draft.parts.length > 1;
  const parts: GuidePart[] = [];
  for (const [i, p] of draft.parts.entries()) {
    const where = multi ? `En la parte «${partName(p, i)}» de la guía de tallas` : "En la guía de tallas";
    if (multi && !p.label.trim()) return { error: "Ponle nombre a cada parte de la guía de tallas (por ejemplo «Top»)." };
    const rows: GuidePart["rows"] = [];
    for (const r of p.rows) {
      const parsed = p.measures.map((m) => parseValue(r.values[m]));
      if (parsed.some((v) => v === undefined)) {
        return { error: `${where}, revisa las medidas de la talla ${r.size.trim() || "sin nombre"}: escribe un número (65) o un rango (62-92).` };
      }
      const values = parsed.map((v) => v ?? null);
      // Una fila sin talla ni medidas se ignora
      if (r.size.trim() || values.some((v) => v != null)) rows.push({ size: r.size.trim(), values });
    }
    const seen = new Set<string>();
    for (const r of rows) {
      if (!r.size) return { error: `${where}, escribe la talla de cada fila con medidas.` };
      const key = r.size.toLowerCase();
      if (seen.has(key)) return { error: `${where}, la talla "${r.size}" está repetida.` };
      seen.add(key);
    }
    if (!rows.some((r) => r.values.some((v) => v != null))) {
      return {
        error: multi
          ? `La parte «${partName(p, i)}» de la guía de tallas está vacía: escribe sus medidas o quítala.`
          : "La guía de tallas está vacía: escribe al menos una medida o quítala.",
      };
    }
    parts.push({ label: multi ? p.label.trim() : "", figure: p.figure, measures: p.measures, rows });
  }
  return { guide: { parts } };
}

function hasValues(draft: GuideDraft | null): boolean {
  return !!draft && draft.parts.some((p) => p.rows.some((r) => Object.values(r.values).some(Boolean)));
}

export function SizeGuideEditor({
  draft,
  onChange,
  sizes,
  figure,
  others,
  onCopied,
}: {
  draft: GuideDraft | null;
  onChange: (draft: GuideDraft | null) => void;
  /** Tallas del producto, en orden (se agregan a la guía si la plantilla no las trae). */
  sizes: string[];
  /** Tipo de prenda para una guía nueva (según la categoría). */
  figure: Figure;
  /** Otros productos con guía, para copiar. */
  others: { id: number; name: string; guide: SizeGuide }[];
  onCopied: (message: string) => void;
}) {
  const selectId = useId();

  function copy(value: string) {
    const [kind, key] = value.split(":");
    const source = kind === "t" ? TEMPLATES[Number(key)]?.guide : others.find((o) => o.id === Number(key))?.guide;
    if (!source) return;
    if (hasValues(draft) && !window.confirm("Se reemplazará la guía que ya escribiste. ¿Continuar?")) return;
    // La guía completa, más las tallas del producto que no trae (vacías, para llenarlas)
    const missing = sizes.filter((s) => !source.parts[0].rows.some((r) => sameSize(r.size, s)));
    const parts = source.parts.map((p) => {
      const part = partFrom(p);
      const absent = sizes.filter((s) => !p.rows.some((r) => sameSize(r.size, s)));
      part.rows.push(...absent.map((size) => ({ key: newKey(), size, values: {} })));
      return part;
    });
    onChange({ parts });
    const loaded =
      source.parts.length > 1
        ? `Se cargaron ${source.parts.length} partes (${source.parts.map((p) => p.label).join(" y ")})`
        : `Se cargaron ${source.parts[0].rows.length} tallas`;
    onCopied(missing.length > 0 ? `${loaded}. Agrega las medidas de ${missing.join(", ")}.` : `${loaded}. Revisa los números.`);
  }

  function updatePart(key: string, next: PartDraft) {
    if (!draft) return;
    onChange({ parts: draft.parts.map((p) => (p.key === key ? next : p)) });
  }

  function addPart() {
    if (!draft) return;
    // La segunda parte suele ser la otra prenda del conjunto
    const f: Figure = draft.parts.some((p) => p.figure === "top") ? "pants" : "top";
    // Al pasar a varias partes, cada una necesita nombre: la primera toma el de su prenda
    const parts = draft.parts.map((p) => (p.label.trim() ? p : { ...p, label: FIGURES[p.figure].label }));
    onChange({ parts: [...parts, newPart(f, sizes, FIGURES[f].label)] });
  }

  function removePart(key: string) {
    if (!draft) return;
    const part = draft.parts.find((p) => p.key === key);
    const filled = part?.rows.some((r) => Object.values(r.values).some(Boolean));
    if (filled && !window.confirm(`¿Quitar la parte «${part!.label || "sin nombre"}» de la guía?`)) return;
    onChange({ parts: draft.parts.filter((p) => p.key !== key) });
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-bold">Guía de tallas</h2>
      <p className="text-xs text-muted">
        Medidas de esta prenda en centímetros. Si no tiene guía, la página del producto no muestra «Guía de tallas». Un conjunto
        puede llevar una parte por prenda (por ejemplo «Pantalón» y «Top»): en la tienda se ven como pestañas.
      </p>

      <div className="flex flex-col gap-1">
        <label htmlFor={selectId} className="text-sm font-semibold">
          Copiar de…
        </label>
        <select id={selectId} value="" onChange={(e) => copy(e.target.value)} className={cn(inputClass, "py-2.5")}>
          <option value="">Elige una plantilla u otro producto</option>
          <optgroup label="Plantillas">
            {TEMPLATES.map((t, i) => (
              <option key={t.name} value={`t:${i}`}>
                {t.name}
              </option>
            ))}
          </optgroup>
          {others.length > 0 && (
            <optgroup label="Otros productos">
              {others.map((o) => (
                <option key={o.id} value={`p:${o.id}`}>
                  {o.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      {!draft ? (
        <Button kind="ghost" icon={Ruler} onClick={() => onChange({ parts: [newPart(figure, sizes)] })}>
          Escribir guía desde cero
        </Button>
      ) : (
        <>
          {draft.parts.map((part) => (
            <PartEditor
              key={part.key}
              part={part}
              multi={draft.parts.length > 1}
              onChange={(next) => updatePart(part.key, next)}
              onRemove={() => removePart(part.key)}
            />
          ))}

          <div className="flex flex-wrap gap-2">
            <Button kind="ghost" icon={Plus} onClick={addPart}>
              Agregar parte
            </Button>
            <Button
              kind="ghost"
              icon={Trash2}
              onClick={() => (!hasValues(draft) || window.confirm("¿Quitar la guía de tallas de este producto?")) && onChange(null)}>
              Quitar guía
            </Button>
          </div>
        </>
      )}
    </section>
  );
}

/** Una parte de la guía: prenda, medidas y tabla de tallas. */
function PartEditor({
  part,
  multi,
  onChange,
  onRemove,
}: {
  part: PartDraft;
  /** Con varias partes, cada una lleva nombre (la pestaña en la tienda) y se puede quitar. */
  multi: boolean;
  onChange: (part: PartDraft) => void;
  onRemove: () => void;
}) {
  const labelId = useId();

  function toggleMeasure(m: Measure) {
    const on = part.measures.includes(m);
    if (on && part.measures.length === 1) return; // al menos una columna
    // Se respeta el orden del dibujo
    onChange({ ...part, measures: FIGURES[part.figure].measures.filter((x) => (x === m ? !on : part.measures.includes(x))) });
  }

  function changeFigure(f: Figure) {
    if (part.figure === f) return;
    // Se conservan las medidas que también tiene la otra prenda
    const kept = FIGURES[f].measures.filter((m) => part.measures.includes(m));
    // Si el nombre era el de la prenda, cambia con ella
    const label = part.label === FIGURES[part.figure].label ? FIGURES[f].label : part.label;
    onChange({ ...part, figure: f, label, measures: kept.length > 0 ? kept : FIGURES[f].defaults });
  }

  function updateRow(key: string, patch: (r: RowDraft) => RowDraft) {
    onChange({ ...part, rows: part.rows.map((r) => (r.key === key ? patch(r) : r)) });
  }

  return (
    <div className={cn("flex flex-col gap-3", multi && "rounded-xl border border-line p-3")}>
      {multi && (
        <div className="flex items-end gap-2">
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor={labelId} className="text-sm font-semibold">
              Nombre de la parte
            </label>
            <input
              id={labelId}
              value={part.label}
              onChange={(e) => onChange({ ...part, label: textInput(e.target.value, 30) })}
              maxLength={30}
              placeholder="Top"
              className={cn(inputClass, "py-2!")}
            />
          </div>
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Quitar la parte ${part.label || "sin nombre"}`}
            className="grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-danger-soft hover:text-danger">
            <Trash2 className="size-5" />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold">Prenda (para el dibujo de «Cómo medir»)</span>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(FIGURES) as Figure[]).map((f) => (
            <Chip key={f} selected={part.figure === f} onClick={() => changeFigure(f)}>
              {FIGURES[f].label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold">Medidas</span>
        <div className="flex flex-wrap gap-2">
          {FIGURES[part.figure].measures.map((m) => (
            <Chip key={m} selected={part.measures.includes(m)} onClick={() => toggleMeasure(m)}>
              {MEASURES[m].label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-center text-sm">
          <thead className="bg-surface text-xs text-muted">
            <tr>
              <th scope="col" className="px-2 py-2.5 text-left font-semibold">
                Talla
              </th>
              {part.measures.map((m) => (
                <th key={m} scope="col" className="px-1 py-2.5 font-semibold">
                  {MEASURES[m].label}
                </th>
              ))}
              <th scope="col" className="w-11">
                <span className="sr-only">Quitar</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {part.rows.map((r) => (
              <tr key={r.key}>
                <td className="py-1.5 pr-1 pl-2">
                  <input
                    value={r.size}
                    onChange={(e) => updateRow(r.key, (x) => ({ ...x, size: textInput(e.target.value, MAX.size) }))}
                    maxLength={MAX.size}
                    placeholder="Talla"
                    aria-label="Talla"
                    // `!`: inputClass trae w-full, px-3.5 y py-3
                    className={cn(inputClass, "w-[4.5rem]! px-1.5! py-2! text-center font-semibold")}
                  />
                </td>
                {part.measures.map((m) => (
                  <td key={m} className="px-1 py-1.5">
                    <input
                      value={r.values[m] ?? ""}
                      onChange={(e) => updateRow(r.key, (x) => ({ ...x, values: { ...x.values, [m]: cmInput(e.target.value) } }))}
                      inputMode="decimal"
                      placeholder="—"
                      title="Un número (65) o un rango (62-92)"
                      aria-label={`${MEASURES[m].label}, talla ${r.size || "sin nombre"} (cm)`}
                      // Ancho para un rango como "160-165"
                      className={cn(inputClass, "w-20! px-1.5! py-2! text-center tabular-nums")}
                    />
                  </td>
                ))}
                <td className="pr-1">
                  <button
                    type="button"
                    onClick={() => onChange({ ...part, rows: part.rows.filter((x) => x.key !== r.key) })}
                    aria-label={`Quitar la talla ${r.size || "sin nombre"} de la guía`}
                    className="grid size-11 place-items-center rounded-full text-muted hover:bg-danger-soft hover:text-danger">
                    <X className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button
        kind="ghost"
        icon={Plus}
        className="self-start"
        onClick={() => onChange({ ...part, rows: [...part.rows, { key: newKey(), size: "", values: {} }] })}>
        Agregar talla
      </Button>
    </div>
  );
}
