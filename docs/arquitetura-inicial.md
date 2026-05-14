# Arquitetura Inicial — Enredo

## Visão Geral

O Enredo é uma aplicação web/mobile de histórias interativas guiadas por IA. A arquitetura é orientada a **biblioteca + leitor + gerador**, não a chat genérico.

---

## Princípios Arquiteturais

1. **Backend como único ponto de IA** — nenhum LLM chamado diretamente do frontend
2. **Separação clara de contextos** — auth, biblioteca, leitura, geração, billing
3. **Resiliência de custos** — toda chamada a LLM é registrada e rate-limited
4. **Memória resumida** — contexto narrativo é compactado antes de enviar ao modelo
5. **Multi-provedor** — abstração sobre LLM para trocar provedores facilmente
6. **Multi-tenant preparado** — estrutura que suportaria múltiplos tenants futuros

---

## Camadas da Arquitetura

```
┌─────────────────────────────────────────────┐
│                  Frontend                    │
│            (Next.js / React Native)          │
└─────────────────────┬───────────────────────┘
                      │ REST API
┌─────────────────────▼───────────────────────┐
│                 Backend API                  │
│                  (NestJS)                   │
│  ┌──────────┬──────────┬──────────┬──────┐  │
│  │   Auth   │ Biblioteca│ Leitura │Billing│  │
│  └──────────┴──────────┴──────────┴──────┘  │
└─────────────────────┬───────────────────────┘
                      │
┌─────────────────────▼───────────────────────┐
│              LLM Gateway                      │
│  ┌────────────┬───────────┬──────────────┐  │
│  │Orquestrador│  Prompts  │  Memory Pool │  │
│  └────────────┴───────────┴──────────────┘  │
└─────────────────────┬───────────────────────┘
                      │
         ┌────────────┼────────────┐
         ▼            ▼            ▼
    ┌─────────┐  ┌─────────┐  ┌──────────┐
    │ OpenAI  │  │Anthropic│  │  Google │  │
    │/Azure   │  │ Claude  │  │ Gemini  │  │
    └─────────┘  └─────────┘  └──────────┘
```

---

## Módulos do Backend

### Auth Module
- Registro/Login (email + senha, OAuth futuro)
- JWT access + refresh tokens
- Sessões ativas
- Multi-device logout

### Library Module
- Listar histórias públicas (com paginação e filtros)
- Buscar histórias por gênero, autor, popularidade
- Detalhe de história (capítulos, personagens, sinopse)

### Reading Module
- Criar/resumir ReadingSession
- Criar NarrativeEvent (evento narrativo = cena + escolha)
- Salvar progresso
- Listar eventos de uma sessão

### AI Generation Module (LLM Gateway)
- Receber contexto narrativo atual + ação do usuário
- Resumir memória se necessário (via chamada interna ao LLM)
- Escolher modelo correto por plano do usuário
- Gerar próxima cena narrativa
- Retornar cena + opções sugeridas (se aplicável)

### Billing Module
- Subscription (plano Free/Premium)
- CreditWallet (carteira de créditos)
- CreditTransaction (histórico de créditos)
- DailyUsageLimit (limite diário de interações Free)

### Analytics Module
- ModelUsage (cada chamada a LLM com custo)
- AdEvent (registro de impressões de anúncio)

---

## Fluxo Principal de Leitura

```
1. POST /reading/start    → cria ReadingSession
2. GET  /reading/:id/scene → retorna cena atual
3. POST /reading/action   → usuário envia escolha/ação
         │
         ▼
   ┌─────────────────┐
   │  LLM Gateway    │
   │  1. Summarize   │ ← se memória > limite
   │  2. Generate    │ ← cena + opções
   │  3. Record cost │
   └────────┬────────┘
            │
            ▼
   POST /narrative-event  → salva evento
   POST /model-usage      → registra uso
   ← retorna próxima cena
```

---

## Frontend — Estrutura de Páginas

```
/                    → Landing + Biblioteca
/historias           → Biblioteca (lista)
/historias/[id]      → Detalhe da história
/ler/[sessionId]     → Leitor de cena (layout livro)
/perfil              → Perfil + assinatura + créditos
/admin               → Futuro: criação de histórias
```

### Leitor de Cena (UX Principal)

- Layout focado em **leitura** (fonte literária, espaço generoso)
- Cena narrada em parágrafos, não em bolhas de chat
- Seção de escolhas abaixo da cena:
  - Cartões com opções sugeridas pela IA
  - Campo de texto livre: "Escreva sua ação..."
- Indicador de progresso (capítulo X de Y)
- Botão de "continuar depois" (salva estado)
- Nunca mostrar teclado durante leitura (mobile)

---

## Infraestrutura

### Docker
- Fora do escopo imediato do MVP.
- O backend deve rodar localmente via `npm run dev`.
- O banco principal de desenvolvimento e Supabase Postgres.
- Docker/compose pode ser retomado depois para padronizacao local ou deploy especifico.

### Database
- Supabase Postgres com Prisma como ORM
- Migrations versionadas
- Índices em queries frequentes (listagem, busca)

### Workers
- BullMQ para jobs assíncronos
- Jobs: resumo de memória,Cleanup de sessões,billing recorrente

---

## Segurança

- Autenticação JWT com refresh tokens rotativos
- Rate limiting por IP e por usuário
- Validação de entrada (class-validator)
- Sanitização de prompts injetados pelo usuário
- Criptografia de dados sensíveis (senhas, payment tokens)

---

## Escalabilidade

- Cache Redis para listagens frequentes
- Paginação em todas as listagens
- Background jobs para operações pesadas
- Preparado para escalar workers horizontalmente

---

## Glossário de Conceitos

| Conceito | Definição |
|----------|-----------|
| Story | A história completa (título, sinopse, capa, capítulos) |
| ReadingSession | Uma sessão de leitura de um usuário em uma história |
| NarrativeEvent | Uma cena + escolha do usuário + resposta da IA |
| Memory Summary | Resumo compactado do histórico narrativo |
| LLM Gateway | Camada que orquestra chamadas aos provedores de IA |
| CreditWallet | Carteira de créditos do usuário para recursos premium |
