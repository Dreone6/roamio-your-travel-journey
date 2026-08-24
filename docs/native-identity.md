# Roavr — Native Identity & Deep Links

Scope: Sign in with Apple, Google OAuth on iOS/Android, account linking,
`roavr://auth-callback`, Universal Links, Android App Links, and deep-link
routing. Supabase Auth remains the only session authority — no custom token
infrastructure was added, and no secret is bundled in the app.

---

## 1. Code complete (shipped, verifiable in this repo)

| Area | Implementation |
| --- | --- |
| Public identity config | `src/lib/auth/identityConfig.ts` — reads only public identifiers (Apple Services ID / Team ID, per-platform Google client IDs, universal-link hosts) from build-time env vars. Unset = "not configured". |
| Status model | `src/lib/auth/identityStatus.ts` — three honest states: `ready` (configured **and** confirmed by the auth backend), `unverified` (configured but externally unproven), `missing` (credentials absent). Providers are confirmed by probing the public `/auth/v1/settings` document. |
| Diagnostics UI | `src/pages/IdentityDiagnosticsPage.tsx` at `/settings/identity`, linked from Settings → Preferences → "Sign-in & Links". Shows every check with its state and the responsible owner. |
| Apple / Google native sign-in | `src/lib/auth/oauth.ts` — system browser (SFSafariViewController / Chrome Custom Tab, as Apple and Google require), PKCE code exchanged via `supabase.auth.exchangeCodeForSession`. `nativeOAuthQueryParams()` passes the Apple Services ID and the platform-specific Google client ID when configured. |
| Account linking | `src/lib/auth/linking.ts` — `linkIdentity` / `unlinkIdentity` / `getUserIdentities`. Refuses to unlink the last remaining sign-in method. No client-side account merging. |
| Custom scheme | `roavr://` registered in `ios/App/App/Info.plist` (`CFBundleURLTypes`) and `android/app/src/main/AndroidManifest.xml`. |
| Deep-link parsing | `src/lib/auth/deepLinks.ts` — path allow-list; https links are rejected unless the host is a declared universal-link host (permissive only while no host list exists); non-https, non-scheme URLs rejected. |
| Deep-link routing | `src/lib/auth/deepLinkRouting.ts` — pure resolver returning `navigate` / `authenticate` / `oauth` / `ignore`. Consumed by `src/hooks/useAppLifecycle.ts`. |
| Return-path safety | `src/lib/auth/returnTo.ts` — sanitized same-origin paths only; survives cold start via Capacitor Preferences. |
| Tests | `src/lib/auth/deepLinkRouting.test.ts` (authenticated + unauthenticated `/u/:handle`, `/trips/:id`, `/i/:token`, auth callbacks, notification destinations, hostile input) and `src/lib/auth/deepLinks.test.ts`. |

Authorization is unchanged: routing never grants access. Every protected
destination is an authenticated route and RLS governs what it can read.

### Verified deep-link matrix

| Link | Signed in | Signed out |
| --- | --- | --- |
| `roavr://u/andre` | opens `/u/andre` | `/auth`, returns to `/u/andre` |
| `roavr://trips/42?tab=plan` | opens `/trips/42?tab=plan` | `/auth`, returns with query intact |
| `https://<host>/i/<token>` | opens `/i/<token>` | opens `/i/<token>` (public) |
| `roavr://auth-callback?code=…` | code exchanged, then stored return path | same |
| notification `/messages/:id`, `/notifications`, `/nearby` | opens directly | `/auth`, destination preserved |
| `roavr://admin`, `http://…`, `javascript:…` | ignored | ignored |

---

## 2. External configuration required (owner, not code)

Marked in the app as `missing` or `unverified` — nothing is presented as live.

### Apple Developer
1. Create/confirm the App ID with **Sign in with Apple** and **Associated Domains** enabled.
2. Create a **Services ID** and enable Sign in with Apple on it.
3. Add the domain and the backend callback URL (`https://<project-ref>.supabase.co/auth/v1/callback`) to the Services ID configuration.
4. Create a **Sign in with Apple key (.p8)**, note the Key ID and Team ID. Download once; never commit it.
5. Generate the client-secret JWT (max 6 months) and store it in the backend auth settings. Set a renewal reminder.
6. In Xcode → Signing & Capabilities: add **Sign in with Apple** and **Associated Domains** (`applinks:<domain>`), using `ios/App/App/App.entitlements.template` as the reference.

### Google Cloud
1. Configure the OAuth consent screen with scopes `openid`, `userinfo.email`, `userinfo.profile`, and add the production domain as an authorized domain.
2. Create a **Web** OAuth client; its ID/secret go into the backend Google provider. Add the backend callback URL as an authorized redirect URI.
3. Create an **iOS** OAuth client with the final bundle ID → `VITE_GOOGLE_IOS_CLIENT_ID`.
4. Create an **Android** OAuth client with the applicationId and the **release** SHA-1 fingerprint → `VITE_GOOGLE_ANDROID_CLIENT_ID`.

### Backend auth settings (Lovable Cloud)
1. Enable the Apple and Google providers (the diagnostics screen reads this).
2. Add `roavr://auth-callback` to the allowed redirect URLs, plus `https://<production-domain>/**`.
3. Set the Site URL to the production domain once it exists.

### Production domain
1. Decide the final bundle ID / applicationId and set it in `capacitor.config.ts` and `VITE_NATIVE_APP_ID`.
2. Publish `/.well-known/apple-app-site-association` (no extension, `application/json`, https, no redirects) from `public/.well-known/apple-app-site-association.template.json`.
3. Publish `/.well-known/assetlinks.json` from `public/.well-known/assetlinks.template.json` with the release SHA-256 fingerprint.
4. Uncomment the `autoVerify` intent-filter in `android/app/src/main/AndroidManifest.xml` and set the host.
5. Set `VITE_UNIVERSAL_LINK_HOSTS`, and `VITE_ASSOCIATED_DOMAINS_VERIFIED=true` only after step 6 below passes.

---

## 3. Real-device verification required

Cannot be proven from code or CI; run on physical iOS and Android builds:

1. Apple sign-in end to end, including the private-relay email case.
2. Google sign-in end to end on both platforms with the release-signed Android build.
3. Link and unlink Apple/Google from `/settings/identity`; confirm the last-method guard.
4. `roavr://auth-callback` return from a cold start (app not running).
5. `https://<domain>/u/<handle>` and `/trips/<id>` opening the app directly rather than Safari/Chrome.
6. `https://<domain>/i/<token>` opening for a signed-out user.
7. Notification tap → correct destination, signed in and signed out.
8. Android verification check: `adb shell pm get-app-links <applicationId>` should report `verified`.
