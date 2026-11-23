import { router } from 'expo-router';
import { useState } from 'react';

import { Button, Card, EmptyState, ErrorBox, Field, Row, Screen, T } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { digitsOnly, formatMoney } from '@/lib/format';
import { fetchSettings } from '@/lib/queries';
import { errorMessage, supabase } from '@/lib/supabase';
import { useFocusData } from '@/lib/use-async';
import { useAuth } from '@/providers/auth';
import { useCart } from '@/providers/cart';

export default function CheckoutScreen() {
  const cart = useCart();
  const { profile, refreshProfile } = useAuth();
  const { data: settings } = useFocusData(fetchSettings, 'settings');

  const [name, setName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [address, setAddress] = useState(profile?.address ?? '');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);

  if (cart.items.length === 0) {
    return <EmptyState icon="bag-handle-outline" title="Tu carrito está vacío" />;
  }

  const deposit = settings ? Math.round(cart.preorderSubtotal * settings.deposit_percent) / 100 : 0;

  async function placeOrder() {
    setError(null);
    if (!name.trim()) return setError('Escribe tu nombre.');
    if (digitsOnly(phone).length < 10) return setError('Escribe tu celular a 10 dígitos.');
    if (!address.trim()) return setError('Escribe la dirección de entrega.');

    setPlacing(true);
    const { data: orderId, error } = await supabase.rpc('place_order', {
      items: cart.items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
      customer_name: name,
      customer_phone: phone,
      delivery_address: address,
      notes,
    });
    setPlacing(false);
    if (error) return setError(errorMessage(error));

    cart.clear();
    refreshProfile();
    router.replace({ pathname: '/order/[id]', params: { id: String(orderId), new: '1' } });
  }

  return (
    <Screen contentStyle={{ maxWidth: 640 }}>
      <T variant="heading">Datos de entrega</T>
      <Field label="Nombre" value={name} onChangeText={setName} autoComplete="name" />
      <Field label="Celular (WhatsApp)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Field
        label="Dirección de entrega"
        value={address}
        onChangeText={setAddress}
        multiline
        placeholder="Calle, número, colonia, referencias"
      />
      <Field
        label="Notas (opcional)"
        value={notes}
        onChangeText={setNotes}
        multiline
        placeholder="Horario preferido, punto de entrega…"
      />

      <Card>
        <T variant="heading">Resumen</T>
        {cart.items.map((i) => (
          <Row key={i.variantId} style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <T style={{ flex: 1 }}>
              {i.quantity} × {i.name}{' '}
              <T variant="small">({[i.size, i.color].filter(Boolean).join(', ')})</T>
              {i.isPreorder ? <T variant="small" style={{ color: Colors.info }}> · sobre pedido</T> : null}
            </T>
            <T variant="label">{formatMoney(i.price * i.quantity)}</T>
          </Row>
        ))}
        <Row style={{ justifyContent: 'space-between' }}>
          <T variant="heading">Total</T>
          <T variant="heading">{formatMoney(cart.subtotal)}</T>
        </Row>
        {deposit > 0 && (
          <T variant="small">
            Los artículos sobre pedido requieren un anticipo de {formatMoney(deposit)} ({settings?.deposit_percent}%).
            Te diremos cómo pagarlo por WhatsApp.
          </T>
        )}
        <T variant="small">{settings?.delivery_notes ?? 'Entrega y pago en efectivo.'}</T>
      </Card>

      {error && <ErrorBox message={error} />}
      <Button title="Confirmar pedido" icon="checkmark-circle-outline" onPress={placeOrder} loading={placing} />
    </Screen>
  );
}
