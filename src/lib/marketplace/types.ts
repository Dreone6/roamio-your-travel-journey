/**
 * Roavr marketplace — one normalized offer model.
 *
 * Every future inventory source (Roavr Direct merchants, supplier APIs,
 * affiliate feeds, local Drops) is adapted into `MarketplaceOffer` before it
 * reaches the UI. No component may read a supplier-specific shape.
 */

export type OfferSource = "roavr_direct" | "partner" | "supplier" | "affiliate" | "demo";

export type DealType = "standard" | "roavr_price" | "roavr_exclusive" | "roavr_drop";

export type BookingMode =
  | "preview_only"
  | "external_redirect"
  | "affiliate_redirect"
  | "supplier_checkout"
  | "roavr_checkout"
  | "direct_merchant_request";

export type OfferCategory = "food" | "activity" | "lodging" | "transport" | "shopping" | "other";

export interface MarketplaceOffer {
  id: string;
  source: OfferSource;
  source_offer_id: string | null;
  merchant_id: string | null;
  merchant_name: string;
  category: OfferCategory;
  title: string;
  description: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  image_url: string | null;
  currency: string;
  retail_price: number | null;
  roavr_price: number | null;
  merchant_payout: number | null;
  commission_amount: number | null;
  discount_amount: number | null;
  inventory_remaining: number | null;
  starts_at: string | null;
  expires_at: string | null;
  booking_mode: BookingMode;
  booking_url: string | null;
  deal_type: DealType;
  terms: string | null;
  cancellation_policy: string | null;
  whats_included: string[];
  rating: number | null;
  rating_count: number | null;
  /** Only render a rating when we can name where it came from. */
  rating_source: string | null;
  is_demo: boolean;
  active: boolean;
  /** Computed client-side when a legitimate current location exists. */
  distance_miles?: number | null;
}

export const DEAL_LABEL: Record<DealType, string> = {
  standard: "Offer",
  roavr_price: "Roavr Price",
  roavr_exclusive: "Roavr Exclusive",
  roavr_drop: "Roavr Drop",
};

/** Roavr Price requires a verified wholesale/supplier source behind it. */
export function dealTypeIsSupported(offer: MarketplaceOffer): boolean {
  if (offer.deal_type === "roavr_price") {
    return offer.source === "supplier" && offer.roavr_price != null;
  }
  return true;
}

/** Savings are only shown when both a reference price and a Roavr price exist. */
export function savings(offer: MarketplaceOffer): { amount: number; pct: number } | null {
  const { retail_price: retail, roavr_price: price } = offer;
  if (retail == null || price == null || retail <= price) return null;
  return { amount: retail - price, pct: Math.round(((retail - price) / retail) * 100) };
}

export function formatPrice(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

/** Genuine expiry only — never a decorative countdown. */
export function expiryState(offer: MarketplaceOffer, now = Date.now()) {
  if (!offer.expires_at) return null;
  const ms = new Date(offer.expires_at).getTime() - now;
  if (Number.isNaN(ms) || ms <= 0) return { expired: true, label: "Expired" };
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return { expired: false, label: `${mins}m left` };
  const hours = Math.floor(mins / 60);
  if (hours < 48) return { expired: false, label: `${hours}h left` };
  return { expired: false, label: `${Math.floor(hours / 24)}d left` };
}

export interface BookingAction {
  label: string;
  /** Preview inventory can never start a checkout. */
  enabled: boolean;
  mode: BookingMode;
  url: string | null;
  note: string | null;
}

/**
 * Booking-action abstraction. Roavr is not the merchant of record today, so the
 * only executable mode is an outbound redirect on real inventory.
 */
export function bookingAction(offer: MarketplaceOffer): BookingAction {
  if (offer.is_demo) {
    return {
      label: "Preview only",
      enabled: false,
      mode: "preview_only",
      url: null,
      note: "Sample inventory. No booking or payment is possible.",
    };
  }
  switch (offer.booking_mode) {
    case "external_redirect":
      return { label: `Book with ${offer.merchant_name}`, enabled: !!offer.booking_url, mode: offer.booking_mode, url: offer.booking_url, note: "Booking completes on the provider's site." };
    case "affiliate_redirect":
      return { label: "Continue to provider", enabled: !!offer.booking_url, mode: offer.booking_mode, url: offer.booking_url, note: "Roavr may earn a commission on this booking." };
    case "supplier_checkout":
      return { label: "Check availability", enabled: false, mode: offer.booking_mode, url: null, note: "Supplier checkout is not connected yet." };
    case "roavr_checkout":
      return { label: "Reserve", enabled: false, mode: offer.booking_mode, url: null, note: "Roavr checkout is not enabled yet." };
    case "direct_merchant_request":
      return { label: "Request with merchant", enabled: !!offer.booking_url, mode: offer.booking_mode, url: offer.booking_url, note: "Sends you to the merchant to confirm directly." };
    default:
      return { label: "Preview only", enabled: false, mode: "preview_only", url: null, note: "Not bookable yet." };
  }
}
