# Free LLM Testing Mode - Enredo.ai

Guia para configuração e testes com modelos gratuitos ou mockados durante a fase de testes.

## Visão Geral

Para a fase atual de testes, o Enredo.ai deve operar **apenas com modelos gratuitos (free) ou mock**.
Isso garante custo zero ou quase zero, preservando a arquitetura Premium/Créditos para implementação futura.

## Variáveis de Ambiente

### `.env` do Backend (`services/api/.env`)

| Variável | Valor Recomendado | Descrição |
|----------|-------------------|-----------|
| `LLM_MOCK_MODE` | `true` | Ativa o modo mock (sem chamadas reais) |
| `FREE_LLM_ONLY` | `true` | Bloqueia modelos pagos/créditos |
| `OPENROUTER_API_KEY` | `sk-or-v1-...` (opcional) | Necessário para usar modelos gratuitos do OpenRouter |

### Combinações de Configuração

#### 1. Teste Zero-Custo (Mock)
```env
LLM_MOCK_MODE=true
FREE_LLM_ONLY=true
# OPENROUTER_API_KEY não necessária
```
- Nenhuma chamada real é feita
- Respostas simuladas (mock) são retornadas
- **Uso recomendado para desenvolvimento local rápido**

#### 2. Teste com OpenRouter Free Models
```env
LLM_MOCK_MODE=false
FREE_LLM_ONLY=true
OPENROUTER_API_KEY=sk-or-v1-...
```
- Usa modelos gratuitos via OpenRouter
- `openrouter/free` é o modelo padrão
- Modelos pagos são bloqueados (retornam erro 403)
- Se `OPENROUTER_API_KEY` não estiver configurada e `FREE_LLM_ONLY=true`, o sistema retorna erro explícito: "OpenRouter free provider is required but OPENROUTER_API_KEY is not configured"

#### 3. Produção (Futuro)
```env
LLM_MOCK_MODE=false
FREE_LLM_ONLY=false
OPENROUTER_API_KEY=sk-or-v1-...
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```
- Todos os modelos disponíveis conforme plano do usuário
- **Não use esta configuração ainda**

## Como Testar

### 1. Verificar Modelos Disponíveis
```bash
# Primeiro, faça login e obtenha o token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@enredo.ai","password":"Teste123!"}'

# Listar modelos disponíveis
curl http://localhost:3001/api/ai/models \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN"
```

Quando `FREE_LLM_ONLY=true`, apenas modelos com `costMode: "FREE"` aparecerão.

### 2. Testar Modelo Específico
```bash
# Testar openrouter/free
curl -X POST http://localhost:3001/api/ai/test-model \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  -d '{"modelId":"openrouter/free"}'
```

### 3. Verificar Bloqueio de Modelos Pagos
```bash
# Tentar usar modelo Premium (deve falhar com FREE_LLM_ONLY=true)
curl -X POST http://localhost:3001/api/ai/test-model \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  -d '{"modelId":"gpt-4.1-nano"}'
```

Resposta esperada:
```json
{
  "message": "Paid models are disabled. FREE_LLM_ONLY=true restricts to free models only.",
  "code": "PAID_MODEL_DISABLED"
}
```

### 4. Fluxo de Leitura (Reading Flow)

O fluxo de leitura respeita automaticamente o `FREE_LLM_ONLY`:
- Geração de cena: usa modelo gratuito ou mock
- Premissas: usa modelo utilitário gratuito
- Personagens jogáveis: usa modelo utilitário gratuito
- Resumo de memória: usa modelo utilitário gratuito

## Campos da Resposta da API

### GET /api/ai/models
```json
{
  "models": [
    {
      "id": "openrouter/free",
      "displayName": "Free Router",
      "description": "Free tier model via OpenRouter...",
      "tier": "FREE",
      "priceLevel": "FREE",
      "costMode": "FREE",
      "maxTokens": 500,
      "supportsCinematic": false,
      "creditCost": undefined,
      "available": true,
      "lockedReason": undefined,
      "isDefault": true
    }
  ],
  "defaultModelId": "openrouter/free",
  "userPlan": "FREE"
}
```

## Arquitetura

### Cost Mode Field
Cada modelo no `model-catalog.ts` tem um campo `costMode`:
- `"FREE"`: Modelos gratuitos (ex: `openrouter/free`)
- `"PAID"`: Modelos pagos (ex: `gpt-4.1-nano`, `gemini-2.5-flash-lite`)
- `"CREDITS"`: Modelos que consomem créditos (ex: `claude-3-5-sonnet-20241022`)

### Lógica de Bloqueio
Quando `FREE_LLM_ONLY=true`:
1. `canUserAccessModel()` retorna `{ allowed: false, reason: 'Paid models are disabled...' }` para qualquer modelo com `costMode !== 'FREE'`
2. `getCatalog()` filtra modelos, retornando apenas `costMode: 'FREE'`
3. `getDefaultUtilityModel()` seleciona apenas modelos gratuitos
4. Tentativas de usar modelos pagos resultam em erro 403

## Modelos Atuais

| Model ID | Provider | Tier | Cost Mode | Status |
|-----------|----------|------|-----------|--------|
| `openrouter/free` | openrouter | FREE | FREE | ✅ Ativo |
| `gemini-2.5-flash-lite` | google | PREMIUM | PAID | ❌ Inativo (provider não implementado) |
| `gpt-4.1-nano` | openai | PREMIUM | PAID | ✅ Ativo |
| `gpt-4.1-mini` | openai | PREMIUM | PAID | ✅ Ativo |
| `together/gpt-oss-120b` | together | PREMIUM | PAID | ❌ Inativo (provider não implementado) |
| `claude-3-5-sonnet-20241022` | anthropic | CREDITS | CREDITS | ✅ Ativo |

## Migração Futura

Quando for hora de habilitar modelos pagos:
1. Mude `FREE_LLM_ONLY=false` no `.env`
2. Configure `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` conforme necessário
3. Certifique-se de que o billing real está implementado
4. Teste o fluxo Premium e de créditos

## Troubleshooting

### Erro: "Paid models are disabled in free-only testing mode"
- Verifique se `FREE_LLM_ONLY=true` no `.env`
- Use apenas `openrouter/free` ou mude `FREE_LLM_ONLY=false`

### Erro: "Provider not configured for model"
- Verifique se `OPENROUTER_API_KEY` está configurada
- Ou use `LLM_MOCK_MODE=true` para contornar

### Modelos não aparecem na lista
- Verifique se `isActive: true` no `model-catalog.ts`
- Verifique se `FREE_LLM_ONLY` não está filtrando todos os modelos
