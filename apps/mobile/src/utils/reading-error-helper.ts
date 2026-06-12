import { Alert } from 'react-native';
import { router } from 'expo-router';
import { getApiMessage } from './api-error-helper';
import { goBackSafe } from './navigation-helper';

export const READING_ERROR_CODES = {
  DAILY_LIMIT_REACHED: 'DAILY_LIMIT_REACHED',
  ACTIVE_SESSION_LIMIT_REACHED: 'ACTIVE_SESSION_LIMIT_REACHED',
  INSUFFICIENT_CREDITS: 'INSUFFICIENT_CREDITS',
  PREMIUM_REQUIRED: 'PREMIUM_REQUIRED',
  MODEL_ACCESS_DENIED: 'MODEL_ACCESS_DENIED',
  AI_PROVIDER_UNAVAILABLE: 'AI_PROVIDER_UNAVAILABLE',
  READING_SESSION_NOT_FOUND: 'READING_SESSION_NOT_FOUND',
  READING_GENERATION_FAILED: 'READING_GENERATION_FAILED',
  INVALID_READING_ACTION: 'INVALID_READING_ACTION',
  STORY_NOT_FOUND: 'STORY_NOT_FOUND',
} as const;

export function handleReadingError(e: any): void {
  const status = e?.response?.status;
  const errorCode = e?.response?.data?.error;
  const message = getApiMessage(e);

  if (errorCode) {
    switch (errorCode) {
      case READING_ERROR_CODES.ACTIVE_SESSION_LIMIT_REACHED:
        Alert.alert('Limite de histórias ativas', 'Seu plano permite até 3 histórias ativas. Abandone uma história ou conheça o Premium.', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Ver Premium', onPress: () => router.push('/(tabs)/upgrade') },
        ]);
        return;
      case READING_ERROR_CODES.DAILY_LIMIT_REACHED:
        Alert.alert('Atualização necessária', 'As interações agora são ilimitadas. Atualize o aplicativo e tente novamente.', [
          { text: 'OK', style: 'default' },
        ]);
        return;
      case READING_ERROR_CODES.INSUFFICIENT_CREDITS:
        Alert.alert('Créditos insuficientes', 'Você não tem créditos suficientes para usar este modelo.', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Ver créditos', onPress: () => router.push('/(tabs)/upgrade') },
        ]);
        return;
      case READING_ERROR_CODES.PREMIUM_REQUIRED:
        Alert.alert('Conteúdo Premium', 'Esta história requer uma assinatura Premium.', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Ver Premium', onPress: () => router.push('/(tabs)/upgrade') },
        ]);
        return;
      case READING_ERROR_CODES.MODEL_ACCESS_DENIED:
        Alert.alert('Modelo indisponível', 'Este modelo não está disponível para seu plano.', [
          { text: 'OK', style: 'default' },
          { text: 'Ver planos', onPress: () => router.push('/(tabs)/upgrade') },
        ]);
        return;
      case READING_ERROR_CODES.AI_PROVIDER_UNAVAILABLE:
        Alert.alert('Serviço temporariamente indisponível', 'A IA não conseguiu responder agora. Sua leitura foi mantida; tente enviar a mesma ação novamente em alguns instantes.', [
          { text: 'OK', style: 'default' },
        ]);
        return;
      case READING_ERROR_CODES.READING_SESSION_NOT_FOUND:
        Alert.alert('Sessão não encontrada', 'Esta sessão de leitura não existe ou foi removida.', [
          { text: 'OK', style: 'default', onPress: () => goBackSafe('/(tabs)/library') },
        ]);
        return;
      case READING_ERROR_CODES.READING_GENERATION_FAILED:
        Alert.alert('Erro ao gerar cena', 'Não foi possível gerar a cena. Tente novamente.', [
          { text: 'OK', style: 'default' },
        ]);
        return;
      case READING_ERROR_CODES.INVALID_READING_ACTION:
        Alert.alert('Ação inválida', 'Revise sua ação e tente novamente.', [
          { text: 'OK', style: 'default' },
        ]);
        return;
      case READING_ERROR_CODES.STORY_NOT_FOUND:
        Alert.alert('História não encontrada', 'Esta história não está mais disponível.', [
          { text: 'OK', style: 'default', onPress: () => router.push('/(tabs)/library') },
        ]);
        return;
    }
  }

  if (status === 402) {
    Alert.alert('Acesso restrito', 'Você precisa de upgrade ou créditos para continuar.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Ver Premium', onPress: () => router.push('/(tabs)/upgrade') },
    ]);
    return;
  }

  Alert.alert('Erro', message);
}
