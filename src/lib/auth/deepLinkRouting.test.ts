import { describe, expect, it } from "vitest";
import { resolveDeepLink, resolveNotificationRoute } from "./deepLinkRouting";

const signedIn = { authenticated: true };
const signedOut = { authenticated: false };

describe("resolveDeepLink — authenticated", () => {
  it("routes traveler profiles", () => {
    expect(resolveDeepLink("roavr://u/andre", signedIn)).toEqual({
      kind: "navigate",
      path: "/u/andre",
    });
  });

  it("routes trip details and preserves the query string", () => {
    expect(resolveDeepLink("roavr://trips/42?tab=plan", signedIn)).toEqual({
      kind: "navigate",
      path: "/trips/42?tab=plan",
    });
  });

  it("routes shared itinerary tokens", () => {
    expect(resolveDeepLink("https://roavr.app/i/tok123", signedIn)).toEqual({
      kind: "navigate",
      path: "/i/tok123",
    });
  });
});

describe("resolveDeepLink — unauthenticated", () => {
  it("parks protected traveler links at /auth with the destination preserved", () => {
    expect(resolveDeepLink("roavr://u/andre", signedOut)).toEqual({
      kind: "authenticate",
      path: "/auth",
      returnTo: "/u/andre",
    });
  });

  it("parks trip links and keeps the query string", () => {
    expect(resolveDeepLink("roavr://trips/42?tab=plan", signedOut)).toEqual({
      kind: "authenticate",
      path: "/auth",
      returnTo: "/trips/42?tab=plan",
    });
  });

  it("opens shared itinerary tokens without a session", () => {
    expect(resolveDeepLink("https://roavr.app/i/tok123", signedOut)).toEqual({
      kind: "navigate",
      path: "/i/tok123",
    });
  });
});

describe("resolveDeepLink — auth callbacks", () => {
  it("hands the code back for exchange", () => {
    const action = resolveDeepLink("roavr://auth-callback?code=xyz", signedOut);
    expect(action).toMatchObject({ kind: "oauth" });
    if (action.kind === "oauth") expect(action.search).toContain("code=xyz");
  });

  it("handles implicit-flow fragments", () => {
    const action = resolveDeepLink("roavr://auth-callback#access_token=a&refresh_token=b", signedOut);
    expect(action).toMatchObject({ kind: "oauth" });
    if (action.kind === "oauth") expect(action.hash).toContain("access_token=a");
  });
});

describe("resolveDeepLink — hostile input", () => {
  it("ignores unknown, non-https and malformed links", () => {
    expect(resolveDeepLink("roavr://admin", signedIn).kind).toBe("ignore");
    expect(resolveDeepLink("http://roavr.app/u/andre", signedIn).kind).toBe("ignore");
    expect(resolveDeepLink("javascript:alert(1)", signedIn).kind).toBe("ignore");
    expect(resolveDeepLink("not a url", signedIn).kind).toBe("ignore");
    expect(resolveDeepLink(null, signedIn).kind).toBe("ignore");
  });
});

describe("resolveNotificationRoute", () => {
  it("opens notification destinations for signed-in users", () => {
    expect(resolveNotificationRoute("/messages/9", signedIn)).toEqual({
      kind: "navigate",
      path: "/messages/9",
    });
    expect(resolveNotificationRoute("/notifications", signedIn)).toEqual({
      kind: "navigate",
      path: "/notifications",
    });
  });

  it("requires auth for notification destinations when signed out", () => {
    expect(resolveNotificationRoute("/messages/9", signedOut)).toEqual({
      kind: "authenticate",
      path: "/auth",
      returnTo: "/messages/9",
    });
  });
});
