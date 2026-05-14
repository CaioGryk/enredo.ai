import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const webStorage = {
  async getItem(key: string) {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  },
  async setItem(key: string, value: string) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, value);
  },
  async deleteItem(key: string) {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
  },
};

export const tokenStorage = {
  getItem(key: string) {
    if (Platform.OS === 'web') return webStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  setItem(key: string, value: string) {
    if (Platform.OS === 'web') return webStorage.setItem(key, value);
    return SecureStore.setItemAsync(key, value);
  },
  deleteItem(key: string) {
    if (Platform.OS === 'web') return webStorage.deleteItem(key);
    return SecureStore.deleteItemAsync(key);
  },
};
