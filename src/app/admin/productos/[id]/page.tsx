"use client";

import { ArrowLeft, ChevronLeft, ChevronRight, ImagePlus, Plus, Save, Star, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { draftFromGuide, type GuideDraft, SizeGuideEditor, validateGuide } from "@/components/size-guide-editor";
import { useToast } from "@/components/toast";
import { Button, Card, Chip, ErrorBox, Field, inputClass, PageTitle, Spinner, TextArea, cn } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { digitsInput, MAX, priceInput, textInput } from "@/lib/input";
import { createThumbnail, deleteUnusedProductImages, imageUrl, sameColor, thumbOrFull, uploadProductImage } from "@/lib/images";
import { ADMIN_PRODUCTS, deleteProduct as deleteProductById, fetchCategories, fetchProduct, fetchProductGuides } from "@/lib/queries";
import { figureFor, parseGuide, quickSizesFor as categoryQuickSizes, type SizeGuide } from "@/lib/size-guides";
import { getSupabase } from "@/lib/supabase/browser";
import type { Category, ProductMode } from "@/lib/types";

const QUICK_SIZES = ["XS", "S", "M", "L", "XL", "Unitalla"];

/** Botones rápidos según la categoría: las tallas de sus plantillas de guía (pantalones: MX y CH–XG; faldas: MX y XS–XL). */
function quickSizesFor(category: Category | undefined): string[] {
  return categoryQuickSizes(category?.name, QUICK_SIZES);
}

/** Colores únicos de las variantes, en orden (para etiquetar las fotos). */
function uniqueColors(variants: { color: string }[]): string[] {
  const seen = new Set<string>();
  return variants.flatMap((v) => {
    const color = v.color.trim();
    const key = color.toLowerCase();
    if (!color || seen.has(key)) return [];
    seen.add(key);
    return [color];
  });
}

/** Tallas únicas de las variantes, en orden (filas de la guía de tallas). */
function uniqueSizes(variants: { size: string }[]): string[] {
  const seen = new Set<string>();
  return variants.flatMap((v) => {
    const size = v.size.trim();
    const key = size.toLowerCase();
    if (!size || seen.has(key)) return [];
    seen.add(key);
    return [size];
  });
}

interface ImageDraft {
  key: string;
  path?: string; // ya subida
  thumb?: string; // su miniatura de 480 px
  file?: File; // nueva
  preview: string;
  /** Color de la variante que muestra ("" = todos los colores). */
  color: string;
}

interface VariantDraft {
  key: string;
  id?: number;
  size: string;
  color: string;
  stock: string;
  /** Stock que había en la BD al cargar (para no pisar ventas hechas mientras se edita). */
  origStock?: number;
}

let keySeq = 0;
const newKey = () => `k${++keySeq}`;

export default function AdminProductPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "nuevo";
  const router = useRouter();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  // Vistas previas locales (blob:) de las fotos elegidas: se liberan al quitarlas o al salir
  const blobUrls = useRef(new Set<string>());
  useEffect(() => {
    const urls = blobUrls.current;
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
      urls.clear();
    };
  }, []);

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
  const [guide, setGuide] = useState<GuideDraft | null>(null);
  const [otherGuides, setOtherGuides] = useState<{ id: number; name: string; guide: SizeGuide }[]>([]);

  useEffect(() => {
    const sb = getSupabase();
    Promise.all([fetchCategories(sb), isNew ? null : fetchProduct(sb, Number(id)), fetchProductGuides(sb)])
      .then(([cats, product, guides]) => {
        setCategories(cats);
        setOtherGuides(
          guides.flatMap((g) => {
            const parsed = g.id === Number(id) ? null : parseGuide(g.size_guide);
            return parsed ? [{ id: g.id, name: g.name, guide: parsed }] : [];
          })
        );
        if (product) {
          setName(product.name);
          setDescription(product.description);
          setPrice(String(product.price));
          setCategoryId(product.category_id);
          setMode(product.mode);
          setPreorderDays(product.preorder_days ? String(product.preorder_days) : "");
          setIsActive(product.is_active);
          setImages(
            product.product_images.map((i) => ({
              key: newKey(),
              path: i.path,
              thumb: i.thumb_path ?? undefined,
              preview: imageUrl(thumbOrFull(i))!,
              color: i.color ?? "",
            }))
          );
          setVariants(
            product.product_variants.map((v) => ({
              key: newKey(),
              id: v.id,
              size: v.size,
              color: v.color,
              stock: String(v.stock),
              origStock: v.stock,
            }))
          );
          const sizeGuide = parseGuide(product.size_guide);
          if (sizeGuide) setGuide(draftFromGuide(sizeGuide));
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

  const productColors = uniqueColors(variants);

  // ---------- Fotos ----------
  function addFiles(files: FileList | null) {
    if (!files) return;
    const added = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map((file) => {
        const preview = URL.createObjectURL(file);
        blobUrls.current.add(preview);
        return { key: newKey(), file, preview, color: "" };
      });
    setImages((prev) => [...prev, ...added]);
  }

  function removeImage(img: ImageDraft) {
    setImages((prev) => prev.filter((i) => i.key !== img.key));
    if (img.path) setRemovedPaths((prev) => [...prev, img.path!, ...(img.thumb ? [img.thumb] : [])]);
    if (blobUrls.current.delete(img.preview)) URL.revokeObjectURL(img.preview);
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
    const added = { key: newKey(), size, color: "", stock: mode === "stock" ? "1" : "0" };
    setVariants((prev) => {
      // La fila "Unitalla" con que arranca un producto nuevo se reemplaza si nadie la tocó
      const onlyDefault = prev.length === 1 && !prev[0].id && prev[0].size === "Unitalla" && prev[0].color === "" && prev[0].stock === "1";
      return onlyDefault ? [added] : [...prev, added];
    });
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
    const checked = guide ? validateGuide(guide) : null;
    if (checked && "error" in checked) return setError(checked.error);
    const sizeGuide = checked?.guide ?? null;

    setSaving(true);
    const sb = getSupabase();
    const productId = isNew ? null : Number(id);
    try {
      // 1) Fotos al bucket: las nuevas con su miniatura (en paralelo). Las viejas sin
      //    miniatura la generan aquí; si eso falla, se guarda igual. Lo subido queda
      //    anotado en el borrador: si después falla el guardado, el reintento no resube.
      const uploads = await Promise.allSettled(
        images.map(async (img): Promise<ImageDraft> => {
          if (!img.path) return { ...img, ...(await uploadProductImage(sb, productId ?? "nuevos", img.file!)) };
          if (img.thumb) return img;
          const thumb = await createThumbnail(sb, img.path).catch(() => undefined);
          return { ...img, thumb };
        })
      );
      const uploaded = uploads.map((r, i) => (r.status === "fulfilled" ? r.value : images[i]));
      setImages(uploaded);
      const failed = uploads.find((r) => r.status === "rejected");
      if (failed) throw failed.reason;

      // 2) Datos (con la guía de tallas), fotos y variantes en UNA transacción
      //    (admin_save_product, 0006 y 0007):
      //    o se guarda todo o nada. El stock de una variante existente solo se escribe
      //    si cambió y nadie lo movió mientras se editaba (si hubo una venta, falla y avisa).
      const { error } = await sb.rpc("admin_save_product", {
        p_product_id: productId,
        p_product: {
          name: name.trim(),
          description: description.trim(),
          price: priceNum,
          category_id: categoryId,
          mode,
          preorder_days: mode === "preorder" && preorderDays ? Number(preorderDays) : null,
          is_active: isActive,
          size_guide: sizeGuide,
        },
        p_images: uploaded.map((img) => ({
          path: img.path,
          thumb_path: img.thumb ?? null,
          // Si el color ya no existe en las variantes, la foto pasa a ser de todos los colores
          color: productColors.find((c) => sameColor(c, img.color)) ?? null,
        })),
        p_variants: variants.map((v) => ({
          id: v.id ?? null,
          size: v.size.trim(),
          color: v.color.trim(),
          stock: mode === "stock" ? Number(v.stock || "0") : 0,
          orig_stock: v.origStock ?? null,
        })),
        p_removed_variant_ids: removedVariantIds,
      });
      if (error) {
        // Hubo una venta mientras se editaba: se toma el stock actual como nueva base,
        // así el siguiente "Guardar" aplica lo que escribió (ya con el aviso a la vista)
        if (error.message.includes("cambió mientras editabas") && productId) await refreshOrigStock(productId);
        throw error;
      }

      // 3) Ya guardado: borrar del bucket las fotos quitadas (salvo las que usa algún pedido)
      await deleteUnusedProductImages(sb, removedPaths).catch(() => {});
      toast("Producto guardado");
      router.push(ADMIN_PRODUCTS);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  async function refreshOrigStock(productId: number) {
    const { data } = await getSupabase().from("product_variants").select("id, stock").eq("product_id", productId);
    const current = new Map((data ?? []).map((r) => [r.id as number, r.stock as number]));
    setVariants((prev) => prev.map((v) => (v.id && current.has(v.id) ? { ...v, origStock: current.get(v.id) } : v)));
  }

  async function deleteProduct() {
    if (
      !window.confirm(
        "Se borrará el producto y sus fotos. Los pedidos anteriores conservan su registro y su foto. Si solo quieres dejar de mostrarlo, mejor desactiva «Visible en la tienda». ¿Eliminar?"
      )
    ) {
      return;
    }
    setSaving(true);
    try {
      // Incluye las fotos del borrador que aún no se guardaron en la BD
      await deleteProductById(getSupabase(), Number(id), images.flatMap((i) => [i.path, i.thumb]).concat(removedPaths));
    } catch (err) {
      setSaving(false);
      return setError(errorMessage(err));
    }
    toast("Producto eliminado");
    router.push(ADMIN_PRODUCTS);
  }

  return (
    <form onSubmit={save} noValidate className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <Link href={ADMIN_PRODUCTS} className="flex items-center gap-1 text-sm text-muted">
        <ArrowLeft className="size-4" /> Administración
      </Link>
      <PageTitle>{isNew ? "Nuevo producto" : "Editar producto"}</PageTitle>

      {/* Fotos */}
      <section className="flex flex-col gap-2">
        <h2 className="font-bold">Fotos</h2>
        <p className="text-xs text-muted">
          La primera es la portada. Se comprimen automáticamente al guardar.
          {productColors.length > 1 && " Elige de qué color es cada foto: en la tienda, al escoger un color se ven sus fotos y las marcadas «Todos»."}
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {images.map((img, idx) => (
            <div key={img.key} className="flex flex-col gap-1">
              <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:) */}
                <img src={img.preview} alt="" className="h-full w-full object-cover" />
                {idx === 0 && (
                  <span className="absolute bottom-1 left-1 flex items-center gap-0.5 rounded-full bg-brand px-2 text-xs font-bold text-paper">
                    <Star className="size-3" /> Portada
                  </span>
                )}
                <div className="absolute inset-x-1 top-1 flex justify-between">
                  <div className="flex rounded-full bg-black/50 text-white">
                    <button type="button" aria-label="Mover a la izquierda" disabled={idx === 0} onClick={() => moveImage(idx, -1)} className="p-2 disabled:opacity-30">
                      <ChevronLeft className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Mover a la derecha"
                      disabled={idx === images.length - 1}
                      onClick={() => moveImage(idx, 1)}
                      className="p-2 disabled:opacity-30">
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                  <button type="button" aria-label="Quitar foto" onClick={() => removeImage(img)} className="rounded-full bg-black/50 p-2 text-white">
                    <X className="size-4" />
                  </button>
                </div>
              </div>
              {productColors.length > 1 && (
                <select
                  value={productColors.find((c) => sameColor(c, img.color)) ?? ""}
                  onChange={(e) => setImages((prev) => prev.map((i) => (i.key === img.key ? { ...i, color: e.target.value } : i)))}
                  aria-label={`Color de la foto ${idx + 1}`}
                  // `!`: inputClass trae px-3.5 y py-3
                  className={cn(inputClass, "min-h-11 px-2! py-1.5! text-sm")}>
                  <option value="">Todos</option>
                  {productColors.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            // self-start: las fotos con selector de color son más altas y lo estiraban
            className="flex aspect-[4/5] flex-col items-center justify-center gap-1 self-start rounded-lg border-2 border-dashed border-line text-sm text-muted hover:border-brand hover:text-brand">
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
        <Field label="Nombre" value={name} onChange={(e) => setName(textInput(e.target.value, MAX.productName))} maxLength={MAX.productName} placeholder="Vestido midi floral" required />
        <Field
          label="Precio de venta (MXN)"
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(priceInput(e.target.value))}
          hint="Solo números, por ejemplo 349 o 349.50"
          placeholder="349"
          required
        />
        <TextArea label="Descripción" value={description} onChange={(e) => setDescription(textInput(e.target.value, MAX.description))} maxLength={MAX.description} placeholder="Tela, largo, cómo queda…" />

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
              onChange={(e) => setPreorderDays(digitsInput(e.target.value, 3))}
              maxLength={3}
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
          {quickSizesFor(categories.find((c) => c.id === categoryId)).map((s) => (
            <Chip key={s} onClick={() => addQuickSize(s)}>
              + {s}
            </Chip>
          ))}
        </div>
        {variants.map((v) => (
          <div key={v.key} className="flex items-center gap-2">
            <input
              value={v.size}
              onChange={(e) => updateVariant(v.key, { size: textInput(e.target.value, MAX.size) })}
              maxLength={MAX.size}
              placeholder="Talla"
              aria-label="Talla"
              className={cn(inputClass, "min-w-0 flex-1 py-2")}
            />
            <input
              value={v.color}
              onChange={(e) => updateVariant(v.key, { color: textInput(e.target.value, MAX.color) })}
              maxLength={MAX.color}
              placeholder="Color (opcional)"
              aria-label="Color"
              className={cn(inputClass, "min-w-0 flex-[1.4] py-2")}
            />
            {mode === "stock" && (
              <input
                value={v.stock}
                onChange={(e) => updateVariant(v.key, { stock: digitsInput(e.target.value, 4) })}
                maxLength={4}
                inputMode="numeric"
                placeholder="Stock"
                aria-label="Stock"
                // Base fija de flex: `inputClass` trae w-full y le ganaba a w-20 (dejaba en cero talla y color)
                className={cn(inputClass, "flex-[0_0_5.5rem] py-2")}
              />
            )}
            <button type="button" aria-label="Quitar variante" onClick={() => removeVariant(v)} className="p-2 text-danger">
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

      <SizeGuideEditor
        draft={guide}
        onChange={setGuide}
        sizes={uniqueSizes(variants)}
        figure={figureFor(categories.find((c) => c.id === categoryId)?.name)}
        others={otherGuides}
        onCopied={toast}
      />

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
