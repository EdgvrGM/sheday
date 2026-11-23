import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { formatMoney, ORDER_FLOW, ORDER_STATUS } from '@/lib/format';
import { imageUrl } from '@/lib/images';
import type { Order, OrderItem } from '@/lib/types';

import { Card, Row, T } from './ui';

export function OrderItemRow({ item }: { item: OrderItem }) {
  return (
    <Row style={{ alignItems: 'flex-start' }}>
      <View style={styles.thumb}>
        {item.image_path ? (
          <Image source={imageUrl(item.image_path)} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <Ionicons name="shirt-outline" size={22} color={Colors.border} />
        )}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <T numberOfLines={2}>{item.product_name}</T>
        <T variant="small">
          {[item.size, item.color].filter(Boolean).join(' · ')} · {item.quantity} pza
          {item.is_preorder ? ' · Sobre pedido' : ''}
        </T>
      </View>
      <T variant="label">{formatMoney(item.unit_price * item.quantity)}</T>
    </Row>
  );
}

export function OrderTotals({ order }: { order: Order }) {
  const deposit = Number(order.deposit_required);
  return (
    <Card>
      {order.order_items.map((i) => (
        <OrderItemRow key={i.id} item={i} />
      ))}
      <View style={styles.divider} />
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="heading">Total</T>
        <T variant="heading">{formatMoney(order.subtotal)}</T>
      </Row>
      {deposit > 0 && (
        <Row style={{ justifyContent: 'space-between' }}>
          <T variant="muted">Anticipo (sobre pedido)</T>
          <T variant="label">{formatMoney(deposit)}</T>
        </Row>
      )}
      <T variant="small">Pago en efectivo al recibir.</T>
    </Card>
  );
}

/** Línea de tiempo del estado del pedido. */
export function OrderTimeline({ order }: { order: Order }) {
  if (order.status === 'cancelled') {
    return (
      <Card style={{ backgroundColor: Colors.dangerSoft, borderColor: Colors.dangerSoft }}>
        <T style={{ color: Colors.danger, fontWeight: '700' }}>Este pedido fue cancelado.</T>
      </Card>
    );
  }
  const hasPreorder = order.order_items.some((i) => i.is_preorder);
  const steps = ORDER_FLOW.filter((s) => s !== 'ordered' || hasPreorder);
  const current = steps.indexOf(order.status);

  return (
    <Card>
      {steps.map((s, idx) => {
        const done = idx <= current;
        return (
          <Row key={s}>
            <Ionicons
              name={done ? 'checkmark-circle' : 'ellipse-outline'}
              size={20}
              color={done ? ORDER_STATUS[s].color : Colors.border}
            />
            <T style={!done && { color: Colors.textSecondary }}>{ORDER_STATUS[s].label}</T>
          </Row>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  thumb: {
    width: 48,
    height: 60,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.xs },
});
