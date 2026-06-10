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
import { Eye, EyeOff, Mail, User, UserRound } from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';

const accent = '#CEBDFF';
const accentText = '#381385';
const registerImage =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDfYUZkLm4Wt-y4kgFfISkOqJYv3PvyLMeHS40AxKFf-YqpAEb04EehjMVmSqWslbIt0qzLJKj5dHE4RBqLFKNPqxjqv7dzkLGyx2e4jz8WWy8tarVnWcS1erPx2sB-pN7JSn3cXUHXNAp2GXkK1bhnBu16fk5ZKmqEIfQLYLSerFk5FxLOiqa8yRRsNB_Cmti6Q_yK5ZWIInVJZzvAd7IMd-T3zBLY-9ZT2piNI5BC3mvYlRvOkmvL-i99CLeSOtPe6PhbOuPKXDA';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const getRegisterErrorMessage = (error: any) => {
    if (error?.code === 'ECONNABORTED') {
      return 'A API demorou para responder. Tente novamente em instantes.';
    }

    if (error?.request && !error?.response) {
      return 'Não foi possível conectar ao servidor do Enredo.ai.';
    }

    return error?.response?.data?.message || 'Verifique os dados informados.';
  };

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      const message = 'Preencha nome, e-mail e senha antes de continuar.';
      setRegisterError(message);
      Alert.alert('Campos obrigatórios', message);
      return;
    }

    if (password !== confirmPassword) {
      const message = 'As senhas não coincidem.';
      setRegisterError(message);
      Alert.alert('Senha diferente', message);
      return;
    }

    try {
      setRegisterError('');
      setSubmitting(true);
      await register({ name, email, password });
    } catch (e: any) {
      const message = getRegisterErrorMessage(e);
      setRegisterError(message);
      Alert.alert('Erro ao registrar', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ImageBackground source={{ uri: registerImage }} style={styles.container} imageStyle={styles.backgroundImage}>
      <View style={styles.overlay} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.brand}>Enredo.ai</Text>
          <Text style={styles.title}>Crie sua conta</Text>
          <Text style={styles.subtitle}>Torne-se o protagonista da sua próxima história cinematográfica.</Text>
        </View>

        <View style={styles.card}>
          <Field
            label="Nome completo"
            icon={<User color={colors.textMuted} size={18} />}
            value={name}
            onChangeText={setName}
            placeholder="Como devemos te chamar?"
          />
          <Field
            label="E-mail"
            icon={<Mail color={colors.textMuted} size={18} />}
            value={email}
            onChangeText={setEmail}
            placeholder="seu@exemplo.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Field
            label="Senha"
            icon={<UserRound color={colors.textMuted} size={18} />}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry={!showPassword}
            accessory={
              <TouchableOpacity onPress={() => setShowPassword((current) => !current)}>
                {showPassword ? <EyeOff color={colors.textMuted} size={18} /> : <Eye color={colors.textMuted} size={18} />}
              </TouchableOpacity>
            }
          />
          <Field
            label="Confirmar senha"
            icon={<UserRound color={colors.textMuted} size={18} />}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="••••••••"
            secureTextEntry={!showPassword}
          />

          {registerError ? <Text style={styles.errorText}>{registerError}</Text> : null}

          <TouchableOpacity
            style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
            onPress={handleRegister}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#381385" />
            ) : (
              <Text style={styles.primaryButtonText}>Criar conta</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Já possui uma conta?</Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.footerLink}>Entrar</Text>
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
    opacity: 0.22,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(9,10,14,0.82)',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 56,
    gap: 24,
  },
  header: {
    gap: 12,
  },
  brand: {
    ...typography.h3,
    color: accent,
    fontStyle: 'italic',
  },
  title: {
    ...typography.h1,
    color: '#F4F0F8',
    fontSize: 38,
    lineHeight: 42,
  },
  subtitle: {
    ...typography.body,
    color: '#CAC4D4',
    maxWidth: 340,
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
    fontSize: 10,
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
  primaryButton: {
    marginTop: 22,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: accent,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.55,
  },
  primaryButtonText: {
    ...typography.h3,
    color: accentText,
    fontSize: 20,
  },
  errorText: {
    ...typography.bodySmall,
    color: '#F3A6A6',
    lineHeight: 18,
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
});
