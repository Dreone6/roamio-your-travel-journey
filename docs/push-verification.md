# Roavr — Push Notification Verification Harness

Scope: verify the production push stack on real iOS/Android without redesigning
notifications. The harness is **admin-only**: the `push-diagnostics` edge
function verifies `has_role('admin')` server-side on every call; the in-app
check only decides whether the screen renders. No secret is ever returned —
the panel shows credential presence booleans, a Firebase project id and token
fingerprints (last 6 characters) only.

## Where it lives

- **Panel:** Admin Panel → "Push status" (`/admin/push`)
- **Backend:** `push-diagnostics` (`status` and `test` actions), real sends go
  through the existing `send-push` function unchanged — so a rejection from the
  harness (blocked, private, muted) is proof the gates work, not a bug.

## Panel rows

| Row | Source of truth |
| --- | --- |
| Firebase / FCM | `FCM_SERVICE_ACCOUNT_JSON` presence + validity (project id shown, never the key) |
| APNs (iOS) | Delivered via Firebase; the APNs auth key lives in the Firebase console and **cannot** be probed from the app — reported as unverified with registered iOS device count |
| Backend send path | `send-push` reachable; reports `not_configured` until credentials exist |
| Device tokens | per-device platform, provider, app version, enabled flag, **last refreshed** timestamp, token fingerprint |
| Missing configuration | explicit list (e.g. `FCM_SERVICE_ACCOUNT_JSON`) |

## Send Test Push

Target user id + category + optional note. Sends through the production path
with the admin's own session as the actor and a safe payload that routes to
`/notifications` and references no real entity. Not reachable by ordinary
users (403 server-side).

## What changed in send-push

Delivery gates were extracted into `supabase/functions/send-push/gates.ts`
(pure, Deno-tested) and the handler now also enforces the **private-account
gate**: relationship-scoped types (story replies, reactions, view milestones)
are rejected when the recipient is private and the actor has no accepted
follow in either direction. Payloads are validated (required fields, known
type, length caps, string-only data) before anything is written.

## Scenario coverage

### Automated (CI, all passing — 89 app tests + 6 Deno gate tests)

| Scenario | Coverage |
| --- | --- |
| Notification opened from cold start | `delivery.test.ts` — replaces the launch route (`replace: true`) |
| Notification opened from background | `delivery.test.ts` — pushes onto the stack so Back works |
| Foreground notification | `delivery.test.ts` — toast with View action, never steals the screen |
| Unknown / invalid payload → `/notifications` | `delivery.test.ts` (8 hostile payload shapes) + `routing.test.ts` |
| Blocked-user notification rejection | `send-push/gates.ts` + `is_blocked_between` RPC gate in the handler; unit-tested decision rules |
| Private relationship notification rejection | `gates_test.ts` — private recipient + no accepted follow ⇒ `skipped: private_relationship`; service-role caller cannot bypass |
| Logged-out / device-token cleanup | `pushTokens.test.ts` — sign-out deletes the user's tokens; nothing stored while signed out; dead tokens (404/403) retired by `isDeadToken` |
| Preference muting (incl. commercial categories default-off) | `gates_test.ts` — `pushDecision` |
| Payload validation (unknown type, over-length, non-string data) | `gates_test.ts` — `validatePayload` |

No privacy rule or RLS policy was weakened to make any of these pass; the
gates run with the service role and are additive to RLS.

### Requires a real device (cannot be faked in CI)

| Scenario | Why |
| --- | --- |
| OS permission prompt copy & outcome | OS-owned UI |
| Token registration on install (APNs/FCM round trip) | Requires physical device push entitlement |
| Cold-start tap into the running app (end to end) | The OS launch path — JS side is automated, the OS side is not |
| Background tap with app suspended | OS suspension semantics |
| APNs auth key validity | Firebase console only; confirmed by an iOS device actually receiving a push |
| Badge / sound / alert presentation | OS rendering |

### Owner actions still required

1. Add the Firebase service-account JSON (FCM enabled) as the
   `FCM_SERVICE_ACCOUNT_JSON` secret — the panel flips to "delivery configured".
2. Upload the APNs auth key to the same Firebase project.
3. Install a signed build on a real iOS + Android device, enable notifications
   from Settings → Notifications, then verify a token row appears in the panel.
4. Fire a test push at your own account with each category; confirm one
   rejection case (e.g. mute a category) to prove the gates.
