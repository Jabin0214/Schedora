import { useCallback } from 'react';
import type { AxiosResponse } from 'axios';
import { message } from 'antd';
import { handleApiError } from '../utils/errorHandler';

export function useApi() {
  const execute = useCallback(async <T>(
    apiCall: () => Promise<AxiosResponse<T>>,
    successMessage?: string
  ): Promise<T | null> => {
    try {
      const response = await apiCall();
      if (successMessage) message.success(successMessage);
      return response.data;
    } catch (error) {
      handleApiError(error, '操作失败');
      return null;
    }
  }, []);

  return { execute };
}
