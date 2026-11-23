import { router } from 'expo-router';
import { useState } from 'react';

import { Button, Card, EmptyState, Field, Screen, T } from '@/components/ui';
import { confirm, notify } from '@/lib/dialog';
import { errorMessage, supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth';
import { useCart } from '@/providers/cart';

export default function AccountScreen() {
  const { session, profile, refreshProfile, signOut } = useAuth();
  const cart = useCart();
  // null = sin editar (se muestra lo guardado en el perfil)
  const [nameDraft, setFullName] = useState<string | null>(null);
  const [phoneDraft, setPhone] = useState<string | null>(null);
  const [addressDraft, setAddress] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fullName = nameDraft ?? profile?.full_name ?? '';
  const phone = phoneDraft ?? profile?.phone ?? '';
  const address = addressDraft ?? profile?.address ?? '';

  if (!session) {
    return (
      <EmptyState
        icon="person-circle-outline"
        title="Bienvenida a Sheday"
        message="Crea tu cuenta para hacer pedidos y darles seguimiento."
        action={
          <>
            <Button title="Iniciar sesión" onPress={() => router.push('/login')} style={{ alignSelf: 'stretch' }} />
            <Button
              title="Crear cuenta"
              kind="secondary"
              onPress={() => router.push('/register')}
              style={{ alignSelf: 'stretch' }}
            />
          </>
        }
      />
    );
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim(), phone: phone.trim(), address: address.trim() })
      .eq('id', session!.user.id);
    setSaving(false);
    if (error) return notify('No se pudo guardar', errorMessage(error));
    await refreshProfile();
    notify('Datos guardados');
  }

  async function deleteAccount() {
    const ok = await confirm(
      'Eliminar cuenta',
      'Se borrará tu cuenta y no podrás recuperarla. Tus pedidos anteriores se conservan en el registro de la tienda.',
      'Eliminar',
      true
    );
    if (!ok) return;
    const { error } = await supabase.rpc('delete_my_account');
    if (error) return notify('No se pudo eliminar', errorMessage(error));
    cart.clear();
    await signOut();
  }

  return (
    <Screen>
      <Card>
        <T variant="small">Sesión iniciada como</T>
        <T variant="heading">{session.user.email}</T>
      </Card>

      <T variant="heading">Mis datos de entrega</T>
      <Field label="Nombre completo" value={fullName} onChangeText={setFullName} autoComplete="name" />
      <Field
        label="Celular (WhatsApp)"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoComplete="tel"
      />
      <Field label="Dirección de entrega" value={address} onChangeText={setAddress} multiline />
      <Button title="Guardar" onPress={save} loading={saving} />

      <Button title="Cerrar sesión" kind="ghost" icon="log-out-outline" onPress={signOut} />
      <Button title="Eliminar mi cuenta" kind="danger" icon="trash-outline" onPress={deleteAccount} />
    </Screen>
  );
}
