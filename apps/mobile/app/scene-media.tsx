import React, { useMemo } from 'react';
import {
  Alert,
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ArrowLeft, Clock, Image as ImageIcon, Send, ShieldCheck, ShieldX, Video } from 'lucide-react-native';
import { api } from '../src/api/client';
import { SceneMedia } from '../src/api/types';
import { StateBlock } from '../src/components/state-block';
import { colors } from '../src/theme/colors';
import { typography } from '../src/theme/typography';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_GAP = 10;
const CARD_WIDTH = (SCREEN_WIDTH - 40 - CARD_GAP) / 2;

export default function SceneMediaGalleryScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: mediaItems = [], isLoading, error, refetch } = useQuery<SceneMedia[]>({
    queryKey: ['scene-media-gallery'],
    queryFn: async () => {
      const { data } = await api.get('/scene-media/my');
      return Array.isArray(data) ? data : [];
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (sceneMediaId: string) => {
      const { data } = await api.post(`/scene-media/${sceneMediaId}/submit`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scene-media-gallery'] });
      Alert.alert('Enviado', 'Sua cena foi enviada para análise e será revisada pela moderação.', [
        { text: 'OK', style: 'default' },
      ]);
    },
    onError: (e: any) => {
      const message = e?.response?.data?.message || 'Não foi possível enviar para análise.';
      Alert.alert('Erro ao enviar', message, [{ text: 'OK', style: 'default' }]);
    },
  });

  const imageItems = useMemo(
    () => mediaItems.filter((m) => m.imageUrl),
    [mediaItems],
  );

  const videoItems = useMemo(
    () => mediaItems.filter((m) => m.mediaType === 'VIDEO'),
    [mediaItems],
  );

  function handleSubmit(sceneMediaId: string) {
    const item = mediaItems.find((m) => m.id === sceneMediaId);
    if (!item) return;

    Alert.alert(
      'Enviar para análise',
      'Sua cena será enviada para revisão antes de aparecer no feed público. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar',
          onPress: () => {
            submitMutation.mutate(sceneMediaId);
          },
        },
      ],
    );
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Header onBack={() => router.back()} />
        <StateBlock
          fullScreen
          loading
          title="Carregando galeria"
          description="Buscando suas imagens e vídeos de cena."
        />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Header onBack={() => router.back()} />
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

  return (
    <View style={styles.container}>
      <Header onBack={() => router.back()} />

      <FlatList
        data={imageItems}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={styles.columnWrapper}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>Imagens geradas</Text>
            <Text style={styles.sectionSubtitle}>
              {imageItems.length === 0
                ? 'Nenhuma imagem gerada ainda. Gere imagens a partir das suas cenas de leitura.'
                : `${imageItems.length} imagem${imageItems.length > 1 ? 'ns' : ''} na sua galeria`}
            </Text>
            {videoItems.length > 0 ? (
              <Text style={styles.videoNote}>
                {videoItems.length} vídeo{videoItems.length > 1 ? 's' : ''} — disponível em breve.
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <ImageIcon color={colors.textMuted} size={48} />
            <Text style={styles.emptyTitle}>Nenhuma imagem ainda</Text>
            <Text style={styles.emptyDescription}>
              Entre em uma leitura e gere imagens a partir das cenas da sua história.
            </Text>
            <TouchableOpacity
              style={styles.emptyAction}
              onPress={() => router.replace('/(tabs)/library')}
            >
              <Text style={styles.emptyActionText}>Ir para biblioteca</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <GalleryCard
            item={item}
            onPressSubmit={() => handleSubmit(item.id)}
            isSubmitting={submitMutation.isPending}
          />
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
        <Text style={styles.headerTitle}>Galeria de Cenas</Text>
      </View>
      <View style={styles.iconButton} />
    </View>
  );
}

function GalleryCard({
  item,
  onPressSubmit,
  isSubmitting,
}: {
  item: SceneMedia;
  onPressSubmit?: () => void;
  isSubmitting?: boolean;
}) {
  const isEligible =
    item.moderationStatus === 'NOT_SUBMITTED' && !!item.imageUrl;
  const isPending = item.moderationStatus === 'PENDING';
  const isApproved = item.moderationStatus === 'APPROVED';
  const isRejected = item.moderationStatus === 'REJECTED';

  return (
    <View style={styles.card}>
      <View style={styles.cardImageWrapper}>
        <Image
          source={{ uri: item.imageUrl! }}
          style={styles.cardImage}
          resizeMode="cover"
        />
        <View style={styles.cardImageOverlay}>
          {item.mediaType === 'VIDEO' ? (
            <View style={styles.cardTypeBadge}>
              <Video color={colors.textMuted} size={10} />
              <Text style={styles.cardTypeText}>Em breve</Text>
            </View>
          ) : (
            <View style={styles.cardTypeBadge}>
              <ImageIcon color={colors.primary} size={10} />
              <Text style={[styles.cardTypeText, styles.cardTypeTextActive]}>Imagem</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.cardFooter}>
        {isApproved ? (
          <View style={styles.statusRow}>
            <ShieldCheck color={colors.success} size={11} />
            <Text style={[styles.statusText, styles.statusTextApproved]}>Aprovada</Text>
          </View>
        ) : isRejected ? (
          <View style={styles.statusRow}>
            <ShieldX color={colors.error} size={11} />
            <Text style={[styles.statusText, styles.statusTextRejected]}>Rejeitada</Text>
          </View>
        ) : isPending ? (
          <View style={styles.statusRow}>
            <Clock color={colors.textMuted} size={11} />
            <Text style={styles.statusText}>Em análise</Text>
          </View>
        ) : isEligible ? (
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={onPressSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <>
                <Send color={colors.primary} size={11} />
                <Text style={styles.submitButtonText}>Publicar</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.statusRow}>
            <Text style={styles.statusText}>Privada</Text>
          </View>
        )}
      </View>

      {item.textExcerpt ? (
        <Text style={styles.cardCaption} numberOfLines={2}>
          {item.textExcerpt}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    height: 78,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
  headerTitleRow: {
    alignItems: 'center',
    gap: 2,
  },
  brand: {
    ...typography.h3,
    color: colors.primary,
    fontStyle: 'italic',
    fontSize: 18,
    lineHeight: 20,
  },
  headerTitle: {
    ...typography.bodySmall,
    color: colors.text,
    fontSize: 12,
  },
  gridContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  columnWrapper: {
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },
  listHeader: {
    paddingTop: 22,
    paddingBottom: 18,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    fontSize: 18,
    marginBottom: 4,
  },
  sectionSubtitle: {
    ...typography.bodySmall,
    color: colors.textMuted,
    lineHeight: 18,
  },
  videoNote: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: 6,
    fontStyle: 'italic',
    fontSize: 11,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardImageWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImageOverlay: {
    position: 'absolute',
    bottom: 6,
    left: 6,
  },
  cardTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cardTypeText: {
    ...typography.label,
    color: colors.textMuted,
    fontSize: 8,
  },
  cardTypeTextActive: {
    color: colors.primary,
  },
  cardCaption: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 14,
    marginTop: 8,
    paddingHorizontal: 2,
  },
  cardFooter: {
    marginTop: 8,
    paddingHorizontal: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    ...typography.label,
    color: colors.textMuted,
    fontSize: 9,
  },
  statusTextApproved: {
    color: colors.success,
  },
  statusTextRejected: {
    color: colors.error,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.20)',
    backgroundColor: 'rgba(206, 189, 255, 0.08)',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    ...typography.label,
    color: colors.primary,
    fontSize: 9,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    fontSize: 16,
    marginTop: 8,
  },
  emptyDescription: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyAction: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.12)',
    backgroundColor: colors.surface,
  },
  emptyActionText: {
    ...typography.label,
    color: colors.primary,
    fontSize: 11,
  },
});
