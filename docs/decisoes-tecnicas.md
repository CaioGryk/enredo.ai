# Decisões Técnicas — Enredo

## Stack Escolhida e Justificativas

### Backend: NestJS + Prisma + PostgreSQL

**Escolha:** NestJS como framework principal

**Justificativas:**
- Estrutura modular facilita organizar módulos (auth, library, reading, billing)
- Decorators TypeORM/Prisma são expressivos para domain models
- Integração nativa com DI container
- Suporte robusto a guards, interceptors, pipes
- Boa documentação e comunidade ativa

**Alternativa considerada:** Fastify
- Descartado porque a complexidade de injeção manual não compensa para o escopo

**ORM:** Prisma

**Justificativas:**
- Schema-first (ideal para modelagem de domínio clara)
- Migrações versionadas
- Type-safe queries
- Preview de migrations antes de aplicar

**Alternativa considerada:** TypeORM
- Descartado porque Prisma tem DX superior para este projeto

---

### Frontend: Next.js 14+ (App Router)

**Escolha:** Next.js com App Router

**Justificativas:**
- Server Components para biblioteva (listagens rápidas)
- Rotas dinâmicas nativas para `/historias/[id]`
- SEO otimizado para páginas públicas da biblioteca
- Image optimization nativo para capas
-够用 para o escopo MVP

**UI Library:**shadcn/ui + Tailwind

**Justificativas:**
- Componentes acessíveis por padrão
- Customização fácil via Tailwind
- Design system consistente
- Radix UI por baixo = bom accessibility

**Alternativa considerada:** Mantine
- Descartado porque shadcn é mais leve e customizável

---

### Cache: Redis

**Uso principal:**
1. Cache de listagens de histórias ( invalidate on publish )
2. Rate limiting por usuário e IP
3. Filas BullMQ (jobs assíncronos)
4. Cache de sessão de leitura ativa

**Alternativa considerada:** Memcached
- Descartado porque Redis tem数据结构 mais ricas

---

### IA: LLM Gateway Próprio

**Arquitetura:**
```
┌─────────────────────────────────┐
│        LLM Gateway Service       │
├─────────────────────────────────┤
│ - Prompt Template Engine         │
│ - Model Router (por plano)       │
│ - Memory Manager (resumo)        │
│ - Cost Tracker                   │
│ - Retry/ Fallback Logic          │
└─────────────────────────────────┘
```

**Provedores suportados:**
- OpenAI (GPT-4o, GPT-4o-mini)
- Anthropic (Claude 3.5 Sonnet, Opus)
- Google (Gemini Pro)
- Azure OpenAI (futuro, para empresas)

**Abstração:**
```typescript
interface LLMProvider {
  generate(prompt: Prompt, config: GenerateConfig): Promise<LLMResponse>;
  estimateCost(tokens: TokenCount): CostEstimate;
  getModelForPlan(plan: SubscriptionType): string;
}
```

---

### Autenticação: JWT

**Estrutura de tokens:**
- Access token: 15 min, com userId + plan
- Refresh token: 7 dias, stored in httpOnly cookie

**Segurança:**
- Refresh token rotation em cada uso
- Invalidar todos os refresh tokens ao trocar senha
- Rate limit em endpoints de auth

**Alternativa considerada:** NextAuth
- Descartado porque precisamos de controle fino sobre tokens JWT customizados

---

## Padrões de Código

### Backend (NestJS)

**Estrutura de módulos:**
```
src/
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.module.ts
│   │   ├── strategies/
│   │   └── guards/
│   ├── library/
│   ├── reading/
│   ├── ai/
│   └── billing/
├── common/
│   ├── decorators/
│   ├── filters/
│   ├── interceptors/
│   └── pipes/
├── config/
└── main.ts
```

**Validação:** class-validator + class-transformer

**Erros:** Custom exceptions com HttpException

**Logs:** Pino logger

---

### Frontend (Next.js)

**Estrutura:**
```
apps/web/
├── src/
│   ├── app/                 # App Router pages
│   │   ├── (auth)/
│   │   ├── historias/
│   │   ├── ler/
│   │   └── perfil/
│   ├── components/
│   │   ├── ui/              # shadcn components
│   │   ├── library/
│   │   ├── reader/
│   │   └── billing/
│   ├── hooks/
│   ├── lib/
│   │   ├── api.ts           # axios client
│   │   └── auth.ts          # auth helpers
│   └── types/
├── public/
└── package.json
```

---

### Commits

**Convenção:** Conventional Commits

```
feat: nova funcionalidade
fix: correção de bug
docs: documentação
refactor: refatoração
test: testes
chore: tasks de build/infra
```

---

## Configurações de Ambiente

### Variáveis de Ambiente (Backend)

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/enredo

# Redis
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=your-secret
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_SECRET=your-refresh-secret
REFRESH_TOKEN_EXPIRES_IN=7d

# LLM Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...

# Default LLM (Free tier)
DEFAULT_FREE_MODEL=gpt-4o-mini
DEFAULT_PREMIUM_MODEL=gpt-4o
DEFAULT_CREDITS_MODEL=claude-3-5-sonnet-20241022

# Ads (futuro)
GOOGLE_ADS_APP_ID=...
```

### Variáveis de Ambiente (Frontend)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Rate Limiting

**Estratégia:**

| Endpoint | Limite | Janela |
|----------|--------|--------|
| POST /auth/register | 5 | 1 hora |
| POST /auth/login | 10 | 1 hora |
| POST /reading/action | por plano | por dia |
| GET /library | 100 | 1 minuto |
| POST /credits/purchase | 3 | 1 hora |

**Implementação:** Redis + @nestjs/throttler

---

## Migrações de Banco

**Estratégia:**
1. Prisma migrations com versionamento semântico
2. Nunca modificar migrations aplicadas em produção
3. Scripts de seed para dados iniciais (gêneros, histórias demo)
4. Migrations devem ser idempotentes quando possível

---

## Testing

**Backend:**
- Jest + Supertest para API tests
- Cobertura mínima: 70%

**Frontend:**
- Vitest + React Testing Library
- Cypress para E2E (futuro)

---

## CI/CD (Futuro)

**GitHub Actions:**
1. Lint + Typecheck
2. Testes
3. Deploy to staging (auto)
4. Deploy to production (manual approval)

Docker image build fica fora do MVP imediato e so deve voltar ao escopo quando houver decisao de deploy/containerizacao.
