import { useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowRight, BookOpen, Coins, Image as ImageIcon, PenTool, Sparkles, Users } from 'lucide-react-native';
import { typography } from '../src/theme/typography';
import { useAuth } from '../src/context/AuthContext';

const A = '#CEBDFF';
const W = '#e5e2e1';
const M = '#cac4d4';
const { width: WIDTH } = Dimensions.get('window');

const steps = [
  {
    icon: BookOpen,
    title: 'Escolha uma história',
    caption: 'Biblioteca com dezenas de aventuras interativas. Cada trama ganha vida conforme você participa.',
  },
  {
    icon: Users,
    title: 'Escolha premissa e personagem',
    caption: 'Toda história oferece premissas e personagens jogáveis. Sua jornada começa pelas suas escolhas.',
  },
  {
    icon: PenTool,
    title: 'Leia e influencie cenas',
    caption: 'A IA escreve a próxima cena baseada no que você decide. A narrativa é dinâmica e imprevisível.',
  },
  {
    icon: ImageIcon,
    title: 'Gere imagens e vídeos das cenas',
    caption: 'Transforme momentos da sua leitura em imagens (1 crédito) e vídeos cinematográficos (5 créditos).',
  },
  {
    icon: Coins,
    title: 'Créditos para o modo cine',
    caption: 'Créditos podem ser adquiridos separadamente e liberam modelos cinematográficos, geração de imagens e vídeos.',
  },
  {
    icon: Sparkles,
    title: 'Salve, compartilhe, publique',
    caption: 'Curta cenas da comunidade, salve as suas favoritas e publique com aprovação da curadoria.',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { markOnboardingComplete } = useAuth();
  const [index, setIndex] = useState(0);
  const step = steps[index];

  const finish = async () => {
    // Persist the flag via AuthContext (handles storage failures internally).
    // State is updated before navigation so the route guard sees the new status.
    await markOnboardingComplete();
    // Navigate to index, which declaratively redirects to Library now that
    // onboardingStatus is 'complete' and the (tabs) group is registered.
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <step.icon color={A} size={40} />
        </View>
        <Text style={styles.brand}>Enredo.ai</Text>
        <Text style={styles.title}>{step.title}</Text>
        <Text style={styles.caption}>{step.caption}</Text>

        <View style={styles.dots}>
          {steps.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => {
            if (index < steps.length - 1) {
              setIndex(index + 1);
            } else {
              finish();
            }
          }}
        >
          <Text style={styles.primaryText}>
            {index < steps.length - 1 ? 'Próximo' : 'Começar'}
          </Text>
          <ArrowRight color={A} size={18} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipButton} onPress={finish}>
          <Text style={styles.skipText}>Pular</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', paddingHorizontal: 28, justifyContent: 'space-between', paddingTop: 60, paddingBottom: 40 },
  content: { alignItems: 'center', flex: 1, justifyContent: 'center', gap: 14 },
  iconCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(206,189,255,0.08)', borderWidth: 1, borderColor: 'rgba(206,189,255,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  brand: { ...typography.h3, color: A, fontStyle: 'italic', fontSize: 22 },
  title: { ...typography.h3, color: W, fontSize: 20, textAlign: 'center', marginTop: 8 },
  caption: { ...typography.bodySmall, color: M, fontSize: 14, textAlign: 'center', lineHeight: 22, maxWidth: WIDTH - 80 },
  dots: { flexDirection: 'row', gap: 8, marginTop: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(139,131,158,0.3)' },
  dotActive: { backgroundColor: A, width: 20 },
  actions: { gap: 10 },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(206,189,255,0.20)', backgroundColor: 'rgba(206,189,255,0.08)' },
  primaryText: { ...typography.label, color: A, fontSize: 14 },
  skipButton: { paddingVertical: 12, alignItems: 'center' },
  skipText: { ...typography.bodySmall, color: M, fontSize: 13 },
});
