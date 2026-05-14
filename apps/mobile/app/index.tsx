import { useState } from 'react';
import { ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BookOpen, Clapperboard, Sparkles } from 'lucide-react-native';
import { colors } from '../src/theme/colors';
import { typography } from '../src/theme/typography';
import { useAuth } from '../src/context/AuthContext';
import { GuidedPreview } from './preview';

const welcomeImage =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuD6DmzBNcV-VOKy0AlIMcveT0FckzGErl54OP6emvYzs6CZFLra8Wq7fWleOpMrhU-bSIqA5weQbbncgXVucgeiYDjj20NDiTQBYtGQ57VgDUu0cI-vcn3BY6DIuwG0Ayp8DonywgNopGkpOiE_7DOyXSa2w0il-Zz_DqLmsqC5lFMbgTi-iRI1qEbEa8TgmuVx1xzXzWcRiAF-t0sL0nizJuqksAIcdEuMz78pwx30b0nIXErNz0orQcIG1TIRSW1oUx6oe2MdEgA';

const accent = '#CEBDFF';
const accentText = '#381385';

export default function WelcomeScreen() {
  const router = useRouter();
  const { isLoading } = useAuth();
  const [showPreview, setShowPreview] = useState(false);

  if (showPreview) {
    return <GuidedPreview onExit={() => setShowPreview(false)} />;
  }

  return (
    <ImageBackground source={{ uri: welcomeImage }} style={styles.container} imageStyle={styles.backgroundImage}>
      <View style={styles.overlay} />
      <View style={styles.topGlow} />

      <View style={styles.header}>
        <View style={styles.brandRow}>
          <BookOpen color={accent} size={22} />
          <Text style={styles.brand}>Enredo.ai</Text>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillText}>IA Narrativa</Text>
        </View>
      </View>

      <View style={styles.centerCopy}>
        <Text style={styles.heroTitle}>Sua história, sua voz, seu destino.</Text>
        <Text style={styles.heroText}>
          Mergulhe em universos infinitos onde cada escolha, cada ação e cada cena respondem ao que você cria.
        </Text>
      </View>

      <View style={styles.featureStrip}>
        <FeatureChip icon={<Sparkles color={accent} size={16} />} text="IA criativa em tempo real" />
        <FeatureChip icon={<Clapperboard color={accent} size={16} />} text="Cenas e vídeos gerados por IA" />
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryButton, isLoading && styles.disabledButton]}
          onPress={() => router.push('/(auth)/register')}
          disabled={isLoading}
        >
          <Text style={styles.primaryButtonText}>Começar agora</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.previewButton, isLoading && styles.disabledButton]}
          onPress={() => setShowPreview(true)}
          disabled={isLoading}
        >
          <Text style={styles.previewButtonText}>Experimentar prévia</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, isLoading && styles.disabledButton]}
          onPress={() => router.push('/(auth)/login')}
          disabled={isLoading}
        >
          <Text style={styles.secondaryButtonText}>Entrar</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
}

function FeatureChip({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View style={styles.featureChip}>
      {icon}
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 42,
  },
  backgroundImage: {
    resizeMode: 'cover',
    opacity: 0.34,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,10,0.74)',
  },
  topGlow: {
    position: 'absolute',
    top: 120,
    left: 40,
    right: 40,
    height: 280,
    backgroundColor: 'rgba(206,189,255,0.10)',
    borderRadius: 240,
  },
  header: {
    gap: 18,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brand: {
    ...typography.h3,
    color: accent,
    fontStyle: 'italic',
    fontSize: 30,
  },
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(206,189,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(206,189,255,0.22)',
  },
  pillText: {
    ...typography.label,
    color: accent,
    fontSize: 10,
    letterSpacing: 2.4,
  },
  centerCopy: {
    gap: 18,
  },
  heroTitle: {
    ...typography.h1,
    color: '#F4F0F8',
    fontSize: 44,
    lineHeight: 48,
    textAlign: 'left',
  },
  heroText: {
    ...typography.narrative,
    color: '#D4CDD9',
    fontSize: 20,
    lineHeight: 30,
    maxWidth: 340,
  },
  featureStrip: {
    gap: 14,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(9,9,9,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  featureText: {
    ...typography.body,
    color: '#DAD2E7',
    flex: 1,
  },
  footer: {
    gap: 14,
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: accent,
  },
  primaryButtonText: {
    ...typography.h3,
    color: accentText,
    fontSize: 18,
  },
  previewButton: {
    minHeight: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(206,189,255,0.28)',
    backgroundColor: 'rgba(206,189,255,0.08)',
  },
  previewButtonText: {
    ...typography.label,
    color: accent,
    fontSize: 11,
  },
  secondaryButton: {
    minHeight: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(10,10,10,0.46)',
  },
  secondaryButtonText: {
    ...typography.h3,
    color: '#F1E8FF',
    fontSize: 17,
  },
  disabledButton: {
    opacity: 0.55,
  },
});
