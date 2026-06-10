import React, { useMemo } from 'react';
import {
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Play, Sparkles } from 'lucide-react-native';
import { api } from '../../src/api/client';
import { Character, Story, StoryCharactersResponse, StoryPremise } from '../../src/api/types';
import { StateBlock } from '../../src/components/state-block';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { goBackSafe } from '../../src/utils/navigation-helper';

const ACCENT = '#CEBDFF';
const SOFT_TEXT = '#B7AFC8';
const DOURADO = '#ffb95f';

export default function StoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const {
    data: story,
    isLoading: storyLoading,
    isError: storyError,
    refetch: refetchStory,
  } = useQuery<Story>({
    queryKey: ['story', id],
    queryFn: async () => {
      const { data } = await api.get(`/library/stories/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });

  const {
    data: charactersResponse,
    isLoading: charsLoading,
    isError: charactersError,
    refetch: refetchCharacters,
  } = useQuery<StoryCharactersResponse>({
    queryKey: ['story-characters', id],
    queryFn: async () => {
      const { data } = await api.get(`/library/stories/${id}/characters`);
      return data;
    },
    enabled: Boolean(id),
  });

  const {
    data: premises = [],
    isLoading: premisesLoading,
    isError: premisesError,
    refetch: refetchPremises,
  } = useQuery<StoryPremise[]>({
    queryKey: ['story-premises-preview', id],
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

  const heroImage = useMemo(() => story?.coverUrl || story?.coverImageUrl, [story]);
  const baseCharacters = charactersResponse?.characters ?? [];

  if (storyLoading || charsLoading || premisesLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.backBar}>
          <TouchableOpacity onPress={() => goBackSafe('/(tabs)/library')} style={styles.backButton}>
            <ArrowLeft color={ACCENT} size={22} />
          </TouchableOpacity>
        </View>
        <StateBlock
          fullScreen
          loading
          title="Preparando a história"
          description="Estamos carregando sinopse, elenco e estrutura base antes do seu ponto de partida."
        />
      </View>
    );
  }

  if (storyError || charactersError || premisesError) {
    return (
      <View style={styles.container}>
        <View style={styles.backBar}>
          <TouchableOpacity onPress={() => goBackSafe('/(tabs)/library')} style={styles.backButton}>
            <ArrowLeft color={ACCENT} size={22} />
          </TouchableOpacity>
        </View>
        <StateBlock
          fullScreen
          title="Não foi possível carregar esta história"
          description="Verifique sua conexão e tente novamente para continuar a jornada."
          actionLabel="Tentar novamente"
          onAction={() => {
            refetchStory();
            refetchCharacters();
            refetchPremises();
          }}
        />
      </View>
    );
  }

  if (!story) {
    return (
      <View style={styles.container}>
        <View style={styles.backBar}>
          <TouchableOpacity onPress={() => goBackSafe('/(tabs)/library')} style={styles.backButton}>
            <ArrowLeft color={ACCENT} size={22} />
          </TouchableOpacity>
        </View>
        <StateBlock
          fullScreen
          title="História não encontrada"
          description="Essa história pode ter sido removida ou ainda não está disponível na biblioteca."
          actionLabel="Voltar para biblioteca"
          onAction={() => goBackSafe('/(tabs)/library')}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => goBackSafe('/(tabs)/library')} style={styles.iconButton}>
          <ArrowLeft color={ACCENT} size={24} />
        </TouchableOpacity>
        <Text style={styles.brand}>Enredo.ai</Text>
        <View style={styles.iconButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero Cover */}
        <View style={styles.hero}>
          {heroImage ? (
            <ImageBackground source={{ uri: heroImage }} style={styles.heroImage} imageStyle={styles.heroImageRadius}>
              <View style={styles.heroGradient}>
                <View style={styles.heroBadge}>
                  <Sparkles color={ACCENT} size={13} fill={ACCENT} />
                  <Text style={styles.heroBadgeText}>Enredo.ai Original</Text>
                </View>
              </View>
            </ImageBackground>
          ) : (
            <View style={styles.heroFallback}>
              <View style={styles.heroFallbackGlow} />
              <View style={[styles.heroBadge, styles.heroBadgeFallback]}>
                <Sparkles color={ACCENT} size={13} fill={ACCENT} />
                <Text style={styles.heroBadgeText}>Enredo.ai Original</Text>
              </View>
              <Text style={styles.heroFallbackTitle}>{story.title}</Text>
              <Text style={styles.heroFallbackGenre}>{(story.genres?.[0] || 'NARRATIVA').toUpperCase()}</Text>
            </View>
          )}
        </View>

        {/* Title + Badges section */}
        <View style={styles.detailsSection}>
          <Text style={styles.titleText}>{story.title}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.genrePill}>
              <Text style={styles.genrePillText}>{(story.genres?.[0] || 'NARRATIVA').toUpperCase()}</Text>
            </View>
            <View style={[styles.tagPill, story.isPremium ? styles.tagPillPremium : styles.tagPillFree]}>
              <Text style={[styles.tagPillText, story.isPremium && styles.tagPillTextPremium]}>
                {story.isPremium ? 'PREMIUM' : 'GRÁTIS'}
              </Text>
            </View>
            <View style={styles.tagPill}>
              <Text style={styles.tagPillText}>{story.maturityRating || '12+'}</Text>
            </View>
            <View style={[styles.tagPill, styles.tagPillAccent]}>
              <Text style={[styles.tagPillText, styles.tagPillTextAccent]}>HISTÓRIA INTERATIVA</Text>
            </View>
          </View>

          {/* Synopsis */}
          <Text style={styles.synopsis}>{story.synopsis}</Text>

          {/* Info grid */}
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>CLASSIFICAÇÃO</Text>
              <Text style={styles.infoValue}>{story.maturityRating || '12+'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>CAPÍTULOS</Text>
              <Text style={styles.infoValue}>{story.totalChapters || 1}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>ACESSO</Text>
              <Text style={[styles.infoValue, story.isPremium && styles.infoValuePremium]}>
                {story.isPremium ? 'PREMIUM' : 'GRÁTIS'}
              </Text>
            </View>
          </View>

          {/* Premise preview section */}
          {premises.length > 0 ? (
            <View style={styles.premisePreview}>
              <Text style={styles.premisePreviewLabel}>
                {premises.length} {premises.length === 1 ? 'premissa disponível' : 'premissas disponíveis'}
              </Text>
              <Text style={styles.premisePreviewText}>
                Escolha o ponto de partida que mais instiga sua curiosidade para moldar o destino desta narrativa.
              </Text>
            </View>
          ) : null}

          {/* Character preview */}
          {baseCharacters.length > 0 ? (
            <View style={styles.characterSection}>
              <Text style={styles.characterSectionLabel}>Elenco do mundo</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.charactersList}>
                {baseCharacters.map((character) => (
                  <View key={character.id} style={styles.characterCard}>
                    <View style={styles.characterPortrait}>
                      {character.imageUrl ? (
                        <Image source={{ uri: character.imageUrl }} style={styles.characterImage} />
                      ) : (
                        <Text style={styles.characterInitial}>{character.name.slice(0, 1)}</Text>
                      )}
                    </View>
                    <Text style={styles.characterName} numberOfLines={1}>{character.name}</Text>
                    <Text style={styles.characterRole} numberOfLines={1}>{character.role}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.startButton} onPress={() => router.push(`/story/${id}/premise`)}>
          <Text style={styles.startButtonText}>ESCOLHER PONTO DE PARTIDA</Text>
          <Play color="#381385" size={16} fill="#381385" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backBar: {
    height: 64, paddingHorizontal: 18,
    justifyContent: 'center',
    borderBottomWidth: 1, borderBottomColor: 'rgba(206, 189, 255, 0.12)',
    backgroundColor: 'rgba(10, 10, 12, 0.96)',
  },
  backButton: {
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
  },
  header: {
    height: 64,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(0,0,0,0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    ...typography.h3,
    fontFamily: 'NotoSerifBold',
    color: ACCENT,
    fontStyle: 'italic',
  },
  scrollContent: {
    paddingBottom: 110,
  },
  hero: {
    aspectRatio: 3 / 4,
    overflow: 'hidden',
  },
  heroImage: {
    flex: 1,
  },
  heroImageRadius: {
    resizeMode: 'cover',
  },
  heroGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 26,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  heroFallback: {
    flex: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  heroFallbackGlow: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: ACCENT,
    opacity: 0.08,
  },
  heroFallbackTitle: {
    ...typography.h1,
    fontFamily: 'NotoSerifBold',
    fontStyle: 'italic',
    color: '#e5e2e1',
    fontSize: 30,
    lineHeight: 36,
    marginTop: 40,
  },
  heroFallbackGenre: {
    ...typography.overline,
    color: ACCENT,
    fontSize: 10,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(206,189,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(206,189,255,0.24)',
  },
  heroBadgeFallback: {
    alignSelf: 'center',
    marginBottom: 8,
  },
  heroBadgeText: {
    ...typography.labelSmall,
    color: ACCENT,
    fontSize: 9,
    textTransform: 'none',
  },
  detailsSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  titleText: {
    ...typography.h1,
    fontFamily: 'NotoSerifBold',
    fontStyle: 'italic',
    color: '#e5e2e1',
    fontSize: 30,
    lineHeight: 36,
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  genrePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(206, 189, 255, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.18)',
  },
  genrePillText: {
    ...typography.overline,
    color: ACCENT,
    fontSize: 9,
  },
  tagPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tagPillFree: {},
  tagPillPremium: {
    backgroundColor: 'rgba(255, 185, 95, 0.10)',
    borderColor: 'rgba(255, 185, 95, 0.20)',
  },
  tagPillAccent: {
    backgroundColor: 'rgba(206, 189, 255, 0.08)',
    borderColor: 'rgba(206, 189, 255, 0.14)',
  },
  tagPillText: {
    ...typography.overline,
    color: SOFT_TEXT,
    fontSize: 9,
  },
  tagPillTextPremium: {
    color: DOURADO,
  },
  tagPillTextAccent: {
    color: ACCENT,
  },
  synopsis: {
    ...typography.narrative,
    fontFamily: 'NotoSerif',
    color: '#e5e2e1',
    fontSize: 17,
    lineHeight: 28,
    opacity: 0.9,
    marginBottom: 24,
  },
  infoGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 18,
    marginBottom: 24,
  },
  infoItem: {
    flex: 1,
    gap: 4,
  },
  infoLabel: {
    ...typography.overline,
    color: SOFT_TEXT,
    fontSize: 8,
  },
  infoValue: {
    ...typography.body,
    fontFamily: 'InterSemiBold',
    color: '#e5e2e1',
    fontSize: 13,
  },
  infoValuePremium: {
    color: DOURADO,
  },
  premisePreview: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(18, 18, 18, 0.60)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 24,
  },
  premisePreviewLabel: {
    ...typography.labelSmall,
    color: ACCENT,
    fontSize: 10,
    textTransform: 'none',
    marginBottom: 6,
  },
  premisePreviewText: {
    ...typography.caption,
    fontFamily: 'Inter',
    color: SOFT_TEXT,
    fontSize: 11,
    lineHeight: 17,
  },
  characterSection: {
    marginBottom: 24,
  },
  characterSectionLabel: {
    ...typography.labelSmall,
    color: SOFT_TEXT,
    fontSize: 10,
    textTransform: 'none',
    marginBottom: 14,
  },
  charactersList: {
    gap: 14,
  },
  characterCard: {
    width: 100,
  },
  characterPortrait: {
    aspectRatio: 3 / 4,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    overflow: 'hidden',
    borderRadius: 18,
  },
  characterImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  characterInitial: {
    ...typography.h1,
    fontFamily: 'NotoSerifBold',
    color: ACCENT,
    opacity: 0.5,
  },
  characterName: {
    ...typography.caption,
    fontFamily: 'InterSemiBold',
    color: '#e5e2e1',
    fontSize: 11,
  },
  characterRole: {
    ...typography.overline,
    color: SOFT_TEXT,
    fontSize: 8,
    marginTop: 2,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 18,
    paddingBottom: 28,
    backgroundColor: 'rgba(10, 10, 10, 0.98)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  startButton: {
    height: 54,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    borderRadius: 16,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  startButtonText: {
    ...typography.label,
    fontFamily: 'InterBold',
    color: '#381385',
    fontSize: 13,
  },
});
