import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { BookCheck, CheckCircle2, Play, Search } from 'lucide-react-native';
import { api } from '../../src/api/client';
import { ReadingSessionSummary, SessionListResponse, Story, StoryListResponse } from '../../src/api/types';
import { StateBlock } from '../../src/components/state-block';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';

type Filter = 'ALL' | 'CONTINUE' | 'PREMIUM' | 'FREE';

const filters: { id: Filter; label: string }[] = [
  { id: 'ALL', label: 'Tudo' },
  { id: 'CONTINUE', label: 'Continuar lendo' },
  { id: 'PREMIUM', label: 'Premium' },
  { id: 'FREE', label: 'Gratis' },
];

const ACCENT = '#CEBDFF';
const PANEL = '#15131B';
const PANEL_ALT = '#1B1824';
const SOFT_TEXT = '#B7AFC8';

const curatedCoverImages: Record<string, string> = {
  'O Último Trem': 'https://lh3.googleusercontent.com/aida-public/AB6AXuDgQ7acJ_9YHObe_C_H-4mPIFk7kQDxoexw_JWlfnO_Y_inNVQGJ5eYN6Ag5WTS0-dyVOYHs69O7ESaHDmAkkUg9RJkcfOFaSjniPWTHSdzTmlq_EPNaT_x3JzmeAl3KNtcY2QHr5NB8P5mgVUG-gJpUwbNeQEwHdP3AmE54_dJFYRljoyWT3MkKbDV7JuwwARkqMydnZ1R2VJp53CAm2BfFKT-HeNWrm6IHigFkQw-ZuY5-DdWoEOCa6fWt1lxQA29XSkEBZZAwUS2',
  'Noite de Halloween': 'https://lh3.googleusercontent.com/aida-public/AB6AXuBZnfa5Oh7XqFJZB_Kf2YyUVWWs-5dAoun-jL7sKendyMLqCLHdmADYOnhSuZyjARcORVS7KpD0BJScfjteiwsBafx6rNKYu4KJLYUdlcH30TpOdWotfJdpWqZBujho0anQcxamgweWNfs9eg-3svDQZUEbVAYJoWKGKiUikBh7bzW4b-_ZMORgUdtWGeN8vBPk-aKpk_qoIPymTDUzbCv8VwQQvMDBGYXuSE1IJkawOcx_ns6AH6g2U_tqG6feCYRK7NFMN5hHmqmc',
  'A Última Biblioteca': 'https://lh3.googleusercontent.com/aida-public/AB6AXuAfLscPlEzbDU0TsuAvcdiYL5zI1wPacI9XMlKaX0ctY-6JTzFrnPWimY29W6L5ymwGxSWn85ZV6OIduP12tEFOwobs8h-rgdr39UmFtU9g5Ar7NxL2rbBpG7gnQW1YlkUX7cep0N_Wz-HOgTWYue3J1eGtz2EpJtPqdGmUidIFOLmUVcsW-T_uEhBl8OolaitKe0u1IlJUmbA_RnAPTcTRkLLMZhCktqCknTZ03LbdqMDaeBYy-XvyE8_4GiUUWjZtq74KOWqL7iSF',
  'O Clube dos Mentirosos': 'https://lh3.googleusercontent.com/aida-public/AB6AXuDgQ7acJ_9YHObe_C_H-4mPIFk7kQDxoexw_JWlfnO_Y_inNVQGJ5eYN6Ag5WTS0-dyVOYHs69O7ESaHDmAkkUg9RJkcfOFaSjniPWTHSdzTmlq_EPNaT_x3JzmeAl3KNtcY2QHr5NB8P5mgVUG-gJpUwbNeQEwHdP3AmE54_dJFYRljoyWT3MkKbDV7JuwwARkqMydnZ1R2VJp53CAm2BfFKT-HeNWrm6IHigFkQw-ZuY5-DdWoEOCa6fWt1lxQA29XSkEBZZAwUS2',
  'Amor nas Estrelas': 'https://lh3.googleusercontent.com/aida-public/AB6AXuCalBEMdb2ZXJ1OnM1NjjrSHPxMh9NKFA3Nba6zcs3GFiL5t1i8AN90hFy94YkUNJY2hSIgyjfcrGMNjZvtOeT9pkBqXTcqNPFPj43YGtSEtxTev01g1olgGWgnxUrPNZwZcbRL5bEDRghY8rvtnEKFFMMfps17z6aPefqEVAdep_GkIk8OJBQsZ8N9y5fJKiF8VG0Er-_HlSWTp5mn_-51PmjYqp_xZchrbmTVwiItxru3kOTGfoymYTnzlB5bq_onf241oPTwsU3P',
  'O Enigma do Lighthouse': 'https://lh3.googleusercontent.com/aida-public/AB6AXuBZnfa5Oh7XqFJZB_Kf2YyUVWWs-5dAoun-jL7sKendyMLqCLHdmADYOnhSuZyjARcORVS7KpD0BJScfjteiwsBafx6rNKYu4KJLYUdlcH30TpOdWotfJdpWqZBujho0anQcxamgweWNfs9eg-3svDQZUEbVAYJoWKGKiUikBh7bzW4b-_ZMORgUdtWGeN8vBPk-aKpk_qoIPymTDUzbCv8VwQQvMDBGYXuSE1IJkawOcx_ns6AH6g2U_tqG6feCYRK7NFMN5hHmqmc',
};

export default function LibraryScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('ALL');

  const { data: stories = [], isLoading, error } = useQuery<Story[]>({
    queryKey: ['stories', filter],
    queryFn: async () => {
      const params =
        filter === 'PREMIUM'
          ? { isPremium: true }
          : filter === 'FREE'
            ? { isPremium: false }
            : undefined;
      const { data } = await api.get<StoryListResponse>('/library/stories', { params });
      return data.stories;
    },
  });

  const { data: activeSessions } = useQuery<ReadingSessionSummary[]>({
    queryKey: ['active-sessions-preview'],
    queryFn: async () => {
      const { data } = await api.get<SessionListResponse>('/reading/sessions', {
        params: { status: 'ACTIVE', limit: 2 },
      });
      return data.sessions;
    },
  });

  const featuredStory = useMemo(() => stories.find((story) => story.isPremium) || stories[0], [stories]);

  const originalStories = useMemo(() => {
    if (!stories.length) return [];
    const premiumFirst = stories.filter((story) => story.isPremium);
    const fallback = stories.filter((story) => !story.isPremium);
    return [...premiumFirst, ...fallback].slice(0, 4);
  }, [stories]);

  const communityStories = useMemo(() => {
    if (!stories.length) return [];
    const excluded = new Set(originalStories.map((story) => story.id));
    return stories.filter((story) => !excluded.has(story.id)).slice(0, 6);
  }, [originalStories, stories]);

  const trendingStories = useMemo(() => stories.slice(0, 6), [stories]);

  const premiumStories = useMemo(() => stories.filter((story) => story.isPremium).slice(0, 3), [stories]);

  const continueSession = activeSessions?.[0];

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
          title="Nao conseguimos carregar a biblioteca"
          description="Tente novamente em instantes para voltar a explorar historias, cenas e leituras."
          actionLabel="Tentar novamente"
          onAction={() => router.replace('/(tabs)/library')}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.brandGroup}>
          <BookCheck color={ACCENT} size={22} />
          <Text style={styles.brand}>Enredo.ai</Text>
        </View>
        <TouchableOpacity activeOpacity={0.8} style={styles.searchButton}>
          <Search color={SOFT_TEXT} size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroBlock}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>IA narrativa</Text>
            <Text style={styles.heroTitle}>Sua proxima historia comeca aqui.</Text>
            <Text style={styles.heroDescription}>
              Descubra originais Enredo.ai, historias da comunidade e cenas prontas para virar sua proxima leitura.
            </Text>
          </View>
          <View style={styles.memberBadge}>
            <CheckCircle2 color={colors.background} fill={ACCENT} size={14} />
            <Text style={styles.memberText}>MEMBRO FREE</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {filters.map((option) => (
            <TouchableOpacity
              key={option.id}
              activeOpacity={0.86}
              style={[styles.filterChip, filter === option.id && styles.filterChipActive]}
              onPress={() => setFilter(option.id)}
            >
              <Text style={[styles.filterChipText, filter === option.id && styles.filterChipTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {filter === 'CONTINUE' ? (
          <ContinueReadingCard
            session={continueSession}
            onPress={() => continueSession && router.push(`/reader/${continueSession.id}`)}
          />
        ) : (
          <>
            <SectionHeader title="Enredo.ai Originals" actionLabel="Ver tudo" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalCards}>
              {originalStories.map((story) => (
                <OriginalCard key={story.id} story={story} onPress={() => router.push(`/story/${story.id}`)} />
              ))}
            </ScrollView>

            {communityStories.length ? (
              <>
                <SectionHeader title="Comunidade" />
                <View style={styles.communityGrid}>
                  {communityStories.map((story) => (
                    <CommunityCard key={story.id} story={story} onPress={() => router.push(`/story/${story.id}`)} />
                  ))}
                </View>
              </>
            ) : null}

            {trendingStories.length ? (
              <>
                <SectionHeader title="Tendencias" />
                <FlatList
                  horizontal
                  data={trendingStories}
                  keyExtractor={(item) => item.id}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.trendingList}
                  renderItem={({ item }) => (
                    <TrendingCard story={item} onPress={() => router.push(`/story/${item.id}`)} />
                  )}
                />
              </>
            ) : null}

            {premiumStories.length ? (
              <>
                <SectionHeader title="Premium" />
                <View style={styles.premiumList}>
                  {premiumStories.map((story) => (
                    <PremiumCard key={story.id} story={story} onPress={() => router.push(`/story/${story.id}`)} />
                  ))}
                </View>
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function SectionHeader({ title, actionLabel }: { title: string; actionLabel?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel ? <Text style={styles.sectionAction}>{actionLabel}</Text> : null}
    </View>
  );
}

function OriginalCard({ story, onPress }: { story: Story; onPress: () => void }) {
  const image = getStoryImage(story);
  return (
    <TouchableOpacity activeOpacity={0.9} style={styles.originalCard} onPress={onPress}>
      {image ? (
        <ImageBackground source={{ uri: image }} style={styles.originalCardImage} imageStyle={styles.originalCardRadius}>
          <View style={styles.originalOverlay}>
            <View style={styles.originalTag}>
              <Text style={styles.originalTagText}>ORIGINAL</Text>
            </View>
            <View>
              <Text style={styles.originalGenre}>{(story.genres?.[0] || 'NARRATIVA').toUpperCase()}</Text>
              <Text style={styles.originalTitle} numberOfLines={2}>
                {story.title}
              </Text>
            </View>
          </View>
        </ImageBackground>
      ) : (
        <FallbackArt story={story} style={styles.originalCardImage}>
          <View style={styles.originalOverlay}>
            <View style={styles.originalTag}>
              <Text style={styles.originalTagText}>ORIGINAL</Text>
            </View>
            <View>
              <Text style={styles.originalGenre}>{(story.genres?.[0] || 'NARRATIVA').toUpperCase()}</Text>
              <Text style={styles.originalTitle} numberOfLines={2}>
                {story.title}
              </Text>
            </View>
          </View>
        </FallbackArt>
      )}
    </TouchableOpacity>
  );
}

function CommunityCard({ story, onPress }: { story: Story; onPress: () => void }) {
  const image = getStoryImage(story);
  return (
    <TouchableOpacity activeOpacity={0.88} style={styles.communityCard} onPress={onPress}>
      {image ? (
        <ImageBackground source={{ uri: image }} style={styles.communityImage} imageStyle={styles.communityRadius}>
          <StoryTypeBadge premium={story.isPremium} />
        </ImageBackground>
      ) : (
        <FallbackArt story={story} style={styles.communityImage}>
          <StoryTypeBadge premium={story.isPremium} />
        </FallbackArt>
      )}
      <View style={styles.communityBody}>
        <Text style={styles.communityGenre}>{story.genres?.[0] || 'Narrativa'}</Text>
        <Text style={styles.communityTitle} numberOfLines={2}>
          {story.title}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function TrendingCard({ story, onPress }: { story: Story; onPress: () => void }) {
  const image = getStoryImage(story);
  return (
    <TouchableOpacity activeOpacity={0.86} style={styles.trendingCard} onPress={onPress}>
      {image ? (
        <ImageBackground source={{ uri: image }} style={styles.trendingImage} imageStyle={styles.trendingRadius} />
      ) : (
        <FallbackArt story={story} style={styles.trendingImage} />
      )}
      <Text style={styles.trendingTitle} numberOfLines={1}>
        {story.title}
      </Text>
    </TouchableOpacity>
  );
}

function PremiumCard({ story, onPress }: { story: Story; onPress: () => void }) {
  const image = getStoryImage(story);
  return (
    <TouchableOpacity activeOpacity={0.88} style={styles.premiumCard} onPress={onPress}>
      {image ? (
        <ImageBackground source={{ uri: image }} style={styles.premiumImage} imageStyle={styles.premiumRadius} />
      ) : (
        <FallbackArt story={story} style={styles.premiumImage} />
      )}
      <View style={styles.premiumBody}>
        <Text style={styles.premiumEyebrow}>PREMIUM STORY</Text>
        <Text style={styles.premiumTitle} numberOfLines={2}>
          {story.title}
        </Text>
        <Text style={styles.premiumDescription} numberOfLines={2}>
          {story.synopsis}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function ContinueReadingCard({ session, onPress }: { session?: ReadingSessionSummary; onPress: () => void }) {
  if (!session) {
    return (
      <StateBlock
        title="Nenhuma leitura em andamento"
        description="Comece uma nova historia para ver suas leituras e cenas recentes aparecendo aqui."
      />
    );
  }

  return (
    <TouchableOpacity activeOpacity={0.9} style={styles.continueCard} onPress={onPress}>
      <View style={styles.continueVisual}>
        <Play color={colors.background} fill={ACCENT} size={28} />
      </View>
      <View style={styles.continueBody}>
        <Text style={styles.continueMeta}>Em progresso • Cena {session.currentSceneIndex + 1}</Text>
        <Text style={styles.continueTitle}>{session.storyTitle}</Text>
        <Text style={styles.continueDescription}>Toque para voltar ao ponto exato onde a narrativa ficou.</Text>
      </View>
    </TouchableOpacity>
  );
}

function StoryTypeBadge({ premium }: { premium: boolean }) {
  return (
    <View style={[styles.typeBadge, premium ? styles.typeBadgePremium : styles.typeBadgeFree]}>
      <Text style={styles.typeBadgeText}>{premium ? 'PREMIUM' : 'GRATIS'}</Text>
    </View>
  );
}

function FallbackArt({
  story,
  style,
  children,
}: {
  story: Story;
  style?: any;
  children?: React.ReactNode;
}) {
  const palette = getPalette(story);
  return (
    <View style={[style, styles.fallbackBase, { backgroundColor: palette[0] }]}>
      <View style={[styles.fallbackGlow, { backgroundColor: palette[2] }]} />
      <View style={[styles.fallbackAccent, { backgroundColor: palette[1] }]} />
      <Text style={[styles.fallbackMonogram, { color: palette[1] }]}>E</Text>
      {children}
    </View>
  );
}

function getStoryImage(story: Story): string | undefined {
  return story.coverUrl || story.coverImageUrl || curatedCoverImages[story.title];
}

function getPalette(story: Story): string[] {
  const text = `${story.title} ${story.synopsis} ${(story.genres || []).join(' ')}`.toLowerCase();
  if (containsAny(text, ['terror', 'horror', 'gótico', 'gotico', 'sombras'])) return ['#0E0A12', '#CFAFFF', '#47204E'];
  if (containsAny(text, ['romance', 'amor', 'paix'])) return ['#171018', '#E4B9D0', '#6D2C47'];
  if (containsAny(text, ['sci-fi', 'ficção', 'ficcao', 'cyber', 'neon'])) return ['#09131E', '#82D7FF', '#3B47A8'];
  if (containsAny(text, ['fantasia', 'reino', 'magia'])) return ['#0D1117', '#CEBDFF', '#413078'];
  return [PANEL, ACCENT, '#342459'];
}

function containsAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
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
  topBar: {
    height: 64,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(206, 189, 255, 0.12)',
    backgroundColor: 'rgba(10, 10, 12, 0.96)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontSize: 21,
  },
  searchButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  content: {
    paddingTop: 18,
    paddingBottom: 120,
  },
  heroBlock: {
    marginHorizontal: 16,
    paddingHorizontal: 24,
    paddingVertical: 24,
    marginBottom: 24,
    gap: 16,
    borderRadius: 30,
    backgroundColor: 'rgba(22, 20, 29, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.08)',
  },
  heroCopy: {
    gap: 12,
  },
  heroEyebrow: {
    ...typography.label,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(206, 189, 255, 0.1)',
    color: ACCENT,
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.16)',
  },
  heroTitle: {
    ...typography.h1,
    color: '#F5F1FF',
    fontSize: 38,
    lineHeight: 44,
  },
  heroDescription: {
    ...typography.body,
    color: SOFT_TEXT,
  },
  memberBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.14)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  memberText: {
    ...typography.label,
    color: '#F5F1FF',
    fontSize: 10,
  },
  filters: {
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 30,
  },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 999,
    backgroundColor: 'rgba(31, 28, 40, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.08)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(206, 189, 255, 0.14)',
    borderColor: 'rgba(206, 189, 255, 0.32)',
  },
  filterChipText: {
    ...typography.bodySmall,
    color: SOFT_TEXT,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: '#F6F1FF',
  },
  sectionHeader: {
    marginBottom: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...typography.h2,
    color: '#F5F1FF',
    fontSize: 24,
  },
  sectionAction: {
    ...typography.label,
    color: ACCENT,
  },
  horizontalCards: {
    paddingHorizontal: 20,
    gap: 16,
    marginBottom: 36,
  },
  originalCard: {
    width: 308,
    height: 188,
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.08)',
    backgroundColor: PANEL_ALT,
  },
  originalCardImage: {
    flex: 1,
  },
  originalCardRadius: {
    borderRadius: 26,
  },
  originalOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 18,
    backgroundColor: 'rgba(7, 7, 10, 0.32)',
  },
  originalTag: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(206, 189, 255, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  originalTagText: {
    ...typography.label,
    color: '#281A4B',
    fontSize: 9,
  },
  originalGenre: {
    ...typography.label,
    color: ACCENT,
    fontSize: 10,
    marginBottom: 6,
  },
  originalTitle: {
    ...typography.h2,
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  communityGrid: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 34,
  },
  communityCard: {
    width: '48%',
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: PANEL_ALT,
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.06)',
    marginBottom: 16,
  },
  communityImage: {
    height: 236,
    padding: 12,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  communityRadius: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  communityBody: {
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  communityGenre: {
    ...typography.label,
    color: SOFT_TEXT,
    fontSize: 9,
    marginBottom: 6,
  },
  communityTitle: {
    ...typography.h3,
    color: '#F4F0FF',
    fontSize: 17,
    lineHeight: 22,
  },
  trendingList: {
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 34,
  },
  trendingCard: {
    width: 148,
  },
  trendingImage: {
    width: 148,
    height: 214,
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 8,
  },
  trendingRadius: {
    borderRadius: 22,
  },
  trendingTitle: {
    ...typography.h3,
    color: '#F4F0FF',
    fontSize: 16,
    lineHeight: 20,
  },
  premiumList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  premiumCard: {
    minHeight: 138,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: PANEL_ALT,
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.08)',
    flexDirection: 'row',
  },
  premiumImage: {
    width: 124,
    minHeight: 138,
  },
  premiumRadius: {
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
  },
  premiumBody: {
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
    justifyContent: 'center',
  },
  premiumEyebrow: {
    ...typography.label,
    color: '#FFBF66',
    fontSize: 9,
    marginBottom: 5,
  },
  premiumTitle: {
    ...typography.h3,
    color: '#FFFFFF',
    fontSize: 17,
    lineHeight: 22,
    marginBottom: 5,
  },
  premiumDescription: {
    ...typography.bodySmall,
    color: SOFT_TEXT,
  },
  continueCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 26,
    padding: 18,
    backgroundColor: PANEL_ALT,
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  continueVisual: {
    width: 82,
    height: 82,
    borderRadius: 24,
    backgroundColor: 'rgba(206, 189, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBody: {
    flex: 1,
    gap: 4,
  },
  continueMeta: {
    ...typography.label,
    color: ACCENT,
    fontSize: 10,
  },
  continueTitle: {
    ...typography.h2,
    color: '#F5F1FF',
    fontSize: 22,
    lineHeight: 28,
  },
  continueDescription: {
    ...typography.body,
    color: SOFT_TEXT,
  },
  emptyPanel: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 22,
    borderRadius: 24,
    backgroundColor: PANEL_ALT,
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.08)',
    gap: 8,
  },
  emptyTitle: {
    ...typography.h3,
    color: '#F5F1FF',
  },
  emptyDescription: {
    ...typography.body,
    color: SOFT_TEXT,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  typeBadgePremium: {
    backgroundColor: '#FFBF66',
  },
  typeBadgeFree: {
    backgroundColor: 'rgba(0, 0, 0, 0.46)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  typeBadgeText: {
    ...typography.label,
    color: '#17120B',
    fontSize: 9,
  },
  fallbackBase: {
    overflow: 'hidden',
  },
  fallbackGlow: {
    position: 'absolute',
    right: -32,
    top: -10,
    width: 140,
    height: 140,
    borderRadius: 999,
    opacity: 0.35,
  },
  fallbackAccent: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: 20,
    height: 1,
    opacity: 0.5,
  },
  fallbackMonogram: {
    position: 'absolute',
    right: 16,
    bottom: 14,
    fontFamily: 'serif',
    fontSize: 72,
    opacity: 0.18,
    fontWeight: '700',
  },
  errorText: {
    ...typography.body,
    color: '#F5F1FF',
  },
});
