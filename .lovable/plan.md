# Build Plan — Home Stories, Camera Filters, SafePass, Nearby

Four coordinated changes wired to Cloud where the tables already exist.

## 1. 24h Stories row on Home

**Location:** Top of `src/pages/HomePage.tsx`, immediately under the greeting/header, above existing modules.

**Component:** new `src/components/home/StoriesRow.tsx`
- Horizontal scroller, 72px circular avatars with gradient ring (blue → coral) for unseen, muted ring for seen.
- First tile = **Your Story** with `+` overlay → routes to `/camera`. If user has an active story, shows their thumbnail with the gradient ring; tap opens viewer.
- Followers' tiles next, ordered by `created_at desc`.
- Click → fullscreen viewer (`StoryViewer` modal) with tap-right/left navigation, 5s autoplay per slide, progress bars at top, location chip, "View pin on Globe" CTA.

**Data:** Query `public.stories` filtered to `expires_at > now()` and (own story OR `user_id IN (followed users)`). Group by user for the row. Join `profiles` for name/avatar.

**24h → permanent pin (existing spec):** Already handled by `convert-stories-to-memories` edge function. On story view exit, if `expires_at` has passed since open, refresh the row.

## 2. Camera geo-filters (Snapchat-style)

**Files:**
- `src/pages/CameraPage.tsx` — wire filter carousel below viewport
- new `src/components/camera/GeoFilterCarousel.tsx`
- new `src/lib/geoFilters.ts` — curated pack + AI fallback resolver
- new edge function `supabase/functions/generate-geo-filter/index.ts` — Lovable AI image gen, returns transparent PNG URL

**Curated pack (15 cities/landmarks):** Rome (Colosseum stamp), Paris (Eiffel silhouette), NYC (skyline), Bali (palm/sun), Positano (cliff houses), Tokyo (torii), London (Big Ben), Barcelona, Reykjavik, Cape Town, Marrakech, Bangkok, Rio, Sydney, Santorini. Each is an SVG/PNG overlay in `src/assets/geofilters/`.

**Flow on camera open:**
1. Request location (`ensureLocationPermission`).
2. Reverse-geocode via existing `reverse-geocode` edge function → city/country.
3. `resolveGeoFilters(lat,lng,city)`:
   - Match curated by city name → return up to 5 curated frames.
   - If `<3` matches, call `generate-geo-filter` for an AI-themed frame (cached by city key in localStorage 24h).
4. Render carousel: swipe to apply overlay on captured photo (composited on confirm screen — keep live viewport clean per Roavr spec).

## 3. Move SafePass off feed/trip screens

**Remove `SafePassCard` from:**
- `HomePage.tsx`
- any active-trip detail (audit `TripsPage.tsx` + `PlanPage.tsx`)

**Add to `ProfilePage.tsx`:** "Travel Safety" section above settings list, using the existing `<SafePassCard variant="compact" />`. Tap → `/safety`.

## 4. Nearby section (stays / activities / local specials)

**Compact strip on Home** — new `src/components/home/NearbyStrip.tsx`
- Horizontal scroller, 3 chip-filters (All / Stays / Eat & Drink / Activities).
- Cards 220×140: image, name, distance, deal badge.
- 6 items max, "See all" → `/trips` with `?nearby=1`.

**Full section in Trips** — new `src/components/trips/NearbySection.tsx`, embedded in `TripsPage.tsx` under active trip.
- Tabbed (Stays / Activities / Local specials), distance slider 1-25 mi, sorted by distance.

**Data:** Use existing `public.partner_offers` table + `public.nearby_offers(lat,lng,radius_miles)` RPC (already in DB). Falls back to seeded mock rows if RPC returns empty. Category split derived from `partner_offers.category`.

**Seed:** insert ~20 demo partner_offers across stay/food/experience around Positano (matches canonical "latest pin Positano 2h ago") so the strip is populated for the demo user.

## Technical notes

- All new components follow brand tokens (Sora/DM Sans, `#3B82F6` accent, no glassmorphism outside camera).
- Stories ring uses linear-gradient(135deg, #3B82F6, #F4A261) only when unseen.
- AI geo-filter edge function uses Lovable AI Gateway (`google/gemini-3-flash-image-preview`) — no extra secret.
- All edge functions include CORS; story viewer/nearby strip use Realtime subscription on `stories` and `partner_offers` so the home feed updates live.
- No schema changes required — leveraging existing `stories`, `profiles`, `follows`, `partner_offers`, `nearby_offers()`.

## Files added/edited

Added:
- `src/components/home/StoriesRow.tsx`, `StoryViewer.tsx`
- `src/components/home/NearbyStrip.tsx`
- `src/components/trips/NearbySection.tsx`
- `src/components/camera/GeoFilterCarousel.tsx`
- `src/lib/geoFilters.ts`
- `src/assets/geofilters/*.svg` (15 frames)
- `supabase/functions/generate-geo-filter/index.ts`

Edited:
- `src/pages/HomePage.tsx` (add Stories + Nearby, remove SafePass)
- `src/pages/CameraPage.tsx` (filter carousel + apply on confirm)
- `src/pages/ProfilePage.tsx` (add SafePass)
- `src/pages/TripsPage.tsx` (NearbySection)
