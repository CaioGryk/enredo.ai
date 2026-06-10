# Supabase + Prisma — Enredo

O Enredo usa Prisma sobre PostgreSQL. Para destravar o backend no MVP, a escolha recomendada agora e usar Supabase Postgres como banco principal de desenvolvimento.

## 1. Variaveis de Ambiente

Crie `services/api/.env` a partir de `services/api/.env.example`.

```env
DATABASE_URL="postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres"
```

Use:

- `DATABASE_URL` para runtime da API.
- `DIRECT_URL` para Prisma CLI, migrations e `db push`.

No painel do Supabase, pegue esses valores em:

`Project Settings -> Database -> Connection string`

Para desenvolvimento, use a connection string do pooler quando disponivel. Para migrations, use uma connection string direta/session.

## 2. Prisma

O datasource do Prisma deve manter:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

## 3. Comandos

Dentro de `services/api`:

```sh
npm install
npm run prisma:generate
npx prisma db push
npm run seed
npm run dev
```

Se for usar migrations versionadas em vez de `db push`:

```sh
npx prisma migrate dev --name init
```

## 4. NarrativeMemory Table

A tabela `NarrativeMemory` armazena o contexto narrativo de cada sessao de leitura, sendo alimentada de forma deterministica a cada cena gerada.

### Estrutura

```prisma
model NarrativeMemory {
  id              String @id @default(cuid())
  sessionId       String @unique
  summary         String @db.VarChar(2000) @default("")
  worldState      String @db.VarChar(2000) @default("")
  characterState  String @db.VarChar(2000) @default("")
  importantChoices String @db.VarChar(1500) @default("")
  openThreads     String @db.VarChar(1500) @default("")
  constraints     String @db.VarChar(1000) @default("")
  sceneCount      Int @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  readingSession  ReadingSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId])
}
```

### Criar/atualizar a tabela

```sh
npx prisma db push
```

Ou, se preferir migrations versionadas:

```sh
npx prisma migrate dev --name add_narrative_memory
```

### O que cada campo armazena

| Campo | Conteudo | Limite |
|---|---|---|
| `summary` | Historico das escolhas do usuario e resumos das cenas | 2000 chars |
| `worldState` | Informacoes sobre o ambiente e mundo | 2000 chars |
| `characterState` | Personagens mencionados e seu estado | 2000 chars |
| `importantChoices` | Registro das escolhas significativas do usuario | 1500 chars |
| `openThreads` | Trilhas narrativas em aberto | 1500 chars |
| `constraints` | Tom, estilo e regras da historia | 1000 chars |
| `sceneCount` | Contador de cenas geradas na sessao | - |

### Atualizacao deterministica

A cada nova cena, o servico atualiza a memoria de forma deterministica (sem chamadas LLM extras):

1. Adiciona escolha do usuario em `importantChoices`
2. Extrai mencoes de personagens de `sceneText` para `characterState`
3. Detecta mudancas de ambiente para `worldState`
4. Identifica cliffhangers e perguntas para `openThreads`
5. Mantem `summary` com um rolling buffer dos eventos recentes

## 5. Unique Constraint — Safe Workflow

O schema tem `@@unique([sessionId, sceneIndex])` em `NarrativeEvent` para proteger contra cenas duplicadas concorrentes.

### Antes de aplicar a constraint

Execute esta query no banco Supabase para verificar duplicados:

```sql
SELECT "sessionId", "sceneIndex", COUNT(*) as dup_count
FROM "narrative_events"
GROUP BY "sessionId", "sceneIndex"
HAVING COUNT(*) > 1;
```

- **Se a query retorna linhas**: existem duplicados. Voce precisa inspecionar manualmente cada par `sessionId` + `sceneIndex` antes de aplicar a constraint. Use uma query de detalhe para decidir qual evento manter, preferindo o registro coerente com o historico da sessao e, em geral, o mais recente por `generatedAt`:

```sql
SELECT id, "sessionId", "sceneIndex", "chapterNumber", "generatedAt", "userAction", "modelUsed"
FROM "narrative_events"
WHERE ("sessionId", "sceneIndex") IN (
  SELECT "sessionId", "sceneIndex"
  FROM "narrative_events"
  GROUP BY "sessionId", "sceneIndex"
  HAVING COUNT(*) > 1
)
ORDER BY "sessionId", "sceneIndex", "generatedAt" DESC;
```

Depois da revisao, remova ou reindexe apenas os registros escolhidos caso a caso. Nao rode deletes amplos sem backup e sem validar o impacto no historico da leitura.

- **Se a query retorna zero linhas**: o banco esta limpo. Voce pode aplicar a constraint com seguranca.

### Aplicando a constraint

Depois de verificar zero duplicados:

```sh
npx prisma db push
```

Ou, se quiser usar migrations:

```sh
npx prisma migrate dev --name add_narrative_event_unique_constraint
```

### Se `db push` ainda pedir confirmacao mesmo sem duplicados

Execute `npx prisma db push` e confirme manualmente. Como a checagem de duplicados retornou zero linhas, nao ha risco de perda de dados.

### O que a constraint protege

A constraint `@@unique([sessionId, sceneIndex])` garante que o mesmo par (sessionId, sceneIndex) nao possa existir duas vezes. Combinada com o retry em `sendAction`, se duas requisicoes concurrentes tentarem criar a mesma cena:

1. A primeira requisicao commit a transacao normalmente.
2. A segunda requisicao recebe erro P2002 (unique constraint violation).
3. O codigo re-tenta: busca o sceneIndex mais recente (agora maior) e tenta novamente.
4. A segunda requisicao persiste com sucesso em um sceneIndex diferente.

## 5. Observacoes

- Nao commitar `services/api/.env`.
- Nao usar a service role key do Supabase no frontend.
- A API NestJS deve continuar sendo o unico ponto de acesso a LLMs.
- Docker fica como opcao posterior para ambiente local padronizado.

## 6. Story Setup schema

O fluxo de Story Setup adiciona as tabelas `story_premises` e `story_playable_characters`, alem dos campos opcionais de selecao em `reading_sessions`:

- `selectedPremiseId`
- `selectedCharacterId`
- `protagonistName`
- `protagonistRole`
- `protagonistContext`

Antes de testar Story Setup contra o Supabase real, gere uma previa SQL do impacto:

```sh
npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script
```

Se a previa mostrar apenas tabelas novas e colunas opcionais, aplique manualmente:

```sh
npx prisma db push
```

Nao use `--accept-data-loss` sem revisar a mensagem do Prisma e sem aprovacao humana explicita. Para producao, prefira uma migration versionada:

```sh
npx prisma migrate dev --name add_story_setup
```

## 7. Alternative Providers

Supabase e o provedor principal documentado. Para ambientes de beta/staging com menor custo, o Neon Postgres e suportado como alternativa — veja `docs/deploy-neon.md`. A aplicacao usa Prisma ORM com PostgreSQL padrao; nenhuma funcionalidade especifica do Supabase (RLS, Auth, Storage) e usada no caminho beta.
