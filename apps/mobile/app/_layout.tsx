import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform, StatusBar as NativeStatusBar, StyleSheet, View } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { NotoSerif_400Regular, NotoSerif_400Regular_Italic, NotoSerif_600SemiBold, NotoSerif_700Bold, NotoSerif_900Black } from '@expo-google-fonts/noto-serif';
import { Inter_300Light, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    NotoSerif: NotoSerif_400Regular,
    NotoSerifItalic: NotoSerif_400Regular_Italic,
    NotoSerifSemiBold: NotoSerif_600SemiBold,
    NotoSerifBold: NotoSerif_700Bold,
    NotoSerifBlack: NotoSerif_900Black,
    InterLight: Inter_300Light,
    Inter: Inter_400Regular,
    InterMedium: Inter_500Medium,
    InterSemiBold: Inter_600SemiBold,
    InterBold: Inter_700Bold,
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../src/context/AuthContext';

const queryClient = new QueryClient();

function RootLayoutContent() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'android'
    ? Math.max(insets.top, NativeStatusBar.currentHeight ?? 0, 32)
    : insets.top;

  return (
    <View style={[styles.root, { paddingTop: topInset }]}>
      <ExpoStatusBar style="light" backgroundColor="#0a0a0a" translucent={false} />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0a0a0a' } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="preview" />
            <Stack.Screen name="story/[id]" />
            <Stack.Screen name="reader/[id]" />
            <Stack.Screen name="scene-media" options={{ title: 'Galeria de Cenas', headerShown: false, contentStyle: { backgroundColor: '#0a0a0a' } }} />
            <Stack.Screen name="saved-scenes" options={{ title: 'Cenas Salvas', headerShown: false, contentStyle: { backgroundColor: '#0a0a0a' } }} />
            <Stack.Screen name="onboarding" options={{ title: 'Boas-vindas', headerShown: false, contentStyle: { backgroundColor: '#0a0a0a' } }} />
            <Stack.Screen name="legal" options={{ title: 'Termos e Privacidade', headerShown: false, contentStyle: { backgroundColor: '#0a0a0a' } }} />
            <Stack.Screen name="profile/narrative-preferences" options={{ title: 'Preferências de Narrativa', headerShown: false, contentStyle: { backgroundColor: '#0a0a0a' } }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          </Stack>
        </AuthProvider>
      </QueryClientProvider>
    </View>
  );
}

function RootLayoutNav() {
  return (
    <SafeAreaProvider>
      <RootLayoutContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
});
