import { Link, router } from 'expo-router';
import { useState } from 'react';

import { Button, ErrorBox, Field, Screen, T } from '@/components/ui';
import { errorMessage, supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) return setError(errorMessage(error));
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  return (
    <Screen contentStyle={{ maxWidth: 480 }}>
      <T variant="title">Hola de nuevo 👋</T>
      <T variant="muted">Inicia sesión para hacer tu pedido.</T>
      {error && <ErrorBox message={error} />}
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
        autoComplete="current-password"
        onSubmitEditing={submit}
      />
      <Button title="Iniciar sesión" onPress={submit} loading={loading} disabled={!email || !password} />
      <Link href="/register" replace style={{ alignSelf: 'center' }}>
        <T variant="label">¿No tienes cuenta? Regístrate</T>
      </Link>
    </Screen>
  );
}
