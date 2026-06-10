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
│   ├── mobile/       # App principal Expo Router + React Native
│   └── web/          # Legado/reservado; não é o foco atual do MVP
├── services/
│   └── api/          # Backend NestJS + Prisma + PostgreSQL
├── packages/
│   ├── shared/       # Types, validações, utils compartilhadas
│   ├── prompts/      # Prompts de sistema para cada modelo
│   └── config/       # Configs centralizadas (turborepo, eslint, etc)
├── infra/
│   └── docker/       # Opcional/futuro; nao bloqueia o MVP
├── docs/             # Documentação do projeto
└── scripts/          # Scripts utilitários
```

---

## Como Backend, Frontend e IA se Relacionam

```
┌─────────────┐      ┌─────────────┐      ┌─────────────────┐
│  Mobile App │ ──── │  Backend    │ ──── │  LLM Gateway    │
│ (Expo/RN)   │ REST │  (NestJS)   │      │  (Orquestrador) │
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
| Backend      | Node.js + NestJS + Prisma           |
| App Mobile   | Expo Router + React Native          |
| Frontend Web | Diferido                            |
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

## Estado Atual

O projeto está pronto para **beta privada local/dev**. Staging/produção ainda dependem de deploy, Stripe real, observabilidade, rotação de credenciais e pipeline CI/CD.

Consulte:
- `docs/context/CURRENT_STATE.md`
- `docs/context/BETA_READINESS.md`
- `docs/context/OPERATIONAL_RULES.md`

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
