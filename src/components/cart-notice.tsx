import { Info } from "lucide-react";

import { cn } from "./ui";

/** Avisa qué cambió en la bolsa al ponerla al día (precio, stock, piezas que ya no hay). */
export function CartNotice({ changes, className }: { changes: string[]; className?: string }) {
  if (changes.length === 0) return null;
  return (
    <div role="status" className={cn("flex items-start gap-2 rounded-xl bg-warning-soft p-3 text-sm text-warning", className)}>
      <Info className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="flex flex-col gap-1">
        <p className="font-semibold">Actualizamos tu bolsa</p>
        <ul className="flex flex-col gap-0.5">
          {changes.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
