import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';

import { ProductCard } from '@/components/product-card';
import { Chip, EmptyState, ErrorBox, Loading } from '@/components/ui';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { fetchCategories, fetchProducts, isAvailable } from '@/lib/queries';
import { useFocusData } from '@/lib/use-async';

type ModeFilter = 'all' | 'stock' | 'preorder';

export default function CatalogScreen() {
  const { width } = useWindowDimensions();
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<ModeFilter>('all');
  const [categoryId, setCategoryId] = useState<number | null>(null);

  const { data, error, loading, refreshing, reload } = useFocusData(
    async () => {
      const [products, categories] = await Promise.all([fetchProducts(), fetchCategories()]);
      return { products, categories };
    },
    'catalog'
  );

  const products = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.products
      .filter((p) => mode === 'all' || p.mode === mode)
      .filter((p) => categoryId == null || p.category_id === categoryId)
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q))
      // Primero lo disponible, lo agotado al final
      .sort((a, b) => Number(isAvailable(b)) - Number(isAvailable(a)));
  }, [data, search, mode, categoryId]);

  if (loading) return <Loading />;

  const contentWidth = Math.min(width, MaxContentWidth);
  const columns = contentWidth >= 1000 ? 4 : contentWidth >= 700 ? 3 : 2;
  const cardWidth = (contentWidth - Spacing.lg * 2 - Spacing.md * (columns - 1)) / columns;

  return (
    <FlatList
      key={columns}
      data={products}
      numColumns={columns}
      keyExtractor={(p) => String(p.id)}
      style={{ backgroundColor: Colors.background }}
      contentContainerStyle={styles.content}
      columnWrapperStyle={{ gap: Spacing.md }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} tintColor={Colors.primary} />}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={{ gap: Spacing.md }}>
          {error && <ErrorBox message={error} />}
          <View style={styles.search}>
            <Ionicons name="search" size={18} color={Colors.textSecondary} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar vestidos, blusas…"
              placeholderTextColor={Colors.textSecondary}
              style={styles.searchInput}
              returnKeyType="search"
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Chip label="Todo" selected={mode === 'all'} onPress={() => setMode('all')} />
            <Chip label="Entrega inmediata" selected={mode === 'stock'} onPress={() => setMode('stock')} />
            <Chip label="Sobre pedido" selected={mode === 'preorder'} onPress={() => setMode('preorder')} />
          </ScrollView>
          {!!data?.categories.length && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              <Chip label="Todas" selected={categoryId == null} onPress={() => setCategoryId(null)} />
              {data.categories.map((c) => (
                <Chip
                  key={c.id}
                  label={c.name}
                  selected={categoryId === c.id}
                  onPress={() => setCategoryId(categoryId === c.id ? null : c.id)}
                />
              ))}
            </ScrollView>
          )}
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          icon="shirt-outline"
          title="No encontramos productos"
          message={search || mode !== 'all' || categoryId ? 'Prueba con otros filtros.' : 'Pronto subiremos novedades.'}
        />
      }
      renderItem={({ item }) => <ProductCard product={item} width={cardWidth} />}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.lg,
  },
  searchInput: { flex: 1, paddingVertical: Spacing.md, fontSize: 16, color: Colors.text },
  chips: { gap: Spacing.sm },
});
