import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Brain, MessageCircle, Shield, Video } from 'lucide-react-native';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';

const ACCENT = '#CEBDFF';
const PANEL_ALT = '#1B1824';
const SOFT_TEXT = '#B7AFC8';

export default function ProfileConsentScreen() {
  const router = useRouter();
  const [allowImagePersonalization, setAllowImagePersonalization] = useState(true);
  const [allowPublicVideos, setAllowPublicVideos] = useState(false);
  const [allowComments, setAllowComments] = useState(true);

  function savePreviewState() {
    Alert.alert('Preferências atualizadas', 'Essas preferências já estão prontas no frontend e serão conectadas ao backend na próxima rodada.');
  }

  function destructiveSoon(label: string) {
    Alert.alert('Em breve', `${label} será conectado ao backend assim que fecharmos a camada de mídia e privacidade.`);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color={ACCENT} size={20} />
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.brand}>Enredo.ai</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>Consentimentos de IA</Text>
        <Text style={styles.title}>Você controla sua presença</Text>
        <Text style={styles.subtitle}>
          Defina como sua imagem, seus vídeos e suas interações podem ser usados dentro da experiência do Enredo.ai.
        </Text>

        <ConsentCard
          icon={<Brain color={ACCENT} size={20} />}
          title="Usar foto para personalização por IA"
          description="Permite usar sua foto de perfil como referência opcional em cenas e vídeos gerados."
          value={allowImagePersonalization}
          onValueChange={setAllowImagePersonalization}
        />

        <ConsentCard
          icon={<Video color={ACCENT} size={20} />}
          title="Permitir publicação de vídeos gerados"
          description="Se ativado, seus vídeos podem ser enviados para revisão antes de aparecerem na aba Cenas."
          value={allowPublicVideos}
          onValueChange={setAllowPublicVideos}
        />

        <ConsentCard
          icon={<MessageCircle color={ACCENT} size={20} />}
          title="Permitir comentários em vídeos públicos"
          description="Seus vídeos publicados poderão receber comentários da comunidade."
          value={allowComments}
          onValueChange={setAllowComments}
        />

        <View style={styles.noticeCard}>
          <Shield color={ACCENT} size={18} />
          <View style={styles.noticeCopy}>
            <Text style={styles.noticeTitle}>Privacidade primeiro</Text>
            <Text style={styles.noticeText}>
              Nada será publicado automaticamente. Mesmo com permissões ativas, vídeos e cenas públicas passam por revisão antes de aparecerem para outros usuários.
            </Text>
          </View>
        </View>

        <TouchableOpacity activeOpacity={0.88} style={styles.primaryButton} onPress={savePreviewState}>
          <Text style={styles.primaryButtonText}>Salvar preferências</Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.88} style={styles.secondaryButton} onPress={() => destructiveSoon('A remoção da foto do perfil')}>
          <Text style={styles.secondaryButtonText}>Remover foto do perfil</Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.88} style={styles.secondaryButton} onPress={() => destructiveSoon('A exclusão do histórico de mídia')}>
          <Text style={styles.secondaryButtonText}>Excluir histórico de mídia gerada</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function ConsentCard({
  icon,
  title,
  description,
  value,
  onValueChange,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.cardIcon}>{icon}</View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: '#3A3348', true: 'rgba(206, 189, 255, 0.45)' }}
          thumbColor={value ? ACCENT : '#8B839E'}
        />
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDescription}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    height: 64,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(206, 189, 255, 0.12)',
    backgroundColor: 'rgba(10, 10, 12, 0.96)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backText: {
    ...typography.label,
    color: ACCENT,
    fontSize: 10,
  },
  brand: {
    ...typography.h3,
    color: ACCENT,
    fontStyle: 'italic',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 120,
  },
  eyebrow: {
    ...typography.label,
    color: ACCENT,
    marginBottom: 10,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    fontSize: 38,
    lineHeight: 44,
    marginBottom: 12,
  },
  subtitle: {
    ...typography.body,
    color: SOFT_TEXT,
    marginBottom: 22,
  },
  card: {
    borderRadius: 26,
    padding: 20,
    backgroundColor: PANEL_ALT,
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.08)',
    marginBottom: 14,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  cardTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDescription: {
    ...typography.bodySmall,
    color: SOFT_TEXT,
    lineHeight: 21,
  },
  noticeCard: {
    marginTop: 8,
    marginBottom: 18,
    borderRadius: 24,
    padding: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.08)',
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  noticeCopy: {
    flex: 1,
  },
  noticeTitle: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '700',
    marginBottom: 4,
  },
  noticeText: {
    ...typography.bodySmall,
    color: SOFT_TEXT,
    lineHeight: 20,
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    marginBottom: 12,
  },
  primaryButtonText: {
    ...typography.label,
    color: colors.background,
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.10)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    marginBottom: 10,
  },
  secondaryButtonText: {
    ...typography.label,
    color: SOFT_TEXT,
  },
});
