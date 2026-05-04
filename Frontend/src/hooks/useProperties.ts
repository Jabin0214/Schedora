import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { API_ENDPOINTS } from '../config/api';
import { handleApiError } from '../utils/errorHandler';
import type { Property } from '../types/api';

export function useProperties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<Property[]>(API_ENDPOINTS.properties);
      setProperties(response.data);
    } catch (error) {
      handleApiError(error, 'Failed to fetch properties');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  return {
    properties,
    loading,
    fetchProperties,
  };
}