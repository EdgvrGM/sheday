import { Link, router } from 'expo-router';
import { useState } from 'react';

import { Button, ErrorBox, Field, Screen, T } from '@/components/ui';
import { notify } from '@/lib/dialog';
import { digitsOnly } from '@/lib/format';
import { errorMessage, supabase } from '@/lib/supabase';

export default function RegisterScreen() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    if (!fullName.trim()) return setError('Escribe tu nombre.');
    if (digitsOnly(phone).length < 10) return setError('Escribe tu celular a 10 dígitos.');
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim(), phone: phone.trim(), address: address.trim() } },
    });
    setLoading(false);
    if (error) return setError(errorMessage(error));

    if (!data.session) {
      // El proyecto de Supabase tiene activada la confirmación por correo
      notify('Revisa tu correo', 'Te enviamos un enlace para confirmar tu cuenta. Después inicia sesión.');
      router.replace('/login');
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  return (
    <Screen contentStyle={{ maxWidth: 480 }}>
      <T variant="title">Crea tu cuenta</T>
      <T variant="muted">Usaremos tus datos para coordinar la entrega por WhatsApp.</T>
      {error && <ErrorBox message={error} />}
      <Field label="Nombre completo" value={fullName} onChangeText={setFullName} autoComplete="name" />
      <Field
        label="Celular (WhatsApp)"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoComplete="tel"
        placeholder="10 dígitos"
      />
      <Field
        label="Dirección de entrega (opcional)"
        value={address}
        onChangeText={setAddress}
        multiline
        placeholder="Calle, número, colonia, referencias"
      />
      <Field
        label="Correo"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      <Field
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        hint="Mínimo 6 caracteres"
      />
      <Button title="Crear cuenta" onPress={submit} loading={loading} disabled={!email || !password} />
      <Link href="/login" replace style={{ alignSelf: 'center' }}>
        <T variant="label">¿Ya tienes cuenta? Inicia sesión</T>
      </Link>
    </Screen>
  );
}
