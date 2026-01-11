import { useState, useCallback } from 'react';
import axios from 'axios';
import type { AxiosResponse } from 'axios';
import { message } from 'antd';
import { handleApiError } from '../utils/errorHandler';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T>() {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async <P = void>(
    apiCall: (params?: P) => Promise<AxiosResponse<T>>,
    params?: P,
    successMessage?: string
  ): Promise<T | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await apiCall(params);
      const data = response.data;

      setState({
        data,
        loading: false,
        error: null,
      });

      if (successMessage) {
        message.success(successMessage);
      }

      return data;
    } catch (error) {
      const errorMessage = axios.isAxiosError(error) && error.response?.data?.message
        ? error.response.data.message
        : '操作失败';

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));

      handleApiError(error, errorMessage);
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}