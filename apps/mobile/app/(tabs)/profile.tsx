import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Brain, ChevronRight, Lock, LogOut, Play, UserCircle2 } from 'lucide-react-native';
import { api } from '../../src/api/client';
import { SessionListResponse, SubscriptionResponse } from '../../src/api/types';
import { useAuth } from '../../src/context/AuthContext';
import { typography } from '../../src/theme/typography';

const ACCENT = '#CEBDFF';
const PANEL = '#15131B';
const PANEL_ALT = '#1B1824';
const SOFT_TEXT = '#B7AFC8';

type ProfileTab = 'VIDEOS' | 'CREATED' | 'SAVED';

const mockVideos = [
  {
    id: '1',
    title: 'O Silencio dos Astros',
    views: '14.2k',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBJjSTAmWlxN6T1pLWcfTFydBwHocWBR1-kAHgpgT8dWrztaH2mqa8J68VLQ0B53UWbxzxVj5UYHFdk1pNCjo8gItjHbRzu93myYab39c64EMDCwPOIoCjmlqeP3lyMoFmfyJQ71jfHaGDQyepVOxwEsY2lCp948BlWpVcqXETajwbSGbRumCK933tXikH3uAVlgkTc85rafoSNxDEw9-rZueZ5_-XIV_FzuUp_9duULHCAP5F0uiFbC1iT2JRDhkJsyX3tid-gEbU',
  },
  {
    id: '2',
    title: 'Ruas de Neon',
    views: '8.5k',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuB6l-Cq6jEr_PjBiwnKJtTL8Q25Nh73NBL0fUm8m4VT7oI2x6qwQlvzVkjTEtlHH4XTauD0sk8ujlYKEo1IENzsY3xwjS71uO_84fUzk-S5C78UA2aWYOK14ycvMLA-d0_oDLYPA4I81q17e25lDoUWWDXmYGBFlLtpBdlDm4uZqA1KQIlzmbILteOCWjB_WcaeWJPN3WlkgePIGzaDUsO-r6kxqBzG5b0CgoFMo2_s6zS6I1E-zcalbfO-dPQPO-fJNpq56abaoAg',
  },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>('VIDEOS');

  const { data: subscription } = useQuery<SubscriptionResponse>({
    queryKey: ['subscription'],
    queryFn: async () => {
      const { data } = await api.get<SubscriptionResponse>('/billing/subscription');
      return data;
    },
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['profile-sessions-summary'],
    queryFn: async () => {
      const { data } = await api.get<SessionListResponse>('/reading/sessions', {
        params: { limit: 50 },
      });
      return data.sessions;
    },
  });

  const planLabel = subscription?.type || user?.plan || 'FREE';
  const stats = useMemo(() => {
    const active = sessions.filter((item) => item.status === 'ACTIVE').length;
    const created = Math.max(0, sessions.length - active);
    return {
      publishedVideos: mockVideos.length,
      followers: '1.2k',
      activeStories: active,
      createdStories: created,
    };
  }, [sessions]);

  const profileInitial = user?.name?.slice(0, 1)?.toUpperCase() || 'E';

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.brandGroup}>
          <UserCircle2 color={ACCENT} size={22} />
          <Text style={styles.brand}>Enredo.ai</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerBlock}>
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
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.editAvatarButton}
              onPress={() => router.push('/profile/avatar' as any)}
            >
              <Text style={styles.editAvatarButtonText}>✎</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.profileName}>{user?.name || 'Leitor Enredo.ai'}</Text>
          <Text style={styles.profileBio}>
            "Tecendo mundos e explorando narrativas onde a tecnologia encontra a alma."
          </Text>

          <View style={styles.planPill}>
            <Text style={styles.planPillText}>{planLabel === 'PREMIUM' ? 'Premium ativo' : 'Plano Free'}</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.publishedVideos}</Text>
              <Text style={styles.statLabel}>Videos publicados</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.followers}</Text>
              <Text style={styles.statLabel}>Seguidores</Text>
            </View>
          </View>
        </View>

        <View style={styles.tabsWrap}>
          {[
            { id: 'VIDEOS', label: 'VIDEOS' },
            { id: 'CREATED', label: 'HISTORIAS CRIADAS' },
            { id: 'SAVED', label: 'SALVOS' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              activeOpacity={0.85}
              style={styles.tabButton}
              onPress={() => setActiveTab(tab.id as ProfileTab)}
            >
              <Text style={[styles.tabLabel, activeTab === tab.id && styles.tabLabelActive]}>{tab.label}</Text>
              {activeTab === tab.id ? <View style={styles.tabIndicator} /> : null}
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'VIDEOS' ? (
          <View style={styles.videoGrid}>
            {mockVideos.map((video) => (
              <TouchableOpacity key={video.id} activeOpacity={0.9} style={styles.videoCard}>
                <Image source={{ uri: video.image }} style={styles.videoImage} />
                <View style={styles.videoOverlay}>
                  <Text style={styles.videoTitle} numberOfLines={2}>
                    {video.title}
                  </Text>
                  <View style={styles.videoMeta}>
                    <Play color={ACCENT} fill={ACCENT} size={12} />
                    <Text style={styles.videoViews}>{video.views}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyPanel}>
            <Text style={styles.emptyPanelTitle}>
              {activeTab === 'CREATED' ? 'Nenhuma historia criada ainda' : 'Nada salvo por enquanto'}
            </Text>
            <Text style={styles.emptyPanelText}>
              {activeTab === 'CREATED'
                ? 'Quando abrirmos o fluxo de criacao conectado ao backend, suas historias aparecerao aqui.'
                : 'As historias e cenas que voce salvar vao aparecer nesta aba.'}
            </Text>
          </View>
        )}

        <View style={styles.settingsSection}>
          <Text style={styles.settingsTitle}>Configuracoes</Text>

          <SettingRow
            icon={<Brain color={ACCENT} size={20} />}
            title="Consentimento de IA"
            subtitle="Personalizacao e treinamento"
            onPress={() => router.push('/profile/consent' as any)}
          />

          <SettingRow
            icon={<Lock color={ACCENT} size={20} />}
            title="Privacidade"
            subtitle="Dados e visibilidade da conta"
            onPress={() => Alert.alert('Em breve', 'As configuracoes de privacidade entram na proxima rodada.')}
          />

          <SettingRow
            icon={<ChevronRight color={ACCENT} size={20} />}
            title="Plano e creditos"
            subtitle={`${stats.activeStories} historias ativas • ${planLabel}`}
            onPress={() => router.push('/(tabs)/upgrade')}
          />

          <TouchableOpacity
            activeOpacity={0.88}
            style={styles.logoutButton}
            onPress={() => logout()}
          >
            <LogOut color="#FCA5A5" size={18} />
            <Text style={styles.logoutText}>Sair da conta</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function SettingRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.88} style={styles.settingRow} onPress={onPress}>
      <View style={styles.settingLeft}>
        <View style={styles.settingIcon}>{icon}</View>
        <View style={styles.settingCopy}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <ChevronRight color="#6F6688" size={20} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0F',
  },
  topBar: {
    height: 64,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(206, 189, 255, 0.12)',
    backgroundColor: 'rgba(10, 10, 12, 0.96)',
    justifyContent: 'center',
  },
  brandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brand: {
    ...typography.h3,
    color: ACCENT,
    fontStyle: 'italic',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 120,
  },
  headerBlock: {
    alignItems: 'center',
    marginBottom: 28,
    paddingHorizontal: 20,
    paddingVertical: 26,
    borderRadius: 30,
    backgroundColor: PANEL_ALT,
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.08)',
  },
  avatarWrap: {
    marginBottom: 16,
  },
  avatarRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    padding: 3,
    backgroundColor: 'rgba(206, 189, 255, 0.26)',
  },
  avatarFallback: {
    flex: 1,
    borderRadius: 54,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121119',
  },
  avatarImage: {
    flex: 1,
    borderRadius: 54,
  },
  avatarInitial: {
    ...typography.h1,
    color: ACCENT,
    fontSize: 34,
    lineHeight: 40,
  },
  editAvatarButton: {
    position: 'absolute',
    right: -2,
    bottom: 2,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT,
  },
  editAvatarButtonText: {
    color: '#2F1561',
    fontSize: 15,
    fontWeight: '700',
  },
  profileName: {
    ...typography.h2,
    color: '#F5F1FF',
    marginBottom: 8,
  },
  profileBio: {
    ...typography.body,
    color: SOFT_TEXT,
    textAlign: 'center',
    fontStyle: 'italic',
    maxWidth: 292,
    lineHeight: 28,
  },
  planPill: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(206, 189, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.18)',
  },
  planPillText: {
    ...typography.label,
    color: ACCENT,
    fontSize: 10,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 6,
  },
  statItem: {
    width: 110,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 34,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  statValue: {
    ...typography.h2,
    color: ACCENT,
    fontSize: 28,
    marginBottom: 4,
  },
  statLabel: {
    ...typography.label,
    color: SOFT_TEXT,
    fontSize: 9,
    textAlign: 'center',
  },
  tabsWrap: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(206, 189, 255, 0.08)',
    marginBottom: 20,
    marginHorizontal: 4,
  },
  tabButton: {
    flex: 1,
    paddingBottom: 14,
    alignItems: 'center',
  },
  tabLabel: {
    ...typography.label,
    color: '#7D7690',
    fontSize: 9,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: ACCENT,
  },
  tabIndicator: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 0,
    height: 2,
    borderRadius: 999,
    backgroundColor: ACCENT,
  },
  videoGrid: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 30,
  },
  videoCard: {
    flex: 1,
    aspectRatio: 9 / 16,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: PANEL_ALT,
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.08)',
  },
  videoImage: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 14,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  videoTitle: {
    ...typography.bodySmall,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 6,
  },
  videoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  videoViews: {
    ...typography.label,
    color: ACCENT,
    fontSize: 9,
  },
  emptyPanel: {
    padding: 24,
    borderRadius: 28,
    backgroundColor: PANEL_ALT,
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.10)',
    marginBottom: 30,
    minHeight: 156,
    justifyContent: 'center',
  },
  emptyPanelTitle: {
    ...typography.h3,
    color: '#F5F1FF',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyPanelText: {
    ...typography.bodySmall,
    color: SOFT_TEXT,
    textAlign: 'center',
    lineHeight: 22,
  },
  settingsSection: {
    gap: 12,
    marginTop: 4,
  },
  settingsTitle: {
    ...typography.label,
    color: SOFT_TEXT,
    fontSize: 10,
    marginBottom: 6,
    marginLeft: 4,
  },
  settingRow: {
    borderRadius: 24,
    backgroundColor: PANEL_ALT,
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.08)',
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  settingIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingCopy: {
    flex: 1,
  },
  settingTitle: {
    ...typography.body,
    color: '#F5F1FF',
    fontWeight: '700',
    marginBottom: 2,
  },
  settingSubtitle: {
    ...typography.bodySmall,
    color: SOFT_TEXT,
  },
  logoutButton: {
    marginTop: 6,
    borderRadius: 24,
    backgroundColor: 'rgba(127, 29, 29, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(252, 165, 165, 0.18)',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoutText: {
    ...typography.body,
    color: '#FCA5A5',
    fontWeight: '700',
  },
});
