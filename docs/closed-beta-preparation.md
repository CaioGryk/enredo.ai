# Closed Beta Preparation — Enredo.ai

**Versão:** Step 97 — Maio de 2026
**Status:** Pacote de preparação para beta fechada local/dev. **Não é um lançamento público.**

---

## 1. Objetivo da Beta Fechada

Validar o Enredo.ai com um grupo restrito de testadores em **ambiente local de desenvolvimento** antes de qualquer deploy em staging ou produção. O foco é:

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
- ❌ Deploy em staging ou produção.
- ❌ App nas lojas (App Store / Google Play).
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

**Acesso:** Local apenas — cada testador precisa rodar o backend e o mobile localmente ou acessar via tunnel/expose local (ex: ngrok, localhost.run).

---

## 4. Checklist de Ambiente

### Backend (`services/api`)
```bash
# 1. Dependências
npm install

# 2. Configurar .env
cp .env.example .env
# Preencher DATABASE_URL, DIRECT_URL, JWT_SECRET, REFRESH_TOKEN_SECRET
# LLM_MOCK_MODE=false (para IA real)
# FREE_LLM_ONLY=false (para permitir modelos pagos)
# ADMIN_EMAIL e ADMIN_PASSWORD (para seed do admin)

# 3. Seed do admin
npm run seed

# 4. Validar
npx prisma validate
npx tsc --noEmit --incremental false
npm test -- --runInBand
npm run build

# 5. Iniciar
npm run dev
# API disponível em http://localhost:3001
# Swagger em http://localhost:3001/api/docs
```

### Mobile (`apps/mobile`)
```bash
# 1. Dependências
npm install

# 2. Configurar API URL para celular físico/tunnel quando necessário
# O app lê EXPO_PUBLIC_API_URL em build/start time; não edite src/api/client.ts.
# Exemplo:
# EXPO_PUBLIC_API_URL=http://<ip-local-ou-tunnel>:3001/api npx expo start

# 3. Validar
npx tsc --noEmit

# 4. Iniciar
npx expo start
# Escanear QR code com Expo Go no celular
```

### Provedores de IA necessários
- **OpenRouter** (API key: `OPENROUTER_API_KEY`) — modelo gratuito padrão.
- **OpenAI** (API key: `OPENAI_API_KEY`) — modelos premium.
- **Google AI** (API key: `GOOGLE_AI_API_KEY`) — geração de imagens.

**Opcionais (não bloqueiam a beta):**
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
- [ ] Mobile build funcional (Expo Go ou dev build).
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
