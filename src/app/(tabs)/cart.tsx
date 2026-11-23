import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Badge, Button, Card, EmptyState, IconButton, QuantityStepper, Row, Screen, T } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { formatMoney } from '@/lib/format';
import { imageUrl } from '@/lib/images';
import { useAuth } from '@/providers/auth';
import { useCart } from '@/providers/cart';

export default function CartScreen() {
  const cart = useCart();
  const { session } = useAuth();

  if (cart.items.length === 0) {
    return (
      <EmptyState
        icon="bag-handle-outline"
        title="Tu carrito está vacío"
        message="Explora la tienda y agrega lo que te guste."
        action={<Button title="Ver la tienda" onPress={() => router.navigate('/')} />}
      />
    );
  }

  return (
    <Screen>
      {cart.items.map((item) => (
        <Card key={item.variantId}>
          <Row style={{ alignItems: 'flex-start', gap: Spacing.md }}>
            <Link href={{ pathname: '/product/[id]', params: { id: item.productId } }} style={styles.thumb}>
              {item.imagePath ? (
                <Image source={imageUrl(item.imagePath)} style={styles.thumbImg} contentFit="cover" />
              ) : (
                <Ionicons name="shirt-outline" size={28} color={Colors.border} />
              )}
            </Link>
            <View style={{ flex: 1, gap: Spacing.xs }}>
              <T numberOfLines={2}>{item.name}</T>
              <T variant="small">{[item.size, item.color].filter(Boolean).join(' · ')}</T>
              {item.isPreorder && <Badge label="Sobre pedido" color={Colors.info} bg={Colors.infoSoft} />}
              <T variant="price">{formatMoney(item.price * item.quantity)}</T>
            </View>
            <IconButton
              icon="trash-outline"
              label="Quitar del carrito"
              color={Colors.textSecondary}
              onPress={() => cart.remove(item.variantId)}
            />
          </Row>
          <Row style={{ justifyContent: 'flex-end' }}>
            <QuantityStepper
              value={item.quantity}
              max={item.isPreorder || item.maxStock == null ? 99 : item.maxStock}
              onChange={(q) => cart.setQuantity(item.variantId, q)}
            />
          </Row>
        </Card>
      ))}

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <T variant="heading">Total</T>
          <T variant="heading">{formatMoney(cart.subtotal)}</T>
        </Row>
        {cart.preorderSubtotal > 0 && (
          <T variant="small">
            Incluye {formatMoney(cart.preorderSubtotal)} en artículos sobre pedido, que requieren anticipo.
          </T>
        )}
        <T variant="small">Pagas en efectivo al recibir. Te contactamos por WhatsApp para coordinar.</T>
      </Card>

      <Button
        title={session ? 'Continuar' : 'Inicia sesión para continuar'}
        icon="arrow-forward"
        onPress={() => router.push(session ? '/checkout' : '/login')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  thumb: {
    width: 72,
    height: 90,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImg: { width: 72, height: 90 },
});
