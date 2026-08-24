/**
 * Roavr billing contracts.
 *
 * Two hard rules encoded here:
 *  1. A *purchase* is a store-side event. It never, by itself, unlocks a feature.
 *  2. An *entitlement* is what the server says after verifying that purchase.
 *     The client only ever reads entitlements; it can never write one.
 */
import type { SubscriptionTier } from "@/data/types";

export type BillingPlatform = "apple" | "google" | "stripe" | "none";

/** Store product identifiers. These must match App Store Connect / Play Console exactly. */
export const PRODUCT_IDS = {
  plus_monthly: "app.roavr.plus.monthly",
  plus_yearly: "app.roavr.plus.yearly",
  pro_monthly: "app.roavr.pro.monthly",
  pro_yearly: "app.roavr.pro.yearly",
} as const;

export type ProductKey = keyof typeof PRODUCT_IDS;

export const PRODUCT_TIER: Record<ProductKey, Exclude<SubscriptionTier, "free">> = {
  plus_monthly: "plus",
  plus_yearly: "plus",
  pro_monthly: "pro",
  pro_yearly: "pro",
};

export function productKeyFor(tier: "plus" | "pro", period: "monthly" | "yearly"): ProductKey {
  return `${tier}_${period}` as ProductKey;
}

/** A product as the *store* reports it — localized price string included. */
export interface StoreProduct {
  key: ProductKey;
  productId: string;
  title: string;
  /** Localized, store-formatted price (e.g. "£7.99"). Never a hardcoded number. */
  displayPrice: string;
  period: "monthly" | "yearly";
  tier: "plus" | "pro";
}

/** Raw receipt material handed to the server for verification. Never trusted client-side. */
export interface PurchaseReceipt {
  platform: Exclude<BillingPlatform, "none" | "stripe">;
  productId: string;
  /** iOS: JWS signed transaction. Android: purchaseToken. */
  token: string;
  transactionId?: string;
}

export type BillingUnavailableReason =
  | "web_platform"
  | "plugin_missing"
  | "store_unavailable"
  | "products_not_configured";

export interface BillingAvailability {
  available: boolean;
  platform: BillingPlatform;
  reason?: BillingUnavailableReason;
  /** Owner-facing explanation; surfaced verbatim in the UI when unavailable. */
  message?: string;
}

export type PurchaseOutcome =
  | { status: "entitled"; tier: SubscriptionTier; expiresAt: string | null }
  | { status: "pending" }        // store is processing (Ask to Buy, deferred payment)
  | { status: "cancelled" }
  | { status: "unavailable"; reason: BillingUnavailableReason; message: string }
  | { status: "verification_failed"; message: string };

export type RestoreOutcome =
  | { status: "restored"; tier: SubscriptionTier; expiresAt: string | null }
  | { status: "nothing_to_restore" }
  | { status: "unavailable"; reason: BillingUnavailableReason; message: string }
  | { status: "verification_failed"; message: string };

/** Server-verified entitlement. This is the ONLY thing feature gates may read. */
export interface Entitlement {
  /** Effective tier after expiry/revocation is applied server-side. */
  tier: SubscriptionTier;
  /** Tier stored on the row, before expiry collapses it. */
  baseTier: SubscriptionTier;
  status: string;
  source: "none" | "app_store" | "play_store" | "stripe" | "manual_grant" | "trial";
  platform: BillingPlatform;
  productId: string | null;
  expiresAt: Date | null;
  autoRenew: boolean | null;
  lastVerifiedAt: Date | null;
  isTrialing: boolean;
  trialEndsAt: Date | null;
}

export const FREE_ENTITLEMENT: Entitlement = {
  tier: "free",
  baseTier: "free",
  status: "active",
  source: "none",
  platform: "none",
  productId: null,
  expiresAt: null,
  autoRenew: null,
  lastVerifiedAt: null,
  isTrialing: false,
  trialEndsAt: null,
};

export interface BillingApi {
  availability(): Promise<BillingAvailability>;
  listProducts(): Promise<StoreProduct[]>;
  purchase(key: ProductKey): Promise<PurchaseOutcome>;
  restore(): Promise<RestoreOutcome>;
  /** Deep-links to the OS subscription-management screen. */
  manageSubscriptionUrl(): string | null;
}
