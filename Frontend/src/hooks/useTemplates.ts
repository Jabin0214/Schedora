import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { API_ENDPOINTS } from '../config/api';
import type { TemplatesAll } from '../types/templates';

let cache: TemplatesAll | null = null;
let inflight: Promise<TemplatesAll> | null = null;

async function load(): Promise<TemplatesAll> {
  if (cache) return cache;
  if (!inflight) {
    inflight = api
      .get<TemplatesAll>(`${API_ENDPOINTS.templates}/all`)
      .then(r => {
        cache = r.data;
        inflight = null;
        return r.data;
      })
      .catch(err => {
        inflight = null;
        throw err;
      });
  }
  return inflight;
}

export function invalidateTemplatesCache() {
  cache = null;
  inflight = null;
}

export function useTemplates() {
  const [data, setData] = useState<TemplatesAll | null>(cache);
  const [loading, setLoading] = useState(!cache);
  const [error, setError] = useState<unknown>(null);

  const refresh = useCallback(() => {
    invalidateTemplatesCache();
    setLoading(true);
    setError(null);
    load()
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!cache) {
      load()
        .then(d => { setData(d); setLoading(false); })
        .catch(e => { setError(e); setLoading(false); });
    }
  }, []);

  return { data, loading, error, refresh };
}
