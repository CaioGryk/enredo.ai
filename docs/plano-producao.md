# Plano de Produção — Enredo.ai

Este documento organiza o caminho mais curto para tirar o Enredo.ai do ambiente local e colocar uma primeira versão pública/fechada em produção.

## Objetivo do primeiro lançamento

Publicar uma primeira versão Android-first com:

- boas-vindas, login e cadastro;
- prévia anônima guiada sem backend;
- biblioteca conectada ao backend;
- detalhe da história com 3 sinopses jogáveis e 3 personagens jogáveis;
- leitor interativo com escolhas e texto livre;
- memória narrativa persistida;
- limites Free aplicados;
- Premium/créditos visíveis, mas só liberados em produção quando houver pagamento real.

## Corte recomendado

Para publicar o quanto antes, o primeiro corte deve ser um **beta público ou fechado Free-first**.

Motivo: o backend de billing ainda usa pagamento mock. A experiência de leitura já pode validar retenção, onboarding e qualidade narrativa sem expor uma cobrança falsa.

## Bloqueadores de produção

1. **Backend hospedado**
   - Escolher host para NestJS.
   - Configurar `DATABASE_URL`, `DIRECT_URL`, JWT secrets, CORS e chaves LLM.
   - Expor API em domínio estável, por exemplo `https://api.enredo.ai/api`.

2. **Banco Supabase**
   - Confirmar `npx prisma db push` ou migration aplicada no projeto de produção.
   - Rodar seed/curadoria inicial sem criar usuários demo públicos.
   - Rotacionar senha do banco compartilhada durante desenvolvimento.

3. **IA**
   - Definir `LLM_MOCK_MODE=false` em produção.
   - Configurar `OPENROUTER_API_KEY` para Free.
   - Configurar `OPENAI_API_KEY` para Premium/utility.
   - Manter `ANTHROPIC_API_KEY` apenas se créditos/cinematic estiver ativo.
   - Testar cada provider autenticado com `POST /api/ai/test-model`.
   - Primeiro teste recomendado: usuário Free + `openrouter/free`.
   - Segundo teste recomendado: usuário Premium + `gpt-4.1-nano`.
   - **Nova fase de testes:** `FREE_LLM_ONLY=true` para usar apenas modelos gratuitos.
   - Ver `docs/free-llm-testing.md` para detalhes.

4. **Mobile**
   - Configurar `EXPO_PUBLIC_API_URL` apontando para a API de produção.
   - Criar build Android com EAS.
   - Testar APK interno antes de gerar AAB para Play Console.

5. **Pagamento**
   - Antes de vender Premium/créditos, substituir billing mock por integração real.
   - Opções prováveis:
     - Google Play Billing para assinatura/créditos no Android;
     - RevenueCat para abstrair assinatura e compras;
     - Stripe apenas para web, se houver versão web comercial.

6. **Segurança mínima**
   - Remover/ocultar logins demo em produção.
   - Garantir JWT secrets fortes.
   - Ativar rate limit em endpoints de auth, reading e story setup.
   - Confirmar que endpoints de geração/regeneração de story setup seguem protegidos.

7. **SSO**
   - Google SSO backend and mobile flow are implemented.
   - Backend accepts `POST /api/auth/sso` with `provider: "GOOGLE"` and `idToken`.
   - Configure `GOOGLE_CLIENT_IDS` in backend with valid client IDs.
   - Configure `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` and `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` in mobile.
   - Test login on web/dev and Android.
   - Apple Sign-In is intentionally deferred and not exposed by backend in this release.

## Teste LLM real

Depois de configurar as chaves no ambiente hospedado:

```sh
curl -X POST "$API_URL/ai/test-model" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"modelId":"openrouter/free"}'
```

O endpoint usa um prompt fixo e curto para evitar envio acidental de dados sensíveis. Mesmo assim, com `LLM_MOCK_MODE=false`, ele faz chamada real ao provider.

## Teste SSO Google

O mobile deve obter um Google ID token e enviar:

```json
{
  "provider": "GOOGLE",
  "idToken": "<google-id-token>",
  "name": "Nome opcional"
}
```

Para:

```text
POST /api/auth/sso
```

O backend valida o token no Google, confere `aud` contra `GOOGLE_CLIENT_IDS`, cria o usuário Free se necessário e retorna os mesmos `accessToken`/`refreshToken` do login comum.

## Checklist técnico já validado

- Backend tests: `npm test -- --runInBand` passou.
- Backend build: `npm run build` passou.
- Mobile TypeScript: `npx tsc --noEmit` passou.
- Web static preview export: `npx expo export --platform web --output-dir dist-preview` passou.

## Próxima ação recomendada

Preparar o backend para deploy:

1. escolher o provedor de hospedagem;
2. criar `.env.production` fora do repositório;
3. configurar domínio/API;
4. rodar Prisma contra Supabase de produção;
5. testar login, biblioteca, story setup, leitura e limite Free no ambiente hospedado.
