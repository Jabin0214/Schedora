import axios from 'axios';
import { expireSessionIfCurrent, TOKEN_KEY } from './auth/session';

export { isAxiosError } from 'axios';
export type { AxiosError, AxiosResponse, AxiosRequestConfig, AxiosInstance } from 'axios';

// No baseURL: API_ENDPOINTS already includes the "/api" prefix.
// Setting baseURL would double-prepend it (→ "/api/api/foo") which
// silently falls through to the SPA fallback and returns HTML,
// causing antd Table to fail with "fe.some is not a function".
const api = axios.create();

const getBearerToken = (authorization: unknown) => {
  if (typeof authorization !== 'string') return null;
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
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
      const headers = error?.config?.headers;
      const authorization = typeof headers?.get === 'function'
        ? headers.get('Authorization')
        : headers?.Authorization;
      expireSessionIfCurrent(getBearerToken(authorization));
    }
    return Promise.reject(error);
  }
);

export default api;
