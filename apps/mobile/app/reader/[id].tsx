import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Bookmark,
  ChevronRight,
  Coins,
  Image as ImageIcon,
  Info,
  Lock,
  PenTool,
  Sparkles,
  Video,
} from 'lucide-react-native';
import { api } from '../../src/api/client';
import { AIModel, AIModelsResponse, ReadingStatusResponse, SceneMedia } from '../../src/api/types';
import { StateBlock } from '../../src/components/state-block';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { handleReadingError, READING_ERROR_CODES } from '../../src/utils/reading-error-helper';

export default function ReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const scrollViewRef = useRef<ScrollView>(null);
  const [freeText, setFreeText] = useState('');
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isCreatingMedia, setIsCreatingMedia] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const { data: readingStatus, isLoading: sessionLoading, isError: sessionError, error: sessionQueryError, refetch: sessionRefetch } = useQuery<ReadingStatusResponse>({
    queryKey: ['session', id],
    queryFn: async () => {
      const { data } = await api.get(`/reading/sessions/${id}`);
      return data;
    },
    enabled: Boolean(id),
  });

  const { data: modelsResponse } = useQuery<AIModelsResponse>({
    queryKey: ['models'],
    queryFn: async () => {
      const { data } = await api.get('/ai/models');
      return data;
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ action, actionType }: { action: string; actionType: string }) => {
      const isCinematic = selectedModel ? selectedModel.creditCost > 0 : false;
      const payload: { action: string; actionType: string; modelId?: string; mode?: string } = { action, actionType };
      if (selectedModelId) payload.modelId = selectedModelId;
      if (isCinematic) payload.mode = 'cinematic';
      const { data } = await api.post(`/reading/sessions/${id}/action`, payload);
      return data;
    },
    onSuccess: () => {
      setFreeText('');
      queryClient.invalidateQueries({ queryKey: ['session', id] });
    },
    onError: (e: any) => {
      handleReadingError(e);
    },
  });

  const session = readingStatus?.session;
  const usage = readingStatus?.usage;
  const currentScene = session?.currentScene;

  const currentSceneId = currentScene?.id;

  useEffect(() => {
    setGeneratedImageUrl(null);
  }, [currentSceneId]);

  const sceneMediaQuery = useQuery<SceneMedia | null>({
    queryKey: ['scene-media', currentSceneId],
    queryFn: async () => {
      if (!currentSceneId) return null;
      try {
        const { data } = await api.get(`/scene-media/my?visibility=PRIVATE`);
        const mediaList: SceneMedia[] = Array.isArray(data) ? data : (data?.data ?? data?.sceneMedia ?? []);
        const existing = mediaList.find((m) => m.narrativeEventId === currentSceneId);
        if (existing) {
          if (existing.imageUrl) setGeneratedImageUrl(existing.imageUrl);
          return existing;
        }
        return null;
      } catch {
        return null;
      }
    },
    enabled: Boolean(currentSceneId),
  });

  const generateImageMutation = useMutation({
    mutationFn: async () => {
      if (!id || !currentSceneId) throw new Error('No current scene');

      if (sceneMediaQuery.data?.imageUrl) {
        return sceneMediaQuery.data;
      }

      let sceneMediaId = sceneMediaQuery.data?.id;

      if (!sceneMediaId) {
        setIsCreatingMedia(true);
        try {
          const { data: created } = await api.post(`/scene-media/from-event/${currentSceneId}`);
          sceneMediaId = created.id;
        } catch (createErr: any) {
          if (createErr?.response?.status === 409) {
            try {
              const { data: listRes } = await api.get(`/scene-media/my`);
              const mediaList: SceneMedia[] = Array.isArray(listRes) ? listRes : (listRes?.data ?? listRes?.sceneMedia ?? []);
              const existing = mediaList.find((m: SceneMedia) => m.narrativeEventId === currentSceneId);
              if (existing?.id) {
                sceneMediaId = existing.id;
                if (existing.imageUrl) {
                  setGeneratedImageUrl(existing.imageUrl);
                  return existing;
                }
              }
            } catch {
              throw createErr;
            }
          } else {
            throw createErr;
          }
        } finally {
          setIsCreatingMedia(false);
        }
      }

      if (sceneMediaQuery.data?.imageUrl && !sceneMediaId) {
        return sceneMediaQuery.data;
      }

      setIsGeneratingImage(true);
      try {
        const { data: result } = await api.post(`/scene-media/${sceneMediaId}/generate-image`);
        if (result?.imageUrl) setGeneratedImageUrl(result.imageUrl);
        queryClient.invalidateQueries({ queryKey: ['scene-media', currentSceneId] });
        queryClient.invalidateQueries({ queryKey: ['scene-media-gallery'] });
        queryClient.invalidateQueries({ queryKey: ['session', id] });
        return result;
      } finally {
        setIsGeneratingImage(false);
      }
    },
    onError: (e: any) => {
      const errorCode = e?.response?.data?.error;
      if (errorCode === 'INSUFFICIENT_CREDITS') {
        Alert.alert(
          'Créditos insuficientes',
          'Você não tem créditos suficientes para gerar esta imagem de cena.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Comprar créditos', onPress: () => router.push('/(tabs)/upgrade') },
          ],
        );
        return;
      }
      const message = e?.response?.data?.message || 'Falha ao gerar imagem da cena.';
      Alert.alert('Geração indisponível', message, [{ text: 'OK', style: 'default' }]);
    },
  });

  const history = useMemo(
    () => [...(session?.history || [])].sort((a, b) => a.sceneIndex - b.sceneIndex),
    [session?.history],
  );
  const models = modelsResponse?.models ?? [];
  const selectedModel = selectedModelId ? models.find((model) => model.id === selectedModelId) : null;
  const defaultModel = models.find((model) => model.id === modelsResponse?.defaultModelId);
  const activeModel = selectedModel || defaultModel || models[0];
  const isGenerating = actionMutation.isPending || isCreatingMedia || isGeneratingImage;
  const creditsModel = useMemo(() => models.find((m) => m.creditCost > 0 && m.available), [models]);

  const narrativeBlocks = useMemo(() => {
    const blocks = currentScene?.sceneText
      ? currentScene.sceneText.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean)
      : [];
    return blocks.length > 0 ? blocks : ['A história ainda está preparando a próxima cena.'];
  }, [currentScene?.sceneText]);

  function sendAction(action: string, actionType: string) {
    if (!action.trim() || isGenerating) return;
    actionMutation.mutate({ action: action.trim(), actionType });
  }

  if (sessionLoading) {
    return (
      <View style={styles.container}>
        <StateBlock
          fullScreen
          loading
          title="Carregando sua leitura"
          description="Estamos recuperando cena atual, histórico recente e configuração do modelo."
        />
      </View>
    );
  }

  if (sessionError || !session) {
    const isNotFound = (sessionQueryError as any)?.response?.data?.error === READING_ERROR_CODES.READING_SESSION_NOT_FOUND;
    return (
      <View style={styles.container}>
        <View style={styles.errorBlock}>
          <StateBlock
            fullScreen
            title={isNotFound ? 'Sessão não encontrada' : 'Não foi possível carregar esta leitura'}
            description={isNotFound ? 'Esta sessão de leitura não existe ou foi removida.' : 'Verifique sua conexão e tente novamente.'}
            actionLabel="Voltar para biblioteca"
            onAction={() => router.replace('/(tabs)/library')}
          />
          {!isNotFound ? (
            <TouchableOpacity style={styles.errorRetryButton} onPress={() => sessionRefetch()}>
              <Text style={styles.errorRetryButtonText}>Tentar novamente</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
            <ArrowLeft color={colors.textMuted} size={24} />
          </TouchableOpacity>
          <View style={styles.headerDivider} />
          <View style={styles.storyHeading}>
            <Text style={styles.brand}>Enredo.ai</Text>
            <Text style={styles.storyTitle} numberOfLines={1}>Sua leitura em andamento</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.chapterInfo}>
            <Text style={styles.chapterKicker}>Capítulo {session?.currentChapter || 1}</Text>
            <Text style={styles.chapterSubtitle}>Cena {session?.currentSceneIndex || 0}</Text>
          </View>
          <TouchableOpacity style={styles.iconButton}>
            <Bookmark color={colors.primary} fill={colors.primary} size={21} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.article}>
          {history.slice(-3).map((event) => (
            <View key={event.id} style={styles.historyBlock}>
              {event.userAction ? (
                <View style={styles.userActionWrapper}>
                  <Text style={styles.userActionLabel}>Sua ação anterior</Text>
                  <Text style={styles.userActionText}>{event.userAction}</Text>
                </View>
              ) : null}
            </View>
          ))}

          <View style={styles.narrativeContent}>
            {narrativeBlocks.map((paragraph, index) => (
              <Text key={`${index}-${paragraph.slice(0, 16)}`} style={[styles.narrativeText, index === 0 && styles.firstParagraph]}>
                {paragraph}
              </Text>
            ))}
            <Text style={styles.questionText}>O que você fará agora?</Text>
          </View>

          {currentScene?.adPlacement ? (
            <View style={styles.adPlaceholder}>
              <Text style={styles.adText}>Espaço publicitário</Text>
            </View>
          ) : null}

          {isGenerating ? (
            <View style={styles.generatingContainer}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.generatingText}>A IA está escrevendo a próxima cena...</Text>
            </View>
          ) : null}

          {currentScene ? (
            <View style={styles.interactionSection}>
              <SectionDivider label="Escreva sua própria ação" />
              <View style={styles.inputWrapper}>
                <View style={styles.inputLead}>
                  <Sparkles color={colors.primary} size={16} />
                  <Text style={styles.inputLeadText}>
                    A próxima cena pode seguir exatamente a ação que você escrever aqui.
                  </Text>
                </View>
                <TextInput
                  style={[styles.input, Platform.OS === 'web' ? styles.webInput : null]}
                  placeholder="Escreva sua próxima ação..."
                  placeholderTextColor={`${colors.textMuted}80`}
                  value={freeText}
                  onChangeText={setFreeText}
                  multiline
                  editable={!isGenerating}
                />
                <TouchableOpacity
                    style={[styles.sendActionButton, (!freeText.trim() || isGenerating) && styles.sendActionButtonDisabled]}
                    onPress={() => sendAction(freeText, 'FREE_TEXT')}
                    disabled={!freeText.trim() || isGenerating}
                  >
                    <Text style={[styles.sendActionText, isGenerating && styles.sendActionTextDisabled]}>Enviar ação</Text>
                    <PenTool color={isGenerating ? colors.textMuted : colors.primary} size={16} />
                  </TouchableOpacity>
              </View>

              {currentScene.choices?.length > 0 ? (
                <>
                  <SectionDivider label="Ações sugeridas" />
                  <Text style={styles.suggestionHelper}>
                    Use uma sugestão rápida ou siga com a sua própria ação.
                  </Text>
                  <View style={styles.choicesList}>
                    {currentScene.choices.map((choice, index) => (
                      <ChoiceButton
                        key={`${choice}-${index}`}
                        label={choice}
                        primary={index === 0}
                        onPress={() => sendAction(choice, 'CHOICE')}
                        disabled={isGenerating}
                      />
                    ))}
                  </View>
                </>
              ) : null}

              <SectionDivider label="Mídia de cena" />
              <Text style={styles.suggestionHelper}>
                Gere imagens ou vídeos a partir desta cena. O conteúdo gerado é privado por padrão.
              </Text>

              <View style={styles.creditsRow}>
                <Coins color={usage?.creditsRemaining ? colors.primary : colors.textMuted} size={14} />
                <Text style={[styles.creditsText, !usage?.creditsRemaining && styles.creditsTextZero]}>
                  {usage?.creditsRemaining ?? 0} crédito{(usage?.creditsRemaining ?? 0) !== 1 ? 's' : ''} disponível{(usage?.creditsRemaining ?? 0) !== 1 ? 'eis' : ''}
                </Text>
                <TouchableOpacity
                  style={styles.galleryLink}
                  onPress={() => router.push('/scene-media' as any)}
                >
                  <Text style={styles.galleryLinkText}>Ver galeria</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.mediaRow}>
                {sceneMediaQuery.data?.imageUrl || generatedImageUrl ? (
                  <View style={[styles.mediaButton, styles.mediaButtonComplete]}>
                    <ImageIcon color={colors.success} size={18} />
                    <Text style={[styles.mediaButtonLabel, styles.mediaButtonLabelComplete]}>Imagem gerada</Text>
                  </View>
                ) : currentSceneId ? (
                  <TouchableOpacity
                    style={[styles.mediaButton, (isGenerating || generateImageMutation.isPending) && styles.mediaButtonDisabled]}
                    onPress={() => {
                      if (isGenerating || generateImageMutation.isPending) return;
                      Alert.alert(
                        'Gerar imagem da cena',
                        'Esta ação consome 1 crédito. Deseja gerar uma imagem ilustrativa para esta cena?',
                        [
                          { text: 'Cancelar', style: 'cancel' },
                          { text: 'Gerar', onPress: () => generateImageMutation.mutate() },
                        ],
                      );
                    }}
                    disabled={isGenerating || generateImageMutation.isPending}
                  >
                    {generateImageMutation.isPending || isGeneratingImage ? (
                      <ActivityIndicator color={colors.primary} size="small" />
                    ) : (
                      <>
                        <ImageIcon color={colors.primary} size={18} />
                        <Text style={styles.mediaButtonLabel}>Gerar imagem</Text>
                        <View style={styles.costBadge}>
                          <Coins color={colors.primary} size={9} />
                          <Text style={styles.costText}>1</Text>
                        </View>
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.mediaButton, styles.mediaButtonDisabled]}>
                    <ImageIcon color={colors.textMuted} size={18} />
                    <Text style={[styles.mediaButtonLabel, styles.mediaButtonLabelDisabled]}>Imagem indisponível</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.mediaButton, styles.mediaButtonDisabled]}
                  disabled
                >
                  <Video color={colors.textMuted} size={18} />
                  <Text style={[styles.mediaButtonLabel, styles.mediaButtonLabelDisabled]}>Gerar vídeo</Text>
                  <View style={styles.costBadgeUnavailable}>
                    <Coins color={colors.textMuted} size={9} />
                    <Text style={styles.costTextUnavailable}>5</Text>
                  </View>
                  <Text style={styles.comingSoonBadge}>Em breve</Text>
                </TouchableOpacity>
              </View>

              {(sceneMediaQuery.data?.imageUrl || generatedImageUrl) ? (
                <View style={styles.generatedImageContainer}>
                  <View style={styles.generatedImageWrapper}>
                    <Image
                      source={{ uri: sceneMediaQuery.data?.imageUrl || generatedImageUrl || '' }}
                      style={styles.generatedImage}
                    />
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.dashboard}>
        <View style={styles.usageRow}>
          <Text style={styles.usageText}>
            {usage ? `${usage.dailyUsed} / ${usage.dailyLimit} interações hoje` : 'Uso diário indisponível'}
          </Text>
          <Info color={colors.textMuted} size={14} />
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${usage ? Math.min((usage.dailyUsed / usage.dailyLimit) * 100, 100) : 0}%` }]} />
        </View>
        <View style={styles.modelTabs}>
          <ModelTab
            label={activeModel?.displayName || 'Padrão'}
            sub="Gratuito"
            active={!selectedModelId}
            onPress={() => setSelectedModelId(null)}
            disabled={isGenerating}
          />
          <ModelTab
            label={premiumModelLabel(models)}
            sub="Premium"
            locked={!models.some((model) => model.tier === 'PREMIUM' && model.available)}
            active={selectedModel?.tier === 'PREMIUM'}
            onPress={() => selectFirstModel(models, 'PREMIUM', setSelectedModelId, router)}
            disabled={isGenerating}
          />
          <ModelTab
            label={creditsModel ? `Cine • ${creditsModel.creditCost} créditos` : 'Cine'}
            sub={creditsModel?.displayName || 'Créditos'}
            credits
            locked={!creditsModel}
            active={Boolean(selectedModel && selectedModel.creditCost > 0)}
            onPress={() => selectCreditsModel(models, setSelectedModelId, router)}
            disabled={isGenerating}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <View style={styles.sectionDivider}>
      <View style={styles.dividerShort} />
      <Text style={styles.dividerLabel}>{label}</Text>
      <View style={styles.dividerLong} />
    </View>
  );
}

function ChoiceButton({ label, primary, onPress, disabled }: { label: string; primary?: boolean; onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity style={[styles.choiceButton, primary && styles.choiceButtonPrimary, disabled && styles.choiceButtonDisabled]} onPress={onPress} disabled={disabled}>
      <Text style={[styles.choiceText, primary && styles.choiceTextPrimary]}>{label}</Text>
      <ChevronRight color={primary ? colors.background : colors.primary} size={20} />
    </TouchableOpacity>
  );
}

function ModelTab({
  label,
  sub,
  active,
  locked,
  credits,
  disabled,
  onPress,
}: {
  label: string;
  sub: string;
  active?: boolean;
  locked?: boolean;
  credits?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.modelTab, active && styles.modelTabActive, locked && styles.modelTabLocked]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.modelTabTitleRow}>
        <Text style={[styles.modelTabLabel, active && styles.modelTabLabelActive]} numberOfLines={1}>
          {label}
        </Text>
        {locked ? <Lock color={colors.textMuted} size={10} /> : null}
        {credits ? <Coins color={active ? colors.primary : colors.textMuted} size={10} /> : null}
      </View>
      <Text style={styles.modelTabSub}>{sub}</Text>
      {active ? <View style={styles.activeDot} /> : null}
    </TouchableOpacity>
  );
}

function premiumModelLabel(models: AIModel[]) {
  return models.find((model) => model.tier === 'PREMIUM')?.displayName || 'Avançado';
}

function selectFirstModel(
  models: AIModel[],
  tier: string,
  setSelectedModelId: (id: string | null) => void,
  router: ReturnType<typeof useRouter>,
) {
  const model = models.find((item) => item.tier === tier);
  if (model?.available) {
    setSelectedModelId(model.id);
    return;
  }
  Alert.alert('Modelo premium', model?.lockedReason || 'Faça upgrade para usar modelos avançados.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Ver Premium', onPress: () => router.push('/(tabs)/upgrade') },
  ]);
}

function selectCreditsModel(
  models: AIModel[],
  setSelectedModelId: (id: string | null) => void,
  router: ReturnType<typeof useRouter>,
) {
  const model = models.find((item) => item.creditCost > 0);
  if (model?.available) {
    setSelectedModelId(model.id);
    return;
  }
  Alert.alert('Créditos cinematográficos', model?.lockedReason || 'Compre créditos para usar o modo cinematográfico.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Ver créditos', onPress: () => router.push('/(tabs)/upgrade') },
  ]);
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
  loadingText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: 14,
  },
  errorState: {
    padding: 24,
  },
  errorBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorTitle: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 20,
  },
  errorRetryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 18,
    marginTop: 12,
    alignSelf: 'center',
  },
  errorRetryButtonText: {
    ...typography.label,
    color: colors.background,
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerDivider: {
    width: 1,
    height: 18,
    backgroundColor: colors.border,
  },
  brand: {
    ...typography.h3,
    color: colors.primary,
    fontStyle: 'italic',
    fontSize: 18,
    lineHeight: 20,
  },
  storyHeading: {
    gap: 3,
    maxWidth: 180,
  },
  storyTitle: {
    ...typography.bodySmall,
    color: colors.text,
    fontSize: 12,
  },
  chapterInfo: {
    alignItems: 'flex-end',
    maxWidth: 108,
  },
  chapterKicker: {
    ...typography.label,
    color: colors.textMuted,
    fontSize: 9,
  },
  chapterSubtitle: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontSize: 11,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 252,
  },
  article: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  historyBlock: {
    marginBottom: 10,
  },
  userActionWrapper: {
    borderLeftWidth: 2,
    borderLeftColor: colors.primary,
    paddingLeft: 12,
    marginBottom: 16,
  },
  userActionLabel: {
    ...typography.label,
    color: colors.textMuted,
    fontSize: 9,
    marginBottom: 4,
  },
  userActionText: {
    ...typography.body,
    color: colors.text,
    fontStyle: 'italic',
  },
  narrativeContent: {
    gap: 18,
    marginBottom: 34,
    padding: 24,
    borderRadius: 30,
    backgroundColor: 'rgba(27, 24, 36, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.08)',
  },
  narrativeText: {
    ...typography.narrative,
    color: colors.text,
    fontSize: 20,
    lineHeight: 35,
    opacity: 0.92,
  },
  firstParagraph: {
    fontSize: 21,
  },
  questionText: {
    ...typography.narrative,
    color: colors.primary,
    fontStyle: 'italic',
    fontSize: 18,
    lineHeight: 30,
  },
  adPlaceholder: {
    marginBottom: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.10)',
    backgroundColor: colors.surface,
    borderRadius: 22,
    alignItems: 'center',
  },
  adText: {
    ...typography.label,
    color: colors.textMuted,
  },
  generatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.08)',
  },
  generatingText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  interactionSection: {
    gap: 22,
  },
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  dividerShort: {
    width: 32,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerLong: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerLabel: {
    ...typography.label,
    color: colors.textMuted,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  choicesList: {
    gap: 10,
  },
  choiceButton: {
    minHeight: 60,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  choiceButtonPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  choiceButtonDisabled: {
    opacity: 0.4,
  },
  choiceText: {
    ...typography.label,
    color: colors.text,
    flex: 1,
    fontSize: 11,
  },
  choiceTextPrimary: {
    color: colors.background,
  },
  inputWrapper: {
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.10)',
    borderRadius: 26,
    backgroundColor: 'rgba(21, 19, 27, 0.92)',
    padding: 18,
    minHeight: 156,
  },
  inputLead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
  },
  inputLeadText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    flex: 1,
    lineHeight: 18,
  },
  input: {
    ...typography.narrative,
    color: colors.text,
    minHeight: 120,
    paddingRight: 8,
    textAlignVertical: 'top',
  },
  webInput: {
    outlineStyle: 'none',
    boxShadow: 'none',
  } as any,
  sendActionButton: {
    alignSelf: 'flex-end',
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.10)',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceHighlight,
  },
  sendActionButtonDisabled: {
    opacity: 0.4,
  },
  sendActionText: {
    ...typography.label,
    color: colors.primary,
    fontSize: 10,
  },
  sendActionTextDisabled: {
    color: colors.textMuted,
  },
  suggestionHelper: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: -10,
  },
  creditsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(21, 19, 27, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.08)',
  },
  creditsText: {
    ...typography.label,
    color: colors.primary,
    fontSize: 10,
    flex: 1,
  },
  creditsTextZero: {
    color: colors.textMuted,
  },
  galleryLink: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.15)',
  },
  galleryLinkText: {
    ...typography.label,
    color: colors.primary,
    fontSize: 9,
  },
  dashboard: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: 'rgba(11, 11, 15, 0.98)',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  usageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  usageText: {
    ...typography.label,
    color: colors.textMuted,
    fontSize: 9,
  },
  progressTrack: {
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  modelTabs: {
    flexDirection: 'row',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.08)',
    borderRadius: 20,
    backgroundColor: 'rgba(21, 19, 27, 0.98)',
    padding: 5,
  },
  modelTab: {
    flex: 1,
    minHeight: 54,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  modelTabActive: {
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: `${colors.primary}33`,
  },
  modelTabLocked: {
    opacity: 0.48,
  },
  modelTabTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '100%',
  },
  modelTabLabel: {
    ...typography.label,
    color: colors.textMuted,
    fontSize: 9,
    maxWidth: 82,
  },
  modelTabLabelActive: {
    color: colors.primary,
  },
  modelTabSub: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 13,
    marginTop: 2,
  },
  activeDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  mediaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  mediaButton: {
    flex: 1,
    minHeight: 72,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.12)',
    backgroundColor: 'rgba(21, 19, 27, 0.92)',
    paddingHorizontal: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    position: 'relative',
  },
  mediaButtonDisabled: {
    opacity: 0.45,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  mediaButtonLabel: {
    ...typography.label,
    color: colors.text,
    fontSize: 10,
  },
  mediaButtonLabelDisabled: {
    color: colors.textMuted,
  },
  costBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(206, 189, 255, 0.10)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  costText: {
    ...typography.label,
    color: colors.primary,
    fontSize: 8,
  },
  costBadgeUnavailable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(139, 131, 158, 0.10)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  costTextUnavailable: {
    ...typography.label,
    color: colors.textMuted,
    fontSize: 8,
  },
  comingSoonBadge: {
    ...typography.label,
    color: colors.textMuted,
    fontSize: 7,
    position: 'absolute',
    top: 6,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  generatedImageContainer: {
    gap: 8,
    marginTop: 4,
  },
  generatedImageWrapper: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.12)',
  },
  generatedImage: {
    width: '100%' as any,
    height: 200,
    resizeMode: 'cover' as any,
  },
  mediaButtonComplete: {
    borderColor: 'rgba(16, 185, 129, 0.20)',
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
  },
  mediaButtonLabelComplete: {
    color: colors.success,
  },
});
