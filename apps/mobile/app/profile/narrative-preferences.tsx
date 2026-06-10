import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ArrowLeft, Check } from 'lucide-react-native';
import { api } from '../../src/api/client';
import { NarrativePreferencesResponse } from '../../src/api/types';
import { StateBlock } from '../../src/components/state-block';
import { typography } from '../../src/theme/typography';

const ACCENT = '#CEBDFF';
const TEXT = '#e5e2e1';
const SOFT_TEXT = '#B7AFC8';

const LEVELS: Array<{ value: string; label: string; description: string }> = [
  { value: 'NONE', label: 'Neutro', description: 'Histórias sem romance ou tensão sensual.' },
  { value: 'SOFT', label: 'Romance leve', description: 'Sugestivo, emocional, sem conteúdo explícito.' },
  { value: 'INTENSE', label: 'Romance intenso', description: 'Tensão e conflito romântico fortes, sem atos sexuais explícitos.' },
  { value: 'ADULT_18', label: 'Adulto 18+', description: 'Romance explícito em histórias privadas, quando fizer sentido narrativo.' },
];

export default function NarrativePreferencesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [confirmAge, setConfirmAge] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const { data: prefs, isLoading, isError, refetch } = useQuery<NarrativePreferencesResponse>({
    queryKey: ['narrative-preferences'],
    queryFn: async () => {
      const { data } = await api.get('/narrative-preferences/me');
      return data;
    },
  });

  useEffect(() => {
    if (!prefs) return;
    setConfirmAge(Boolean(prefs.ageVerifiedAt));
    setAcceptTerms(Boolean(prefs.adultTermsAcceptedAt));
  }, [prefs?.ageVerifiedAt, prefs?.adultTermsAcceptedAt]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, any> = {};
      const requestedLevel = selectedLevel ?? prefs?.romanceIntensity ?? 'SOFT';

      if (selectedLevel !== null && selectedLevel !== prefs?.romanceIntensity) {
        payload.romanceIntensity = selectedLevel;
      }
      if (requestedLevel === 'ADULT_18') {
        payload.adultContentOptIn = true;
        if (confirmAge) payload.confirmAdultAge = true;
        if (acceptTerms) payload.acceptAdultTerms = true;
      }
      const { data } = await api.patch('/narrative-preferences/me', payload);
      return data as NarrativePreferencesResponse;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['narrative-preferences'], data);
      Alert.alert('Preferências salvas', 'Suas preferências de narrativa foram atualizadas.');
    },
    onError: () => {
      Alert.alert('Erro', 'Não foi possível salvar as preferências. Tente novamente.');
    },
  });

  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  const currentLevel = selectedLevel ?? prefs?.romanceIntensity ?? 'SOFT';
  const effectiveLevel = prefs?.effectiveRomanceIntensity ?? 'SOFT';
  const downgraded = prefs && prefs.romanceIntensity === 'ADULT_18' && prefs.effectiveRomanceIntensity !== 'ADULT_18';

  const isDirty = selectedLevel !== null && selectedLevel !== prefs?.romanceIntensity;
  const hasNewAgeConfirmation = confirmAge && !prefs?.ageVerifiedAt;
  const hasNewTermsAcceptance = acceptTerms && !prefs?.adultTermsAcceptedAt;
  const canSave = isDirty || (currentLevel === 'ADULT_18' && (hasNewAgeConfirmation || hasNewTermsAcceptance));

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Header onBack={() => router.back()} />
        <StateBlock fullScreen loading title="Carregando preferências" description="Buscando suas configurações de narrativa." />
      </View>
    );
  }

  if (isError) {
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
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Preferências de narrativa</Text>
        <Text style={styles.sectionSubtitle}>
          Ajuste o tom das histórias privadas geradas para você. Estas preferências não afetam o feed público, a biblioteca ou a descoberta de histórias.
        </Text>

        <View style={styles.card}>
          {LEVELS.map((level) => {
            const active = currentLevel === level.value;
            return (
              <TouchableOpacity
                key={level.value}
                style={[styles.levelRow, active && styles.levelRowActive]}
                onPress={() => setSelectedLevel(level.value)}
              >
                <View style={styles.levelLeft}>
                  <View style={[styles.radio, active && styles.radioActive]}>
                    {active ? <View style={styles.radioDot} /> : null}
                  </View>
                  <View style={styles.levelCopy}>
                    <Text style={[styles.levelLabel, active && styles.levelLabelActive]}>
                      {level.label}
                    </Text>
                    <Text style={styles.levelDescription}>{level.description}</Text>
                  </View>
                </View>
                {active ? <Check color={ACCENT} size={16} /> : null}
              </TouchableOpacity>
            );
          })}
        </View>

        {currentLevel === 'ADULT_18' ? (
          <View style={styles.gatesCard}>
            <Text style={styles.gatesTitle}>Confirmações necessárias</Text>
            <Text style={styles.gatesSubtitle}>
              Para ativar conteúdo adulto, você precisa confirmar sua idade e aceitar os termos.
            </Text>

            <View style={styles.gateRow}>
              <Switch
                value={confirmAge}
                onValueChange={setConfirmAge}
                trackColor={{ false: 'rgba(139,131,158,0.28)', true: 'rgba(206,189,255,0.40)' }}
                thumbColor={confirmAge ? ACCENT : SOFT_TEXT}
              />
              <Text style={styles.gateLabel}>Declaro ter 18 anos ou mais</Text>
            </View>

            <View style={styles.gateRow}>
              <Switch
                value={acceptTerms}
                onValueChange={setAcceptTerms}
                trackColor={{ false: 'rgba(139,131,158,0.28)', true: 'rgba(206,189,255,0.40)' }}
                thumbColor={acceptTerms ? ACCENT : SOFT_TEXT}
              />
              <Text style={styles.gateLabel}>Entendo que esta preferência afeta apenas minhas histórias privadas</Text>
            </View>
          </View>
        ) : null}

        {downgraded ? (
          <View style={styles.downgradeNotice}>
            <Text style={styles.downgradeText}>
              Algumas opções só entram em vigor após confirmação de idade e aceite dos termos acima.
            </Text>
          </View>
        ) : null}

        <View style={styles.safetyCard}>
          <Text style={styles.safetyTitle}>Limites desta versão</Text>
          <Text style={styles.safetyText}>
            Imagens, vídeos e aparência real do usuário não são usados para conteúdo adulto nesta versão.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, (!canSave || mutation.isPending) && styles.saveDisabled]}
          onPress={() => mutation.mutate()}
          disabled={!canSave || mutation.isPending}
        >
          {mutation.isPending ? (
            <ActivityIndicator color="#0a0a0a" />
          ) : (
            <Text style={styles.saveText}>Salvar preferências</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <ArrowLeft color={TEXT} size={22} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Narrativa</Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    height: 64, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: 1, borderBottomColor: 'rgba(206, 189, 255, 0.12)',
    backgroundColor: 'rgba(10, 10, 12, 0.96)',
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.h3, color: TEXT, fontSize: 17 },
  content: { padding: 20, paddingBottom: 80 },
  sectionTitle: { ...typography.h3, color: TEXT, fontSize: 22, marginBottom: 6 },
  sectionSubtitle: { ...typography.body, color: SOFT_TEXT, lineHeight: 20, marginBottom: 20 },
  card: {
    borderRadius: 20, backgroundColor: '#131313',
    borderWidth: 1, borderColor: 'rgba(206, 189, 255, 0.08)',
    overflow: 'hidden', marginBottom: 16,
  },
  levelRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(206, 189, 255, 0.06)',
  },
  levelRowActive: { backgroundColor: 'rgba(206, 189, 255, 0.06)' },
  levelLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: 'rgba(139,131,158,0.40)',
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: ACCENT },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: ACCENT },
  levelCopy: { flex: 1 },
  levelLabel: { ...typography.body, color: TEXT, fontWeight: '600', fontSize: 15 },
  levelLabelActive: { color: ACCENT },
  levelDescription: { ...typography.bodySmall, color: SOFT_TEXT, marginTop: 2, lineHeight: 16 },
  gatesCard: {
    borderRadius: 20, backgroundColor: '#131313',
    borderWidth: 1, borderColor: 'rgba(206, 189, 255, 0.08)',
    padding: 16, marginBottom: 16,
  },
  gatesTitle: { ...typography.label, color: ACCENT, fontSize: 12, marginBottom: 4 },
  gatesSubtitle: { ...typography.bodySmall, color: SOFT_TEXT, marginBottom: 14, lineHeight: 18 },
  gateRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(206, 189, 255, 0.06)',
  },
  gateLabel: { ...typography.body, color: TEXT, flex: 1, fontSize: 14 },
  downgradeNotice: {
    borderRadius: 14, backgroundColor: 'rgba(206, 189, 255, 0.06)',
    borderWidth: 1, borderColor: 'rgba(206, 189, 255, 0.12)',
    padding: 14, marginBottom: 16,
  },
  downgradeText: { ...typography.bodySmall, color: ACCENT, lineHeight: 18 },
  safetyCard: {
    borderRadius: 20, backgroundColor: '#131313',
    borderWidth: 1, borderColor: 'rgba(206, 189, 255, 0.08)',
    padding: 16, marginBottom: 24,
  },
  safetyTitle: { ...typography.label, color: SOFT_TEXT, fontSize: 11, marginBottom: 4 },
  safetyText: { ...typography.bodySmall, color: SOFT_TEXT, lineHeight: 18 },
  saveButton: {
    minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    backgroundColor: ACCENT,
  },
  saveDisabled: { opacity: 0.4 },
  saveText: { ...typography.label, color: '#0a0a0a', fontSize: 15, fontWeight: '700' },
});
