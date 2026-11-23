import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Switch, TextInput, View } from 'react-native';

import { Button, Card, Chip, ErrorBox, Field, IconButton, Loading, Row, Screen, T } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { confirm, notify } from '@/lib/dialog';
import { deleteProductImages, imageUrl, uploadProductImage } from '@/lib/images';
import { fetchCategories, fetchProduct } from '@/lib/queries';
import { errorMessage, supabase } from '@/lib/supabase';
import type { Category, ProductMode } from '@/lib/types';

const QUICK_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'Unitalla'];

interface ImageDraft {
  key: string;
  path?: string; // ya subida
  uri?: string; // nueva, local
  mimeType?: string | null;
}

interface VariantDraft {
  key: string;
  id?: number;
  size: string;
  color: string;
  stock: string;
}

let keySeq = 0;
const newKey = () => `k${++keySeq}`;

export default function AdminProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [mode, setMode] = useState<ProductMode>('stock');
  const [preorderDays, setPreorderDays] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [images, setImages] = useState<ImageDraft[]>([]);
  const [removedPaths, setRemovedPaths] = useState<string[]>([]);
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [removedVariantIds, setRemovedVariantIds] = useState<number[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [cats, product] = await Promise.all([fetchCategories(), isNew ? null : fetchProduct(Number(id))]);
        setCategories(cats);
        if (product) {
          setName(product.name);
          setDescription(product.description);
          setPrice(String(product.price));
          setCategoryId(product.category_id);
          setMode(product.mode);
          setPreorderDays(product.preorder_days ? String(product.preorder_days) : '');
          setIsActive(product.is_active);
          setImages(product.product_images.map((i) => ({ key: newKey(), path: i.path })));
          setVariants(
            product.product_variants.map((v) => ({
              key: newKey(),
              id: v.id,
              size: v.size,
              color: v.color,
              stock: String(v.stock),
            }))
          );
        } else {
          setVariants([{ key: newKey(), size: 'Unitalla', color: '', stock: '1' }]);
        }
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isNew]);

  if (loading) return <Loading />;

  // ---------- Fotos ----------
  async function pickImages(source: 'library' | 'camera') {
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7 };
    let result: ImagePicker.ImagePickerResult;
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return notify('Permiso denegado', 'Activa el permiso de cámara en Ajustes.');
      result = await ImagePicker.launchCameraAsync(opts);
    } else {
      result = await ImagePicker.launchImageLibraryAsync({ ...opts, allowsMultipleSelection: true, selectionLimit: 8 });
    }
    if (result.canceled) return;
    setImages((prev) => [
      ...prev,
      ...result.assets.map((a) => ({ key: newKey(), uri: a.uri, mimeType: a.mimeType })),
    ]);
  }

  function removeImage(img: ImageDraft) {
    setImages((prev) => prev.filter((i) => i.key !== img.key));
    if (img.path) setRemovedPaths((prev) => [...prev, img.path!]);
  }

  function makeCover(img: ImageDraft) {
    setImages((prev) => [img, ...prev.filter((i) => i.key !== img.key)]);
  }

  // ---------- Variantes ----------
  function updateVariant(key: string, patch: Partial<VariantDraft>) {
    setVariants((prev) => prev.map((v) => (v.key === key ? { ...v, ...patch } : v)));
  }

  function removeVariant(v: VariantDraft) {
    setVariants((prev) => prev.filter((x) => x.key !== v.key));
    if (v.id) setRemovedVariantIds((prev) => [...prev, v.id!]);
  }

  function addQuickSize(size: string) {
    if (variants.some((v) => v.size === size && v.color === '')) return;
    setVariants((prev) => [...prev, { key: newKey(), size, color: '', stock: mode === 'stock' ? '1' : '0' }]);
  }

  // ---------- Guardar ----------
  async function save() {
    setError(null);
    const priceNum = Number(price.replace(',', '.'));
    if (!name.trim()) return setError('Escribe el nombre del producto.');
    if (!Number.isFinite(priceNum) || priceNum <= 0) return setError('Escribe un precio válido.');
    if (variants.length === 0) return setError('Agrega al menos una talla.');
    const combos = new Set<string>();
    for (const v of variants) {
      if (!v.size.trim()) return setError('Todas las variantes necesitan una talla.');
      const combo = `${v.size.trim().toLowerCase()}|${v.color.trim().toLowerCase()}`;
      if (combos.has(combo)) return setError(`La talla "${v.size}" ${v.color ? `color "${v.color}" ` : ''}está repetida.`);
      combos.add(combo);
      const s = Number(v.stock || '0');
      if (!Number.isInteger(s) || s < 0) return setError(`Stock inválido en talla "${v.size}".`);
    }

    setSaving(true);
    try {
      const fields = {
        name: name.trim(),
        description: description.trim(),
        price: priceNum,
        category_id: categoryId,
        mode,
        preorder_days: mode === 'preorder' && preorderDays ? Number(preorderDays) : null,
        is_active: isActive,
      };

      let productId: number;
      if (isNew) {
        const { data, error } = await supabase.from('products').insert(fields).select('id').single();
        if (error) throw error;
        productId = data.id;
      } else {
        productId = Number(id);
        const { error } = await supabase.from('products').update(fields).eq('id', productId);
        if (error) throw error;
      }

      // Fotos: subir las nuevas y reescribir el orden
      const paths: string[] = [];
      for (const img of images) {
        paths.push(img.path ?? (await uploadProductImage(productId, img.uri!, img.mimeType)));
      }
      const { error: delImgErr } = await supabase.from('product_images').delete().eq('product_id', productId);
      if (delImgErr) throw delImgErr;
      if (paths.length) {
        const { error } = await supabase
          .from('product_images')
          .insert(paths.map((path, i) => ({ product_id: productId, path, sort_order: i })));
        if (error) throw error;
      }
      if (removedPaths.length) await deleteProductImages(removedPaths).catch(() => {});

      // Variantes
      if (removedVariantIds.length) {
        const { error } = await supabase.from('product_variants').delete().in('id', removedVariantIds);
        if (error) throw error;
      }
      for (const v of variants) {
        const row = { size: v.size.trim(), color: v.color.trim(), stock: Number(v.stock || '0') };
        const { error } = v.id
          ? await supabase.from('product_variants').update(row).eq('id', v.id)
          : await supabase.from('product_variants').insert({ ...row, product_id: productId });
        if (error) throw error;
      }

      router.back();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct() {
    const ok = await confirm(
      'Eliminar producto',
      'Se borrará el producto y sus fotos. Los pedidos anteriores conservan su registro. Si solo quieres dejar de mostrarlo, mejor desactiva «Visible en la tienda».',
      'Eliminar',
      true
    );
    if (!ok) return;
    setSaving(true);
    const { error } = await supabase.from('products').delete().eq('id', Number(id));
    if (!error) {
      await deleteProductImages(images.flatMap((i) => (i.path ? [i.path] : [])).concat(removedPaths)).catch(() => {});
    }
    setSaving(false);
    if (error) return notify('No se pudo eliminar', errorMessage(error));
    router.back();
  }

  return (
    <>
      <Stack.Screen options={{ title: isNew ? 'Nuevo producto' : 'Editar producto' }} />
      <Screen contentStyle={{ maxWidth: 720 }}>
        {/* Fotos */}
        <T variant="heading">Fotos</T>
        <Row style={{ flexWrap: 'wrap', gap: Spacing.sm }}>
          {images.map((img, idx) => (
            <View key={img.key} style={styles.photo}>
              <Image source={img.uri ?? imageUrl(img.path)} style={StyleSheet.absoluteFill} contentFit="cover" />
              {idx === 0 && (
                <View style={styles.coverTag}>
                  <T style={styles.coverText}>Portada</T>
                </View>
              )}
              <View style={styles.photoActions}>
                {idx > 0 && (
                  <IconButton icon="star-outline" label="Usar como portada" color={Colors.white} size={18} onPress={() => makeCover(img)} />
                )}
                <IconButton icon="close" label="Quitar foto" color={Colors.white} size={18} onPress={() => removeImage(img)} />
              </View>
            </View>
          ))}
        </Row>
        <Row style={{ flexWrap: 'wrap' }}>
          <Button title="Agregar fotos" kind="secondary" icon="images-outline" onPress={() => pickImages('library')} />
          {Platform.OS !== 'web' && (
            <Button title="Tomar foto" kind="ghost" icon="camera-outline" onPress={() => pickImages('camera')} />
          )}
        </Row>

        {/* Datos */}
        <T variant="heading">Datos</T>
        <Field label="Nombre" value={name} onChangeText={setName} placeholder="Vestido midi floral" />
        <Field label="Precio de venta (MXN)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="349" />
        <Field label="Descripción" value={description} onChangeText={setDescription} multiline placeholder="Tela, largo, cómo queda…" />

        <View style={{ gap: Spacing.sm }}>
          <T variant="label">Categoría</T>
          <Row style={{ flexWrap: 'wrap' }}>
            <Chip label="Sin categoría" selected={categoryId == null} onPress={() => setCategoryId(null)} />
            {categories.map((c) => (
              <Chip key={c.id} label={c.name} selected={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
            ))}
          </Row>
        </View>

        <View style={{ gap: Spacing.sm }}>
          <T variant="label">Modalidad</T>
          <Row>
            <Chip label="En stock (entrega inmediata)" selected={mode === 'stock'} onPress={() => setMode('stock')} />
            <Chip label="Sobre pedido" selected={mode === 'preorder'} onPress={() => setMode('preorder')} />
          </Row>
          {mode === 'preorder' && (
            <Field
              label="Días estimados de llegada"
              value={preorderDays}
              onChangeText={setPreorderDays}
              keyboardType="number-pad"
              placeholder="15"
            />
          )}
        </View>

        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <T variant="label">Visible en la tienda</T>
              <T variant="small">Desactívalo para ocultarlo sin borrarlo.</T>
            </View>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ true: Colors.primary, false: Colors.border }}
              thumbColor={Colors.white}
            />
          </Row>
        </Card>

        {/* Variantes */}
        <T variant="heading">Tallas, colores y stock</T>
        {mode === 'preorder' && (
          <T variant="small">En sobre pedido el stock no se descuenta; solo define qué tallas/colores se pueden pedir.</T>
        )}
        <Row style={{ flexWrap: 'wrap' }}>
          {QUICK_SIZES.map((s) => (
            <Chip key={s} label={`+ ${s}`} onPress={() => addQuickSize(s)} />
          ))}
        </Row>
        {variants.map((v) => (
          <Row key={v.key} style={styles.variantRow}>
            <TextInput
              value={v.size}
              onChangeText={(t) => updateVariant(v.key, { size: t })}
              placeholder="Talla"
              placeholderTextColor={Colors.textSecondary}
              style={[styles.variantInput, { flex: 1 }]}
            />
            <TextInput
              value={v.color}
              onChangeText={(t) => updateVariant(v.key, { color: t })}
              placeholder="Color (opcional)"
              placeholderTextColor={Colors.textSecondary}
              style={[styles.variantInput, { flex: 1.4 }]}
            />
            {mode === 'stock' && (
              <TextInput
                value={v.stock}
                onChangeText={(t) => updateVariant(v.key, { stock: t.replace(/\D/g, '') })}
                placeholder="Stock"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="number-pad"
                style={[styles.variantInput, { width: 70 }]}
              />
            )}
            <IconButton icon="trash-outline" label="Quitar variante" color={Colors.danger} onPress={() => removeVariant(v)} />
          </Row>
        ))}
        <Button
          title="Agregar variante"
          kind="ghost"
          icon="add"
          onPress={() => setVariants((prev) => [...prev, { key: newKey(), size: '', color: '', stock: '1' }])}
        />

        {error && <ErrorBox message={error} />}
        <Button title="Guardar producto" icon="save-outline" onPress={save} loading={saving} />
        {!isNew && <Button title="Eliminar producto" kind="danger" icon="trash-outline" onPress={deleteProduct} disabled={saving} />}
        <View style={{ height: Spacing.xl }} />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  photo: {
    width: 100,
    height: 125,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  coverTag: {
    position: 'absolute',
    left: 4,
    bottom: 4,
    backgroundColor: Colors.primary,
    borderRadius: Radius.pill,
    paddingHorizontal: 6,
  },
  coverText: { color: Colors.white, fontSize: 10, fontWeight: '700' },
  photoActions: {
    position: 'absolute',
    top: 2,
    right: 2,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: Radius.pill,
  },
  variantRow: { gap: Spacing.sm },
  variantInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.white,
  },
});
