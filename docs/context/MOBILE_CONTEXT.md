# Mobile Context — Enredo.ai

**Purpose:** Mobile-specific information, screens, UI/UX, and implementation status.

---

## Stack

| Technology | Purpose |
|------------|---------|
| Expo Router | Navigation and routing |
| React Native | UI framework |
| React Query | Server state management |
| TypeScript | Type safety |

## Closed Beta APK

The controlled beta path is Android APK first, using EAS Build with the `preview` profile.

Current beta API:

```env
EXPO_PUBLIC_API_URL=https://enredoai-production.up.railway.app/api
```

Local Expo uses `apps/mobile/.env.local` for the same URL. This file is intentionally ignored by git.

APK build command:

```bash
cd apps/mobile
npx eas build -p android --profile preview
```

The `preview` profile in `eas.json` builds an internal APK and injects the production beta API URL. Use this APK for owner validation first, then distribute the EAS APK link to controlled Android testers.

**Web Preview:**
```sh
npx expo export --platform web --output-dir dist-preview-vX
npx serve -s dist-preview-vX -l 8099
```

Deep links must use `serve -s` to not break routes like `/story/:id`.

---

## Existing Screens

| Screen | Status | Description |
|--------|--------|-------------|
| Welcome | ✅ Redesigned | App entry point |
| Login | ✅ Redesigned | Authentication |
| Register | ✅ Redesigned | User registration |
| Library | ✅ Redesigned | Public story catalog |
| My Stories | ✅ Redesigned | User's reading sessions |
| Scenes (Feed) | ✅ Implemented | Vertical video feed (initial version) |
| Premium / Credits | ✅ Redesigned | Subscription and credit purchase |
| Profile | ✅ Redesigned | User profile and settings |
| Story Detail | ✅ Redesigned | Story information and start CTA |
| Interactive Reader | ✅ Beta Polish | Main reading experience |
| Premise Selection | ✅ Implemented | Choose from 3 premises |
| Character Selection | ✅ Implemented | Choose from 3 characters |
| Demo Preview | ✅ Implemented | Story preview/demo mode |
| Active Sessions | ✅ Implemented | List and manage reading sessions |

---

## Visual Theme

### Current Theme (Cinematic Dark)

```typescript
const theme = {
  colors: {
    background: '#0D0D0F',
    surface: '#15131B',
    surfaceAlt: '#1B1824',
    text: '#F5F1FF',
    textMuted: '#8B839E',
    accent: '#CEBDFF',
    accentGold: '#D4A853', // For monetization blocks
  }
};
```

### Evolution

The app migrated from:
- ❌ Old editorial/gold theme
- ❌ "Antique library" feel
- ❌ Medieval/default styling

To:
- ✅ Dark cinematic
- ✅ Mobile-first
- ✅ Modern AI + social product
- ✅ Lavender/purple as main accent
- ✅ Less antiquated feel

**Note:** Some monetization elements still use gold/amber as secondary color (intentional for Premium blocks).

---

## UX Decisions

### Story Flow (Established)

```
Library → Story Detail → Premise Selection → Character Selection → Reader
```

This replaces the previous approach of combining premise/character on the story detail screen.

### Interactive Reader Design

**Core Principle:**
> The reader must NOT look like a visual novel with fixed choice branches.
> The reader is tuned for concise atmospheric narration + living character interaction (Step 98d).

> QA note: the free-action input exposes stable `testID`/accessibility labels and supports keyboard submit, so beta QA can validate typed actions separately from suggested-choice buttons.
> QA note: suggested choices use selection + explicit `CONTINUAR` submit in the web preview. This prevents a tap from looking selected while not advancing the session, and gives QA a stable `reader-submit-selected-choice` target.

**Rules:**
- Free text input always visible
- AI suggestions are auxiliary
- Open conversation with AI is the main interaction
- Default scenes: ~90-170 words after the first scene, 3-5 short visual blocks, ~40% narration / 40% character reaction-dialogue / 20% interactivity
- Dialogue or NPC reactions should be visually scannable; the mobile reader renders narration and dialogue as separate segments when possible.
- Every scene with characters must include at least one meaningful reaction from a relevant character
- Choices must be relational and specific to the scene and relationship dynamics
- Narration creates mood/consequence/tension, not over-describes the environment
- Avoid communicating the experience as "path choosing"

### Error Handling

**Backend Error Integration:**
- `reading-error-helper.ts` maps backend error codes to user-friendly alerts
- Covers all error codes: `READING_SESSION_NOT_FOUND`, `PREMIUM_REQUIRED`, `DAILY_LIMIT_REACHED`, `INSUFFICIENT_CREDITS`, `MODEL_ACCESS_DENIED`, `AI_PROVIDER_UNAVAILABLE`, `READING_GENERATION_FAILED`, `INVALID_READING_ACTION`
- Fallback to HTTP 402 check for backward compatibility

---

## Screen-Specific Details

### Reader (`[id].tsx`) — V2 Timeline de Mensagens

**Arquitetura:** Timeline de mensagens estilo chat/Stitch. Converte `session.history[]` + `session.currentScene` em `Message[]` via `useMemo`, ordenado por `sceneIndex` ascendente (cronológico). Histórico completo visível como pares de ação do jogador + resposta do narrador.

> O reader é um leitor de histórias interativas com IA, não um chatbot genérico. O texto livre é a interação principal; as escolhas sugeridas são auxiliares.

**UI:**
- `FlatList` com bubbles: jogador à direita (violeta), narrador à esquerda (Noto Serif, fundo escuro translúcido)
- Escolhas renderizadas inline abaixo da última mensagem do narrador, com ícones temáticos
- Marcador "Início da Aventura" como `ListHeaderComponent`
- Loading: 3 dots animados + "Mestre narrando aventura..."
- Header: título da história + subtítulo "Capítulo X • Cena Y" + ArrowLeft (voltar) + Biblioteca + Settings
- Separador decorativo estático entre header e timeline
- Footer fixo: diagnóstico (modelo AI + créditos) + pílulas de mídia (Gerar Imagem/Vídeo) + preview compacto da imagem gerada + input underline (100 chars)
- Preview de imagem gerada aparece abaixo das pílulas de mídia quando disponível
- **Recuperação de cena incompleta (Step 98e):** se `currentScene.sceneText` estiver vazio, o reader detecta `hasIncompleteCurrentScene`, bloqueia o input/send, e exibe um bloco de recuperação dourado com "Tentar novamente" que chama `sessionRefetch()`. A timeline preserva apenas eventos históricos válidos com `sceneText`, pulando eventos incompletos para não renderizar ação do jogador sem resposta do narrador.
- **Auth gate do reader:** antes de chamar `/reading/sessions/:id`, `/ai/models`, story-title ou scene-media, o reader espera `AuthContext` validar o usuário. Se a autenticação estiver ausente/expirada, a tela mostra "Sessão expirada" com CTA para login em vez de bater na API com 401 e exibir erro genérico de conexão.
- **Performance:** Reader consome uma janela recente de eventos retornada pelo backend, não todo o histórico da sessão. A continuidade longa vem do Story Codex/Narrative Memory no backend. A FlatList usa renderização em lotes e abre no trecho mais recente.

**Estados:** Session loading com `StateBlock`. Session error distingue 404 (`READING_SESSION_NOT_FOUND` → biblioteca) vs outros erros (retry + back).

**Contrato:** Título da história via `GET /library/stories/:id`. `ReadingSessionDetails` com `protagonistName`, `protagonistRole`, `selectedPremiseId`, `selectedCharacterId`.

### Library (`library.tsx`) — Redesign Google AI Studio

**Arquitetura:** Tela de catálogo de histórias com seções cinematográficas e busca funcional, alinhada ao design de referência do Google AI Studio (Library.ai).

**UI:**
- Header: marca "Enredo.ai" violeta serif italic + badge "Enredo AI Ativo" com ícone Sparkles
- Busca funcional: `TextInput` que filtra stories por título e gênero via `useMemo`, sem chamadas extras de API
- **Originals:** Cards horizontais landscape 16:10 com imagem de capa, overlay gradiente, badge ORIGINAL violeta, gênero + título Noto Serif
- **Tendências:** Mini cards 2:3 com hover "Ler agora", bolinha dourada em histórias com sessão ativa
- **Comunidade:** Grid 2 colunas com cards 3:4, tag GRÁTIS no canto, badge "Lendo" violeta para sessões ativas
- **Premium:** Cards horizontais com 1/3 imagem + 2/3 texto, cor dourada `#ffb95f`, ícone Zap, label "PREMIUM STORY"
- **Continue Reading:** Card no topo com Play violeta, título da história, número da cena (se houver sessão ativa)
- **Bottom Sheet:** Modal slide-up ao tocar em qualquer card: imagem hero, gênero pill, sinopse, botão "Iniciar Leitura Interativa" + "Continuar leitura" (se sessão ativa)
- Estados de loading, erro e vazio preservados com `StateBlock`

**Design tokens:** Premium usa dourado `#ffb95f` (referência), não violeta. Fontes: Noto Serif para títulos, Inter para labels.

**Fallback art:** Quando `story.coverUrl` e `story.coverImageUrl` estão ausentes (ex: quota de imagem esgotada), um `FallbackCard` determinístico renderiza com cores baseadas no gênero + ícone Sparkles centralizado. Aplicado em todos os tipos de card e no hero do bottom sheet.

**Seções:** Nomes honestos baseados nos campos disponíveis do DTO — "Destaques" (histórias gratuitas em landscape), "Tendências" (mini cards), "Premium" (cards horizontais dourados). Sem seção "Comunidade" duplicada.

**Busca vazia:** Estado inline "Nenhum resultado" com botão "Limpar busca" quando `searchQuery` não vazio e sem resultados.

### Active Sessions (`active.tsx`)

**Features:**
- Lists ACTIVE, COMPLETED, ABANDONED sessions
- Error state with retry button
- ChronicleCard shows real `selectedPremiseTitle` and `selectedCharacterName`
- ChronicleCard renders real `storyCoverUrl` images for active sessions. Backend maps this to the best available image: story cover, selected premise cover, then selected character portrait. Deterministic fallback art is kept only when no real image exists.
- Session summary images only use external `http(s)` URLs. Inline/base64 images are intentionally stripped by the backend because they made `/reading/sessions` multi-megabyte and caused long mobile loading states. When stripped, ChronicleCard uses deterministic fallback art/initials.
- Abandon action: React Native Web preview calls the mutation directly because `Alert.alert` confirmation buttons are unreliable on web; native mobile keeps the confirmation dialog.
- Status filter: COMPLETED (not FINISHED)

### Story Detail (`story/[id].tsx`) — StoryCover Reference

**Arquitetura:** Tela de capa/detalhe da história alinhada ao design `Story Detail.ai`.

**UI:**
- Header: ArrowLeft + "Enredo.ai" (Noto Serif italic). Sem Bookmark morto.
- Hero: cover 3:4 com gradient overlay. Fallback art com glow violeta quando sem imagem real.
- Badge "Enredo.ai Original" no canto inferior esquerdo
- Título Noto Serif Bold italic 30px
- Badge row: genre pill violeta + GRÁTIS/PREMIUM + maturity + "HISTÓRIA INTERATIVA". Dados reais do DTO.
- Sinopse Noto Serif sem border-left
- Info grid: CLASSIFICAÇÃO / CAPÍTULOS / ACESSO com dados reais
- Premise preview: "X premissas disponíveis" + descrição
- Elenco do mundo: retratos dos personagens base em scroll horizontal
- Footer: "ESCOLHER PONTO DE PARTIDA" + Play → `router.push(/story/${id}/premise)`

**Removido:** Fake chapters, `curatedCoverImages`, `flowCard`, `HeroOverlay`, `SectionLabel`, `SectionHeader`, `chapterTitle`.

### Premise Selection (`story/[id]/premise.tsx`) — ChoiceScreen Reference

**Arquitetura:** Seleção de premissa sem auto-avançar. Usuário seleciona no card, depois aperta CTA.

**UI:**
- Header: ArrowLeft + "Ponto de Partida" (Noto Serif)
- Subtítulo: "Como deseja iniciar esta história?"
- Cards: cobertura do backend (`coverUrl`) + ícone temático + título + sinopse
- Seleção manual: toque no card → borda violeta + badge "Selecionado". Seleção não avança automaticamente.
- Footer: botão "CONTINUAR PARA PERSONAGENS" (desabilitado até selecionar) + Play
- `renderPremiseIcon`: mapeia palavras-chave do título para ícones (castelo→Crown, noite→Moon, etc.)
- Geração de premissas: `generatePremisesMutation` preservado

### Character Selection (`story/[id]/character.tsx`)

**Arquitetura:** Seleção de personagem com retratos e `startingSituation`.

**UI:**
- Cards com retratos 3:4: imagem real (`imageUrl`) ou fallback art por gênero
- Dim-until-selected: overlay escuro + opacidade reduzida até selecionar
- `startingSituation` exibido com prioridade máxima na descrição
- Selected badge verde "Selecionado"
- Footer: "INICIAR HISTÓRIA" com `startSessionMutation`, loading state
- Missing `premiseId` guard: deep links without a selected premise show a recovery state and route back to premise selection.

### Narrative Preferences (Implemented UI)

Adult romance preferences should live under Profile/Settings, not public discovery.

Implemented mobile contract:
- Route: `/profile/narrative-preferences`.
- Entry point: Profile → "Preferências de narrativa".
- Lets users choose romance intensity.
- Gates "Adulto 18+" behind age confirmation and adult preference terms.
- Explains that the preference affects only private stories.
- Does not show adult/hot categories in onboarding, library, public feed tabs, or store-facing screenshots.
- Never implies that profile photo/appearance opt-in permits adult sexual image/video generation.
- Existing age/terms gates from backend are reflected in the switch state when reopening the screen.

Reference policy: `docs/content-adult-policy.md`.

---

## API Contracts

### Reading Session

```typescript
interface ReadingSession {
  id: string;
  storyId: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
  selectedPremiseId?: string;
  selectedCharacterId?: string;
  protagonistName?: string;
  protagonistRole?: string;
  protagonistContext?: string;
  currentScene: {
    text: string;
    choices: string[];
    metadata: any;
  };
  history: Array<{
    sceneIndex: number;
    text: string;
    action?: string;
  }>;
}
```

### Usage Info

```typescript
interface UsageInfo {
  dailyInteractionsUsed: number;
  dailyInteractionsLimit: number;
  creditsRemaining: number; // Required, never undefined
  modelUsed: string;
}
```

### Session Summary (Library)

```typescript
interface ReadingSessionSummary {
  id: string;
  storyId: string;
  storyTitle: string;
  storyCoverUrl?: string;
  selectedPremiseTitle?: string;
  selectedCharacterName?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
  progress: number;
  lastReadAt: string; // ISO date
}
```

---

## Mobile Preview

**Web Preview Frame:**
Mobile frame/centralization implemented in `apps/mobile/app/+html.tsx` for desktop browser preview.

**Usage:**
```sh
cd apps/mobile
npx expo export --platform web --output-dir dist-preview-v27
npx serve -s dist-preview-v27 -l 8099
```

---

## Known Mobile Limitations

1. **No practical test setup** - TypeScript validation only
2. **Feed Cenas has early visual treatment** - Real discovery/ranking polish remains future work
3. **Scene media integration** - ✅ Step 43 image generation wired; ✅ Step 87 video generation wired with initial success URL display

## Scene Media Integration (Step 43)

### Image Generation
- **Entry point:** "Gerar imagem" button in reader interaction section
- **Cost:** 1 crédito (shown on button badge)
- **Flow:** Confirm dialog → create SceneMedia → generate image → show result
- **Error handling:** `INSUFFICIENT_CREDITS` routes to upgrade; disabled generation shows message
- **Duplicate protection:** Button disabled while creation/generation is in flight

### Character Portraits (Core MVP)
- Character portraits on the character selection screen are part of the base MVP experience, not a Premium or credit-gated feature.
- Mobile must show generated `imageUrl` when available, a clear pending state while portraits are being prepared, and a polished fallback if generation fails.
- Character selection must refetch while any portrait is `PENDING` so non-blocking backend generation becomes visible without manual reload.
- Character portraits should appear dimmed until selected; selecting a character reveals the portrait in full color and shows the selected badge.
- Character cards should communicate the specific `startingSituation` when available, because the choice defines both the playable character and that character's starting point in the story.
- Provider quota exhaustion must not leave the app visually empty. Library, premise, and character screens render polished procedural fallback art using backend fallback metadata or local story genre/title signals while real images are unavailable.
- Backend provider decision for MVP: Cloudflare Workers AI / `@cf/black-forest-labs/flux-1-schnell` as primary portrait provider.
- Google image generation is optional/fallback only after local testing showed Gemini image free quota can be 0.

### Video Generation (Step 87)
- **Status:** Live in reader media section — "Gerar vídeo" button wired to `POST /scene-media/:id/generate-video`.
- **Cost:** 5 créditos (backend-owned, shown on button badge + confirmation alert).
- **UX:** Confirmation alert ("Esta ação consome 5 créditos"), loading spinner, success state ("Vídeo gerado"), error states with CTA for insufficient credits.
- **States:** No scene → "Vídeo indisponível" (disabled); active scene → active button; video exists → "Vídeo gerado" (completed green).
- **Privacy:** Generated videos remain private by default. No auto-submit to feed.
- **Backend state:** Kling real provider boundary (Step 85/86) with async task polling. Backend only spends credits when final `videoUrl` exists.
- **Appearance opt-in:** Not sent to backend. Persisted profile photo/appearance consent remains deferred.

### API Contract
```typescript
interface SceneMedia {
  id: string;
  userId: string;
  narrativeEventId?: string | null;
  storyId?: string | null;
  mediaType: 'TEXT' | 'IMAGE' | 'VIDEO' | 'ANIMATED';
  imageUrl?: string | null;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  visibility: string;
  moderationStatus: string;
  title?: string | null;
  caption?: string | null;
  textExcerpt?: string | null;
  createdAt: string;
}
```

### Endpoints Used
| Endpoint | Purpose |
|----------|---------|
| `GET /scene-media/my` | Fetch existing scene media for current event |
| `POST /scene-media/from-event/:narrativeEventId` | Create SceneMedia from narrative event |
| `POST /scene-media/:id/generate-image` | Generate image (1 credit) |

### Image States (Step 43 Fix)
- **No event id:** "Imagem indisponível" disabled state (no API call possible)
- **Has image already:** "Imagem gerada" completed state (green accent, no regenerate button)
- **No image yet:** "Gerar imagem" button with 1 crédito badge, confirmation dialog

### SceneResponse Contract (Step 43 Final Fix)

`SceneResponse.id` is optional (`id?: string`) — matches backend `SceneResponseDto.id?: string`. Mobile treats missing `id` defensively: disables media generation when `currentSceneId` is undefined.

## Scene Media Gallery (Step 44)

### Gallery Screen (`scene-media.tsx`)
- **Route:** `/scene-media` (registered in root Stack)
- **Entry point:** "Ver galeria" link in reader media section
- **Data:** `GET /scene-media/my` via `useQuery<SceneMedia[]>`
- **Layout:** 2-column grid of image cards with text excerpt
- **States:** Loading, error (with retry), empty (with library CTA)
- **Video:** Video items are counted in the gallery header and cards show an active "Vídeo" badge when a generated video exists.

### Reader Credit Visibility
- Credits badge added above media generation buttons
- Shows `X créditos disponíveis` with coin icon
- Uses `usage.creditsRemaining` from reading session
- Zero credits: muted text; positive credits: primary accent
- After successful image generation, the reader invalidates both the scene media gallery query and the current session query so generated media and credit balance refresh.

## Publication Flow (Step 45)

### Gallery Submit CTA
- "Publicar" button on eligible media cards (`NOT_SUBMITTED` + `imageUrl`)
- Confirmation dialog before submission
- Calls `POST /scene-media/:id/submit` via `useMutation`
- Success: alert + cache invalidation only after backend confirms submission
- Error: backend error message displayed

### Moderation Status Labels
| Status | Label | Icon |
|--------|-------|------|
| `NOT_SUBMITTED` + image | "Publicar" button | Send |
| `PENDING` | "Em análise" | Clock |
| `APPROVED` | "Aprovada" | ShieldCheck |
| `REJECTED` | "Rejeitada" | ShieldX |
| `NOT_SUBMITTED` without image | "Privada" | — |

**Moderation backend (Step 46):** Admin can now approve/reject submitted media via `/admin/scene-media` endpoints. Approved media becomes PUBLIC with `publishedAt`.

## Scenes Feed (Step 47)

The Scenes tab now consumes real approved public scene media from `GET /scene-media/feed`.
- Replaced hardcoded mock data with `useQuery`
- Vertical swipe feed preserved (TikTok/Reels style)
- Genre pills from `story.genres`, title from `title || story.title`
- Thumbnail from `imageUrl` with `story.coverUrl` fallback
- Rail icons (like, comment, bookmark, share) visible without fake numbers
- CTA "Entrar nesta história" only when `storyId` exists
- Loading/error/empty states added
- Safe image fallback (Step 47 Fix): `imageUrl` → `thumbnailUrl` → `story.coverUrl` → dark placeholder

### Scene Feed Engagement (Step 48)

Rail buttons (like, save, share) are now functional:
- **Like/Save:** `POST/DELETE /scene-media/:id/like|save` with React Query mutations
- **Share:** `POST /scene-media/:id/share` + native `Share.share()` dialog
- **Counts:** Real aggregate counts from backend (`likeCount`, `saveCount`, `shareCount`)
- **Mutation guard:** Per-item state tracking prevents duplicate taps during mutation
- **Toggle behavior (Step 48 Fix):** Like and save are toggleable via local state (heart/bookmark fill on active), calling `DELETE` to unlike/unsave
- **Comments (Step 49/54):** Comment button opens bottom-sheet overlay with list + input. Both list and create require JWT auth. Backend returns only VISIBLE comments and visible-only `commentCount`.

### Community Safety (Step 53)

- Flag icon on scene cards opens report modal
- Reason input (3-500 chars), POST to `/scene-media/:id/report`
- Duplicate prevention, loading states
- Comment report UI deferred

### Social Feed States (Step 55)

- **Loading:** `StateBlock` with spinner
- **Error:** `StateBlock` with retry button
- **Empty:** Message with gallery CTA
- **Pull-to-refresh:** `RefreshControl` on FlatList
- **Image fallback:** `ImageBackground.onError` → dark placeholder
- **Mutation errors:** Like/save/share/comment/report show concise `Alert`
### Saved Scenes (Step 56)

- **Route:** `/saved-scenes` (Stack screen)
- **Entry point:** Floating bookmark button on Scenes feed
- **Layout:** 2-column grid similar to scene media gallery
- **Data:** `GET /scene-media/saved` via `useQuery`
- **States:** Loading, error (retry), empty ("Nenhuma cena salva"), pull-to-refresh
- **Navigation:** Tap card → `/story/:id`

---

### Profile Screen (Step 61)

- **Identity:** Name, email, avatar (image or initial fallback)
- **Plan:** Free/Premium badge from subscription API
- **Stats:** Active reading count (real data, no fake followers)
- **Navigation:** Saved scenes, active readings, premium/upgrade
- **Logout:** Confirmation alert before exit
- **No mock video grid, empty tabs, or non-persistent profile/consent editing CTAs**

---

### Library and Active Empty States (Step 62)

- When `stories.length === 0`, shows "Biblioteca em preparação" with retry button
- Loading/error states preserved with consistent `StateBlock`
- Active tab uses `StateBlock` for loading and error states
- Active tab keeps filter-aware empty copy and CTA back to Library for active readings

---

### Credits and Upgrade UX (Step 64)

- Premium/Credits screen explains current credit uses: image = 1 credit, video = 5 credits, Cine models = a partir de 2 créditos por cena (Step 88 audit confirmed backend-mobile consistency).
- **Transaction History** (Step 83): `TransactionHistory` component on upgrade screen shows recent ledger activity with EARN (+/green) vs SPEND (-/red) distinction, user-facing reason labels, localized dates (pt-BR), loading, retryable error, and empty states. Uses existing `GET /billing/credits` API with no UI-side mocks.
- **Terms/Privacy (Step 93):** Legal screen at `/legal` with Terms of Use and Privacy Policy tabs (pt-BR). Accessible from Profile → "Termos e privacidade".
- **Free/Premium audit (Step 84):** Onboarding no longer claims Premium grants credits (false). `DAILY_LIMIT_REACHED` now offers "Ver Premium" CTA. `INSUFFICIENT_CREDITS` CTA fixed to "Ver créditos". `STORY_NOT_FOUND` error handled with navigation to library.
- **Cost audit (Step 88):** All mobile cost displays match backend enforcement. Cine cost is dynamic from the models API. Cinematic mode guard fixed.
- **Monetization policy (Step 89):** Full policy at `docs/monetization-policy.md`. Mock honesty verified across all surfaces. Refunds and expiration deferred. Insufficient-credit CTAs all point to upgrade screen.

---

### Global API Error Handling (Step 65)

- Shared helper: `apps/mobile/src/utils/api-error-helper.ts`
- API alerts now distinguish safe backend messages, network errors, and timeout errors.
- Technical-looking backend/proxy messages are not shown directly to users.
- Reading fallback errors use the shared helper while preserving explicit reading error-code CTAs.
- Feed mutations, upgrade mutations, reader image generation, and premise/character generation use standardized API error copy.

### Feed/Reader Performance (Step 91)

- Scenes feed uses FlatList performance props for vertical paging: `removeClippedSubviews`, `initialNumToRender={2}`, `maxToRenderPerBatch={2}`, `windowSize={3}`.
- `SceneCard` and `BackgroundOverlay` are memoized and receive stable action handlers; item-specific action closures live inside the memoized card layer.
- Feed hooks are declared before loading/error/empty returns to preserve React Hook order.
- Saved scenes and scene media gallery grids use bounded FlatList render windows (`initialNumToRender={6}`, `maxToRenderPerBatch={6}`, `windowSize={5}`).
- Reader already uses memoized derived state for history, narrative blocks, and credit model; no Step 91 reader code changes were needed.

### New User Flow (Step 94)

- Entry screen offers three clear paths: create account, login, or try the guided preview.
- Successful login/register/social auth sets tokens and lets `AuthContext` route users to onboarding when `onboardingComplete:{userId}` is missing, or directly to Library when completed.
- The Axios API client uses a single-flight refresh-token lock. When multiple protected requests receive 401 at the same time, only one `/auth/refresh` call is sent; the other requests wait for the new access token and retry with it. This is required because the backend rotates refresh tokens and revokes the previous token on every successful refresh.
- Before protected requests, the API client proactively refreshes the access token when the JWT is expired or within 60 seconds of expiring. This reduces noisy 401s and prevents reader-start actions from depending on reactive retry.
- API and refresh request timeouts are 30s for beta QA, because local preview + Supabase remote + provider-backed reading can exceed 10s during cold or slow moments.
- Onboarding remains a 6-step carousel covering library, premise/character choice, interactive reading, media generation, credits, and social publishing with beta-honest copy.
- First reading path is: Library -> Story Detail -> Premise Selection -> Character Selection -> Reader.
- Step 94 fixed the legal profile shortcut by registering `/legal` in the root Stack.
- Remaining beta limitation: no analytics funnel and no real-device manual QA yet; Step 95 is the guided manual QA pass.

### Guided Manual QA (Step 95)

- Created `docs/manual-qa-beta.md` with a 20-flow local/dev beta QA checklist.
- QA method was static code analysis, not real-device or staging runtime testing.
- Step 95 fixed loading/error navigation blockers in reader, story detail, premise selection, and character selection.
- Reader now has an early missing-session-id guard with a library CTA.
- `AuthContext` no longer logs raw error objects; the remaining load-user message is gated behind `__DEV__`.
- Step 95 deferred `router.back()` deep-link fallbacks, demo credential documentation, beta `(dev)` labels, orphan profile avatar/consent persistence, router `as any` casts, and preview back-stack fallback to Step 96.

### Final Fixes (Step 96)

- Added `src/utils/navigation-helper.ts` with `goBackSafe(fallbackPath)` for guarded back navigation.
- Replaced remaining raw screen-level `router.back()` calls in preview, legal, saved scenes, scene media, story detail, premise, character, reader, login, reading error handling, and profile preview screens.
- Only `navigation-helper.ts` should call `router.back()` directly; it checks `router.canGoBack()` before falling back to a safe route.
- Demo credentials remain behind `__DEV__`; `(dev)` labels remain intentional until real monetization and provider flows are active.
- `profile/avatar.tsx` and `profile/consent.tsx` remain inaccessible preview screens until backend persistence contracts exist, but their back navigation is now safe.

### Closed Beta Preparation (Step 97)

- `docs/closed-beta-preparation.md` now defines the mobile beta setup path for local/dev testing.
- Physical-device/tunnel testing must use `EXPO_PUBLIC_API_URL=http://<ip-or-tunnel>:3001/api npx expo start`; do not edit `src/api/client.ts` for beta URL switching.
- Mobile remains Expo-first for this beta round; no App Store/Google Play submission is part of Step 97.

### Beta Catalog Premise Covers

- Premise cards consume `coverGenerationStatus`, `coverError`, and `coverFallback` from the backend contract.
- Pending cover generation shows an inline loading visual.
- Missing or failed cover generation uses procedural fallback data instead of a generic empty image block.

### Library Full Catalog Visibility

- The Library screen keeps the horizontal `Destaques` and `Tendências` rails as curated preview sections.
- Added a vertical `Todas as histórias` section so users can access the full loaded catalog instead of seeing only the first 5-6 repeated stories.
- The section uses the same story preview bottom sheet as the existing rails and shows the current filtered story count.

### Day 2 Visual QA

- Beta catalog images were validated in the Codex browser preview across Library, Story Detail, Premise Selection, and Character Selection.
- Story Detail now benefits from persisted `Story.coverUrl` values backfilled from first-premise covers, rather than relying only on API fallback mapping.
- Premise Selection displayed real premise covers and no broken-card/loading-loop state.
- Character Selection displayed real portraits; selecting a character removes the dim state and enables `INICIAR HISTÓRIA`.
- Procedural fallback art remains required for future provider/image failures, but the current beta catalog is visually complete for tester-facing flow.

### Day 3 Functional QA

- Preview flow validated: login, Library, Story Detail, Premise Selection, Character Selection, Reader start, and three consecutive reading choices.
- Reader displayed the active text provider as `GROQ FREE`, kept the session playable, and advanced to scene 3 without a visible generation failure.
- June 3 follow-up QA found generated POV drift in an existing Luna session: the backend session was correctly bound to Luna, but a continuation could narrate as Marco. Backend prompt anchor fixed this; a new continuation stayed centered on Luna while Marco reacted as an NPC.
- June 3 NPC personality follow-up: backend now sends rich premise character traits into first-scene and continuation prompts, so supporting characters should respond according to their generated personality, motivation, relationship, secrets, and conflict potential.
- Profile, narrative preferences, upgrade/credits, scenes feed empty state, and generated-media gallery empty state loaded without broken screens.
- Web preview logout bug fixed: `profile.tsx` bypasses native `Alert.alert` on `Platform.OS === 'web'` and logs out directly; native mobile still uses the confirmation dialog.
- Mobile auth refresh lock + proactive JWT expiry refresh fixed the repeated 401 loop seen on `POST /api/reading/start` and `GET /api/reading/sessions` when access tokens expired while multiple protected queries were active.
- Active session cards on "Minhas Histórias" use `ReadingSessionSummary.storyCoverUrl` only when the backend has an external `http(s)` image. Inline/base64 images are not sent in session summaries; cards fall back locally to keep the screen fast.
- Story Detail and its horizontal character preview also rely on backend-sanitized image DTOs. `/library/stories/:id/characters` now strips inline/base64 character images, so missing `imageUrl` means the app should render initials/fallback art instead of treating it as a broken image.
- The "ABANDONAR" button on "Minhas Histórias" now works in web preview without relying on `Alert.alert`; native mobile keeps the confirmation prompt.
- Performance fix: `/reading/sessions?status=ACTIVE&limit=20` payload dropped from ~7.3 MB to ~3.8 KB after stripping inline image data from summaries. "Lendo -> Continuar -> Reader" preview navigation loaded in ~3s.
- June 4 reader continuation fix: suggested choice now requires selecting a path and tapping `CONTINUAR`; preview QA advanced from scene 0 to scene 1, then free-text action advanced from scene 1 to scene 2.
- June 4 free-text QA: empty send is inert; full typed actions advance scenes, preserve the user action in history, return new choices, and normalize escaped provider newlines before rendering.
- Provider-error QA harness is available through the backend `QA_FORCE_READING_PROVIDER_FAILURE=true` flag. When the reader receives `AI_PROVIDER_UNAVAILABLE`, the mobile app keeps the user in the current session and tells them to retry the same action instead of clearing input or entering an infinite loading state.

---

**Last Updated:** After Step 98l (QA Provider Failure Harness cleanup) — June 4, 2026
