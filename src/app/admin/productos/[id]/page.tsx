"use client";

import { ArrowLeft, ChevronLeft, ChevronRight, ImagePlus, Plus, Save, Star, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useToast } from "@/components/toast";
import { Button, Card, Chip, ErrorBox, Field, inputClass, PageTitle, Spinner, TextArea, cn } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { deleteProductImages, imageUrl, uploadProductImage } from "@/lib/images";
import { fetchCategories, fetchProduct } from "@/lib/queries";
import { getSupabase } from "@/lib/supabase/browser";
import type { Category, ProductMode } from "@/lib/types";

const QUICK_SIZES = ["XS", "S", "M", "L", "XL", "Unitalla"];

interface ImageDraft {
  key: string;
  path?: string; // ya subida
  file?: File; // nueva
  preview: string;
}

interface VariantDraft {
  key: string;
  id?: number;
  size: string;
  color: string;
  stock: string;
}

let keySeq = 0;
const newKey = () => `k${++keySeq}`;

export default function AdminProductPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "nuevo";
  const router = useRouter();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [mode, setMode] = useState<ProductMode>("stock");
  const [preorderDays, setPreorderDays] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [images, setImages] = useState<ImageDraft[]>([]);
  const [removedPaths, setRemovedPaths] = useState<string[]>([]);
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [removedVariantIds, setRemovedVariantIds] = useState<number[]>([]);

  useEffect(() => {
    const sb = getSupabase();
    Promise.all([fetchCategories(sb), isNew ? null : fetchProduct(sb, Number(id))])
      .then(([cats, product]) => {
        setCategories(cats);
        if (product) {
          setName(product.name);
          setDescription(product.description);
          setPrice(String(product.price));
          setCategoryId(product.category_id);
          setMode(product.mode);
          setPreorderDays(product.preorder_days ? String(product.preorder_days) : "");
          setIsActive(product.is_active);
          setImages(product.product_images.map((i) => ({ key: newKey(), path: i.path, preview: imageUrl(i.path)! })));
          setVariants(
            product.product_variants.map((v) => ({ key: newKey(), id: v.id, size: v.size, color: v.color, stock: String(v.stock) }))
          );
        } else if (isNew) {
          setVariants([{ key: newKey(), size: "Unitalla", color: "", stock: "1" }]);
        } else {
          setError("Producto no encontrado.");
        }
      })
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoaded(true));
  }, [id, isNew]);

  if (!loaded) return <Spinner />;

  // ---------- Fotos ----------
  function addFiles(files: FileList | null) {
    if (!files) return;
    const added = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map((file) => ({ key: newKey(), file, preview: URL.createObjectURL(file) }));
    setImages((prev) => [...prev, ...added]);
  }

  function removeImage(img: ImageDraft) {
    setImages((prev) => prev.filter((i) => i.key !== img.key));
    if (img.path) setRemovedPaths((prev) => [...prev, img.path!]);
    if (img.file) URL.revokeObjectURL(img.preview);
  }

  function moveImage(idx: number, dir: -1 | 1) {
    setImages((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  // ---------- Variantes ----------
  function updateVariant(key: string, patch: Partial<VariantDraft>) {
    setVariants((prev) => prev.map((v) => (v.key === key ? { ...v, ...patch } : v)));
  }

  function removeVariant(v: VariantDraft) {
    setVariants((prev) => prev.filter((x) => x.key !== v.key));
    if (v.id) setRemovedVariantIds((prev) => [...prev, v.id!]);
  }

  function addQuickSize(size: string) {
    if (variants.some((v) => v.size === size && v.color === "")) return;
    setVariants((prev) => [...prev, { key: newKey(), size, color: "", stock: mode === "stock" ? "1" : "0" }]);
  }

  // ---------- Guardar ----------
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const priceNum = Number(price.replace(",", "."));
    if (!name.trim()) return setError("Escribe el nombre del producto.");
    if (!Number.isFinite(priceNum) || priceNum <= 0) return setError("Escribe un precio válido.");
    if (variants.length === 0) return setError("Agrega al menos una talla.");
    const combos = new Set<string>();
    for (const v of variants) {
      if (!v.size.trim()) return setError("Todas las variantes necesitan una talla.");
      const combo = `${v.size.trim().toLowerCase()}|${v.color.trim().toLowerCase()}`;
      if (combos.has(combo)) return setError(`La talla "${v.size}"${v.color ? ` color "${v.color}"` : ""} está repetida.`);
      combos.add(combo);
    }

    setSaving(true);
    const sb = getSupabase();
    try {
      const fields = {
        name: name.trim(),
        description: description.trim(),
        price: priceNum,
        category_id: categoryId,
        mode,
        preorder_days: mode === "preorder" && preorderDays ? Number(preorderDays) : null,
        is_active: isActive,
      };

      let productId: number;
      if (isNew) {
        const { data, error } = await sb.from("products").insert(fields).select("id").single();
        if (error) throw error;
        productId = data.id;
      } else {
        productId = Number(id);
        const { error } = await sb.from("products").update(fields).eq("id", productId);
        if (error) throw error;
      }

      // Fotos: subir las nuevas (comprimidas) y reescribir el orden
      const paths: string[] = [];
      for (const img of images) {
        paths.push(img.path ?? (await uploadProductImage(sb, productId, img.file!)));
      }
      const { error: delErr } = await sb.from("product_images").delete().eq("product_id", productId);
      if (delErr) throw delErr;
      if (paths.length) {
        const { error } = await sb
          .from("product_images")
          .insert(paths.map((path, i) => ({ product_id: productId, path, sort_order: i })));
        if (error) throw error;
      }
      if (removedPaths.length) await deleteProductImages(sb, removedPaths).catch(() => {});

      // Variantes
      if (removedVariantIds.length) {
        const { error } = await sb.from("product_variants").delete().in("id", removedVariantIds);
        if (error) throw error;
      }
      for (const v of variants) {
        const row = { size: v.size.trim(), color: v.color.trim(), stock: mode === "stock" ? Number(v.stock || "0") : 0 };
        const { error } = v.id
          ? await sb.from("product_variants").update(row).eq("id", v.id)
          : await sb.from("product_variants").insert({ ...row, product_id: productId });
        if (error) throw error;
      }

      toast("Producto guardado");
      router.push("/admin");
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  async function deleteProduct() {
    if (
      !window.confirm(
        "Se borrará el producto y sus fotos. Los pedidos anteriores conservan su registro. Si solo quieres dejar de mostrarlo, mejor desactiva «Visible en la tienda». ¿Eliminar?"
      )
    ) {
      return;
    }
    setSaving(true);
    const sb = getSupabase();
    const { error } = await sb.from("products").delete().eq("id", Number(id));
    if (error) {
      setSaving(false);
      return setError(errorMessage(error));
    }
    const paths = images.flatMap((i) => (i.path ? [i.path] : [])).concat(removedPaths);
    await deleteProductImages(sb, paths).catch(() => {});
    toast("Producto eliminado");
    router.push("/admin");
  }

  return (
    <form onSubmit={save} className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <Link href="/admin" className="flex items-center gap-1 text-sm text-muted">
        <ArrowLeft className="size-4" /> Administración
      </Link>
      <PageTitle>{isNew ? "Nuevo producto" : "Editar producto"}</PageTitle>

      {/* Fotos */}
      <section className="flex flex-col gap-2">
        <h2 className="font-bold">Fotos</h2>
        <p className="text-xs text-muted">La primera es la portada. Se comprimen automáticamente al guardar.</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {images.map((img, idx) => (
            <div key={img.key} className="relative aspect-[4/5] overflow-hidden rounded-lg bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:) */}
              <img src={img.preview} alt="" className="h-full w-full object-cover" />
              {idx === 0 && (
                <span className="absolute bottom-1 left-1 flex items-center gap-0.5 rounded-full bg-brand px-1.5 text-[10px] font-bold text-white">
                  <Star className="size-3" /> Portada
                </span>
              )}
              <div className="absolute inset-x-1 top-1 flex justify-between">
                <div className="flex rounded-full bg-black/50 text-white">
                  <button type="button" aria-label="Mover a la izquierda" disabled={idx === 0} onClick={() => moveImage(idx, -1)} className="p-1 disabled:opacity-30">
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Mover a la derecha"
                    disabled={idx === images.length - 1}
                    onClick={() => moveImage(idx, 1)}
                    className="p-1 disabled:opacity-30">
                    <ChevronRight className="size-4" />
                  </button>
                </div>
                <button type="button" aria-label="Quitar foto" onClick={() => removeImage(img)} className="rounded-full bg-black/50 p-1 text-white">
                  <X className="size-4" />
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="flex aspect-[4/5] flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-line text-sm text-muted hover:border-brand hover:text-brand">
            <ImagePlus className="size-7" />
            Agregar
          </button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </section>

      {/* Datos */}
      <section className="flex flex-col gap-4">
        <h2 className="font-bold">Datos</h2>
        <Field label="Nombre" value={name} onChange={(e) => setName(e.target.value)} placeholder="Vestido midi floral" required />
        <Field
          label="Precio de venta (MXN)"
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="349"
          required
        />
        <TextArea label="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tela, largo, cómo queda…" />

        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">Categoría</span>
          <div className="flex flex-wrap gap-2">
            <Chip selected={categoryId == null} onClick={() => setCategoryId(null)}>
              Sin categoría
            </Chip>
            {categories.map((c) => (
              <Chip key={c.id} selected={categoryId === c.id} onClick={() => setCategoryId(c.id)}>
                {c.name}
              </Chip>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold">Modalidad</span>
          <div className="flex flex-wrap gap-2">
            <Chip selected={mode === "stock"} onClick={() => setMode("stock")}>
              En stock (entrega inmediata)
            </Chip>
            <Chip selected={mode === "preorder"} onClick={() => setMode("preorder")}>
              Sobre pedido
            </Chip>
          </div>
          {mode === "preorder" && (
            <Field
              label="Días estimados de llegada"
              inputMode="numeric"
              value={preorderDays}
              onChange={(e) => setPreorderDays(e.target.value.replace(/\D/g, ""))}
              placeholder="15"
            />
          )}
        </div>

        <Card className="flex-row items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Visible en la tienda</p>
            <p className="text-xs text-muted">Desactívalo para ocultarlo sin borrarlo.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isActive}
            aria-label="Visible en la tienda"
            onClick={() => setIsActive(!isActive)}
            className={cn("relative h-7 w-12 shrink-0 rounded-full transition", isActive ? "bg-brand" : "bg-line")}>
            <span className={cn("absolute top-1 size-5 rounded-full bg-white shadow transition-all", isActive ? "left-6" : "left-1")} />
          </button>
        </Card>
      </section>

      {/* Variantes */}
      <section className="flex flex-col gap-3">
        <h2 className="font-bold">Tallas, colores y stock</h2>
        {mode === "preorder" && (
          <p className="text-xs text-muted">En sobre pedido no se maneja stock; solo define qué tallas y colores se pueden pedir.</p>
        )}
        <div className="flex flex-wrap gap-2">
          {QUICK_SIZES.map((s) => (
            <Chip key={s} onClick={() => addQuickSize(s)}>
              + {s}
            </Chip>
          ))}
        </div>
        {variants.map((v) => (
          <div key={v.key} className="flex items-center gap-2">
            <input
              value={v.size}
              onChange={(e) => updateVariant(v.key, { size: e.target.value })}
              placeholder="Talla"
              aria-label="Talla"
              className={cn(inputClass, "min-w-0 flex-1 py-2")}
            />
            <input
              value={v.color}
              onChange={(e) => updateVariant(v.key, { color: e.target.value })}
              placeholder="Color (opcional)"
              aria-label="Color"
              className={cn(inputClass, "min-w-0 flex-[1.4] py-2")}
            />
            {mode === "stock" && (
              <input
                value={v.stock}
                onChange={(e) => updateVariant(v.key, { stock: e.target.value.replace(/\D/g, "") })}
                inputMode="numeric"
                placeholder="Stock"
                aria-label="Stock"
                className={cn(inputClass, "w-20 py-2")}
              />
            )}
            <button type="button" aria-label="Quitar variante" onClick={() => removeVariant(v)} className="p-2 text-red-600">
              <Trash2 className="size-5" />
            </button>
          </div>
        ))}
        <Button
          kind="ghost"
          icon={Plus}
          onClick={() => setVariants((prev) => [...prev, { key: newKey(), size: "", color: "", stock: "1" }])}>
          Agregar variante
        </Button>
      </section>

      {error && <ErrorBox message={error} />}
      <div className="sticky bottom-20 flex flex-col gap-2 md:bottom-4">
        <Button type="submit" icon={Save} loading={saving} className="shadow-lg">
          Guardar producto
        </Button>
      </div>
      {!isNew && (
        <Button kind="danger" icon={Trash2} onClick={deleteProduct} disabled={saving}>
          Eliminar producto
        </Button>
      )}
    </form>
  );
}
