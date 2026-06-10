import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { typography } from '../src/theme/typography';
import { goBackSafe } from '../src/utils/navigation-helper';

const ACCENT = '#CEBDFF';
const TEXT = '#e5e2e1';
const SOFT_TEXT = '#B7AFC8';

const TERMOS = `Termos de Uso — Enredo.ai (Beta Fechada)

Última atualização: Maio de 2026.

1. Aceitação dos Termos
Ao acessar ou usar o Enredo.ai, você concorda com estes Termos de Uso. A Plataforma está em beta fechada (ambiente local de desenvolvimento).

2. Descrição do Serviço
O Enredo.ai é uma plataforma de histórias interativas com inteligência artificial. Você escolhe história, premissa e personagem, e interage com a narrativa por ações em texto livre ou escolhas sugeridas.

Recursos: geração de imagens (1 crédito), vídeos (5 créditos), modo cinematográfico (a partir de 2 créditos), feed social com cenas aprovadas.

3. Cadastro e Conta
Você deve fornecer um email válido e senha. É responsável pela segurança da sua conta. Reservamo-nos o direito de suspender contas que violem estes termos.

4. Planos e Créditos
Free: 10 interações/dia, 3 histórias ativas, modelo padrão, anúncios (mock).
Premium: ilimitado, modelos avançados, sem anúncios. Não inclui créditos gratuitos.
Créditos: adquiridos separadamente para modo cine, imagens e vídeos.

IMPORTANTE (Beta): Todas as compras são simuladas (mock/dev). Nenhuma cobrança real é feita.

5. Pagamentos (Beta)
Não há integração com Stripe, Apple IAP ou Google Play. Preços são mock. Nenhum dado de pagamento real é coletado.

6. Conteúdo de IA
Conteúdo narrativo gerado por IA pode ser imprevisível. Você é responsável pelas ações que envia. Reservamo-nos o direito de moderar ou remover conteúdo.

7. Conteúdo de Usuário
Não envie conteúdo ilegal, abusivo, difamatório ou pornográfico. Não explore o sistema de IA para gerar conteúdo proibido.

8. Feed Público
Cenas são privadas por padrão. Apenas cenas aprovadas aparecem no feed público. Comentários são moderados.

9. Imagens e Vídeos
Imagens: 1 crédito (Google Imagen). Vídeos: 5 créditos (Kling). Em caso de falha, créditos não são debitados. Recurso de personalização com foto não está ativo na beta.

10. Moderação
Conteúdo público passa por revisão. Podemos aprovar, rejeitar ou remover qualquer conteúdo. Denúncias são analisadas.

11. Limitações da Beta
Indisponibilidades, falhas de provedor e perda de dados podem ocorrer. Funcionalidades podem mudar sem aviso.

12. Isenção de Garantias
A Plataforma é fornecida "como está", sem garantias.

13. Limitação de Responsabilidade
Não nos responsabilizamos por danos indiretos, perda de dados ou conteúdo de IA inadequado.

14. Aviso
Enredo.ai é entretenimento. Não oferece aconselhamento profissional, jurídico, médico ou financeiro.

15. Reembolsos e Expiração
Não implementados na beta. Serão definidos antes da produção.

16. Alterações
Podemos atualizar estes termos. Uso continuado constitui aceitação.

17. Contato
support@enredo.ai`;

const PRIVACIDADE = `Política de Privacidade — Enredo.ai (Beta Fechada)

Última atualização: Maio de 2026.

1. Introdução
Esta política descreve como coletamos, usamos e protegemos seus dados na fase beta fechada.

2. Dados Coletados
Conta: nome, email, senha (hash criptográfico), avatar.
Leitura: histórias, sessões, premissas, personagens, ações em texto livre, histórico narrativo.
Mídia: metadados de imagens e vídeos gerados.
Social: curtidas, salvos, comentários, denúncias.
Créditos: saldo, histórico de transações, tipo de plano.
Técnico: uso de modelos IA, limites diários, metadados de requisições.
NÃO registramos: senhas em texto plano, conteúdo bruto de prompts, tokens de API de provedores.

3. Foto de Perfil e Aparência
O recurso de uso de foto como referência para vídeos NÃO está ativo na beta. Exigirá consentimento explícito quando implementado.

4. Uso dos Dados
Para gerar cenas (OpenRouter, OpenAI, Anthropic), imagens (Google Imagen) e vídeos (Kling).
Para moderação, segurança e diagnóstico de erros.
NÃO vendemos dados, não treinamos modelos públicos com seu conteúdo, não exibimos anúncios comportamentais.

5. Provedores Externos
OpenRouter/OpenAI/Anthropic: recebem trechos da história e ações do usuário.
Google Imagen: recebe descrição textual da cena.
Kling: recebe descrição e contexto da história.
Nenhum dado pessoal (nome, email) é enviado nos prompts. Nenhuma foto é enviada na beta.

6. Segurança
Dados em PostgreSQL (Supabase). Senhas com bcrypt. Refresh tokens com SHA-256. HTTPS.
Limitação: segurança em desenvolvimento. Não recomendamos dados sensíveis.

7. Retenção e Exclusão
Não há política automatizada na beta. Solicite exclusão em privacy@enredo.ai.

8. Menores de Idade
Não direcionado a menores de 13 anos. Uso entre 13-18 anos deve ser supervisionado.

9. Seus Direitos
Solicite acesso, correção ou exclusão em privacy@enredo.ai. Processo manual na beta.

10. Alterações
Podemos atualizar esta política. Uso continuado constitui aceitação.

11. Contato
privacy@enredo.ai`;

export default function LegalScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'termos' | 'privacidade'>('termos');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => goBackSafe('/(tabs)/profile')}>
          <ArrowLeft color={TEXT} size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Termos e Privacidade</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'termos' && styles.tabActive]}
          onPress={() => setTab('termos')}
        >
          <Text style={[styles.tabText, tab === 'termos' && styles.tabTextActive]}>
            Termos de Uso
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'privacidade' && styles.tabActive]}
          onPress={() => setTab('privacidade')}
        >
          <Text style={[styles.tabText, tab === 'privacidade' && styles.tabTextActive]}>
            Privacidade
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.legalText}>{tab === 'termos' ? TERMOS : PRIVACIDADE}</Text>
      </ScrollView>
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
  tabs: {
    flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 8,
    borderBottomWidth: 1, borderBottomColor: 'rgba(206, 189, 255, 0.08)',
    paddingBottom: 12,
  },
  tab: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    borderRadius: 12, backgroundColor: 'rgba(27, 24, 36, 0.6)',
  },
  tabActive: { backgroundColor: 'rgba(206, 189, 255, 0.12)' },
  tabText: { ...typography.label, color: SOFT_TEXT, fontSize: 12 },
  tabTextActive: { color: ACCENT },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 60 },
  legalText: { ...typography.body, color: SOFT_TEXT, lineHeight: 22, fontSize: 14 },
});
