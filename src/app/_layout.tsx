import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { Colors, NavigationTheme } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/providers/auth';
import { CartProvider } from '@/providers/cart';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = { anchor: '(tabs)' };

export default function RootLayout() {
  return (
    <AuthProvider>
      <CartProvider>
        <ThemeProvider value={NavigationTheme}>
          <StatusBar style="dark" />
          <RootStack />
        </ThemeProvider>
      </CartProvider>
    </AuthProvider>
  );
}

function RootStack() {
  const { session, isAdmin, initializing } = useAuth();

  useEffect(() => {
    if (!initializing) SplashScreen.hideAsync();
  }, [initializing]);

  if (initializing) return null;

  return (
    <Stack
      screenOptions={{
        headerBackTitle: 'Atrás',
        headerTintColor: Colors.primary,
        headerTitleStyle: { color: Colors.text },
      }}>
      {/* Públicas: cualquiera puede ver el catálogo sin registrarse */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="product/[id]" options={{ title: '' }} />
      <Stack.Screen name="login" options={{ title: 'Iniciar sesión', presentation: 'modal' }} />
      <Stack.Screen name="register" options={{ title: 'Crear cuenta', presentation: 'modal' }} />

      {/* Requieren sesión */}
      <Stack.Protected guard={!!session} redirectTo="/login">
        <Stack.Screen name="checkout" options={{ title: 'Confirmar pedido' }} />
        <Stack.Screen name="order/[id]" options={{ title: 'Pedido' }} />
      </Stack.Protected>

      {/* Solo administradores (la seguridad real está en las políticas RLS) */}
      <Stack.Protected guard={isAdmin}>
        <Stack.Screen name="admin/product/[id]" options={{ title: 'Producto' }} />
        <Stack.Screen name="admin/order/[id]" options={{ title: 'Gestionar pedido' }} />
        <Stack.Screen name="admin/settings" options={{ title: 'Ajustes de la tienda' }} />
        <Stack.Screen name="admin/categories" options={{ title: 'Categorías' }} />
      </Stack.Protected>
    </Stack>
  );
}
