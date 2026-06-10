# Closed Beta Preparation — Enredo.ai

**Versão:** Step 98o — Junho de 2026
**Status:** Preparação para beta fechada com backend em Railway e APK Android interno via EAS. **Não é um lançamento público.**

---

## 1. Objetivo da Beta Fechada

Validar o Enredo.ai com um grupo restrito de testadores usando **backend production beta no Railway** e **APK Android interno** antes de qualquer publicação em loja. O foco é:

- Verificar a experiência completa de leitura interativa.
- Testar o fluxo de geração de imagens e vídeos com créditos.
- Validar o feed social, moderação e denúncias.
- Coletar feedback sobre usabilidade, copy e tom do produto.
- Identificar bugs de navegação, estado e performance.

---

## 2. Limites da Beta

### O que está incluído
- ✅ Cadastro e login (email/senha + Google SSO).
- ✅ Biblioteca de histórias curadas.
- ✅ Leitura interativa com IA (escolhas sugeridas + texto livre).
- ✅ Planos Free e Premium (mock/dev).
- ✅ Carteira de créditos com ledger completo.
- ✅ Geração de imagens de cena (1 crédito).
- ✅ Geração de vídeos de cena (5 créditos, via Kling).
- ✅ Feed social com cenas aprovadas.
- ✅ Curtidas, comentários, salvos e compartilhamentos.
- ✅ Moderação de cenas e comentários.
- ✅ Perfil, histórico de transações, termos e privacidade.

### O que NÃO está incluído
- ❌ Pagamentos reais (Stripe, Apple IAP, Google Play).
- ✅ Backend production beta no Railway.
- ✅ APK Android interno para testadores controlados.
- ❌ App nas lojas (App Store / Google Play pública).
- ❌ Personalização de aparência com foto de perfil.
- ❌ Reembolsos ou expiração de créditos.
- ❌ CI/CD automatizado.
- ❌ Monitoramento de produção.
- ❌ Convite público ou marketing.

---

## 3. Quem Pode Participar

- **Desenvolvedores** do projeto com acesso ao repositório.
- **Testadores internos** convidados pela equipe.
- **Usuários beta** com acesso ao ambiente local (em desenvolvimento).

**Número recomendado:** 3-8 testadores para esta fase.

**Acesso:** APK Android interno apontando para a API pública do Railway. Testadores não precisam rodar backend local.

**API beta:** `https://enredoai-production.up.railway.app/api`

---

## 4. Checklist de Ambiente

### Backend Railway (`services/api`)
```bash
# Validar API pública
curl https://enredoai-production.up.railway.app/api/health
```

Expected result: `status: "ok"`, `environment: "production"`, `database: "ok"`.

### Mobile (`apps/mobile`)
```bash
# 1. Dependências
npm install

# 2. Configurar API URL
# O app lê EXPO_PUBLIC_API_URL em build/start time; não edite src/api/client.ts.
EXPO_PUBLIC_API_URL=https://enredoai-production.up.railway.app/api

# 3. Validar
npx tsc --noEmit

# 4. Iniciar localmente com Expo Go
npx expo start
# Escanear QR code com Expo Go no celular

# 5. Gerar APK interno para beta controlada
npx eas build -p android --profile preview
```

### Provedores de IA necessários
- **Groq** (API key: `GROQ_API_KEY`) — provedor gratuito principal.
- **Google AI / Gemini** (API key: `GOOGLE_AI_API_KEY`) — fallback de texto.
- **OpenRouter** (API key: `OPENROUTER_API_KEY`) — fallback de texto.

**Opcionais (não bloqueiam a beta):**
- OpenAI (API key: `OPENAI_API_KEY`) — modelos premium.
- Anthropic (API key: `ANTHROPIC_API_KEY`) — modelo cine.
- Kling (API keys: `KLING_API_KEY` + `KLING_ENABLED=true`) — geração de vídeo.

---

## 5. Checklist Pré-Beta

| # | Item | Comando/Verificação |
|---|------|---------------------|
| 1 | Backend tests passam | `npm test -- --runInBand` — 679 tests / 46 suites ✅ |
| 2 | Backend TypeScript limpo | `npx tsc --noEmit --incremental false` ✅ |
| 3 | Prisma schema válido | `npx prisma validate` ✅ |
| 4 | Backend build passa | `npm run build` ✅ |
| 5 | Mobile TypeScript limpo | `npx tsc --noEmit` ✅ |
| 6 | Admin seed funcional | `npm run seed` |
| 7 | Swagger acessível (dev) | `http://localhost:3001/api/docs` |
| 8 | Registro funcional | Testar `POST /auth/register` |
| 9 | Login funcional | Testar `POST /auth/login` |
| 10 | Leitura interativa | Iniciar história → ler cena → enviar ação |
| 11 | Geração de imagem | Gerar imagem de cena (1 crédito) |
| 12 | Feed social | Verificar cenas aprovadas no feed |
| 13 | Termos e privacidade | Navegar para Perfil → Termos e privacidade |

---

## 6. Instruções para Testadores

### O que testar
1. **Cadastro e login** — criar conta, fazer login, login com Google.
2. **Onboarding** — completar os 6 passos ou pular.
3. **Biblioteca** — explorar histórias, usar filtros.
4. **Leitura** — escolher premissa → personagem → ler primeira cena → enviar ação.
5. **Créditos** — verificar saldo, histórico de transações.
6. **Premium (dev)** — ativar Premium no modo dev (sem cobrança real).
7. **Imagens** — gerar imagem de cena.
8. **Vídeos** — gerar vídeo de cena (se Kling configurado).
9. **Feed** — navegar pelo feed de cenas, curtir, comentar, salvar.
10. **Perfil** — ver informações, acessar termos e privacidade.
11. **Galeria** — ver cenas geradas.
12. **Submeter** — enviar cena para moderação.

### O que NÃO está disponível
- Pagamentos reais — tudo é mock/dev.
- Vídeos sem Kling configurado — o botão mostrará "Vídeo indisponível".
- Foto de perfil para personalização de vídeo — recurso futuro.
- App nas lojas — apenas via Expo Go ou build de desenvolvimento.

### Como reportar
- **Bugs:** descrever o passo a passo, o que era esperado e o que aconteceu.
- **Sugestões:** copy confusa, fluxo difícil, funcionalidade desejada.
- **Performance:** telas lentas, travamentos, carregamentos longos.

---

## 7. Critérios Go/No-Go

### GO (beta pode começar)
- ✅ Todos os testes backend passam (679/46).
- ✅ TypeScript backend e mobile sem erros.
- ✅ Prisma schema válido.
- ✅ Backend build passa.
- ✅ Fluxo principal (registro → leitura → ação) funcional.
- ✅ Admin seed funcional.
- ✅ Pelo menos 1 provider de IA configurado e funcional.

### NO-GO (beta não deve começar)
- ❌ Testes backend falhando.
- ❌ Erro de TypeScript que impede build.
- ❌ Prisma schema inválido.
- ❌ Fluxo principal quebrado (registro ou leitura não funciona).
- ❌ Nenhum provider de IA configurado.
- ❌ Banco de dados inacessível.

---

## 8. Critérios de Parada (Stop/Rollback)

A beta deve ser **interrompida** se:
- Ocorrer corrupção ou perda de dados no banco.
- Um bug crítico impedir todos os testadores de usar o app.
- Um problema de segurança expuser dados de testadores.
- O backend ficar inacessível por mais de 24h.

**Rollback:** Restaurar banco de dados do backup mais recente. Corrigir o bug. Reiniciar a beta.

---

## 9. Checklist do Operador

- [ ] `.env` configurado com todas as variáveis necessárias.
- [ ] Admin seed executado (`npm run seed`).
- [ ] Backend rodando e acessível.
- [ ] Mobile build funcional (Expo Go ou APK preview).
- [ ] Lista de testadores definida.
- [ ] Canal de comunicação com testadores estabelecido (ex: Discord, WhatsApp, email).
- [ ] Backup do banco de dados criado antes de iniciar a beta.
- [ ] Documento de instruções compartilhado com testadores.

---

## 10. Limitações Conhecidas

| Limitação | Impacto | Mitigação |
|-----------|---------|-----------|
| Pagamentos mock apenas | Testadores não podem fazer compras reais | Documentado no app como "(dev)" |
| Kling requer credenciais reais | Geração de vídeo pode não funcionar | Opcional — não bloqueia a beta |
| Sem app nas lojas | Apenas Expo Go ou dev build | Instruir testadores a usar Expo Go |
| Ambiente local apenas | Testadores precisam de acesso à rede local | Usar ngrok/tunnel se necessário |
| Sem CI/CD | Deploy manual | Documentar passos no README |
| Dados podem ser perdidos | Sem backup automatizado | Fazer backup manual antes da beta |

---

## 11. Próximos Passos (Pós-Beta)

1. **Step 98 — Real User Round:** Convidar testadores externos para a beta.
2. **Step 99 — Post-Feedback Adjustments:** Corrigir bugs e implementar feedback.
3. **Step 100 — Initial Public MVP:** Preparar para lançamento público inicial.
