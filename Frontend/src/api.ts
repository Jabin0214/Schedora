import axios from 'axios';

export { isAxiosError } from 'axios';
export type { AxiosError, AxiosResponse, AxiosRequestConfig, AxiosInstance } from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5097/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('schedora_token');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('schedora_token');
      localStorage.removeItem('schedora_username');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
