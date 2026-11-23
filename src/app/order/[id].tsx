import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { OrderTimeline, OrderTotals } from '@/components/order-summary';
import { Button, Card, EmptyState, Loading, Screen, T } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { confirm, notify } from '@/lib/dialog';
import { formatDate } from '@/lib/format';
import { fetchOrder, fetchSettings } from '@/lib/queries';
import { errorMessage, supabase } from '@/lib/supabase';
import { useFocusData } from '@/lib/use-async';
import { customerOrderMessage, openWhatsApp } from '@/lib/whatsapp';

export default function OrderScreen() {
  const { id, new: isNew } = useLocalSearchParams<{ id: string; new?: string }>();
  const { data, loading, reload } = useFocusData(
    async () => {
      const [order, settings] = await Promise.all([fetchOrder(Number(id)), fetchSettings()]);
      return { order, settings };
    },
    id
  );
  const [cancelling, setCancelling] = useState(false);

  if (loading) return <Loading />;
  const order = data?.order;
  if (!order) return <EmptyState icon="receipt-outline" title="Pedido no encontrado" />;

  async function cancel() {
    const ok = await confirm('Cancelar pedido', `¿Seguro que quieres cancelar el pedido #${order!.id}?`, 'Cancelar pedido', true);
    if (!ok) return;
    setCancelling(true);
    const { error } = await supabase.rpc('cancel_my_order', { p_order_id: order!.id });
    setCancelling(false);
    if (error) return notify('No se pudo cancelar', errorMessage(error));
    reload();
  }

  return (
    <>
      <Stack.Screen options={{ title: `Pedido #${order.id}` }} />
      <Screen contentStyle={{ maxWidth: 640 }}>
        {isNew === '1' && (
          <Card style={{ alignItems: 'center', backgroundColor: Colors.successSoft, borderColor: Colors.successSoft }}>
            <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
            <T variant="heading">¡Pedido recibido!</T>
            <T style={{ textAlign: 'center' }}>
              Envíanos tu pedido por WhatsApp para confirmarlo y acordar la entrega.
            </T>
          </Card>
        )}

        <Button
          title="Dar seguimiento por WhatsApp"
          kind="whatsapp"
          icon="logo-whatsapp"
          onPress={() => openWhatsApp(data!.settings.whatsapp_number, customerOrderMessage(order))}
        />

        <View style={{ gap: Spacing.xs }}>
          <T variant="heading">Estado</T>
          <T variant="small">Realizado el {formatDate(order.created_at)}</T>
        </View>
        <OrderTimeline order={order} />

        <T variant="heading">Artículos</T>
        <OrderTotals order={order} />

        <Card>
          <T variant="label">Entrega</T>
          <T>{order.customer_name} · {order.customer_phone}</T>
          <T variant="muted">{order.delivery_address}</T>
          {!!order.notes && <T variant="muted">Notas: {order.notes}</T>}
        </Card>

        {order.status === 'pending' && (
          <Button title="Cancelar pedido" kind="danger" onPress={cancel} loading={cancelling} />
        )}
      </Screen>
    </>
  );
}
