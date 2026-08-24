import { describe, expect, it } from "vitest";
import { preferenceForType, routeForNotification } from "./routing";

describe("routeForNotification", () => {
  it("uses an explicit allowed path", () => {
    expect(routeForNotification({ type: "message", path: "/trips/abc" })).toBe("/trips/abc");
  });

  it("rejects unknown or unsafe paths", () => {
    expect(routeForNotification({ type: "message", path: "//evil.com" })).toBe("/messages");
    expect(routeForNotification({ type: "new_follower", path: "https://evil.com" })).toBe("/notifications");
    expect(routeForNotification({ path: "/admin" })).toBe("/notifications");
  });

  it("builds destinations from entity ids", () => {
    expect(routeForNotification({ type: "message", conversationId: "c1" })).toBe("/messages/c1");
    expect(routeForNotification({ type: "trip_invite", tripId: "t1" })).toBe("/trips/t1");
    expect(routeForNotification({ type: "new_follower", handle: "andre" })).toBe("/u/andre");
    expect(routeForNotification({ type: "nearby_offer" })).toBe("/nearby");
  });

  it("falls back to the inbox for unknown types", () => {
    expect(routeForNotification({ type: "whatever" })).toBe("/notifications");
    expect(routeForNotification({})).toBe("/notifications");
  });

  it("drops query and hash from payload paths", () => {
    expect(routeForNotification({ path: "/messages/c1?x=1#y" })).toBe("/messages/c1");
  });
});

describe("preferenceForType", () => {
  it("maps commercial types to opt-in preferences", () => {
    expect(preferenceForType("nearby_offer")).toBe("nearby_offers");
    expect(preferenceForType("travel_alert")).toBe("travel_alerts");
  });

  it("maps social types", () => {
    expect(preferenceForType("story_reply")).toBe("story_activity");
    expect(preferenceForType("follow_request")).toBe("new_follower");
  });

  it("returns null for unknown types", () => {
    expect(preferenceForType("nope")).toBeNull();
    expect(preferenceForType(undefined)).toBeNull();
  });
});
