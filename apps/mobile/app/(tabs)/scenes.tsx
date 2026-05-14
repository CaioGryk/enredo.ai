import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bookmark, Flag, Heart, MessageCircle, Search, Send, Share2, X } from 'lucide-react-native';
import { api } from '../../src/api/client';
import { typography } from '../../src/theme/typography';
import { colors } from '../../src/theme/colors';
import { StateBlock } from '../../src/components/state-block';

const ACCENT = '#CEBDFF';
const TEXT = '#F5F1FF';
const SOFT_TEXT = '#B7AFC8';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FeedItem {
  id: string;
  storyId?: string | null;
  mediaType: string;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  textExcerpt?: string | null;
  title?: string | null;
  caption?: string | null;
  publishedAt?: string | null;
  likeCount?: number;
  saveCount?: number;
  shareCount?: number;
  commentCount?: number;
  story?: {
    id: string;
    title: string;
    coverUrl?: string | null;
    genres: string[];
  };
  user?: {
    id: string;
    name?: string | null;
  };
}

export default function ScenesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mutatingIds, setMutatingIds] = useState<Set<string>>(new Set());
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const { data: feedData, isLoading, isRefetching, error, refetch } = useQuery({
    queryKey: ['feed-scenes'],
    queryFn: async () => {
      const { data } = await api.get('/scene-media/feed');
      return data;
    },
  });

  const scenes: FeedItem[] = feedData?.data ?? [];

  const likeMutation = useMutation({
    mutationFn: async (sceneMediaId: string) => {
      if (likedIds.has(sceneMediaId)) {
        const { data } = await api.delete(`/scene-media/${sceneMediaId}/like`);
        return data;
      }
      const { data } = await api.post(`/scene-media/${sceneMediaId}/like`);
      return data;
    },
    onMutate: (id) => setMutatingIds((prev) => new Set(prev).add(id)),
    onSuccess: (_data, id) => {
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
    },
    onError: () => {
      Alert.alert('Erro', 'Não foi possível curtir. Tente novamente.');
    },
    onSettled: (_data, _error, id) => {
      setMutatingIds((prev) => {
        const next = new Set(prev);
        if (id) next.delete(id);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['feed-scenes'] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (sceneMediaId: string) => {
      if (savedIds.has(sceneMediaId)) {
        const { data } = await api.delete(`/scene-media/${sceneMediaId}/save`);
        return data;
      }
      const { data } = await api.post(`/scene-media/${sceneMediaId}/save`);
      return data;
    },
    onMutate: (id) => setMutatingIds((prev) => new Set(prev).add(id)),
    onSuccess: (_data, id) => {
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
    },
    onError: () => {
      Alert.alert('Erro', 'Não foi possível salvar. Tente novamente.');
    },
    onSettled: (_data, _error, id) => {
      setMutatingIds((prev) => {
        const next = new Set(prev);
        if (id) next.delete(id);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['feed-scenes'] });
    },
  });

  const shareMutation = useMutation({
    mutationFn: async (sceneMediaId: string) => {
      const { data } = await api.post(`/scene-media/${sceneMediaId}/share`);
      return data;
    },
    onMutate: (id) => setMutatingIds((prev) => new Set(prev).add(id)),
    onSuccess: async (_data, sceneMediaId) => {
      try {
        await Share.share({ message: `Veja esta cena no Enredo.ai` });
      } catch {}
    },
    onSettled: (_data, _error, id) => {
      setMutatingIds((prev) => {
        const next = new Set(prev);
        if (id) next.delete(id);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ['feed-scenes'] });
    },
    onError: () => {
      Alert.alert('Erro', 'Não foi possível compartilhar. Tente novamente.');
    },
  });

  const [commentingSceneId, setCommentingSceneId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  const commentsQuery = useQuery({
    queryKey: ['comments', commentingSceneId],
    queryFn: async () => {
      if (!commentingSceneId) return { data: [] };
      const { data } = await api.get(`/scene-media/${commentingSceneId}/comments`);
      return data;
    },
    enabled: !!commentingSceneId,
  });

  const commentMutation = useMutation({
    mutationFn: async () => {
      if (!commentingSceneId || !commentText.trim()) return;
      const { data } = await api.post(`/scene-media/${commentingSceneId}/comments`, { body: commentText.trim() });
      return data;
    },
    onSuccess: () => {
      setCommentText('');
      queryClient.invalidateQueries({ queryKey: ['comments', commentingSceneId] });
      queryClient.invalidateQueries({ queryKey: ['feed-scenes'] });
    },
    onError: () => {
      Alert.alert('Erro', 'Não foi possível enviar o comentário. Tente novamente.');
    },
  });

  const comments: any[] = commentsQuery.data?.data ?? [];

  const [reportTarget, setReportTarget] = useState<{ sceneMediaId?: string; commentId?: string; label: string } | null>(null);
  const [reportReason, setReportReason] = useState('');

  const reportMutation = useMutation({
    mutationFn: async () => {
      if (!reportTarget) return;
      if (reportTarget.sceneMediaId) {
        await api.post(`/scene-media/${reportTarget.sceneMediaId}/report`, { reason: reportReason.trim() });
      } else if (reportTarget.commentId) {
        await api.post(`/scene-media/comments/${reportTarget.commentId}/report`, { reason: reportReason.trim() });
      }
    },
    onSuccess: () => {
      setReportTarget(null);
      setReportReason('');
      Alert.alert('Denúncia enviada', 'Obrigado. Nossa equipe irá analisar.');
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message || 'Não foi possível enviar a denúncia.';
      Alert.alert('Erro', msg);
    },
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StateBlock
          fullScreen
          loading
          title="Carregando cenas"
          description="Buscando cenas aprovadas da comunidade."
        />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
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

  if (scenes.length === 0) {
    return (
      <View style={styles.container}>
        <StateBlock
          fullScreen
          title="Nenhuma cena ainda"
          description="Cenas aprovadas pela comunidade aparecerão aqui. Gere imagens das suas leituras e envie para análise."
          actionLabel="Ir para a galeria"
          onAction={() => router.push('/scene-media' as any)}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <FlatList
        data={scenes}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <SceneCard
            item={item}
            index={index}
            total={scenes.length}
            isMutating={mutatingIds.has(item.id)}
            isLiked={likedIds.has(item.id)}
            isSaved={savedIds.has(item.id)}
            onEnter={() => {
              if (item.storyId) {
                router.push(`/story/${item.storyId}` as any);
              }
            }}
            onLike={() => likeMutation.mutate(item.id)}
            onSave={() => saveMutation.mutate(item.id)}
            onShare={() => shareMutation.mutate(item.id)}
            onComment={() => {
              setCommentingSceneId(item.id);
              setCommentText('');
            }}
            onReportScene={() => {
              setReportTarget({ sceneMediaId: item.id, label: 'Denunciar cena' });
              setReportReason('');
            }}
          />
        )}
        pagingEnabled
        decelerationRate="fast"
        snapToInterval={SCREEN_HEIGHT}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={ACCENT} />}
      />

      <Modal visible={!!commentingSceneId} animationType="slide" transparent>
        <View style={styles.commentOverlay}>
          <View style={styles.commentPanel}>
            <View style={styles.commentHeader}>
              <TouchableOpacity onPress={() => setCommentingSceneId(null)}>
                <X color={colors.textMuted} size={20} />
              </TouchableOpacity>
              <Text style={styles.commentHeaderTitle}>Comentários</Text>
              <View style={{ width: 20 }} />
            </View>

            {commentsQuery.isLoading ? (
              <ActivityIndicator color={colors.primary} style={{ padding: 20 }} />
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(c) => c.id}
                renderItem={({ item: c }) => (
                  <View style={styles.commentItem}>
                    <Text style={styles.commentUser}>{c.user?.name || 'Autor'}</Text>
                    <Text style={styles.commentBody}>{c.body}</Text>
                  </View>
                )}
                style={styles.commentList}
                ListEmptyComponent={
                  <Text style={styles.commentEmpty}>Nenhum comentário ainda.</Text>
                }
              />
            )}

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <View style={styles.commentInputRow}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Escreva um comentário..."
                  placeholderTextColor={colors.textMuted}
                  value={commentText}
                  onChangeText={setCommentText}
                  maxLength={500}
                />
                <TouchableOpacity
                  style={[styles.commentSendButton, (!commentText.trim() || commentMutation.isPending) && styles.commentSendDisabled]}
                  onPress={() => commentMutation.mutate()}
                  disabled={!commentText.trim() || commentMutation.isPending}
                >
                  <Send color={commentText.trim() ? colors.primary : colors.textMuted} size={16} />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>

      <Modal visible={!!reportTarget} animationType="fade" transparent>
        <View style={styles.commentOverlay}>
          <View style={styles.commentPanel}>
            <View style={styles.commentHeader}>
              <TouchableOpacity onPress={() => setReportTarget(null)}>
                <X color={colors.textMuted} size={20} />
              </TouchableOpacity>
              <Text style={styles.commentHeaderTitle}>{reportTarget?.label || 'Denunciar'}</Text>
              <View style={{ width: 20 }} />
            </View>
            <View style={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: 20 }}>
              <Text style={styles.commentEmpty}>Descreva o motivo da denúncia (mín. 3 caracteres).</Text>
              <TextInput
                style={[styles.commentInput, { marginTop: 10 }]}
                placeholder="Motivo..."
                placeholderTextColor={colors.textMuted}
                value={reportReason}
                onChangeText={setReportReason}
                maxLength={500}
                multiline
              />
              <TouchableOpacity
                style={[styles.sendActionButton, (reportReason.trim().length < 3 || reportMutation.isPending) && { opacity: 0.4 }, { alignSelf: 'center', marginTop: 12 }]}
                onPress={() => reportMutation.mutate()}
                disabled={reportReason.trim().length < 3 || reportMutation.isPending}
              >
                <Text style={[styles.sendActionText, reportReason.trim().length < 3 && { color: colors.textMuted }]}>
                  {reportMutation.isPending ? 'Enviando...' : 'Enviar denúncia'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SceneCard({
  item,
  index,
  total,
  isMutating,
  isLiked,
  isSaved,
  onEnter,
  onLike,
  onSave,
  onShare,
  onComment,
  onReportScene,
}: {
  item: FeedItem;
  index: number;
  total: number;
  isMutating: boolean;
  isLiked: boolean;
  isSaved: boolean;
  onEnter: () => void;
  onLike: () => void;
  onSave: () => void;
  onShare: () => void;
  onComment: () => void;
  onReportScene: () => void;
}) {
  const [imageError, setImageError] = useState(false);
  const imageSource = imageError
    ? null
    : item.imageUrl
      ? { uri: item.imageUrl }
    : item.thumbnailUrl
      ? { uri: item.thumbnailUrl }
      : item.story?.coverUrl
        ? { uri: item.story.coverUrl }
        : null;

  const displayTitle = item.title || item.story?.title || 'Cena sem título';
  const displayCaption = item.caption || item.textExcerpt || '';
  const genres = item.story?.genres ?? [];
  const userName = item.user?.name || 'Autor';

  return (
    <View style={styles.page}>
      {imageSource ? (
        <ImageBackground
          source={imageSource}
          style={styles.video}
          imageStyle={styles.videoImage}
          onError={() => setImageError(true)}
        >
          <BackgroundOverlay item={item} displayTitle={displayTitle} displayCaption={displayCaption} genres={genres} userName={userName} index={index} total={total} isMutating={isMutating} isLiked={isLiked} isSaved={isSaved} onEnter={onEnter} onLike={onLike} onSave={onSave} onShare={onShare} onComment={onComment} onReportScene={onReportScene} />
        </ImageBackground>
      ) : (
        <View style={[styles.video, styles.videoPlaceholder]}>
          <BackgroundOverlay item={item} displayTitle={displayTitle} displayCaption={displayCaption} genres={genres} userName={userName} index={index} total={total} isMutating={isMutating} isLiked={isLiked} isSaved={isSaved} onEnter={onEnter} onLike={onLike} onSave={onSave} onShare={onShare} onComment={onComment} onReportScene={onReportScene} />
        </View>
      )}
    </View>
  );
}

function BackgroundOverlay({
  item,
  displayTitle,
  displayCaption,
  genres,
  userName,
  index,
  total,
  isMutating,
  isLiked,
  isSaved,
  onEnter,
  onLike,
  onSave,
  onShare,
  onComment,
  onReportScene,
}: {
  item: FeedItem;
  displayTitle: string;
  displayCaption: string;
  genres: string[];
  userName: string;
  index: number;
  total: number;
  isMutating: boolean;
  isLiked: boolean;
  isSaved: boolean;
  onEnter: () => void;
  onLike: () => void;
  onSave: () => void;
  onShare: () => void;
  onComment: () => void;
  onReportScene: () => void;
}) {
  return (
    <>
      <View style={styles.videoTint} />
      <View style={styles.videoShadeTop} />
      <View style={styles.videoShadeBottom} />

      <View style={styles.topOverlay}>
        <View>
          <Text style={styles.brand}>Enredo.ai</Text>
          <Text style={styles.topHint}>Cenas</Text>
        </View>
        <View style={styles.topActions}>
          {genres.length > 0 ? (
            <View style={styles.genrePill}>
              <Text style={styles.genrePillText}>{genres[0]}</Text>
            </View>
          ) : null}
          <View style={styles.sceneCounter}>
            <Text style={styles.sceneCounterText}>{index + 1}/{total}</Text>
          </View>
          <Search color={TEXT} size={18} />
          <TouchableOpacity onPress={onReportScene}>
            <Flag color={colors.textMuted} size={16} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.rightRail}>
        <RailButton icon={<Heart color={isLiked ? ACCENT : TEXT} size={16} fill={isLiked ? ACCENT : 'none'} />} label={item.likeCount != null ? formatCount(item.likeCount) : undefined} disabled={isMutating} onPress={onLike} />
        <RailButton icon={<MessageCircle color={TEXT} size={16} />} label={item.commentCount != null ? formatCount(item.commentCount) : undefined} onPress={onComment} />
        <RailButton icon={<Bookmark color={isSaved ? ACCENT : TEXT} size={16} fill={isSaved ? ACCENT : 'none'} />} label={item.saveCount != null ? formatCount(item.saveCount) : undefined} disabled={isMutating} onPress={onSave} />
        <RailButton icon={<Share2 color={TEXT} size={16} />} label={item.shareCount != null ? formatCount(item.shareCount) : undefined} disabled={isMutating} onPress={onShare} />
      </View>

      <View style={styles.bottomOverlay}>
        <View style={styles.metaRow}>
          <View style={styles.accessPill}>
            <Text style={styles.accessPillText}>Enredo</Text>
          </View>
          {genres.slice(0, 2).map((g, i) => (
            <React.Fragment key={g}>
              {i > 0 ? <Text style={styles.dot}>•</Text> : null}
              <Text style={styles.genreText}>{g}</Text>
            </React.Fragment>
          ))}
        </View>
        <Text style={styles.title}>{displayTitle}</Text>
        <View style={styles.creatorRow}>
          <View style={styles.creatorAvatar}>
            <Text style={styles.creatorInitial}>{userName.slice(0, 1).toUpperCase()}</Text>
          </View>
          <Text style={styles.creator}>{userName}</Text>
        </View>
        {displayCaption ? (
          <Text style={styles.caption} numberOfLines={2}>{displayCaption}</Text>
        ) : null}

        {item.storyId ? (
          <TouchableOpacity style={styles.enterButton} onPress={onEnter}>
            <Text style={styles.enterButtonText}>Entrar nesta história</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </>
  );
}

function RailButton({ icon, label, disabled, onPress }: { icon: React.ReactNode; label?: string; disabled?: boolean; onPress?: () => void }) {
  return (
    <TouchableOpacity style={styles.railButton} onPress={onPress} disabled={disabled || !onPress}>
      <View style={styles.railIcon}>{icon}</View>
      {label ? <Text style={styles.railLabel}>{label}</Text> : null}
    </TouchableOpacity>
  );
}

function formatCount(n: number): string {
  if (n >= 1000) return `${Math.floor(n / 100) / 10}k`;
  return String(n);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  page: {
    height: SCREEN_HEIGHT,
    backgroundColor: colors.background,
  },
  video: {
    flex: 1,
    justifyContent: 'space-between',
  },
  videoImage: {
    resizeMode: 'cover',
  },
  videoPlaceholder: {
    backgroundColor: '#15131B',
  },
  videoTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 7, 11, 0.18)',
  },
  videoShadeTop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
    height: 180,
  },
  videoShadeBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 280,
    backgroundColor: 'rgba(0,0,0,0.34)',
  },
  topOverlay: {
    paddingTop: 58,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brand: {
    ...typography.h3,
    color: ACCENT,
    fontStyle: 'italic',
    fontSize: 18,
  },
  topHint: {
    ...typography.label,
    color: 'rgba(245,241,255,0.70)',
    fontSize: 8,
    marginTop: 3,
  },
  genrePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(9,10,14,0.32)',
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(245,241,255,0.10)',
  },
  genrePillText: {
    ...typography.label,
    color: TEXT,
    fontSize: 8,
  },
  sceneCounter: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(9,10,14,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(245,241,255,0.08)',
  },
  sceneCounterText: {
    ...typography.label,
    color: TEXT,
    fontSize: 8,
  },
  rightRail: {
    position: 'absolute',
    right: 14,
    bottom: 166,
    gap: 10,
    alignItems: 'center',
  },
  railButton: {
    alignItems: 'center',
    gap: 3,
  },
  railIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(9,10,14,0.24)',
    borderWidth: 1,
    borderColor: 'rgba(245,241,255,0.10)',
  },
  railLabel: {
    ...typography.bodySmall,
    color: TEXT,
    fontSize: 10,
    fontWeight: '700',
  },
  bottomOverlay: {
    paddingHorizontal: 18,
    paddingBottom: 34,
    paddingTop: 16,
    gap: 7,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accessPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: ACCENT,
    borderRadius: 999,
    overflow: 'hidden',
  },
  accessPillText: {
    ...typography.label,
    fontSize: 8,
    color: '#2F1561',
  },
  genreText: {
    ...typography.bodySmall,
    color: SOFT_TEXT,
    fontSize: 10,
  },
  dot: {
    color: 'rgba(245,241,255,0.5)',
    fontSize: 10,
  },
  title: {
    ...typography.h3,
    color: TEXT,
    fontSize: 18,
    lineHeight: 22,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  creatorAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(206, 189, 255, 0.22)',
  },
  creatorInitial: {
    ...typography.label,
    color: '#1F113D',
    fontSize: 8,
  },
  creator: {
    ...typography.bodySmall,
    color: ACCENT,
    fontWeight: '700',
    fontSize: 11,
  },
  caption: {
    ...typography.bodySmall,
    color: TEXT,
    lineHeight: 18,
    fontSize: 12,
    maxWidth: '76%',
  },
  enterButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(206, 189, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.40)',
  },
  enterButtonText: {
    ...typography.label,
    color: TEXT,
    fontSize: 9,
  },
  commentOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  commentPanel: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  commentHeaderTitle: {
    ...typography.label,
    color: colors.text,
    fontSize: 13,
  },
  commentList: {
    paddingHorizontal: 18,
  },
  commentItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
    gap: 4,
  },
  commentUser: {
    ...typography.label,
    color: colors.primary,
    fontSize: 10,
  },
  commentBody: {
    ...typography.bodySmall,
    color: colors.text,
    lineHeight: 18,
  },
  commentEmpty: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  commentInput: {
    flex: 1,
    ...typography.bodySmall,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 42,
  },
  commentSendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(206, 189, 255, 0.10)',
  },
  commentSendDisabled: {
    opacity: 0.4,
  },
  sendActionButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sendActionText: {
    ...typography.label,
    color: colors.primary,
    fontSize: 10,
  },
});
