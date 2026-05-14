# Contexto do Projeto — Enredo.ai

## Visão do Produto

O Enredo.ai **não é um app de histórias com caminhos fixos**.
O Enredo.ai **não é um app de branching paths ou escolhas predefinidas**.

O Enredo.ai é um app de **conversa narrativa aberta com IA**:
- O usuário escolhe uma premissa jogável e um personagem jogável como **contexto inicial**.
- A partir daí, a história evolui como uma **conversa aberta com a IA**.
- O usuário escreve ações em texto livre, e a IA gera a próxima situação narrativa dinamicamente.
- Escolhas sugeridas são **conveniência opcional**, não a estrutura principal.

## Fluxo Central do Produto

1. **Usuário abre uma história** na biblioteca
2. **Usuário escolhe 1 das 3 premissas jogáveis** geradas por IA:
   - A premissa define a situação inicial, tom, regras do mundo
   - Não define um caminho fixo ou final predeterminado
3. **Usuário escolhe 1 dos 3 personagens jogáveis** para essa premissa:
   - Define quem o usuário será na história (protagonista)
   - Tem função narrativa, personalidade, motivação, segredo
4. **Usuário inicia a leitura**
5. **IA gera a primeira cena** usando:
   - História base
   - Premissa selecionada
   - Personagem selecionado
6. **Usuário escreve uma ação em texto livre**
7. **IA gera a próxima cena dinamicamente**
8. **Backend persiste** a cena, ação do usuário e atualiza memória narrativa
9. **Todas as cenas futuras continuam da memória persistente**, não de capítulos fixos

## Terminologia Correta

### Use:
- **Premissa jogável** (playable premise)
- **Contexto narrativo inicial** (narrative setup)
- **Premissa de início** (starting premise)
- **Protagonista/Personagem selecionado** (selected protagonist/persona)
- **Sessão aberta** (open-ended session)
- **Ação em texto livre** (free-text action)
- **Situação narrativa** (narrative situation)
- **Memória narrativa persistente** (persistent narrative memory)

### Evite:
- "Caminho" ou "path"
- "Capítulo fixo" ou "chapter sequence"
- "Branch" ou "ramo"
- "Escolha binária" ou "escolha fixa"
- "Final predeterminado"

## O "Magic" do Enredo.ai

O diferencial do Enredo.ai é que **a IA gera situações dinamicamente após cada ação do usuário**:
- Não há caminhos pré-definidos
- A memória narrativa (mundo, personagens, escolhas importantes, threads em aberto) persiste e evolui
- Cada cena é única e dependente de tudo que aconteceu antes
- O usuário tem controle total via texto livre

## Entrada de Texto Livre é Primária

- O usuário **sempre pode ignorar escolhas sugeridas** e escrever sua própria ação
- Escolhas sugeridas são **atalhos convenientes**, não obrigatórias
- O campo de texto livre é a interface principal de interação
- A IA deve interpretar qualquer ação em texto livre dentro do contexto narrativo

## Premissas e Personagens são Contexto Inicial

### Premissas Jogáveis
Cada premissa deve descrever:
- **Situação inicial** (starting situation)
- **Pergunta dramática** (dramatic question)
- **Tom** (tone)
- **Regras do mundo** (world rules)
- **Cena de abertura** (opening scene)
- **Restrições** (constraints)
- **Prompt visual para capa**

**Não devem definir**:
- Final fixo
- Sequência de capítulos
- Caminhos obrigatórios

### Personagens Jogáveis
Cada personagem deve incluir:
- **Nome** (name)
- **Rótulo de papel** (roleLabel)
- **Função narrativa** (narrativeFunction: HEROr, MENTOR, ALLY, SKEPTIC, RIVAL, VILLAIN, etc.)
- **Personalidade** (personality)
- **Motivação** (motivation)
- **Segredo** (secret)
- **Relacionamento com o jogador** (relationshipToPlayer)
- **Objetivo inicial** (initialGoal)
- **Potencial de conflito** (conflictPotential)
- **Prompt visual** (visualPrompt)

## Fluxo Técnico de Leitura

### POST /api/reading/start
- Aceita `storyId`, `selectedPremiseId`, `selectedCharacterId`
- Cria/retoma uma sessão vinculada a esse contexto exato
- Gera primeira cena dinamicamente com IA/mock
- Persiste primeira cena como `NarrativeEvent`
- Inicializa `NarrativeMemory` com:
  - Contexto da premissa selecionada
  - Contexto do personagem selecionado

### POST /api/reading/sessions/:id/action
- Aceita ação do usuário em **texto livre**
- Trata escolhas sugeridas apenas como **entrada de texto opcional**
- **Sempre envia para IA**:
  - Contexto base da história
  - Contexto da premissa selecionada
  - Contexto do personagem jogável selecionado
  - Cena anterior
  - Campos de `NarrativeMemory` persistente
  - Ação em texto livre do usuário
- Persiste a próxima cena gerada
- Atualiza `NarrativeMemory` com consequências, estado do mundo, estado de personagens, escolhas importantes e threads em aberto

## Decisão: Story Setup GET é Cache-Only

### Regra de Negócio
- Endpoints GET de setup (`/story-setup/stories/:id/premises`, `/story-setup/premises/:id/characters`) são **cache-only**
- **NÃO disparam geração automática** de LLM para evitar custo descontrolado
- Geração de premissas/personagens é um passo de **admin/dev/pre-publish**
- Contas de usuário real devem ter histórias pré-populadas com:
  - 3 premissas jogáveis por história
  - 3 personagens jogáveis por premissa

### Comportamento do Frontend Mobile
- Tratar estados vazios (404 ou array vazio) graciosamente
- Mostrar "Nenhuma premissa disponível ainda" em vez de erro genérico
- Permitir que o usuário continue após seleção de contexto inicial

### Documentação de Produção
- Setup generation é um passo administrativo, **não** uma ação pública disparada por usuários
- Histórias em produção devem ser pré-populadas antes do lançamento
- GET endpoints apenas leem do banco, não geram conteúdo novo

### Implicação no Código
```typescript
// GET /story-setup/stories/:id/premises
// Apenas lê do banco, NÃO gera LLM
const premises = await prisma.storyPremise.findMany({ where: { storyId } });
return premises; // pode ser vazio

// POST /story-setup/stories/:id/premises/generate
// Apenas admin/dev usa isso para popular histórias
const newPremises = await aiService.generatePremises(...);
await prisma.$transaction(/* salvar no banco */);
```

## Estratégia de AI Providers (Atualizado)

### Visão Geral
O Enredo.ai utiliza múltiplos providers de IA com estratégia de custo otimizada:

1. **Texto: OpenRouter (Modelos Gratuitos)**
   - Provider padrão: `openrouter/free`
   - `FREE_LLM_ONLY=true` bloqueia qualquer modelo pago, mesmo se solicitado por engano
   - Sem fallback silencioso para modelos pagos
   - Sem chave OPENROUTER_API_KEY = erro explícito (não envia request com Bearer vazio)

2. **Imagens: Google AI Studio (Gemini)**
   - Usado para:
     - Capas de histórias
     - Capas de premissas
     - Retratos de personagens jogáveis
   - Feature flag: `ENABLE_IMAGE_GENERATION=true`
   - Falha na geração de imagem NÃO afeta geração de texto
   - Dados salvos em: `coverUrl`, `imageUrl` (base64 ou URL)

3. **Vídeo: Desativado (Preparação de Foundation)**
   - Feature flag: `ENABLE_VIDEO_GENERATION=false`
   - Nenhuma chamada de provider real é feita
   - Interface preparada para implementação futura
   - Retorna erro claro: "disabled in current environment"

### Variáveis de Ambiente Obrigatórias
```bash
# Provedores de IA
OPENROUTER_API_KEY=sk-or-v1-...        # Para texto (gratuito)
GOOGLE_AI_API_KEY=AIza...                # Para imagens

# Flags de Feature
FREE_LLM_ONLY=true                       # true = apenas modelos gratuitos
ENABLE_IMAGE_GENERATION=true              # true = geração de imagem ativa
ENABLE_VIDEO_GENERATION=false             # false = vídeo desativado
```

### Parsing Explícito de Booleanos
O sistema NÃO usa strings truthy ("false" como verdadeiro):
```typescript
// Correto - parsing explícito
isEnabled(): boolean {
  const value = configService.get<boolean | string>('ENABLE_IMAGE_GENERATION');
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase().trim() === 'true';
  return false; // string "false" retorna false, não true
}
```

### Fluxo de Setup Inicial (Admin/Manual)
1. Admin gera premissas via `POST /story-setup/stories/:id/premises/generate`
2. Sistema gera texto (OpenRouter free) + imagens (Google AI se habilitado)
3. Admin gera personagens via `POST /story-setup/premises/:id/characters/generate`
4. Sistema gera texto (OpenRouter free) + retratos (Google AI se habilitado)
5. **GET endpoints apenas retornam cache** - não disparam geração
6. Usuários finais veem histórias pré-populadas

### Segurança nos Endpoints de Geração
- Endpoints POST de geração requerem JWT (`@UseGuards(JwtAuthGuard)`)
- Produção: requer `STORY_SETUP_GENERATION_ENABLED=true`
- Produção: requer `ADMIN_EMAILS` configurado (comma-separated emails)
- Apenas usuários admin (por email) podem disparar geração em produção
- GET endpoints são públicos para leitura de cache apenas

### Migração do Banco de Dados
Após deploy com novos campos de status de geração visual:

```bash
# Aplicar migração em produção (Supabase)
npx prisma migrate deploy

# Ou se usando db push:
npx prisma db push
```

**Novos campos adicionados:**
- `StoryPremise`: `coverGenerationStatus`, `coverError`
- `StoryPlayableCharacter`: `imageGenerationStatus`, `imageError`
- Enum: `GenerationStatus` (NOT_REQUESTED, PENDING, SUCCESS, FAILED)

### Retorno de Geração (Atualizado)
Os endpoints de geração (`generatePremises`, `generateCharacters`) agora:
1. Criam registros com status `PENDING`
2. Executam geração de imagens (se habilitado)
3. **Recarregam do banco** antes de retornar DTOs
4. Retornam status atualizado: `coverGenerationStatus`, `imageGenerationStatus`, `coverError`, `imageError`
5. URLs de imagem (`coverUrl`, `imageUrl`) são atualizadas no banco e retornadas frescas

### População Manual de Histórias (Admin Workflow)
Para popular o Enredo.ai com conteúdo inicial:

**Pré-requisitos:**
```bash
# .env
OPENROUTER_API_KEY=sk-or-v1-...        # Para texto (openrouter/free)
GOOGLE_AI_API_KEY=AIza...                # Para imagens (opcional)
FREE_LLM_ONLY=true
ENABLE_IMAGE_GENERATION=true              # Se quiser gerar imagens
ENABLE_VIDEO_GENERATION=false
```

**Script de População:**
```bash
# Popular uma história específica
node services/api/scripts/populate-stories.js --storyId=<id>

# Popular múltiplas histórias
node services/api/scripts/populate-stories.js --storyIds=<id1>,<id2>,<id3>

# Forçar regeração de conteúdo existente
node services/api/scripts/populate-stories.js --storyId=<id> --force

# Ajuda
node services/api/scripts/populate-stories.js --help
```

**O que o script faz:**
1. Gera 3 premissas para cada história (OpenRouter free)
2. Gera 3 personagens para cada premissa (OpenRouter free)
3. Gera imagens de capa e retratos (se `ENABLE_IMAGE_GENERATION=true`)
4. **Não sobrescreve** conteúdo existente (a menos que `--force`)
5. Exibe relatório com:
   - Texto gerado: sim/nao
   - Imagem gerada: sim/nao
   - Status da imagem
   - Mensagens de erro (se houver)

**Notas:**
- Vídeo permanece desativado (`ENABLE_VIDEO_GENERATION=false`)
- Geração de imagens falha de forma não-bloqueante para texto
- Execute `npx prisma db push` ou `npx prisma migrate deploy` antes da primeira execução
