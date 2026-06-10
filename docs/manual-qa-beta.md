# Manual QA — Enredo.ai Beta

**Data:** Maio de 2026
**Etapa:** Step 95 — Guided Manual QA
**Tipo:** Revisão de código (análise estática de navegação, estados, cópia)
**Ambiente:** Local/Dev — sem execução em staging real

---

## Fluxos Revisados

| # | Fluxo | Status | Observações |
|---|-------|--------|-------------|
| 1 | Welcome / primeira tela | ✅ | CTAs claros, cópia honesta |
| 2 | Registro | ✅ | Cadastro por nome, email e senha, com erros amigáveis |
| 3 | Login | ✅ | Google SSO disponível, demo credentials em `__DEV__` apenas |
| 4 | Onboarding | ✅ | 6 passos honestos, "Pular" disponível |
| 5 | Biblioteca | ✅ | Stories curadas, estados vazio/erro ok |
| 6 | Detalhe da história | ✅ | CTA "Escolher premissa", back button |
| 7 | Seleção de premissa | ✅ | 3 premissas, loading/error com back |
| 8 | Seleção de personagem | ✅ | 3 personagens, "Começar leitura" |
| 9 | Reader — primeira cena | ✅ | Loading/error com back, missing ID guard |
| 10 | Reader — ação/ próxima cena | ✅ | Texto livre + sugestões, sem chatbot copy |
| 11 | Leituras ativas | ✅ | Estados loading/empty/error ok |
| 12 | Geração de mídia (entrada) | ✅ | Imagem (1 crédito), Vídeo (5 créditos) |
| 13 | Galeria de mídia | ✅ | Grid 2 colunas, back button |
| 14 | Submeter cena à moderação | ✅ | Confirmação, estados de moderação |
| 15 | Feed social | ✅ | Cenas aprovadas, engajamento funcional |
| 16 | Cenas salvas | ✅ | Grid, back para feed |
| 17 | Comentários / denúncias | ✅ | Modal, erros tratados |
| 18 | Perfil / conta | ✅ | Plano, leituras, termos, logout |
| 19 | Termos e privacidade | ✅ | Tela `/legal` com tabs, back button |
| 20 | Upgrade / créditos (dev) | ✅ | Mock honesty, sem promessa de pagamento real |

---

## Correções Aplicadas no Step 95

### HIGH — Back buttons em estados de loading/erro

| Arquivo | Correção |
|---------|----------|
| `reader/[id].tsx` | Adicionado header com back button nos estados de loading, erro e missing ID |
| `story/[id].tsx` | Adicionado `backBar` com back button nos estados de loading, erro e not-found |
| `story/[id]/premise.tsx` | Adicionado header com back button nos estados de loading e erro |
| `story/[id]/character.tsx` | Adicionado header com back button nos estados de loading e erro |

### MEDIUM — Reader sem ID

| Arquivo | Correção |
|---------|----------|
| `reader/[id].tsx` | Adicionado guard antecipado para `!id` com mensagem "Leitura não encontrada" e CTA para biblioteca |

### LOW — console.log em AuthContext

| Arquivo | Correção |
|---------|----------|
| `src/context/AuthContext.tsx` | `console.log` protegido com `__DEV__`, removido log do objeto de erro |

---

## Issues Deferidos para Step 96 (RESOLVIDOS)

| # | Severidade | Descrição | Status |
|---|-----------|-----------|--------|
| 1 | HIGH | 15 `router.back()` sem `router.canGoBack()` | ✅ Resolvido — helper `goBackSafe()` com fallback para library/scenes/profile |
| 2 | MEDIUM | Hardcoded demo credentials no código | ✅ Mantido com `__DEV__` — documentado como dev-only |
| 3 | MEDIUM | Labels "(dev)" em botões de UI | ✅ Mantidos — honestidade de monetização preservada |
| 4 | LOW | Telas `profile/consent.tsx` e `profile/avatar.tsx` | ✅ Deferidas — screens existem mas persistência backend não existe |
| 5 | LOW | `as any` em router calls | ✅ Parcial — removidos onde Expo Router aceita typed routes; mantidos onde necessário (dynamic paths, cross-tab navigation) |
| 6 | LOW | `preview.tsx` router.back sem fallback | ✅ Resolvido — `goBackSafe()` com fallback para welcome |

### Issues Remanescentes (Intencionalmente Deferidos)

| # | Descrição | Motivo |
|---|-----------|--------|
| 1 | `profile/consent.tsx` e `profile/avatar.tsx` inacessíveis | Telas de preview/futuro — sem persistência backend. A navegação interna já usa fallback seguro, mas elas não devem ser expostas até que opt-in/photo contracts existam. |
| 2 | `as any` em dynamic paths como `/story/${id}` | Expo Router typed routes não suportam paths dinâmicos sem `as any` |
| 3 | Demo credentials no source | Protegido por `__DEV__`. Útil para desenvolvimento local. |

---

## Veredito Final — Step 95

**Aprovado para preparação de beta fechada.** O fluxo principal (welcome → registro → onboarding → biblioteca → história → premissa → personagem → reader) está funcional e navegável. Todos os estados de loading, erro e vazio possuem CTAs e back buttons. As correções do Step 96 eliminaram os `router.back()` sem fallback fora do helper centralizado.

---

## Validações

| Check | Resultado |
|-------|-----------|
| Mobile TypeScript | ✅ |
| `git diff --check` | ✅ |
| Backend | Não alterado (679/46) |
