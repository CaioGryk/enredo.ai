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

**Rules:**
- Free text input always visible
- AI suggestions are auxiliary
- Open conversation with AI is the main interaction
- Avoid communicating the experience as "path choosing"

### Error Handling

**Backend Error Integration:**
- `reading-error-helper.ts` maps backend error codes to user-friendly alerts
- Covers all error codes: `READING_SESSION_NOT_FOUND`, `PREMIUM_REQUIRED`, `DAILY_LIMIT_REACHED`, `INSUFFICIENT_CREDITS`, `MODEL_ACCESS_DENIED`, `AI_PROVIDER_UNAVAILABLE`, `READING_GENERATION_FAILED`, `INVALID_READING_ACTION`
- Fallback to HTTP 402 check for backward compatibility

### Model Selection UX

**Tabs:**
- **Standard:** Free/Premium models based on subscription
- **Premium:** Shows model display name (e.g., "GPT-4.1 Nano")
- **Cine:** Credits-tier models with cost display ("Cine • X créditos")

**Features:**
- Locked tabs are tappable (show upgrade prompt)
- Tabs disabled during generation
- Cost shown before generation
- Mode: 'cinematic' sent when `creditCost > 0`

---

## Screen-Specific Details

### Reader (`[id].tsx`)

**Features:**
- Session loading with error states
- Retry support on load errors
- Disabled send button during generation
- Disabled choice buttons during generation
- Model tabs disabled during generation
- Controls remain visible during generation
- Input preserved while generating (cleared only on success)
- Reads: `session.currentScene`, `session.history`, `usage`

**Error States:**
- `READING_SESSION_NOT_FOUND` → Routes to library
- Other errors → Show retry + back-to-library buttons

### Active Sessions (`active.tsx`)

**Features:**
- Lists ACTIVE, COMPLETED, ABANDONED sessions
- Error state with retry button
- ChronicleCard shows real `selectedPremiseTitle` and `selectedCharacterName`
- Status filter: COMPLETED (not FINISHED)

### Story Detail

**Flow:**
1. Display story info
2. CTA to choose premise
3. Pass premise to character selection
4. Pass both to reader start

### Character Selection

**Error Handling:**
- `startReading` errors use `handleReadingError` helper
- Shows appropriate alerts for each error code

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
2. **Feed Cenas is placeholder visual** - Uses structure with images/frames; real video integration is future work
3. **Scene media integration** - ✅ Step 43: image generation wired, video placeholder (unavailable)

## Scene Media Integration (Step 43)

### Image Generation
- **Entry point:** "Gerar imagem" button in reader interaction section
- **Cost:** 1 crédito (shown on button badge)
- **Flow:** Confirm dialog → create SceneMedia → generate image → show result
- **Error handling:** `INSUFFICIENT_CREDITS` routes to upgrade; disabled generation shows message
- **Duplicate protection:** Button disabled while creation/generation is in flight

### Video Generation
- **Status:** Unavailable ("Em breve")
- **Cost:** 5 créditos (shown on button badge)
- **UX:** Disabled button (not interactive); no endpoint calls wired
- **Reason:** Backend video provider is stubbed (not yet implemented)

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
- **Video:** Noted in header but not rendered in grid ("Em breve")

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
- **Duplicate guard:** All action buttons disabled during mutation via `mutatingIds`

---

**Last Updated:** After Step 55
