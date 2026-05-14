# Modelo de Dados e Monetização — Enredo

## Diagrama de Entidades

```
User ─────────────────┐
  │                   │
  ├─ Subscription     │ (1:1)
  ├─ CreditWallet      │ (1:1)
  ├─ ReadingSession[]  │ (1:N)
  ├─ ModelUsage[]      │ (1:N)
  └─ DailyUsageLimit[] │ (1:N)

Story ────────────────┐
  │                   │
  ├─ StoryCharacter[]  │ (1:N)
  └─ ReadingSession[]  │ (1:N)

ReadingSession ────────┐
  │                   │
  ├─ NarrativeEvent[]  │ (1:N)
  └─ Story (N:1)       │

Subscription
  ├── type: FREE | PREMIUM
  ├── status: ACTIVE | CANCELLED | PAST_DUE
  └── credits: number

CreditWallet
  └── balance: number

CreditTransaction
  ├── type: EARN | SPEND | REFUND | EXPIRE
  ├── amount: number
  └── reason: string

NarrativeEvent
  ├── sceneText: string
  ├── choices: string[] (json)
  ├── userAction: string
  ├── modelUsed: string
  ├── tokensUsed: number
  └── generatedAt: Date

ModelUsage
  ├── model: string
  ├── inputTokens: number
  ├── outputTokens: number
  ├── costUsd: number
  └── userId: string

DailyUsageLimit
  ├── date: Date
  ├── freeInteractionsUsed: number
  └── limit: number

AdEvent
  ├── userId: string
  ├── storyId: string
  ├── sessionId: string
  ├── shownAt: Date
  └── type: INTERSTITIAL | BANNER
```

---

## Entidades Detalhadas

### User
```typescript
User {
  id: uuid
  email: string (único)
  passwordHash: string
  name: string
  avatarUrl?: string
  createdAt: Date
  updatedAt: Date
  lastActiveAt: Date
}
```

### Subscription
```typescript
Subscription {
  id: uuid
  userId: uuid (único)
  type: 'FREE' | 'PREMIUM'
  status: 'ACTIVE' | 'CANCELLED' | 'PAST_DUE'
  startedAt: Date
  cancelledAt?: Date
  currentPeriodEnd?: Date
  // Dados de payment gateway (futuro)
  paymentProviderId?: string
  paymentProviderStatus?: string
}
```

### CreditWallet
```typescript
CreditWallet {
  id: uuid
  userId: uuid (único)
  balance: number (integer, créditos)
  updatedAt: Date
}
```

### CreditTransaction
```typescript
CreditTransaction {
  id: uuid
  walletId: uuid
  type: 'EARN' | 'SPEND' | 'REFUND' | 'EXPIRE'
  amount: number (positivo para EARN, negativo para SPEND)
  reason: string
  metadata?: json
  createdAt: Date
}
```

### Story
```typescript
Story {
  id: uuid
  title: string
  synopsis: string
  coverUrl?: string
  genre: string[]
  authorName: string
  isPremium: boolean
  totalChapters: number
  publishedAt?: Date
  createdAt: Date
  updatedAt: Date
}
```

### StoryCharacter
```typescript
StoryCharacter {
  id: uuid
  storyId: uuid
  name: string
  description?: string
  imageUrl?: string
  role: 'PROTAGONIST' | 'SUPPORTING' | 'ANTAGONIST' | 'MINOR'
}
```

### ReadingSession
```typescript
ReadingSession {
  id: uuid
  userId: uuid
  storyId: uuid
  currentChapter: number
  currentSceneIndex: number
  memorySummary?: string (texto resumido da memória narrativa)
  status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED'
  startedAt: Date
  updatedAt: Date
  lastSceneAt?: Date
}
```

### NarrativeEvent
```typescript
NarrativeEvent {
  id: uuid
  sessionId: uuid
  chapterNumber: number
  sceneIndex: number
  sceneText: string (a cena gerada)
  choices: string[] (opções sugeridas pela IA, JSON array)
  userAction: string (ação chosen pelo usuário)
  userActionType: 'CHOICE' | 'FREE_TEXT'
  modelUsed: string
  inputTokens: number
  outputTokens: number
  generatedAt: Date
}
```

### ModelUsage
```typescript
ModelUsage {
  id: uuid
  userId: uuid
  sessionId?: uuid
  model: string (ex: "gpt-4o", "claude-3-sonnet")
  inputTokens: number
  outputTokens: number
  costUsd: number
  feature: 'SCENE_GENERATION' | 'MEMORY_SUMMARY' | 'IMAGE_GENERATION'
  createdAt: Date
}
```

### DailyUsageLimit
```typescript
DailyUsageLimit {
  id: uuid
  userId: uuid
  date: Date (YYYY-MM-DD)
  freeInteractionsUsed: number
  limit: number (default: 10 para Free)
}
```

### AdEvent
```typescript
AdEvent {
  id: uuid
  userId: uuid
  sessionId: uuid
  storyId: uuid
  type: 'INTERSTITIAL' | 'BANNER'
  provider: 'GOOGLE_ADMOB' | 'FACEBOOK_ADS' (futuro)
  shownAt: Date
}
```

---

## Modelo de Monetização

### Planos

| Feature                    | Free         | Premium        | Credits        |
|----------------------------|--------------|----------------|----------------|
| Biblioteca pública         | ✅           | ✅             | ✅             |
| Interações/dia             | 10           | Unlimited      | Unlimited      |
| Modelo de IA               | GPT-4o-mini  | GPT-4o/Claude  | Opus + Gemini  |
| Tamanho de resposta        | Curto (~500) | Médio (~2000)  | Longo (~4000)  |
| Memória narrativa          | Resumo       | Expandida      | Full           |
| Anúncios                   | Sim          | Não            | Não            |
| Criação de histórias       | Limitada     | Avançada       | Avançada       |
| Múltiplos caminhos salvos  | 1            | 5              | 10+            |
| Histórias premium          | Não          | Sim            | Sim            |
| Geração de imagens         | Não          | Não            | Sim            |
| Modo cinematográfico      | Não          | Não            | Sim            |

### Créditos — Preços de Referência

| Ação                    | Custo em Créditos |
|-------------------------|-------------------|
| Cena longa (4000 tokens) | 2                 |
| Resumo de memória        | 1                 |
| Geração de imagem (capa) | 5                 |
| Geração de imagem (personagem) | 3           |
| Múltiplos caminhos       | 1 por salvamento  |

### Custo de Aquisição de Créditos (exemplo)

| Pacote       | Créditos | Preço |
|--------------|----------|-------|
| Starter      | 50       | R$ 9,90 |
| Popular      | 150      | R$ 24,90 |
| Colecionador | 500      | R$ 69,90 |

---

## Regras de Negócio

### Limite Diário Free
- Usuários Free têm **10 interações por dia**
- Contador reseta às 00:00 UTC
- Ao atingir limite, mostrar modal de upgrade ou "volte amanhã"

### Memória Narrativa
- Histórico completo de NarrativeEvents é armazenado
- Quando > 20 eventos, acionar resumo automático
- Resumo substitui histórico na próxima chamada ao LLM
- Resumo é armazenado em `ReadingSession.memorySummary`

### Anúncios
- **Intersticiais** aparecem entre capítulos (nunca no meio de uma cena)
- **Banners** não existem no MVP (podem ser adicionados no futuro)
- Nunca interromper momento de escolha do usuário
- Registro de cada exibição em `AdEvent`

### Custos de LLM
- Cada chamada a LLM registra custo em `ModelUsage`
- `costUsd` calculado baseado em pricing atual do provedor
- Dashboard admin futura mostrará custos agregados por período

---

## Índices Recomendados no PostgreSQL

```sql
-- Performance em listagens
CREATE INDEX idx_reading_session_user ON reading_sessions(user_id);
CREATE INDEX idx_reading_session_story ON reading_sessions(story_id);
CREATE INDEX idx_narrative_event_session ON narrative_events(session_id);
CREATE INDEX idx_model_usage_user ON model_usage(user_id);
CREATE INDEX idx_model_usage_created ON model_usage(created_at);
CREATE INDEX idx_daily_usage_limit_user_date ON daily_usage_limits(user_id, date);

-- Buscas textuais
CREATE INDEX idx_story_title_gin ON stories USING gin(to_tsvector('portuguese', title));
CREATE INDEX idx_story_synopsis_gin ON stories USING gin(to_tsvector('portuguese', synopsis));
```