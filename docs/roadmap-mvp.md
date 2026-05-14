# Roadmap MVP — Enredo.ai

> **Status:** arquivo atualizado após o fechamento do Step 55.
>
> Este roadmap é uma visão de produto/MVP. Para o estado operacional mais recente, validações e próximo step, consulte `docs/context/CURRENT_STATE.md`. Para o roadmap vivo por fases futuras, consulte `docs/context/ROADMAP.md`.

---

## Posição Atual

O Enredo.ai está no fim do **MVP ampliado / beta readiness**.

A fundação do MVP já está implementada: autenticação, biblioteca, seleção de premissa/personagem, leitura interativa, IA, memória narrativa, Free/Premium, créditos, limites, mobile-first UX e contrato de mídia de cena.

O projeto avançou na camada **Media & Social inicial**:

- Step 42 fechou o contrato seguro de créditos para mídia de cena.
- Step 43 fechou a integração mobile de geração de imagem por cena.
- Step 44 criou a galeria de mídia de cena com visibilidade de créditos no leitor.
- Step 45 implementou o fluxo de submissão para moderação/publicação a partir da galeria.
- Step 46 implementou o fluxo de revisão de moderação (admin approve/reject).
- Step 47 implementou o feed real de cenas públicas aprovadas (backend + mobile).
- Step 48 implementou a base de engajamento social (like/save/share) + fix de toggle/migration.
- Step 49 implementou comentários (backend + mobile overlay).
- Step 50 implementou metadados de revisão admin (DTO enriquecido para moderação).
- Step 51 implementou filtros/busca no endpoint de moderação admin (status, mediaType, q, etc.).
- Step 52 implementou métricas agregadas de moderação admin.
- Step 53 implementou denúncias/reports de cenas e comentários, com listagem admin.
- Vídeo real ainda está diferido.

---

## Fases do MVP

## Fase 1: Fundação

### Objetivo
Estruturar backend, banco de dados, autenticação, autorização e base operacional.

### Status
✅ Concluída.

### Entregue
- Backend NestJS.
- Prisma com PostgreSQL/Supabase.
- Autenticação com register/login/JWT/refresh token.
- Guards JWT e RBAC.
- `User`, `Subscription`, `CreditWallet`, `CreditTransaction`.
- Swagger/OpenAPI.
- Health checks.
- Testes backend consolidados.

---

## Fase 2: Biblioteca e Setup Narrativo

### Objetivo
Permitir que o usuário descubra histórias e prepare a leitura antes de entrar no leitor.

### Status
✅ Concluída para beta.

### Entregue
- Biblioteca pública/curada.
- Detalhe de história.
- Fluxo mobile:
  - Biblioteca → Detalhe → Premissa → Personagem → Reader.
- 3 premissas por história.
- 3 personagens jogáveis por premissa.
- Validação de acesso para histórias privadas/públicas.
- Base para histórias geradas por usuário.

### Observação
O roadmap antigo citava Next.js/Tailwind/shadcn. O produto atual prioriza **Expo Router + React Native** como frontend principal.

---

## Fase 3: Leitura Interativa e IA

### Objetivo
Entregar o coração do produto: cenas narrativas geradas por IA, escolhas sugeridas, ação livre e memória persistente.

### Status
✅ Concluída em essência.

### Entregue
- `ReadingSession`, `NarrativeEvent`, `NarrativeMemory`, `ModelUsage`, `DailyUsageLimit`.
- `ReadingService` como facade.
- `ReadingOrchestratorService` para regras de aplicação.
- `NarrativeEngineService` para geração narrativa.
- LLM gateway multi-provider.
- Modo mock para testes/dev.
- Modo real de IA quando `LLM_MOCK_MODE=false`.
- Primeira cena e continuação via IA.
- Escolhas sugeridas + texto livre.
- Memória narrativa e contexto com trimming.
- Contratos de erro padronizados.
- Mobile reader polido para beta.

### Ainda a observar
- Tempo real de resposta depende de provider/modelo.
- Free token limit ainda pode ser aumentado de 500 para 750-1000.

---

## Fase 4: Monetização Básica

### Objetivo
Implementar planos, créditos, limites e trilha de auditoria de gastos.

### Status
✅ Concluída para beta.

### Entregue
- Free/Premium.
- Limite diário Free.
- Limite de 3 sessões ativas para Free.
- Modelos por plano/tier.
- Modelos `CREDITS`.
- Wallet de créditos.
- Ledger com `CreditTransaction`.
- Compra mock de créditos.
- Gasto atômico de créditos.
- `INSUFFICIENT_CREDITS` padronizado.
- Ad events/mock para Free.
- Crédito para mídia de cena:
  - Imagem: 1 crédito.
  - Vídeo: 5 créditos.

### Diferido
- Stripe real.
- Idempotência de compra.
- Fluxo admin de concessão de créditos promocionais.
- Refunds/expiração.

---

## Fase 5: Polimento e Beta Readiness

### Objetivo
Fechar UX, contratos mobile/backend, estabilidade, validações e documentação operacional.

### Status
🟡 Em andamento avançado.

### Entregue
- Estados de loading/erro no reader.
- Contratos mobile/backend de leitura estabilizados.
- Active sessions e My Stories.
- Tratamento de erros de leitura.
- TypeScript backend/mobile passando.
- Prisma validate passando.
- Build backend passando.
- Suíte backend consolidada: 559 tests / 38 suites.
- Contexto modular em `docs/context/`.
- Steps 43-55 fechados e auditados.

### Próximo Step Recomendado
**Step 56 — Saved Scenes Screen/Tab**

Objetivo:
- Tela ou aba de cenas salvas/bookmarked pelo usuário.

---

## Extensão Pós-MVP já Iniciada

Alguns itens que o roadmap antigo tratava como pós-MVP já foram parcialmente ou totalmente implementados.

| Item | Status |
|---|---|
| Criação de histórias pelo usuário | ✅ Implementada como história privada |
| Geração de história por palavras-chave | ✅ Implementada |
| Story quality guard | ✅ Implementado |
| Moderação básica/input guard | ✅ Parcial |
| Geração de imagens de cena | ✅ Parcial, com créditos |
| Feed/Cenas | ✅ Step 47 (feed real de cenas aprovadas) |
| Reports/denúncias | ✅ Step 53 |
| Vídeo de cena | ⏳ Diferido |
| Publicação social | ✅ Step 45-46 (submissão + moderação admin) |
| Stripe real | ⏳ Diferido |

---

## Critérios de Aceitação do MVP

### Deve funcionar
- [x] Cadastro e login.
- [x] Listagem de histórias.
- [x] Detalhe de história.
- [x] Seleção de premissa.
- [x] Seleção de personagem jogável.
- [x] Leitura completa: abrir → ler → agir/escolher → próxima cena → salvar.
- [x] Geração de IA.
- [x] Sistema Free/Premium.
- [x] Limite de interações Free.
- [x] Créditos e ledger.
- [x] Consumo de créditos para recursos caros.

### Deve ser usável
- [x] UX de leitura não parece chat genérico.
- [x] Texto livre sempre disponível.
- [x] Escolhas sugeridas como apoio, não trilhos fixos.
- [x] Estados de loading.
- [x] Estados de erro.
- [x] Mobile-first.
- [x] Galeria/histórico de mídia de cena.
- [x] Submissão de cenas para moderação/publicação.
- [x] Revisão de moderação (admin approve/reject).
- [x] Feed social funcional.

### Deve ser escalável
- [x] LLM gateway permite múltiplos provedores.
- [x] Modelo/tier decidido no backend.
- [x] Schema suporta expansão de histórias, sessões, mídia e créditos.
- [x] Ledger audita gastos.
- [x] Contexto narrativo tem trimming.
- [ ] Configuração de hardcoded values via config/DB.
- [ ] Observabilidade de produção completa.

---

## Próximas Prioridades

### Step 56 — Recomendado
Opções naturais:

1. Real video provider integration.
2. Admin UI/dashboard for moderation.
3. Real video provider integration.
4. Free token limit increase.
5. Configuration externalization.
6. Moderation/publication workflow for community stories.

---

## Fases Futuras

## Phase 2 Expandida: Media & Social

- Galeria de mídia gerada.
- Publicação opt-in de cenas.
- Feed social real.
- Likes, comentários, salvar/compartilhar.
- CTA para entrar na história a partir do feed.
- Vídeo real de cena.

## Phase 3: Comunidade

- Submissão de histórias privadas para comunidade.
- Estados: PRIVATE → SUBMITTED → APPROVED/REJECTED → PUBLIC.
- Moderação automática/manual.
- Favoritos, avaliações e ranking.
- Perfil de criador.

## Phase 4: Ecossistema

- Histórias populares viram destaque.
- Nichos populares orientam curadoria.
- Criadores ganham reputação/badges.
- Séries, universos e campanhas.
- Conteúdo da comunidade pode virar biblioteca principal.

---

## Métricas de Sucesso do MVP/Beta

| Métrica | Meta inicial |
|---|---|
| Tempo até primeira leitura | < 5 min |
| Geração de cena | < 8-10s, dependendo do provider |
| Taxa de erro em geração | < 5% |
| Interações por sessão | > 5 |
| Usuários que retornam à leitura | A definir em beta |
| Geração de imagem por sessão | A medir após Step 44 |

---

## Resumo Executivo

O MVP original está praticamente completo. O projeto agora está na fase de **polimento para beta privada** e começando a construir a camada de **mídia/social** que diferencia o Enredo.ai de um leitor com IA comum.

O próximo passo mais coerente é transformar a geração de imagem por cena em uma experiência persistente e navegável: **galeria/histórico de mídia + visibilidade de créditos no reader**.
