"use client";

import { ArrowLeft, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button, Card, ErrorBox, inputClass, PageTitle, Spinner } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { fetchCategories } from "@/lib/queries";
import { getSupabase } from "@/lib/supabase/browser";
import type { Category } from "@/lib/types";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [version, setVersion] = useState(0);
  const load = () => setVersion((v) => v + 1);

  useEffect(() => {
    fetchCategories(getSupabase())
      .then(setCategories)
      .catch((e) => setError(errorMessage(e)));
  }, [version]);

  if (!categories) return error ? <ErrorBox message={error} /> : <Spinner />;
  const list = categories;

  async function run(op: () => PromiseLike<{ error: unknown }>) {
    setError(null);
    setBusy(true);
    const { error } = await op();
    setBusy(false);
    if (error) setError(errorMessage(error));
    else load();
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    const nextOrder = Math.max(0, ...list.map((c) => c.sort_order)) + 1;
    await run(() => getSupabase().from("categories").insert({ name, sort_order: nextOrder }));
    setNewName("");
  }

  function rename(c: Category, name: string) {
    if (!name.trim() || name.trim() === c.name) return;
    run(() => getSupabase().from("categories").update({ name: name.trim() }).eq("id", c.id));
  }

  function remove(c: Category) {
    if (window.confirm(`¿Eliminar "${c.name}"? Sus productos quedarán sin categoría.`)) {
      run(() => getSupabase().from("categories").delete().eq("id", c.id));
    }
  }

  function move(c: Category, dir: -1 | 1) {
    const idx = list.findIndex((x) => x.id === c.id);
    const other = list[idx + dir];
    if (!other) return;
    run(async () => {
      const sb = getSupabase();
      const a = await sb.from("categories").update({ sort_order: other.sort_order }).eq("id", c.id);
      if (a.error) return a;
      return sb.from("categories").update({ sort_order: c.sort_order }).eq("id", other.id);
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <Link href="/admin" className="flex items-center gap-1 text-sm text-muted">
        <ArrowLeft className="size-4" /> Administración
      </Link>
      <PageTitle sub="Edita un nombre y sal del campo para guardarlo.">Categorías</PageTitle>
      {error && <ErrorBox message={error} />}
      <form onSubmit={add} className="flex gap-2">
        <input value={newName} onChange={(e) => setNewName(e.target.value.slice(0, 40))} maxLength={40} placeholder="Nueva categoría" className={inputClass} />
        <Button type="submit" loading={busy} disabled={!newName.trim()}>
          Agregar
        </Button>
      </form>
      {list.map((c, idx) => (
        <Card key={`${c.id}-${c.name}`} className="flex-row items-center gap-1 py-2">
          <input
            defaultValue={c.name}
            maxLength={40}
            onBlur={(e) => rename(c, e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            aria-label="Nombre de la categoría"
            className="flex-1 rounded-md px-2 py-2 outline-none focus:bg-surface"
          />
          <button type="button" aria-label="Subir" disabled={idx === 0} onClick={() => move(c, -1)} className="p-2 disabled:opacity-25">
            <ChevronUp className="size-5" />
          </button>
          <button
            type="button"
            aria-label="Bajar"
            disabled={idx === list.length - 1}
            onClick={() => move(c, 1)}
            className="p-2 disabled:opacity-25">
            <ChevronDown className="size-5" />
          </button>
          <button type="button" aria-label="Eliminar" onClick={() => remove(c)} className="p-2 text-red-600">
            <Trash2 className="size-5" />
          </button>
        </Card>
      ))}
    </div>
  );
}
