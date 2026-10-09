/**
 * Pricing UI checkout gate.
 *
 * Premium purchases must only ever start from a real store checkout that is
 * verified server-side. That checkout is not live yet, so the pricing UI must
 * never offer a purchasable premium button. Keep this flag false until the
 * store products, receipt verification, and store review are all in place.
 */
export const PREMIUM_CHECKOUT_AVAILABLE = false;

export const FREE_CTA_LABEL = "Get Started Free";
export const PREMIUM_CTA_LABEL = "Coming Soon";

export interface PricingCta {
  label: string;
  /** When false the button is disabled and must not carry a click handler. */
  enabled: boolean;
  /** Only the free tier routes into the app; premium tiers do not navigate. */
  navigates: boolean;
}

export function pricingCta(tierId: string): PricingCta {
  if (tierId === "free") {
    return { label: FREE_CTA_LABEL, enabled: true, navigates: true };
  }
  return {
    label: PREMIUM_CTA_LABEL,
    enabled: PREMIUM_CHECKOUT_AVAILABLE,
    navigates: false,
  };
}
