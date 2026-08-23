import { describe, expect, it } from "vitest";
import {
  bookingAction,
  dealTypeIsSupported,
  expiryState,
  savings,
  type MarketplaceOffer,
} from "./types";

const base: MarketplaceOffer = {
  id: "o1",
  source: "partner",
  source_offer_id: null,
  merchant_id: null,
  merchant_name: "Café Roma",
  category: "food",
  title: "Two-for-one aperitivo",
  description: null,
  address: null,
  city: "Rome",
  country: "Italy",
  latitude: null,
  longitude: null,
  image_url: null,
  currency: "EUR",
  retail_price: 40,
  roavr_price: 30,
  merchant_payout: null,
  commission_amount: null,
  discount_amount: null,
  inventory_remaining: null,
  starts_at: null,
  expires_at: null,
  booking_mode: "external_redirect",
  booking_url: "https://example.com/book",
  deal_type: "standard",
  terms: null,
  cancellation_policy: null,
  whats_included: [],
  rating: null,
  rating_count: null,
  rating_source: null,
  is_demo: false,
  active: true,
};

const offer = (o: Partial<MarketplaceOffer>): MarketplaceOffer => ({ ...base, ...o });

describe("marketplace offer validation", () => {
  it("never lets demo inventory start a real transaction", () => {
    const action = bookingAction(offer({ is_demo: true, booking_mode: "external_redirect" }));
    expect(action.enabled).toBe(false);
    expect(action.mode).toBe("preview_only");
  });

  it("disables booking when a real offer has no destination URL", () => {
    expect(bookingAction(offer({ booking_url: null })).enabled).toBe(false);
  });

  it("enables outbound booking for real inventory with a URL", () => {
    expect(bookingAction(offer({})).enabled).toBe(true);
  });

  it("keeps unconnected checkout modes disabled", () => {
    for (const mode of ["supplier_checkout", "roavr_checkout"] as const) {
      expect(bookingAction(offer({ booking_mode: mode })).enabled).toBe(false);
    }
  });

  it("only allows a Roavr Price claim backed by a supplier price", () => {
    expect(dealTypeIsSupported(offer({ deal_type: "roavr_price", source: "partner" }))).toBe(false);
    expect(dealTypeIsSupported(offer({ deal_type: "roavr_price", source: "supplier", roavr_price: null }))).toBe(false);
    expect(dealTypeIsSupported(offer({ deal_type: "roavr_price", source: "supplier", roavr_price: 30 }))).toBe(true);
  });

  it("does not invent savings", () => {
    expect(savings(offer({ retail_price: null }))).toBeNull();
    expect(savings(offer({ retail_price: 30, roavr_price: 30 }))).toBeNull();
    expect(savings(offer({}))).toEqual({ amount: 10, pct: 25 });
  });

  it("reports genuine expiry only", () => {
    const now = Date.parse("2026-01-01T00:00:00Z");
    expect(expiryState(offer({ expires_at: null }), now)).toBeNull();
    expect(expiryState(offer({ expires_at: "2025-12-31T23:00:00Z" }), now)?.expired).toBe(true);
    expect(expiryState(offer({ expires_at: "2026-01-01T00:30:00Z" }), now)?.label).toBe("30m left");
  });
});
