import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { Button, Card, ErrorBox, IconButton, Loading, Row, Screen, T } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { confirm } from '@/lib/dialog';
import { fetchCategories } from '@/lib/queries';
import { errorMessage, supabase } from '@/lib/supabase';
import type { Category } from '@/lib/types';
import { useFocusData } from '@/lib/use-async';

export default function AdminCategoriesScreen() {
  const { data, loading, reload } = useFocusData(fetchCategories, 'categories');
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) return <Loading />;

  async function run(op: () => PromiseLike<{ error: unknown }>) {
    setError(null);
    setBusy(true);
    const { error } = await op();
    setBusy(false);
    if (error) setError(errorMessage(error));
    else reload();
  }

  async function add() {
    const name = newName.trim();
    if (!name) return;
    const nextOrder = Math.max(0, ...(data ?? []).map((c) => c.sort_order)) + 1;
    await run(() => supabase.from('categories').insert({ name, sort_order: nextOrder }));
    setNewName('');
  }

  async function rename(c: Category, name: string) {
    if (!name.trim() || name.trim() === c.name) return;
    await run(() => supabase.from('categories').update({ name: name.trim() }).eq('id', c.id));
  }

  async function remove(c: Category) {
    const ok = await confirm('Eliminar categoría', `Los productos de "${c.name}" quedarán sin categoría.`, 'Eliminar', true);
    if (ok) await run(() => supabase.from('categories').delete().eq('id', c.id));
  }

  async function move(c: Category, dir: -1 | 1) {
    const list = data ?? [];
    const idx = list.findIndex((x) => x.id === c.id);
    const other = list[idx + dir];
    if (!other) return;
    await run(async () => {
      const a = await supabase.from('categories').update({ sort_order: other.sort_order }).eq('id', c.id);
      if (a.error) return a;
      return supabase.from('categories').update({ sort_order: c.sort_order }).eq('id', other.id);
    });
  }

  return (
    <Screen contentStyle={{ maxWidth: 640 }}>
      {error && <ErrorBox message={error} />}
      <Row>
        <TextInput
          value={newName}
          onChangeText={setNewName}
          placeholder="Nueva categoría"
          placeholderTextColor={Colors.textSecondary}
          style={[styles.input, { flex: 1 }]}
          onSubmitEditing={add}
        />
        <Button title="Agregar" onPress={add} loading={busy} disabled={!newName.trim()} />
      </Row>
      <T variant="small">Toca un nombre para editarlo; se guarda al salir del campo.</T>
      {data?.map((c, idx) => (
        <CategoryRow
          key={`${c.id}-${c.name}`}
          category={c}
          isFirst={idx === 0}
          isLast={idx === (data?.length ?? 0) - 1}
          onRename={(name) => rename(c, name)}
          onMove={(dir) => move(c, dir)}
          onRemove={() => remove(c)}
        />
      ))}
    </Screen>
  );
}

function CategoryRow({
  category,
  isFirst,
  isLast,
  onRename,
  onMove,
  onRemove,
}: {
  category: Category;
  isFirst: boolean;
  isLast: boolean;
  onRename: (name: string) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const [name, setName] = useState(category.name);
  return (
    <Card style={{ paddingVertical: Spacing.sm }}>
      <Row>
        <TextInput
          value={name}
          onChangeText={setName}
          onBlur={() => onRename(name)}
          onSubmitEditing={() => onRename(name)}
          style={[styles.input, { flex: 1, borderWidth: 0 }]}
        />
        <IconButton icon="chevron-up" label="Subir" onPress={() => onMove(-1)} color={isFirst ? Colors.border : Colors.text} />
        <IconButton icon="chevron-down" label="Bajar" onPress={() => onMove(1)} color={isLast ? Colors.border : Colors.text} />
        <IconButton icon="trash-outline" label="Eliminar" color={Colors.danger} onPress={onRemove} />
      </Row>
    </Card>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.white,
  },
});
