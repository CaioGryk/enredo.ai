import React from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Ban,
  BookOpenText,
  Check,
  Coins,
  Info,
  Library,
  Medal,
  Minus,
  PenTool,
  Plus,
  Sparkles,
  Star,
  UserCircle,
  X,
} from 'lucide-react-native';
import { api } from '../../src/api/client';
import { CreditPackage, CreditWalletResponse, LLMTestResponse, SubscriptionResponse } from '../../src/api/types';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { showApiError } from '../../src/utils/api-error-helper';

const ACCENT = '#CEBDFF';
const PANEL = '#131313';
const PANEL_ALT = '#1c1b1b';
const SOFT_TEXT = '#B7AFC8';

export default function UpgradeScreen() {
  const queryClient = useQueryClient();

  const { data: subscription, isLoading: subscriptionLoading } = useQuery<SubscriptionResponse>({
    queryKey: ['subscription'],
    queryFn: async () => {
      const { data } = await api.get<SubscriptionResponse>('/billing/subscription');
      return data;
    },
  });

  const {
    data: wallet,
    isLoading: walletLoading,
    isError: walletError,
    refetch: refetchWallet,
  } = useQuery<CreditWalletResponse>({
    queryKey: ['credits'],
    queryFn: async () => {
      const { data } = await api.get<CreditWalletResponse>('/billing/credits');
      return data;
    },
  });

  const { data: packages = [] } = useQuery<CreditPackage[]>({
    queryKey: ['credit-packages'],
    queryFn: async () => {
      const { data } = await api.get<CreditPackage[]>('/billing/credits/packages');
      return data;
    },
  });

  const upgradeMutation = useMutation({
    mutationFn: async () => {
      await api.post('/billing/subscription/upgrade', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['models'] });
      Alert.alert('Premium ativado', 'Seu acesso Premium foi liberado no ambiente de desenvolvimento. Nenhuma cobrança real foi feita.');
    },
    onError: (e) => showApiError('Erro', e, 'Não foi possível ativar o Premium agora.'),
  });

  const creditMutation = useMutation({
    mutationFn: async (packageId: string) => {
      const idempotencyKey = `mob-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      await api.post('/billing/credits/purchase', { packageId, idempotencyKey });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credits'] });
      queryClient.invalidateQueries({ queryKey: ['models'] });
      Alert.alert('Créditos adicionados', 'Seus créditos foram adicionados à carteira no ambiente de desenvolvimento. Nenhuma cobrança real foi feita.');
    },
    onError: (e) => showApiError('Erro', e, 'Não foi possível comprar créditos agora.'),
  });

  const isPremium = subscription?.type === 'PREMIUM';

  if (subscriptionLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando sua membresia...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <BookOpenText color={ACCENT} size={22} />
          <Text style={styles.brand}>Enredo.ai</Text>
          <UserCircle color={SOFT_TEXT} size={22} />
        </View>

        <View style={styles.heroWrap}>
          <View style={styles.heroArt}>
            <View style={styles.heroGradient} />
            <Text style={styles.heroBadge}>UPGRADE</Text>
            <Text style={styles.title}>Planos{'\n'}Enredo.ai</Text>
            <Text style={styles.subtitle}>
              Premium remove anúncios e libera modelos melhores para suas leituras.
            </Text>
          </View>
        </View>

        <View style={styles.creditInfo}>
          <Coins color={ACCENT} size={18} />
          <View style={styles.creditInfoText}>
            <Text style={styles.creditInfoTitle}>Créditos</Text>
            <Text style={styles.creditInfoDesc}>
              Imagem de cena: <Text style={styles.creditInfoBold}>1 crédito</Text>. Vídeo de cena: <Text style={styles.creditInfoBold}>5 créditos</Text>. Modelo cine: a partir de 2 créditos por cena.
            </Text>
          </View>
        </View>

        <View style={styles.devNotice}>
          <Info color="#FFBF66" size={18} />
          <Text style={styles.devNoticeText}>
            Pagamentos reais ainda não estão ativos. Nesta versão, Premium e pacotes de créditos são liberados por fluxo mock de desenvolvimento.
          </Text>
        </View>

        <PremiumCard
          isPremium={isPremium}
          isPending={upgradeMutation.isPending}
          onUpgrade={() => upgradeMutation.mutate()}
        />

        <FreeCard active={!isPremium} />

        <CreditsCard
          balance={wallet?.balance ?? 0}
          packages={packages}
          isPending={creditMutation.isPending}
          onPurchase={(packageId) => creditMutation.mutate(packageId)}
        />

        <TransactionHistory
          transactions={wallet?.recentTransactions ?? []}
          isLoading={walletLoading}
          isError={walletError}
          onRetry={() => refetchWallet()}
        />

        <ModelAccess />

        {__DEV__ ? <LLMTestSection /> : null}
      </ScrollView>
    </View>
  );
}

function PremiumCard({
  isPremium,
  isPending,
  onUpgrade,
}: {
  isPremium: boolean;
  isPending: boolean;
  onUpgrade: () => void;
}) {
  return (
    <View style={[styles.card, styles.premiumCard]}>
      <View style={styles.recommendedBadge}>
        <Text style={styles.recommendedText}>Recomendado</Text>
      </View>
      <Text style={styles.cardTitlePremium}>Premium</Text>
        <Text style={styles.cardKicker}>Assinatura mensal (dev)</Text>

      <View style={styles.featureList}>
        <Feature icon={<Sparkles color={colors.primary} size={18} />} text="Modelos de IA avançados" />
        <Feature icon={<Library color={colors.primary} size={18} />} text="Histórias ativas ilimitadas" />
        <Feature icon={<Ban color={colors.primary} size={18} />} text="Experiência sem anúncios" />
        <Feature icon={<PenTool color={colors.primary} size={18} />} text="Cenas longas e imersivas" />
        <Feature icon={<Star color={colors.primary} size={18} />} text="Histórias premium exclusivas" />
      </View>

      <View style={styles.priceRow}>
        <Text style={styles.price}>R$ 29,90</Text>
        <Text style={styles.priceSuffix}>/mês</Text>
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, (isPremium || isPending) && styles.disabledButton]}
        disabled={isPremium || isPending}
        onPress={onUpgrade}
      >
        {isPending ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={styles.primaryButtonText}>{isPremium ? 'Premium ativo' : 'Ativar Premium dev'}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

function FreeCard({ active }: { active: boolean }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <View>
          <Text style={styles.cardTitle}>Free</Text>
          <Text style={styles.cardKicker}>Plano atual</Text>
        </View>
        {active ? (
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>Seu plano</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.featureListMuted}>
        <Feature icon={<Check color={colors.textMuted} size={18} />} text="Interações narrativas ilimitadas" muted />
        <Feature icon={<Check color={colors.textMuted} size={18} />} text="3 histórias ativas" muted />
        <Feature icon={<Check color={colors.textMuted} size={18} />} text="Modelo IA padrão" muted />
        <Feature icon={<Info color={colors.textMuted} size={18} />} text="Exibição de anúncios" muted />
      </View>
    </View>
  );
}

function CreditsCard({
  balance,
  packages,
  isPending,
  onPurchase,
}: {
  balance: number;
  packages: CreditPackage[];
  isPending: boolean;
  onPurchase: (packageId: string) => void;
}) {
  return (
    <View style={[styles.card, styles.creditsCard]}>
      <View style={styles.cardHeaderRow}>
        <View>
          <Text style={styles.cardTitle}>Créditos Cinemáticos</Text>
          <Text style={styles.cardKicker}>Saldo atual: {balance} créditos</Text>
        </View>
        <Medal color={colors.primary} size={32} />
      </View>

      <Text style={styles.cardDescription}>
        Use modelos top-tier para cenas mais longas, world-building e personagens mais complexos. Pacotes abaixo são mock/dev até a integração Stripe.
      </Text>

      <FlatList
        data={packages}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.packageList}
        ListEmptyComponent={<Text style={styles.packageEmpty}>Carregando pacotes...</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.packageCard, isPending && styles.disabledButton]}
            disabled={isPending}
            onPress={() => onPurchase(item.id)}
          >
            <Coins color={colors.primary} size={18} />
            <Text style={styles.packageCredits}>{item.credits}</Text>
            <Text style={styles.packageLabel}>créditos</Text>
            <Text style={styles.packagePrice}>R$ {(item.price ?? 0).toFixed(2).replace('.', ',')} <Text style={styles.packagePriceDev}>(dev)</Text></Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

function ModelAccess() {
  return (
    <View style={styles.modelSection}>
      <Text style={styles.sectionTitle}>Acesso por modelo</Text>
      <ModelRow label="Modelos Free" value="Incluído" />
      <ModelRow label="Modelos Premium" value="Premium" highlighted />
      <ModelRow label="Modelos Cinemáticos" value="Créditos" credits />
    </View>
  );
}

function Feature({ icon, text, muted }: { icon: React.ReactNode; text: string; muted?: boolean }) {
  return (
    <View style={styles.feature}>
      {icon}
      <Text style={[styles.featureText, muted && styles.featureTextMuted]}>{text}</Text>
    </View>
  );
}

function ModelRow({
  label,
  value,
  highlighted,
  credits,
}: {
  label: string;
  value: string;
  highlighted?: boolean;
  credits?: boolean;
}) {
  return (
    <View style={styles.modelRow}>
      <Text style={styles.modelLabel}>{label}</Text>
      <View style={[styles.modelPill, highlighted && styles.modelPillHighlighted]}>
        {credits ? <Coins color={colors.primary} size={12} /> : null}
        <Text style={[styles.modelValue, highlighted && styles.modelValueHighlighted]}>{value}</Text>
      </View>
    </View>
  );
}

function LLMTestSection() {
  const [testResult, setTestResult] = React.useState<LLMTestResponse | null>(null);
  const [testing, setTesting] = React.useState(false);
  const [testModel, setTestModel] = React.useState<string>('');

  const testModels = [
    { id: '', label: 'Default' },
    { id: 'openrouter/free', label: 'OpenRouter Free' },
    { id: 'gpt-4.1-nano', label: 'GPT-4.1 Nano' },
  ];

  const runTest = async (modelId: string) => {
    try {
      setTesting(true);
      setTestModel(modelId || 'default');
      const { data } = await api.post<LLMTestResponse>('/ai/test-model', modelId ? { modelId } : {});
      setTestResult(data);
    } catch (e: any) {
      Alert.alert('Erro no teste LLM', e.response?.data?.message || 'Falha ao testar modelo.');
      setTestResult(null);
    } finally {
      setTesting(false);
    }
  };

  return (
    <View style={styles.llmTestSection}>
      <Text style={styles.llmTestTitle}>Dev: LLM Provider Test</Text>
      <Text style={styles.llmTestSubtitle}>Teste de validação de provedores LLM (apenas dev)</Text>

      <View style={styles.llmTestButtons}>
        {testModels.map((m) => (
          <TouchableOpacity
            key={m.id || 'default'}
            style={[styles.llmTestButton, testing && styles.disabledButton]}
            onPress={() => runTest(m.id)}
            disabled={testing}
          >
            {testing && testModel === (m.id || 'default') ? (
              <ActivityIndicator color={colors.background} size="small" />
            ) : (
              <Text style={styles.llmTestButtonText}>{m.label}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {testResult ? (
        <View style={styles.llmTestResult}>
          <View style={styles.llmTestResultRow}>
            <Text style={styles.llmTestResultLabel}>Provider:</Text>
            <Text style={styles.llmTestResultValue}>{testResult.provider}</Text>
          </View>
          <View style={styles.llmTestResultRow}>
            <Text style={styles.llmTestResultLabel}>Model:</Text>
            <Text style={styles.llmTestResultValue}>{testResult.modelId}</Text>
          </View>
            <View style={styles.llmTestResultRow}>
              <Text style={styles.llmTestResultLabel}>Input Tokens:</Text>
              <Text style={styles.llmTestResultValue}>{testResult.inputTokens ?? 'N/A'}</Text>
            </View>
            <View style={styles.llmTestResultRow}>
              <Text style={styles.llmTestResultLabel}>Output Tokens:</Text>
              <Text style={styles.llmTestResultValue}>{testResult.outputTokens ?? 'N/A'}</Text>
            </View>
          <View style={styles.llmTestResultContent}>
            <Text style={styles.llmTestResultLabel}>Content:</Text>
            <Text style={styles.llmTestResultContentText}>{testResult.content}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function getTransactionLabel(reason: string) {
  const labels: Record<string, string> = {
    PURCHASE: 'Compra de créditos',
    PROMO: 'Crédito promocional',
    SCENE_GENERATION: 'Cena com modelo cine',
    MEMORY_SUMMARY: 'Memória narrativa',
    IMAGE_GENERATION: 'Geração de imagem',
    VIDEO_GENERATION: 'Geração de vídeo',
    REFERRAL: 'Indicação',
    REFUND: 'Reembolso',
    EXPIRATION: 'Créditos expirados',
  };

  return labels[reason] ?? 'Transação';
}

function TransactionHistory({
  transactions,
  isLoading,
  isError,
  onRetry,
}: {
  transactions: { id: string; type: string; amount: number; reason: string; createdAt: string }[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}) {
  if (isLoading) {
    return (
      <View style={styles.txCard}>
        <Text style={styles.txTitle}>Histórico de transações</Text>
        <View style={styles.txState}>
          <ActivityIndicator color={ACCENT} />
          <Text style={styles.txStateText}>Carregando histórico...</Text>
        </View>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.txCard}>
        <Text style={styles.txTitle}>Histórico de transações</Text>
        <Text style={styles.txEmpty}>Não foi possível carregar seu histórico.</Text>
        <TouchableOpacity style={styles.txRetryButton} onPress={onRetry}>
          <Text style={styles.txRetryText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (transactions.length === 0) {
    return (
      <View style={styles.txCard}>
        <Text style={styles.txTitle}>Histórico de transações</Text>
        <Text style={styles.txEmpty}>Nenhuma transação ainda.</Text>
      </View>
    );
  }

  return (
    <View style={styles.txCard}>
      <Text style={styles.txTitle}>Histórico de transações</Text>
      {transactions.map((tx) => (
        <View key={tx.id} style={styles.txRow}>
          <View style={[styles.txIcon, tx.type === 'EARN' ? styles.txIconEarn : styles.txIconSpend]}>
            {tx.type === 'EARN' ? (
              <Plus color="#10B981" size={14} />
            ) : (
              <Minus color="#EF4444" size={14} />
            )}
          </View>
          <View style={styles.txCopy}>
            <Text style={styles.txReason}>{getTransactionLabel(tx.reason)}</Text>
            <Text style={styles.txDate}>{tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('pt-BR') : '—'}</Text>
          </View>
          <Text style={[styles.txAmount, tx.type === 'EARN' ? styles.txAmountEarn : styles.txAmountSpend]}>
            {tx.type === 'EARN' ? '+' : '-'}{tx.amount}
          </Text>
        </View>
      ))}
    </View>
  );
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
  content: {
    paddingBottom: 116,
  },
  topBar: {
    height: 64,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(0,0,0,0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    ...typography.h3,
    color: ACCENT,
    fontStyle: 'italic',
  },
  heroWrap: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 28,
  },
  heroArt: {
    minHeight: 280,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: PANEL_ALT,
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.08)',
    paddingHorizontal: 24,
    paddingVertical: 26,
    justifyContent: 'flex-end',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1B1725',
  },
  heroBadge: {
    ...typography.label,
    color: '#FFBF66',
    marginBottom: 12,
  },
  title: {
    ...typography.h1,
    color: '#e5e2e1',
    fontSize: 46,
    lineHeight: 48,
    marginBottom: 14,
  },
  subtitle: {
    ...typography.body,
    color: SOFT_TEXT,
    maxWidth: 320,
  },
  creditInfo: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    marginHorizontal: 20, marginBottom: 16,
    padding: 16, borderRadius: 18,
    backgroundColor: 'rgba(206, 189, 255, 0.06)',
    borderWidth: 1, borderColor: 'rgba(206, 189, 255, 0.10)',
  },
  creditInfoText: { flex: 1 },
  creditInfoTitle: { ...typography.label, color: ACCENT, fontSize: 12, marginBottom: 4 },
  creditInfoDesc: { ...typography.bodySmall, color: SOFT_TEXT, lineHeight: 18 },
  creditInfoBold: { color: '#e5e2e1', fontWeight: '700' },
  devNotice: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    marginHorizontal: 20, marginBottom: 16,
    padding: 16, borderRadius: 18,
    backgroundColor: 'rgba(255, 191, 102, 0.08)',
    borderWidth: 1, borderColor: 'rgba(255, 191, 102, 0.16)',
  },
  devNoticeText: { ...typography.bodySmall, color: '#E8D6B4', lineHeight: 18, flex: 1 },
  card: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.08)',
    backgroundColor: PANEL_ALT,
    borderRadius: 28,
    padding: 24,
  },
  premiumCard: {
    borderColor: 'rgba(255, 191, 102, 0.25)',
    backgroundColor: PANEL_ALT,
    overflow: 'hidden',
  },
  creditsCard: {
    backgroundColor: PANEL_ALT,
  },
  recommendedBadge: {
    alignSelf: 'flex-end',
    backgroundColor: '#FFBF66',
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 12,
    borderRadius: 999,
  },
  recommendedText: {
    ...typography.label,
    color: '#2A1900',
    fontSize: 9,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 18,
  },
  cardTitlePremium: {
    ...typography.h2,
    color: '#FFBF66',
    marginBottom: 4,
  },
  cardTitle: {
    ...typography.h2,
    color: '#e5e2e1',
    marginBottom: 4,
  },
  cardKicker: {
    ...typography.label,
    color: SOFT_TEXT,
    fontSize: 10,
  },
  featureList: {
    gap: 16,
    marginTop: 22,
    marginBottom: 26,
  },
  featureListMuted: {
    gap: 14,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  featureText: {
    ...typography.body,
    color: '#e5e2e1',
    flex: 1,
  },
  featureTextMuted: {
    color: SOFT_TEXT,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 18,
  },
  price: {
    ...typography.h1,
    color: '#FFBF66',
    fontSize: 34,
  },
  priceSuffix: {
    ...typography.bodySmall,
    color: SOFT_TEXT,
    marginBottom: 5,
  },
  primaryButton: {
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    borderRadius: 20,
  },
  primaryButtonText: {
    ...typography.label,
    color: '#2F1561',
  },
  disabledButton: {
    opacity: 0.55,
  },
  currentBadge: {
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.14)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  currentBadgeText: {
    ...typography.label,
    color: ACCENT,
    fontSize: 9,
  },
  cardDescription: {
    ...typography.bodySmall,
    color: SOFT_TEXT,
    marginBottom: 18,
  },
  packageList: {
    gap: 12,
  },
  packageEmpty: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  packageCard: {
    width: 122,
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.08)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 22,
    padding: 16,
    alignItems: 'center',
  },
  packageCredits: {
    ...typography.h2,
    color: '#e5e2e1',
    marginTop: 8,
  },
  packageLabel: {
    ...typography.label,
    color: SOFT_TEXT,
    fontSize: 9,
  },
  packagePrice: {
    ...typography.label,
    color: ACCENT,
    fontSize: 10,
    marginTop: 10,
  },
  packagePriceDev: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontSize: 9,
  },
  modelSection: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 28,
    backgroundColor: 'rgba(255,255,255,0.015)',
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.06)',
    borderRadius: 24,
    paddingTop: 22,
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
  sectionTitle: {
    ...typography.label,
    color: SOFT_TEXT,
    marginBottom: 12,
  },
  modelRow: {
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(206, 189, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  modelLabel: {
    ...typography.bodySmall,
    color: '#e5e2e1',
  },
  modelPill: {
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
  },
  modelPillHighlighted: {
    borderColor: 'rgba(206, 189, 255, 0.28)',
    backgroundColor: 'rgba(206, 189, 255, 0.12)',
  },
  modelValue: {
    ...typography.label,
    color: SOFT_TEXT,
    fontSize: 9,
  },
  modelValueHighlighted: {
    color: ACCENT,
  },

  llmTestSection: {
    marginHorizontal: 20,
    marginTop: 28,
    marginBottom: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.12)',
    borderRadius: 24,
    backgroundColor: PANEL_ALT,
  },
  llmTestTitle: {
    ...typography.h3,
    color: ACCENT,
    marginBottom: 4,
  },
  llmTestSubtitle: {
    ...typography.label,
    color: SOFT_TEXT,
    fontSize: 9,
    marginBottom: 16,
  },
  llmTestButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  llmTestButton: {
    backgroundColor: ACCENT,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  llmTestButtonText: {
    ...typography.label,
    color: '#2F1561',
    fontSize: 9,
  },
  llmTestResult: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(206, 189, 255, 0.1)',
    paddingTop: 12,
    gap: 8,
  },
  llmTestResultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  llmTestResultLabel: {
    ...typography.label,
    color: SOFT_TEXT,
    fontSize: 9,
  },
  llmTestResultValue: {
    ...typography.label,
    color: '#e5e2e1',
    fontSize: 9,
  },
  llmTestResultContent: {
    marginTop: 8,
  },
  llmTestResultContentText: {
    ...typography.bodySmall,
    color: '#e5e2e1',
    marginTop: 4,
    lineHeight: 20,
  },
  txCard: {
    backgroundColor: '#1C1A2A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.08)',
  },
  txTitle: {
    ...typography.label,
    color: ACCENT,
    fontSize: 12,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  txIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txIconEarn: { backgroundColor: 'rgba(16, 185, 129, 0.15)' },
  txIconSpend: { backgroundColor: 'rgba(239, 68, 68, 0.12)' },
  txCopy: { flex: 1 },
  txReason: {
    ...typography.body,
    color: '#e5e2e1',
    fontSize: 14,
  },
  txDate: {
    ...typography.bodySmall,
    color: SOFT_TEXT,
    marginTop: 2,
  },
  txAmount: {
    ...typography.body,
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 8,
  },
  txAmountEarn: { color: '#10B981' },
  txAmountSpend: { color: '#EF4444' },
  txEmpty: {
    ...typography.body,
    color: SOFT_TEXT,
    textAlign: 'center',
    paddingVertical: 16,
  },
  txState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  txStateText: {
    ...typography.bodySmall,
    color: SOFT_TEXT,
  },
  txRetryButton: {
    alignSelf: 'center',
    minHeight: 42,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(206, 189, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.18)',
  },
  txRetryText: {
    ...typography.label,
    color: ACCENT,
    fontSize: 11,
  },
});
