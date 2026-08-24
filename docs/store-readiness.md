# Roavr — App Store / Play Store Readiness

Status of the native release, honestly recorded. "Not ready" means a human with
account access must act; no code change unblocks it.

---

## 1. Subscription UI audit (what existed before this pass)

| Finding | Severity | Resolution |
| --- | --- | --- |
| Tier was written client-side into `subscriptions` — any user could grant themselves Pro | Critical | Client `INSERT`/`UPDATE` revoked. Tier now derives from `public.current_entitlement()` |
| No purchase flow at all; "Upgrade" only mutated a row | Critical | Replaced with the store adapter purchase → server verification path |
| No Restore Purchases control | Blocker (Apple 3.1.1) | Added on the subscription screen |
| No auto-renew / cancellation disclosure, no Terms link | Blocker (Apple 3.1.2) | Added under the trust badges |
| Prices hardcoded in USD in `src/services/subscriptions.ts` | Blocker | Displayed price now comes from the store when it answers; hardcoded values are the web fallback only |
| Trial claimed "7-day free trial" for all plans | Policy risk | Copy now reflects the actual `grant_reverse_trial` behaviour |

Feature copy itself was left alone — no premium features were invented.

---

## 2. Entitlements

Single source of truth: the `current_entitlement()` security-definer function.

```
store receipt ──> verify-purchase (edge) ──> subscriptions row
                                                   │
client ── rpc current_entitlement() ───────────────┘ ──> useSubscription()
```

- Expiry, revocation and trial windows are applied **server-side**; the client
  cannot extend or forge an entitlement.
- `useSubscription()` no longer reads the raw table.
- Offline/unknown resolves to **free**, never to a paid tier.

---

## 3. Native billing

| Piece | State |
| --- | --- |
| `src/lib/billing/store.ts` adapter (purchase, restore, listProducts) | Implemented |
| `verify-purchase` edge function (Apple verifyReceipt + Google Play Developer API) | Implemented |
| Purchase → verify → refresh entitlement flow | Implemented |
| Restore purchases | Implemented |
| StoreKit / Play Billing plugin | **Not installed** — see below |

The adapter calls through a plugin interface. Until a native IAP plugin is
installed and products exist, `listProducts()` returns `[]` and `purchase()`
returns an honest `unavailable` message rather than a fake success. Nothing in
the app pretends a purchase happened.

**Credentials / account work required (cannot be done from code):**

1. App Store Connect: create the app record, then auto-renewable subscriptions
   with product IDs matching `PRODUCT_IDS` in `src/lib/billing/types.ts`.
2. Google Play Console: same product IDs as subscriptions with base plans.
3. Secrets for `verify-purchase`: `APPLE_SHARED_SECRET`,
   `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`, `GOOGLE_PLAY_PACKAGE_NAME`.
4. Install the chosen IAP plugin and run `npx cap sync`.
5. Server-to-server notifications (App Store Server Notifications V2 / Play RTDN)
   pointed at `verify-purchase` so cancellations and refunds revoke access.

---

## 4. Permissions and privacy

All strings are purpose-specific and match real in-app behaviour.

| Permission | Trigger | Declared |
| --- | --- | --- |
| Camera | User taps Capture | `NSCameraUsageDescription`, `android.permission.CAMERA` |
| Microphone | Video clip capture | `NSMicrophoneUsageDescription`, `RECORD_AUDIO` |
| Photo library | Build My World, Capture → library | `NSPhotoLibraryUsageDescription` (+ limited-access alert suppressed), `READ_MEDIA_IMAGES/VIDEO` |
| Location (when in use) | Explicit tap only — Nearby, check-in | `NSLocationWhenInUseUsageDescription`, `ACCESS_COARSE/FINE_LOCATION` |
| Notifications | User opts in from settings | Runtime request, `POST_NOTIFICATIONS` |

No background location, no always-on tracking, no IDFA/ATT usage.

**Data safety / privacy nutrition label — declare:** account info (email, name,
handle), user content (photos, videos, stories, messages), coarse+precise
location tied to content the user chooses to post, device identifier (push
token), and purchase history. Nothing is sold; no third-party ad SDK is present.

---

## 5. UGC and social safety (Apple 1.2 / Play UGC policy)

| Requirement | State |
| --- | --- |
| Block a user | Implemented — block-aware RLS hides content both directions |
| Report a user | Implemented — `ReportDialog` on traveler profiles |
| Report content (stories, messages) | Dialog is generic over the `reports.reported_type` values; wired for users and conversations |
| Reports reach a reviewable queue | `public.reports`, admin-only read |
| Filter/moderate objectionable content | **Manual review only** — no automated classifier |
| Published terms of service | **Not ready** — `roavr.app/terms` must exist before submission |

Apple expects a stated 24-hour response commitment for reports; the in-app copy
now says this, so a human process must back it.

---

## 6. Account deletion (Apple 5.1.1(v))

- In-app path: Settings → Delete account, with a typed confirmation.
- `delete-account` edge function removes storage objects, every user-owned row,
  and the auth user itself. Only an anonymous `account_deletions` audit row
  (user id + timestamps) survives.
- Partial failure reports an error and does not sign the user out silently.
- Copy tells the user to cancel an active store subscription separately, which
  is the correct instruction — deleting an account does not cancel billing.

---

## 7. Store assets checklist

Everything here needs a human with a developer account.

- [ ] Final bundle ID / applicationId — still the Lovable dev id
      `app.lovable.p5f9b5ca8aa1d4b7781099bda94ab9271`
- [ ] Signing: Apple team + provisioning profiles; Android upload keystore
- [ ] Version: iOS `MARKETING_VERSION` and Android `versionName` are both `1.0`
      / build `1`; `package.json` is still `0.0.0`
- [x] App icon (1024 iOS, adaptive Android) and splash — generated from the pin
- [ ] Screenshots: 6.7" and 6.5" iPhone, 12.9" iPad if iPad is supported;
      Android phone + 7"/10" tablet
- [ ] Store listing copy, keywords, category (Travel), age rating
      (expect 12+/Teen from UGC and social features)
- [ ] Privacy policy URL (live) and Terms of Use URL (live)
- [ ] App Privacy answers per section 4
- [ ] Demo account for review, plus a note that Nearby shows `SAMPLE` offers
      where no real partner exists

---

## 8. Technical audit

| Check | Result |
| --- | --- |
| TypeScript | Clean |
| Unit tests | 58 passing across 9 files |
| Route code splitting | Enabled |
| Safe areas / `min-h-dvh` | Applied |
| `console.log` in shipped source | None |
| Private media | Signed URLs from the private `user-media` bucket |
| RLS | Enabled with policies + grants on every public table |
| Deep links | Allow-listed; `roavr://` scheme registered on both platforms |
| Offline behaviour | Network state observed; no crash path |
| Native projects | `ios/` and `android/` generated; `npx cap sync` required after pull |

---

## Final readiness matrix

| Area | Ready? | What remains |
| --- | --- | --- |
| App builds and runs natively | Yes | `npx cap sync` after pull |
| Entitlements secured server-side | Yes | — |
| Subscription UI compliance | Yes | Terms URL must go live |
| Native purchase flow | No | IAP plugin, store products, verification secrets |
| Restore purchases | Yes (code) | Untestable until products exist |
| Permissions and purpose strings | Yes | — |
| Privacy label answers | Yes (documented) | Submit in the consoles |
| Block / report | Yes | Staff the review queue |
| Content moderation | Partial | Manual only |
| Account deletion | Yes | — |
| Icons and splash | Yes | — |
| Screenshots and listing | No | Human authoring |
| Bundle ID, signing, versioning | No | Owner decision + accounts |
| Legal pages live | No | Privacy + Terms hosting |

**Verdict:** the application layer is submission-ready. The blockers left are
all account-level: store products and IAP plugin, signing identity and final
bundle ID, listing assets, and live legal pages.
