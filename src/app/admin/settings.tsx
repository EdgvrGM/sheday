import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { Button, ErrorBox, Field, Loading, Screen, T } from '@/components/ui';
import { notify } from '@/lib/dialog';
import { digitsOnly, toWhatsAppNumber } from '@/lib/format';
import { fetchSettings } from '@/lib/queries';
import { errorMessage, supabase } from '@/lib/supabase';

export default function AdminSettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [whatsapp, setWhatsapp] = useState('');
  const [deposit, setDeposit] = useState('50');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  useEffect(() => {
    fetchSettings()
      .then((s) => {
        setWhatsapp(s.whatsapp_number);
        setDeposit(String(s.deposit_percent));
        setDeliveryNotes(s.delivery_notes);
      })
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  async function save() {
    setError(null);
    const pct = Number(deposit);
    if (!Number.isInteger(pct) || pct < 0 || pct > 100) return setError('El anticipo debe ser un número entre 0 y 100.');
    if (digitsOnly(whatsapp).length < 10) return setError('Escribe el número de WhatsApp a 10 dígitos.');

    setSaving(true);
    const { error } = await supabase
      .from('store_settings')
      .update({
        whatsapp_number: toWhatsAppNumber(whatsapp),
        deposit_percent: pct,
        delivery_notes: deliveryNotes.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', true);
    setSaving(false);
    if (error) return setError(errorMessage(error));
    notify('Ajustes guardados');
    router.back();
  }

  return (
    <Screen contentStyle={{ maxWidth: 640 }}>
      <Field
        label="WhatsApp de la tienda"
        value={whatsapp}
        onChangeText={setWhatsapp}
        keyboardType="phone-pad"
        hint="10 dígitos; se guarda con el prefijo 52 de México."
      />
      <Field
        label="Anticipo para artículos sobre pedido (%)"
        value={deposit}
        onChangeText={setDeposit}
        keyboardType="number-pad"
      />
      <Field
        label="Aviso de entrega (se muestra al confirmar)"
        value={deliveryNotes}
        onChangeText={setDeliveryNotes}
        multiline
      />
      <T variant="small">El anticipo se calcula al crear el pedido; cambiarlo no afecta pedidos anteriores.</T>
      {error && <ErrorBox message={error} />}
      <Button title="Guardar" onPress={save} loading={saving} />
    </Screen>
  );
}
