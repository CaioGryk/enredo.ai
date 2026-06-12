import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { api } from '../api/client';
import { useRouter, useSegments } from 'expo-router';
import { tokenStorage } from '../storage/tokenStorage';
import { useQueryClient } from '@tanstack/react-query';

type User = {
  id: string;
  email: string;
  name: string;
  plan?: string;
  imageUrl?: string | null;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (data: any) => Promise<void>;
  register: (data: any) => Promise<void>;
  socialLogin: (provider: 'GOOGLE', idToken: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
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
  const segments = useSegments();
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    // Use router to check segments defensively. 
    // `segments` is a string array representing the URL path.
    const segs = segments as string[];
    const inAuthGroup = segs.length > 0 && segs[0] === '(auth)';
    const isRoot = segs.length === 0 || (segs.length === 1 && segs[0] === 'index');
    
    if (!user && !inAuthGroup && !isRoot) {
      // Redirect to login if not authenticated and trying to access protected route
      router.replace('/(auth)/login');
    } else if (user && (inAuthGroup || isRoot)) {
      // Redirect authenticated users — check onboarding first
      tokenStorage.getItem(getOnboardingCompleteKey(user.id)).then((onboardingDone) => {
        if (onboardingDone === 'true') {
          router.replace('/(tabs)/library');
        } else {
          router.replace('/onboarding' as any);
        }
      });
    }
  }, [user, segments, isLoading]);

  const loadUser = async () => {
    try {
      const search = __DEV__ && Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.search : '';
      const shouldDevLogout = search.includes('logout=1');
      if (shouldDevLogout) {
        await tokenStorage.deleteItem('accessToken');
        await tokenStorage.deleteItem('refreshToken');
        queryClient.clear();
        setUser(null);
        return;
      }

      const token = await tokenStorage.getItem('accessToken');
      if (token) {
        const cachedUser = parseCachedUser(await tokenStorage.getItem(CACHED_USER_KEY));
        if (cachedUser) {
          setUser(cachedUser);
          setIsLoading(false);
        }

        try {
          const { data } = await api.get('/auth/profile');
          setUser(data);
          await tokenStorage.setItem(CACHED_USER_KEY, JSON.stringify(data));
        } catch (error: any) {
          if (error?.response?.status === 401) {
            await tokenStorage.deleteItem('accessToken');
            await tokenStorage.deleteItem('refreshToken');
            await tokenStorage.deleteItem(CACHED_USER_KEY);
            queryClient.clear();
            setUser(null);
          } else if (!cachedUser) {
            throw error;
          }
        }
      } else if (__DEV__ && Platform.OS === 'web') {
        const shouldDemoLogin = search.includes('demoLogin=1');
        if (shouldDemoLogin) {
          await login({ email: 'demo@enredo.ai', password: 'Demo1234!' });
        }
      }
    } catch (e) {
      if (__DEV__) {
        console.log('Failed to load user');
      }
      await tokenStorage.deleteItem('accessToken');
      await tokenStorage.deleteItem('refreshToken');
      await tokenStorage.deleteItem(CACHED_USER_KEY);
      queryClient.clear();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: any) => {
    const { data } = await api.post('/auth/login', credentials);
    queryClient.clear();
    await tokenStorage.setItem('accessToken', data.accessToken);
    await tokenStorage.setItem('refreshToken', data.refreshToken);
    await tokenStorage.setItem(CACHED_USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
  };

  const register = async (credentials: any) => {
    const { data } = await api.post('/auth/register', credentials);
    queryClient.clear();
    await tokenStorage.setItem('accessToken', data.accessToken);
    await tokenStorage.setItem('refreshToken', data.refreshToken);
    await tokenStorage.setItem(CACHED_USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
  };

  const socialLogin = async (provider: 'GOOGLE', idToken: string, name?: string) => {
    const { data } = await api.post('/auth/sso', { provider, idToken, name });
    queryClient.clear();
    await tokenStorage.setItem('accessToken', data.accessToken);
    await tokenStorage.setItem('refreshToken', data.refreshToken);
    await tokenStorage.setItem(CACHED_USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
  };

  const logout = async () => {
    await tokenStorage.deleteItem('accessToken');
    await tokenStorage.deleteItem('refreshToken');
    await tokenStorage.deleteItem(CACHED_USER_KEY);
    queryClient.clear();
    setUser(null);
    router.replace('/(auth)/login');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, socialLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
