import axios from 'axios';

import { Platform } from 'react-native';
import { tokenStorage } from '../storage/tokenStorage';

// For Android emulator, use 10.0.2.2. For physical device, EXPO_PUBLIC_API_URL must be the LAN IP.
const DEFAULT_API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3001/api' : 'http://localhost:3001/api';
export const API_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const refreshApi = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const token = await tokenStorage.getItem('accessToken');
  if (token) {
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
        const refreshToken = await tokenStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('Missing refresh token');
        }

        const { data } = await refreshApi.post('/auth/refresh', { refreshToken });
        await tokenStorage.setItem('accessToken', data.accessToken);
        await tokenStorage.setItem('refreshToken', data.refreshToken);

        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
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
