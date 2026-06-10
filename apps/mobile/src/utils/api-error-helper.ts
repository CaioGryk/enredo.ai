import { Alert } from 'react-native';

const NETWORK_ERROR_MESSAGE = 'Sem conexão com o servidor. Verifique sua internet.';
const TIMEOUT_ERROR_MESSAGE = 'O servidor demorou para responder. Tente novamente.';
const DEFAULT_ERROR_MESSAGE = 'Ocorreu um erro inesperado.';

const TECHNICAL_MESSAGE_PATTERNS = [
  /^\s*[{[]/,
  /<\/?[a-z][\s\S]*>/i,
  /\b(AxiosError|Prisma|Exception|Stack|Traceback|TypeError|ReferenceError)\b/i,
  /\bat\s+\S+\s+\(/,
  /\b(node_modules|localhost|127\.0\.0\.1)\b/i,
];

function isSafeApiMessage(message: string): boolean {
  const trimmed = message.trim();
  if (trimmed.length === 0 || trimmed.length > 180) return false;
  return !TECHNICAL_MESSAGE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function getApiMessage(error: any, fallback = 'Ocorreu um erro inesperado.'): string {
  const msg = error?.response?.data?.message;
  if (typeof msg === 'string' && isSafeApiMessage(msg)) return msg.trim();
  if (isNetworkError(error)) return NETWORK_ERROR_MESSAGE;
  if (isTimeoutError(error)) return TIMEOUT_ERROR_MESSAGE;
  return fallback || DEFAULT_ERROR_MESSAGE;
}

export function isNetworkError(error: any): boolean {
  return error?.message === 'Network Error' || error?.code === 'ERR_NETWORK';
}

export function isTimeoutError(error: any): boolean {
  return error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT';
}

export function showApiError(title: string, error: any, fallback?: string): void {
  Alert.alert(title, getApiMessage(error, fallback));
}
