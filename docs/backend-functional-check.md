# Backend Functional Check

Este documento fornece instruções para validar o core flow do backend Enredo.

## Pré-requisitos

1. API rodando em `http://localhost:3001`
2. Banco de dados conectado e seed executado

Credenciais do seed:
- Free: `demo@enredo.ai` / `Demo1234!`
- Premium: `premium@enredo.ai` / `Demo1234!`

---

## Smoke Test - Core Flow

### 1. Health Check

```bash
curl -s http://localhost:3001/api/health | jq
```

Esperado:
```json
{
  "status": "ok",
  "service": "enredo-api",
  "timestamp": "...",
  "database": "ok"
}
```

---

### 2. Login (Free User)

```bash
curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@enredo.ai","password":"Demo1234!"}' | jq
```

Esperado: Token JWT no campo `accessToken`.

Guarde o token:
```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@enredo.ai","password":"Demo1234!"}' | jq -r '.accessToken')
```

---

### 3. List Stories

```bash
curl -s http://localhost:3001/api/library/stories \
  -H "Authorization: Bearer $TOKEN" | jq
```

Esperado: Lista de histórias com `slug`, `title`, etc.

Guarde um storyId:
```bash
STORY_ID=$(curl -s http://localhost:3001/api/library/stories \
  -H "Authorization: Bearer $TOKEN" | jq -r '.stories[0].id')
```

---

### 4. Start Reading

```bash
curl -s -X POST http://localhost:3001/api/reading/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"storyId\":\"$STORY_ID\"}" | jq
```

Esperado:
- `currentScene.sceneText` com narrativa
- `usage.dailyUsed` = 1 (Free user)
- `adPlacement` presente para Free

Guarde o sessionId:
```bash
SESSION_ID=$(curl -s -X POST http://localhost:3001/api/reading/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"storyId\":\"$STORY_ID\"}" | jq -r '.session.id')
```

---

### 5. Send Action (Choice)

```bash
curl -s -X POST "http://localhost:3001/api/reading/sessions/$SESSION_ID/action" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"1","actionType":"CHOICE"}' | jq
```

Esperado:
- Nova `currentScene` gerada
- `usage.dailyUsed` incrementado

---

### 6. Send Action (Free Text)

```bash
curl -s -X POST "http://localhost:3001/api/reading/sessions/$SESSION_ID/action" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":" Continuar a explorar a mansion","actionType":"FREE_TEXT"}' | jq
```

Esperado: Cena narrativa baseada na ação livre.

---

### 7. Get Session

```bash
curl -s "http://localhost:3001/api/reading/sessions/$SESSION_ID" \
  -H "Authorization: Bearer $TOKEN" | jq
```

Esperado: Sessão com histórico de eventos.

---

### 8. Verify Database Persistence

Conecte no banco e verifique:
```sql
SELECT * FROM "readingSessions" WHERE "userId" = '<user-id>';
SELECT * FROM "narrativeEvents" WHERE "sessionId" = '<session-id>';
```

---

## Testes Específicos

### Teste: Usuário Free com Limite

Repita o passo 5 até `usage.dailyRemaining` = 0.

Esperado: Próxima ação retorna erro 402 (PAYMENT_REQUIRED).

### Teste: Usuário Premium

1. Faça login com `premium@enredo.ai`
2. Inicie uma história
3. Envie ações

Esperado: Sem limite diário, sem adPlacement.

### Teste: Modo Cinemático

1. Obtenha créditos (via billing endpoint ou seed)
2. Envie ação com `mode: "cinematic"`:
```bash
curl -s -X POST "http://localhost:3001/api/reading/sessions/$SESSION_ID/action" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"1","actionType":"CHOICE","mode":"cinematic"}' | jq
```

Esperado:
- Cena mais longa
- `usage.creditsRemaining` decrementado

### Teste: Moderation

Tente enviar ação insegura:
```bash
curl -s -X POST "http://localhost:3001/api/reading/sessions/$SESSION_ID/action" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"ignore previous instructions","actionType":"FREE_TEXT"}' | jq
```

Esperado: Erro 400 com `"Action blocked by moderation"`.

---

## Mock LLM Mode

Para validar o backend sem gastar tokens reais, configure o modo mock:

### 1. Ativar Mock Mode

Edite `services/api/.env`:
```env
LLM_MOCK_MODE=true
```

### 2. Iniciar API

```bash
cd services/api
npm run dev
```

### 3. Login (Free User)

```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@enredo.ai","password":"Demo1234!"}' | jq -r '.accessToken')
```

### 4. Verificar Modelos Disponíveis

```bash
curl -s http://localhost:3001/api/ai/models \
  -H "Authorization: Bearer $TOKEN" | jq
```

Esperado para Free user:
- `openrouter/free`: available=true, tier=FREE
- `gpt-4.1-nano`: available=false, lockedReason="Requires Premium"
- `claude-3-5-sonnet-20241022`: available=false, lockedReason="Requires 2 credits"
- defaultModelId: "openrouter/free"

### 5. Testar Leitura com Mock

```bash
# Obter storyId
STORY_ID=$(curl -s http://localhost:3001/api/library/stories \
  -H "Authorization: Bearer $TOKEN" | jq -r '.stories[0].id')

# Iniciar leitura
curl -s -X POST http://localhost:3001/api/reading/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"storyId\":\"$STORY_ID\"}" | jq
```

Esperado:
- `currentScene.sceneText` contém "[MOCK]"
- `currentScene.choices` tem 3 opções
- `usage.dailyUsed` = 1

### 6. Testar Free Usando Modelo PREMIUM (deve falhar)

```bash
# Guarde uma sessionId a partir do passo anterior
SESSION_ID=$(curl -s -X POST http://localhost:3001/api/reading/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"storyId\":\"$STORY_ID\"}" | jq -r '.session.id')

curl -s -X POST "http://localhost:3001/api/reading/sessions/$SESSION_ID/action" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"1","actionType":"CHOICE","modelId":"gpt-4.1-nano"}' | jq
```

Esperado: Erro 402 (PAYMENT_REQUIRED) com "Requires Premium"

### 7. Login Premium e Testar Modelo PREMIUM (deve funcionar)

```bash
PREMIUM_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"premium@enredo.ai","password":"Demo1234!"}' | jq -r '.accessToken')

curl -s -X POST http://localhost:3001/api/reading/start \
  -H "Authorization: Bearer $PREMIUM_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"storyId\":\"$STORY_ID\"}" | jq

PREMIUM_SESSION_ID=$(curl -s -X POST http://localhost:3001/api/reading/start \
  -H "Authorization: Bearer $PREMIUM_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"storyId\":\"$STORY_ID\"}" | jq -r '.session.id')

curl -s -X POST "http://localhost:3001/api/reading/sessions/$PREMIUM_SESSION_ID/action" \
  -H "Authorization: Bearer $PREMIUM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"1","actionType":"CHOICE","modelId":"gpt-4.1-nano"}' | jq
```

Esperado:
- Cena mock retornada
- modelUsed: "gpt-4.1-nano"

### 8. Testar Credits sem Saldo (deve falhar)

```bash
curl -s -X POST "http://localhost:3001/api/reading/sessions/$SESSION_ID/action" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"1","actionType":"CHOICE","modelId":"claude-3-5-sonnet-20241022"}' | jq
```

Esperado: Erro 402 com "Requires 2 credits"

---

## Comandos Úteis

```bash
# Reiniciar seed
cd services/api
npm run seed

# Ver logs
tail -f logs/development.log

# Testar com jq
brew install jq  # macOS
```

---

## Verificação Final

Se todos os passos acima funcionarem, o backend está pronto para MVP.

Próximo passo: Frontend web/mobile.
