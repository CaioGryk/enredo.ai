import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Apple, BookOpen, Mail, User, X } from 'lucide-react-native';
import { API_URL } from '../../src/api/client';
import { useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { goBackSafe } from '../../src/utils/navigation-helper';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '';
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

const accent = '#CEBDFF';
const accentText = '#381385';
const loginHeroImage =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAziP4deB8wPfmK0h_fsdbGwekaFQveaWTot49rOoau9FAvdRDjSJRnajM-Z3DsBeoQeLYhIDKEJbZJFjMXjqglHoGUDzQnsNq4YQP6bJ3rjwywengRf6SrV2FOFdaVC4ilNoQT-GnSRncRRyDenDDZnU9YGGaYopbXLNCofjoICnmhpyZv9Xtl9vI4NEu3clFzUf1ZmMEVdNVbyA8EgDTTG_zbROy_FIJup6q4Hgb80-ZGJ5qK9Uiy8yS-_PakP0cVdbzsGgCaC7Q';

const getAuthErrorMessage = (error: any, fallback: string) => {
  if (error?.code === 'ECONNABORTED') {
    return `A API demorou para responder. URL: ${API_URL}`;
  }

  if (error?.request && !error?.response) {
    return `Não foi possível conectar ao servidor do Enredo.ai.\n\nURL: ${API_URL}\nErro técnico: ${error?.message || error?.code || 'sem resposta'}`;
  }

  const responseMessage = error?.response?.data?.message;
  return Array.isArray(responseMessage) ? responseMessage.join('\n') : responseMessage || fallback;
};

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [authError, setAuthError] = useState('');
  const { login, socialLogin } = useAuth();
  const router = useRouter();

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: Platform.OS === 'android' ? GOOGLE_ANDROID_CLIENT_ID : Platform.OS === 'ios' ? GOOGLE_IOS_CLIENT_ID : GOOGLE_WEB_CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.IdToken,
      redirectUri: AuthSession.makeRedirectUri({}),
    },
    discovery
  );

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      if (id_token) {
        handleGoogleLogin(id_token);
      } else {
        Alert.alert('Erro no Google Login', 'Token de autenticação não recebido.');
      }
    } else if (response?.type === 'error') {
      Alert.alert('Erro no Google Login', 'Não foi possível autenticar com o Google.');
    } else if (response?.type === 'cancel') {
      Alert.alert('Cancelado', 'Login com Google foi cancelado.');
    }
  }, [response]);

  const handleGoogleLogin = async (idToken: string) => {
    try {
      setAuthError('');
      setGoogleSubmitting(true);
      await socialLogin('GOOGLE', idToken);
    } catch (e: any) {
      const message = getAuthErrorMessage(e, 'Não foi possível entrar com o Google.');
      setAuthError(message);
      Alert.alert('Erro no Google Login', message);
    } finally {
      setGoogleSubmitting(false);
    }
  };

  const handleLogin = async () => {
    try {
      setAuthError('');
      setSubmitting(true);
      await login({ email, password });
    } catch (e: any) {
      const message = getAuthErrorMessage(e, 'Verifique suas credenciais.');
      setAuthError(message);
      Alert.alert('Erro no login', message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    try {
      setAuthError('');
      setSubmitting(true);
      await login({ email: 'demo@enredo.ai', password: 'Demo1234!' });
    } catch (e: any) {
      const message = getAuthErrorMessage(e, 'Não foi possível entrar com o usuário demo.');
      setAuthError(message);
      Alert.alert('Erro no login demo', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ImageBackground source={{ uri: loginHeroImage }} style={styles.container} imageStyle={styles.backgroundImage}>
      <View style={styles.overlay} />

      <View style={styles.header}>
        <Text style={styles.brand}>Enredo.ai</Text>
        <TouchableOpacity onPress={() => goBackSafe('/')} style={styles.closeButton}>
          <X color={colors.textMuted} size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Brand Centerpiece */}
        <View style={styles.brandCenter}>
          <View style={styles.brandIconBox}>
            <BookOpen color={accent} size={44} strokeWidth={1.5} />
          </View>
          <Text style={styles.brandCenterName}>Enredo.ai</Text>
          <Text style={styles.brandCenterTagline}>Sua próxima história começa aqui.</Text>
        </View>

        <View style={styles.card}>
          <Field
            label="E-mail"
            icon={<Mail color={colors.textMuted} size={18} />}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="nome@exemplo.com"
          />

          <Field
            label="Senha"
            icon={<User color={colors.textMuted} size={18} />}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            accessory={<Text style={styles.forgotText}>Esqueci a senha</Text>}
          />

          <TouchableOpacity
            style={[styles.primaryButton, submitting && styles.disabledButton]}
            onPress={handleLogin}
            disabled={submitting}
          >
            {submitting ? <ActivityIndicator color={accentText} /> : <Text style={styles.primaryButtonText}>Entrar</Text>}
          </TouchableOpacity>

          {authError ? <Text style={styles.errorText}>{authError}</Text> : null}

          {__DEV__ ? (
            <TouchableOpacity
              style={[styles.demoButton, submitting && styles.disabledButton]}
              onPress={handleDemoLogin}
              disabled={submitting}
            >
              <Text style={styles.demoButtonText}>Entrar como demo</Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>ou continue com</Text>
            <View style={styles.divider} />
          </View>

          <View style={styles.socialRow}>
            <TouchableOpacity
              style={[styles.socialButton, (googleSubmitting || !request) && styles.disabledButton]}
              onPress={() => promptAsync()}
              disabled={googleSubmitting || !request}
            >
              {googleSubmitting ? (
                <ActivityIndicator color={colors.text} size="small" />
              ) : (
                <>
                  <User color={colors.text} size={16} />
                  <Text style={styles.socialButtonText}>Google</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={[styles.socialButton, styles.disabledButton]} disabled>
              <Apple color={colors.textMuted} size={17} />
              <Text style={[styles.socialButtonText, { color: colors.textMuted }]}>Apple (em breve)</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Não tem uma conta?</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.footerLink}>Criar conta</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

function Field({
  label,
  icon,
  accessory,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  label: string;
  icon: React.ReactNode;
  accessory?: React.ReactNode;
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.fieldRow}>
        {icon}
        <TextInput
          {...props}
          style={[styles.input, Platform.OS === 'web' ? styles.webInput : null]}
          placeholderTextColor="rgba(139,131,158,0.82)"
        />
        {accessory}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  backgroundImage: {
    resizeMode: 'cover',
    opacity: 0.2,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(9,10,14,0.86)',
  },
  header: {
    height: 64,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    ...typography.h3,
    color: accent,
    fontStyle: 'italic',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(206,189,255,0.08)',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 42,
    gap: 24,
  },
  brandCenter: {
    alignItems: 'center',
    paddingTop: 28,
    gap: 14,
  },
  brandIconBox: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(206,189,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(206,189,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  brandCenterName: {
    ...typography.h1,
    color: accent,
    fontStyle: 'italic',
    fontSize: 42,
    lineHeight: 48,
    letterSpacing: -0.5,
  },
  brandCenterTagline: {
    ...typography.body,
    color: '#cac4d480',
    fontSize: 15,
  },
  heroCopy: {
    paddingTop: 28,
    gap: 12,
  },
  heroTitle: {
    ...typography.h1,
    color: '#F4F0F8',
    fontSize: 35,
    lineHeight: 39,
    maxWidth: 320,
  },
  heroSubtitle: {
    ...typography.body,
    color: '#CAC4D4',
    maxWidth: 320,
    lineHeight: 24,
    fontSize: 15,
  },
  card: {
    borderRadius: 30,
    padding: 24,
    backgroundColor: 'rgba(21,19,27,0.90)',
    borderWidth: 1,
    borderColor: 'rgba(206,189,255,0.08)',
    gap: 18,
  },
  fieldBlock: {
    gap: 8,
  },
  label: {
    ...typography.label,
    color: '#C9BEDC',
    fontSize: 9,
    letterSpacing: 1.6,
  },
  fieldRow: {
    minHeight: 58,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(206,189,255,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    fontFamily: typography.body.fontFamily,
    color: '#F4F0F8',
    flex: 1,
    minHeight: 50,
    height: 50,
    fontSize: 16,
    lineHeight: 20,
    paddingVertical: 0,
    includeFontPadding: false,
  },
  webInput: {
    outlineStyle: 'none',
    boxShadow: 'none',
  } as any,
  forgotText: {
    ...typography.bodySmall,
    color: accent,
    fontWeight: '700',
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: accent,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  primaryButtonText: {
    ...typography.h3,
    color: accentText,
    fontSize: 18,
  },
  demoButton: {
    minHeight: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(206,189,255,0.24)',
    backgroundColor: 'rgba(206,189,255,0.08)',
  },
  demoButtonText: {
    ...typography.label,
    color: accent,
    fontSize: 10,
  },
  errorText: {
    ...typography.bodySmall,
    color: '#F3A6A6',
    lineHeight: 18,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  dividerText: {
    ...typography.label,
    color: colors.textMuted,
    fontSize: 9,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 10,
  },
  socialButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(206,189,255,0.10)',
    backgroundColor: 'rgba(206,189,255,0.05)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  socialButtonText: {
    ...typography.bodySmall,
    color: '#F4F0F8',
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 8,
  },
  footerText: {
    ...typography.bodySmall,
    color: '#B7AEC8',
  },
  footerLink: {
    ...typography.bodySmall,
    color: accent,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.55,
  },
});
