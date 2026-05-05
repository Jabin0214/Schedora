import axios from 'axios';

export { isAxiosError } from 'axios';
export type { AxiosError, AxiosResponse, AxiosRequestConfig, AxiosInstance } from 'axios';

// No baseURL: API_ENDPOINTS already includes the "/api" prefix.
// Setting baseURL would double-prepend it (→ "/api/api/foo") which
// silently falls through to the SPA fallback and returns HTML,
// causing antd Table to fail with "fe.some is not a function".
const api = axios.create();

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
