import React from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Bell, CheckCircle2, Compass, Hand, Lamp, Moon, Shield, Sparkles, Swords, UserRound, VenetianMask, X } from 'lucide-react-native';
import { api, resolveApiAssetUrl } from '../../../src/api/client';
import { queryKeys } from '../../../src/api/queryKeys';
import { StartReadingResponse, StoryPlayableCharacter, StoryPremise } from '../../../src/api/types';
import { CachedImage } from '../../../src/components/cached-image';
import { StateBlock } from '../../../src/components/state-block';
import { colors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { goBackSafe } from '../../../src/utils/navigation-helper';
import { handleReadingError } from '../../../src/utils/reading-error-helper';

const ACCENT = '#CEBDFF';
const PANEL_ALT = '#1c1b1b';
const SOFT_TEXT = '#B7AFC8';

export default function StoryCharacterScreen() {
  const { id, premiseId } = useLocalSearchParams<{ id: string; premiseId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedCharacterId, setSelectedCharacterId] = React.useState<string | null>(null);
  const selectedPremiseId = Array.isArray(premiseId) ? premiseId[0] : premiseId;

  const {
    data: premises = [],
    isLoading: premiseLoading,
    isError: premiseError,
    refetch: refetchPremise,
  } = useQuery<StoryPremise[]>({
    queryKey: queryKeys.storyPremises(id),
    queryFn: async () => {
      if (!id) return [];
      const { data } = await api.get(`/story-setup/stories/${id}/premises`);
      return Array.isArray(data) ? data : (data?.premises ?? data?.data ?? []);
    },
    enabled: Boolean(id),
  });
  const premise = premises.find((item) => item.id === selectedPremiseId) || null;

  const {
    data: characters = [],
    isLoading,
    isError: charactersError,
    refetch: refetchCharacters,
  } = useQuery<StoryPlayableCharacter[]>({
    queryKey: queryKeys.premiseCharacters(selectedPremiseId),
    queryFn: async () => {
      try {
        const { data } = await api.get(`/story-setup/premises/${selectedPremiseId}/characters`);
        return data;
      } catch (error: any) {
        if (error.response?.status === 404) return [];
        throw error;
      }
    },
    enabled: Boolean(selectedPremiseId),
  });

  const hasPendingPortraits = React.useMemo(
    () => characters.some(
      (character) => !character.imageUrl && character.imageGenerationStatus === 'PENDING' && !character.imageError,
    ),
    [characters],
  );

  React.useEffect(() => {
    if (!hasPendingPortraits) return undefined;

    const intervalId = setInterval(() => {
      refetchCharacters();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [hasPendingPortraits, refetchCharacters]);

  const startSessionMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<StartReadingResponse>('/reading/start', {
        storyId: id,
        premiseId: selectedPremiseId,
        characterId: selectedCharacterId,
        deferFirstScene: true,
      }, {
        timeout: 30_000,
      });
      return data;
    },
    onSuccess: (data) => {
      if (data.session?.id) {
        queryClient.invalidateQueries({ queryKey: ['sessions'] });
        router.push({
          pathname: '/reader/[id]',
          params: { id: data.session.id, preparing: '1' },
        } as any);
      } else {
        Alert.alert('Erro', 'Sessão de leitura não foi criada. Tente novamente.');
      }
    },
    onError: (e: any) => {
      const errorCode = e?.response?.data?.error;
      const status = e?.response?.status;
      if (status === 401) {
        Alert.alert('Sessão expirada', 'Sua sessão expirou. Faça login novamente para continuar.', [
          { text: 'Fazer login', onPress: () => router.replace('/(auth)/login') },
        ]);
        return;
      }
      handleReadingError(e);
    },
  });

  if (!selectedPremiseId) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => goBackSafe(`/story/${id}/premise`)} style={styles.sideButton}>
            <ArrowLeft color={ACCENT} size={20} />
          </TouchableOpacity>
        </View>
        <StateBlock
          fullScreen
          title="Escolha uma premissa primeiro"
          description="Antes de selecionar um personagem, volte e escolha o ponto de partida desta história."
          actionLabel="Voltar para premissas"
          onAction={() => goBackSafe(`/story/${id}/premise`)}
        />
      </View>
    );
  }

  if (premiseLoading || isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => goBackSafe(`/story/${id}/premise`)} style={styles.sideButton}>
            <ArrowLeft color={ACCENT} size={20} />
          </TouchableOpacity>
        </View>
        <StateBlock
          fullScreen
          loading
          title="Preparando personagens"
          description="Estamos carregando os personagens jogáveis que podem conduzir esta versão da história."
        />
      </View>
    );
  }

  if (premiseError || charactersError) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => goBackSafe(`/story/${id}/premise`)} style={styles.sideButton}>
            <ArrowLeft color={ACCENT} size={20} />
          </TouchableOpacity>
        </View>
        <StateBlock
          fullScreen
          title="Não foi possível carregar personagens"
          description="Verifique sua conexão e tente novamente antes de gerar ou escolher personagens jogáveis."
          actionLabel="Tentar novamente"
          onAction={() => {
            refetchPremise();
            refetchCharacters();
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => goBackSafe(`/story/${id}/premise`)}
          style={styles.sideButton}
        >
          <ArrowLeft color={ACCENT} size={20} />
        </TouchableOpacity>
        <Text style={styles.brand}>Enredo.ai</Text>
        <TouchableOpacity onPress={() => goBackSafe(`/story/${id}/premise`)} style={styles.sideButton}>
          <X color={SOFT_TEXT} size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Quem você será?</Text>
        <Text style={styles.subtitle}>
          Cada escolha define um novo ponto de vista para a jornada. Escolha o personagem jogável que vai conduzir suas próximas ações.
        </Text>

        {premise ? (
          <View style={styles.premisePill}>
            <Text style={styles.premisePillLabel}>Premissa selecionada</Text>
            <Text style={styles.premisePillTitle}>{premise.title}</Text>
          </View>
        ) : null}

        {characters.length ? (
          <View style={styles.cards}>
            {characters.map((character) => {
              const selected = selectedCharacterId === character.id;
              return (
                <TouchableOpacity
                  key={character.id}
                  activeOpacity={0.92}
                  style={[styles.card, selected && styles.selectedCard]}
                  onPress={() => setSelectedCharacterId(character.id)}
                >
                  <View style={styles.imageWrap}>
                    {resolveApiAssetUrl(character.imageUrl) ? (
                      <>
                        <CachedImage uri={resolveApiAssetUrl(character.imageUrl)!} style={[styles.image, !selected && styles.unselectedImage]} />
                        {!selected ? (
                          <View pointerEvents="none" style={styles.unselectedImageOverlay} />
                        ) : null}
                      </>
                    ) : (character.imageGenerationStatus === 'PENDING' && !character.imageError) ? (
                      <View style={styles.imagePending}>
                        <ActivityIndicator color={ACCENT} size="small" />
                        <Text style={styles.imagePendingText}>Preparando retrato...</Text>
                      </View>
                    ) : (character.imageGenerationStatus === 'FAILED' || character.imageError) ? (
                      <CharacterFallbackArt character={character} selected={selected} statusLabel="Retrato indisponível" />
                    ) : (
                      <CharacterFallbackArt character={character} selected={selected} />
                    )}
                    {selected ? (
                      <View style={styles.selectedBadge}>
                        <CheckCircle2 color={colors.background} fill={ACCENT} size={14} />
                        <Text style={styles.selectedBadgeText}>Selecionado</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.cardBody}>
                    <Text style={styles.role}>{character.roleLabel || 'Personagem'}</Text>
                    <Text style={styles.name} numberOfLines={1}>{character.name}</Text>
                    <Text style={styles.description}>
                      {character.startingSituation || character.initialGoal || character.description || 'Um papel central nesta premissa.'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <StateBlock
            title="Personagens em preparação"
            description="Os personagens jogáveis para esta premissa ainda estão sendo gerados pela equipe editorial. Escolha outra premissa ou volte mais tarde."
            actionLabel="Voltar para premissas"
            onAction={() => goBackSafe(`/story/${id}/premise`)}
          />
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.startButton, !selectedCharacterId && styles.startButtonDisabled]}
          onPress={() => startSessionMutation.mutate()}
          disabled={!selectedCharacterId || startSessionMutation.isPending}
        >
          {startSessionMutation.isPending ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={styles.startButtonText}>{selectedCharacterId ? 'INICIAR HISTÓRIA' : 'ESCOLHA UM PERSONAGEM'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function CharacterFallbackArt({
  character,
  selected,
  statusLabel,
}: {
  character: StoryPlayableCharacter;
  selected: boolean;
  statusLabel?: string;
}) {
  const palette = normalizePalette(character.imageFallback?.palette);
  const Icon = getCharacterIcon(character.imageFallback?.symbol, character.narrativeFunction);

  return (
    <View style={[styles.characterFallbackBase, { backgroundColor: palette[0] }, !selected && styles.unselectedFallback]}>
      <View style={[styles.characterGlowBack, { backgroundColor: palette[2] }]} />
      <View style={[styles.characterGlowFront, { backgroundColor: palette[1] }]} />
      <View style={[styles.characterSilhouette, { borderColor: palette[1] + '55' }]}>
        <Icon color={palette[1]} size={54} strokeWidth={1.55} />
      </View>
      <Text style={[styles.characterFallbackInitial, { color: palette[1] }]}>
        {character.name.slice(0, 1).toUpperCase()}
      </Text>
      <Text style={styles.characterFallbackName} numberOfLines={1}>
        {character.name}
      </Text>
      <Text style={styles.characterFallbackRole} numberOfLines={1}>
        {statusLabel || character.imageFallback?.subtitle || character.roleLabel}
      </Text>
      {!selected ? <View pointerEvents="none" style={styles.unselectedImageOverlay} /> : null}
    </View>
  );
}

function normalizePalette(palette?: string[]): string[] {
  return [
    palette?.[0] || '#111018',
    palette?.[1] || ACCENT,
    palette?.[2] || '#342459',
  ];
}

function getCharacterIcon(symbol?: string, narrativeFunction?: string): React.ComponentType<any> {
  switch (symbol || narrativeFunction) {
    case 'compass':
    case 'HERO': return Compass;
    case 'lamp':
    case 'MENTOR': return Lamp;
    case 'hand':
    case 'ALLY': return Hand;
    case 'scale':
    case 'SKEPTIC': return Shield;
    case 'crossed-lines':
    case 'RIVAL': return Swords;
    case 'mask':
    case 'VILLAIN': return VenetianMask;
    case 'cards':
    case 'TRICKSTER': return Sparkles;
    case 'moon':
    case 'SHADOW': return Moon;
    case 'bell':
    case 'HARBINGER': return Bell;
    case 'shield':
    case 'GUARDIAN': return Shield;
    default: return UserRound;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  header: {
    height: 64,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(206, 189, 255, 0.12)',
    backgroundColor: 'rgba(10, 10, 12, 0.96)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sideButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  brand: { ...typography.h3, color: ACCENT, fontStyle: 'italic' },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 },
  title: { ...typography.h1, color: '#e5e2e1', fontSize: 38, lineHeight: 44, marginBottom: 12 },
  subtitle: { ...typography.body, color: SOFT_TEXT, marginBottom: 20 },
  premisePill: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: PANEL_ALT,
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.08)',
    marginBottom: 22,
  },
  premisePillLabel: { ...typography.label, color: ACCENT, fontSize: 10, marginBottom: 6 },
  premisePillTitle: { ...typography.body, color: '#e5e2e1', fontWeight: '700' },
  cards: { gap: 18 },
  card: {
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: PANEL_ALT,
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.08)',
  },
  selectedCard: { borderColor: 'rgba(206, 189, 255, 0.42)' },
  imageWrap: { height: 340, backgroundColor: '#111018', position: 'relative', overflow: 'hidden' },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  unselectedImage: { opacity: 0.28 },
  unselectedImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 10, 12, 0.72)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(206, 189, 255, 0.08)',
    zIndex: 1,
  },
  characterFallbackBase: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  unselectedFallback: { opacity: 0.62 },
  characterGlowBack: {
    position: 'absolute',
    right: -64,
    top: -50,
    width: 210,
    height: 210,
    borderRadius: 999,
    opacity: 0.34,
  },
  characterGlowFront: {
    position: 'absolute',
    left: -48,
    bottom: -52,
    width: 170,
    height: 170,
    borderRadius: 999,
    opacity: 0.18,
  },
  characterSilhouette: {
    width: 126,
    height: 126,
    borderRadius: 63,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.055)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  characterFallbackInitial: {
    position: 'absolute',
    right: 20,
    bottom: 16,
    ...typography.h1,
    fontSize: 104,
    lineHeight: 108,
    opacity: 0.1,
  },
  characterFallbackName: { ...typography.h2, color: '#e5e2e1', fontSize: 26, lineHeight: 31, maxWidth: 260 },
  characterFallbackRole: { ...typography.label, color: SOFT_TEXT, fontSize: 10, marginTop: 8, maxWidth: 260 },
  imagePending: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  imagePendingText: { ...typography.bodySmall, color: SOFT_TEXT, fontSize: 12 },
  selectedBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(206, 189, 255, 0.96)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectedBadgeText: { ...typography.label, color: '#2F1561', fontSize: 9 },
  cardBody: { padding: 18 },
  role: { ...typography.label, color: ACCENT, fontSize: 10, marginBottom: 8 },
  name: { ...typography.h2, color: '#e5e2e1', marginBottom: 8 },
  description: { ...typography.bodySmall, color: SOFT_TEXT, lineHeight: 22 },
  emptyCard: {
    borderRadius: 26,
    padding: 22,
    backgroundColor: PANEL_ALT,
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.08)',
  },
  emptyTitle: { ...typography.h3, color: '#e5e2e1', marginBottom: 8 },
  emptyText: { ...typography.bodySmall, color: SOFT_TEXT, marginBottom: 18 },
  primaryButton: {
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT,
  },
  primaryButtonText: { ...typography.label, color: '#2F1561' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 18,
    paddingBottom: 28,
    backgroundColor: 'rgba(10, 10, 12, 0.98)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(206, 189, 255, 0.12)',
  },
  startButton: {
    height: 56,
    borderRadius: 20,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonDisabled: { opacity: 0.45 },
  startButtonText: { ...typography.label, color: '#2F1561' },
});
