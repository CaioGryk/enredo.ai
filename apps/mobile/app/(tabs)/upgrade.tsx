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
  PenTool,
  Sparkles,
  Star,
  UserCircle,
  X,
} from 'lucide-react-native';
import { api } from '../../src/api/client';
import { CreditPackage, CreditWalletResponse, LLMTestResponse, SubscriptionResponse } from '../../src/api/types';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';

const ACCENT = '#CEBDFF';
const PANEL = '#15131B';
const PANEL_ALT = '#1B1824';
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

  const { data: wallet } = useQuery<CreditWalletResponse>({
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
      Alert.alert('Premium ativado', 'Seu acesso Premium foi liberado no ambiente de desenvolvimento.');
    },
    onError: () => {
      Alert.alert('Erro', 'Não foi possível ativar o Premium agora.');
    },
  });

  const creditMutation = useMutation({
    mutationFn: async (packageId: string) => {
      await api.post('/billing/credits/purchase', { packageId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credits'] });
      queryClient.invalidateQueries({ queryKey: ['models'] });
      Alert.alert('Créditos adicionados', 'Seus créditos foram adicionados à carteira.');
    },
    onError: () => {
      Alert.alert('Erro', 'Não foi possível comprar créditos agora.');
    },
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
            <Text style={styles.title}>Assinatura{'\n'}Enredo.ai</Text>
            <Text style={styles.subtitle}>
              Transforme suas ideias em obras-primas cinematograficas com modelos mais fortes, sem anuncios e com creditos para video.
            </Text>
          </View>
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
      <Text style={styles.cardKicker}>Assinatura mensal</Text>

      <View style={styles.featureList}>
        <Feature icon={<Sparkles color={colors.primary} size={18} />} text="Modelos de IA avançados" />
        <Feature icon={<Library color={colors.primary} size={18} />} text="Mais histórias ativas" />
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
          <Text style={styles.primaryButtonText}>{isPremium ? 'Premium ativo' : 'Torne-se Premium'}</Text>
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
        <Feature icon={<Check color={colors.textMuted} size={18} />} text="10 interações diárias" muted />
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
        Use modelos top-tier para cenas mais longas, world-building e personagens mais complexos.
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
            <Text style={styles.packagePrice}>R$ {item.price.toFixed(2).replace('.', ',')}</Text>
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
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(206, 189, 255, 0.12)',
    backgroundColor: 'rgba(10, 10, 12, 0.96)',
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
    color: '#F5F1FF',
    fontSize: 46,
    lineHeight: 48,
    marginBottom: 14,
  },
  subtitle: {
    ...typography.body,
    color: SOFT_TEXT,
    maxWidth: 320,
  },
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
    color: '#F5F1FF',
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
    color: '#F5F1FF',
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
    color: '#F5F1FF',
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
    color: '#F5F1FF',
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
    color: '#F5F1FF',
    fontSize: 9,
  },
  llmTestResultContent: {
    marginTop: 8,
  },
  llmTestResultContentText: {
    ...typography.bodySmall,
    color: '#F5F1FF',
    marginTop: 4,
    lineHeight: 20,
  },
});
