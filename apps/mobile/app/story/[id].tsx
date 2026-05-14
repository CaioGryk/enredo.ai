import React, { useMemo } from 'react';
import {
  ActivityIndicator,
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
import { ArrowLeft, Bookmark, BookOpenText, ChevronRight, Sparkles } from 'lucide-react-native';
import { api } from '../../src/api/client';
import { Character, Story, StoryCharactersResponse, StoryPremise } from '../../src/api/types';
import { StateBlock } from '../../src/components/state-block';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';

const ACCENT = '#CEBDFF';
const PANEL = '#15131B';
const PANEL_ALT = '#1B1824';
const SOFT_TEXT = '#B7AFC8';

const curatedCoverImages: Record<string, string> = {
  'O Último Trem':
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDgQ7acJ_9YHObe_C_H-4mPIFk7kQDxoexw_JWlfnO_Y_inNVQGJ5eYN6Ag5WTS0-dyVOYHs69O7ESaHDmAkkUg9RJkcfOFaSjniPWTHSdzTmlq_EPNaT_x3JzmeAl3KNtcY2QHr5NB8P5mgVUG-gJpUwbNeQEwHdP3AmE54_dJFYRljoyWT3MkKbDV7JuwwARkqMydnZ1R2VJp53CAm2BfFKT-HeNWrm6IHigFkQw-ZuY5-DdWoEOCa6fWt1lxQA29XSkEBZZAwUS2',
  'Noite de Halloween':
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBZnfa5Oh7XqFJZB_Kf2YyUVWWs-5dAoun-jL7sKendyMLqCLHdmADYOnhSuZyjARcORVS7KpD0BJScfjteiwsBafx6rNKYu4KJLYUdlcH30TpOdWotfJdpWqZBujho0anQcxamgweWNfs9eg-3svDQZUEbVAYJoWKGKiUikBh7bzW4b-_ZMORgUdtWGeN8vBPk-aKpk_qoIPymTDUzbCv8VwQQvMDBGYXuSE1IJkawOcx_ns6AH6g2U_tqG6feCYRK7NFMN5hHmqmc',
  'A Última Biblioteca':
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAfLscPlEzbDU0TsuAvcdiYL5zI1wPacI9XMlKaX0ctY-6JTzFrnPWimY29W6L5ymwGxSWn85ZV6OIduP12tEFOwobs8h-rgdr39UmFtU9g5Ar7NxL2rbBpG7gnQW1YlkUX7cep0N_Wz-HOgTWYue3J1eGtz2EpJtPqdGmUidIFOLmUVcsW-T_uEhBl8OolaitKe0u1IlJUmbA_RnAPTcTRkLLMZhCktqCknTZ03LbdqMDaeBYy-XvyE8_4GiUUWjZtq74KOWqL7iSF',
  'O Clube dos Mentirosos':
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDgQ7acJ_9YHObe_C_H-4mPIFk7kQDxoexw_JWlfnO_Y_inNVQGJ5eYN6Ag5WTS0-dyVOYHs69O7ESaHDmAkkUg9RJkcfOFaSjniPWTHSdzTmlq_EPNaT_x3JzmeAl3KNtcY2QHr5NB8P5mgVUG-gJpUwbNeQEwHdP3AmE54_dJFYRljoyWT3MkKbDV7JuwwARkqMydnZ1R2VJp53CAm2BfFKT-HeNWrm6IHigFkQw-ZuY5-DdWoEOCa6fWt1lxQA29XSkEBZZAwUS2',
  'Amor nas Estrelas':
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCalBEMdb2ZXJ1OnM1NjjrSHPxMh9NKFA3Nba6zcs3GFiL5t1i8AN90hFy94YkUNJY2hSIgyjfcrGMNjZvtOeT9pkBqXTcqNPFPj43YGtSEtxTev01g1olgGWgnxUrPNZwZcbRL5bEDRghY8rvtnEKFFMMfps17z6aPefqEVAdep_GkIk8OJBQsZ8N9y5fJKiF8VG0Er-_HlSWTp5mn_-51PmjYqp_xZchrbmTVwiItxru3kOTGfoymYTnzlB5bq_onf241oPTwsU3P',
  'O Enigma do Lighthouse':
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBZnfa5Oh7XqFJZB_Kf2YyUVWWs-5dAoun-jL7sKendyMLqCLHdmADYOnhSuZyjARcORVS7KpD0BJScfjteiwsBafx6rNKYu4KJLYUdlcH30TpOdWotfJdpWqZBujho0anQcxamgweWNfs9eg-3svDQZUEbVAYJoWKGKiUikBh7bzW4b-_ZMORgUdtWGeN8vBPk-aKpk_qoIPymTDUzbCv8VwQQvMDBGYXuSE1IJkawOcx_ns6AH6g2U_tqG6feCYRK7NFMN5hHmqmc',
};

export default function StoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: story, isLoading: storyLoading } = useQuery<Story>({
    queryKey: ['story', id],
    queryFn: async () => {
      const { data } = await api.get(`/library/stories/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });

  const { data: charactersResponse, isLoading: charsLoading } = useQuery<StoryCharactersResponse>({
    queryKey: ['story-characters', id],
    queryFn: async () => {
      const { data } = await api.get(`/library/stories/${id}/characters`);
      return data;
    },
    enabled: Boolean(id),
  });

  const { data: premises = [] } = useQuery<StoryPremise[]>({
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

  const heroImage = useMemo(() => getStoryImage(story), [story]);
  const baseCharacters = charactersResponse?.characters ?? [];

  if (storyLoading || charsLoading) {
    return (
      <View style={styles.container}>
        <StateBlock
          fullScreen
          loading
          title="Preparando a história"
          description="Estamos carregando sinopse, elenco e estrutura base antes do seu ponto de partida."
        />
      </View>
    );
  }

  if (!story) {
    return (
      <View style={styles.container}>
        <StateBlock
          fullScreen
          title="História não encontrada"
          description="Essa historia pode ter sido removida ou ainda nao esta disponivel na biblioteca."
          actionLabel="Voltar para biblioteca"
          onAction={() => router.replace('/(tabs)/library')}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <ArrowLeft color={ACCENT} size={24} />
        </TouchableOpacity>
        <Text style={styles.brand}>Enredo.ai</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Bookmark color={SOFT_TEXT} size={22} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          {heroImage ? (
            <ImageBackground source={{ uri: heroImage }} style={styles.heroImage} imageStyle={styles.heroImageRadius}>
              <HeroOverlay story={story} />
            </ImageBackground>
          ) : (
            <View style={styles.heroFallback}>
              <Text style={styles.heroFallbackMark}>E</Text>
              <HeroOverlay story={story} />
            </View>
          )}
        </View>

        <SectionLabel label="Sinopse" />
        <View style={styles.synopsisBlock}>
          <Text style={styles.synopsis}>{story.synopsis}</Text>
        </View>

        <View style={styles.flowCard}>
          <Sparkles color={ACCENT} size={18} />
          <View style={styles.flowCopy}>
            <Text style={styles.flowTitle}>A jornada agora acontece em etapas.</Text>
            <Text style={styles.flowText}>
              Primeiro você escolhe uma premissa inicial. Depois assume um personagem jogável. Só então a narrativa abre espaço
              para a conversa com a IA.
            </Text>
          </View>
        </View>

        <SectionHeader label="Próxima etapa" action="ponto de partida" />
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.stageCard}
          onPress={() => router.push(`/story/${id}/premise`)}
        >
          <View style={styles.stageCopy}>
            <Text style={styles.stageEyebrow}>1. Escolha sua premissa</Text>
            <Text style={styles.stageTitle}>
              {premises.length ? `${premises.length} premissas prontas para começar.` : 'Prepare o primeiro ponto de partida da história.'}
            </Text>
            <Text style={styles.stageText}>
              Cada premissa muda a situação inicial, o clima e os conflitos que a IA vai usar para responder às suas ações.
            </Text>
          </View>
          <ChevronRight color={ACCENT} size={22} />
        </TouchableOpacity>

        {baseCharacters.length > 0 ? (
          <>
            <SectionHeader label="Elenco do mundo" action="referência narrativa" />
            <Text style={styles.helperText}>
              Estes personagens ajudam a IA a manter o universo coeso. A escolha jogável acontece na próxima tela, depois da
              premissa.
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.charactersList}>
              {baseCharacters.map((character) => (
                <BaseCharacterCard key={character.id} character={character} />
              ))}
            </ScrollView>
          </>
        ) : null}

        <SectionLabel label="Capítulos adicionados" />
        <View style={styles.chapters}>
          {Array.from({ length: Math.max(story.totalChapters || 1, 1) })
            .slice(0, 4)
            .map((_, index) => {
              const locked = story.isPremium && index > 0;
              return (
                <View key={index} style={[styles.chapterRow, locked && styles.lockedChapter]}>
                  <View>
                    <Text style={styles.chapterTitle}>
                      {index + 1}. {chapterTitle(index)}
                    </Text>
                    <Text style={styles.chapterMeta}>{locked ? 'PREMIUM' : 'GRÁTIS'} • leitura interativa</Text>
                  </View>
                  {locked ? <BookOpenText color={ACCENT} size={18} /> : <BookOpenText color={ACCENT} size={18} />}
                </View>
              );
            })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.startButton} onPress={() => router.push(`/story/${id}/premise`)}>
          <Text style={styles.startButtonText}>ESCOLHER PONTO DE PARTIDA</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function HeroOverlay({ story }: { story: Story }) {
  const genre = story.genres?.[0] || 'Narrativa';
  return (
    <View style={styles.heroOverlay}>
      <View style={styles.metadata}>
        <View style={story.isPremium ? styles.badgePremium : styles.badgeFree}>
          <Text style={styles.badgeText}>{story.isPremium ? 'PREMIUM' : 'GRÁTIS'}</Text>
        </View>
        <Text style={styles.maturity}>{story.maturityRating || '12+'}</Text>
      </View>
      <Text style={styles.title}>{story.title}</Text>
      <Text style={styles.genre}>
        {genre} • {story.totalChapters || 1} capítulos
      </Text>
    </View>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

function SectionHeader({ label, action }: { label: string; action: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <Text style={styles.sectionAction}>{action}</Text>
    </View>
  );
}

function BaseCharacterCard({ character }: { character: Character }) {
  return (
    <View style={styles.characterCard}>
      <View style={styles.characterPortrait}>
        {character.imageUrl ? (
          <Image source={{ uri: character.imageUrl }} style={styles.characterImage} />
        ) : (
          <Text style={styles.characterInitial}>{character.name.slice(0, 1)}</Text>
        )}
      </View>
      <Text style={styles.characterName}>{character.name}</Text>
      <Text style={styles.characterRole}>{character.role}</Text>
    </View>
  );
}

function getStoryImage(story?: Story): string | undefined {
  if (!story) return undefined;
  return story.coverUrl || story.coverImageUrl || curatedCoverImages[story.title];
}

function chapterTitle(index: number) {
  const titles = ['O Chamado Inicial', 'Vozes no Corredor', 'A Teia de Silêncio', 'O Eco do Abismo'];
  return titles[index] || 'Novo Capítulo';
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
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    ...typography.h3,
    color: ACCENT,
    fontStyle: 'italic',
  },
  scrollContent: {
    paddingBottom: 130,
  },
  hero: {
    height: 500,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 34,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.08)',
  },
  heroImage: {
    flex: 1,
  },
  heroImageRadius: {
    resizeMode: 'cover',
  },
  heroFallback: {
    flex: 1,
    backgroundColor: PANEL_ALT,
  },
  heroFallbackMark: {
    position: 'absolute',
    right: 32,
    top: 72,
    fontFamily: 'serif',
    fontSize: 180,
    fontWeight: '700',
    color: ACCENT,
    opacity: 0.13,
  },
  heroOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 26,
    backgroundColor: 'rgba(8, 8, 12, 0.34)',
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  badgePremium: {
    backgroundColor: ACCENT,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeFree: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  badgeText: {
    ...typography.label,
    color: '#2F1561',
    fontSize: 10,
  },
  maturity: {
    ...typography.label,
    color: '#F4EEFF',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  title: {
    ...typography.h1,
    color: '#F5F1FF',
    fontSize: 44,
    lineHeight: 50,
    marginBottom: 12,
  },
  genre: {
    ...typography.label,
    color: ACCENT,
  },
  sectionLabel: {
    ...typography.label,
    color: SOFT_TEXT,
    marginHorizontal: 24,
    marginTop: 42,
    marginBottom: 16,
  },
  sectionHeader: {
    marginTop: 42,
    marginBottom: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  sectionAction: {
    ...typography.label,
    color: ACCENT,
    fontSize: 9,
  },
  synopsisBlock: {
    marginHorizontal: 24,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(206, 189, 255, 0.5)',
    paddingLeft: 20,
  },
  synopsis: {
    ...typography.narrative,
    color: '#F5F1FF',
    fontStyle: 'italic',
    opacity: 0.9,
  },
  flowCard: {
    marginHorizontal: 24,
    marginTop: 32,
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.08)',
    backgroundColor: PANEL_ALT,
    borderRadius: 26,
    padding: 20,
    flexDirection: 'row',
    gap: 14,
  },
  flowCopy: {
    flex: 1,
  },
  flowTitle: {
    ...typography.body,
    color: '#F5F1FF',
    fontWeight: '800',
    marginBottom: 6,
  },
  flowText: {
    ...typography.bodySmall,
    color: SOFT_TEXT,
  },
  stageCard: {
    marginHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.08)',
    backgroundColor: PANEL_ALT,
    borderRadius: 26,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stageCopy: {
    flex: 1,
  },
  stageEyebrow: {
    ...typography.label,
    color: ACCENT,
    fontSize: 10,
    marginBottom: 8,
  },
  stageTitle: {
    ...typography.h3,
    color: '#F5F1FF',
    marginBottom: 8,
  },
  stageText: {
    ...typography.bodySmall,
    color: SOFT_TEXT,
  },
  helperText: {
    ...typography.bodySmall,
    color: SOFT_TEXT,
    marginHorizontal: 24,
    marginTop: -8,
    marginBottom: 16,
  },
  charactersList: {
    gap: 14,
    paddingHorizontal: 24,
  },
  characterCard: {
    width: 112,
  },
  characterPortrait: {
    aspectRatio: 3 / 4,
    backgroundColor: PANEL_ALT,
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    overflow: 'hidden',
    borderRadius: 24,
  },
  characterImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  characterInitial: {
    ...typography.h1,
    color: ACCENT,
    opacity: 0.7,
  },
  characterName: {
    ...typography.bodySmall,
    color: '#F5F1FF',
    fontWeight: '700',
  },
  characterRole: {
    ...typography.label,
    color: SOFT_TEXT,
    fontSize: 9,
    marginTop: 2,
  },
  chapters: {
    paddingHorizontal: 24,
    gap: 18,
  },
  chapterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.08)',
    backgroundColor: 'rgba(255,255,255,0.015)',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  lockedChapter: {
    opacity: 0.52,
  },
  chapterTitle: {
    ...typography.narrative,
    color: '#F5F1FF',
    fontStyle: 'italic',
  },
  chapterMeta: {
    ...typography.label,
    color: SOFT_TEXT,
    fontSize: 9,
    marginTop: 5,
  },
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
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    borderRadius: 20,
  },
  startButtonText: {
    ...typography.label,
    color: '#2F1561',
  },
  emptyText: {
    ...typography.bodySmall,
    color: SOFT_TEXT,
    paddingHorizontal: 24,
  },
});
