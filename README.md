# Enredo

Histórias que mudam com você.

Enredo é uma plataforma de histórias interativas guiadas por IA. Diferente de chatbots genéricos, o Enredo é uma **biblioteca de histórias vivas** — o usuário escolhe uma narrativa, lê cenas imersivas e altera o rumo da trama através de escolhas sugeridas pela IA ou ações escritas livremente.

## Visão do MVP

O MVP deve entregar:

1. **Biblioteca de histórias** — usuários navegam por títulos, capas e sinopses
2. **Leitura imersiva** — cenas narrativas formatadas como livro, não como chat
3. **Sistema de escolhas** — opções sugeridas pela IA + campo livre para ação
4. **Progresso narrativo** — estado salvo por capítulo/cena
5. **Geração via backend** — toda IA passa pelo API gateway, nunca diretamente do frontend
6. **Planos Free/Premium** — com limites de uso, qualidade de resposta e anúncios

---

## Estrutura do Repositório

```
enredo.ai/
├── apps/
│   ├── web/          # Frontend Next.js (React)
│   └── mobile/       # Frontend futuro (React Native/Expo)
├── services/
│   ├── api/          # Backend NestJS/Fastify + PostgreSQL
│   └── workers/      # Background jobs (cron, filas)
├── packages/
│   ├── shared/       # Types, validações, utils compartilhadas
│   ├── prompts/      # Prompts de sistema para cada modelo
│   └── config/       # Configs centralizadas (turborepo, eslint, etc)
├── infra/
│   ├── docker/       # Opcional/futuro; nao bloqueia o MVP
│   ├── database/     # Schemas, diagramas
│   └── migrations/   # migrations SQL
├── docs/             # Documentação do projeto
└── scripts/          # Scripts utilitários
```

---

## Como Backend, Frontend e IA se Relacionam

```
┌─────────────┐      ┌─────────────┐      ┌─────────────────┐
│   Frontend  │ ──── │  Backend    │ ──── │  LLM Gateway    │
│  (Next.js)  │ REST │  (NestJS)   │      │  (Orquestrador) │
└─────────────┘      └──────┬──────┘      └────────┬────────┘
                            │                       │
                            ▼                       ▼
                    ┌─────────────┐          ┌─────────────┐
                    │ PostgreSQL  │          │ Redis/Cache │
                    └─────────────┘          └─────────────┘
```

1. **Frontend** nunca chama LLM diretamente
2. **Backend** recebe ação do usuário, verifica limites/assinatura
3. **LLM Gateway** orquestra modelo correto por plano
4. **Memória narrativa** é resumida progressivamente antes de enviar ao modelo
5. **Uso/custo** é registrado em `ModelUsage` a cada chamada

---

## Stack Recomendada

| Camada       | Tecnologia                          |
|--------------|-------------------------------------|
| Backend      | Node.js + NestJS + TypeORM/Prisma   |
| Frontend Web | Next.js 14+ (App Router) + Tailwind |
| Frontend Mob | React Native + Expo (futuro)        |
| Database     | Supabase Postgres + Prisma          |
| Cache        | Redis                               |
| LLM Gateway  | Custom (abstração sobre OpenAI, Anthropic, etc) |
| Workers      | BullMQ + Redis                      |
| Infra        | Supabase primeiro; Docker fora do MVP imediato |

---

## Modelos de IA por Plano

| Plano    | Modelo                          | Tokens/Resposta | Memória |
|----------|--------------------------------|-----------------|---------|
| Free     | GPT-4o-mini / Haiku            | ~500            | Resumo  |
| Premium  | GPT-4o / Claude Sonnet         | ~2000           | Expandida |
| Credits  | Opus 3.5 + Imagens             | ~4000 + img     | Full    |

---

## Próximos Passos

### Backend MVP
1. Setup do projeto NestJS
2. Configurar Supabase Postgres em `services/api/.env`
3. Auth básica (JWT)
4. Endpoints: listar histórias, iniciar leitura, enviar ação
5. LLM Gateway com switching de provedor
6. Sistema de resumo de memória narrativa
7. Registro de uso/custo
8. Rate limiting e daily limits

### Frontend MVP
1. Setup Next.js
2. Tela de biblioteca (lista de histórias)
3. Tela de detalhe da história
4. Leitor de cena narrativa (layout livro)
5. Sistema de escolhas (cards + input livre)
6. Progresso salvo
7. Mock de ads para plano Free
8. Tela de assinatura/perfil

---

##links

- Domínio: enredo.ai
- Docs: `docs/`
- Arquitetura: `docs/arquitetura-inicial.md`
- Modelo de Dados: `docs/modelo-dados-e-monotizacao.md`
- Supabase + Prisma: `docs/supabase-prisma.md`
- Prompts: `docs/prompts-agentes.md`
- Decisões Técnicas: `docs/decisoes-tecnicas.md`
- Roadmap MVP: `docs/roadmap-mvp.md`
