# Validação de Produção - Enredo.ai

Checklist funcional para validar se o backend e o app mobile estão prontos para produção.

## 1. Variáveis de Ambiente do Backend

Crie um arquivo `.env` em `services/api/` baseado no `.env.example`.

### Obrigatórias

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `DATABASE_URL` | URL do Supabase Pooled | `postgresql://postgres.xxx:password@aws-0-xxx.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | URL direta do Supabase para Prisma | `postgresql://postgres.xxx:password@aws-0-xxx.pooler.supabase.com:5432/postgres` |
| `JWT_SECRET` | Chave secreta para JWT | Uma string longa e aleatória |
| `REFRESH_TOKEN_SECRET` | Chave secreta para refresh token | Uma string longa e aleatória |
| `GOOGLE_CLIENT_IDS` | IDs de cliente Google OAuth (separados por vírgula) | `web-id.apps.googleusercontent.com,android-id.apps.googleusercontent.com` |
| `OPENROUTER_API_KEY` | Chave da API OpenRouter | `sk-or-v1-...` |

### Opcionais/Limits

| Variável | Descrição | Padrão |
|----------|-----------|---------|
| `REDIS_URL` | URL do Redis | `redis://localhost:6379` |
| `OPENAI_API_KEY` | Chave OpenAI (se usar modelos diretos) | - |
| `ANTHROPIC_API_KEY` | Chave Anthropic (se usar modelos diretos) | - |
| `LLM_MOCK_MODE` | Usar mock em vez de LLM real | `false` |
| `DEFAULT_FREE_MODEL` | Modelo padrão para Free | `openrouter/free` |
| `DEFAULT_PREMIUM_MODEL` | Modelo padrão para Premium | `gpt-4.1-nano` |
| `FREE_MAX_TOKENS_PER_RESPONSE` | Máximo de tokens por resposta Free | `500` |
| `PORT` | Porta do backend | `3001` |
| `FRONTEND_URL` | URL do frontend | `https://enredo.ai` |

## 2. Google OAuth - Configuração

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie/cd selecione o projeto
3. Vá em **APIs & Services > Credentials**
4. Crie **OAuth 2.0 Client IDs** para:
   - **Web application**: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (mobile) e `GOOGLE_CLIENT_IDS` (backend)
   - **Android**: `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` (mobile) e adicione aos `GOOGLE_CLIENT_IDS` (backend)
     - Package name: `ai.enredo.app`
   - **iOS**: `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` (mobile)

5. No backend `.env`, adicione todos os IDs no `GOOGLE_CLIENT_IDS`:
   ```
   GOOGLE_CLIENT_IDS=web-id.apps.googleusercontent.com,android-id.apps.googleusercontent.com
   ```

## 3. Criar/Login de Usuário

### Via Email/Senha

```bash
# Registrar
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@enredo.ai","password":"Teste123!","name":"Usuário Teste"}'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@enredo.ai","password":"Teste123!"}'
```

### Via Google SSO (Mobile)

1. Abra o app mobile (`cd apps/mobile && npx expo start`)
2. Vá para a tela de login
3. Toque em **Google**
4. Complete o fluxo OAuth no navegador
5. Deve redirecionar para `/(tabs)/library` após sucesso

## 4. Testar POST /api/ai/test-model

```bash
# Primeiro, faça login e copie o accessToken

# Teste com modelo padrão
curl -X POST http://localhost:3001/api/ai/test-model \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  -d '{}'

# Teste com openrouter/free
curl -X POST http://localhost:3001/api/ai/test-model \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  -d '{"modelId":"openrouter/free"}'
```

Resposta esperada:
```json
{
  "ok": true,
  "modelId": "openrouter/free",
  "provider": "openrouter",
  "inputTokens": 15,
  "outputTokens": 25,
  "content": "Confirmo que o modelo de IA do Enredo.ai está configurado."
}
```

## 5. Testar Google SSO via Mobile App

1. Configure o `.env` em `apps/mobile/` com os client IDs do Google
2. Inicie o app: `cd apps/mobile && npx expo start`
3. Pressione `a` (Android) ou `i` (iOS)
4. Na tela de login, toque no botão **Google**
5. O navegador deve abrir para autenticação
6. Após autorizar, o app deve fechar o navegador e redirecionar para a library
7. Verifique se o usuário foi autenticado com sucesso

## 6. Testar Iniciar Leitura (Start Reading)

```bash
# Listar histórias disponíveis
curl http://localhost:3001/api/stories \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN"

# Iniciar leitura de uma história
curl -X POST http://localhost:3001/api/reading/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  -d '{"storyId":"ID_DA_HISTORIA"}'
```

## 7. Testar Enviar Ação (Send Action)

```bash
# Após iniciar a leitura, envie uma ação
curl -X POST http://localhost:3001/api/reading/session/ID_DA_SESSION/action \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  -d '{"action":"Escolho investigar a casa abandonada"}'
```

## 8. Confirmar Persistência de Eventos Narrativos e Memória

```bash
# Verificar detalhes da sessão (deve mostrar histórico)
curl http://localhost:3001/api/reading/session/ID_DA_SESSION \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN"

# Verificar memória narrativa (se disponível)
curl http://localhost:3001/api/reading/session/ID_DA_SESSION/memory \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN"
```

A resposta deve incluir:
- `history`: Array de eventos narrativos (cenas anteriores e escolhas)
- `currentScene`: Cena atual com texto e escolhas

## 9. Confirmar Interações Ilimitadas e Limite de Histórias Ativas

```bash
# Usuário Free: fazer mais de 10 interações no dia
# Todas as interações devem continuar usando a LLM gratuita

for i in {1..12}; do
  echo "Request $i"
  curl -X POST http://localhost:3001/api/reading/session/ID_DA_SESSION/action \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
    -d "{\"action\":\"Ação de teste $i\"}"
  echo ""
done
```

Nenhum request deve retornar `DAILY_LIMIT_REACHED`. Ao tentar criar uma quarta
história ativa, a API deve retornar `ACTIVE_SESSION_LIMIT_REACHED`.

## 10. Confirmar Modelos Premium Bloqueados para Free

```bash
# Tentar usar modelo Premium sendo Free
curl -X POST http://localhost:3001/api/ai/test-model \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN_FREE" \
  -d '{"modelId":"gpt-4.1-nano"}'
```

Deve retornar erro 403:
```json
{
  "message": "Modelo não disponível para seu plano",
  "code": "MODEL_NOT_AVAILABLE"
}
```

## 11. Confirmar UI de Teste LLM Não Aparece em Produção

1. Faça um build de produção do app mobile:
   ```bash
   cd apps/mobile
   npx expo export --platform android
   ```

2. Ou configure `__DEV__ = false` temporariamente

3. Abra a tela de Upgrade/Premium

4. A seção **"Dev: LLM Provider Test"** não deve aparecer na tela

5. Apenas usuários em ambiente de desenvolvimento (`__DEV__ === true`) devem ver essa seção

## 12. Script de Verificação Automática

O backend possui um script para verificar se as variáveis de ambiente estão configuradas:

```bash
cd services/api
npm run check:prod
```

Este script:
- Verifica se todas as variáveis obrigatórias estão presentes
- Não imprime valores secretos
- Informa se o `LLM_MOCK_MODE` está ativado
- Testa conectividade com o banco de dados (opcional)

## Resumo da Validação

- [ ] Variáveis de ambiente configuradas no backend
- [ ] Google OAuth configurado (client IDs)
- [ ] OpenRouter API key configurada
- [ ] Usuário criado e logado com sucesso
- [ ] POST /api/ai/test-model retorna resposta correta
- [ ] Google SSO funciona no app mobile
- [ ] Start reading funciona
- [ ] Send action funciona
- [ ] Eventos narrativos persistem na sessão
- [ ] Limites Free são aplicados
- [ ] Modelos Premium bloqueados para Free
- [ ] UI de teste LLM não aparece em produção
