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
