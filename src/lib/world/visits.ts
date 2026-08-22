/**
 * The canonical travel-identity layer for World, Passport and profiles.
 *
 * `places_visited` is the single visit store. One row = one visit: a city, a
 * country, coordinates, a date window and a photo count. Everything shown in
 * the product is derived here so Home, Profile, World and Passport can never
 * disagree with each other.
 *
 * Reading another traveller's world uses the exact same query — Row Level
 * Security decides which rows come back. We never fetch private rows and hide
 * them in the client, and we never derive a statistic from rows the viewer is
 * not authorised to see.
 */
import { supabase } from "@/integrations/supabase/client";
import { flagEmoji, isoForCountry } from "./countries";

export interface Visit {
  id: string;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  startDate: string | null;
  endDate: string | null;
  /** Visit-level photo count. Individual photos are not persisted yet. */
  memories: number;
  visibility: "private" | "followers" | "public";
  isMilestone: boolean;
  tripId: string | null;
}

/** One city, with every authorised visit to it. */
export interface CityPlace {
  key: string;
  city: string;
  country: string;
  countryCode: string | null;
  lat: number;
  lng: number;
  visits: Visit[];
  visitCount: number;
  memories: number;
  /** ISO date of the most recent authorised visit, when dates are known. */
  lastVisit: string | null;
  firstVisit: string | null;
  isMilestone: boolean;
}

export interface CountryEntry {
  country: string;
  countryCode: string | null;
  flag: string | null;
  cities: CityPlace[];
  cityCount: number;
  visitCount: number;
  memories: number;
  firstVisit: string | null;
  lastVisit: string | null;
}

export interface WorldSummary {
  countries: number;
  cities: number;
  visits: number;
  memories: number;
  /** Null when there is not enough data to name one responsibly. */
  mostVisitedCountry: { country: string; visits: number } | null;
  mostVisitedCity: { city: string; country: string; visits: number } | null;
  firstYear: number | null;
  lastYear: number | null;
  yearsTraveling: number | null;
}

export interface World {
  visits: Visit[];
  places: CityPlace[];
  countries: CountryEntry[];
  summary: WorldSummary;
  isEmpty: boolean;
}

export const EMPTY_WORLD: World = {
  visits: [],
  places: [],
  countries: [],
  summary: {
    countries: 0, cities: 0, visits: 0, memories: 0,
    mostVisitedCountry: null, mostVisitedCity: null,
    firstYear: null, lastYear: null, yearsTraveling: null,
  },
  isEmpty: true,
};

const norm = (s: string) => s.trim().toLowerCase();
const cityKey = (city: string, country: string) => `${norm(city)}|${norm(country)}`;

/**
 * Fetch a traveller's visits. Pass any user id — RLS returns only the rows the
 * signed-in viewer may see (all of their own; public/followers rows of others,
 * minus blocked relationships and private accounts they don't follow).
 */
export async function fetchVisits(userId: string): Promise<Visit[]> {
  const { data, error } = await supabase
    .from("places_visited")
    .select("id, city, country, latitude, longitude, date_visited, end_date, photos_count, visibility, is_milestone, trip_id, source")
    .eq("user_id", userId)
    .neq("source", "demo")
    .order("date_visited", { ascending: false });

  if (error) throw error;

  return (data ?? [])
    .filter((r) => r.city && r.country)
    .map((r) => ({
      id: r.id,
      city: r.city,
      country: r.country,
      latitude: r.latitude,
      longitude: r.longitude,
      startDate: r.date_visited,
      endDate: r.end_date,
      memories: r.photos_count ?? 0,
      visibility: (r.visibility as Visit["visibility"]) ?? "private",
      isMilestone: !!r.is_milestone,
      tripId: r.trip_id,
    }));
}

export function aggregateWorld(visits: Visit[]): World {
  if (visits.length === 0) return EMPTY_WORLD;

  const byCity = new Map<string, CityPlace>();
  for (const v of visits) {
    const key = cityKey(v.city, v.country);
    let place = byCity.get(key);
    if (!place) {
      place = {
        key,
        city: v.city.trim(),
        country: v.country.trim(),
        countryCode: isoForCountry(v.country),
        lat: v.latitude ?? 0,
        lng: v.longitude ?? 0,
        visits: [],
        visitCount: 0,
        memories: 0,
        lastVisit: null,
        firstVisit: null,
        isMilestone: false,
      };
      byCity.set(key, place);
    }
    place.visits.push(v);
    place.visitCount += 1;
    place.memories += v.memories;
    place.isMilestone = place.isMilestone || v.isMilestone;
    if (v.latitude != null && v.longitude != null && place.lat === 0 && place.lng === 0) {
      place.lat = v.latitude;
      place.lng = v.longitude;
    }
    if (v.startDate) {
      if (!place.lastVisit || v.startDate > place.lastVisit) place.lastVisit = v.startDate;
      if (!place.firstVisit || v.startDate < place.firstVisit) place.firstVisit = v.startDate;
    }
  }

  const places = [...byCity.values()].map((p) => ({
    ...p,
    visits: [...p.visits].sort((a, b) => (b.startDate ?? "").localeCompare(a.startDate ?? "")),
  }));
  places.sort((a, b) => (b.lastVisit ?? "").localeCompare(a.lastVisit ?? ""));

  const byCountry = new Map<string, CountryEntry>();
  for (const p of places) {
    const key = norm(p.country);
    let entry = byCountry.get(key);
    if (!entry) {
      entry = {
        country: p.country,
        countryCode: p.countryCode,
        flag: flagEmoji(p.country),
        cities: [],
        cityCount: 0,
        visitCount: 0,
        memories: 0,
        firstVisit: null,
        lastVisit: null,
      };
      byCountry.set(key, entry);
    }
    entry.cities.push(p);
    entry.cityCount += 1;
    entry.visitCount += p.visitCount;
    entry.memories += p.memories;
    if (p.firstVisit && (!entry.firstVisit || p.firstVisit < entry.firstVisit)) entry.firstVisit = p.firstVisit;
    if (p.lastVisit && (!entry.lastVisit || p.lastVisit > entry.lastVisit)) entry.lastVisit = p.lastVisit;
  }

  const countries = [...byCountry.values()].sort(
    (a, b) => b.visitCount - a.visitCount || a.country.localeCompare(b.country)
  );

  const years = visits
    .map((v) => (v.startDate ? Number(v.startDate.slice(0, 4)) : null))
    .filter((y): y is number => !!y && y > 1900);
  const firstYear = years.length ? Math.min(...years) : null;
  const lastYear = years.length ? Math.max(...years) : null;

  // Only name a "most visited" when one place genuinely leads the pack.
  const topCountry = countries[0];
  const countryLeads = topCountry && topCountry.visitCount > 1 &&
    (countries.length === 1 || topCountry.visitCount > countries[1].visitCount);
  const cityRank = [...places].sort((a, b) => b.visitCount - a.visitCount);
  const topCity = cityRank[0];
  const cityLeads = topCity && topCity.visitCount > 1 &&
    (cityRank.length === 1 || topCity.visitCount > cityRank[1].visitCount);

  return {
    visits,
    places,
    countries,
    summary: {
      countries: countries.length,
      cities: places.length,
      visits: visits.length,
      memories: visits.reduce((s, v) => s + v.memories, 0),
      mostVisitedCountry: countryLeads ? { country: topCountry.country, visits: topCountry.visitCount } : null,
      mostVisitedCity: cityLeads ? { city: topCity.city, country: topCity.country, visits: topCity.visitCount } : null,
      firstYear,
      lastYear,
      yearsTraveling: firstYear && lastYear ? lastYear - firstYear + 1 : null,
    },
    isEmpty: false,
  };
}

export async function loadWorld(userId: string): Promise<World> {
  return aggregateWorld(await fetchVisits(userId));
}

/* ── Shared world ─────────────────────────────────────────────────────── */

export interface SharedPlace {
  city: string;
  country: string;
  flag: string | null;
  /** Years each side visited, when known — used for "one year apart" copy. */
  yourYears: number[];
  theirYears: number[];
}

export interface SharedWorld {
  countries: string[];
  cities: SharedPlace[];
  countryCount: number;
  cityCount: number;
}

function yearsOf(place: CityPlace): number[] {
  return [...new Set(
    place.visits.map((v) => (v.startDate ? Number(v.startDate.slice(0, 4)) : null))
      .filter((y): y is number => !!y)
  )].sort();
}

/**
 * Overlap between two worlds. `theirs` must already be the RLS-filtered world,
 * so a shared place can never reveal a visit the viewer isn't allowed to see.
 */
export function sharedWorld(mine: World, theirs: World): SharedWorld {
  const myCountries = new Map(mine.countries.map((c) => [norm(c.country), c]));
  const myPlaces = new Map(mine.places.map((p) => [p.key, p]));

  const countries = theirs.countries
    .filter((c) => myCountries.has(norm(c.country)))
    .map((c) => c.country);

  const cities: SharedPlace[] = theirs.places
    .filter((p) => myPlaces.has(p.key))
    .map((p) => ({
      city: p.city,
      country: p.country,
      flag: flagEmoji(p.country),
      yourYears: yearsOf(myPlaces.get(p.key)!),
      theirYears: yearsOf(p),
    }));

  return { countries, cities, countryCount: countries.length, cityCount: cities.length };
}

/* ── Conversation starters ────────────────────────────────────────────── */

export interface Starter {
  id: string;
  text: string;
}

/**
 * Data-backed prompts only. Every line below is a restatement of a record the
 * viewer is authorised to see — never an invented opinion or recommendation.
 */
export function conversationStarters(
  theirName: string,
  theirs: World,
  shared: SharedWorld
): Starter[] {
  const out: Starter[] = [];
  const first = theirName.split(" ")[0] || theirName;

  const recent = theirs.places.find((p) => p.lastVisit);
  if (recent) out.push({ id: "recent", text: `Ask ${first} about ${recent.city}` });

  for (const c of shared.cities.slice(0, 2)) {
    const gap =
      c.yourYears.length && c.theirYears.length
        ? Math.abs(Math.max(...c.yourYears) - Math.max(...c.theirYears))
        : null;
    out.push({
      id: `shared-${c.city}`,
      text:
        gap === 0
          ? `You were both in ${c.city} the same year`
          : gap === 1
            ? `You visited ${c.city} a year apart`
            : `You've both been to ${c.city}`,
    });
  }

  const top = theirs.summary.mostVisitedCountry;
  if (top && top.visits > 2) {
    out.push({ id: "repeat", text: `${first} has visited ${top.country} ${top.visits} times` });
  }

  if (shared.countryCount > 1 && shared.cityCount === 0) {
    out.push({ id: "countries", text: `You've both been to ${shared.countryCount} of the same countries` });
  }

  return out.slice(0, 4);
}

/* ── Formatting ───────────────────────────────────────────────────────── */

export function formatVisitDate(startDate: string | null, endDate: string | null): string {
  if (!startDate) return "Date unknown";
  const s = new Date(`${startDate}T00:00:00`);
  const e = endDate ? new Date(`${endDate}T00:00:00`) : null;
  const month = s.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  if (!e || e.getTime() === s.getTime()) return month;
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  if (sameMonth) {
    return `${s.toLocaleDateString(undefined, { month: "long" })} ${s.getDate()}–${e.getDate()}, ${e.getFullYear()}`;
  }
  return `${s.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${e.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}
