# Roavr — browser/native boundaries (Capacitor prep)

Capacitor is intentionally **not installed**. This document lists every place the
web app touches a device capability, and the seam a native implementation should
replace. Screens must not be rewritten when native lands — only the adapter.

| Capability | Current browser implementation | Seam to swap | Native plugin later |
| --- | --- | --- | --- |
| Photo library | `browserFileSource` in `src/lib/buildworld/mediaSource.ts` (`<input type="file">`) | `MediaSource` interface; `nativePhotoLibrarySource` placeholder already exists and is the intended native slot | `@capacitor/camera` (`pickImages`) |
| Camera capture | `src/pages/CameraPage.tsx` — `getUserMedia` + canvas capture | Extract capture into a `CaptureSource` adapter mirroring `MediaSource`; the post-capture edit/post flow is already source-agnostic | `@capacitor/camera` |
| Geolocation | `src/lib/permissions.ts` + `src/lib/marketplace/location.ts` (`navigator.geolocation`, session-only, explicit gesture) | `requestLocation()` in `permissions.ts` is the single call site | `@capacitor/geolocation` |
| Push notifications | None. In-app notifications only (`notifications` table, `/notifications`) | Needs a `PushRegistry` adapter that stores a device token per profile | `@capacitor/push-notifications` |
| Deep linking | React Router web paths (`/u/:handle`, `/trips/:id`, `/i/:token`) | Route table in `src/App.tsx` is already path-based; add a URL-open listener that pushes into the router | `@capacitor/app` (`appUrlOpen`) |
| App lifecycle | Browser visibility only | Data refresh points: Home feed, Stories row, Inbox | `@capacitor/app` state change |
| Sharing | `navigator.share`/clipboard fallbacks (share itinerary, referral) | Centralise into a `share()` helper before native | `@capacitor/share` |
| Secure storage | Supabase session in `localStorage` (`src/integrations/supabase/previewAuthStorage.ts`, generated) | Supabase client `auth.storage` option | `@capacitor/preferences` + Keychain |
| Subscriptions | `src/services/subscriptions.ts` — no payment provider connected | Entitlement read is already server-side | StoreKit / Play Billing |
| Keyboard & safe areas | CSS `env(safe-area-inset-*)` (`.safe-area-bottom`, `.safe-area-top`), `min-h-dvh` everywhere | Global CSS only | `@capacitor/keyboard` |
| Status bar / splash | Web `theme_color` in `public/manifest.webmanifest` | Manifest + `index.html` meta | `@capacitor/status-bar`, `@capacitor/splash-screen` |

## Still needed before packaging

- App icon set at 1024×1024 source (today: `public/favicon.png`, `public/apple-touch-icon.png`).
- Splash assets (portrait, dark `#080D1A`).
- A real Privacy Policy and Terms URL (store review requirement).
- Push provider (APNs/FCM) credentials.
- Purpose strings for camera, photo library and location (iOS `Info.plist`).
