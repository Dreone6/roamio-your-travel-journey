/**
 * Feed ranking v1 — a deliberately transparent heuristic.
 *
 * There is no model here and no follower-count popularity term. An item ranks
 * because the viewer follows the author, because it happens somewhere the two
 * travellers have both been, because it is about a place the viewer is heading
 * to, or because it is recent. Keeping this pure and isolated means it can be
 * swapped wholesale later without touching any query or component.
 */
import type { FeedContext, FeedItem, FeedItemType } from "./types";

export interface ViewerContext {
  followingIds: Set<string>;
  /** Lower-cased "city|country" keys the viewer has visited. */
  visitedCityKeys: Set<string>;
  /** Lower-cased country names the viewer has visited. */
  visitedCountries: Set<string>;
  /** Lower-cased destination words from the viewer's upcoming trips. */
  upcomingDestinations: Set<string>;
  /** Authors with repeat authorised history where the item happens. */
  repeatExpertise?: Map<string, number>;
  now?: number;
}

export const WEIGHTS = {
  followed: 40,
  upcoming: 30,
  sharedCity: 22,
  sharedCountry: 10,
  repeatExpertise: 8,
  hasMedia: 6,
  typeBonus: { story: 8, memory: 6, checkin: 5, milestone: 4 } as Record<FeedItemType, number>,
  /** Freshness decays over a week and can never dominate relevance. */
  freshnessMax: 25,
  freshnessHalfLifeHours: 36,
};

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

export function freshnessScore(createdAt: string, now: number): number {
  const ageHours = Math.max(0, (now - new Date(createdAt).getTime()) / 3_600_000);
  return WEIGHTS.freshnessMax * Math.pow(0.5, ageHours / WEIGHTS.freshnessHalfLifeHours);
}

/**
 * Score one item and attach the human-readable reasons behind the score.
 * Every context label corresponds to a fact in the viewer's own authorised
 * data — we never claim an overlap we cannot prove.
 */
export function scoreItem(item: FeedItem, ctx: ViewerContext): FeedItem {
  const now = ctx.now ?? Date.now();
  const context: FeedContext[] = [];
  let score = 0;

  if (ctx.followingIds.has(item.author.id)) {
    score += WEIGHTS.followed;
  }

  const city = norm(item.city);
  const country = norm(item.country);
  const cityKey = city && country ? `${city}|${country}` : "";
  const place = norm(item.locationName);

  if (cityKey && ctx.visitedCityKeys.has(cityKey)) {
    score += WEIGHTS.sharedCity;
    context.push({ kind: "been-here", label: "You've been here too" });
  } else if (country && ctx.visitedCountries.has(country)) {
    score += WEIGHTS.sharedCountry;
    context.push({ kind: "shared-country", label: `You've both been to ${item.country}` });
  }

  const upcomingHit = [...ctx.upcomingDestinations].some(
    (d) => d && ((city && (d.includes(city) || city.includes(d))) ||
                 (country && (d.includes(country) || country.includes(d))) ||
                 (place && (d.includes(place) || place.includes(d))))
  );
  if (upcomingHit) {
    score += WEIGHTS.upcoming;
    context.push({ kind: "upcoming", label: "On your upcoming trip" });
  }

  const repeats = ctx.repeatExpertise?.get(item.author.id) ?? 0;
  if (repeats > 2 && item.city) {
    score += WEIGHTS.repeatExpertise;
    context.push({
      kind: "repeat",
      label: `${item.author.name.split(" ")[0]} has been to ${item.city} ${repeats} times`,
    });
  }

  if (item.mediaUrl) score += WEIGHTS.hasMedia;
  score += WEIGHTS.typeBonus[item.type] ?? 0;
  score += freshnessScore(item.createdAt, now);

  return { ...item, score: Math.round(score * 100) / 100, context: context.slice(0, 2) };
}

export function rankFeed(items: FeedItem[], ctx: ViewerContext): FeedItem[] {
  return items
    .map((i) => scoreItem(i, ctx))
    .sort((a, b) => b.score - a.score || b.createdAt.localeCompare(a.createdAt));
}
