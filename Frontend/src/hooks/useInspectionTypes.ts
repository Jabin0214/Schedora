import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { API_ENDPOINTS } from '../config/api';
import type { TaskTypeConfig } from '../types/api';

// Module-level cache — shared across all hook instances
let cache: TaskTypeConfig[] | null = null;
let inflightPromise: Promise<TaskTypeConfig[]> | null = null;
const listeners = new Set<() => void>();

function notifyAll() {
  listeners.forEach(fn => fn());
}

export function invalidateTypeCache() {
  cache = null;
  inflightPromise = null;
}

async function loadTypes(): Promise<TaskTypeConfig[]> {
  if (cache) return cache;
  if (!inflightPromise) {
    inflightPromise = api
      .get<TaskTypeConfig[]>(API_ENDPOINTS.taskTypes)
      .then(r => {
        cache = r.data;
        inflightPromise = null;
        return r.data;
      })
      .catch(err => {
        inflightPromise = null;
        throw err;
      });
  }
  return inflightPromise;
}

export function useInspectionTypes() {
  const [types, setTypes] = useState<TaskTypeConfig[]>(cache ?? []);
  const [loading, setLoading] = useState(!cache);

  const refresh = useCallback(() => {
    invalidateTypeCache();
    setLoading(true);
    loadTypes()
      .then(data => { setTypes(data); setLoading(false); notifyAll(); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    // Subscribe so that when another instance invalidates, this one updates too
    const onUpdate = () => {
      if (cache) setTypes(cache);
    };
    listeners.add(onUpdate);

    if (!cache) {
      loadTypes()
        .then(data => { setTypes(data); setLoading(false); })
        .catch(() => setLoading(false));
    }

    return () => { listeners.delete(onUpdate); };
  }, []);

  // Helper: get type config by integer ID
  const getType = useCallback(
    (id: number | undefined): TaskTypeConfig | undefined =>
      id !== undefined ? types.find(t => t.id === id) : undefined,
    [types]
  );

  return { types, loading, refresh, getType };
}
