import { router } from 'expo-router';

export function goBackSafe(fallbackPath = '/(tabs)/library') {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallbackPath as any);
  }
}
