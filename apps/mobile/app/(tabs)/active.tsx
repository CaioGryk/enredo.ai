import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  ImageBackground,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { BookCheck, BookOpen, CheckCircle, CheckCircle2, Info, Menu, Play, PlusCircle, Sparkles, User } from 'lucide-react-native';
import { api, resolveApiAssetUrl } from '../../src/api/client';
import { ReadingSessionSummary, SessionListResponse, SubscriptionResponse } from '../../src/api/types';
import { useAuth } from '../../src/context/AuthContext';
import { StateBlock } from '../../src/components/state-block';
import { typography } from '../../src/theme/typography';
import { colors } from '../../src/theme/colors';

const ACCENT = '#CEBDFF';
const PANEL = '#131313';
const PANEL_ALT = '#1c1b1b';
const SOFT_TEXT = '#B7AFC8';

type Filter = 'ACTIVE' | 'COMPLETED' | 'ABANDONED' | 'ALL';

const filters: { id: Filter; label: string }[] = [
  { id: 'ACTIVE', label: 'Em progresso' },
  { id: 'COMPLETED', label: 'Finalizadas' },
  { id: 'ABANDONED', label: 'Abandonadas' },
  { id: 'ALL', label: 'Todas' },
];

export default function ActiveStoriesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>('ACTIVE');

  const { data: sessions = [], isLoading, isError, error, refetch } = useQuery<ReadingSessionSummary[]>({
    queryKey: ['sessions', filter],
    queryFn: async () => {
      const params = filter === 'ALL' ? undefined : { status: filter };
      const { data } = await api.get<SessionListResponse>('/reading/sessions', { params });
      return data.sessions;
    },
  });

  const { data: activeSessions = [] } = useQuery<ReadingSessionSummary[]>({
    queryKey: ['active-sessions-count'],
    queryFn: async () => {
      const { data } = await api.get<SessionListResponse>('/reading/sessions', {
        params: { status: 'ACTIVE' },
      });
      return data.sessions;
    },
  });

  const { data: subscription } = useQuery<SubscriptionResponse>({
    queryKey: ['subscription'],
    queryFn: async () => {
      const { data } = await api.get<SubscriptionResponse>('/billing/subscription');
      return data;
    },
  });

  const abandonMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      await api.post(`/reading/sessions/${sessionId}/abandon`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['active-sessions-count'] });
      queryClient.invalidateQueries({ queryKey: ['active-sessions-preview'] });
    },
    onError: () => {
      Alert.alert('Erro', 'Não foi possível abandonar esta história.');
    },
  });

  const isFreeUser = (subscription?.type || user?.plan || 'FREE') === 'FREE';
  const activeCount = activeSessions.length;
  const slots = useMemo(() => Math.max(0, 3 - activeCount), [activeCount]);

  function confirmAbandon(sessionId: string) {
    if (Platform.OS === 'web') {
      abandonMutation.mutate(sessionId);
      return;
    }

    Alert.alert('Abandonar crônica', 'Esta história sairá da sua lista de leituras ativas.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Abandonar', style: 'destructive', onPress: () => abandonMutation.mutate(sessionId) },
    ]);
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <StateBlock fullScreen loading title="Carregando suas crônicas" description="Buscando leituras em andamento." />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.container, styles.centered]}>
        <StateBlock
          fullScreen
          title="Não foi possível carregar"
          description="Verifique sua conexão e tente novamente."
          actionLabel="Tentar novamente"
          onAction={() => refetch()}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <View style={styles.topBar}>
              <Menu color={ACCENT} size={24} />
              <Text style={styles.brand}>Enredo.ai</Text>
              <User color={SOFT_TEXT} size={22} />
            </View>

            <View style={styles.heroSection}>
              <Text style={styles.eyebrow}>Suas crônicas</Text>
              <Text style={styles.title}>Minhas Histórias</Text>

              <View style={styles.statusRow}>
                <View style={styles.memberBadge}>
                  <CheckCircle2 color={colors.background} fill={ACCENT} size={14} />
                  <Text style={styles.memberText}>MEMBRO {isFreeUser ? 'FREE' : 'PREMIUM'}</Text>
                </View>
                {isFreeUser ? (
                  <Text style={[styles.slotText, activeCount >= 3 && styles.slotTextCritical]}>
                    {activeCount}/3 histórias ativas
                  </Text>
                ) : (
                  <Text style={styles.slotText}>Histórias ilimitadas</Text>
                )}
              </View>
            </View>

            <View style={styles.filterRow}>
              {filters.map((option) => (
                <TouchableOpacity key={option.id} style={styles.filterButton} onPress={() => setFilter(option.id)}>
                  <Text style={[styles.filterText, filter === option.id && styles.filterTextActive]}>
                    {option.label}
                  </Text>
                  {filter === option.id ? <View style={styles.filterIndicator} /> : null}
                </TouchableOpacity>
              ))}
            </View>

            {isFreeUser && activeCount >= 2 ? (
              <UpgradeNotice activeCount={activeCount} onPress={() => router.push('/(tabs)/upgrade')} />
            ) : null}
          </>
        }
        renderItem={({ item, index }) => (
          <ChronicleCard
            session={item}
            index={index}
            onContinue={() => router.push(`/reader/${item.id}` as any)}
            onAbandon={() => confirmAbandon(item.id)}
            abandoning={abandonMutation.isPending}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            filter={filter}
            onExplore={() => router.push('/(tabs)/library')}
          />
        }
        ListFooterComponent={
          filter === 'ACTIVE' && isFreeUser && slots > 0 ? (
            <EmptySlot slots={slots} onExplore={() => router.push('/(tabs)/library')} />
          ) : (
            <View style={styles.footerSpacer} />
          )
        }
      />
    </View>
  );
}

function ChronicleCard({
  session,
  index,
  onContinue,
  onAbandon,
  abandoning,
}: {
  session: ReadingSessionSummary;
  index: number;
  onContinue: () => void;
  onAbandon: () => void;
  abandoning: boolean;
}) {
  const progress = Math.min(90, Math.max(12, ((session.currentSceneIndex + 1) / 10) * 100));
  const palette = cardPalette(index);
  const coverUrl = resolveApiAssetUrl(session.storyCoverUrl || session.selectedPremiseCoverUrl || session.selectedCharacterImageUrl);
  const coverSource = coverUrl ? { uri: coverUrl } : null;

  return (
    <View style={styles.card}>
      <View style={[styles.cover, { backgroundColor: palette[0] }]}>
        {coverSource ? (
          <ImageBackground
            source={coverSource}
            resizeMode="cover"
            style={styles.coverImage}
            imageStyle={styles.coverImageRadius}
          >
            <View style={styles.coverScrim} />
          </ImageBackground>
        ) : (
          <View style={styles.coverFallback}>
            <View style={[styles.fallbackGlow, { backgroundColor: palette[2] }]} />
            <View style={[styles.fallbackBand, { backgroundColor: palette[1] }]} />
            <Sparkles color={palette[1]} size={32} opacity={0.6} />
            <Text style={[styles.fallbackLabel, { color: palette[1] }]}>
              {(session.storyTitle || 'H')[0]}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardGenre}>Crônica interativa</Text>
        <Text style={styles.cardTitle}>{session.storyTitle || 'História sem título'}</Text>
        <Text style={styles.cardMeta}>Capítulo {session.currentChapter} • Cena {session.currentSceneIndex + 1}</Text>
        <Text style={styles.cardSub} numberOfLines={2}>
          {[session.selectedPremiseTitle, session.selectedCharacterName].filter(Boolean).join(' • ') || 'História em andamento'}
        </Text>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.lastRead}>{formatLastRead(session.lastSceneAt)}</Text>
          <Text style={styles.progressText}>{Math.round(progress)}%</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryButton} onPress={onContinue}>
            <Play color={colors.background} fill={colors.background} size={14} />
            <Text style={styles.primaryButtonText}>Continuar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={onAbandon} disabled={abandoning}>
            <Text style={styles.secondaryButtonText}>Abandonar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function EmptySlot({ slots, onExplore }: { slots: number; onExplore: () => void }) {
  return (
    <View style={styles.emptySlot}>
      <PlusCircle color={colors.textMuted} size={34} />
      <Text style={styles.emptySlotTitle}>{slots} {slots === 1 ? 'espaço disponível' : 'espaços disponíveis'}</Text>
      <Text style={styles.emptySlotText}>Inicie uma nova narrativa da biblioteca.</Text>
      <TouchableOpacity onPress={onExplore}>
        <Text style={styles.inlineAction}>Explorar Biblioteca</Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptyState({ filter, onExplore }: { filter: Filter; onExplore: () => void }) {
  const isActive = filter === 'ACTIVE';
  return (
    <View style={styles.emptyState}>
      <BookOpen color={colors.primary} size={34} />
      <Text style={styles.emptyTitle}>
        {isActive ? 'Nenhuma crônica em andamento' : 'Nenhuma história nesta seção'}
      </Text>
      <Text style={styles.emptyText}>
        {isActive
          ? 'Escolha uma história na biblioteca para iniciar sua próxima leitura.'
          : 'Quando houver histórias com este status, elas aparecerão aqui.'}
      </Text>
      {isActive ? (
        <TouchableOpacity style={styles.exploreButton} onPress={onExplore}>
          <Text style={styles.exploreButtonText}>EXPLORAR BIBLIOTECA</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function UpgradeNotice({ activeCount, onPress }: { activeCount: number; onPress: () => void }) {
  return (
    <View style={styles.notice}>
      <Info color={colors.primary} size={20} />
      <View style={styles.noticeCopy}>
        <Text style={styles.noticeTitle}>Próximo do limite de crônicas ativas</Text>
        <Text style={styles.noticeText}>
          Você está com {activeCount} de 3 slots ocupados. Premium libera histórias ativas ilimitadas.
        </Text>
        <TouchableOpacity onPress={onPress}>
          <Text style={styles.noticeAction}>VER PLANOS</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function formatLastRead(value?: string) {
  if (!value) return 'Sem leitura recente';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem leitura recente';
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays <= 0) return 'Lido hoje';
  if (diffDays === 1) return 'Lido ontem';
  return `Lido há ${diffDays} dias`;
}

function cardPalette(index: number) {
  const palettes = [
    ['#15111C', '#CEBDFF', '#4A1F6B'],
    ['#10151D', '#93D7FF', '#314B86'],
    ['#17121A', '#F2B7D6', '#6A3150'],
  ];
  return palettes[index % palettes.length];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    ...typography.h3,
    color: '#e5e2e1',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorText: {
    ...typography.bodySmall,
    color: SOFT_TEXT,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: ACCENT,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 18,
  },
  retryButtonText: {
    ...typography.label,
    color: '#2F1561',
    fontSize: 10,
  },
  loadingText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: 14,
  },
  content: {
    paddingBottom: 120,
  },
  topBar: {
    height: 64,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(206, 189, 255, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(10, 10, 12, 0.96)',
  },
  brand: {
    ...typography.h3,
    color: ACCENT,
    fontStyle: 'italic',
  },
  heroSection: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 22,
  },
  eyebrow: {
    ...typography.label,
    color: SOFT_TEXT,
    marginBottom: 10,
  },
  title: {
    ...typography.h1,
    color: '#e5e2e1',
    fontSize: 42,
    lineHeight: 48,
    marginBottom: 22,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.14)',
    backgroundColor: PANEL,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  memberText: {
    ...typography.label,
    color: '#e5e2e1',
    fontSize: 10,
  },
  slotText: {
    ...typography.label,
    color: ACCENT,
    fontSize: 10,
    textAlign: 'right',
    flexShrink: 1,
  },
  slotTextCritical: {
    color: colors.error,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(206, 189, 255, 0.1)',
    marginBottom: 24,
  },
  filterButton: {
    marginRight: 22,
    paddingBottom: 14,
  },
  filterText: {
    ...typography.body,
    color: SOFT_TEXT,
    fontWeight: '800',
  },
  filterTextActive: {
    color: ACCENT,
  },
  filterIndicator: {
    height: 3,
    backgroundColor: ACCENT,
    marginTop: 10,
  },
  notice: {
    marginHorizontal: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.10)',
    backgroundColor: 'rgba(27, 24, 36, 0.96)',
    borderRadius: 26,
    padding: 18,
    flexDirection: 'row',
    gap: 12,
  },
  noticeCopy: {
    flex: 1,
  },
  noticeTitle: {
    ...typography.bodySmall,
    color: '#e5e2e1',
    fontWeight: '800',
    marginBottom: 4,
  },
  noticeText: {
    ...typography.bodySmall,
    color: SOFT_TEXT,
  },
  noticeAction: {
    ...typography.label,
    color: ACCENT,
    fontSize: 10,
    marginTop: 10,
  },
  card: {
    marginHorizontal: 24,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.08)',
    borderRadius: 28,
    backgroundColor: PANEL_ALT,
    overflow: 'hidden',
  },
  cover: {
    height: 224,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  coverImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  coverImageRadius: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  coverScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  coverGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    right: -30,
    bottom: -30,
    opacity: 0.38,
  },
  coverBand: {
    position: 'absolute',
    width: 92,
    height: '130%',
    left: 34,
    top: -20,
    opacity: 0.2,
    transform: [{ rotate: '8deg' }],
  },
  coverMark: {
    ...typography.h1,
    color: colors.primary,
    fontSize: 96,
    opacity: 0.35,
    marginLeft: 28,
    marginBottom: 16,
  },
  coverFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fallbackGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    opacity: 0.32,
  },
  fallbackBand: {
    position: 'absolute',
    width: 200,
    height: 6,
    opacity: 0.18,
    transform: [{ rotate: '12deg' }],
  },
  fallbackLabel: {
    fontFamily: 'NotoSerif',
    fontSize: 48,
    opacity: 0.55,
    marginTop: 8,
  },
  cardBody: {
    padding: 22,
  },
  cardGenre: {
    ...typography.label,
    color: ACCENT,
    fontSize: 10,
    marginBottom: 8,
  },
  cardTitle: {
    ...typography.h2,
    color: '#e5e2e1',
    marginBottom: 8,
  },
  cardMeta: {
    ...typography.label,
    color: SOFT_TEXT,
    fontSize: 10,
    marginBottom: 8,
  },
  cardSub: {
    ...typography.bodySmall,
    color: SOFT_TEXT,
    marginBottom: 16,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: 10,
    overflow: 'hidden',
    borderRadius: 999,
  },
  progressFill: {
    height: '100%',
    backgroundColor: ACCENT,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  lastRead: {
    ...typography.label,
    color: SOFT_TEXT,
    fontSize: 9,
  },
  progressText: {
    ...typography.label,
    color: ACCENT,
    fontSize: 9,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: ACCENT,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderRadius: 18,
  },
  primaryButtonText: {
    ...typography.label,
    color: '#2F1561',
    fontSize: 10,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.08)',
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  secondaryButtonText: {
    ...typography.label,
    color: SOFT_TEXT,
    fontSize: 10,
  },
  emptySlot: {
    marginHorizontal: 24,
    marginBottom: 24,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(206, 189, 255, 0.12)',
    borderRadius: 30,
    padding: 38,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.015)',
  },
  emptySlotTitle: {
    ...typography.h3,
    color: '#e5e2e1',
    marginTop: 14,
    marginBottom: 6,
  },
  emptySlotText: {
    ...typography.bodySmall,
    color: SOFT_TEXT,
    textAlign: 'center',
    marginBottom: 16,
  },
  inlineAction: {
    ...typography.label,
    color: ACCENT,
    fontSize: 10,
    borderBottomWidth: 1,
    borderBottomColor: ACCENT,
  },
  emptyState: {
    marginHorizontal: 24,
    padding: 34,
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.10)',
    backgroundColor: PANEL_ALT,
    alignItems: 'center',
    borderRadius: 30,
  },
  emptyTitle: {
    ...typography.h3,
    color: '#e5e2e1',
    marginTop: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    ...typography.bodySmall,
    color: SOFT_TEXT,
    textAlign: 'center',
    marginBottom: 18,
  },
  exploreButton: {
    backgroundColor: ACCENT,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 18,
  },
  exploreButtonText: {
    ...typography.label,
    color: '#2F1561',
    fontSize: 10,
  },
  footerSpacer: {
    height: 28,
  },
});
