import { describe, expect, it } from "vitest";
import { PREMIUM_CHECKOUT_AVAILABLE, pricingCta } from "./checkout";
import { PLANS } from "@/services/subscriptions";

describe("pricing checkout gate", () => {
  it("never lets a premium tier start a checkout from the pricing UI", () => {
    expect(PREMIUM_CHECKOUT_AVAILABLE).toBe(false);
    for (const tierId of ["plus", "pro"]) {
      const cta = pricingCta(tierId);
      expect(cta.label).toBe("Coming Soon");
      expect(cta.enabled).toBe(false);
      expect(cta.navigates).toBe(false);
    }
  });

  it("keeps the free tier button actionable", () => {
    const cta = pricingCta("free");
    expect(cta.label).toBe("Get Started Free");
    expect(cta.enabled).toBe(true);
    expect(cta.navigates).toBe(true);
  });
});

describe("plan tier lists", () => {
  const forbidden = /sos|emergency|military|end[-\s]?to[-\s]?end|\be2e\b|zero knowledge|safe ?pass/i;

  it("do not advertise retired SOS/safety features or encryption claims", () => {
    for (const tier of Object.keys(PLANS)) {
      const text = PLANS[tier as keyof typeof PLANS].features.join(" | ");
      expect(text).not.toMatch(forbidden);
    }
  });
});
