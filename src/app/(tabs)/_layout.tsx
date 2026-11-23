import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';

import type { IconName } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/providers/auth';
import { useCart } from '@/providers/cart';

function icon(name: IconName) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={color as string} size={size} />;
  };
}

export default function TabsLayout() {
  const { isAdmin } = useAuth();
  const { count } = useCart();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        headerTitleStyle: { color: Colors.text, fontWeight: '700' },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Tienda', headerTitle: 'Sheday', tabBarIcon: icon('storefront-outline') }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Carrito',
          tabBarIcon: icon('bag-handle-outline'),
          tabBarBadge: count > 0 ? count : undefined,
          tabBarBadgeStyle: { backgroundColor: Colors.primary },
        }}
      />
      <Tabs.Screen name="orders" options={{ title: 'Mis pedidos', tabBarIcon: icon('receipt-outline') }} />
      <Tabs.Screen name="account" options={{ title: 'Cuenta', tabBarIcon: icon('person-outline') }} />
      <Tabs.Protected guard={isAdmin}>
        <Tabs.Screen name="admin" options={{ title: 'Admin', tabBarIcon: icon('briefcase-outline') }} />
      </Tabs.Protected>
    </Tabs>
  );
}
