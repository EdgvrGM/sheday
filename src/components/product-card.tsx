import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { formatMoney } from '@/lib/format';
import { imageUrl } from '@/lib/images';
import { isAvailable } from '@/lib/queries';
import type { Product } from '@/lib/types';

export function ProductCard({ product, width }: { product: Product; width: number }) {
  const cover = product.product_images[0]?.path;
  const available = isAvailable(product);

  return (
    <Link href={{ pathname: '/product/[id]', params: { id: product.id } }} asChild>
      <Pressable style={({ pressed }) => [{ width }, pressed && { opacity: 0.85 }]}>
        <View style={[styles.imageWrap, { height: width * 1.33 }]}>
          {cover ? (
            <Image source={imageUrl(cover)} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
          ) : (
            <Ionicons name="shirt-outline" size={40} color={Colors.border} />
          )}
          {product.mode === 'preorder' && (
            <View style={[styles.tag, { backgroundColor: Colors.info }]}>
              <Text style={styles.tagText}>Sobre pedido</Text>
            </View>
          )}
          {!available && (
            <View style={styles.soldOut}>
              <Text style={styles.soldOutText}>Agotado</Text>
            </View>
          )}
        </View>
        <Text numberOfLines={2} style={styles.name}>
          {product.name}
        </Text>
        <Text style={styles.price}>{formatMoney(product.price)}</Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  imageWrap: {
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tag: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  tagText: { color: Colors.white, fontSize: 11, fontWeight: '700' },
  soldOut: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldOutText: {
    backgroundColor: Colors.text,
    color: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    fontWeight: '700',
    overflow: 'hidden',
  },
  name: { marginTop: Spacing.sm, fontSize: 14, color: Colors.text },
  price: { marginTop: 2, fontSize: 15, fontWeight: '700', color: Colors.primary },
});
