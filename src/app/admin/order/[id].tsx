import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { OrderTotals } from '@/components/order-summary';
import { Badge, Button, Card, Chip, EmptyState, Field, Loading, Row, Screen, T } from '@/components/ui';
import { confirm, notify } from '@/lib/dialog';
import { formatDate, ORDER_STATUS } from '@/lib/format';
import { fetchOrder } from '@/lib/queries';
import { errorMessage, supabase } from '@/lib/supabase';
import type { OrderStatus } from '@/lib/types';
import { useFocusData } from '@/lib/use-async';
import { openWhatsApp, storeOrderMessage } from '@/lib/whatsapp';

export default function AdminOrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: order, loading, reload } = useFocusData(() => fetchOrder(Number(id)), id);
  // null = sin editar (se muestra lo guardado)
  const [notesDraft, setAdminNotes] = useState<string | null>(null);
  const adminNotes = notesDraft ?? order?.admin_notes ?? '';
  const [saving, setSaving] = useState(false);

  if (loading) return <Loading />;
  if (!order) return <EmptyState icon="receipt-outline" title="Pedido no encontrado" />;

  const status = ORDER_STATUS[order.status];
  const hasPreorder = order.order_items.some((i) => i.is_preorder);
  const nextOptions = (Object.keys(ORDER_STATUS) as OrderStatus[]).filter(
    (s) => s !== 'ordered' || hasPreorder
  );

  async function setStatus(next: OrderStatus) {
    if (next === order!.status) return;
    if (next === 'cancelled') {
      const ok = await confirm(
        'Cancelar pedido',
        'Las piezas en stock regresarán al inventario. Un pedido cancelado no se puede reactivar.',
        'Cancelar pedido',
        true
      );
      if (!ok) return;
    }
    setSaving(true);
    const { error } = await supabase.rpc('admin_set_order_status', {
      p_order_id: order!.id,
      p_status: next,
      p_admin_notes: adminNotes,
    });
    setSaving(false);
    if (error) return notify('No se pudo actualizar', errorMessage(error));
    reload();
  }

  async function saveNotes() {
    setSaving(true);
    const { error } = await supabase.from('orders').update({ admin_notes: adminNotes }).eq('id', order!.id);
    setSaving(false);
    if (error) return notify('No se pudo guardar', errorMessage(error));
    notify('Notas guardadas');
  }

  return (
    <>
      <Stack.Screen options={{ title: `Pedido #${order.id}` }} />
      <Screen contentStyle={{ maxWidth: 720 }}>
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <T variant="heading">{order.customer_name}</T>
            <Badge label={status.label} color={status.color} bg={status.bg} />
          </Row>
          <T>{order.customer_phone}</T>
          <T variant="muted">{order.delivery_address}</T>
          {!!order.notes && <T variant="muted">Notas de la clienta: {order.notes}</T>}
          <T variant="small">Realizado el {formatDate(order.created_at)}</T>
        </Card>

        <Button
          title="Escribirle por WhatsApp"
          kind="whatsapp"
          icon="logo-whatsapp"
          onPress={() => openWhatsApp(order.customer_phone, storeOrderMessage(order))}
        />

        <T variant="heading">Cambiar estado</T>
        <Row style={{ flexWrap: 'wrap' }}>
          {nextOptions.map((s) => (
            <Chip
              key={s}
              label={ORDER_STATUS[s].label}
              selected={order.status === s}
              disabled={saving || (order.status === 'cancelled' && s !== 'cancelled')}
              onPress={() => setStatus(s)}
            />
          ))}
        </Row>

        <OrderTotals order={order} />

        <Field
          label="Notas internas (no se muestran en la app de la clienta)"
          value={adminNotes}
          onChangeText={setAdminNotes}
          multiline
          placeholder="Ej. anticipo recibido $200, entregar el sábado"
        />
        <Button title="Guardar notas" kind="secondary" onPress={saveNotes} loading={saving} />
      </Screen>
    </>
  );
}
