import React from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ArrowLeft, Camera, Image as ImageIcon, Sparkles, UserCircle2 } from 'lucide-react-native';
import { useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { goBackSafe } from '../../src/utils/navigation-helper';

const ACCENT = '#CEBDFF';
const PANEL_ALT = '#1c1b1b';
const SOFT_TEXT = '#B7AFC8';

export default function ProfileAvatarScreen() {
  const { user } = useAuth();
  const initial = user?.name?.slice(0, 1)?.toUpperCase() || 'E';

  function showSoon(label: string) {
    Alert.alert('Indisponível no momento', `${label} estará disponível em uma versão futura.`);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => goBackSafe('/(tabs)/profile')}>
          <ArrowLeft color={ACCENT} size={20} />
          <Text style={styles.backText}>Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.brand}>Enredo.ai</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>Sua identidade</Text>
        <Text style={styles.title}>Como você quer ser visto?</Text>
        <Text style={styles.subtitle}>
          Sua foto ajuda a personalizar cenas, vídeos gerados por IA e sua presença na comunidade do Enredo.ai.
        </Text>

        <View style={styles.heroCard}>
          <View style={styles.avatarRing}>
            {user?.imageUrl ? (
              <Image source={{ uri: user.imageUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </View>
            )}
          </View>

          <Text style={styles.heroTitle}>{user?.name || 'Leitor Enredo.ai'}</Text>
          <Text style={styles.heroText}>
            Você poderá usar essa imagem para personalizar vídeos, cenas e momentos compartilhados na aba Cenas.
          </Text>
        </View>

        <View style={styles.actions}>
          <ActionCard
            icon={<Camera color={ACCENT} size={20} />}
            title="Tirar foto"
            subtitle="Use a câmera no primeiro acesso ou a partir do perfil."
            onPress={() => showSoon('A captura por câmera')}
          />
          <ActionCard
            icon={<ImageIcon color={ACCENT} size={20} />}
            title="Escolher da galeria"
            subtitle="Selecione uma imagem para representar sua identidade narrativa."
            onPress={() => showSoon('A seleção da galeria')}
          />
          <ActionCard
            icon={<UserCircle2 color={ACCENT} size={20} />}
            title="Usar foto do Google"
            subtitle="Se você entrou por SSO, podemos puxar sua foto do perfil automaticamente."
            onPress={() => showSoon('A sincronização com a foto do Google')}
          />
        </View>

        <View style={styles.tipCard}>
          <Sparkles color={ACCENT} size={18} />
          <View style={styles.tipCopy}>
            <Text style={styles.tipTitle}>Pronto para vídeos personalizados</Text>
            <Text style={styles.tipText}>
              Na próxima integração, essa foto será usada como base opcional para gerar vídeos curtos e cenas visuais da sua história.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function ActionCard({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.88} style={styles.actionCard} onPress={onPress}>
      <View style={styles.actionIcon}>{icon}</View>
      <View style={styles.actionCopy}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionSubtitle}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
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
  heroCard: {
    borderRadius: 30,
    padding: 24,
    backgroundColor: PANEL_ALT,
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.10)',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarRing: {
    width: 124,
    height: 124,
    borderRadius: 62,
    padding: 3,
    backgroundColor: 'rgba(206, 189, 255, 0.26)',
    marginBottom: 16,
  },
  avatarImage: {
    flex: 1,
    borderRadius: 59,
  },
  avatarFallback: {
    flex: 1,
    borderRadius: 59,
    backgroundColor: '#121119',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    ...typography.h1,
    color: ACCENT,
    fontSize: 38,
    lineHeight: 42,
  },
  heroTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  heroText: {
    ...typography.bodySmall,
    color: SOFT_TEXT,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  actions: {
    gap: 14,
  },
  actionCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: PANEL_ALT,
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.08)',
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  actionCopy: {
    flex: 1,
  },
  actionTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
    marginBottom: 2,
  },
  actionSubtitle: {
    ...typography.bodySmall,
    color: SOFT_TEXT,
    lineHeight: 20,
  },
  tipCard: {
    marginTop: 20,
    borderRadius: 24,
    padding: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(206, 189, 255, 0.08)',
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  tipCopy: {
    flex: 1,
  },
  tipTitle: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '700',
    marginBottom: 4,
  },
  tipText: {
    ...typography.bodySmall,
    color: SOFT_TEXT,
    lineHeight: 20,
  },
});
