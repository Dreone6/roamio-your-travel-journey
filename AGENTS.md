# Architecture rules

- Keep SafePass and SOS out of application routes, navigation, and emergency simulations; those features have been retired.
- Never claim end-to-end, "military-grade", or zero-knowledge encryption in any UI copy or marketing screen; describe chats as "Private Chat" and state real protection ("encrypted in transit and at rest") instead.
- The pricing UI must never start a premium purchase. Premium tier CTAs stay disabled and labelled "Coming Soon" until store checkout and server-side receipt verification are live; keep the gate in `src/lib/billing/checkout.ts` and leave the free-tier CTA functional.
- Notifications are written only by server code (definer triggers on follows/trip_members/story_reactions via the non-executable `_notify_internal`, or service-role edge functions); clients may only SELECT their own rows and UPDATE the `read` column, because client inserts allowed spoofed alerts.
- Non-owner reads of stories, memories and private media go through `can_view_owned_content` (viewer bound to `auth.uid()`; blocks, profile privacy and per-row visibility all enforced) so every surface applies one privacy rule.
- Check-ins are saved only through the atomic, idempotent `record_check_in` RPC (visit + check-in + memory in one transaction), so partial writes and duplicate retries can't corrupt visits.
- `places_visited.scanned_photo_count` (metadata-only import) and linked `memories` rows (real saved media/notes) are separate counts; never add one into the other. `photos_count` is deprecated.
- `places_visited.canonical_place_id` links stay empty until a provider returns a stable city-level id; never guess or fabricate provider ids.
- `user-media:` tokens on memories/stories/check_ins must sit in the row owner's own folder (trigger-enforced), and `can_view_user_media` also requires the storage uploader to match the row owner, so a foreign row can never grant access to someone else's private file. Legacy http URLs are public links with no private guarantee.
