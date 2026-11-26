"use client";

import { ChevronRight, Loader2, Plus, Receipt, Settings, Shirt, Tags, Trash2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { OrderCard, Thumb } from "@/components/order-parts";
import { useToast } from "@/components/toast";
import { Badge, Button, ButtonLink, Card, Chip, cn, EmptyState, ErrorBox, PageTitle, Spinner } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { formatMoney, ORDER_STATUS } from "@/lib/format";
import { thumbOrFull } from "@/lib/images";
import {
  ADMIN_PRODUCTS,
  type AdminProduct,
  countOrders,
  deleteProduct,
  fetchAdminProducts,
  fetchOrdersPage,
  totalStock,
} from "@/lib/queries";
import { getSupabase } from "@/lib/supabase/browser";
import type { Order, OrderStatus } from "@/lib/types";

type Section = "orders" | "products";
type StatusFilter = OrderStatus | "active" | "all";
const ACTIVE: OrderStatus[] = ["pending", "confirmed", "ordered", "on_the_way"];

function statusesFor(filter: StatusFilter): OrderStatus[] | undefined {
  if (filter === "all") return undefined;
  if (filter === "active") return ACTIVE;
  return [filter];
}

/** Página de pedidos ya cargada, junto con el filtro al que pertenece. */
interface OrdersState {
  filter: StatusFilter;
  orders: Order[];
  total: number;
}

export default function AdminPage() {
  // useSearchParams necesita Suspense para que la página siga siendo estática
  return (
    <Suspense fallback={<Spinner />}>
      <AdminPanel />
    </Suspense>
  );
}

function AdminPanel() {
  const toast = useToast();
  // La pestaña vive en la URL (`?seccion=productos`) para volver a ella al regresar de un producto
  const searchParams = useSearchParams();
  const [section, setSection] = useState<Section>(() => (searchParams.get("seccion") === "productos" ? "products" : "orders"));
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [summary, setSummary] = useState<{ pending: number; products: AdminProduct[] } | null>(null);
  const [ordersState, setOrdersState] = useState<OrdersState | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resumen: conteo de pendientes (sin traer los pedidos) y la lista de productos
  useEffect(() => {
    const sb = getSupabase();
    Promise.all([countOrders(sb, "pending"), fetchAdminProducts(sb)])
      .then(([pending, products]) => setSummary({ pending, products }))
      .catch((e) => setError(errorMessage(e)));
  }, []);

  // Pedidos: filtrados y paginados en la BD; se recarga al cambiar el filtro
  useEffect(() => {
    let active = true;
    fetchOrdersPage(getSupabase(), { statuses: statusesFor(statusFilter) })
      .then((page) => active && setOrdersState({ filter: statusFilter, ...page }))
      .catch((e) => active && setError(errorMessage(e)));
    return () => {
      active = false;
    };
  }, [statusFilter]);

  async function loadMore() {
    if (!ordersState) return;
    setLoadingMore(true);
    try {
      const page = await fetchOrdersPage(getSupabase(), {
        statuses: statusesFor(ordersState.filter),
        offset: ordersState.orders.length,
      });
      setOrdersState((prev) =>
        prev && prev.filter === ordersState.filter
          ? {
              ...prev,
              total: page.total,
              // Sin repetidos si entró un pedido nuevo mientras tanto (recorre la paginación)
              orders: [...prev.orders, ...page.orders.filter((o) => !prev.orders.some((p) => p.id === o.id))],
            }
          : prev
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoadingMore(false);
    }
  }

  function changeSection(s: Section) {
    setSection(s);
    window.history.replaceState(null, "", s === "products" ? ADMIN_PRODUCTS : "/admin");
  }

  async function removeProduct(product: AdminProduct) {
    if (
      !window.confirm(
        `Se borrará «${product.name}» y sus fotos. Los pedidos anteriores conservan su registro y su foto. Si solo quieres dejar de mostrarlo, mejor ocúltalo desde su ficha. ¿Eliminar?`
      )
    ) {
      return;
    }
    setDeletingId(product.id);
    try {
      await deleteProduct(getSupabase(), product.id);
      setSummary((prev) => prev && { ...prev, products: prev.products.filter((p) => p.id !== product.id) });
      toast("Producto eliminado");
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setDeletingId(null);
    }
  }

  if (error) return <ErrorBox message={error} />;
  if (!summary) return <Spinner />;

  const lowStock = summary.products.filter((p) => p.is_active && p.mode === "stock" && totalStock(p) <= 2).length;
  // Mientras llega la página del filtro nuevo, se muestra el spinner (no la del filtro anterior)
  const orders = ordersState?.filter === statusFilter ? ordersState : null;

  return (
    <div className="flex flex-col gap-4">
      <PageTitle>Administración</PageTitle>

      <div className="grid grid-cols-2 gap-3 md:max-w-md">
        <Card>
          <span className="text-3xl font-bold text-warning">{summary.pending}</span>
          <span className="text-xs text-muted">Pedidos pendientes</span>
        </Card>
        <Card>
          <span className="text-3xl font-bold text-danger">{lowStock}</span>
          <span className="text-xs text-muted">Productos con poco stock</span>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <ButtonLink href="/admin/productos/nuevo" icon={Plus}>
          Nuevo producto
        </ButtonLink>
        <ButtonLink href="/admin/categorias" kind="ghost" icon={Tags}>
          Categorías
        </ButtonLink>
        <ButtonLink href="/admin/ajustes" kind="ghost" icon={Settings}>
          Ajustes
        </ButtonLink>
      </div>

      <div className="flex gap-2 border-b border-line">
        {(["orders", "products"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => changeSection(s)}
            className={`-mb-px border-b-2 px-4 py-2 font-semibold ${section === s ? "border-brand text-brand" : "border-transparent text-muted"}`}>
            {s === "orders" ? "Pedidos" : `Productos (${summary.products.length})`}
          </button>
        ))}
      </div>

      {section === "orders" ? (
        <>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            <Chip selected={statusFilter === "active"} onClick={() => setStatusFilter("active")}>
              Activos
            </Chip>
            {(Object.keys(ORDER_STATUS) as OrderStatus[]).map((s) => (
              <Chip key={s} selected={statusFilter === s} onClick={() => setStatusFilter(s)}>
                {ORDER_STATUS[s].label}
              </Chip>
            ))}
            <Chip selected={statusFilter === "all"} onClick={() => setStatusFilter("all")}>
              Todos
            </Chip>
          </div>
          {!orders ? (
            <Spinner />
          ) : orders.orders.length === 0 ? (
            <EmptyState icon={Receipt} title="Sin pedidos en esta vista" />
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                {orders.orders.map((o) => (
                  <OrderCard key={o.id} order={o} showCustomer href={`/admin/pedidos/${o.id}`} />
                ))}
              </div>
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm text-muted">
                  {orders.orders.length} de {orders.total} {orders.total === 1 ? "pedido" : "pedidos"}
                </p>
                {orders.orders.length < orders.total && (
                  <Button kind="ghost" onClick={loadMore} loading={loadingMore}>
                    Cargar más
                  </Button>
                )}
              </div>
            </>
          )}
        </>
      ) : summary.products.length === 0 ? (
        <EmptyState icon={Shirt} title="Aún no hay productos" message="Toca «Nuevo producto» para empezar." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {summary.products.map((p) => (
            <AdminProductRow
              key={p.id}
              product={p}
              deleting={deletingId === p.id}
              disabled={deletingId !== null}
              onDelete={() => removeProduct(p)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AdminProductRow({
  product,
  deleting,
  disabled,
  onDelete,
}: {
  product: AdminProduct;
  deleting: boolean;
  disabled: boolean;
  onDelete: () => void;
}) {
  const stock = totalStock(product);
  return (
    <Card className={cn("flex-row items-center gap-1 hover:border-brand/40", deleting && "opacity-60")}>
      <Link href={`/admin/productos/${product.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <Thumb path={thumbOrFull(product.product_images[0])} className="h-[70px] w-14" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="line-clamp-1">{product.name}</span>
          <span className="font-semibold">{formatMoney(product.price)}</span>
          <div className="flex flex-wrap gap-1">
            {!product.is_active && <Badge className="bg-surface text-muted">Oculto</Badge>}
            {product.mode === "preorder" ? (
              <Badge className="bg-ink text-paper">Sobre pedido</Badge>
            ) : (
              <Badge className={stock <= 2 ? "bg-danger-soft text-danger" : "bg-success-soft text-success"}>{stock} en stock</Badge>
            )}
          </div>
        </div>
        <ChevronRight className="size-5 shrink-0 text-muted" />
      </Link>
      <button
        type="button"
        onClick={onDelete}
        disabled={disabled}
        aria-label={`Eliminar ${product.name}`}
        title="Eliminar"
        className="grid size-11 shrink-0 place-items-center rounded-full text-muted transition hover:bg-danger-soft hover:text-danger disabled:pointer-events-none disabled:opacity-50">
        {deleting ? <Loader2 className="size-5 animate-spin" /> : <Trash2 className="size-5" />}
      </button>
    </Card>
  );
}
