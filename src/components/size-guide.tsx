"use client";

import { Ruler, X } from "lucide-react";
import { useId, useRef, useState } from "react";

import {
  type Figure,
  formatValue,
  type GuidePart,
  type Measure,
  MEASURES,
  measureText,
  sameSize,
  type SizeGuide as Guide,
  sizeEquivalent,
} from "@/lib/size-guides";

import { cn } from "./ui";

/** Enlace "Guía de tallas" que abre la tabla de medidas y cómo medir (una pestaña por parte). */
export function SizeGuide({ guide, selectedSize }: { guide: Guide; selectedSize?: string | null }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const tabsId = useId();
  const [tab, setTab] = useState(0);
  const part = guide.parts[Math.min(tab, guide.parts.length - 1)];

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

          {/* Un conjunto trae una tabla por prenda: una pestaña para cada una */}
          {guide.parts.length > 1 && (
            <div role="tablist" aria-label="Prenda" className="-mt-2 flex gap-2 border-b border-line">
              {guide.parts.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  id={`${tabsId}-${i}`}
                  aria-selected={i === tab}
                  onClick={() => setTab(i)}
                  className={cn(
                    "-mb-px min-h-11 border-b-2 px-4 font-semibold",
                    i === tab ? "border-brand text-brand" : "border-transparent text-muted"
                  )}>
                  {p.label || `Parte ${i + 1}`}
                </button>
              ))}
            </div>
          )}

          <div
            role={guide.parts.length > 1 ? "tabpanel" : undefined}
            aria-labelledby={guide.parts.length > 1 ? `${tabsId}-${tab}` : undefined}
            className="flex flex-col gap-6">
            <PartView key={tab} part={part} selectedSize={selectedSize} />
          </div>
        </div>
      </dialog>
    </>
  );
}

function PartView({ part, selectedSize }: { part: GuidePart; selectedSize?: string | null }) {
  // "Tu cuerpo": medidas de la clienta, no de la prenda
  const isBody = part.figure === "body";
  return (
    <>
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold">{isBody ? "Tus medidas (cm)" : "Medidas de la prenda (cm)"}</h3>
        {/* Con muchas columnas, la tabla se desliza de lado en el celular */}
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-center text-xs tabular-nums sm:text-sm">
            <thead className="bg-surface text-xs text-muted">
              <tr>
                <th scope="col" className="px-1 py-2.5 font-semibold sm:px-2">
                  Talla
                </th>
                {part.measures.map((m) => (
                  <th key={m} scope="col" className="px-1 py-2.5 font-semibold sm:px-2">
                    {MEASURES[m].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {part.rows.map((r) => {
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
                      <td key={part.measures[i]} className="px-1 py-2.5 sm:px-2">
                        {formatValue(v)}
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
        <h3 className="text-sm font-semibold">{isBody ? "Cómo medirte" : "Cómo medir"}</h3>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <GarmentDiagram figure={part.figure} measures={part.measures} />
          <ol className="flex flex-1 flex-col gap-3">
            {part.measures.map((m, i) => (
              <li key={m} className="flex gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink text-xs font-bold text-paper">{i + 1}</span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold">{MEASURES[m].label}</span>
                  <span className="text-sm text-muted">{measureText(part.figure, m)}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <p className="text-xs text-muted">
          {isBody
            ? "Mídete con una cinta métrica, sin apretar. Si quedas entre dos tallas, elige la más grande."
            : "Tip: compara con una prenda tuya que te quede bien, medida de la misma forma."}
        </p>
      </section>
    </>
  );
}

type Line = { d: string; x: number; y: number };

/**
 * Dibujo de cada tipo de prenda: su silueta y, por medida, la línea y el lugar de su
 * número. Pretina (de x 50 a 150) si `band`; bragueta y botón si `fly`.
 * Solo hace falta la línea de las medidas que la prenda tiene en FIGURES.
 */
const FIGURE_ART: Partial<
  Record<
    Figure,
    {
      viewBox: string;
      className: string;
      body: string;
      band: boolean;
      fly: boolean;
      /** Costuras de adorno (sin relleno). */
      details?: string;
      lines: Partial<Record<Measure, Line>>;
    }
  >
> = {
  pants: {
    viewBox: "0 0 190 256",
    className: "h-56",
    body: "M50 36 L40 244 L93 244 L100 118 L107 244 L160 244 L150 36 Z",
    band: true,
    fly: true,
    lines: {
      cintura: { d: "M50 12 H150 M50 8 V16 M150 8 V16", x: 170, y: 12 },
      cadera: { d: "M47.5 88 H152.5 M47.5 84 V92 M152.5 84 V92", x: 170, y: 88 },
      entrepierna: { d: "M107 120 L114 242 M103 120 H111 M110 242 H118", x: 130, y: 181 },
      largo: { d: "M40 22 L30 244 M36 22 H44 M26 244 H34", x: 18, y: 133 },
      muslo: { d: "M46 132 H98 M46 128 V136 M98 128 V136", x: 72, y: 150 },
    },
  },
  // Falda short: misma pretina, pierna corta
  shorts: {
    viewBox: "0 0 190 190",
    className: "h-44",
    body: "M50 36 L38 170 L94 176 L100 118 L106 176 L162 170 L150 36 Z",
    band: true,
    fly: true,
    lines: {
      cintura: { d: "M50 12 H150 M50 8 V16 M150 8 V16", x: 170, y: 12 },
      cadera: { d: "M45.5 88 H154.5 M45.5 84 V92 M154.5 84 V92", x: 172, y: 88 },
      entrepierna: { d: "M107 121 L112 173 M103 121 H111 M108 173 H116", x: 130, y: 150 },
      largo: { d: "M40 22 L28 172 M36 22 H44 M24 172 H32", x: 17, y: 97 },
      muslo: { d: "M42 130 H98 M42 126 V134 M98 126 V134", x: 70, y: 148 },
    },
  },
  // Falda en A, con el dobladillo curvo
  skirt: {
    viewBox: "0 0 190 215",
    className: "h-48",
    body: "M50 36 L34 196 Q100 210 166 196 L150 36 Z",
    band: true,
    fly: false,
    lines: {
      cintura: { d: "M50 12 H150 M50 8 V16 M150 8 V16", x: 170, y: 12 },
      cadera: { d: "M46.5 70 H153.5 M46.5 66 V74 M153.5 66 V74", x: 172, y: 70 },
      largo: { d: "M40 22 L24 198 M36 22 H44 M20 198 H28", x: 14, y: 110 },
    },
  },
  // Top de manga larga, de frente
  top: {
    viewBox: "-20 0 230 200",
    className: "h-48",
    body: "M88 24 Q105 38 122 24 L144 30 L182 92 L166 100 L146 68 L146 176 L64 176 L64 68 L44 100 L28 92 L66 30 Z",
    band: false,
    fly: false,
    lines: {
      pecho: { d: "M64 78 H146 M64 74 V82 M146 74 V82", x: 105, y: 96 },
      largo: { d: "M8 24 V176 M4 24 H12 M4 176 H12", x: -6, y: 100 },
      hombro: { d: "M66 16 H144 M66 12 V20 M144 12 V20", x: 164, y: 14 },
      manga: { d: "M149 27 L187 89 M145.6 29.1 L152.4 24.9 M183.6 91.1 L190.4 86.9", x: 188, y: 50 },
      biceps: { d: "M163 61 L147.6 70.5", x: 128, y: 60 },
      puno: { d: "M184.6 96.3 L168.6 104.3", x: 172, y: 120 },
    },
  },
  // Top strapless: orilla de arriba en corazón, cuerpo recto y un poco de vuelo abajo
  tubeTop: {
    viewBox: "14 16 152 196",
    className: "h-48",
    body: "M60 30 Q82 22 105 36 Q128 22 150 30 L146 100 Q144 104 146 110 L152 200 L58 200 L64 110 Q66 104 64 100 Z",
    band: false,
    fly: false,
    // Costura del escote, paralela a la orilla
    details: "M62 40 Q83 32 105 46 Q127 32 148 40",
    lines: {
      pecho: { d: "M61 52 H149 M61 48 V56 M149 48 V56", x: 105, y: 68 },
      cintura: { d: "M64 100 H146 M64 96 V104 M146 96 V104", x: 105, y: 116 },
      largo: { d: "M46 30 V200 M42 30 H50 M42 200 H50", x: 30, y: 115 },
    },
  },
  // Blusa halter: cuello alto, sisas cortadas hacia el cuello, suelta y con caída
  topHalter: {
    viewBox: "18 0 150 200",
    className: "h-48",
    body: "M92 8 H118 V24 Q122 46 140 66 L150 186 Q105 196 60 186 L70 66 Q88 46 92 24 Z",
    band: false,
    fly: false,
    // Orilla del cuello y pliegues de la caída
    details: "M92 24 H118 M100 25 Q98 50 94 80 M110 25 Q112 50 116 80",
    lines: {
      pecho: { d: "M69 76 H141 M69 72 V80 M141 72 V80", x: 105, y: 93 },
      cintura: { d: "M66 120 H144 M66 116 V124 M144 116 V124", x: 105, y: 137 },
      largo: { d: "M44 8 V188 M40 8 H48 M40 188 H48", x: 30, y: 98 },
    },
  },
  // Vestido de tirantes: corpiño ajustado, costura en la cintura y falda en A
  dress: {
    viewBox: "-20 0 230 225",
    className: "h-52",
    body: "M78 14 L90 14 Q105 34 120 14 L132 14 L136 48 Q140 70 134 92 L172 206 Q105 220 38 206 L76 92 Q70 70 74 48 Z",
    band: false,
    fly: false,
    details: "M76 92 H134",
    lines: {
      pecho: { d: "M73 58 H137 M73 54 V62 M137 54 V62", x: 105, y: 75 },
      cintura: { d: "M76 92 H134 M76 88 V96 M134 88 V96", x: 152, y: 90 },
      cadera: { d: "M67 120 H143 M67 116 V124 M143 116 V124", x: 162, y: 120 },
      largo: { d: "M20 14 V206 M16 14 H24 M16 206 H24", x: 6, y: 110 },
    },
  },
  // Vestido ajustado de manga larga: mangas como las del top y falda recta
  dressSleeves: {
    viewBox: "-20 0 230 225",
    className: "h-52",
    body: "M88 24 Q105 38 122 24 L144 30 L170 140 L158 144 L144 70 Q142 90 138 100 Q146 150 146 206 Q105 214 64 206 Q64 150 72 100 Q68 90 66 70 L52 144 L40 140 L66 30 Z",
    band: false,
    fly: false,
    lines: {
      hombro: { d: "M66 16 H144 M66 12 V20 M144 12 V20", x: 164, y: 14 },
      pecho: { d: "M67 76 H143 M67 72 V80 M143 72 V80", x: 105, y: 88 },
      cintura: { d: "M72 100 H138 M72 96 V104 M138 96 V104", x: 105, y: 114 },
      cadera: { d: "M68 131 H142 M68 127 V135 M142 127 V135", x: 105, y: 148 },
      largo: { d: "M20 24 V206 M16 24 H24 M16 206 H24", x: 6, y: 115 },
      manga: { d: "M149.8 28.6 L175.8 138.6 M145.9 29.5 L153.7 27.7 M171.9 139.5 L179.7 137.7", x: 184, y: 84 },
    },
  },
  // Vestido halter: cuello alto, sisas cortadas hacia el cuello, pretina fruncida y falda con vuelo
  dressHalter: {
    viewBox: "-20 0 230 215",
    className: "h-52",
    body: "M92 8 H118 V22 Q122 44 140 62 Q138 82 132 100 L130 116 L170 194 Q105 210 40 194 L80 116 L78 100 Q72 82 70 62 Q88 44 92 22 Z",
    band: false,
    fly: false,
    // Orilla del cuello, frunces del corpiño y pretina
    details: "M92 22 H118 M100 23 Q98 44 95 66 M110 23 Q112 44 115 66 M78 100 H132 M80 116 H130",
    lines: {
      pecho: { d: "M71 72 H139 M71 68 V76 M139 68 V76", x: 105, y: 87 },
      cintura: { d: "M79 108 H131 M79 104 V112 M131 104 V112", x: 150, y: 108 },
      largo: { d: "M20 8 V198 M16 8 H24 M16 198 H24", x: 6, y: 105 },
    },
  },
  // "Tu cuerpo": silueta de frente con cinta en busto, cintura y cadera, y la altura al lado
  body: {
    viewBox: "0 0 136 250",
    className: "h-56",
    body: "M54 36 L54 44 Q38 46 34 56 L27 112 L33 114 L39 72 Q44 90 46 104 Q34 124 36 144 Q40 190 47 238 L56 238 L59 160 L61 160 L64 238 L73 238 Q80 190 84 144 Q86 124 74 104 Q76 90 81 72 L87 114 L93 112 L86 56 Q82 46 66 44 L66 36 Z",
    band: false,
    fly: false,
    // Cabeza
    details: "M73 22 A13 13 0 1 0 47 22 A13 13 0 1 0 73 22",
    lines: {
      altura: { d: "M114 9 V238 M110 9 H118 M110 238 H118", x: 126, y: 124 },
      pecho: { d: "M41 82 A19 4 0 1 0 79 82 A19 4 0 1 0 41 82", x: 101, y: 70 },
      cintura: { d: "M46 104 A14 3.5 0 1 0 74 104 A14 3.5 0 1 0 46 104", x: 16, y: 104 },
      cadera: { d: "M36 138 A24 4.5 0 1 0 84 138 A24 4.5 0 1 0 36 138", x: 100, y: 148 },
    },
  },
};

/** La prenda con las medidas de la guía, numeradas en el mismo orden que la lista. */
function GarmentDiagram({ figure, measures }: { figure: Figure; measures: Measure[] }) {
  const art = FIGURE_ART[figure];
  if (!art) return null;
  return (
    <svg viewBox={art.viewBox} className={cn(art.className, "w-auto shrink-0")} aria-hidden>
      {/* Prenda */}
      <g className="fill-surface stroke-muted" strokeWidth={1.5} strokeLinejoin="round">
        <path d={art.body} />
        {art.band && <rect x={50} y={22} width={100} height={14} rx={2} />}
      </g>
      {art.details && <path d={art.details} className="fill-none stroke-muted" strokeWidth={1.2} />}
      {art.fly && (
        <>
          <path d="M100 36 V96" className="stroke-muted" strokeWidth={1.2} strokeDasharray="3 3" />
          <circle cx={100} cy={29} r={2.5} className="fill-muted" />
        </>
      )}

      {/* Medidas */}
      {/* fill-none: las cintas del cuerpo son elipses (cerradas) */}
      <g className="fill-none stroke-brand" strokeWidth={2} strokeLinecap="round">
        {measures.map((m) => art.lines[m] && <path key={m} d={art.lines[m].d} />)}
      </g>
      {measures.map((m, i) => {
        const line = art.lines[m];
        return line && <Marker key={m} x={line.x} y={line.y} n={i + 1} />;
      })}
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
