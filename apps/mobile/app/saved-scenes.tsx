import React from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { goBackSafe } from '../src/utils/navigation-helper';
import { ArrowLeft, Bookmark, Image as ImageIcon } from 'lucide-react-native';
import { api, resolveApiAssetUrl } from '../src/api/client';
import { typography } from '../src/theme/typography';
import { colors } from '../src/theme/colors';
import { StateBlock } from '../src/components/state-block';

const CARD_GAP = 10;
const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = (SCREEN_WIDTH - 40 - CARD_GAP) / 2;

interface SavedItem {
  id: string;
  storyId?: string | null;
  mediaType: string;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  textExcerpt?: string | null;
  title?: string | null;
  caption?: string | null;
  likeCount?: number;
  saveCount?: number;
  story?: { id: string; title: string; coverUrl?: string | null; genres: string[] };
  user?: { id: string; name?: string | null };
}

export default function SavedScenesScreen() {
  const router = useRouter();

  const { data: feedData, isLoading, isRefetching, error, refetch } = useQuery({
    queryKey: ['saved-scenes'],
    queryFn: async () => {
      const { data } = await api.get('/scene-media/saved');
      return data;
    },
  });

  const items: SavedItem[] = feedData?.data ?? [];

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Header onBack={() => goBackSafe('/(tabs)/scenes')} />
        <StateBlock fullScreen loading title="Carregando cenas salvas" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Header onBack={() => goBackSafe('/(tabs)/scenes')} />
        <StateBlock fullScreen title="Não foi possível carregar" description="Verifique sua conexão." actionLabel="Tentar novamente" onAction={() => refetch()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <Header onBack={() => goBackSafe('/(tabs)/scenes')} />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={styles.columnWrapper}
        removeClippedSubviews
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>Cenas salvas</Text>
            <Text style={styles.sectionSubtitle}>
              {items.length === 0 ? 'Nenhuma cena salva ainda.' : `${items.length} cena${items.length > 1 ? 's' : ''} salva${items.length > 1 ? 's' : ''}`}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Bookmark color={colors.textMuted} size={48} />
            <Text style={styles.emptyTitle}>Nenhuma cena salva</Text>
            <Text style={styles.emptyDescription}>Salve cenas do feed para encontrá-las aqui.</Text>
              <TouchableOpacity style={styles.emptyAction} onPress={() => router.push('/(tabs)/scenes' as any)}>
              <Text style={styles.emptyActionText}>Ver feed</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => {
              if (item.storyId) router.push(`/story/${item.storyId}` as any);
            }}
          >
            <View style={styles.cardImageWrapper}>
              {resolveApiAssetUrl(item.imageUrl || item.thumbnailUrl || item.story?.coverUrl) ? (
                <Image source={{ uri: resolveApiAssetUrl(item.imageUrl || item.thumbnailUrl || item.story?.coverUrl)! }} style={styles.cardImage} resizeMode="cover" />
              ) : (
                <View style={styles.cardPlaceholder}>
                  <ImageIcon color={colors.textMuted} size={24} />
                </View>
              )}
            </View>
            {item.textExcerpt ? (
              <Text style={styles.cardCaption} numberOfLines={2}>{item.textExcerpt}</Text>
            ) : null}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.iconButton} onPress={onBack}>
        <ArrowLeft color={colors.textMuted} size={24} />
      </TouchableOpacity>
      <View style={styles.headerTitleRow}>
        <Text style={styles.brand}>Enredo.ai</Text>
        <Text style={styles.headerTitle}>Cenas Salvas</Text>
      </View>
      <View style={styles.iconButton} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    height: 78, paddingHorizontal: 18,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: 'rgba(10, 10, 12, 0.96)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitleRow: { alignItems: 'center', gap: 2 },
  brand: { ...typography.h3, color: colors.primary, fontStyle: 'italic', fontSize: 18, lineHeight: 20 },
  headerTitle: { ...typography.bodySmall, color: colors.text, fontSize: 12 },
  gridContent: { paddingHorizontal: 20, paddingBottom: 40 },
  columnWrapper: { gap: CARD_GAP, marginBottom: CARD_GAP },
  listHeader: { paddingTop: 22, paddingBottom: 18 },
  sectionTitle: { ...typography.h3, color: colors.text, fontSize: 18, marginBottom: 4 },
  sectionSubtitle: { ...typography.bodySmall, color: colors.textMuted, lineHeight: 18 },
  card: { width: CARD_WIDTH, borderRadius: 16, overflow: 'hidden' },
  cardImageWrapper: { width: '100%', aspectRatio: 16 / 9, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.surface },
  cardImage: { width: '100%', height: '100%' },
  cardPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  cardCaption: { ...typography.bodySmall, color: colors.textMuted, fontSize: 10, lineHeight: 14, marginTop: 8, paddingHorizontal: 2 },
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24, gap: 10 },
  emptyTitle: { ...typography.h3, color: colors.text, fontSize: 16, marginTop: 8 },
  emptyDescription: { ...typography.bodySmall, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
  emptyAction: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(206, 189, 255, 0.12)', backgroundColor: colors.surface },
  emptyActionText: { ...typography.label, color: colors.primary, fontSize: 11 },
});
