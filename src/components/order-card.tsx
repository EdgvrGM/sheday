import { Link, type Href } from 'expo-router';
import { Pressable } from 'react-native';

import { formatDate, formatMoney, ORDER_STATUS } from '@/lib/format';
import type { Order } from '@/lib/types';

import { Badge, Card, Row, T } from './ui';

export function OrderCard({ order, href, showCustomer }: { order: Order; href: Href; showCustomer?: boolean }) {
  const status = ORDER_STATUS[order.status];
  const pieces = order.order_items.reduce((n, i) => n + i.quantity, 0);
  return (
    <Link href={href} asChild>
      <Pressable style={({ pressed }) => pressed && { opacity: 0.8 }}>
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <T variant="heading">Pedido #{order.id}</T>
            <Badge label={status.label} color={status.color} bg={status.bg} />
          </Row>
          {showCustomer && (
            <T>
              {order.customer_name} · {order.customer_phone}
            </T>
          )}
          <T variant="small">{formatDate(order.created_at)}</T>
          <Row style={{ justifyContent: 'space-between' }}>
            <T variant="muted">
              {pieces} {pieces === 1 ? 'pieza' : 'piezas'}
              {order.order_items.some((i) => i.is_preorder) ? ' · incluye sobre pedido' : ''}
            </T>
            <T variant="price">{formatMoney(order.subtotal)}</T>
          </Row>
        </Card>
      </Pressable>
    </Link>
  );
}
