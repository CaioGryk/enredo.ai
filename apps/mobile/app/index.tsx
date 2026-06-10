import { Alert, ImageBackground, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BookOpen, Clapperboard, Palette, Sparkles } from 'lucide-react-native';
import { typography } from '../src/theme/typography';
import { useAuth } from '../src/context/AuthContext';

const welcomeImage =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuD6DmzBNcV-VOKy0AlIMcveT0FckzGErl54OP6emvYzs6CZFLra8Wq7fWleOpMrhU-bSIqA5weQbbncgXVucgeiYDjj20NDiTQBYtGQ57VgDUu0cI-vcn3BY6DIuwG0Ayp8DonywgNopGkpOiE_7DOyXSa2w0il-Zz_DqLmsqC5lFMbgTi-iRI1qEbEa8TgmuVx1xzXzWcRiAF-t0sL0nizJuqksAIcdEuMz78pwx30b0nIXErNz0orQcIG1TIRSW1oUx6oe2MdEgA';

const ACCENT = '#CEBDFF';
const ACCENT_TEXT = '#381385';

export default function WelcomeScreen() {
  const router = useRouter();
  const { isLoading } = useAuth();

  return (
    <ImageBackground source={{ uri: welcomeImage }} style={styles.root} imageStyle={styles.bgImage}>
      {/* Gradient overlays (cinematic) */}
      <View style={styles.overlayBottom} />
      <View style={styles.overlayTop} />
      <View style={styles.topGlow} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <BookOpen color={ACCENT} size={22} />
          <Text style={styles.brand}>Enredo.ai</Text>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillText}>IA Narrativa</Text>
        </View>
      </View>

      {/* Hero Copy */}
      <View style={styles.heroCopy}>
        <Text style={styles.heroTitle}>Sua história, sua voz, seu destino.</Text>
        <Text style={styles.heroSubtitle}>
          Mergulhe em universos infinitos onde cada escolha molda a realidade.
        </Text>
      </View>

      {/* Feature Cards (glass, 3-column on desktop, stacked on mobile) */}
      <View style={styles.featureCards}>
        <FeatureCard
          icon={<Sparkles color={ACCENT} size={24} />}
          title="IA Criativa"
          description="Narrativas geradas em tempo real com base nas suas decisões mais íntimas."
        />
        <FeatureCard
          icon={<Clapperboard color={ACCENT} size={24} />}
          title="Multiverso"
          description="De épicos de fantasia a mistérios cyberpunk, explore gêneros sem limites."
        />
        <FeatureCard
          icon={<Palette color={ACCENT} size={24} />}
          title="Visual Imersivo"
          description="Artes cinematográficas exclusivas acompanham cada capítulo da sua jornada."
        />
      </View>

      {/* CTAs */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.primaryButton, isLoading && styles.disabled]}
          onPress={() => router.push('/(auth)/register')}
          disabled={isLoading}
          activeOpacity={0.9}
        >
          <Text style={styles.primaryButtonText}>Começar agora</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, isLoading && styles.disabled]}
          onPress={() => router.push('/(auth)/login')}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>Entrar</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerDivider} />
        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={() => router.push('/legal')}>
            <Text style={styles.footerLink}>Termos</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/legal')}>
            <Text style={styles.footerLink}>Privacidade</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL('mailto:support@enredo.ai').catch(() => Alert.alert('Contato', 'Envie um e-mail para support@enredo.ai'))}>
            <Text style={styles.footerLink}>Contato</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.copyright}>2024 ENREDO.AI — TODOS OS DIREITOS RESERVADOS</Text>
      </View>
    </ImageBackground>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.featureCard}>
      <View style={styles.featureIconWrap}>{icon}</View>
      <Text style={styles.featureCardTitle}>{title}</Text>
      <Text style={styles.featureCardDesc}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 34,
  },
  bgImage: {
    resizeMode: 'cover',
    opacity: 0.6,
  },
  overlayBottom: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    // gradient bottom-to-top
    borderTopWidth: 0,
  },
  overlayTop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,10,10,0.72)',
  },
  topGlow: {
    position: 'absolute',
    top: 80,
    left: 20,
    right: 20,
    height: 320,
    backgroundColor: 'rgba(206,189,255,0.08)',
    borderRadius: 280,
  },
  header: {
    gap: 14,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brand: {
    ...typography.h3,
    color: ACCENT,
    fontStyle: 'italic',
    fontSize: 28,
    textShadowColor: 'rgba(206,189,255,0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
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
    color: ACCENT,
    fontSize: 10,
    letterSpacing: 2.4,
  },
  heroCopy: {
    gap: 12,
  },
  heroTitle: {
    ...typography.h1,
    color: '#e5e2e1',
    fontSize: 42,
    lineHeight: 46,
    textAlign: 'left',
  },
  heroSubtitle: {
    ...typography.narrative,
    color: '#cac4d4',
    fontSize: 18,
    lineHeight: 28,
    maxWidth: 320,
  },
  featureCards: {
    gap: 10,
  },
  featureCard: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: 'rgba(18,18,18,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  featureIconWrap: {
    marginBottom: 14,
  },
  featureCardTitle: {
    ...typography.h2,
    color: '#e5e2e1',
    fontSize: 18,
    marginBottom: 6,
  },
  featureCardDesc: {
    ...typography.bodySmall,
    color: '#71717a',
    lineHeight: 20,
    fontSize: 13,
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    minHeight: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT,
    paddingVertical: 16,
  },
  primaryButtonText: {
    ...typography.h3,
    color: ACCENT_TEXT,
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryButton: {
    minHeight: 58,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'transparent',
    paddingVertical: 16,
  },
  secondaryButtonText: {
    ...typography.h3,
    color: '#e5e2e1',
    fontSize: 17,
  },
  disabled: {
    opacity: 0.55,
  },
  footer: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 8,
  },
  footerDivider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginBottom: 4,
  },
  footerLinks: {
    flexDirection: 'row',
    gap: 32,
  },
  footerLink: {
    ...typography.label,
    color: '#71717a',
    fontSize: 10,
    letterSpacing: 2,
  },
  copyright: {
    ...typography.label,
    color: 'rgba(255,255,255,0.2)',
    fontSize: 9,
    letterSpacing: 1.2,
  },
});
