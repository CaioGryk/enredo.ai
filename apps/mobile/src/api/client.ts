import axios from 'axios';

import { Platform } from 'react-native';
import { tokenStorage } from '../storage/tokenStorage';

const LOCAL_API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3001/api' : 'http://localhost:3001/api';
const PRODUCTION_API_URL = 'https://enredoai-production.up.railway.app/api';
const DEFAULT_API_URL = __DEV__ ? LOCAL_API_URL : PRODUCTION_API_URL;
export const API_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;

export function resolveApiAssetUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;

  const apiRoot = API_URL.replace(/\/+$/, '');
  const apiOrigin = apiRoot.replace(/\/api\/?$/i, '');

  if (url.startsWith('/api/')) return `${apiOrigin}${url}`;
  if (url.startsWith('/')) return `${apiRoot}${url}`;
  return `${apiRoot}/${url}`;
}

export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const refreshApi = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshTokenPromise: Promise<string> | null = null;
const ACCESS_TOKEN_REFRESH_WINDOW_MS = 60_000;
const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

function decodeBase64(value: string): string {
  let output = '';
  let buffer = 0;
  let bits = 0;

  for (const char of value.replace(/=+$/, '')) {
    const index = BASE64_ALPHABET.indexOf(char);
    if (index < 0) continue;

    buffer = (buffer << 6) | index;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }

  return output;
}

function getTokenExpiresAt(token: string): number | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;

    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(normalizedPayload.length + ((4 - normalizedPayload.length % 4) % 4), '=');
    const decodedPayload = typeof globalThis.atob === 'function'
      ? globalThis.atob(paddedPayload)
      : decodeBase64(paddedPayload);
    const parsedPayload = JSON.parse(decodedPayload) as { exp?: number };

    return typeof parsedPayload.exp === 'number' ? parsedPayload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function shouldRefreshBeforeRequest(token: string): boolean {
  const expiresAt = getTokenExpiresAt(token);
  if (!expiresAt) return false;
  return expiresAt - Date.now() <= ACCESS_TOKEN_REFRESH_WINDOW_MS;
}

function isAuthRequest(url?: string): boolean {
  return Boolean(url?.includes('/auth/login') || url?.includes('/auth/register') || url?.includes('/auth/sso') || url?.includes('/auth/refresh'));
}

async function refreshAccessToken(): Promise<string> {
  if (!refreshTokenPromise) {
    refreshTokenPromise = (async () => {
      const refreshToken = await tokenStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('Missing refresh token');
      }

      const { data } = await refreshApi.post('/auth/refresh', { refreshToken });
      await tokenStorage.setItem('accessToken', data.accessToken);
      await tokenStorage.setItem('refreshToken', data.refreshToken);
      return data.accessToken as string;
    })().finally(() => {
      refreshTokenPromise = null;
    });
  }

  return refreshTokenPromise;
}

api.interceptors.request.use(async (config) => {
  let token = await tokenStorage.getItem('accessToken');
  if (token && !isAuthRequest(config.url) && shouldRefreshBeforeRequest(token)) {
    token = await refreshAccessToken();
  }

  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const accessToken = await refreshAccessToken();
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        await tokenStorage.deleteItem('accessToken');
        await tokenStorage.deleteItem('refreshToken');
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
