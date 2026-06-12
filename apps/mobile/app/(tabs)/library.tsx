import React, { useMemo, useState } from 'react';
import {
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { BookOpen, ChevronRight, Play, Search, Sparkles, Zap } from 'lucide-react-native';
import { api, resolveApiAssetUrl } from '../../src/api/client';
import { queryKeys } from '../../src/api/queryKeys';
import { ReadingSessionSummary, SessionListResponse, Story, StoryListResponse } from '../../src/api/types';
import { StateBlock } from '../../src/components/state-block';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';

const ACCENT = '#CEBDFF';
const SOFT_TEXT = '#B7AFC8';

export default function LibraryScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: stories = [], isLoading, error, refetch } = useQuery<Story[]>({
    queryKey: queryKeys.stories,
    queryFn: async () => {
      const { data } = await api.get<StoryListResponse>('/library/stories');
      return data.stories;
    },
  });

  const { data: activeSessions } = useQuery<ReadingSessionSummary[]>({
    queryKey: queryKeys.sessions('ACTIVE'),
    queryFn: async () => {
      const { data } = await api.get<SessionListResponse>('/reading/sessions', {
        params: { status: 'ACTIVE' },
      });
      return data.sessions;
    },
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [previewStory, setPreviewStory] = useState<Story | null>(null);

  const prefetchStoryFlow = (story: Story) => {
    void queryClient.prefetchQuery({
      queryKey: queryKeys.story(story.id),
      queryFn: async () => {
        const { data } = await api.get(`/library/stories/${story.id}`);
        return data;
      },
    });
    void queryClient.prefetchQuery({
      queryKey: queryKeys.storyCharacters(story.id),
      queryFn: async () => {
        const { data } = await api.get(`/library/stories/${story.id}/characters`);
        return data;
      },
    });
    void queryClient.prefetchQuery({
      queryKey: queryKeys.storyPremises(story.id),
      queryFn: async () => {
        const { data } = await api.get(`/story-setup/stories/${story.id}/premises`);
        return data;
      },
    });
  };

  const openStoryPreview = (story: Story) => {
    setPreviewStory(story);
    prefetchStoryFlow(story);
  };

  const filteredStories = useMemo(() => {
    if (!searchQuery.trim()) return stories;
    const q = searchQuery.toLowerCase();
    return stories.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.genres || []).some((g) => g.toLowerCase().includes(q)),
    );
  }, [stories, searchQuery]);

  const activeStoryIds = new Set((activeSessions || []).map((s) => s.storyId));
  const freeStories = useMemo(() => filteredStories.filter((s) => !s.isPremium), [filteredStories]);
  const premiumStories = useMemo(() => filteredStories.filter((s) => s.isPremium), [filteredStories]);
  const highlightStories = useMemo(() => freeStories.slice(0, 5), [freeStories]);
  const trendingStories = useMemo(() => freeStories.slice(0, 6), [freeStories]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StateBlock
          fullScreen
          loading
          title="Carregando a biblioteca"
          description="Estamos reunindo originais, histórias da comunidade e suas leituras em andamento."
        />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <StateBlock
          fullScreen
          title="Não conseguimos carregar a biblioteca"
          description="Tente novamente em instantes para voltar a explorar histórias, cenas e leituras."
          actionLabel="Tentar novamente"
          onAction={() => refetch()}
        />
      </View>
    );
  }

  if (!stories.length) {
    return (
      <View style={styles.container}>
        <StateBlock
          fullScreen
          title="Biblioteca em preparação"
          description="Estamos organizando novas histórias para você explorar. Tente novamente em instantes."
          actionLabel="Tentar novamente"
          onAction={() => refetch()}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerBrand} onTouchEnd={() => setSearchQuery('')}>
          <BookOpen color={ACCENT} size={20} />
          <Text style={styles.headerBrandText}>
            <Text style={styles.headerBrandAccent}>Enredo</Text>
            <Text style={styles.headerBrandDot}>.ai</Text>
          </Text>
        </View>
        <View style={styles.aiBadge}>
          <Sparkles color={ACCENT} size={12} />
          <Text style={styles.aiBadgeText}>Enredo AI Ativo</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrapper}>
        <Search color={SOFT_TEXT} size={18} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Pesquisar enredos, gêneros..."
          placeholderTextColor={SOFT_TEXT}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClear}>
            <Text style={styles.searchClearText}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {searchQuery && filteredStories.length === 0 ? (
          <View style={styles.searchEmptyState}>
            <Text style={styles.searchEmptyTitle}>Nenhum resultado</Text>
            <Text style={styles.searchEmptyDesc}>
              Nenhuma história encontrada para "{searchQuery}". Tente outro termo ou explore as seções abaixo.
            </Text>
            <TouchableOpacity style={styles.searchEmptyClear} onPress={() => setSearchQuery('')}>
              <Text style={styles.searchEmptyClearText}>Limpar busca</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Continue Reading */}
        {activeSessions && activeSessions.length > 0 && (
          <View style={styles.continueSection}>
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.continueCard}
              onPress={() => activeSessions[0] && router.push(`/reader/${activeSessions[0].id}` as any)}
            >
              <View style={styles.continueVisual}>
                <Play color={colors.background} fill={ACCENT} size={24} />
              </View>
              <View style={styles.continueBody}>
                <Text style={styles.continueMeta}>Continuar lendo</Text>
                <Text style={styles.continueTitle} numberOfLines={1}>
                  {activeSessions[0].storyTitle}
                </Text>
                <Text style={styles.continueSub}>
                  Cena {activeSessions[0].currentSceneIndex + 1}
                </Text>
              </View>
              <ChevronRight color={ACCENT} size={20} />
            </TouchableOpacity>
          </View>
        )}

        {/* Highlights (free stories, horizontal landscape) */}
        {highlightStories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Destaques</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.originalsRow}>
              {highlightStories.map((story) => (
                <TouchableOpacity
                  key={story.id}
                  activeOpacity={0.92}
                  style={styles.originalCard}
                  onPress={() => openStoryPreview(story)}
                >
                  {getStoryImage(story) ? (
                    <ImageBackground source={{ uri: getStoryImage(story)! }} style={styles.originalCardImage} imageStyle={styles.originalCardRadius}>
                      <View style={styles.originalOverlay}>
                        <View style={styles.originalBadge}>
                          <Text style={styles.originalBadgeText}>DESTAQUE</Text>
                        </View>
                        <View style={styles.originalCardInfo}>
                          <Text style={styles.originalCardGenre}>{(story.genres?.[0] || 'NARRATIVA').toUpperCase()}</Text>
                          <Text style={styles.originalCardTitle} numberOfLines={2}>{story.title}</Text>
                        </View>
                      </View>
                    </ImageBackground>
                  ) : (
                    <FallbackCard story={story} style={styles.originalCardImage}>
                      <View style={styles.originalOverlay}>
                        <View style={styles.originalBadge}>
                          <Text style={styles.originalBadgeText}>DESTAQUE</Text>
                        </View>
                        <View style={styles.originalCardInfo}>
                          <Text style={styles.originalCardGenre}>{(story.genres?.[0] || 'NARRATIVA').toUpperCase()}</Text>
                          <Text style={styles.originalCardTitle} numberOfLines={2}>{story.title}</Text>
                        </View>
                      </View>
                    </FallbackCard>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Trending */}
        {trendingStories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tendências</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendingRow}>
              {trendingStories.map((story) => (
                <TouchableOpacity
                  key={story.id}
                  activeOpacity={0.9}
                  style={styles.trendingCard}
                  onPress={() => openStoryPreview(story)}
                >
                  <View style={styles.trendingImageWrap}>
                    {getStoryImage(story) ? (
                      <ImageBackground source={{ uri: getStoryImage(story)! }} style={styles.trendingImage} imageStyle={styles.trendingCardRadius}>
                        <View style={styles.trendingHover}>
                          <Text style={styles.trendingHoverText}>Ler agora</Text>
                        </View>
                      </ImageBackground>
                    ) : (
                      <FallbackCard story={story} style={styles.trendingImage}>
                        <View style={styles.trendingHover}>
                          <Text style={styles.trendingHoverText}>Ler agora</Text>
                        </View>
                      </FallbackCard>
                    )}
                    {activeStoryIds.has(story.id) ? (
                      <View style={styles.trendingActiveDot} />
                    ) : null}
                  </View>
                  <Text style={styles.trendingCardTitle} numberOfLines={1}>{story.title}</Text>
                  <Text style={styles.trendingCardGenre}>{(story.genres?.[0] || 'Narrativa').toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Full catalog */}
        {filteredStories.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitleInline}>Todas as histórias</Text>
              <Text style={styles.sectionCount}>{filteredStories.length}</Text>
            </View>
            <View style={styles.allStoriesList}>
              {filteredStories.map((story) => (
                <TouchableOpacity
                  key={story.id}
                  activeOpacity={0.9}
                  style={styles.allStoryCard}
                  onPress={() => openStoryPreview(story)}
                >
                  <View style={styles.allStoryImageWrap}>
                    {getStoryImage(story) ? (
                      <ImageBackground
                        source={{ uri: getStoryImage(story)! }}
                        style={styles.allStoryImage}
                        imageStyle={styles.allStoryImageRadius}
                      />
                    ) : (
                      <FallbackCard story={story} style={styles.allStoryImage} />
                    )}
                  </View>
                  <View style={styles.allStoryBody}>
                    <View style={styles.allStoryMetaRow}>
                      <Text style={styles.allStoryGenre} numberOfLines={1}>
                        {(story.genres?.[0] || 'Narrativa').toUpperCase()}
                      </Text>
                      <Text style={[styles.allStoryPlan, story.isPremium && styles.allStoryPlanPremium]}>
                        {story.isPremium ? 'PREMIUM' : 'GRATIS'}
                      </Text>
                    </View>
                    <Text style={styles.allStoryTitle} numberOfLines={2}>
                      {story.title}
                    </Text>
                    <Text style={styles.allStorySynopsis} numberOfLines={2}>
                      {story.synopsis}
                    </Text>
                  </View>
                  <ChevronRight color={ACCENT} size={18} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Premium */}
        {premiumStories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Conteúdo Premium</Text>
            {premiumStories.map((story) => (
              <TouchableOpacity
                key={story.id}
                activeOpacity={0.9}
                style={styles.premiumCard}
                onPress={() => openStoryPreview(story)}
              >
                <View style={styles.premiumImageWrap}>
                  {getStoryImage(story) ? (
                    <ImageBackground source={{ uri: getStoryImage(story)! }} style={styles.premiumImage} imageStyle={styles.premiumCardRadius} />
                  ) : (
                    <FallbackCard story={story} style={styles.premiumImage} />
                  )}
                </View>
                <View style={styles.premiumBody}>
                  <View style={styles.premiumTagRow}>
                    <Zap color={GOLD} size={10} fill={GOLD} />
                    <Text style={styles.premiumTagText}>PREMIUM STORY</Text>
                  </View>
                  <Text style={styles.premiumCardTitle} numberOfLines={1}>{story.title}</Text>
                  <Text style={styles.premiumCardSynopsis} numberOfLines={2}>{story.synopsis}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Story Preview Bottom Sheet */}
      {previewStory ? (
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={() => setPreviewStory(null)} />
          <View style={styles.sheetPanel}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHero}>
              {getStoryImage(previewStory) ? (
                <ImageBackground source={{ uri: getStoryImage(previewStory)! }} style={styles.sheetHeroImage} imageStyle={styles.premiumCardRadius}>
                  <View style={styles.sheetHeroOverlay} />
                  <TouchableOpacity style={styles.sheetCloseBtn} onPress={() => setPreviewStory(null)}>
                    <Text style={styles.sheetCloseText}>✕</Text>
                  </TouchableOpacity>
                </ImageBackground>
              ) : (
                <FallbackCard story={previewStory} style={styles.sheetHeroImage}>
                  <TouchableOpacity style={styles.sheetCloseBtn} onPress={() => setPreviewStory(null)}>
                    <Text style={styles.sheetCloseText}>✕</Text>
                  </TouchableOpacity>
                </FallbackCard>
              )}
            </View>
            <View style={styles.sheetBody}>
              <View style={styles.sheetMetaRow}>
                <View style={[styles.sheetGenrePill, previewStory.isPremium && styles.sheetGenrePillPremium]}>
                  <Text style={[styles.sheetGenreText, previewStory.isPremium && styles.sheetGenreTextPremium]}>
                    {(previewStory.genres?.[0] || 'NARRATIVA').toUpperCase()}
                  </Text>
                </View>
                {previewStory.isPremium ? (
                  <View style={styles.sheetPremiumIndicator}>
                    <Zap color={GOLD} size={11} fill={GOLD} />
                    <Text style={styles.sheetPremiumText}>Premium</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.sheetStoryTitle}>{previewStory.title}</Text>
              <Text style={styles.sheetSynopsis}>{previewStory.synopsis}</Text>
              <TouchableOpacity
                style={styles.sheetStartBtn}
                onPress={() => {
                  setPreviewStory(null);
                  router.push(`/story/${previewStory.id}`);
                }}
              >
                <BookOpen color="#381385" size={18} fill="#381385" />
                <Text style={styles.sheetStartText}>Iniciar Leitura Interativa</Text>
              </TouchableOpacity>
              {activeStoryIds.has(previewStory.id) ? (
                <TouchableOpacity
                  style={styles.sheetContinueBtn}
                  onPress={() => {
                    const session = (activeSessions || []).find((s) => s.storyId === previewStory.id);
                    setPreviewStory(null);
                    if (session) router.push(`/reader/${session.id}` as any);
                  }}
                >
                  <Play color={ACCENT} size={16} fill={ACCENT} />
                  <Text style={styles.sheetContinueText}>Continuar leitura</Text>
                </TouchableOpacity>
              ) : null}
              <Text style={styles.sheetFooterNote}>Capítulos integrados com tomadas de decisões inteligentes.</Text>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function getStoryImage(story: Story): string | undefined {
  return resolveApiAssetUrl(story.coverUrl || story.coverImageUrl);
}

const GENRE_COLORS: Record<string, string[]> = {
  terror: ['#0D0B10', '#D8C08A'],
  horror: ['#0D0B10', '#D8C08A'],
  romance: ['#171012', '#F0C6A8'],
  ficção: ['#07131B', '#8EE3FF'],
  fantasia: ['#0F1410', '#D6BF75'],
  drama: ['#101114', '#D9B66F'],
  histórico: ['#11100D', '#CDB58A'],
  mistério: ['#0F1117', '#CFC2FF'],
  suspense: ['#0F1117', '#CFC2FF'],
  thriller: ['#0F1117', '#CFC2FF'],
  cyber: ['#07131B', '#8EE3FF'],
  sci: ['#07131B', '#8EE3FF'],
  corporativo: ['#101114', '#D9B66F'],
  investig: ['#0F1117', '#CFC2FF'],
};

function getGenreColors(story: Story): string[] {
  const text = `${story.title} ${(story.genres || []).join(' ')}`.toLowerCase();
  for (const [key, colors] of Object.entries(GENRE_COLORS)) {
    if (text.includes(key)) return colors;
  }
  return ['#131313', ACCENT];
}

function FallbackCard({ story, style, children }: { story: Story; style: any; children?: React.ReactNode }) {
  const [bg, accent] = getGenreColors(story);
  return (
    <View style={[style, { backgroundColor: bg }]}>
      <View style={[styles.fallbackGlow, { backgroundColor: accent }]} />
      <View style={styles.fallbackIconCircle}>
        <Sparkles color={accent} size={28} strokeWidth={1.4} />
      </View>
      {children ? (
        children
      ) : (
        <View style={styles.fallbackTextOverlay}>
          <Text style={[styles.fallbackGenreText, { color: accent }]}>
            {(story.genres?.[0] || 'NARRATIVA').toUpperCase()}
          </Text>
          <Text style={styles.fallbackTitleText} numberOfLines={2}>
            {story.title}
          </Text>
        </View>
      )}
    </View>
  );
}

const AZUL_PROFUNDO = '#381385';
const DOURADO = '#FFB95F';
const GOLD = '#ffb95f';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  /* ─── Header ─── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBrandText: {
    ...typography.h3,
    fontFamily: 'NotoSerifBold',
    fontSize: 19,
    fontStyle: 'italic',
  },
  headerBrandAccent: {
    color: ACCENT,
  },
  headerBrandDot: {
    color: '#e5e2e1',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(206, 189, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.16)',
  },
  aiBadgeText: {
    ...typography.labelSmall,
    color: ACCENT,
    fontSize: 9,
    textTransform: 'none',
  },
  /* ─── Search ─── */
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 8,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(30, 30, 30, 0.60)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    ...typography.body,
    fontFamily: 'Inter',
    color: colors.text,
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  searchClear: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchClearText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  scrollContent: {
    paddingTop: 14,
    paddingBottom: 48,
  },
  /* ─── Continue Reading ─── */
  continueSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  continueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(18, 18, 18, 0.60)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 14,
  },
  continueVisual: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBody: {
    flex: 1,
  },
  continueMeta: {
    ...typography.overline,
    color: ACCENT,
    fontSize: 9,
  },
  continueTitle: {
    ...typography.h3,
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
  },
  continueSub: {
    ...typography.caption,
    fontFamily: 'Inter',
    color: colors.textMuted,
    marginTop: 2,
  },
  /* ─── Sections ─── */
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    ...typography.h2,
    fontFamily: 'NotoSerifBold',
    fontStyle: 'italic',
    color: colors.text,
    fontSize: 22,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitleInline: {
    ...typography.h2,
    fontFamily: 'NotoSerifBold',
    fontStyle: 'italic',
    color: colors.text,
    fontSize: 22,
  },
  sectionCount: {
    ...typography.labelSmall,
    color: ACCENT,
    fontSize: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(206, 189, 255, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.18)',
  },
  /* ─── Originals (landscape 16:10) ─── */
  originalsRow: {
    paddingHorizontal: 20,
    gap: 16,
  },
  originalCard: {
    width: 300,
    aspectRatio: 16 / 10,
    borderRadius: 18,
    overflow: 'hidden',
  },
  originalCardImage: {
    width: '100%',
    height: '100%',
  },
  originalCardRadius: {
    borderRadius: 18,
  },
  originalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  originalBadge: {
    alignSelf: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: ACCENT,
  },
  originalBadgeText: {
    ...typography.labelSmall,
    color: '#381385',
    fontSize: 9,
  },
  originalCardInfo: {
    gap: 4,
  },
  originalCardGenre: {
    ...typography.overline,
    color: ACCENT,
    fontSize: 9,
  },
  originalCardTitle: {
    ...typography.h2,
    fontFamily: 'NotoSerifBold',
    fontStyle: 'italic',
    color: '#e5e2e1',
    fontSize: 16,
    lineHeight: 20,
  },
  /* ─── Trending (small 2:3 portrait) ─── */
  trendingRow: {
    paddingHorizontal: 20,
    gap: 14,
  },
  trendingCard: {
    width: 120,
    gap: 8,
  },
  trendingImageWrap: {
    position: 'relative',
    aspectRatio: 2 / 3,
    borderRadius: 14,
    overflow: 'hidden',
  },
  trendingImage: {
    width: '100%',
    height: '100%',
  },
  trendingCardRadius: {
    borderRadius: 14,
  },
  trendingHover: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    opacity: 0.7,
  },
  trendingHoverText: {
    ...typography.labelSmall,
    color: ACCENT,
    fontFamily: 'NotoSerifItalic',
    fontSize: 9,
  },
  trendingActiveDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: GOLD,
    borderWidth: 1.5,
    borderColor: '#0a0a0a',
  },
  trendingCardTitle: {
    ...typography.body,
    fontFamily: 'NotoSerifItalic',
    color: '#e5e2e1',
    fontSize: 11,
    lineHeight: 14,
  },
  trendingCardGenre: {
    ...typography.overline,
    color: colors.textMuted,
    fontSize: 7,
  },
  /* ─── Full catalog list ─── */
  allStoriesList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  allStoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 118,
    padding: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(18, 18, 18, 0.64)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  allStoryImageWrap: {
    width: 72,
    height: 96,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  allStoryImage: {
    width: '100%',
    height: '100%',
  },
  allStoryImageRadius: {
    borderRadius: 14,
  },
  allStoryBody: {
    flex: 1,
    minWidth: 0,
  },
  allStoryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 5,
  },
  allStoryGenre: {
    ...typography.overline,
    color: ACCENT,
    fontSize: 8,
    flex: 1,
  },
  allStoryPlan: {
    ...typography.labelSmall,
    color: '#381385',
    fontSize: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    backgroundColor: ACCENT,
    overflow: 'hidden',
  },
  allStoryPlanPremium: {
    color: '#1a0f04',
    backgroundColor: GOLD,
  },
  allStoryTitle: {
    ...typography.h3,
    fontFamily: 'NotoSerifBold',
    fontStyle: 'italic',
    color: '#e5e2e1',
    fontSize: 15,
    lineHeight: 19,
  },
  allStorySynopsis: {
    ...typography.caption,
    fontFamily: 'Inter',
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 5,
  },

  /* ─── Fallback art ─── */
  fallbackGlow: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    opacity: 0.12,
  },
  fallbackIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
    alignSelf: 'center',
  },
  fallbackTextOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 14,
    right: 14,
    gap: 4,
  },
  fallbackGenreText: {
    ...typography.overline,
    fontSize: 9,
  },
  fallbackTitleText: {
    ...typography.h3,
    fontFamily: 'NotoSerifBold',
    fontStyle: 'italic',
    color: '#e5e2e1',
    fontSize: 15,
    lineHeight: 19,
  },
  /* ─── Search empty state ─── */
  searchEmptyState: {
    paddingHorizontal: 20,
    paddingVertical: 32,
    alignItems: 'center',
    gap: 12,
  },
  searchEmptyTitle: {
    ...typography.h3,
    fontFamily: 'NotoSerifBold',
    fontStyle: 'italic',
    color: '#e5e2e1',
    fontSize: 18,
  },
  searchEmptyDesc: {
    ...typography.body,
    fontFamily: 'Inter',
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  searchEmptyClear: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(206, 189, 255, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.18)',
  },
  searchEmptyClearText: {
    ...typography.labelSmall,
    color: ACCENT,
    fontSize: 11,
    textTransform: 'none',
  },

  /* ─── Premium (horizontal, gold) ─── */
  premiumCard: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(18, 18, 18, 0.60)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    height: 110,
  },
  premiumImageWrap: {
    width: '33%',
    height: '100%',
  },
  premiumImage: {
    width: '100%',
    height: '100%',
  },
  premiumCardRadius: {
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  premiumBody: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  premiumTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  premiumTagText: {
    ...typography.overline,
    color: GOLD,
    fontSize: 8,
  },
  premiumCardTitle: {
    ...typography.h3,
    fontFamily: 'NotoSerifBold',
    fontStyle: 'italic',
    color: '#e5e2e1',
    fontSize: 15,
    lineHeight: 19,
  },
  premiumCardSynopsis: {
    ...typography.caption,
    fontFamily: 'Inter',
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 4,
  },
  /* ─── Bottom Sheet ─── */
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  sheetPanel: {
    backgroundColor: '#121212',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.10)',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginTop: 10,
    marginBottom: 6,
  },
  sheetHero: {
    aspectRatio: 16 / 10,
    width: '100%',
    position: 'relative',
  },
  sheetHeroImage: {
    width: '100%',
    height: '100%',
  },
  sheetHeroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sheetCloseBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.60)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  sheetCloseText: {
    color: '#e5e2e1',
    fontSize: 14,
  },
  sheetBody: {
    padding: 20,
    gap: 14,
  },
  sheetMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sheetGenrePill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(206, 189, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.16)',
  },
  sheetGenrePillPremium: {
    backgroundColor: 'rgba(255, 185, 95, 0.10)',
    borderColor: 'rgba(255, 185, 95, 0.25)',
  },
  sheetGenreText: {
    ...typography.overline,
    color: ACCENT,
    fontSize: 9,
  },
  sheetGenreTextPremium: {
    color: GOLD,
  },
  sheetPremiumIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 185, 95, 0.08)',
  },
  sheetPremiumText: {
    ...typography.labelSmall,
    color: GOLD,
    fontSize: 8,
    textTransform: 'none',
  },
  sheetStoryTitle: {
    ...typography.h1,
    fontFamily: 'NotoSerifBold',
    fontStyle: 'italic',
    color: '#e5e2e1',
    fontSize: 24,
    lineHeight: 30,
  },
  sheetSynopsis: {
    ...typography.body,
    fontFamily: 'Inter',
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  sheetStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: ACCENT,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  sheetStartText: {
    ...typography.label,
    color: '#381385',
    fontSize: 13,
  },
  sheetContinueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.20)',
    backgroundColor: 'rgba(206, 189, 255, 0.06)',
  },
  sheetContinueText: {
    ...typography.label,
    color: ACCENT,
    fontSize: 13,
  },
  sheetFooterNote: {
    ...typography.caption,
    fontFamily: 'Inter',
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: 10,
  },
  bottomSpacer: {
    height: 0,
  },
});
