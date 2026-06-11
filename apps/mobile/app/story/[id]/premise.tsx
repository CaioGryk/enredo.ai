import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, BookOpen, Compass, Crown, Eye, Flame, KeyRound, Landmark, Moon, Play, Sparkles } from 'lucide-react-native';
import { api, resolveApiAssetUrl } from '../../../src/api/client';
import { Story, StoryPremise } from '../../../src/api/types';
import { StateBlock } from '../../../src/components/state-block';
import { colors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { goBackSafe } from '../../../src/utils/navigation-helper';

const ACCENT = '#CEBDFF';
const SOFT_TEXT = '#B7AFC8';

export default function StoryPremiseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [selectedPremiseId, setSelectedPremiseId] = useState<string | null>(null);

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
    data: premises = [],
    isLoading: premisesLoading,
    isError: premisesError,
    refetch: refetchPremises,
  } = useQuery<StoryPremise[]>({
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

  const playablePremises = useMemo(() => {
    return premises.filter(p => (p.playableCharacterCount ?? 0) >= 3);
  }, [premises]);

  if (storyLoading || premisesLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => goBackSafe(`/story/${id}`)} style={styles.backButton}>
            <ArrowLeft color={ACCENT} size={20} />
          </TouchableOpacity>
        </View>
        <StateBlock
          fullScreen
          loading
          title="Preparando premissas"
          description="Estamos buscando os pontos de partida dessa história antes da escolha de personagem."
        />
      </View>
    );
  }

  if (storyError || premisesError) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => goBackSafe(`/story/${id}`)} style={styles.backButton}>
            <ArrowLeft color={ACCENT} size={20} />
          </TouchableOpacity>
        </View>
        <StateBlock
          fullScreen
          title="Não foi possível carregar as premissas"
          description="Verifique sua conexão e tente novamente antes de preparar novos pontos de partida."
          actionLabel="Tentar novamente"
          onAction={() => {
            refetchStory();
            refetchPremises();
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => goBackSafe(`/story/${id}`)} style={styles.backButton}>
          <ArrowLeft color={ACCENT} size={20} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ponto de Partida</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>Escolha sua premissa</Text>
        <Text style={styles.title}>Como deseja iniciar esta história?</Text>
        <Text style={styles.subtitle}>
          Sua escolha inicial definirá o tom, os conflitos e as pistas que encontrar primeiro. Cada premissa abre um caminho diferente.
        </Text>

        {playablePremises.length > 0 ? (
          <View style={styles.cards}>
            {playablePremises.map((premise) => {
              const isSelected = selectedPremiseId === premise.id;
              return (
                <TouchableOpacity
                  key={premise.id}
                  activeOpacity={0.92}
                  style={[styles.card, isSelected && styles.cardSelected]}
                  onPress={() => setSelectedPremiseId(premise.id)}
                >
                  {resolveApiAssetUrl(premise.coverUrl) ? (
                    <ImageBackground source={{ uri: resolveApiAssetUrl(premise.coverUrl)! }} style={styles.cardImage} imageStyle={styles.cardImageRadius} />
                  ) : premise.coverGenerationStatus === 'PENDING' ? (
                    <View style={styles.cardImageFallback}>
                      <ActivityIndicator color={ACCENT} size="small" />
                      <Text style={styles.cardFallbackText}>Gerando capa...</Text>
                    </View>
                  ) : premise.coverFallback ? (
                    <PremiseFallbackArt premise={premise} />
                  ) : (
                    <View style={styles.cardImageFallback}>
                      <Sparkles color={ACCENT} size={24} />
                    </View>
                  )}
                  <View style={styles.cardBody}>
                    <View style={styles.cardBodyHeader}>
                      <View style={[styles.cardIconCircle, isSelected && styles.cardIconCircleSelected]}>
                        {renderPremiseIcon(premise.title)}
                      </View>
                      {isSelected ? (
                        <View style={styles.cardSelectedPill}>
                          <Text style={styles.cardSelectedPillText}>Selecionado</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.cardTitle}>{premise.title}</Text>
                    <Text style={styles.cardSynopsis} numberOfLines={3}>{premise.synopsis}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : premises.length > 0 ? (
          <StateBlock
            title="Personagens em preparação"
            description="As premissas desta história existem, mas os personagens jogáveis ainda estão sendo finalizados pela equipe editorial. Volte em breve."
            actionLabel="Voltar para a história"
            onAction={() => goBackSafe(`/story/${id}`)}
          />
        ) : (
          <StateBlock
            title="História em preparação"
            description="Esta história está sendo preparada pela equipe editorial e ainda não tem premissas jogáveis disponíveis. Escolha outra história na biblioteca."
            actionLabel="Voltar para biblioteca"
            onAction={() => router.replace('/(tabs)/library')}
          />
        )}
      </ScrollView>

      {playablePremises.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.continueButton, !selectedPremiseId && styles.continueButtonDisabled]}
            onPress={() => selectedPremiseId && router.push(`/story/${id}/character?premiseId=${selectedPremiseId}`)}
            disabled={!selectedPremiseId}
          >
            <Text style={styles.continueButtonText}>
              {selectedPremiseId ? 'CONTINUAR PARA PERSONAGENS' : 'SELECIONE UMA PREMISSA'}
            </Text>
            <Play color={selectedPremiseId ? '#381385' : SOFT_TEXT} size={16} fill={selectedPremiseId ? '#381385' : 'none'} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function renderPremiseIcon(title: string) {
  const t = title.toLowerCase();
  if (t.includes('castelo') || t.includes('fortaleza')) return <Crown color={ACCENT} size={18} />;
  if (t.includes('lua') || t.includes('noite')) return <Moon color={ACCENT} size={18} />;
  if (t.includes('fogo') || t.includes('chama')) return <Flame color={ACCENT} size={18} />;
  if (t.includes('livro') || t.includes('biblioteca')) return <BookOpen color={ACCENT} size={18} />;
  if (t.includes('cidade') || t.includes('urbano')) return <Landmark color={ACCENT} size={18} />;
  if (t.includes('segredo') || t.includes('misterio') || t.includes('mistério')) return <KeyRound color={ACCENT} size={18} />;
  if (t.includes('olho') || t.includes('visão')) return <Eye color={ACCENT} size={18} />;
  return <Compass color={ACCENT} size={18} />;
}

function PremiseFallbackArt({ premise }: { premise: StoryPremise }) {
  const palette = normalizePalette(premise.coverFallback?.palette);
  const Icon = getFallbackIcon(premise.coverFallback?.symbol);

  return (
    <View style={[styles.cardImageFallback, { backgroundColor: palette[0] }]}>
      <View style={[styles.fallbackGlowLarge, { backgroundColor: palette[2] }]} />
      <View style={[styles.fallbackGlowSmall, { backgroundColor: palette[1] }]} />
      <View style={[styles.fallbackGround, { backgroundColor: palette[3] }]} />
      {Array.from({ length: 8 }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.fallbackLine,
            {
              backgroundColor: index % 2 === 0 ? palette[1] : palette[3],
              top: 34 + index * 22,
            },
          ]}
        />
      ))}
      <View style={[styles.cardFallbackSymbolPlate, { borderColor: palette[1] + '55' }]}>
        <Icon color={palette[1]} size={42} strokeWidth={1.6} />
      </View>
      <Text style={[styles.cardFallbackTitle, { color: palette[1] }]} numberOfLines={2}>
        {premise.coverFallback?.title || premise.title}
      </Text>
      <Text style={styles.cardFallbackSubtitle} numberOfLines={1}>
        {premise.coverFallback?.subtitle || premise.tone || 'ponto de partida'}
      </Text>
    </View>
  );
}

function normalizePalette(palette?: string[]): string[] {
  return [
    palette?.[0] || '#111018',
    palette?.[1] || ACCENT,
    palette?.[2] || '#342459',
    palette?.[3] || '#2B3346',
  ];
}

function getFallbackIcon(symbol?: string): React.ComponentType<any> {
  switch (symbol) {
    case 'key': return KeyRound;
    case 'book': return BookOpen;
    case 'city': return Landmark;
    case 'letter': return Flame;
    case 'crown': return Crown;
    case 'eye': return Eye;
    case 'moon': return Moon;
    case 'spark': return Sparkles;
    default: return Compass;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.h3, fontFamily: 'NotoSerifBold', color: '#e5e2e1', fontSize: 16 },
  headerSpacer: { width: 40 },
  content: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 120 },
  eyebrow: { ...typography.overline, color: ACCENT, fontSize: 9, marginBottom: 10 },
  title: { ...typography.h1, fontFamily: 'NotoSerifBold', color: '#e5e2e1', fontSize: 28, lineHeight: 34, marginBottom: 12 },
  subtitle: { ...typography.body, fontFamily: 'Inter', color: SOFT_TEXT, fontSize: 13, lineHeight: 20, marginBottom: 28 },
  cards: { gap: 16 },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(18, 18, 18, 0.60)',
  },
  cardSelected: {
    borderColor: 'rgba(206, 189, 255, 0.40)',
    backgroundColor: 'rgba(206, 189, 255, 0.06)',
  },
  cardImage: { height: 200 },
  cardImageRadius: { borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  cardImageFallback: {
    alignItems: 'center', justifyContent: 'center',
    height: 200, backgroundColor: '#121212', gap: 10, overflow: 'hidden',
  },
  cardBody: { padding: 18, gap: 10 },
  cardBodyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(206, 189, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconCircleSelected: {
    backgroundColor: 'rgba(206, 189, 255, 0.18)',
  },
  cardSelectedPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(206, 189, 255, 0.14)',
  },
  cardSelectedPillText: {
    ...typography.overline,
    color: ACCENT,
    fontSize: 8,
  },
  cardTitle: {
    ...typography.h3,
    fontFamily: 'NotoSerifBold',
    color: '#e5e2e1',
    fontSize: 16,
    lineHeight: 21,
  },
  cardSynopsis: {
    ...typography.caption,
    fontFamily: 'Inter',
    color: SOFT_TEXT,
    fontSize: 12,
    lineHeight: 18,
  },
  cardFallbackText: { ...typography.caption, fontFamily: 'Inter', color: SOFT_TEXT, fontSize: 11 },
  cardFallbackSymbolPlate: {
    width: 92, height: 92, borderRadius: 30, borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.055)', alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  cardFallbackTitle: { ...typography.h3, color: ACCENT, fontSize: 20, lineHeight: 25, textAlign: 'center', maxWidth: 250 },
  cardFallbackSubtitle: { ...typography.label, color: SOFT_TEXT, fontSize: 10, opacity: 0.82 },
  fallbackGlowLarge: {
    position: 'absolute', right: -48, top: -48, width: 190, height: 190, borderRadius: 999, opacity: 0.36,
  },
  fallbackGlowSmall: {
    position: 'absolute', left: -44, bottom: -50, width: 150, height: 150, borderRadius: 999, opacity: 0.22,
  },
  fallbackGround: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: '34%' as any, opacity: 0.28,
  },
  fallbackLine: {
    position: 'absolute', left: -50, right: -50, height: 1,
  },
  footer: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    padding: 18, paddingBottom: 28,
    backgroundColor: 'rgba(10, 10, 10, 0.98)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  continueButton: {
    height: 54,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    borderRadius: 16,
  },
  continueButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  continueButtonText: {
    ...typography.label,
    fontFamily: 'InterBold',
    color: '#381385',
    fontSize: 13,
  },
});
