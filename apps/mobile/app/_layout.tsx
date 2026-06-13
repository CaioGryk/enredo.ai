import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { NotoSerif_400Regular, NotoSerif_400Regular_Italic, NotoSerif_600SemiBold, NotoSerif_700Bold, NotoSerif_900Black } from '@expo-google-fonts/noto-serif';
import { Inter_300Light, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../src/context/AuthContext';

export {
  ErrorBoundary,
} from 'expo-router';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60_000,
      gcTime: 30 * 60_000,
      retry: 1,
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  const [fontsLoaded, error] = useFonts({
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

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  // The Root Layout must always render a navigator. Never return null.
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StartupGate fontsLoaded={fontsLoaded} />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

/**
 * Controls the native splash screen and performs cold-start route normalization.
 *
 * The Root Layout (above) always renders this component, which always renders
 * `RootLayoutNav` (the Stack navigator). This satisfies Expo Router's requirement
 * that the root layout must render a navigator on its first render.
 *
 * The native splash screen is kept visible by `SplashScreen.preventAutoHideAsync()`
 * and only hidden after:
 * 1. Fonts are loaded.
 * 2. Authentication and onboarding state are resolved (isInitializing === false).
 * 3. Cold-start route normalization has been dispatched.
 *
 * Cold-start normalization: every cold process start for a returning authenticated
 * user with completed onboarding must open `/(tabs)/library`. The normalization
 * effect runs after this component mounts (navigator is already mounted) and
 * executes exactly once per process lifetime via `normalizedRef`.
 *
 * Background/foreground resume preserves the current route naturally because
 * `normalizedRef` is already true.
 */
function StartupGate({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { isInitializing, user, onboardingStatus } = useAuth();
  const router = useRouter();
  const normalizedRef = useRef(false);
  const [ready, setReady] = useState(false);

  // Normalize the initial route on cold start.
  // Runs after the navigator has mounted (this component and RootLayoutNav
  // are already rendered, so the Stack navigator exists).
  useEffect(() => {
    if (!fontsLoaded || isInitializing) return;
    if (normalizedRef.current) return;
    normalizedRef.current = true;

    if (user && onboardingStatus === 'complete') {
      router.replace('/(tabs)/library');
    }

    setReady(true);
  }, [fontsLoaded, isInitializing, user, onboardingStatus, router]);

  // Hide the native splash only after all startup requirements are met.
  useEffect(() => {
    if (fontsLoaded && !isInitializing && ready) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isInitializing, ready]);

  // Always render the navigation tree. The native splash covers the content
  // visually until hideAsync() is called above.
  return <RootLayoutNav />;
}

/**
 * Complete route protection matrix using declarative Stack.Protected groups.
 *
 * Every private route is explicitly placed inside its protection group.
 * No route relies on Expo Router's automatic unguarded registration.
 *
 * ┌───────────────────────────────────────────────────┬──────────────────────────────────────────┐
 * │ Guard                                             │ Screens                                  │
 * ├───────────────────────────────────────────────────┼──────────────────────────────────────────┤
 * │ none (public)                                     │ index, preview, legal, modal, +not-found │
 * │ !isAuthenticated                                  │ (auth)                                   │
 * │ isAuthenticated && onboardingStatus === 'incomplete' │ onboarding                            │
 * │ isAuthenticated && onboardingStatus === 'complete' │ (tabs), story/[id], story/[id]/premise, │
 * │                                                   │ story/[id]/character, reader/[id],       │
 * │                                                   │ scene-media, saved-scenes,               │
 * │                                                   │ profile/narrative-preferences,           │
 * │                                                   │ profile/avatar, profile/consent          │
 * └───────────────────────────────────────────────────┴──────────────────────────────────────────┘
 *
 * Route removal on invalidation: when `isAuthenticated` flips to false (logout,
 * expired session via runtime event, or failed bootstrap), Stack.Protected
 * automatically removes every protected route from the navigation state.
 * The user falls back to the nearest public route (index).
 */
function RootLayoutNav() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'ios' ? insets.top : 0;
  const { isAuthenticated, onboardingStatus } = useAuth();

  return (
    <View style={[styles.root, { paddingTop: topInset }]}>
      <ExpoStatusBar style="light" backgroundColor="#0a0a0a" translucent={false} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0a0a0a' } }}>
        {/* ── Public routes (always registered) ───────────────────── */}
        <Stack.Screen name="index" />
        <Stack.Screen name="preview" />
        <Stack.Screen name="legal" options={{ title: 'Termos e Privacidade' }} />

        {/* ── Auth routes (unauthenticated only) ──────────────────── */}
        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>

        {/* ── Onboarding (authenticated, onboarding incomplete) ───── */}
        <Stack.Protected guard={isAuthenticated && onboardingStatus === 'incomplete'}>
          <Stack.Screen name="onboarding" options={{ title: 'Boas-vindas' }} />
        </Stack.Protected>

        {/* ── Protected (authenticated, onboarding complete) ──────── */}
        <Stack.Protected guard={isAuthenticated && onboardingStatus === 'complete'}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="story/[id]" />
          <Stack.Screen name="story/[id]/premise" options={{ title: 'Ponto de Partida' }} />
          <Stack.Screen name="story/[id]/character" options={{ title: 'Personagem' }} />
          <Stack.Screen name="reader/[id]" />
          <Stack.Screen name="scene-media" options={{ title: 'Galeria de Cenas' }} />
          <Stack.Screen name="saved-scenes" options={{ title: 'Cenas Salvas' }} />
          <Stack.Screen name="profile/narrative-preferences" options={{ title: 'Preferências de Narrativa' }} />
          <Stack.Screen name="profile/avatar" options={{ title: 'Avatar' }} />
          <Stack.Screen name="profile/consent" options={{ title: 'Consentimento' }} />
        </Stack.Protected>

        {/* ── Modal (available in any auth state) ─────────────────── */}
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
});
