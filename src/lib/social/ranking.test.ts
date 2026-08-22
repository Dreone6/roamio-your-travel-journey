import { describe, expect, it } from "vitest";
import { rankFeed, scoreItem, type ViewerContext } from "./ranking";
import type { FeedItem } from "./types";

const NOW = Date.parse("2026-01-10T12:00:00.000Z");

const ctx = (over: Partial<ViewerContext> = {}): ViewerContext => ({
  followingIds: new Set(["u-follow"]),
  visitedCityKeys: new Set(["lisbon|portugal"]),
  visitedCountries: new Set(["portugal", "italy"]),
  upcomingDestinations: new Set(["medellin"]),
  now: NOW,
  ...over,
});

const item = (over: Partial<FeedItem> = {}): FeedItem => ({
  id: "memory:1",
  type: "memory",
  author: { id: "u-other", name: "Maya Reyes", username: "maya", avatar: null },
  createdAt: new Date(NOW - 3_600_000).toISOString(),
  mediaUrl: null,
  mediaType: null,
  caption: null,
  city: null,
  country: null,
  locationName: null,
  context: [],
  score: 0,
  ...over,
});

describe("feed ranking", () => {
  it("ranks a place you've both been above an unrelated post", () => {
    const shared = scoreItem(item({ city: "Lisbon", country: "Portugal" }), ctx());
    const unrelated = scoreItem(item({ id: "memory:2", city: "Oslo", country: "Norway" }), ctx());
    expect(shared.score).toBeGreaterThan(unrelated.score);
    expect(shared.context[0].label).toBe("You've been here too");
  });

  it("prefers a shared city over a merely shared country", () => {
    const city = scoreItem(item({ city: "Lisbon", country: "Portugal" }), ctx());
    const country = scoreItem(item({ id: "m2", city: "Rome", country: "Italy" }), ctx());
    expect(city.score).toBeGreaterThan(country.score);
    expect(country.context[0].kind).toBe("shared-country");
  });

  it("surfaces posts about an upcoming destination", () => {
    const upcoming = scoreItem(item({ city: "Medellin", country: "Colombia" }), ctx());
    expect(upcoming.context.some((c) => c.kind === "upcoming")).toBe(true);
  });

  it("never lets freshness beat relevance", () => {
    const freshStranger = scoreItem(
      item({ id: "m-fresh", createdAt: new Date(NOW).toISOString(), city: "Oslo", country: "Norway" }),
      ctx()
    );
    const olderRelevant = scoreItem(
      item({
        id: "m-old",
        author: { id: "u-follow", name: "Ana", username: null, avatar: null },
        createdAt: new Date(NOW - 48 * 3_600_000).toISOString(),
        city: "Lisbon",
        country: "Portugal",
      }),
      ctx()
    );
    expect(olderRelevant.score).toBeGreaterThan(freshStranger.score);
  });

  it("does not claim an overlap the viewer's data cannot prove", () => {
    const scored = scoreItem(item({ city: "Oslo", country: "Norway" }), ctx());
    expect(scored.context).toHaveLength(0);
  });

  it("sorts a mixed feed deterministically", () => {
    const ranked = rankFeed(
      [
        item({ id: "a", city: "Oslo", country: "Norway" }),
        item({ id: "b", city: "Lisbon", country: "Portugal" }),
        item({ id: "c", city: "Medellin", country: "Colombia" }),
      ],
      ctx()
    );
    expect(ranked[0].id).toBe("c");
    expect(ranked.map((r) => r.id)).toHaveLength(3);
  });
});
