# CONTEXTO_PROJETO.md — Índice de Contexto

> **⚠️ ATENÇÃO:** Este arquivo foi refatorado em 2026. O conteúdo detalhado foi movido para arquivos modulares em `docs/context/`.
> 
> Para agentes de IA: use os arquivos específicos listados abaixo conforme sua necessidade.

---

## 📁 Estrutura de Contexto Modular

O contexto do projeto foi dividido em arquivos focados para facilitar o trabalho de agentes de IA:

| Arquivo | Propósito | Quando Usar |
|---------|-----------|-------------|
| **[PROJECT_CONTEXT.md](./docs/context/PROJECT_CONTEXT.md)** | Snapshot estratégico curto, regras de ouro | Primeiro arquivo a ler para novos agentes |
| **[CURRENT_STATE.md](./docs/context/CURRENT_STATE.md)** | Status de validação, testes, próximo passo | Antes de implementar qualquer funcionalidade |
| **[PRODUCT_VISION.md](./docs/context/PRODUCT_VISION.md)** | Visão do produto, modelo de negócio, monetização | Decisões de produto e negócio |
| **[ARCHITECTURE.md](./docs/context/ARCHITECTURE.md)** | Princípios arquiteturais, stack, estrutura | Decisões arquiteturais, novos módulos |
| **[BACKEND_CONTEXT.md](./docs/context/BACKEND_CONTEXT.md)** | Módulos backend, entidades, APIs | Trabalho no backend |
| **[MOBILE_CONTEXT.md](./docs/context/MOBILE_CONTEXT.md)** | Stack mobile, telas, UX, fluxos | Trabalho no frontend mobile |
| **[ENGINEERING_RULES.md](./docs/context/ENGINEERING_RULES.md)** | Regras de código, padrões, SOLID | Code review, novos desenvolvedores |
| **[OPERATIONAL_RULES.md](./docs/context/OPERATIONAL_RULES.md)** | Comandos seguros vs destrutivos, operações | Antes de rodar qualquer comando |
| **[ROADMAP.md](./docs/context/ROADMAP.md)** | Roadmap de produto (MVP → Fase 4) | Planejamento de features |
| **[KNOWN_ISSUES.md](./docs/context/KNOWN_ISSUES.md)** | Riscos conhecidos, débitos técnicos | Avaliação de riscos |
| **[CHANGELOG_STEPS.md](./docs/context/CHANGELOG_STEPS.md)** | Log histórico completo (Steps 1-42+) | Histórico de implementação |
| **[content-adult-policy.md](./docs/content-adult-policy.md)** | Política planejada para preferências narrativas adultas | Antes de implementar romance adulto/18+ |

### Agentes

| Arquivo | Propósito | Quando Usar |
|---------|-----------|-------------|
| **[enredo-technical-executor.md](./docs/agents/enredo-technical-executor.md)** | Prompt base do agente executor técnico do Enredo.ai | Configurar OpenCode/Antigravity/Gemini como executor conservador |

---

## 🚀 Quick Start para Novos Agentes

**Fluxo Recomendado:**

1. **Leia primeiro:** [PROJECT_CONTEXT.md](./docs/context/PROJECT_CONTEXT.md)
   - Snapshot atual, regras de ouro, onde encontrar detalhes

2. **Verifique estado:** [CURRENT_STATE.md](./docs/context/CURRENT_STATE.md)
   - Validação atual, contagem de testes, próximo step prioritário

3. **Consulte específicos conforme tarefa:**
   - Backend → [BACKEND_CONTEXT.md](./docs/context/BACKEND_CONTEXT.md)
   - Mobile → [MOBILE_CONTEXT.md](./docs/context/MOBILE_CONTEXT.md)
   - Arquitetura → [ARCHITECTURE.md](./docs/context/ARCHITECTURE.md)
   - Comandos → [OPERATIONAL_RULES.md](./docs/context/OPERATIONAL_RULES.md)

4. **Histórico:** [CHANGELOG_STEPS.md](./docs/context/CHANGELOG_STEPS.md)
   - Leia os steps mais recentes antes de implementar novo step

---

## ⚠️ Regra de Ouro (Preservada)

> **Não recomeçar arquitetura do zero.** O trabalho deve continuar do estado atual do repositório.

Antes de implementar qualquer novo step:
1. Ler o snapshot em [PROJECT_CONTEXT.md](./docs/context/PROJECT_CONTEXT.md)
2. Ler a seção do step mais recente em [CHANGELOG_STEPS.md](./docs/context/CHANGELOG_STEPS.md)
3. Inspecionar os arquivos reais relacionados
4. Procurar trabalho parcial com `rg`
5. Implementar escopo estreito
6. Rodar validações seguras
7. Atualizar o arquivo de contexto apropriado com resultado real

---

## 📊 Status Atual (Resumo)

- **Backend Tests:** 453 tests / 35 suites ✅
- **Backend TypeScript:** ✅ Passando
- **Prisma Schema:** ✅ Válido
- **Mobile TypeScript:** ✅ Passando

**Próximo Step Provável:** Step 43 — Scene Media Mobile Contract & UX

---

## 🔄 Processo de Atualização

Ao finalizar qualquer step:

1. **Atualizar [CHANGELOG_STEPS.md](./docs/context/CHANGELOG_STEPS.md)**
   - Adicionar novo step com detalhes completos

2. **Atualizar [CURRENT_STATE.md](./docs/context/CURRENT_STATE.md)**
   - Atualizar contagem de testes
   - Atualizar status de validação
   - Definir próximo step

3. **Atualizar arquivos específicos conforme área:**
   - Backend → [BACKEND_CONTEXT.md](./docs/context/BACKEND_CONTEXT.md)
   - Mobile → [MOBILE_CONTEXT.md](./docs/context/MOBILE_CONTEXT.md)
   - Novos módulos → [ARCHITECTURE.md](./docs/context/ARCHITECTURE.md)

---

## 📞 Informações do Projeto

**Nome:** Enredo.ai  
**Domínio:** enredo.ai  
**Categoria:** AI interactive storytelling  
**Tagline:** Histórias que mudam com você.

---

## 🗂️ Arquivos Legados (docs/)

Os seguintes arquivos na pasta `docs/` ainda existem mas são legados:
- `arquitetura-inicial.md`
- `decisoes-tecnicas.md`
- `modelo-dados-e-monetizacao.md`
- `prompts-agentes.md`
- `roadmap-mvp.md`
- `supabase-prisma.md`

Preferir consultar os novos arquivos em `docs/context/` para informações atualizadas.

---

**Última Atualização deste Índice:** Após refatoração do CONTEXTO_PROJETO.md em arquivos modulares em `docs/context/`.
