import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { api } from '../api/client';
import { useRouter, useSegments } from 'expo-router';
import { tokenStorage } from '../storage/tokenStorage';

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
      // Redirect away from login if already authenticated
      router.replace('/(tabs)/library');
    }
  }, [user, segments, isLoading]);

  const loadUser = async () => {
    try {
      const search = __DEV__ && Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.search : '';
      const shouldDevLogout = search.includes('logout=1');
      if (shouldDevLogout) {
        await tokenStorage.deleteItem('accessToken');
        await tokenStorage.deleteItem('refreshToken');
        setUser(null);
        return;
      }

      const token = await tokenStorage.getItem('accessToken');
      if (token) {
        const { data } = await api.get('/auth/profile');
        setUser(data);
      } else if (__DEV__ && Platform.OS === 'web') {
        const shouldDemoLogin = search.includes('demoLogin=1');
        if (shouldDemoLogin) {
          await login({ email: 'demo@enredo.ai', password: 'Demo1234!' });
        }
      }
    } catch (e) {
      console.log('Failed to load user', e);
      await tokenStorage.deleteItem('accessToken');
      await tokenStorage.deleteItem('refreshToken');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: any) => {
    const { data } = await api.post('/auth/login', credentials);
    await tokenStorage.setItem('accessToken', data.accessToken);
    await tokenStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
    router.replace('/(tabs)/library');
  };

  const register = async (credentials: any) => {
    const { data } = await api.post('/auth/register', credentials);
    await tokenStorage.setItem('accessToken', data.accessToken);
    await tokenStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
    router.replace('/(tabs)/library');
  };

  const socialLogin = async (provider: 'GOOGLE', idToken: string, name?: string) => {
    const { data } = await api.post('/auth/sso', { provider, idToken, name });
    await tokenStorage.setItem('accessToken', data.accessToken);
    await tokenStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
    router.replace('/(tabs)/library');
  };

  const logout = async () => {
    await tokenStorage.deleteItem('accessToken');
    await tokenStorage.deleteItem('refreshToken');
    setUser(null);
    router.replace('/(auth)/login');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, socialLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
