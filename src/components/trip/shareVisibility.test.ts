import { describe, expect, it } from "vitest";
import { SHARE_VISIBILITIES } from "./ShareItinerarySheet";

// The share sheet writes `visibility` straight onto a trip_shares row. It must
// never offer a mode that claims cryptography the app does not perform.
describe("share itinerary visibility options", () => {
  it("offers exactly the three access levels the share link can enforce", () => {
    expect(SHARE_VISIBILITIES.map((v) => v.value)).toEqual(["public", "followers", "private"]);
  });

  it("never writes an 'encrypted' visibility to trip_shares", () => {
    expect(SHARE_VISIBILITIES.map((v) => v.value)).not.toContain("encrypted");
  });
});
