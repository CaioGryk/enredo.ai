# Política de Privacidade — Enredo.ai (Beta Fechada)

**Última atualização:** Maio de 2026
**Status:** Beta fechada local/dev — não é um serviço de produção.

---

## 1. Introdução

Esta Política de Privacidade descreve como o Enredo.ai ("Plataforma", "nós") coleta, usa, armazena e protege os dados dos usuários durante a fase de **beta fechada** (ambiente local de desenvolvimento).

Ao usar a Plataforma, você concorda com a coleta e uso de dados conforme descrito nesta política.

---

## 2. Dados que Coletamos

### 2.1 Dados de Conta
- Nome de usuário.
- Endereço de email.
- Senha (armazenada com hash criptográfico — nunca em texto plano).
- Imagem de perfil (avatar), se fornecida.

### 2.2 Dados de Leitura
- Histórias que você inicia e sessões de leitura ativas.
- Premissas e personagens selecionados.
- Ações em texto livre e escolhas sugeridas que você envia.
- Histórico narrativo (cenas geradas pela IA).
- Memória narrativa persistente (contexto da história).

### 2.3 Dados de Mídia Gerada
- Metadados de imagens e vídeos gerados por cena.
- Status de visibilidade (privado/público) e moderação.
- URLs de mídia gerada.

### 2.4 Dados Sociais
- Curtidas, salvos e compartilhamentos em cenas públicas.
- Comentários em cenas públicas.
- Denúncias de conteúdo.

### 2.5 Dados de Créditos e Assinatura
- Saldo da carteira de créditos.
- Histórico de transações de crédito (compras, gastos, concessões administrativas).
- Tipo de plano (Free/Premium) e status da assinatura.
- **Importante (Beta):** Nenhum dado de pagamento real é coletado. As "compras" são simulações de desenvolvimento.

### 2.6 Dados Técnicos
- Registros de uso de modelos de IA (tipo de modelo, provedor, tokens).
- Limites diários de interação para usuários Free.
- Metadados de requisições (IDs de requisição, endpoints acessados, status HTTP).
- **Não registramos:** senhas em texto plano, conteúdo bruto de prompts, respostas completas da IA, ou tokens de API de provedores externos.

---

## 3. Foto de Perfil e Aparência Pessoal

- **Situação atual (Beta):** O recurso de uso de foto de perfil como referência de aparência para geração de vídeos personalizados **não está ativo**.
- Quando implementado, exigirá consentimento explícito (opt-in) do usuário.
- Nenhuma foto de perfil ou imagem pessoal é enviada a provedores externos de vídeo na versão beta atual.

---

## 4. Como Usamos os Dados

### 4.1 Funcionamento do Serviço
- Para gerar cenas narrativas com IA (provedores: OpenRouter, OpenAI, Anthropic).
- Para gerar imagens de cena (Google Imagen).
- Para gerar vídeos de cena (Kling).
- Para gerenciar sessões de leitura, créditos e assinaturas.

### 4.2 Moderação e Segurança
- Para detectar e bloquear injeção de prompt e conteúdo abusivo.
- Para revisar cenas e comentários enviados à curadoria.
- Para processar denúncias de conteúdo inadequado.

### 4.3 Operação e Melhoria
- Para monitorar uso de modelos e limites diários.
- Para diagnosticar erros e falhas (usando logs seguros, sem dados sensíveis).
- Para análises agregadas e anônimas de uso da plataforma.

### 4.4 O que NÃO fazemos
- Não vendemos dados pessoais a terceiros.
- Não usamos conteúdo de leitura para treinar modelos de IA públicos.
- Não exibimos anúncios baseados em perfil comportamental (anúncios na beta são mock/placeholders).

---

## 5. Provedores Externos

A Plataforma utiliza provedores externos de IA para gerar conteúdo:

| Provedor | Finalidade | Dados Enviados |
|----------|-----------|----------------|
| OpenRouter / OpenAI / Anthropic | Geração de cenas narrativas | Trechos da história, contexto narrativo, ação do usuário |
| Google Imagen | Geração de imagens de cena | Descrição textual da cena |
| Kling | Geração de vídeos de cena | Descrição textual da cena, contexto da história |

- Nenhum dado de identificação pessoal (nome, email) é enviado a provedores de IA como parte do prompt.
- Na versão beta atual, **nenhuma foto de perfil é enviada** ao Kling ou qualquer outro provedor.

---

## 6. Armazenamento e Segurança

- Os dados são armazenados em banco de dados PostgreSQL (Supabase).
- Senhas são protegidas com hash criptográfico (bcrypt).
- Tokens de atualização (refresh tokens) são armazenados como hash SHA-256, não como texto plano.
- Comunicação com a API é feita via HTTPS.
- **Limitações da Beta:** A segurança da plataforma ainda está em desenvolvimento. Não oferecemos garantias absolutas de segurança. Não recomendamos o uso com dados extremamente sensíveis nesta fase.

---

## 7. Retenção e Exclusão de Dados

- **Beta:** Não há política automatizada de retenção ou exclusão de dados implementada.
- Você pode solicitar a exclusão da sua conta e dados associados enviando um email para privacy@enredo.ai.
- Dados agregados e anonimizados podem ser retidos para fins de análise mesmo após a exclusão da conta.
- **Créditos:** Não há expiração automática de créditos na versão beta.

---

## 8. Menores de Idade

- A Plataforma não é direcionada a menores de 13 anos.
- Não coletamos intencionalmente dados de menores de 13 anos.
- Se você é pai/mãe ou responsável e acredita que seu filho nos forneceu dados pessoais, entre em contato pelo email privacy@enredo.ai.
- **Recomendação Beta:** O uso da plataforma por adolescentes entre 13 e 18 anos deve ser supervisionado por um responsável.

---

## 9. Seus Direitos (Beta)

Na fase beta, oferecemos os seguintes canais:
- Solicitar acesso aos seus dados: privacy@enredo.ai.
- Solicitar correção de dados: privacy@enredo.ai.
- Solicitar exclusão de conta e dados: privacy@enredo.ai.

**Limitação:** O processo é manual durante a beta. Prazos de resposta podem variar.

---

## 10. Alterações nesta Política

Podemos atualizar esta Política de Privacidade a qualquer momento. Alterações significativas serão comunicadas pela Plataforma. O uso continuado após alterações constitui aceitação da nova política.

---

## 11. Contato

Para dúvidas sobre privacidade ou para exercer seus direitos:
- **Email:** privacy@enredo.ai

---

**Esta política aplica-se exclusivamente à versão beta fechada do Enredo.ai. Versões futuras podem ter políticas diferentes.**
