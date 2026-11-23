"use client";

import { ChevronRight, Plus, Receipt, Settings, Shirt, Tags } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { OrderCard, Thumb } from "@/components/order-parts";
import { Badge, ButtonLink, Card, Chip, EmptyState, ErrorBox, PageTitle, Spinner } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { formatMoney, ORDER_STATUS } from "@/lib/format";
import { fetchOrders, fetchProducts, totalStock } from "@/lib/queries";
import { getSupabase } from "@/lib/supabase/browser";
import type { Order, OrderStatus, Product } from "@/lib/types";

type Section = "orders" | "products";
type StatusFilter = OrderStatus | "active" | "all";
const ACTIVE: OrderStatus[] = ["pending", "confirmed", "ordered", "on_the_way"];

export default function AdminPage() {
  const [section, setSection] = useState<Section>("orders");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [data, setData] = useState<{ orders: Order[]; products: Product[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sb = getSupabase();
    Promise.all([fetchOrders(sb), fetchProducts(sb, { includeInactive: true })])
      .then(([orders, products]) => setData({ orders, products }))
      .catch((e) => setError(errorMessage(e)));
  }, []);

  const orders = useMemo(() => {
    const all = data?.orders ?? [];
    if (statusFilter === "all") return all;
    if (statusFilter === "active") return all.filter((o) => ACTIVE.includes(o.status));
    return all.filter((o) => o.status === statusFilter);
  }, [data, statusFilter]);

  if (error) return <ErrorBox message={error} />;
  if (!data) return <Spinner />;

  const pending = data.orders.filter((o) => o.status === "pending").length;
  const lowStock = data.products.filter((p) => p.is_active && p.mode === "stock" && totalStock(p) <= 2).length;

  return (
    <div className="flex flex-col gap-4">
      <PageTitle>Administración</PageTitle>

      <div className="grid grid-cols-2 gap-3 md:max-w-md">
        <Card>
          <span className="text-3xl font-bold text-amber-600">{pending}</span>
          <span className="text-xs text-muted">Pedidos pendientes</span>
        </Card>
        <Card>
          <span className="text-3xl font-bold text-red-600">{lowStock}</span>
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
            onClick={() => setSection(s)}
            className={`-mb-px border-b-2 px-4 py-2 font-semibold ${section === s ? "border-brand text-brand" : "border-transparent text-muted"}`}>
            {s === "orders" ? `Pedidos (${data.orders.length})` : `Productos (${data.products.length})`}
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
          {orders.length === 0 ? (
            <EmptyState icon={Receipt} title="Sin pedidos en esta vista" />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {orders.map((o) => (
                <OrderCard key={o.id} order={o} showCustomer href={`/admin/pedidos/${o.id}`} />
              ))}
            </div>
          )}
        </>
      ) : data.products.length === 0 ? (
        <EmptyState icon={Shirt} title="Aún no hay productos" message="Toca «Nuevo producto» para empezar." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.products.map((p) => (
            <AdminProductRow key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function AdminProductRow({ product }: { product: Product }) {
  const stock = totalStock(product);
  return (
    <Link href={`/admin/productos/${product.id}`}>
      <Card className="flex-row items-center gap-3 hover:border-brand/40">
        <Thumb path={product.product_images[0]?.path ?? null} className="h-[70px] w-14" />
        <div className="flex flex-1 flex-col gap-1">
          <span className="line-clamp-1">{product.name}</span>
          <span className="font-bold text-brand">{formatMoney(product.price)}</span>
          <div className="flex flex-wrap gap-1">
            {!product.is_active && <Badge className="bg-surface text-muted">Oculto</Badge>}
            {product.mode === "preorder" ? (
              <Badge className="bg-blue-50 text-blue-700">Sobre pedido</Badge>
            ) : (
              <Badge className={stock <= 2 ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}>{stock} en stock</Badge>
            )}
          </div>
        </div>
        <ChevronRight className="size-5 text-muted" />
      </Card>
    </Link>
  );
}
