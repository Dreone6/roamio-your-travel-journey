
-- Bookings
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
  details jsonb not null default '{}'::jsonb,
  source text not null default 'manual',
  created_at timestamptz not null default now()
);
alter table public.bookings enable row level security;
create policy "Users can manage own bookings" on public.bookings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index bookings_user_idx on public.bookings(user_id);
create index bookings_trip_idx on public.bookings(trip_id);

-- Trip shares
create table public.trip_shares (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null,
  user_id uuid not null,
  token text unique not null default encode(gen_random_bytes(12),'hex'),
  visibility text not null default 'private' check (visibility in ('public','followers','private','encrypted')),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.trip_shares enable row level security;
create policy "Owners manage shares" on public.trip_shares for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Public shares readable" on public.trip_shares for select using (
  visibility = 'public' or auth.uid() = user_id or (
    visibility = 'followers' and exists (
      select 1 from public.follows
      where follower_id = auth.uid() and following_id = trip_shares.user_id and status = 'accepted'
    )
  )
);

-- Trusted contacts
create table public.trusted_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  phone text,
  email text,
  relationship text,
  share_live_location boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.trusted_contacts enable row level security;
create policy "Users manage own contacts" on public.trusted_contacts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Live locations
create table public.live_locations (
  user_id uuid primary key,
  latitude double precision,
  longitude double precision,
  active boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.live_locations enable row level security;
create policy "Users manage own location" on public.live_locations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Trusted contacts read location" on public.live_locations for select using (
  auth.uid() = user_id or exists (
    select 1 from public.trusted_contacts tc
    where tc.user_id = live_locations.user_id and tc.share_live_location = true
      and (tc.email = (select email from auth.users where id = auth.uid()))
  )
);
