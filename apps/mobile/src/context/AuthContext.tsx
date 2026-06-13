import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../api/client';
import { tokenStorage } from '../storage/tokenStorage';
import { sessionEvents } from '../auth/sessionEvents';
import { useQueryClient } from '@tanstack/react-query';

type User = {
  id: string;
  email: string;
  name: string;
  plan?: string;
  imageUrl?: string | null;
};

type OnboardingStatus = 'loading' | 'incomplete' | 'complete';

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isInitializing: boolean;
  isAuthenticated: boolean;
  onboardingStatus: OnboardingStatus;
  login: (data: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  socialLogin: (provider: 'GOOGLE', idToken: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  markOnboardingComplete: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

const getOnboardingCompleteKey = (userId: string) => `onboardingComplete:${userId}`;
const CACHED_USER_KEY = 'cachedUser';

function parseCachedUser(value: string | null): User | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as User;
    return parsed?.id && parsed?.email ? parsed : null;
  } catch {
    return null;
  }
}

async function resolveOnboardingStatus(userId: string): Promise<OnboardingStatus> {
  try {
    const done = await tokenStorage.getItem(getOnboardingCompleteKey(userId));
    return done === 'true' ? 'complete' : 'incomplete';
  } catch {
    return 'incomplete';
  }
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus>('loading');
  const queryClient = useQueryClient();
  const router = useRouter();

  // Bootstrap: restore cached user + resolve onboarding, then mark init complete.
  // Cached-user fast path: setUser + resolveOnboardingStatus → isInitializing = false.
  // Background profile validation updates user without blocking.
  // No-cached-user path: wait for /auth/profile → resolve onboarding → isInitializing = false.
  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const search = __DEV__ && Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.search : '';
        const shouldDevLogout = search.includes('logout=1');
        if (shouldDevLogout) {
          await clearLocalSession();
          if (!cancelled) finishBootstrap(null, 'incomplete');
          return;
        }

        const token = await tokenStorage.getItem('accessToken');
        if (!token) {
          // No token — try demo login for web dev
          if (__DEV__ && Platform.OS === 'web') {
            const shouldDemoLogin = search.includes('demoLogin=1');
            if (shouldDemoLogin && !cancelled) {
              setIsInitializing(false);
              setIsLoading(false);
              try {
                await login({ email: 'demo@enredo.ai', password: 'Demo1234!' });
              } catch {
                // demo login failed — stay unauthenticated
              }
              return;
            }
          }
          if (!cancelled) finishBootstrap(null, 'incomplete');
          return;
        }

        // Token exists — attempt cached-user fast path
        const cachedUser = parseCachedUser(await tokenStorage.getItem(CACHED_USER_KEY));
        if (cachedUser) {
          const status = await resolveOnboardingStatus(cachedUser.id);
          if (!cancelled) {
            setUser(cachedUser);
            setOnboardingStatus(status);
            setIsInitializing(false);
            setIsLoading(false);
          }
        }

        // Background / primary profile validation
        try {
          const { data } = await api.get('/auth/profile');
          if (!cancelled) {
            setUser(data);
          }
          await tokenStorage.setItem(CACHED_USER_KEY, JSON.stringify(data));

          // No-cached-user path: onboarding was never resolved for this user.
          // Resolve now using the profile payload before finishing init.
          if (!cachedUser && !cancelled) {
            const status = await resolveOnboardingStatus(data.id);
            setUser(data);
            setOnboardingStatus(status);
            setIsInitializing(false);
            setIsLoading(false);
          }
        } catch (error: any) {
          // Session expiry: Axios refresh interceptor clears tokens on failure.
          // The error may no longer carry response.status === 401; check tokens directly.
          const tokenStillExists = await tokenStorage.getItem('accessToken');
          if (!tokenStillExists) {
            // Tokens were cleared by the interceptor → session is invalid.
            await clearLocalSession();
            if (!cancelled) finishBootstrap(null, 'incomplete');
            return;
          }

          // Tokens remain — could be a network error or transient failure.
          if (error?.response?.status === 401) {
            await clearLocalSession();
            if (!cancelled) finishBootstrap(null, 'incomplete');
          } else if (!cachedUser) {
            // No cached user and profile call failed → unauthenticated.
            await clearLocalSession();
            if (!cancelled) finishBootstrap(null, 'incomplete');
          }
          // If cachedUser exists and tokens remain, keep the cached user.
          // The app stays functional; next protected API call will retry/revalidate.
        }
      } catch (e) {
        if (__DEV__) {
          console.log('Failed to load user');
        }
        await clearLocalSession();
        if (!cancelled) finishBootstrap(null, 'incomplete');
      }
    };

    const clearLocalSession = async () => {
      await tokenStorage.deleteItem('accessToken');
      await tokenStorage.deleteItem('refreshToken');
      await tokenStorage.deleteItem(CACHED_USER_KEY);
      queryClient.clear();
    };

    const finishBootstrap = (userValue: User | null, onboarding: OnboardingStatus) => {
      setUser(userValue);
      setOnboardingStatus(onboarding);
      setIsInitializing(false);
      setIsLoading(false);
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  // Runtime session invalidation from the centralized refreshAccessToken() function.
  // When token refresh fails, refreshAccessToken() clears tokens from storage and
  // emits session-invalidated exactly once per failed single-flight refresh operation.
  // Both the proactive request-interceptor path and the reactive 401 response path
  // funnel through the same promise, so concurrent requests share one refresh attempt
  // and produce at most one invalidation event.
  // This handler is idempotent: the functional setUser form returns early if user is
  // already null.
  useEffect(() => {
    const unsubscribe = sessionEvents.subscribe(() => {
      setUser((prev) => {
        if (prev === null) return prev;
        return null;
      });
      setOnboardingStatus('incomplete');
      tokenStorage.deleteItem(CACHED_USER_KEY).catch(() => {});
      queryClient.clear();
    });

    return unsubscribe;
  }, [queryClient]);

  const login = useCallback(async (credentials: any) => {
    const { data } = await api.post('/auth/login', credentials);
    queryClient.clear();
    await tokenStorage.setItem('accessToken', data.accessToken);
    await tokenStorage.setItem('refreshToken', data.refreshToken);
    await tokenStorage.setItem(CACHED_USER_KEY, JSON.stringify(data.user));
    const status = await resolveOnboardingStatus(data.user.id);
    setOnboardingStatus(status);
    setUser(data.user);
  }, [queryClient]);

  const register = useCallback(async (credentials: any) => {
    const { data } = await api.post('/auth/register', credentials);
    queryClient.clear();
    await tokenStorage.setItem('accessToken', data.accessToken);
    await tokenStorage.setItem('refreshToken', data.refreshToken);
    await tokenStorage.setItem(CACHED_USER_KEY, JSON.stringify(data.user));
    const status = await resolveOnboardingStatus(data.user.id);
    setOnboardingStatus(status);
    setUser(data.user);
  }, [queryClient]);

  const socialLogin = useCallback(async (provider: 'GOOGLE', idToken: string, name?: string) => {
    const { data } = await api.post('/auth/sso', { provider, idToken, name });
    queryClient.clear();
    await tokenStorage.setItem('accessToken', data.accessToken);
    await tokenStorage.setItem('refreshToken', data.refreshToken);
    await tokenStorage.setItem(CACHED_USER_KEY, JSON.stringify(data.user));
    const status = await resolveOnboardingStatus(data.user.id);
    setOnboardingStatus(status);
    setUser(data.user);
  }, [queryClient]);

  const logout = useCallback(async () => {
    await tokenStorage.deleteItem('accessToken');
    await tokenStorage.deleteItem('refreshToken');
    await tokenStorage.deleteItem(CACHED_USER_KEY);
    queryClient.clear();
    setUser(null);
    setOnboardingStatus('incomplete');
    router.replace('/');
  }, [queryClient, router]);

  const markOnboardingComplete = useCallback(async () => {
    if (!user?.id) return;
    try {
      await tokenStorage.setItem(getOnboardingCompleteKey(user.id), 'true');
    } catch {
      // Storage failure is non-blocking.
      // Onboarding may show again on the next cold start, but the user proceeds.
    }
    // Always update state so the user can navigate forward.
    // If storage failed, the flag will be missing on the next cold start
    // and onboarding will be shown again — acceptable fallback.
    setOnboardingStatus('complete');
  }, [user]);

  const value: AuthContextType = {
    user,
    isLoading,
    isInitializing,
    isAuthenticated: user !== null,
    onboardingStatus,
    login,
    register,
    socialLogin,
    logout,
    markOnboardingComplete,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
