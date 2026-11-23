import { router } from 'expo-router';
import { RefreshControl } from 'react-native';

import { OrderCard } from '@/components/order-card';
import { Button, EmptyState, ErrorBox, Loading, Screen } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { fetchOrders } from '@/lib/queries';
import { useFocusData } from '@/lib/use-async';
import { useAuth } from '@/providers/auth';

export default function MyOrdersScreen() {
  const { session } = useAuth();

  if (!session) {
    return (
      <EmptyState
        icon="receipt-outline"
        title="Tus pedidos aparecerán aquí"
        message="Inicia sesión para ver y dar seguimiento a tus pedidos."
        action={<Button title="Iniciar sesión" onPress={() => router.push('/login')} />}
      />
    );
  }
  return <OrdersList userId={session.user.id} />;
}

function OrdersList({ userId }: { userId: string }) {
  const { data, error, loading, refreshing, reload } = useFocusData(() => fetchOrders({ userId }), userId);

  if (loading) return <Loading />;
  if (!error && data?.length === 0) {
    return (
      <EmptyState
        icon="receipt-outline"
        title="Aún no tienes pedidos"
        action={<Button title="Ver la tienda" onPress={() => router.navigate('/')} />}
      />
    );
  }

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={Colors.primary} />}>
      {error && <ErrorBox message={error} />}
      {data?.map((o) => (
        <OrderCard key={o.id} order={o} href={{ pathname: '/order/[id]', params: { id: o.id } }} />
      ))}
    </Screen>
  );
}
