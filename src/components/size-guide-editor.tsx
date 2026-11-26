"use client";

import { Ruler, Trash2 } from "lucide-react";
import { useId } from "react";

import { cmInput } from "@/lib/input";
import { type Figure, FIGURES, type Measure, MEASURES, sameSize, type SizeGuide, TEMPLATES } from "@/lib/size-guides";

import { Button, Chip, cn, inputClass } from "./ui";

/** Guía en edición: las medidas se guardan como texto por talla hasta guardar el producto. */
export interface GuideDraft {
  figure: Figure;
  measures: Measure[];
  /** cells[talla][medida] = "65.5" */
  cells: Record<string, Partial<Record<Measure, string>>>;
}

export function draftFromGuide(guide: SizeGuide): GuideDraft {
  const cells: GuideDraft["cells"] = {};
  for (const r of guide.rows) {
    cells[r.size] = Object.fromEntries(
      guide.measures.flatMap((m, i) => (r.values[i] == null ? [] : [[m, String(r.values[i])]]))
    );
  }
  return { figure: guide.figure, measures: guide.measures, cells };
}

/** Guía lista para guardar con las tallas actuales del producto; null si no tiene ninguna medida. */
export function guideFromDraft(draft: GuideDraft, sizes: string[]): SizeGuide | null {
  const rows = sizes.map((size) => ({
    size,
    values: draft.measures.map((m) => {
      const n = Number(draft.cells[size]?.[m]);
      return draft.cells[size]?.[m] && Number.isFinite(n) && n > 0 ? n : null;
    }),
  }));
  return rows.some((r) => r.values.some((v) => v != null)) ? { figure: draft.figure, measures: draft.measures, rows } : null;
}

/** Copia las medidas de otra guía a las tallas del producto (CH toma la fila CH o S). */
function copyFrom(source: SizeGuide, sizes: string[]): { draft: GuideDraft; matched: number } {
  const cells: GuideDraft["cells"] = {};
  let matched = 0;
  for (const size of sizes) {
    const row = source.rows.find((r) => sameSize(r.size, size));
    if (!row) continue;
    matched++;
    cells[size] = Object.fromEntries(
      source.measures.flatMap((m, i) => (row.values[i] == null ? [] : [[m, String(row.values[i])]]))
    );
  }
  return { draft: { figure: source.figure, measures: source.measures, cells }, matched };
}

function hasValues(draft: GuideDraft | null): boolean {
  return !!draft && Object.values(draft.cells).some((c) => Object.values(c).some(Boolean));
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
  /** Tallas únicas del producto, en orden. */
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
    if (hasValues(draft) && !window.confirm("Se reemplazarán las medidas que ya escribiste. ¿Continuar?")) return;
    const { draft: next, matched } = copyFrom(source, sizes);
    onChange(next);
    onCopied(
      sizes.length === 0
        ? "Agrega las tallas del producto para llenar la guía."
        : matched === 0
          ? "Ninguna talla coincide; escribe las medidas a mano."
          : `${matched === 1 ? "Se copió" : "Se copiaron"} ${matched} de ${sizes.length} ${sizes.length === 1 ? "talla" : "tallas"}. Revisa los números.`
    );
  }

  function toggleMeasure(m: Measure) {
    if (!draft) return;
    const on = draft.measures.includes(m);
    if (on && draft.measures.length === 1) return; // al menos una columna
    // Se respeta el orden del dibujo
    const measures = FIGURES[draft.figure].measures.filter((x) => (x === m ? !on : draft.measures.includes(x)));
    onChange({ ...draft, measures });
  }

  function setCell(size: string, m: Measure, value: string) {
    if (!draft) return;
    onChange({ ...draft, cells: { ...draft.cells, [size]: { ...draft.cells[size], [m]: cmInput(value) } } });
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-bold">Guía de tallas</h2>
      <p className="text-xs text-muted">
        Medidas de esta prenda en centímetros. Si no tiene guía, la página del producto no muestra «Guía de tallas».
      </p>

      <div className="flex flex-col gap-1">
        <label htmlFor={selectId} className="text-sm font-semibold">
          Copiar de…
        </label>
        <select
          id={selectId}
          value=""
          onChange={(e) => copy(e.target.value)}
          className={cn(inputClass, "py-2.5")}>
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
        <Button kind="ghost" icon={Ruler} onClick={() => onChange({ figure, measures: ["cintura", "cadera", "entrepierna"], cells: {} })}>
          Escribir guía desde cero
        </Button>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold">Medidas ({FIGURES[draft.figure].label.toLowerCase()})</span>
            <div className="flex flex-wrap gap-2">
              {FIGURES[draft.figure].measures.map((m) => (
                <Chip key={m} selected={draft.measures.includes(m)} onClick={() => toggleMeasure(m)}>
                  {MEASURES[m].label}
                </Chip>
              ))}
            </div>
          </div>

          {sizes.length === 0 ? (
            <p className="rounded-xl bg-surface p-4 text-sm text-muted">Agrega las tallas del producto arriba para llenar la guía.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full text-center text-sm">
                <thead className="bg-surface text-xs text-muted">
                  <tr>
                    <th scope="col" className="px-2 py-2.5 text-left font-semibold">
                      Talla
                    </th>
                    {draft.measures.map((m) => (
                      <th key={m} scope="col" className="px-1 py-2.5 font-semibold">
                        {MEASURES[m].label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {sizes.map((size) => (
                    <tr key={size}>
                      <th scope="row" className="px-2 py-1.5 text-left font-semibold whitespace-nowrap">
                        {size}
                      </th>
                      {draft.measures.map((m) => (
                        <td key={m} className="px-1 py-1.5">
                          <input
                            value={draft.cells[size]?.[m] ?? ""}
                            onChange={(e) => setCell(size, m, e.target.value)}
                            inputMode="decimal"
                            placeholder="—"
                            aria-label={`${MEASURES[m].label}, talla ${size} (cm)`}
                            // `!`: inputClass trae px-3.5 y py-3, que no dejaban ver "105.5" completo
                            className={cn(inputClass, "w-[4.5rem] px-1.5! py-2! text-center tabular-nums")}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Button
            kind="ghost"
            icon={Trash2}
            className="self-start"
            onClick={() => (!hasValues(draft) || window.confirm("¿Quitar la guía de tallas de este producto?")) && onChange(null)}>
            Quitar guía
          </Button>
        </>
      )}
    </section>
  );
}
