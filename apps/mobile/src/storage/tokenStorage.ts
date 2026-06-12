import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const memoryStorage = new Map<string, string | null>();
const pendingReads = new Map<string, Promise<string | null>>();

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
  async getItem(key: string) {
    if (memoryStorage.has(key)) return memoryStorage.get(key) ?? null;

    const pendingRead = pendingReads.get(key);
    if (pendingRead) return pendingRead;

    const read = (Platform.OS === 'web'
      ? webStorage.getItem(key)
      : SecureStore.getItemAsync(key))
      .then((value) => {
        if (!memoryStorage.has(key)) {
          memoryStorage.set(key, value);
        }
        return memoryStorage.get(key) ?? null;
      })
      .finally(() => {
        pendingReads.delete(key);
      });

    pendingReads.set(key, read);
    return read;
  },
  async setItem(key: string, value: string) {
    memoryStorage.set(key, value);
    if (Platform.OS === 'web') return webStorage.setItem(key, value);
    return SecureStore.setItemAsync(key, value);
  },
  async deleteItem(key: string) {
    memoryStorage.set(key, null);
    if (Platform.OS === 'web') return webStorage.deleteItem(key);
    return SecureStore.deleteItemAsync(key);
  },
};
