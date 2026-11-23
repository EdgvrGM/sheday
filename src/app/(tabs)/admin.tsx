import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { OrderCard } from '@/components/order-card';
import { Badge, Button, Card, Chip, EmptyState, ErrorBox, Loading, Row, Screen, T } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { formatMoney, ORDER_STATUS } from '@/lib/format';
import { imageUrl } from '@/lib/images';
import { fetchOrders, fetchProducts, totalStock } from '@/lib/queries';
import type { OrderStatus, Product } from '@/lib/types';
import { useFocusData } from '@/lib/use-async';

type Section = 'orders' | 'products';
const ACTIVE_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'ordered', 'on_the_way'];

export default function AdminScreen() {
  const [section, setSection] = useState<Section>('orders');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'active' | 'all'>('active');

  const { data, error, loading, refreshing, reload } = useFocusData(async () => {
    const [orders, products] = await Promise.all([fetchOrders(), fetchProducts({ includeInactive: true })]);
    return { orders, products };
  }, 'admin');

  const orders = useMemo(() => {
    const all = data?.orders ?? [];
    if (statusFilter === 'all') return all;
    if (statusFilter === 'active') return all.filter((o) => ACTIVE_STATUSES.includes(o.status));
    return all.filter((o) => o.status === statusFilter);
  }, [data, statusFilter]);

  if (loading) return <Loading />;

  const pendingCount = data?.orders.filter((o) => o.status === 'pending').length ?? 0;
  const lowStock = data?.products.filter((p) => p.is_active && p.mode === 'stock' && totalStock(p) <= 2).length ?? 0;

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={Colors.primary} />}>
      {error && <ErrorBox message={error} />}

      <Row style={{ gap: Spacing.md }}>
        <Stat label="Pedidos pendientes" value={pendingCount} color={Colors.warning} />
        <Stat label="Productos con poco stock" value={lowStock} color={Colors.danger} />
      </Row>

      <Row style={{ flexWrap: 'wrap' }}>
        <Button title="Nuevo producto" icon="add" onPress={() => router.push('/admin/product/new')} />
        <Button title="Categorías" kind="ghost" icon="pricetags-outline" onPress={() => router.push('/admin/categories')} />
        <Button title="Ajustes" kind="ghost" icon="settings-outline" onPress={() => router.push('/admin/settings')} />
      </Row>

      <Row>
        <Chip label="Pedidos" selected={section === 'orders'} onPress={() => setSection('orders')} />
        <Chip label="Productos" selected={section === 'products'} onPress={() => setSection('products')} />
      </Row>

      {section === 'orders' ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.sm }}>
            <Chip label="Activos" selected={statusFilter === 'active'} onPress={() => setStatusFilter('active')} />
            {(Object.keys(ORDER_STATUS) as OrderStatus[]).map((s) => (
              <Chip key={s} label={ORDER_STATUS[s].label} selected={statusFilter === s} onPress={() => setStatusFilter(s)} />
            ))}
            <Chip label="Todos" selected={statusFilter === 'all'} onPress={() => setStatusFilter('all')} />
          </ScrollView>
          {orders.length === 0 ? (
            <EmptyState icon="receipt-outline" title="Sin pedidos en esta vista" />
          ) : (
            orders.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                showCustomer
                href={{ pathname: '/admin/order/[id]', params: { id: o.id } }}
              />
            ))
          )}
        </>
      ) : (data?.products.length ?? 0) === 0 ? (
        <EmptyState icon="shirt-outline" title="Aún no hay productos" message="Toca «Nuevo producto» para empezar." />
      ) : (
        data!.products.map((p) => <AdminProductRow key={p.id} product={p} />)
      )}
    </Screen>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card style={{ flex: 1 }}>
      <T style={{ fontSize: 28, fontWeight: '700', color }}>{value}</T>
      <T variant="small">{label}</T>
    </Card>
  );
}

function AdminProductRow({ product }: { product: Product }) {
  const stock = totalStock(product);
  const cover = product.product_images[0]?.path;
  return (
    <Link href={{ pathname: '/admin/product/[id]', params: { id: product.id } }} asChild>
      <Pressable style={({ pressed }) => pressed && { opacity: 0.8 }}>
        <Card>
          <Row style={{ gap: Spacing.md }}>
            <View style={styles.thumb}>
              {cover ? (
                <Image source={imageUrl(cover)} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <Ionicons name="image-outline" size={22} color={Colors.border} />
              )}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <T numberOfLines={1}>{product.name}</T>
              <T variant="price">{formatMoney(product.price)}</T>
              <Row style={{ flexWrap: 'wrap', gap: Spacing.xs }}>
                {!product.is_active && <Badge label="Oculto" color={Colors.textSecondary} bg={Colors.surface} />}
                {product.mode === 'preorder' ? (
                  <Badge label="Sobre pedido" color={Colors.info} bg={Colors.infoSoft} />
                ) : (
                  <Badge
                    label={`${stock} en stock`}
                    color={stock <= 2 ? Colors.danger : Colors.success}
                    bg={stock <= 2 ? Colors.dangerSoft : Colors.successSoft}
                  />
                )}
              </Row>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </Row>
        </Card>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  thumb: {
    width: 56,
    height: 70,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
