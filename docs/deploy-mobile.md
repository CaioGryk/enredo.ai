# Mobile Staging Build Guide — Enredo.ai

**Purpose:** Prepare the Expo mobile app for staging builds without publishing to stores.

---

## 1. Environment Variable

The mobile app uses one key environment variable:

```bash
EXPO_PUBLIC_API_URL=<staging-api-url>
```

This is read by `apps/mobile/src/api/client.ts` at build time.

**Example (do not use this exact value until staging backend is deployed):**

```bash
EXPO_PUBLIC_API_URL=https://api-staging.enredo.ai/api
```

**⚠️ Important:** If `EXPO_PUBLIC_API_URL` is not set at build time, the app falls back to localhost (`http://localhost:3001/api`). For real device staging testing, you MUST provide a valid staging API URL via EAS environment variables or your local shell env.

**Local defaults (no env var set):**
- Android emulator: `http://10.0.2.2:3001/api`
- Web / iOS simulator / physical device via localhost: `http://localhost:3001/api`

---

## 2. EAS Build Profiles

| Profile | Purpose | API Target |
|---------|---------|------------|
| `development` | Local dev build | `http://10.0.2.2:3001/api` (hardcoded in profile) |
| `preview` | Internal testing | Requires `EXPO_PUBLIC_API_URL` at build time |
| `staging` | Staging channel | Requires `EXPO_PUBLIC_API_URL` at build time |
| `production` | Production (future) | Requires `EXPO_PUBLIC_API_URL` at build time |

**How to set the API URL for staging/preview builds:**

```bash
# Option 1: Local shell environment
EXPO_PUBLIC_API_URL=https://api-staging.enredo.ai/api npx eas build --platform android --profile staging

# Option 2: EAS environment secret (set once, used for all builds)
# Use EAS dashboard or: eas secret:create EXPO_PUBLIC_API_URL <value>
```

---

## 3. Build Commands

**⚠️ No store publish involved. All builds are internal.**

```bash
cd apps/mobile

# Staging Android build (APK)
npx eas build --platform android --profile staging

# Staging iOS build (simulator)
npx eas build --platform ios --profile staging

# Preview/Internal build
npx eas build --platform android --profile preview
```

---

## 4. Web Export (for preview/testing)

```bash
cd apps/mobile

# Validate TypeScript first
npx tsc --noEmit

# Export web preview
npx expo export --platform web --output-dir dist-preview
npx serve -s dist-preview -l 8099
```

---

## 5. Pre-Build Validation

```bash
cd apps/mobile
npx tsc --noEmit
```

All builds should pass TypeScript before being built.

---

## 6. Post-Build Smoke Checklist

- [ ] App launches and shows onboarding or library
- [ ] Login/register works against staging API
- [ ] Library loads stories from staging
- [ ] Reading flow works (start story → read scene → send action)
- [ ] Scenes feed loads approved media
- [ ] Like/save/share/comment actions work
- [ ] Saved scenes screen loads
- [ ] Profile shows correct plan/credits
- [ ] Upgrade/credits screen loads
- [ ] No crashes on error states
- [ ] API URL matches staging (verify in network tab)

---

## 7. Forbidden Actions

**NEVER do these without explicit Codex approval:**

- `eas submit` (submit to App Store / Play Store)
- `eas build --profile production` with auto-increment
- Publishing to EAS Update channels without review

---

**Last Updated:** After Step 72
