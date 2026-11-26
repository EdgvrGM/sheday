"use client";

import { Ruler, X } from "lucide-react";
import { useId, useRef } from "react";

import { type Measure, MEASURES, sameSize, type SizeGuide as Guide, sizeEquivalent } from "@/lib/size-guides";

import { cn } from "./ui";


/** Enlace "Guía de tallas" que abre la tabla de medidas y cómo medir. */
export function SizeGuide({ guide, selectedSize }: { guide: Guide; selectedSize?: string | null }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold text-brand underline-offset-4 hover:underline">
        <Ruler className="size-4" aria-hidden />
        Guía de tallas
      </button>

      <dialog
        ref={ref}
        aria-labelledby={titleId}
        // Tocar fuera del panel lo cierra (el clic cae en el propio <dialog>)
        onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
        className="m-auto max-h-[88dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto overscroll-contain rounded-xl border border-line bg-overlay text-ink shadow-xl backdrop:bg-scrim">
        <div className="flex flex-col gap-6 p-4 sm:p-5 md:p-6">
          <div className="flex items-start justify-between gap-2">
            <h2 id={titleId} className="font-display text-2xl font-semibold">
              Guía de tallas
            </h2>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              aria-label="Cerrar"
              className="-mt-2 -mr-2 grid size-11 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface hover:text-ink">
              <X className="size-5" />
            </button>
          </div>

          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Medidas de la prenda (cm)</h3>
            {/* Con muchas columnas, la tabla se desliza de lado en el celular */}
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full text-center text-xs tabular-nums sm:text-sm">
                <thead className="bg-surface text-xs text-muted">
                  <tr>
                    <th scope="col" className="px-1 py-2.5 font-semibold sm:px-2">
                      Talla
                    </th>
                    {guide.measures.map((m) => (
                      <th key={m} scope="col" className="px-1 py-2.5 font-semibold sm:px-2">
                        {MEASURES[m].label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {guide.rows.map((r) => {
                    const selected = sameSize(r.size, selectedSize);
                    const equivalent = sizeEquivalent(r.size);
                    return (
                      <tr key={r.size} aria-current={selected || undefined} className={cn(selected && "bg-surface font-semibold")}>
                        <th scope="row" className="px-1 py-2 font-semibold sm:px-2">
                          {r.size}
                          {/* La talla como se vende arriba y su equivalente (CH → S) abajo */}
                          {equivalent && <span className="block text-xs font-normal text-muted">{equivalent}</span>}
                        </th>
                        {r.values.map((v, i) => (
                          <td key={guide.measures[i]} className="px-1 py-2.5 sm:px-2">
                            {v == null ? "—" : v.toLocaleString("es-MX")}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">Cómo medir</h3>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
              {guide.figure === "pants" && <PantsDiagram measures={guide.measures} />}
              <ol className="flex flex-1 flex-col gap-3">
                {guide.measures.map((m, i) => (
                  <li key={m} className="flex gap-3">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink text-xs font-bold text-paper">{i + 1}</span>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold">{MEASURES[m].label}</span>
                      <span className="text-sm text-muted">{MEASURES[m].text}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <p className="text-xs text-muted">Tip: compara con un pantalón tuyo que te quede bien, medido de la misma forma.</p>
          </section>
        </div>
      </dialog>
    </>
  );
}

/** Dónde va cada medida en el dibujo del pantalón: la línea y el lugar de su número. */
const PANTS_LINES: Record<Measure, { d: string; x: number; y: number }> = {
  cintura: { d: "M50 12 H150 M50 8 V16 M150 8 V16", x: 170, y: 12 },
  cadera: { d: "M47.5 88 H152.5 M47.5 84 V92 M152.5 84 V92", x: 170, y: 88 },
  entrepierna: { d: "M107 120 L114 242 M103 120 H111 M110 242 H118", x: 130, y: 181 },
  largo: { d: "M40 22 L30 244 M36 22 H44 M26 244 H34", x: 18, y: 133 },
  muslo: { d: "M46 132 H98 M46 128 V136 M98 128 V136", x: 72, y: 150 },
};

/** Pantalón con las medidas de la guía, numeradas en el mismo orden que la lista. */
function PantsDiagram({ measures }: { measures: Measure[] }) {
  return (
    <svg viewBox="0 0 190 256" className="h-56 w-auto shrink-0" aria-hidden>
      {/* Prenda */}
      <g className="fill-surface stroke-muted" strokeWidth={1.5} strokeLinejoin="round">
        <path d="M50 36 L40 244 L93 244 L100 118 L107 244 L160 244 L150 36 Z" />
        <rect x={50} y={22} width={100} height={14} rx={2} />
      </g>
      <path d="M100 36 V96" className="stroke-muted" strokeWidth={1.2} strokeDasharray="3 3" />
      <circle cx={100} cy={29} r={2.5} className="fill-muted" />

      {/* Medidas */}
      <g className="stroke-brand" strokeWidth={2} strokeLinecap="round">
        {measures.map((m) => (
          <path key={m} d={PANTS_LINES[m].d} />
        ))}
      </g>
      {measures.map((m, i) => (
        <Marker key={m} x={PANTS_LINES[m].x} y={PANTS_LINES[m].y} n={i + 1} />
      ))}
    </svg>
  );
}

function Marker({ x, y, n }: { x: number; y: number; n: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={9} className="fill-ink" />
      <text x={x} y={y} textAnchor="middle" dominantBaseline="central" className="fill-paper text-[11px] font-bold">
        {n}
      </text>
    </g>
  );
}
