# Roavr Travel Command Center

Add 8 feature modules into the existing Roavr app without touching the current navigation, design system, or core flows. All new screens follow the established Playfair/Plus Jakarta typography, Deep Royal Blue accents, dark-immersive cards, and Milo branding.

## Scope summary

| Module | Entry point | New screens / components |
|---|---|---|
| 1. Smart Booking Import | Trips page → "Import booking" | `BookingImportSheet`, `BookingsList`, `ManualBookingForm` |
| 2. Shareable Itinerary | Trip detail → Share button | `ShareItinerarySheet`, public `/i/:token` view |
| 3. Travel Stats & Globe Tracking | Globe + Profile | `TravelStatsDashboard` (extends `GlobeStatsBar`) |
| 4. Anywhere / Surprise Me | Trips → "Surprise Me" CTA (already exists) | `SurpriseMePage` (multi-step wizard + AI suggestions) |
| 5. Get Around Planner | Itinerary item → "How do I get there?" | `GetAroundSheet` |
| 6. Offline Trip Mode | Trip detail → "Save offline" (Pro) | `OfflineTripToggle`, IndexedDB cache |
| 7. Activities & Experiences | Discover page tabs | `ExperienceCard`, expanded categories |
| 8. SafePass Enhancements | SafePass page | `TrustedContactsList`, `LiveLocationToggle` |

## Database (one migration)

```sql
-- Bookings imported into trips
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  trip_id uuid,
  type text not null check (type in ('flight','hotel','car','tour','restaurant','transfer','train','bus','event')),
  provider text,
  confirmation_code text,
  title text not null,
  start_at timestamptz,
  end_at timestamptz,
  location text,
  details jsonb default '{}'::jsonb,
  source text not null default 'manual', -- manual | email | forward
  created_at timestamptz default now()
);

-- Public share tokens for itineraries
create table public.trip_shares (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null,
  user_id uuid not null,
  token text unique not null default encode(gen_random_bytes(12),'hex'),
  visibility text not null default 'private', -- public | followers | private | encrypted
  expires_at timestamptz,
  created_at timestamptz default now()
);

-- Trusted contacts for SafePass
create table public.trusted_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  phone text,
  email text,
  relationship text,
  share_live_location boolean default false,
  created_at timestamptz default now()
);

-- Live location pings
create table public.live_locations (
  user_id uuid primary key,
  latitude double precision,
  longitude double precision,
  updated_at timestamptz default now(),
  active boolean default false
);
```

All tables get RLS: owners can CRUD their own rows; `trip_shares` with visibility=public readable by anyone via token.

## Implementation notes

- **Booking import**: UI only for now. "Forward booking email" shows the user a unique address `bookings+<userid>@roavr.app` (placeholder). "Manual add" opens a typed form that writes to `bookings`. Trip detail merges bookings into the timeline alongside `itinerary_items`.
- **Shareable itinerary**: New route `/i/:token` renders a clean read-only itinerary using existing `ItineraryView` styles. Share sheet generates token + copy link / native share.
- **Travel stats**: New `TravelStatsDashboard.tsx` aggregates from `places_visited`, `check_ins`, `memories`, `trips`, `badges`. Adds miles (haversine between visits), continents, streaks (consecutive months with a trip), heritage sites (static list cross-referenced with cities), favorites (most-visited).
- **Surprise Me**: Wizard reusing `NewTripForm` step style. Calls Lovable AI (`google/gemini-2.5-flash`) with a structured prompt → returns 3 destinations with cost/safety/vibe. New edge function `surprise-destinations`.
- **Get Around**: Static modes list with placeholder ETA/cost. Button added to `ItineraryView` rows and `PinDetailSheet`.
- **Offline mode**: Toggle that serializes trip + bookings + map pins to IndexedDB via `idb-keyval`. Pro-gated with soft nudge (uses `useSubscription`).
- **Discover expansion**: Add category tabs (Tours, Activities, Restaurants, Nightlife, Guides, Hotels, Transfers, Events, Hidden Gems, Creator Picks) with mock data + affiliate-ready card.
- **SafePass**: `TrustedContactsList` CRUD + `LiveLocationToggle` that updates `live_locations` (uses existing `ensureLocationPermission`).

## Files

**New**
- `src/components/bookings/BookingImportSheet.tsx`
- `src/components/bookings/ManualBookingForm.tsx`
- `src/components/bookings/BookingsList.tsx`
- `src/components/trip/ShareItinerarySheet.tsx`
- `src/components/trip/GetAroundSheet.tsx`
- `src/components/trip/OfflineTripToggle.tsx`
- `src/components/globe/TravelStatsDashboard.tsx`
- `src/components/safety/TrustedContactsList.tsx`
- `src/components/safety/LiveLocationToggle.tsx`
- `src/components/discover/ExperienceCard.tsx`
- `src/pages/SurpriseMePage.tsx`
- `src/pages/SharedItineraryPage.tsx` (route `/i/:token`)
- `src/lib/offlineCache.ts`
- `src/lib/travelStats.ts`
- `supabase/functions/surprise-destinations/index.ts`
- one migration for the 4 tables above

**Edited**
- `src/App.tsx` (routes for `/surprise`, `/i/:token`)
- `src/pages/TripsPage.tsx` (Import booking + wire Surprise Me)
- `src/components/trip/ItineraryView.tsx` (Share button, Get Around, Offline toggle, bookings rows)
- `src/pages/GlobePage.tsx` (TravelStatsDashboard)
- `src/pages/ProfilePage.tsx` (mini stats)
- `src/pages/DiscoverPage.tsx` (category tabs + experience cards)
- `src/pages/SafePassPage.tsx` (trusted contacts + live location)

## Out of scope (placeholders only)

- Real email parsing / IMAP — UI scaffolds the address but no inbox runs.
- Real affiliate booking — cards include CTA but link to `#`.
- Real offline map tiles — only metadata is cached; map needs network.
- Real-time live-location streaming to contacts — writes to table; sharing UI noted as "coming soon".
