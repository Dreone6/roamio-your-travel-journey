import { describe, expect, it } from "vitest";
import { parseDeepLink } from "./deepLinks";
import { sanitizeReturnTo } from "./returnTo";

describe("parseDeepLink", () => {
  it("maps custom-scheme traveler links", () => {
    const r = parseDeepLink("roavr://u/andre");
    expect(r?.pathname).toBe("/u/andre");
    expect(r?.isPublic).toBe(false);
  });

  it("treats shared itinerary tokens as public", () => {
    const r = parseDeepLink("https://roavr.app/i/abc123");
    expect(r?.pathname).toBe("/i/abc123");
    expect(r?.isPublic).toBe(true);
  });

  it("keeps trip routes protected", () => {
    expect(parseDeepLink("roavr://trips/42")?.isPublic).toBe(false);
    expect(parseDeepLink("roavr://messages/9")?.isPublic).toBe(false);
  });

  it("rejects unknown or dangerous paths", () => {
    expect(parseDeepLink("roavr://admin")).toBeNull();
    expect(parseDeepLink("https://roavr.app/../etc")).toBeNull();
    expect(parseDeepLink("not a url")).toBeNull();
  });

  it("detects the oauth callback", () => {
    const r = parseDeepLink("roavr://auth-callback?code=xyz");
    expect(r?.isOAuthCallback).toBe(true);
    expect(r?.search).toContain("code=xyz");
  });
});

describe("sanitizeReturnTo", () => {
  it("allows same-origin paths", () => {
    expect(sanitizeReturnTo("/trips/1?tab=plan")).toBe("/trips/1?tab=plan");
  });

  it("blocks open redirects", () => {
    expect(sanitizeReturnTo("//evil.com")).toBeNull();
    expect(sanitizeReturnTo("https://evil.com")).toBeNull();
    expect(sanitizeReturnTo("/\\evil.com")).toBeNull();
    expect(sanitizeReturnTo("/auth")).toBeNull();
  });
});
