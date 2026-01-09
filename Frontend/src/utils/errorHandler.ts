import { message } from 'antd';
import axios, { AxiosError } from 'axios';

// API 错误响应类型
interface ApiError {
  message?: string;
  errors?: Record<string, string[]>;
}

/**
 * 统一的API错误处理函数
 * @param error - 错误对象
 * @param defaultMessage - 默认错误消息
 */
export const handleApiError = (error: unknown, defaultMessage: string): void => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiError>;
    const responseData = axiosError.response?.data;

    if (responseData?.message) {
      message.error(responseData.message);
    } else if (responseData?.errors) {
      // 处理验证错误
      const errorMessages = Object.values(responseData.errors).flat();
      message.error(errorMessages.join('; '));
    } else if (axiosError.code === 'ERR_NETWORK') {
      message.error('无法连接到服务器，请检查后端是否启动');
    } else {
      message.error(defaultMessage);
    }
  } else {
    message.error(defaultMessage);
  }
  console.error(error);
};
