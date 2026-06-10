import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Coins,
  Compass,
  Eye,
  Flame,
  HelpCircle,
  Image as ImageIcon,
  Lock,
  MessageSquare,
  Send,
  Settings,
  Shield,
  Sparkles,
  Sword,
  Video,
  Zap,
} from 'lucide-react-native';
import { api } from '../../src/api/client';
import { AIModel, AIModelsResponse, ReadingStatusResponse, SceneMedia } from '../../src/api/types';
import { StateBlock } from '../../src/components/state-block';
import { useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { handleReadingError, READING_ERROR_CODES } from '../../src/utils/reading-error-helper';
import { showApiError } from '../../src/utils/api-error-helper';
import { goBackSafe } from '../../src/utils/navigation-helper';

type Message = {
  id: string;
  sender: 'player' | 'narrator';
  text: string;
  choices?: string[];
};

export default function ReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const timelineRef = useRef<FlatList<Message>>(null);
  const [freeText, setFreeText] = useState('');
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [isCreatingMedia, setIsCreatingMedia] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);

  const { data: readingStatus, isLoading: sessionLoading, isError: sessionError, error: sessionQueryError, refetch: sessionRefetch } = useQuery<ReadingStatusResponse>({
    queryKey: ['session', id],
    queryFn: async () => {
      const { data } = await api.get(`/reading/sessions/${id}`);
      return data;
    },
    enabled: Boolean(id && user),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  const { data: modelsResponse } = useQuery<AIModelsResponse>({
    queryKey: ['models'],
    queryFn: async () => {
      const { data } = await api.get('/ai/models');
      return data;
    },
    enabled: Boolean(user),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
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
    onSuccess: (data) => {
      setFreeText('');
      setSelectedChoice(null);
      queryClient.setQueryData(['session', id], data);
      queryClient.invalidateQueries({ queryKey: ['session', id] });
    },
    onError: (e: any) => {
      queryClient.invalidateQueries({ queryKey: ['session', id] });
      handleReadingError(e);
    },
  });

  const session = readingStatus?.session;
  const usage = readingStatus?.usage;
  const currentScene = session?.currentScene;

  const hasIncompleteCurrentScene = React.useMemo(() => {
    if (!currentScene) return false;
    const hasSceneText = currentScene.sceneText && currentScene.sceneText.trim().length > 0;
    return !hasSceneText;
  }, [currentScene]);

  const hasValidSession = React.useMemo(() => {
    if (!session) return false;
    const history = session.history || [];
    const hasHistoryWithText = history.some((e) => e.sceneText && e.sceneText.trim().length > 0);
    const hasCurrentWithText = currentScene?.sceneText && currentScene.sceneText.trim().length > 0;
    return hasHistoryWithText || hasCurrentWithText;
  }, [session]);

  const messages = React.useMemo<Message[]>(() => {
    const result: Message[] = [];
    const history = (session?.history || []).slice().sort((a, b) => a.sceneIndex - b.sceneIndex);
    // Build player → narrator pairs from oldest to newest.
    // Incomplete historical events are skipped so the timeline never ends
    // with a player action that has no narrator response.
    for (const event of history) {
      const hasValidSceneText = event.sceneText && event.sceneText.trim().length > 0;
      if (!hasValidSceneText) {
        continue;
      }
      if (event.userAction && event.userAction !== 'Início da história') {
        result.push({ id: `${event.id}-user`, sender: 'player', text: event.userAction });
      }
      result.push({ id: `${event.id}-narrator`, sender: 'narrator', text: event.sceneText });
    }
    // Append current scene as the latest entry, avoiding duplicate user action
    // Guard: only append if the scene has real text — empty/incomplete scenes are handled by the recovery state
    if (currentScene) {
      const hasValidSceneText = currentScene.sceneText && currentScene.sceneText.trim().length > 0;
      if (!hasValidSceneText) {
        return result;
      }
      if (currentScene.userAction && currentScene.userAction !== 'Início da história') {
        const lastHistoryUserAction = history.length > 0 ? history[history.length - 1]?.userAction : undefined;
        if (currentScene.userAction !== lastHistoryUserAction) {
          result.push({ id: 'current-user', sender: 'player', text: currentScene.userAction });
        }
      }
      result.push({
        id: 'current-narrator',
        sender: 'narrator',
        text: currentScene.sceneText,
        choices: currentScene.choices,
      });
    }
    return result;
  }, [session?.history, currentScene]);

  const { data: storyInfo } = useQuery<{ title?: string }>({
    queryKey: ['story-title', session?.storyId],
    queryFn: async () => {
      const { data } = await api.get(`/library/stories/${session!.storyId}`);
      return data;
    },
    enabled: Boolean(session?.storyId && user),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const currentSceneId = currentScene?.id;

  useEffect(() => {
    setGeneratedImageUrl(null);
    setGeneratedVideoUrl(null);
    setSelectedChoice(null);
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
          if (existing.videoUrl) setGeneratedVideoUrl(existing.videoUrl);
          return existing;
        }
        return null;
      } catch {
        return null;
      }
    },
    enabled: Boolean(currentSceneId && user),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
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

      if (!sceneMediaId) {
        throw new Error('Scene media unavailable for current scene');
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
            { text: 'Ver créditos (dev)', onPress: () => router.push('/(tabs)/upgrade') },
          ],
        );
        return;
      }
      showApiError('Geração indisponível', e, 'Falha ao gerar imagem da cena.');
    },
  });

  const generateVideoMutation = useMutation({
    mutationFn: async () => {
      if (!id || !currentSceneId) throw new Error('No current scene');

      if (sceneMediaQuery.data?.videoUrl) {
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
                if (existing.videoUrl) {
                  setGeneratedVideoUrl(existing.videoUrl);
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

      if (sceneMediaQuery.data?.videoUrl && !sceneMediaId) {
        return sceneMediaQuery.data;
      }

      if (!sceneMediaId) {
        throw new Error('Scene media unavailable for current scene');
      }

      setIsGeneratingVideo(true);
      try {
        const { data: result } = await api.post(`/scene-media/${sceneMediaId}/generate-video`);
        if (result?.videoUrl) setGeneratedVideoUrl(result.videoUrl);
        queryClient.invalidateQueries({ queryKey: ['scene-media', currentSceneId] });
        queryClient.invalidateQueries({ queryKey: ['scene-media-gallery'] });
        queryClient.invalidateQueries({ queryKey: ['session', id] });
        return result;
      } finally {
        setIsGeneratingVideo(false);
      }
    },
    onError: (e: any) => {
      const errorCode = e?.response?.data?.error;
      if (errorCode === 'INSUFFICIENT_CREDITS') {
        Alert.alert(
          'Créditos insuficientes',
          'Você não tem créditos suficientes para gerar este vídeo. São necessários 5 créditos.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Ver créditos (dev)', onPress: () => router.push('/(tabs)/upgrade') },
          ],
        );
        return;
      }
      showApiError('Geração indisponível', e, 'Falha ao gerar vídeo da cena.');
    },
  });

  const models = modelsResponse?.models ?? [];
  const selectedModel = selectedModelId ? models.find((model) => model.id === selectedModelId) : null;
  const defaultModel = models.find((model) => model.id === modelsResponse?.defaultModelId);
  const activeModel = selectedModel || defaultModel || models[0];
  const isGenerating = actionMutation.isPending || isCreatingMedia || isGeneratingImage || isGeneratingVideo;
  const creditsModel = useMemo(() => models.find((m) => m.creditCost > 0 && m.available), [models]);

  const lastNarratorIndex = React.useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender === 'narrator') return i;
    }
    return -1;
  }, [messages]);

  function submitAction(action: string, actionType: string) {
    if (!user || !action.trim() || isGenerating || hasIncompleteCurrentScene) return;
    actionMutation.mutate({ action: action.trim(), actionType });
  }

  function selectChoice(choice: string) {
    if (isGenerating || hasIncompleteCurrentScene) return;
    setSelectedChoice(choice);
  }

  function submitSelectedChoice() {
    if (!selectedChoice) return;
    submitAction(selectedChoice, 'CHOICE');
  }

  if (!id) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
            <TouchableOpacity style={styles.iconButton} onPress={() => goBackSafe('/(tabs)/library')}>
            <ArrowLeft color={colors.text} size={24} />
          </TouchableOpacity>
        </View>
        <StateBlock
          fullScreen
          title="Leitura não encontrada"
          description="O identificador da sessão de leitura não foi fornecido."
          actionLabel="Ir para biblioteca"
          onAction={() => router.replace('/(tabs)/library')}
        />
      </View>
    );
  }

  if (authLoading || sessionLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
            <TouchableOpacity style={styles.iconButton} onPress={() => goBackSafe('/(tabs)/library')}>
            <ArrowLeft color={colors.text} size={24} />
          </TouchableOpacity>
        </View>
        <StateBlock
          fullScreen
          loading
          title={authLoading ? 'Validando sua sessão' : 'Carregando sua leitura'}
          description={authLoading ? 'Estamos confirmando seu acesso antes de abrir a leitura.' : 'Estamos recuperando cena atual, histórico recente e configuração do modelo.'}
        />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
            <TouchableOpacity style={styles.iconButton} onPress={() => goBackSafe('/(tabs)/library')}>
            <ArrowLeft color={colors.text} size={24} />
          </TouchableOpacity>
        </View>
        <StateBlock
          fullScreen
          title="Sessão expirada"
          description="Faça login novamente para continuar esta leitura."
          actionLabel="Fazer login"
          onAction={() => router.replace('/(auth)/login')}
        />
      </View>
    );
  }

  if (sessionError || !session) {
    const isNotFound = (sessionQueryError as any)?.response?.data?.error === READING_ERROR_CODES.READING_SESSION_NOT_FOUND;
    const isUnauthorized = (sessionQueryError as any)?.response?.status === 401;
    return (
      <View style={styles.container}>
        <View style={styles.header}>
            <TouchableOpacity style={styles.iconButton} onPress={() => goBackSafe('/(tabs)/library')}>
            <ArrowLeft color={colors.text} size={24} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorBlock}>
          <StateBlock
            fullScreen
            title={isUnauthorized ? 'Sessão expirada' : isNotFound ? 'Sessão não encontrada' : 'Não foi possível carregar esta leitura'}
            description={isUnauthorized ? 'Faça login novamente para continuar esta leitura.' : isNotFound ? 'Esta sessão de leitura não existe ou foi removida.' : 'Verifique sua conexão e tente novamente.'}
            actionLabel={isUnauthorized ? 'Fazer login' : 'Voltar para biblioteca'}
            onAction={() => router.replace(isUnauthorized ? '/(auth)/login' : '/(tabs)/library')}
          />
          {!isNotFound && !isUnauthorized ? (
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
          <TouchableOpacity onPress={() => goBackSafe('/(tabs)/library')} style={styles.iconButton}>
            <ArrowLeft color={colors.textMuted} size={22} />
          </TouchableOpacity>
          <View style={styles.headerTitleGroup}>
            <Text style={styles.headerStoryTitle} numberOfLines={1}>{storyInfo?.title || session?.protagonistName || 'Leitura'}</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>Capítulo {session?.currentChapter || 1} • Cena {session?.currentSceneIndex || 0}</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/library')} style={styles.headerTextButton}>
            <Text style={styles.headerTextButtonLabel}>Biblioteca</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={styles.iconButton}>
            <Settings color={colors.textMuted} size={20} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Decorative header separator */}
      <View style={styles.headerSeparator} />

      <View style={styles.timelineContainer}>
        <FlatList
          ref={timelineRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.timelineContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={5}
          removeClippedSubviews={Platform.OS !== 'web'}
          onContentSizeChange={() => timelineRef.current?.scrollToEnd({ animated: false })}
          onLayout={() => timelineRef.current?.scrollToEnd({ animated: false })}
          ListHeaderComponent={
            <View style={styles.timelineStartMarker}>
              <Text style={styles.startMarkerText}>Início da Aventura</Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const isPlayer = item.sender === 'player';
            const isLastNarrator = index === lastNarratorIndex;
            return (
              <View style={[styles.messageRow, isPlayer ? styles.messageRowPlayer : styles.messageRowNarrator]}>
                <View style={[styles.messageBubble, isPlayer ? styles.messageBubblePlayer : styles.messageBubbleNarrator]}>
                  {isPlayer ? (
                    <Text style={[styles.messageText, styles.messageTextPlayer]}>
                      {item.text}
                    </Text>
                  ) : (
                    <NarrativeText text={item.text} />
                  )}
                </View>
                <Text style={[styles.messageMeta, isPlayer ? styles.messageMetaPlayer : styles.messageMetaNarrator]}>
                  {isPlayer ? 'Você' : (storyInfo?.title || 'Narrador')}
                </Text>
                {isLastNarrator && item.choices && item.choices.length > 0 && (
                  <View style={styles.choicesInline}>
                    <Text style={styles.choicesInlineLabel}>ESCOLHA SEU CAMINHO</Text>
                    {item.choices.map((choice, cIdx) => {
                      const isSelected = selectedChoice === choice;
                      return (
                      <Pressable
                        key={cIdx}
                        accessibilityRole="button"
                        accessibilityLabel={`Escolher caminho: ${choice}`}
                        accessibilityState={{ disabled: isGenerating, selected: isSelected }}
                        testID={`reader-choice-${cIdx}`}
                        style={[
                          styles.choiceInlineButton,
                          isSelected && styles.choiceInlineButtonSelected,
                          isGenerating && styles.choiceInlineButtonDisabled,
                        ]}
                        onPress={() => selectChoice(choice)}
                        disabled={isGenerating}
                      >
                        <Text style={[styles.choiceInlineText, isSelected && styles.choiceInlineTextSelected]}>{choice}</Text>
                        <View style={[styles.choiceInlineIconCircle, isSelected && styles.choiceInlineIconCircleSelected]}>
                          {(() => {
                            const ChoiceIcon = resolveChoiceIcon(choice);
                            return <ChoiceIcon color={isSelected ? colors.background : colors.textMuted} size={14} />;
                          })()}
                        </View>
                      </Pressable>
                    )})}
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel="Continuar com o caminho selecionado"
                      testID="reader-submit-selected-choice"
                      style={[
                        styles.choiceContinueButton,
                        (!selectedChoice || isGenerating) && styles.choiceContinueButtonDisabled,
                      ]}
                      onPress={submitSelectedChoice}
                      disabled={!selectedChoice || isGenerating}
                      activeOpacity={0.85}
                    >
                      {actionMutation.isPending ? (
                        <ActivityIndicator color={colors.background} size="small" />
                      ) : (
                        <>
                          <Text style={styles.choiceContinueButtonText}>CONTINUAR</Text>
                          <Send color={colors.background} size={16} />
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
                {isLastNarrator && item.choices && item.choices.length === 0 && (
                  <Text style={styles.noChoicesInlineText}>Use o campo abaixo para descrever sua ação livremente.</Text>
                )}
              </View>
            );
          }}
          ListFooterComponent={
            <>
              {isGenerating && (
                <View style={styles.generatingDots}>
                  <View style={styles.generatingDot} />
                  <View style={[styles.generatingDot, styles.generatingDot2]} />
                  <View style={[styles.generatingDot, styles.generatingDot3]} />
                  <Text style={styles.generatingText}>Mestre narrando aventura...</Text>
                </View>
              )}
              {hasIncompleteCurrentScene && !isGenerating && (
                <View style={styles.recoveryBlock}>
                  <AlertTriangle color="#D4A853" size={18} />
                  <Text style={styles.recoveryTitle}>Cena atual não foi gerada corretamente</Text>
                  <Text style={styles.recoveryDescription}>
                    A última ação do jogador foi enviada, mas a resposta do narrador não foi recebida ou ficou incompleta.
                  </Text>
                  <TouchableOpacity
                    style={styles.recoveryButton}
                    onPress={() => sessionRefetch()}
                  >
                    <Text style={styles.recoveryButtonText}>Tentar novamente</Text>
                  </TouchableOpacity>
                </View>
              )}
              {!hasValidSession && !sessionLoading && !sessionError && (
                <View style={styles.recoveryBlock}>
                  <AlertTriangle color="#D4A853" size={18} />
                  <Text style={styles.recoveryTitle}>Sessão sem conteúdo narrativo</Text>
                  <Text style={styles.recoveryDescription}>
                    Nenhuma cena válida foi encontrada nesta sessão de leitura. Tente recarregar ou volte para a biblioteca.
                  </Text>
                  <TouchableOpacity
                    style={styles.recoveryButton}
                    onPress={() => sessionRefetch()}
                  >
                    <Text style={styles.recoveryButtonText}>Tentar novamente</Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.timelineBottomSpacer} />
            </>
          }
        />
      </View>

      <View style={styles.dashboard}>
        <View style={styles.diagnosticsRow}>
          <View style={styles.diagnosticItem}>
            <View style={styles.diagnosticDot} />
            <Text style={styles.diagnosticLabel} numberOfLines={1}>
              {activeModel?.displayName || 'Modelo Padrão'}
            </Text>
          </View>
          <View style={styles.diagnosticItem}>
            <Zap color={colors.primary} size={12} />
            <Text style={styles.diagnosticLabel}>
              {usage?.creditsRemaining ?? 0} créditos
            </Text>
          </View>
        </View>

        <View style={styles.mediaRow}>
          {sceneMediaQuery.data?.imageUrl || generatedImageUrl ? (
            <View style={[styles.mediaPill, styles.mediaPillComplete]}>
              <ImageIcon color={colors.success} size={16} />
              <Text style={[styles.mediaPillLabel, styles.mediaPillLabelComplete]}>Imagem gerada</Text>
            </View>
          ) : currentSceneId ? (
            <TouchableOpacity
              style={[styles.mediaPill, (isGenerating || generateImageMutation.isPending) && styles.mediaPillDisabled]}
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
                  <Sparkles color={colors.primary} size={14} />
                  <Text style={styles.mediaPillLabel}>Gerar Imagem</Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[styles.mediaPill, (isGenerating || generateVideoMutation.isPending) && styles.mediaPillDisabled]}
            onPress={() => {
              if (isGenerating || generateVideoMutation.isPending) return;
              Alert.alert(
                'Gerar vídeo da cena',
                'Esta ação consome 5 créditos. O vídeo é gerado a partir da cena atual. Deseja continuar?',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Gerar', onPress: () => generateVideoMutation.mutate() },
                ],
              );
            }}
            disabled={isGenerating || generateVideoMutation.isPending}
          >
            {generateVideoMutation.isPending || isGeneratingVideo ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <>
                <Video color={colors.primary} size={14} />
                <Text style={styles.mediaPillLabel}>Gerar Vídeo</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {(sceneMediaQuery.data?.imageUrl || generatedImageUrl) ? (
          <View style={styles.imagePreview}>
            <Image
              source={{ uri: (sceneMediaQuery.data?.imageUrl || generatedImageUrl) as string }}
              style={styles.imagePreviewImage}
            />
          </View>
        ) : null}

        <View style={styles.inputInlineRow}>
          <TextInput
            testID="reader-free-action-input"
            accessibilityLabel="Digite sua ação no leitor"
            style={[styles.inputInline, hasIncompleteCurrentScene && styles.inputInlineDisabled]}
            placeholder={hasIncompleteCurrentScene ? 'Aguardando recuperação da cena...' : 'O que você faz a seguir?...'}
            placeholderTextColor="rgba(229, 226, 225, 0.20)"
            value={freeText}
            onChangeText={setFreeText}
            onSubmitEditing={() => submitAction(freeText, 'FREE_TEXT')}
            onKeyPress={({ nativeEvent }) => {
              if (Platform.OS === 'web' && nativeEvent.key === 'Enter') {
                submitAction(freeText, 'FREE_TEXT');
              }
            }}
            editable={!isGenerating && !hasIncompleteCurrentScene}
            blurOnSubmit={false}
            maxLength={100}
            returnKeyType="send"
          />
          <TouchableOpacity
            testID="reader-free-action-send"
            accessibilityRole="button"
            accessibilityLabel="Enviar ação digitada"
            style={[styles.sendButtonInline, (!freeText.trim() || isGenerating || hasIncompleteCurrentScene) && styles.sendButtonInlineDisabled]}
            onPress={() => submitAction(freeText, 'FREE_TEXT')}
            disabled={!freeText.trim() || isGenerating || hasIncompleteCurrentScene}
          >
            <Send color={!freeText.trim() || isGenerating || hasIncompleteCurrentScene ? colors.textDisabled : colors.primary} size={20} fill={!freeText.trim() || isGenerating || hasIncompleteCurrentScene ? undefined : colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.charCounterRow}>
          <Text style={styles.charCounterText}>ESCOLHA UM CAMINHO OU DIGITE SUA AÇÃO</Text>
          <Text style={styles.charCounterText}>100 CARACTERES MÁX</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const IconMap: Record<string, React.ComponentType<{ color?: string; size?: number }>> = {
  compass: Compass,
  book: BookOpen,
  conversar: MessageSquare,
  falar: MessageSquare,
  mensagem: MessageSquare,
  message: MessageSquare,
  espada: Sword,
  lâmina: Sword,
  adaga: Sword,
  sword: Sword,
  brilho: Sparkles,
  magia: Sparkles,
  sparkles: Sparkles,
  escudo: Shield,
  proteger: Shield,
  shield: Shield,
  chama: Flame,
  fogo: Flame,
  flame: Flame,
  olho: Eye,
  observar: Eye,
  eye: Eye,
  ajuda: HelpCircle,
  duvida: HelpCircle,
  moedas: Coins,
  ouro: Coins,
  coins: Coins,
  energia: Zap,
  raio: Zap,
  zap: Zap,
};

function resolveChoiceIcon(text: string): React.ComponentType<{ color?: string; size?: number }> {
  const lower = text.toLowerCase();
  for (const [key, Icon] of Object.entries(IconMap)) {
    if (lower.includes(key)) return Icon;
  }
  return Compass;
}

type NarrativeSegment = {
  kind: 'narration' | 'dialogue';
  speaker?: string;
  text: string;
};

function NarrativeText({ text }: { text: string }) {
  const segments = useMemo(() => splitNarrativeText(text), [text]);

  return (
    <View style={styles.narrativeStack}>
      {segments.map((segment, index) => (
        <View
          key={`${segment.kind}-${index}`}
          style={[
            styles.narrativeSegment,
            segment.kind === 'dialogue' && styles.dialogueSegment,
          ]}
        >
          {segment.speaker ? (
            <Text style={styles.dialogueSpeaker}>{segment.speaker}</Text>
          ) : null}
          <Text
            style={[
              styles.messageText,
              styles.messageTextNarrator,
              segment.kind === 'dialogue' && styles.dialogueText,
            ]}
          >
            {segment.text}
          </Text>
        </View>
      ))}
    </View>
  );
}

function splitNarrativeText(text: string): NarrativeSegment[] {
  const normalizedText = cleanNarrativeText(text);
  const rawBlocks = normalizedText
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  const blocks = rawBlocks.length > 0 ? rawBlocks : [normalizedText.trim()].filter(Boolean);

  return blocks.flatMap((block): NarrativeSegment[] => {
    const speakerMatch = block.match(/^([\p{L}\s.'-]{2,40}):\s*["“](.+)["”]?$/u);
    if (speakerMatch) {
      return [{
        kind: 'dialogue' as const,
        speaker: speakerMatch[1].trim(),
        text: stripOuterQuotes(speakerMatch[2].trim()),
      }];
    }

    const dialogueSegments = splitInlineDialogue(block);
    if (dialogueSegments.length > 0) {
      return dialogueSegments;
    }

    return splitLongNarration(block).map((textPart) => ({
      kind: 'narration' as const,
      text: textPart,
    }));
  });
}

function splitInlineDialogue(block: string): NarrativeSegment[] {
  const quotePattern = /["“]([^"”]{4,})["”]/g;
  const segments: NarrativeSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = quotePattern.exec(block)) !== null) {
    const before = block.slice(lastIndex, match.index).trim();
    const speaker = inferSpeaker(before);

    if (before) {
      for (const textPart of splitLongNarration(before)) {
        segments.push({ kind: 'narration', text: textPart });
      }
    }

    segments.push({
      kind: 'dialogue',
      speaker,
      text: stripOuterQuotes(match[1].trim()),
    });

    lastIndex = match.index + match[0].length;
  }

  if (segments.length === 0) return [];

  const after = cleanDialogueAttributionLead(block.slice(lastIndex).trim());
  if (after) {
    for (const textPart of splitLongNarration(after)) {
      segments.push({ kind: 'narration', text: textPart });
    }
  }

  return segments;
}

function inferSpeaker(textBeforeQuote: string): string | undefined {
  const compact = textBeforeQuote.replace(/\s+/g, ' ').trim();
  const match = compact.match(/([A-ZÁÉÍÓÚÂÊÔÃÕÇ][\p{L}.'-]+(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\p{L}.'-]+){0,2})\s+(?:diz|responde|murmura|sussurra|pergunta|grita|provoca|comenta|admite|revela|começa|interrompe|repete|rosna|declara)\b/iu);
  const speaker = match?.[1]?.trim();
  if (speaker && !/^(ele|ela|você|voce)$/i.test(speaker)) return speaker;

  const fallbackNames = compact.match(/\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\p{L}.'-]{2,}\b/gu) ?? [];
  const fallback = fallbackNames
    .filter((name) => !/^(Você|Voce|Ele|Ela|Um|Uma|O|A|Os|As)$/i.test(name))
    .at(-1);
  return fallback;
}

function splitLongNarration(block: string): string[] {
  if (block.length <= 320) return [block];

  const sentences = block.match(/[^.!?]+[.!?]+(?:["”])?|[^.!?]+$/g)?.map((part) => part.trim()).filter(Boolean) ?? [block];
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    const next = current ? `${current} ${sentence}` : sentence;
    if (next.length > 280 && current) {
      chunks.push(current);
      current = sentence;
    } else {
      current = next;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

function stripOuterQuotes(text: string): string {
  return text.replace(/^["“]+/, '').replace(/["”]+$/, '');
}

function cleanNarrativeText(text: string): string {
  return text
    .replace(/\\n/g, '\n')
    .replace(/\*\*/g, '');
}

function cleanDialogueAttributionLead(text: string): string {
  return text
    .replace(/^,\s*(?:diz|responde|murmura|sussurra|pergunta|grita|provoca|comenta|admite|revela|repete|declara)\b,?\s*/i, '')
    .replace(/^(?:ele|ela)\s+(?:diz|responde|murmura|sussurra|pergunta|grita|provoca|comenta|admite|revela|repete|declara)\b,?\s*/i, '')
    .replace(/^(?:ele|ela),\s*/i, '')
    .replace(/^,\s*/, '')
    .trim();
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
    height: 64,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(0,0,0,0.82)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerProgressBar: {
    position: 'absolute',
    top: 64,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  headerProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
  },
  headerSeparator: {
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 0,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  headerTitleGroup: {
    gap: 2,
    flex: 1,
  },
  headerStoryTitle: {
    ...typography.h3,
    color: colors.primary,
    fontSize: 14,
    lineHeight: 18,
  },
  headerSubtitle: {
    ...typography.overline,
    color: 'rgba(255,255,255,0.40)',
    fontSize: 10,
    letterSpacing: 1.2,
  },
  headerTextButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  headerTextButtonLabel: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '500' as const,
  },
  /* ─── Timeline ─── */
  timelineContainer: {
    flex: 1,
  },
  timelineContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  timelineStartMarker: {
    alignItems: 'center',
    marginBottom: 20,
  },
  startMarkerText: {
    ...typography.overline,
    color: 'rgba(255,255,255,0.25)',
    fontSize: 10,
  },
  timelineBottomSpacer: {
    height: 16,
  },

  /* ─── Mensagens (bubbles) ─── */
  messageRow: {
    marginBottom: 20,
  },
  messageRowPlayer: {
    alignItems: 'flex-end',
  },
  messageRowNarrator: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '88%',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 20,
  },
  messageBubblePlayer: {
    backgroundColor: 'rgba(206, 189, 255, 0.22)',
    borderTopRightRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.18)',
  },
  messageBubbleNarrator: {
    backgroundColor: 'rgba(19, 19, 19, 0.55)',
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 26,
  },
  messageTextPlayer: {
    ...typography.body,
    fontFamily: 'Inter',
    color: '#e5d9ff',
  },
  messageTextNarrator: {
    ...typography.narrative,
    color: colors.text,
    fontSize: 17,
    lineHeight: 28,
  },
  narrativeStack: {
    gap: 10,
  },
  narrativeSegment: {
    paddingVertical: 2,
  },
  dialogueSegment: {
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(206, 189, 255, 0.45)',
    backgroundColor: 'rgba(206, 189, 255, 0.055)',
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  dialogueSpeaker: {
    ...typography.label,
    color: colors.primary,
    fontSize: 10,
    marginBottom: 5,
  },
  dialogueText: {
    color: '#F2ECFF',
    fontStyle: 'italic',
  },
  messageMeta: {
    ...typography.overline,
    color: 'rgba(255,255,255,0.20)',
    fontSize: 9,
    marginTop: 6,
    marginHorizontal: 6,
  },
  messageMetaPlayer: {
    textAlign: 'right',
  },
  messageMetaNarrator: {
    textAlign: 'left',
  },

  /* ─── Escolhas inline ─── */
  choicesInline: {
    marginTop: 14,
    width: '92%',
    alignSelf: 'flex-start',
  },
  choicesInlineLabel: {
    ...typography.overline,
    color: 'rgba(206, 189, 255, 0.55)',
    fontSize: 9,
    marginBottom: 8,
    marginLeft: 4,
  },
  choiceInlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.30)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
  },
  choiceInlineButtonSelected: {
    backgroundColor: 'rgba(206, 189, 255, 0.16)',
    borderColor: 'rgba(206, 189, 255, 0.48)',
  },
  choiceInlineButtonDisabled: {
    opacity: 0.4,
  },
  choiceInlineText: {
    ...typography.body,
    fontFamily: 'InterMedium',
    color: '#e5e2e1',
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
    paddingRight: 10,
  },
  choiceInlineTextSelected: {
    color: colors.primary,
  },
  choiceInlineIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  choiceInlineIconCircleSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  choiceContinueButton: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  choiceContinueButtonDisabled: {
    opacity: 0.35,
  },
  choiceContinueButtonText: {
    ...typography.label,
    color: colors.background,
    fontSize: 11,
  },
  noChoicesInlineText: {
    ...typography.caption,
    fontFamily: 'Inter',
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 8,
    marginLeft: 4,
  },

  /* ─── Loading dots ─── */
  generatingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(19, 19, 19, 0.40)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
    maxWidth: 300,
    alignSelf: 'flex-start',
  },
  generatingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    opacity: 0.7,
  },
  generatingDot2: {
    opacity: 0.5,
  },
  generatingDot3: {
    opacity: 0.3,
  },
  generatingText: {
    ...typography.labelSmall,
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10,
    marginLeft: 4,
  },

  /* ─── Recovery (incomplete scene) ─── */
  recoveryBlock: {
    backgroundColor: 'rgba(212, 168, 83, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(212, 168, 83, 0.20)',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 4,
  },
  recoveryTitle: {
    ...typography.label,
    color: '#D4A853',
    fontSize: 12,
    textAlign: 'center',
  },
  recoveryDescription: {
    ...typography.caption,
    color: 'rgba(212, 168, 83, 0.70)',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  recoveryButton: {
    backgroundColor: 'rgba(212, 168, 83, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(212, 168, 83, 0.25)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  recoveryButtonText: {
    ...typography.labelSmall,
    color: '#D4A853',
    fontSize: 12,
  },

  /* ─── Painel Inferior ─── */
  dashboard: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: 'rgba(10, 10, 10, 0.97)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    gap: 12,
  },
  diagnosticsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  diagnosticItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  diagnosticDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ade80',
  },
  diagnosticLabel: {
    ...typography.labelSmall,
    color: colors.textMuted,
    fontSize: 10,
  },

  /* ─── Botões de mídia (pills) ─── */
  mediaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  mediaPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  mediaPillDisabled: {
    opacity: 0.4,
  },
  mediaPillComplete: {
    borderColor: 'rgba(74, 222, 128, 0.16)',
    backgroundColor: 'rgba(74, 222, 128, 0.05)',
  },
  mediaPillLabel: {
    ...typography.labelSmall,
    color: colors.text,
    fontSize: 10,
  },
  mediaPillLabelComplete: {
    color: colors.success,
  },

  /* ─── Image preview inline ─── */
  imagePreview: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.10)',
  },
  imagePreviewImage: {
    width: '100%' as any,
    height: 120,
    resizeMode: 'cover' as any,
  },

  /* ─── Input inline ─── */
  inputInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  inputInline: {
    ...typography.body,
    fontFamily: 'Inter',
    color: colors.text,
    flex: 1,
    paddingRight: 44,
    paddingVertical: 14,
    fontSize: 15,
    lineHeight: 21,
  },
  inputInlineDisabled: {
    color: colors.textDisabled,
  },
  sendButtonInline: {
    position: 'absolute',
    right: 2,
    bottom: 8,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonInlineDisabled: {
    opacity: 0.3,
  },
  charCounterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  charCounterText: {
    ...typography.overline,
    color: 'rgba(255,255,255,0.18)',
    fontSize: 9,
  },
});
