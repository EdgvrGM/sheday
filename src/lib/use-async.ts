import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { errorMessage } from './supabase';

/**
 * Carga datos cada vez que la pantalla recibe el foco (así las listas
 * se actualizan al regresar de otra pantalla) y cuando cambia `key`
 * (p. ej. el id de la ruta). Expone `reload` para el pull-to-refresh.
 */
export function useFocusData<T>(loader: () => Promise<T>, key: string | number = '') {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Siempre usa la versión más reciente de `loader` sin volver a suscribirse.
  const loaderRef = useRef(loader);
  useEffect(() => {
    loaderRef.current = loader;
  });

  const run = useCallback(async (isRefresh: boolean) => {
    if (isRefresh) setRefreshing(true);
    try {
      setData(await loaderRef.current());
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      run(false);
      // `key` es intencional: recarga cuando cambia (p. ej. otro id de ruta).
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [run, key])
  );

  return { data, setData, error, loading, refreshing, reload: () => run(true) };
}
