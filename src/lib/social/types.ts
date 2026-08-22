/**
 * Shared contracts for Roavr's social layer (feed, discovery, search).
 *
 * Everything here describes content that genuinely exists in the database.
 * A `places_visited` row is never turned into a social post on its own — only
 * deliberately shared artefacts (memories, stories, shared check-ins, marked
 * milestones) become feed items.
 */

export type FeedItemType = "memory" | "story" | "checkin" | "milestone";

export interface FeedAuthor {
  id: string;
  name: string;
  username: string | null;
  avatar: string | null;
}

/** A reason this item is relevant to the viewer. Only data-backed claims. */
export interface FeedContext {
  kind: "been-here" | "shared-country" | "upcoming" | "followed" | "repeat";
  label: string;
}

export interface FeedItem {
  id: string;
  type: FeedItemType;
  author: FeedAuthor;
  createdAt: string;
  /** Real stored media only — never fabricated for imported visits. */
  mediaUrl: string | null;
  mediaType: "image" | "video" | null;
  caption: string | null;
  city: string | null;
  country: string | null;
  /** Free-text place label when city/country aren't separated. */
  locationName: string | null;
  context: FeedContext[];
  score: number;
}

/** Aggregated, RLS-authorised travel signal for one traveller. */
export interface TravelerSummary {
  id: string;
  name: string;
  username: string | null;
  avatar: string | null;
  bio: string | null;
  countries: number;
  cities: number;
  visits: number;
  /** Countries with the most authorised visits, e.g. "Colombia · 8 visits". */
  topCountries: { country: string; flag: string | null; visits: number }[];
  topCities: { city: string; country: string; visits: number }[];
  sharedCountries: string[];
  sharedCities: string[];
  /** Human sentence explaining why this traveller is surfaced. */
  reason: string | null;
  score: number;
}

export interface DiscoverSections {
  placesInCommon: TravelerSummary[];
  knowWhereYoureGoing: TravelerSummary[];
  mayKnow: TravelerSummary[];
  interesting: TravelerSummary[];
}

export const EMPTY_DISCOVER: DiscoverSections = {
  placesInCommon: [],
  knowWhereYoureGoing: [],
  mayKnow: [],
  interesting: [],
};

/** A traveller with real repeat history in one destination. */
export interface PlaceExpert {
  id: string;
  name: string;
  username: string | null;
  avatar: string | null;
  /** Number of authorised visits to the destination. */
  visits: number;
  /** Year of the most recent authorised visit, when the date is visible. */
  lastYear: number | null;
}
