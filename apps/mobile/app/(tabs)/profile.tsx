import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Bookmark, BookOpen, ChevronRight, FileText, LogOut, Settings, Sparkles, UserCircle2 } from 'lucide-react-native';
import { api } from '../../src/api/client';
import { SessionListResponse, SubscriptionResponse } from '../../src/api/types';
import { useAuth } from '../../src/context/AuthContext';
import { StateBlock } from '../../src/components/state-block';
import { typography } from '../../src/theme/typography';

const ACCENT = '#CEBDFF';
const PANEL_ALT = '#1c1b1b';
const SOFT_TEXT = '#B7AFC8';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const { data: subscription, isLoading: subscriptionLoading, isError: subscriptionError } = useQuery<SubscriptionResponse>({
    queryKey: ['subscription'],
    queryFn: async () => {
      const { data } = await api.get<SubscriptionResponse>('/billing/subscription');
      return data;
    },
  });

  const { data: sessions = [], isLoading: sessionsLoading, isError: sessionsError, refetch: refetchSessions } = useQuery({
    queryKey: ['profile-sessions-summary'],
    queryFn: async () => {
      const { data } = await api.get<SessionListResponse>('/reading/sessions', { params: { limit: 50 } });
      return data.sessions;
    },
  });

  if (subscriptionLoading || sessionsLoading) {
    return (
      <View style={styles.container}>
        <StateBlock fullScreen loading title="Carregando perfil" description="Buscando suas informações de conta e sessões ativas." />
      </View>
    );
  }

  if (subscriptionError || sessionsError) {
    return (
      <View style={styles.container}>
        <StateBlock
          fullScreen
          title="Erro ao carregar perfil"
          description="Não foi possível carregar suas informações de conta."
          actionLabel="Tentar novamente"
          onAction={() => refetchSessions()}
        />
      </View>
    );
  }

  const planLabel = subscription?.type || user?.plan || 'FREE';
  const activeCount = sessions.filter((s) => s.status === 'ACTIVE').length;
  const profileInitial = user?.name?.slice(0, 1)?.toUpperCase() || 'E';

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      void logout();
      return;
    }

    Alert.alert('Sair da conta', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.brandGroup}>
          <UserCircle2 color={ACCENT} size={22} />
          <Text style={styles.brand}>Enredo.ai</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Identity card */}
        <View style={styles.card}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatarRing}>
              {user?.imageUrl ? (
                <Image source={{ uri: user.imageUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitial}>{profileInitial}</Text>
                </View>
              )}
            </View>
          </View>

          <Text style={styles.name}>{user?.name || 'Leitor Enredo.ai'}</Text>
          {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}

          <View style={styles.planPill}>
            <Text style={styles.planPillText}>
              {planLabel === 'PREMIUM' ? 'Premium ativo' : 'Plano Grátis'}
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{activeCount}</Text>
              <Text style={styles.statLabel}>Histórias ativas</Text>
            </View>
          </View>
        </View>

        {/* Navigation shortcuts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acesso rápido</Text>

          <Row
            icon={<Bookmark color={ACCENT} size={20} />}
            title="Cenas salvas"
            subtitle="Suas cenas favoritas do feed"
            onPress={() => router.push('/saved-scenes' as any)}
          />
          <Row
            icon={<BookOpen color={ACCENT} size={20} />}
            title="Minhas leituras"
            subtitle={`${activeCount} história${activeCount !== 1 ? 's' : ''} em andamento`}
            onPress={() => router.push('/(tabs)/active')}
          />
          <Row
            icon={<Sparkles color={ACCENT} size={20} />}
            title="Premium e créditos (dev)"
            subtitle={planLabel === 'PREMIUM' ? 'Gerenciar assinatura' : 'Ver planos disponíveis'}
            onPress={() => router.push('/(tabs)/upgrade')}
          />
          <Row
            icon={<FileText color={ACCENT} size={20} />}
            title="Termos e privacidade"
            subtitle="Termos de uso e política de privacidade"
            onPress={() => router.push('/legal' as any)}
          />
          <Row
            icon={<Settings color={ACCENT} size={20} />}
            title="Preferências de narrativa"
            subtitle="Ajuste o tom das histórias privadas"
            onPress={() => router.push('/profile/narrative-preferences' as any)}
          />
        </View>

        {/* Logout */}
        <TouchableOpacity activeOpacity={0.88} style={styles.logoutButton} onPress={handleLogout}>
          <LogOut color="#FCA5A5" size={18} />
          <Text style={styles.logoutText}>Sair da conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Row({ icon, title, subtitle, onPress }: { icon: React.ReactNode; title: string; subtitle: string; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.88} style={styles.row} onPress={onPress}>
      <View style={styles.rowLeft}>
        <View style={styles.rowIcon}>{icon}</View>
        <View style={styles.rowCopy}>
          <Text style={styles.rowTitle}>{title}</Text>
          <Text style={styles.rowSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <ChevronRight color="#6F6688" size={20} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  topBar: {
    height: 64, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: 'rgba(206, 189, 255, 0.12)',
    backgroundColor: 'rgba(10, 10, 12, 0.96)', justifyContent: 'center',
  },
  brandGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brand: { ...typography.h3, color: ACCENT, fontStyle: 'italic' },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 80 },
  card: {
    alignItems: 'center', marginBottom: 24, paddingHorizontal: 20, paddingVertical: 26,
    borderRadius: 30, backgroundColor: PANEL_ALT, borderWidth: 1, borderColor: 'rgba(206, 189, 255, 0.08)',
  },
  avatarWrap: { marginBottom: 16 },
  avatarRing: { width: 112, height: 112, borderRadius: 56, padding: 3, backgroundColor: 'rgba(206, 189, 255, 0.26)' },
  avatarFallback: { flex: 1, borderRadius: 54, alignItems: 'center', justifyContent: 'center', backgroundColor: '#121119' },
  avatarImage: { flex: 1, borderRadius: 54 },
  avatarInitial: { ...typography.h1, color: ACCENT, fontSize: 34, lineHeight: 40 },
  name: { ...typography.h2, color: '#e5e2e1', marginBottom: 4 },
  email: { ...typography.bodySmall, color: SOFT_TEXT, fontSize: 13, marginBottom: 10 },
  planPill: { marginTop: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(206, 189, 255, 0.12)', borderWidth: 1, borderColor: 'rgba(206, 189, 255, 0.18)' },
  planPillText: { ...typography.label, color: ACCENT, fontSize: 10 },
  statsRow: { flexDirection: 'row', marginTop: 16 },
  statItem: { alignItems: 'center' },
  statValue: { ...typography.h2, color: ACCENT, fontSize: 28, marginBottom: 4 },
  statLabel: { ...typography.label, color: SOFT_TEXT, fontSize: 9 },
  section: { gap: 12, marginBottom: 24 },
  sectionTitle: { ...typography.label, color: SOFT_TEXT, fontSize: 10, marginBottom: 4, marginLeft: 4 },
  row: {
    borderRadius: 24, backgroundColor: PANEL_ALT, borderWidth: 1, borderColor: 'rgba(206, 189, 255, 0.08)',
    padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  rowIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center' },
  rowCopy: { flex: 1 },
  rowTitle: { ...typography.body, color: '#e5e2e1', fontWeight: '700', marginBottom: 2 },
  rowSubtitle: { ...typography.bodySmall, color: SOFT_TEXT },
  logoutButton: {
    marginTop: 6, borderRadius: 24, backgroundColor: 'rgba(127, 29, 29, 0.35)',
    borderWidth: 1, borderColor: 'rgba(252, 165, 165, 0.18)', padding: 20,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  logoutText: { ...typography.body, color: '#FCA5A5', fontWeight: '700' },
});
