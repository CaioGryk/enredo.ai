import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, X } from 'lucide-react-native';
import { api } from '../../../src/api/client';
import { StartReadingResponse, StoryPlayableCharacter, StoryPremise } from '../../../src/api/types';
import { StateBlock } from '../../../src/components/state-block';
import { colors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { handleReadingError } from '../../../src/utils/reading-error-helper';

const ACCENT = '#CEBDFF';
const PANEL_ALT = '#1B1824';
const SOFT_TEXT = '#B7AFC8';

export default function StoryCharacterScreen() {
  const { id, premiseId } = useLocalSearchParams<{ id: string; premiseId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedCharacterId, setSelectedCharacterId] = React.useState<string | null>(null);

  const { data: premise } = useQuery<StoryPremise | null>({
    queryKey: ['story-premise-single', premiseId],
    queryFn: async () => {
      if (!premiseId || !id) return null;
      const { data } = await api.get(`/story-setup/stories/${id}/premises`);
      return (data as StoryPremise[]).find((item) => item.id === premiseId) || null;
    },
    enabled: Boolean(id && premiseId),
  });

  const { data: characters = [], isLoading } = useQuery<StoryPlayableCharacter[]>({
    queryKey: ['premise-characters', premiseId],
    queryFn: async () => {
      try {
        const { data } = await api.get(`/story-setup/premises/${premiseId}/characters`);
        return data;
      } catch (error: any) {
        if (error.response?.status === 404) return [];
        throw error;
      }
    },
    enabled: Boolean(premiseId),
  });

  const generateCharactersMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/story-setup/premises/${premiseId}/characters/generate`, { force: false });
      return data as StoryPlayableCharacter[];
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['premise-characters', premiseId], data);
    },
    onError: () => Alert.alert('Erro', 'Não foi possível preparar personagens jogáveis.'),
  });

  const startSessionMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<StartReadingResponse>('/reading/start', {
        storyId: id,
        premiseId,
        characterId: selectedCharacterId,
      });
      return data;
    },
    onSuccess: (data) => {
      if (data.session?.id) {
        router.push(`/reader/${data.session.id}`);
      } else {
        Alert.alert('Erro', 'Id de sessão inválido.');
      }
    },
    onError: (e: any) => {
      handleReadingError(e);
    },
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StateBlock
          fullScreen
          loading
          title="Preparando personagens"
          description="Estamos carregando os personagens jogáveis que podem conduzir esta versão da história."
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push(`/story/${id}/premise`)}
          style={styles.sideButton}
        >
          <ArrowLeft color={ACCENT} size={20} />
        </TouchableOpacity>
        <Text style={styles.brand}>Enredo.ai</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.sideButton}>
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
                    {character.imageUrl ? (
                      <Image source={{ uri: character.imageUrl }} style={styles.image} />
                    ) : (
                      <View style={styles.imageFallback}>
                        <Text style={styles.imageInitial}>{character.name.slice(0, 1)}</Text>
                      </View>
                    )}
                    {selected ? (
                      <View style={styles.selectedBadge}>
                        <CheckCircle2 color={colors.background} fill={ACCENT} size={14} />
                        <Text style={styles.selectedBadgeText}>Selecionado</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.cardBody}>
                    <Text style={styles.role}>{character.roleLabel}</Text>
                    <Text style={styles.name}>{character.name}</Text>
                    <Text style={styles.description}>
                      {character.initialGoal || character.description || 'Um papel central nesta premissa.'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <StateBlock
            title="Esta premissa ainda não tem os 3 personagens jogáveis"
            description="Cada personagem precisa ter função narrativa, objetivo e presença própria nesta versão da história."
            loading={generateCharactersMutation.isPending}
            actionLabel={generateCharactersMutation.isPending ? undefined : 'Gerar 3 personagens'}
            onAction={generateCharactersMutation.isPending ? undefined : () => generateCharactersMutation.mutate()}
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
  title: { ...typography.h1, color: '#F5F1FF', fontSize: 38, lineHeight: 44, marginBottom: 12 },
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
  premisePillTitle: { ...typography.body, color: '#F5F1FF', fontWeight: '700' },
  cards: { gap: 18 },
  card: {
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: PANEL_ALT,
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.08)',
  },
  selectedCard: {
    borderColor: 'rgba(206, 189, 255, 0.24)',
  },
  imageWrap: { height: 340, backgroundColor: '#111018' },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  imageFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  imageInitial: { ...typography.h1, color: ACCENT, fontSize: 92, lineHeight: 98 },
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
  name: { ...typography.h2, color: '#F5F1FF', marginBottom: 8 },
  description: { ...typography.bodySmall, color: SOFT_TEXT, lineHeight: 22 },
  emptyCard: {
    borderRadius: 26,
    padding: 22,
    backgroundColor: PANEL_ALT,
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.08)',
  },
  emptyTitle: { ...typography.h3, color: '#F5F1FF', marginBottom: 8 },
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
