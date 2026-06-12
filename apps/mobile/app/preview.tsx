import React, { useState } from 'react';
import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { goBackSafe } from '../src/utils/navigation-helper';
import {
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  ChevronRight,
  Coins,
  Lock,
  Menu,
  PenTool,
  Play,
  Sparkles,
  User,
  UserRound,
} from 'lucide-react-native';
import { colors } from '../src/theme/colors';
import { typography } from '../src/theme/typography';

type PreviewStep = 'library' | 'detail' | 'characters' | 'reader' | 'premium' | 'end';

const steps: { id: PreviewStep; label: string }[] = [
  { id: 'library', label: 'Biblioteca' },
  { id: 'detail', label: 'Sinopses' },
  { id: 'characters', label: 'Personagens' },
  { id: 'reader', label: 'Leitor' },
  { id: 'premium', label: 'Premium' },
  { id: 'end', label: 'Cadastro' },
];

const coachCopy: Record<PreviewStep, { title: string; text: string }> = {
  library: {
    title: 'Esta é a biblioteca real do Enredo.ai.',
    text: 'Na prévia, as histórias são demonstrativas. Em uma conta, esta estante vem do Enredo.ai e mistura histórias grátis, premium e leituras em andamento.',
  },
  detail: {
    title: 'Uma história, três premissas jogáveis.',
    text: 'Antes de começar, o usuário escolhe uma premissa inicial. Cada premissa define a situação inicial, o tom e o contexto narrativo.',
  },
  characters: {
    title: 'Depois, escolha quem você será nesta história.',
    text: 'Não existe protagonista fixo. Cada premissa oferece três personagens com função narrativa, objetivo e ponto de vista próprios.',
  },
  reader: {
    title: 'A leitura aceita escolhas e texto livre.',
    text: 'O usuário pode tocar em uma sugestão ou escrever a própria ação. Na conta real, a memória narrativa fica salva no banco.',
  },
  premium: {
    title: 'O plano pago melhora a qualidade da IA.',
    text: 'O plano Grátis usa modelos gratuitos e exibe anúncios. Premium libera modelos melhores e remove anúncios. Créditos, adquiridos separadamente, ativam cenas cinematográficas e geração de mídia.',
  },
  end: {
    title: 'A prévia termina antes do banco de dados.',
    text: 'Sem cadastro, nada é salvo: sem progresso, memória, créditos ou histórico. O próximo passo natural é criar uma conta.',
  },
};

const coverImage =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDgQ7acJ_9YHObe_C_H-4mPIFk7kQDxoexw_JWlfnO_Y_inNVQGJ5eYN6Ag5WTS0-dyVOYHs69O7ESaHDmAkkUg9RJkcfOFaSjniPWTHSdzTmlq_EPNaT_x3JzmeAl3KNtcY2QHr5NB8P5mgVUG-gJpUwbNeQEwHdP3AmE54_dJFYRljoyWT3MkKbDV7JuwwARkqMydnZ1R2VJp53CAm2BfFKT-HeNWrm6IHigFkQw-ZuY5-DdWoEOCa6fWt1lxQA29XSkEBZZAwUS2';

const premiseCards = [
  {
    title: 'O Passageiro que Não Existe',
    synopsis: 'Investigue um passageiro que todos parecem lembrar, mas ninguém consegue ver.',
  },
  {
    title: 'A Estação Esquecida',
    synopsis: 'Desça em uma plataforma fora do tempo e descubra por que seu nome está no quadro de partidas.',
  },
  {
    title: 'A Última Composição',
    synopsis: 'Chegue ao destino final antes que o trem apague sua memória e reescreva sua vida.',
  },
];

const playableCharacters = [
  { name: 'Clara Voss', role: 'A Investigadora', fn: 'PROTAGONISTA' },
  { name: 'Dario Nox', role: 'O Condutor', fn: 'GUIA AMBÍGUO' },
  { name: 'Mara Vale', role: 'A Cética', fn: 'RUPTURA' },
];

export default function PreviewScreen() {
  return <GuidedPreview />;
}

export function GuidedPreview({ onExit }: { onExit?: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<PreviewStep>('library');
  const [customAction, setCustomAction] = useState('');
  const stepIndex = Math.max(0, steps.findIndex((item) => item.id === step));
  const currentStep = steps[stepIndex] || steps[0];
  const copy = coachCopy[step] || coachCopy.library;

  function goNext() {
    if (step === 'end') {
      router.push('/(auth)/register');
      return;
    }
    const next = steps[Math.min(stepIndex + 1, steps.length - 1)].id;
    setCustomAction('');
    setStep(next);
  }

  function goBack() {
    if (stepIndex > 0) {
      setStep(steps[stepIndex - 1].id);
      return;
    }
    if (onExit) {
      onExit();
      return;
    }
    goBackSafe();
  }

  return (
    <KeyboardAvoidingView style={styles.shell} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {step === 'library' ? <LibraryMock onNext={goNext} /> : null}
      {step === 'detail' ? <DetailMock onNext={goNext} selectedPremiseIndex={0} /> : null}
      {step === 'characters' ? <DetailMock onNext={goNext} selectedPremiseIndex={0} focusCharacters /> : null}
      {step === 'reader' ? (
        <ReaderMock customAction={customAction} setCustomAction={setCustomAction} onNext={goNext} />
      ) : null}
      {step === 'premium' ? <PremiumMock onNext={goNext} /> : null}
      {step === 'end' ? <EndMock onRegister={() => router.push('/(auth)/register')} onLogin={() => router.push('/(auth)/login')} /> : null}

      <TouchableOpacity style={styles.backFloating} onPress={goBack}>
        <ArrowLeft color={colors.primary} size={24} />
      </TouchableOpacity>

      <View style={styles.coachPanel}>
        <View style={styles.dotsRow}>
          {steps.map((item, index) => (
            <TouchableOpacity key={item.id} style={styles.dotHit} onPress={() => setStep(item.id)}>
              <View style={[styles.dot, index <= stepIndex && styles.dotActive]} />
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.coachKicker}>Demonstração • {currentStep.label}</Text>
        <Text style={styles.coachTitle}>{copy.title}</Text>
        <Text style={styles.coachText}>{copy.text}</Text>
        <TouchableOpacity style={styles.coachButton} onPress={goNext}>
          <Text style={styles.coachButtonText}>{step === 'end' ? 'Criar conta grátis' : 'Continuar prévia'}</Text>
          <ChevronRight color={colors.background} size={18} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function AppHeader({ title }: { title?: string }) {
  return (
    <View style={styles.topBar}>
      {title ? <Text style={styles.topTitle}>{title}</Text> : <Menu color={colors.primary} size={24} />}
      <Text style={styles.brand}>Enredo.ai</Text>
      <User color={colors.primary} size={22} />
    </View>
  );
}

function LibraryMock({ onNext }: { onNext: () => void }) {
  return (
    <View style={styles.screen}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.libraryContent}>
        <Text style={styles.eyebrow}>Sua Estante</Text>
        <Text style={styles.libraryTitle}>Biblioteca Editorial</Text>
        <View style={styles.memberBadge}>
          <CheckCircle2 color={colors.background} fill={colors.primary} size={14} />
          <Text style={styles.memberText}>MEMBRO GRÁTIS</Text>
        </View>

        <View style={styles.filterRow}>
          {['Tudo', 'Continuar Lendo', 'Premium', 'Grátis'].map((filter, index) => (
            <View key={filter} style={styles.filterItem}>
              <Text style={[styles.filterText, index === 0 && styles.filterActive]}>{filter}</Text>
              {index === 0 ? <View style={styles.filterIndicator} /> : null}
            </View>
          ))}
        </View>

        <TouchableOpacity activeOpacity={0.86} style={styles.featuredCard} onPress={onNext}>
          <ImageBackground source={{ uri: coverImage }} style={styles.featuredImage}>
            <View style={styles.featuredScrim} />
            <View style={styles.featuredOverlay}>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>PREMIUM</Text>
              </View>
              <Text style={styles.featuredTitle}>O Último Trem</Text>
              <Text style={styles.featuredText}>
                Um trem que só aparece à meia-noite. Um passageiro que não deveria existir. Uma jornada que muda conforme suas escolhas.
              </Text>
              <View style={styles.startButton}>
                <Text style={styles.startButtonText}>COMEÇAR LEITURA</Text>
              </View>
            </View>
          </ImageBackground>
        </TouchableOpacity>

        <View style={styles.gridRow}>
          <SmallStory title="Noite de Halloween" badge="GRÁTIS" />
          <SmallStory title="Amor nas Estrelas" badge="GRÁTIS" />
        </View>
      </ScrollView>
    </View>
  );
}

function SmallStory({ title, badge }: { title: string; badge: string }) {
  return (
    <View style={styles.smallCard}>
      <View style={styles.smallCover}>
        <View style={styles.coverBand} />
        <Text style={styles.coverLetter}>{title.slice(0, 1)}</Text>
        <View style={styles.smallBadge}>
          <Text style={styles.smallBadgeText}>{badge}</Text>
        </View>
      </View>
      <Text style={styles.smallTitle}>{title}</Text>
      <Text style={styles.smallSynopsis}>Premissas iniciais, personagens jogáveis e cenas geradas por IA.</Text>
    </View>
  );
}

function DetailMock({
  onNext,
  selectedPremiseIndex,
  focusCharacters,
}: {
  onNext: () => void;
  selectedPremiseIndex: number;
  focusCharacters?: boolean;
}) {
  return (
    <View style={styles.screen}>
      <View style={styles.detailHeader}>
        <View style={styles.headerSpacer} />
        <Text style={styles.brand}>Enredo.ai</Text>
        <Bookmark color={colors.textMuted} size={22} />
      </View>
      <ScrollView contentContainerStyle={styles.detailContent}>
        <View style={styles.hero}>
          <ImageBackground source={{ uri: coverImage }} style={styles.heroImage}>
            <View style={styles.heroScrim} />
            <View style={styles.heroCopy}>
              <View style={styles.metaRow}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>PREMIUM</Text>
                </View>
                <Text style={styles.ageBadge}>16+</Text>
              </View>
              <Text style={styles.heroTitle}>O Último Trem</Text>
              <Text style={styles.heroMeta}>MISTÉRIO • 3 PREMISSAS • 3 PERSONAGENS</Text>
            </View>
          </ImageBackground>
        </View>

        <SectionLabel label="Sinopse Base" />
        <View style={styles.synopsisBlock}>
          <Text style={styles.synopsisText}>
            À meia-noite, um trem sem destino atravessa uma cidade que esqueceu seus próprios mortos. Você embarca sem lembrar quem comprou sua passagem.
          </Text>
        </View>

        <View style={styles.flowCallout}>
          <Sparkles color={colors.primary} size={18} />
          <Text style={styles.flowText}>Primeiro escolha uma sinopse. Depois escolha um dos três personagens jogáveis.</Text>
        </View>

        <SectionHeader title="1. Premissa Jogável" action="3 premissas" />
        <View style={styles.premiseList}>
          {premiseCards.map((premise, index) => (
            <TouchableOpacity
              key={premise.title}
              style={[styles.premiseCard, index === selectedPremiseIndex && styles.selectedCard]}
              onPress={onNext}
            >
              <Text style={styles.cardKicker}>PREMISSA {index + 1} DE 3</Text>
              <Text style={styles.premiseTitle}>{premise.title}</Text>
              <Text style={styles.premiseSynopsis}>{premise.synopsis}</Text>
              {index === selectedPremiseIndex ? <Text style={styles.selectedLabel}>Selecionado</Text> : null}
            </TouchableOpacity>
          ))}
        </View>

        <SectionHeader title="2. Personagem Jogável" action="3 papéis" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.characterRow}>
          {playableCharacters.map((character, index) => (
            <TouchableOpacity
              key={character.name}
              style={[styles.characterCard, focusCharacters && index === 0 && styles.selectedCard]}
              onPress={onNext}
            >
              <View style={styles.avatarBox}>
                <UserRound color={colors.primary} size={34} />
              </View>
              <Text style={styles.cardKicker}>PERSONAGEM {index + 1} DE 3</Text>
              <Text style={styles.characterName}>{character.name}</Text>
              <Text style={styles.characterRole}>{character.role}</Text>
              <Text style={styles.characterFn}>{character.fn}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ScrollView>
    </View>
  );
}

function ReaderMock({
  customAction,
  setCustomAction,
  onNext,
}: {
  customAction: string;
  setCustomAction: (value: string) => void;
  onNext: () => void;
}) {
  return (
    <View style={styles.screen}>
      <View style={styles.readerHeader}>
        <Text style={styles.brand}>Enredo.ai</Text>
        <View style={styles.chapterInfo}>
          <Text style={styles.chapterKicker}>Capítulo 1</Text>
          <Text style={styles.chapterScene}>Cena 3</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.readerContent}>
        <View style={styles.article}>
          <Text style={[styles.narrativeText, styles.dropCap]}>
            A chuva risca a janela do último vagão enquanto o trem atravessa uma estação que não existe nos mapas.
          </Text>
          <Text style={styles.narrativeText}>
            Sobre o banco à sua frente, um bilhete antigo traz seu nome escrito com tinta fresca. O condutor para diante da porta e sorri como se já soubesse sua escolha.
          </Text>
          <Text style={styles.questionText}>O que você fará agora?</Text>
        </View>

        <SectionDivider label="Sugestões da história" />
        {['Abrir o bilhete', 'Chamar o condutor', 'Observar os passageiros'].map((choice, index) => (
          <TouchableOpacity key={choice} style={[styles.choiceButton, index === 0 && styles.choiceButtonPrimary]} onPress={onNext}>
            <Text style={[styles.choiceText, index === 0 && styles.choiceTextPrimary]}>{choice}</Text>
            <ChevronRight color={index === 0 ? colors.background : colors.primary} size={19} />
          </TouchableOpacity>
        ))}

        <SectionDivider label="Escreva sua própria ação" />
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Ex.: sigo pelo corredor escuro..."
            placeholderTextColor={`${colors.textMuted}80`}
            value={customAction}
            onChangeText={setCustomAction}
            multiline
          />
          {customAction.trim() ? (
            <TouchableOpacity style={styles.sendButton} onPress={onNext}>
              <Text style={styles.sendButtonText}>Enviar ação</Text>
              <PenTool color={colors.primary} size={16} />
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.modelDock}>
        <Text style={styles.usageText}>Interações narrativas ilimitadas</Text>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>
        <View style={styles.modelTabs}>
          <ModelPill label="Grátis" active />
          <ModelPill label="Premium" locked />
          <ModelPill label="Cine" credits />
        </View>
      </View>
    </View>
  );
}

function PremiumMock({ onNext }: { onNext: () => void }) {
  return (
    <View style={styles.screen}>
      <AppHeader title="Membresia" />
      <ScrollView contentContainerStyle={styles.premiumContent}>
        <Text style={styles.eyebrow}>Membresia</Text>
        <Text style={styles.libraryTitle}>Evolua sua Narrativa</Text>
        <Text style={styles.premiumIntro}>
          Desbloqueie modelos melhores, memória ampliada e cenas longas para transformar histórias em experiências cinematográficas.
        </Text>

        <View style={[styles.planCard, styles.premiumPlan]}>
          <Text style={styles.recommended}>RECOMENDADO</Text>
          <Text style={styles.planTitle}>Premium</Text>
          <Text style={styles.planKicker}>Assinatura mensal (dev)</Text>
          {['Modelos de IA avançados', 'Histórias ativas ilimitadas', 'Experiência sem anúncios', 'Cenas longas e imersivas'].map((item) => (
            <View key={item} style={styles.featureRow}>
              <Sparkles color={colors.primary} size={16} />
              <Text style={styles.featureText}>{item}</Text>
            </View>
          ))}
          <Text style={styles.price}>R$ 29,90 <Text style={styles.priceSuffix}>/mês</Text></Text>
          <TouchableOpacity style={styles.startButton} onPress={onNext}>
            <Text style={styles.startButtonText}>VER PREMIUM DEV</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.planCard}>
          <Text style={styles.planTitle}>Créditos Cinemáticos</Text>
          <Text style={styles.planKicker}>Modelos cinematográficos por cena especial</Text>
          <View style={styles.creditRow}>
            <Coins color={colors.primary} size={20} />
            <Text style={styles.featureText}>Use créditos para cenas mais complexas e longas.</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function EndMock({ onRegister, onLogin }: { onRegister: () => void; onLogin: () => void }) {
  return (
    <View style={styles.screen}>
      <View style={styles.endContent}>
        <Text style={styles.brandLarge}>Enredo.ai</Text>
        <Text style={styles.endTitle}>Agora é sua jornada.</Text>
        <Text style={styles.endText}>
          Crie uma conta para salvar progresso, memória narrativa, escolhas, créditos e continuar além desta prévia.
        </Text>
        <TouchableOpacity style={styles.endPrimary} onPress={onRegister}>
          <Text style={styles.endPrimaryText}>CRIAR CONTA GRÁTIS</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.endSecondary} onPress={onLogin}>
          <Text style={styles.endSecondaryText}>JÁ TENHO CONTA</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

function SectionHeader({ title, action }: { title: string; action: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <Text style={styles.sectionAction}>{action}</Text>
    </View>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <View style={styles.sectionDivider}>
      <View style={styles.dividerShort} />
      <Text style={styles.dividerLabel}>{label}</Text>
      <View style={styles.dividerLong} />
    </View>
  );
}

function ModelPill({ label, active, locked, credits }: { label: string; active?: boolean; locked?: boolean; credits?: boolean }) {
  return (
    <View style={[styles.modelPill, active && styles.modelPillActive]}>
      {locked ? <Lock color={colors.textMuted} size={12} /> : credits ? <Coins color={colors.primary} size={12} /> : null}
      <Text style={[styles.modelPillText, active && styles.modelPillTextActive]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    height: 74,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topTitle: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '800',
  },
  brand: {
    ...typography.h3,
    color: colors.primary,
    fontStyle: 'italic',
  },
  libraryContent: {
    padding: 40,
    paddingBottom: 260,
  },
  eyebrow: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: 18,
  },
  libraryTitle: {
    ...typography.h1,
    color: colors.text,
    fontSize: 44,
    lineHeight: 50,
  },
  memberBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 28,
    marginTop: 26,
  },
  memberText: {
    ...typography.label,
    color: colors.text,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 32,
    marginTop: 52,
    marginBottom: 34,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterItem: {
    minHeight: 56,
  },
  filterText: {
    ...typography.body,
    color: colors.textMuted,
    fontWeight: '800',
  },
  filterActive: {
    color: colors.primary,
  },
  filterIndicator: {
    height: 4,
    backgroundColor: colors.primary,
    marginTop: 20,
  },
  featuredCard: {
    minHeight: 430,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    overflow: 'hidden',
  },
  featuredImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  featuredScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 4, 3, 0.62)',
  },
  featuredOverlay: {
    padding: 28,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginBottom: 16,
  },
  typeBadgeText: {
    ...typography.label,
    color: colors.background,
    fontSize: 9,
  },
  featuredTitle: {
    ...typography.h1,
    color: colors.text,
    fontSize: 42,
    lineHeight: 46,
    fontStyle: 'italic',
  },
  featuredText: {
    ...typography.narrative,
    color: colors.text,
    fontSize: 20,
    lineHeight: 30,
    marginTop: 16,
    maxWidth: 520,
  },
  startButton: {
    alignSelf: 'flex-start',
    minHeight: 52,
    backgroundColor: colors.primary,
    paddingHorizontal: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },
  startButtonText: {
    ...typography.label,
    color: colors.background,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 18,
    marginTop: 28,
  },
  smallCard: {
    flex: 1,
  },
  smallCover: {
    height: 210,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverBand: {
    position: 'absolute',
    width: 70,
    height: 280,
    backgroundColor: colors.primary,
    opacity: 0.18,
    transform: [{ rotate: '11deg' }],
  },
  coverLetter: {
    ...typography.h1,
    color: colors.primary,
    fontSize: 70,
    opacity: 0.45,
  },
  smallBadge: {
    position: 'absolute',
    left: 12,
    top: 12,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  smallBadgeText: {
    ...typography.label,
    color: colors.background,
    fontSize: 8,
  },
  smallTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: 12,
  },
  smallSynopsis: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: 6,
  },
  detailHeader: {
    height: 74,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSpacer: {
    width: 24,
  },
  detailContent: {
    paddingBottom: 260,
  },
  hero: {
    height: 500,
    overflow: 'hidden',
  },
  heroImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 4, 3, 0.46)',
  },
  heroCopy: {
    padding: 40,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginBottom: 14,
  },
  ageBadge: {
    ...typography.label,
    color: colors.textMuted,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 9,
  },
  heroTitle: {
    ...typography.h1,
    color: colors.text,
    fontSize: 48,
    lineHeight: 52,
    fontStyle: 'italic',
  },
  heroMeta: {
    ...typography.label,
    color: colors.primary,
    marginTop: 16,
    fontSize: 10,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textMuted,
    fontSize: 10,
    marginHorizontal: 40,
    marginTop: 34,
    marginBottom: 12,
  },
  synopsisBlock: {
    marginHorizontal: 40,
    borderLeftWidth: 1,
    borderLeftColor: colors.primary,
    paddingLeft: 22,
  },
  synopsisText: {
    ...typography.narrative,
    color: colors.text,
    fontSize: 19,
    lineHeight: 30,
    fontStyle: 'italic',
  },
  flowCallout: {
    margin: 40,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceHighlight,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
  },
  flowText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 40,
  },
  sectionAction: {
    ...typography.label,
    color: colors.primary,
    fontSize: 10,
    marginTop: 34,
  },
  premiseList: {
    marginHorizontal: 40,
    gap: 14,
  },
  premiseCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 18,
    borderRadius: 8,
  },
  selectedCard: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceHighlight,
  },
  cardKicker: {
    ...typography.label,
    color: colors.primary,
    fontSize: 9,
    marginBottom: 8,
  },
  premiseTitle: {
    ...typography.h3,
    color: colors.text,
  },
  premiseSynopsis: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: 8,
  },
  selectedLabel: {
    ...typography.label,
    color: colors.primary,
    fontSize: 9,
    marginTop: 12,
  },
  characterRow: {
    paddingHorizontal: 40,
    gap: 14,
    paddingBottom: 22,
  },
  characterCard: {
    width: 190,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 8,
  },
  avatarBox: {
    height: 150,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  characterName: {
    ...typography.h3,
    color: colors.text,
  },
  characterRole: {
    ...typography.bodySmall,
    color: colors.primary,
    marginTop: 4,
  },
  characterFn: {
    ...typography.label,
    color: colors.textMuted,
    fontSize: 9,
    marginTop: 10,
  },
  readerHeader: {
    height: 78,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chapterInfo: {
    alignItems: 'flex-end',
  },
  chapterKicker: {
    ...typography.label,
    color: colors.primary,
    fontSize: 9,
  },
  chapterScene: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  readerContent: {
    padding: 32,
    paddingBottom: 310,
  },
  article: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 24,
    borderRadius: 8,
    marginBottom: 24,
  },
  narrativeText: {
    ...typography.narrative,
    color: colors.text,
    fontSize: 21,
    lineHeight: 34,
    marginBottom: 18,
  },
  dropCap: {
    fontSize: 23,
  },
  questionText: {
    ...typography.narrative,
    color: colors.primary,
    fontStyle: 'italic',
    fontSize: 20,
  },
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 18,
  },
  dividerShort: {
    width: 30,
    height: 1,
    backgroundColor: colors.primary,
  },
  dividerLong: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerLabel: {
    ...typography.label,
    color: colors.textMuted,
    fontSize: 9,
  },
  choiceButton: {
    minHeight: 58,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  choiceButtonPrimary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  choiceText: {
    ...typography.label,
    color: colors.text,
    flex: 1,
  },
  choiceTextPrimary: {
    color: colors.background,
  },
  inputWrapper: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minHeight: 128,
    padding: 14,
  },
  input: {
    ...typography.narrative,
    color: colors.text,
    minHeight: 84,
    textAlignVertical: 'top',
  },
  sendButton: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  sendButtonText: {
    ...typography.label,
    color: colors.primary,
    fontSize: 10,
  },
  modelDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 178,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 16,
    backgroundColor: 'rgba(13, 13, 11, 0.96)',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  usageText: {
    ...typography.label,
    color: colors.textMuted,
    fontSize: 9,
    textAlign: 'center',
  },
  progressTrack: {
    height: 4,
    backgroundColor: colors.border,
    marginTop: 8,
    marginBottom: 12,
  },
  progressFill: {
    width: '40%',
    height: '100%',
    backgroundColor: colors.primary,
  },
  modelTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  modelPill: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  modelPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modelPillText: {
    ...typography.label,
    color: colors.textMuted,
    fontSize: 9,
  },
  modelPillTextActive: {
    color: colors.background,
  },
  premiumContent: {
    padding: 34,
    paddingBottom: 260,
  },
  premiumIntro: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: 14,
    lineHeight: 25,
  },
  planCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 22,
    marginTop: 24,
    borderRadius: 8,
  },
  premiumPlan: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceHighlight,
  },
  recommended: {
    ...typography.label,
    alignSelf: 'flex-end',
    color: colors.background,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 8,
    marginBottom: 8,
  },
  planTitle: {
    ...typography.h2,
    color: colors.text,
  },
  planKicker: {
    ...typography.label,
    color: colors.textMuted,
    fontSize: 9,
    marginTop: 4,
    marginBottom: 18,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  featureText: {
    ...typography.bodySmall,
    color: colors.text,
    flex: 1,
  },
  price: {
    ...typography.h2,
    color: colors.primary,
    marginTop: 10,
  },
  priceSuffix: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  creditRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  endContent: {
    flex: 1,
    justifyContent: 'center',
    padding: 34,
    paddingBottom: 230,
  },
  brandLarge: {
    ...typography.h1,
    color: colors.primary,
    fontStyle: 'italic',
    fontSize: 52,
    lineHeight: 60,
    textAlign: 'center',
  },
  endTitle: {
    ...typography.h1,
    color: colors.text,
    marginTop: 28,
    textAlign: 'center',
  },
  endText: {
    ...typography.narrative,
    color: colors.textMuted,
    fontSize: 20,
    lineHeight: 32,
    marginTop: 16,
    marginBottom: 28,
    textAlign: 'center',
  },
  endPrimary: {
    minHeight: 56,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endPrimaryText: {
    ...typography.label,
    color: colors.background,
  },
  endSecondary: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  endSecondaryText: {
    ...typography.label,
    color: colors.text,
  },
  backFloating: {
    position: 'absolute',
    left: 18,
    top: 18,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(13, 13, 11, 0.62)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachPanel: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 18,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: 'rgba(27, 24, 20, 0.98)',
    borderRadius: 10,
    padding: 16,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  dotHit: {
    paddingVertical: 4,
  },
  dot: {
    width: 26,
    height: 3,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  coachKicker: {
    ...typography.label,
    color: colors.primary,
    fontSize: 9,
    marginBottom: 8,
  },
  coachTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: 6,
  },
  coachText: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  coachButton: {
    minHeight: 50,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  coachButtonText: {
    ...typography.label,
    color: colors.background,
  },
});
