import { describe, expect, it, vi } from "vitest";
import { clusterMedia, buildDiscoveredTrips, mergeTrips } from "./cluster";
import type { GeotaggedMedia } from "./types";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: vi.fn(async () => ({ data: null, error: new Error("offline") })) } },
}));

const media = (
  id: string,
  lat: number,
  lng: number,
  takenAt: string,
  takenAtKnown = true
): GeotaggedMedia => ({ id, name: `${id}.jpg`, latitude: lat, longitude: lng, takenAt, takenAtKnown });

describe("clusterMedia", () => {
  it("groups photos from the same trip into one cluster", () => {
    const c = clusterMedia([
      media("a", 41.9028, 12.4964, "2024-05-01T10:00:00Z"),
      media("b", 41.905, 12.5, "2024-05-02T10:00:00Z"),
      media("c", 41.91, 12.49, "2024-05-03T10:00:00Z"),
    ]);
    expect(c).toHaveLength(1);
    expect(c[0].media).toHaveLength(3);
  });

  it("splits repeat visits to the same city in different years", () => {
    const c = clusterMedia([
      media("a", 41.9028, 12.4964, "2022-05-01T10:00:00Z"),
      media("b", 41.9028, 12.4964, "2024-05-01T10:00:00Z"),
    ]);
    expect(c).toHaveLength(2);
  });

  it("groups undated photos by location alone", () => {
    const c = clusterMedia([
      media("a", 35.6762, 139.6503, "2024-03-01T10:00:00Z"),
      media("b", 35.68, 139.65, new Date().toISOString(), false),
    ]);
    expect(c).toHaveLength(1);
  });
});

describe("buildDiscoveredTrips", () => {
  it("produces stable import keys and distinguishes repeat trips", async () => {
    const input = [
      media("a", 41.9028, 12.4964, "2022-05-01T10:00:00Z"),
      media("b", 41.9028, 12.4964, "2024-05-01T10:00:00Z"),
    ];
    const first = await buildDiscoveredTrips(input);
    const second = await buildDiscoveredTrips(input);

    expect(first).toHaveLength(2);
    expect(new Set(first.map((t) => t.importKey)).size).toBe(2);
    // Re-importing the same photos yields identical keys -> upsert, no dupes.
    expect(second.map((t) => t.importKey)).toEqual(first.map((t) => t.importKey));
  });

  it("keeps two separate trips to the same city in the same month distinct", async () => {
    const trips = await buildDiscoveredTrips([
      media("a", 41.9028, 12.4964, "2024-05-01T10:00:00Z"),
      media("b", 41.9028, 12.4964, "2024-05-20T10:00:00Z"),
    ]);
    expect(trips).toHaveLength(2);
    expect(new Set(trips.map((t) => t.importKey)).size).toBe(2);
  });

  it("marks clusters with no usable capture dates", async () => {
    const trips = await buildDiscoveredTrips([
      media("a", 48.8566, 2.3522, new Date().toISOString(), false),
    ]);
    expect(trips[0].dateUnknown).toBe(true);
    expect(trips[0].importKey).toContain("undated");
  });
});

describe("mergeTrips", () => {
  it("recomputes the import key after a merge", async () => {
    const trips = await buildDiscoveredTrips([
      media("a", 41.9028, 12.4964, "2024-05-01T10:00:00Z"),
      media("b", 45.4642, 9.19, "2024-05-20T10:00:00Z"),
    ]);
    const merged = mergeTrips(trips, trips.map((t) => t.id));
    expect(merged).toHaveLength(1);
    expect(merged[0].memoryCount).toBe(2);
    expect(merged[0].importKey).not.toBe(trips[0].importKey);
  });
});
