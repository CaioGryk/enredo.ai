import React from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Sparkles } from 'lucide-react-native';
import { api } from '../../../src/api/client';
import { Story, StoryPremise } from '../../../src/api/types';
import { StateBlock } from '../../../src/components/state-block';
import { colors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';

const ACCENT = '#CEBDFF';
const PANEL_ALT = '#1B1824';
const SOFT_TEXT = '#B7AFC8';

export default function StoryPremiseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: story, isLoading: storyLoading } = useQuery<Story>({
    queryKey: ['story', id],
    queryFn: async () => {
      const { data } = await api.get(`/library/stories/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });

  const { data: premises = [], isLoading: premisesLoading } = useQuery<StoryPremise[]>({
    queryKey: ['story-premises', id],
    queryFn: async () => {
      try {
        const { data } = await api.get(`/story-setup/stories/${id}/premises`);
        return data;
      } catch (error: any) {
        if (error.response?.status === 404) return [];
        throw error;
      }
    },
    enabled: Boolean(id),
  });

  const generatePremisesMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/story-setup/stories/${id}/premises/generate`, { force: false });
      return data as StoryPremise[];
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['story-premises', id], data);
    },
    onError: () => Alert.alert('Erro', 'Não foi possível preparar as premissas da história.'),
  });

  if (storyLoading || premisesLoading) {
    return (
      <View style={styles.container}>
        <StateBlock
          fullScreen
          loading
          title="Preparando premissas"
          description="Estamos buscando os pontos de partida dessa historia antes da escolha de personagem."
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color={ACCENT} size={20} />
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.brand}>Enredo.ai</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>O começo de tudo</Text>
        <Text style={styles.title}>Escolha sua premissa</Text>
        <Text style={styles.subtitle}>
          Toda grande jornada começa com uma escolha. Selecione o ponto de partida que mais instiga sua curiosidade para moldar o destino desta narrativa.
        </Text>

        {premises.length ? (
          <View style={styles.cards}>
            {premises.map((premise) => (
              <TouchableOpacity
                key={premise.id}
                activeOpacity={0.92}
                style={styles.card}
                onPress={() => router.push(`/story/${id}/character?premiseId=${premise.id}`)}
              >
                {premise.coverUrl ? (
                  <ImageBackground source={{ uri: premise.coverUrl }} style={styles.cardImage} imageStyle={styles.cardImageRadius} />
                ) : (
                  <View style={styles.cardImageFallback}>
                    <Sparkles color={ACCENT} size={20} />
                  </View>
                )}
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{premise.title}</Text>
                  <Text style={styles.cardText}>{premise.synopsis}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <StateBlock
            title="Esta história ainda não tem as 3 premissas jogáveis"
            description="Prepare os pontos de partida antes de seguir para a escolha de personagem."
            loading={generatePremisesMutation.isPending}
            actionLabel={generatePremisesMutation.isPending ? undefined : 'Gerar 3 premissas'}
            onAction={generatePremisesMutation.isPending ? undefined : () => generatePremisesMutation.mutate()}
          />
        )}

        {story ? (
          <Text style={styles.footerHint}>
            História base: <Text style={styles.footerHintStrong}>{story.title}</Text>
          </Text>
        ) : null}
      </ScrollView>
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
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backText: { ...typography.label, color: ACCENT, fontSize: 10 },
  brand: { ...typography.h3, color: ACCENT, fontStyle: 'italic' },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 },
  eyebrow: { ...typography.label, color: ACCENT, marginBottom: 12 },
  title: { ...typography.h1, color: '#F5F1FF', fontSize: 40, lineHeight: 46, marginBottom: 12 },
  subtitle: { ...typography.body, color: SOFT_TEXT, marginBottom: 28 },
  cards: { gap: 18 },
  card: {
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.08)',
    backgroundColor: PANEL_ALT,
  },
  cardImage: { height: 280 },
  cardImageRadius: { borderTopLeftRadius: 26, borderTopRightRadius: 26 },
  cardImageFallback: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#15131B',
  },
  cardBody: { padding: 18 },
  cardTitle: { ...typography.h3, color: '#F5F1FF', marginBottom: 10 },
  cardText: { ...typography.bodySmall, color: SOFT_TEXT, lineHeight: 22 },
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
  footerHint: { ...typography.bodySmall, color: SOFT_TEXT, marginTop: 24, textAlign: 'center' },
  footerHintStrong: { color: '#F5F1FF' },
});
