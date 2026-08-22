import { describe, expect, it } from "vitest";
import { aggregateWorld, sharedWorld, conversationStarters, type Visit } from "./visits";

const visit = (
  id: string, city: string, country: string, start: string, end = start, memories = 0
): Visit => ({
  id, city, country, latitude: 41.9, longitude: 12.5,
  startDate: start, endDate: end, memories,
  visibility: "public", isMilestone: false, tripId: null,
});

describe("aggregateWorld", () => {
  it("groups repeat visits to one city without collapsing them", () => {
    const w = aggregateWorld([
      visit("1", "Rome", "Italy", "2022-05-02", "2022-05-05", 40),
      visit("2", "Rome", "Italy", "2024-09-01", "2024-09-06", 60),
      visit("3", "Milan", "Italy", "2024-09-08", "2024-09-10", 12),
    ]);
    expect(w.summary.countries).toBe(1);
    expect(w.summary.cities).toBe(2);
    expect(w.summary.visits).toBe(3);
    expect(w.summary.memories).toBe(112);
    const rome = w.places.find((p) => p.city === "Rome")!;
    expect(rome.visitCount).toBe(2);
    expect(rome.visits).toHaveLength(2);
  });

  it("only names a most-visited place when one genuinely leads", () => {
    const tie = aggregateWorld([
      visit("1", "Rome", "Italy", "2022-05-02"),
      visit("2", "Lisbon", "Portugal", "2023-05-02"),
    ]);
    expect(tie.summary.mostVisitedCity).toBeNull();
    expect(tie.summary.mostVisitedCountry).toBeNull();

    const clear = aggregateWorld([
      visit("1", "Rome", "Italy", "2022-05-02"),
      visit("2", "Rome", "Italy", "2023-05-02"),
      visit("3", "Lisbon", "Portugal", "2023-08-02"),
    ]);
    expect(clear.summary.mostVisitedCity?.city).toBe("Rome");
    expect(clear.summary.mostVisitedCountry?.country).toBe("Italy");
  });

  it("reports years traveling only when dates support it", () => {
    const w = aggregateWorld([visit("1", "Rome", "Italy", "2020-05-02"), visit("2", "Rome", "Italy", "2024-05-02")]);
    expect(w.summary.yearsTraveling).toBe(5);
  });
});

describe("sharedWorld", () => {
  const mine = aggregateWorld([
    visit("1", "Rome", "Italy", "2023-05-02"),
    visit("2", "Medellín", "Colombia", "2024-02-02"),
    visit("3", "Oslo", "Norway", "2021-06-02"),
  ]);

  it("counts only places both travellers can be shown", () => {
    // `theirs` is already RLS-filtered — private rows never reach this function.
    const theirs = aggregateWorld([
      visit("a", "Rome", "Italy", "2024-05-02"),
      visit("b", "Medellín", "Colombia", "2022-02-02"),
      visit("c", "Tokyo", "Japan", "2024-11-02"),
    ]);
    const s = sharedWorld(mine, theirs);
    expect(s.countryCount).toBe(2);
    expect(s.cityCount).toBe(2);
    expect(s.cities.map((c) => c.city).sort()).toEqual(["Medellín", "Rome"]);
  });

  it("produces no overlap claims when there is none", () => {
    const theirs = aggregateWorld([visit("a", "Tokyo", "Japan", "2024-11-02")]);
    const s = sharedWorld(mine, theirs);
    expect(s.countryCount).toBe(0);
    expect(s.cityCount).toBe(0);
  });
});

describe("conversationStarters", () => {
  it("only makes claims backed by the visible data", () => {
    const theirs = aggregateWorld([
      visit("a", "Rome", "Italy", "2024-05-02"),
      visit("b", "Rome", "Italy", "2023-05-02"),
      visit("c", "Rome", "Italy", "2022-05-02"),
    ]);
    const mineW = aggregateWorld([visit("1", "Rome", "Italy", "2023-06-02")]);
    const s = sharedWorld(mineW, theirs);
    const starters = conversationStarters("Maya", theirs, s);
    expect(starters.some((x) => x.text.includes("Rome"))).toBe(true);
    expect(starters.some((x) => x.text === "Maya has visited Italy 3 times")).toBe(true);
    expect(starters.every((x) => !/recommend|loves|favorite/i.test(x.text))).toBe(true);
  });
});
