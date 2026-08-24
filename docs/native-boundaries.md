# Roavr — browser/native boundaries (Capacitor)

Capacitor **is installed** (core 8.5.0) and the `ios/` and `android/` projects are
generated and synced. The web/PWA build is unchanged and remains first-class:
every capability below has a browser implementation, and no native plugin is
required for a web route to work.

Single entry point for capabilities: `src/lib/native/`

| File | Role |
| --- | --- |
| `types.ts` | Capability contracts (platform, share, secure store, lifecycle, network, push, billing) |
| `index.ts` | `native` singleton — native impl on device, browser impl on web |
| `device.ts` | Re-exports the pre-existing photo/camera/geolocation seams (no duplicate abstractions) |
| `bootstrap.ts` | One-time status bar + keyboard setup, no-op on web |

Screens must import `native` (or the existing seams) rather than branching on
`Capacitor.isNativePlatform()`.

| Capability | Web implementation | Native status |
| --- | --- | --- |
| Platform info | `native.platform` (`isWeb`) | Live (`@capacitor/core`) |
| Sharing | `navigator.share` → clipboard fallback | Live (`@capacitor/share`) via `native.share()` |
| Secure storage | `localStorage` | Live (`@capacitor/preferences`); Supabase session still uses the generated `previewAuthStorage` |
| App lifecycle | `visibilitychange` | Live (`@capacitor/app` `appStateChange`) via `useAppLifecycle` |
| Deep links | React Router paths | Live listener (`appUrlOpen` → `navigate()`); URL scheme / universal links **not** configured yet |
| Android back button | n/a | Listener available (`native.lifecycle.onBackButton`) |
| Network reconnect | `online`/`offline` | Live (`@capacitor/network`) |
| Status bar / splash | `theme_color`, manifest | Status bar live (`@capacitor/status-bar`); splash assets still missing |
| Keyboard | none | Live (`@capacitor/keyboard`): `--keyboard-height` CSS var, `.keyboard-inset-bottom`, `.hide-on-keyboard` |
| Photo library | `browserFileSource` (`<input type="file">`) | **Not implemented** — `nativePhotoLibrarySource` placeholder is the slot for `@capacitor/camera` `pickImages` |
| Camera capture | `CameraPage` `getUserMedia` + canvas | **Not implemented** — swap to `@capacitor/camera` behind the same post-capture flow |
| Geolocation | `ensureLocationPermission()` in `src/lib/permissions.ts` | **Not implemented** — single call site, swap to `@capacitor/geolocation` |
| Push notifications | in-app `notifications` table only | **Not implemented** — `native.push` interface exists, returns unsupported |
| Billing / subscriptions | `src/services/subscriptions.ts`, entitlement read server-side | **Not implemented** — `native.billing` interface exists, returns unsupported |
| Safe areas | `env(safe-area-inset-*)`, `min-h-dvh` | Works inside the shell (`contentInset: never`, overlaying status bar) |

## App identity

- `appName`: **Roavr**
- `appId`: `app.lovable.p5f9b5ca8aa1d4b7781099bda94ab9271` — **temporary development
  identifier**. Owner decision required for the final iOS Bundle ID / Android
  applicationId. Change it in `capacitor.config.ts` and re-run `npx cap sync`;
  no signing identities or provisioning profiles exist yet, so the swap is free.

## Commands

```bash
npm run cap:sync       # vite build + cap sync (both platforms)
npm run cap:ios        # build, sync, open Xcode  (macOS only)
npm run cap:android    # build, sync, open Android Studio
CAP_SERVER_URL=https://<preview-url> npx cap sync   # optional live reload
```

Leave `CAP_SERVER_URL` unset for release builds so `dist/` is bundled.

## Still needed before packaging

- Compile/run on Xcode simulator and Android Studio emulator (not possible in this environment).
- App icon set from a 1024×1024 source and dark `#080D1A` splash assets.
- Real Privacy Policy and Terms URLs (store review requirement).
- Push provider (APNs/FCM) credentials.
- Custom URL scheme + universal/app links for deep linking.
- Native auth (Sign in with Apple, Google native) — required by Apple if social login ships.

## Device capabilities — implemented (Phase: photos / camera / location)

| Capability | Module | Native (iOS/Android) | Web fallback |
| --- | --- | --- | --- |
| Build My World library scan | `src/lib/native/photos.ts` → `nativePhotoLibrarySource` | `Camera.pickImages` (selected-photos access only) | `<input type=file multiple>` |
| Asset → bytes | `src/lib/native/assets.ts` | `path` (EXIF-preserving) then `webPath`, bounded concurrency | `File` blobs |
| Capture new photo | `src/lib/native/camera.ts` → `takePhoto` | `Camera.getPhoto(source: Camera, saveToGallery: false)` | `<input capture="environment">` |
| Choose existing media | `chooseFromLibrary` | `Camera.getPhoto(source: Photos)` | gallery `<input type=file>` |
| Video capture | `NATIVE_VIDEO_CAPTURE_SUPPORTED = false` | system camera via webview capture input | same |
| Current location | `src/lib/native/location.ts` → `getCurrentLocation` | `Geolocation.getCurrentPosition` (one-shot, when-in-use) | `navigator.geolocation` |

Invariants: no background location, no `watchPosition`, no unrestricted photo-library
request, no upload of scanned photos (Build My World persists visit metadata and
photo counts only), private-by-default visibility, signed private media unchanged.

Permission education copy lives in `src/lib/native/permissionCopy.ts` and is the
single source for the purpose strings mirrored into `Info.plist`.

### Permission entries added
- iOS `Info.plist`: `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`,
  `NSMicrophoneUsageDescription`, `NSLocationWhenInUseUsageDescription`,
  `PHPhotoLibraryPreventAutomaticLimitedAccessAlert=true`.
  `NSPhotoLibraryAddUsageDescription` removed — Roavr never writes to the camera roll.
- Android `AndroidManifest.xml`: `CAMERA`, `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`,
  `READ_EXTERNAL_STORAGE` (maxSdkVersion 32), `ACCESS_COARSE_LOCATION`,
  `ACCESS_FINE_LOCATION`. No `ACCESS_BACKGROUND_LOCATION`.

## Authentication & deep links (native)

| Concern | Implementation | Status |
| --- | --- | --- |
| Email auth | Supabase `signUp` / `signInWithPassword` / `signOut` (`AuthContext`) | Unchanged, works web + native WebView |
| Session restore | Supabase `persistSession` + `autoRefreshToken`; resume re-validates via `getSession()` | Works |
| Apple / Google | `src/lib/auth/oauth.ts` — web: managed broker; native: Supabase OAuth URL in system browser (`@capacitor/browser`) returning to `roavr://auth-callback`, PKCE exchanged with `exchangeCodeForSession` | Code complete, provider credentials pending |
| Deep links | `src/lib/auth/deepLinks.ts` allow-list + `useAppLifecycle` routing; unauthenticated protected links park at `/auth` with the destination preserved (`src/lib/auth/returnTo.ts`) | Custom scheme `roavr://` registered on iOS + Android |
| Universal Links / App Links | iOS Associated Domains entitlement + `apple-app-site-association`; Android `assetlinks.json` + intent-filter (commented out in the manifest) | NOT configured / NOT verified |
| Session storage | Supabase's own storage inside the app-sandboxed WebView. No custom token encryption, no service-role key on device. Only the non-sensitive return path is written to Preferences | Works |

### Owner / console steps still required

**Apple** — Apple Developer account: create the Services ID, enable Sign in with Apple on the App ID matching the final bundle identifier, create the `.p8` key (note Key ID + Team ID), add the Supabase callback URL as a Return URL, then enter Client ID + generated client-secret JWT in Cloud → Users → Auth Settings → Apple (or switch to managed Apple credentials).

**Google** — Google Cloud console: OAuth consent screen, Web client (for the Supabase callback URL), plus iOS and Android OAuth clients bound to the final bundle ID / applicationId and the release SHA-256 signing fingerprint. Enter the web client ID/secret in Cloud auth settings (or use managed Google credentials).

**Both** — the final bundle identifier must replace the temporary `app.lovable.p5f9b5ca8aa1d4b7781099bda94ab9271`, and `roavr://auth-callback` must be added to Supabase's additional redirect URL allow-list.


## Push notifications (native)

| Concern | Implementation | Status |
| --- | --- | --- |
| Permission state | `src/lib/native/push.ts` (`getPushPermission` / `requestPushPermission`) — never prompted on launch, only from Settings → Notifications | Works |
| Device token | `registration` listener upserts into `push_devices` (unique on `token`, so a re-homed device re-points instead of fanning out) | Works |
| Token refresh | Same listener fires on rotation; `usePushNotifications` re-registers on sign-in | Works |
| Logout cleanup | `clearDeviceTokens()` runs in `AuthContext.signOut` and on `SIGNED_OUT` | Works |
| Foreground | In-app Sonner toast with a "View" action; query cache invalidated. No duplicate OS banner handling | Works |
| Open routing | `src/lib/notifications/routing.ts` allow-list → `navigate()`; unknown payloads fall back to `/notifications` | Works, unit tested |
| Preferences | `notification_preferences` table + `/settings/notifications`. Travel alerts and nearby offers default OFF | Works |
| Send path | `supabase/functions/send-push` only. Writes the in-app row, checks blocks in both directions, checks preferences, then delivers via FCM v1 | Code complete, credentials pending |
| Delivery credentials | `FCM_SERVICE_ACCOUNT_JSON` secret; APNs auth key uploaded to that Firebase project; `google-services.json` (Android) and `GoogleService-Info.plist` + Push Notifications capability / `aps-environment` entitlement (iOS) | NOT configured |

Roavr never sends a notification because infrastructure exists: `send-push` is
called from real user actions only, there is no scheduler, and location-based
marketing (`nearby_offers`) is opt-in.

### Permission entries added for push
- Android `AndroidManifest.xml`: `POST_NOTIFICATIONS`.
- iOS: enable the **Push Notifications** capability in Xcode (adds the
  `aps-environment` entitlement) — cannot be added from this repo.
