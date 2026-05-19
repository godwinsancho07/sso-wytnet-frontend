import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { storage } from '@/utils/storage';

export const SAAS_API_URL = (window.location.hostname.endsWith('wytnet.com'))
  ? 'https://saas-api.wytnet.com'
  : (import.meta.env.VITE_SAAS_API_URL || 'http://localhost:8001');

const saasApi: AxiosInstance = axios.create({
  baseURL: SAAS_API_URL,
  withCredentials: true,
});

// Attach access token to every request
saasApi.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = storage.getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Reuse the token refresh on 401
let isRefreshing = false;
let queue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null) => {
  queue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve(token!)));
  queue = [];
};

saasApi.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queue.push({ resolve, reject });
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return saasApi(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    const refreshToken = storage.getRefreshToken();
    if (!refreshToken) {
      storage.clearTokens();
      if (!['/', '/login', '/register'].includes(window.location.pathname)) {
        window.location.href = '/';
      }
      return Promise.reject(error);
    }

    try {
      // Refresh token is handled by the primary SSO Auth server
      const SSO_API_URL = (window.location.hostname.endsWith('wytnet.com'))
        ? 'https://api.wytnet.com'
        : (import.meta.env.VITE_API_URL || 'http://localhost:8000');

      const { data } = await axios.post(`${SSO_API_URL}/auth/refresh`, {
        refresh_token: refreshToken,
      });
      storage.setAccessToken(data.access_token);
      storage.setRefreshToken(data.refresh_token);
      processQueue(null, data.access_token);
      original.headers.Authorization = `Bearer ${data.access_token}`;
      return saasApi(original);
    } catch (refreshError) {
      processQueue(refreshError, null);
      storage.clearTokens();
      if (!['/', '/login', '/register'].includes(window.location.pathname)) {
        window.location.href = '/';
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default saasApi;
