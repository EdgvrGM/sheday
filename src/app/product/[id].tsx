import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Badge, Button, Card, Chip, EmptyState, Loading, QuantityStepper, Row, Screen, T } from '@/components/ui';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { notify } from '@/lib/dialog';
import { formatMoney } from '@/lib/format';
import { imageUrl } from '@/lib/images';
import { fetchProduct } from '@/lib/queries';
import { useFocusData } from '@/lib/use-async';
import { useCart } from '@/providers/cart';

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const cart = useCart();
  const { data: product, loading } = useFocusData(() => fetchProduct(Number(id)), id);

  const [size, setSize] = useState<string | null>(null);
  const [color, setColor] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [imageIndex, setImageIndex] = useState(0);

  const isPreorder = product?.mode === 'preorder';
  const variants = useMemo(() => product?.product_variants ?? [], [product]);
  const sizes = useMemo(() => [...new Set(variants.map((v) => v.size))], [variants]);
  const colors = useMemo(
    () => [...new Set(variants.filter((v) => !size || v.size === size).map((v) => v.color).filter(Boolean))],
    [variants, size]
  );

  // Si solo hay una opción, se elige sola
  const effectiveSize = size ?? (sizes.length === 1 ? sizes[0] : null);
  const effectiveColor = color ?? (colors.length <= 1 ? (colors[0] ?? '') : null);
  const variant = variants.find(
    (v) => v.size === effectiveSize && effectiveColor != null && v.color === effectiveColor
  );

  if (loading) return <Loading />;
  if (!product || !product.is_active) {
    return <EmptyState icon="sad-outline" title="Este producto ya no está disponible" />;
  }

  const stockForSize = (s: string) => variants.filter((v) => v.size === s).reduce((n, v) => n + v.stock, 0);
  const stockForColor = (c: string) =>
    variants.filter((v) => v.color === c && (!effectiveSize || v.size === effectiveSize)).reduce((n, v) => n + v.stock, 0);

  const maxQty = isPreorder ? 99 : (variant?.stock ?? 0);
  const canAdd = !!variant && (isPreorder || variant.stock > 0);
  const imageWidth = Math.min(width, MaxContentWidth, 600);

  function addToCart() {
    if (!product || !variant) return;
    cart.add({
      variantId: variant.id,
      productId: product.id,
      name: product.name,
      size: variant.size,
      color: variant.color,
      price: Number(product.price),
      imagePath: product.product_images[0]?.path ?? null,
      isPreorder,
      quantity: Math.min(qty, maxQty),
      maxStock: isPreorder ? null : variant.stock,
    });
    notify('Agregado al carrito', `${product.name} (${[variant.size, variant.color].filter(Boolean).join(', ')})`);
    router.back();
  }

  return (
    <>
      <Stack.Screen options={{ title: product.name }} />
      <Screen contentStyle={{ maxWidth: 600, padding: 0 }}>
        <View>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setImageIndex(Math.round(e.nativeEvent.contentOffset.x / imageWidth))}>
            {product.product_images.length === 0 ? (
              <View style={[styles.image, { width: imageWidth, height: imageWidth * 1.25 }]}>
                <Ionicons name="shirt-outline" size={64} color={Colors.border} />
              </View>
            ) : (
              product.product_images.map((img) => (
                <Image
                  key={img.id}
                  source={imageUrl(img.path)}
                  style={[styles.image, { width: imageWidth, height: imageWidth * 1.25 }]}
                  contentFit="cover"
                  transition={150}
                />
              ))
            )}
          </ScrollView>
          {product.product_images.length > 1 && (
            <Row style={styles.dots}>
              {product.product_images.map((img, i) => (
                <View key={img.id} style={[styles.dot, i === imageIndex && styles.dotActive]} />
              ))}
            </Row>
          )}
        </View>

        <View style={{ padding: Spacing.lg, gap: Spacing.lg }}>
          <View style={{ gap: Spacing.xs }}>
            {isPreorder ? (
              <Badge label="Sobre pedido" color={Colors.info} bg={Colors.infoSoft} />
            ) : (
              <Badge label="Entrega inmediata" color={Colors.success} bg={Colors.successSoft} />
            )}
            <T variant="title">{product.name}</T>
            <T variant="price" style={{ fontSize: 22 }}>
              {formatMoney(product.price)}
            </T>
          </View>

          {isPreorder && (
            <Card style={{ backgroundColor: Colors.infoSoft, borderColor: Colors.infoSoft }}>
              <T>
                Lo pedimos especialmente para ti
                {product.preorder_days ? `; llega en aproximadamente ${product.preorder_days} días` : ''}. Se pide
                un anticipo al confirmar.
              </T>
            </Card>
          )}

          {sizes.length > 0 && (
            <View style={{ gap: Spacing.sm }}>
              <T variant="label">Talla</T>
              <Row style={{ flexWrap: 'wrap' }}>
                {sizes.map((s) => (
                  <Chip
                    key={s}
                    label={s}
                    selected={effectiveSize === s}
                    disabled={!isPreorder && stockForSize(s) === 0}
                    onPress={() => {
                      setSize(s);
                      setColor(null);
                      setQty(1);
                    }}
                  />
                ))}
              </Row>
            </View>
          )}

          {colors.length > 1 && (
            <View style={{ gap: Spacing.sm }}>
              <T variant="label">Color</T>
              <Row style={{ flexWrap: 'wrap' }}>
                {colors.map((c) => (
                  <Chip
                    key={c}
                    label={c}
                    selected={effectiveColor === c}
                    disabled={!isPreorder && stockForColor(c) === 0}
                    onPress={() => {
                      setColor(c);
                      setQty(1);
                    }}
                  />
                ))}
              </Row>
            </View>
          )}

          {variant && !isPreorder && (
            <T variant="small" style={variant.stock <= 2 && variant.stock > 0 ? { color: Colors.warning } : undefined}>
              {variant.stock === 0
                ? 'Agotado en esta opción'
                : variant.stock <= 2
                  ? `¡Solo quedan ${variant.stock}!`
                  : `${variant.stock} disponibles`}
            </T>
          )}

          <Row style={{ justifyContent: 'space-between' }}>
            <T variant="label">Cantidad</T>
            <QuantityStepper value={qty} onChange={setQty} max={Math.max(1, maxQty)} />
          </Row>

          <Button
            title={!variant ? 'Elige talla y color' : canAdd ? 'Agregar al carrito' : 'Agotado'}
            icon="bag-add-outline"
            disabled={!canAdd}
            onPress={addToCart}
          />

          {!!product.description && (
            <View style={{ gap: Spacing.xs }}>
              <T variant="label">Descripción</T>
              <T variant="muted">{product.description}</T>
            </View>
          )}
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  dots: { position: 'absolute', bottom: Spacing.md, alignSelf: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: Radius.pill, backgroundColor: 'rgba(255,255,255,0.6)' },
  dotActive: { backgroundColor: Colors.white, width: 18 },
});
