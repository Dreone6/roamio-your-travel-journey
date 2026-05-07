import type { SubscriptionTier, PlanLimits, SubscriptionPlan } from "../data/types";

// ─── Plan Definitions ─────────────────────────────────────

export const PLANS: Record<SubscriptionTier, SubscriptionPlan> = {
  free: {
    tier: "free",
    name: "Roavr Free",
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      "3 trips per year",
      "Basic itinerary generation",
      "Public stories",
      "Standard messaging",
      "Globe with check-ins",
    ],
    limits: {
      maxTrips: 3,
      maxStoriesPerDay: 3,
      maxSavedPlaces: 20,
      encryptedChats: false,
      vanishMode: false,
      aiItineraryGen: true,
      offlineAccess: false,
      expertBooking: false,
      customMapStyles: false,
      prioritySupport: false,
    },
  },
  plus: {
    tier: "plus",
    name: "Roavr Plus",
    priceMonthly: 7.99,
    priceYearly: 59.99,
    features: [
      "Unlimited trips",
      "AI itinerary with smart recommendations",
      "Unlimited stories",
      "Private travel chats (E2E)",
      "Full Globe with memories",
      "Local offers & discounts",
      "Custom map styles",
    ],
    limits: {
      maxTrips: Infinity,
      maxStoriesPerDay: Infinity,
      maxSavedPlaces: 500,
      encryptedChats: true,
      vanishMode: false,
      aiItineraryGen: true,
      offlineAccess: false,
      expertBooking: false,
      customMapStyles: true,
      prioritySupport: false,
    },
  },
  pro: {
    tier: "pro",
    name: "Roavr Pro",
    priceMonthly: 14.99,
    priceYearly: 119.99,
    features: [
      "Everything in Plus",
      "Vanish mode messaging",
      "Offline access & maps",
      "Expert booking",
      "Priority support",
      "Advanced travel analytics",
      "Unlimited saved places",
    ],
    limits: {
      maxTrips: Infinity,
      maxStoriesPerDay: Infinity,
      maxSavedPlaces: Infinity,
      encryptedChats: true,
      vanishMode: true,
      aiItineraryGen: true,
      offlineAccess: true,
      expertBooking: true,
      customMapStyles: true,
      prioritySupport: true,
    },
  },
};

// ─── Feature Gate Helpers ─────────────────────────────────

export function getPlanLimits(tier: SubscriptionTier): PlanLimits {
  return PLANS[tier].limits;
}

export function canUseFeature(tier: SubscriptionTier, feature: keyof PlanLimits): boolean {
  const limits = getPlanLimits(tier);
  const value = limits[feature];
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  return false;
}

export function isWithinLimit(tier: SubscriptionTier, feature: keyof PlanLimits, currentCount: number): boolean {
  const limits = getPlanLimits(tier);
  const value = limits[feature];
  if (typeof value === "number") return currentCount < value;
  return true;
}

export function getRequiredTier(feature: keyof PlanLimits): SubscriptionTier {
  if (PLANS.free.limits[feature]) return "free";
  if (PLANS.plus.limits[feature]) return "plus";
  return "pro";
}

export function getUpgradeMessage(feature: keyof PlanLimits): string {
  const tier = getRequiredTier(feature);
  const plan = PLANS[tier];
  const FEATURE_LABELS: Record<string, string> = {
    encryptedChats: "Private travel chats",
    vanishMode: "Vanish mode",
    offlineAccess: "Offline access",
    expertBooking: "Expert booking",
    customMapStyles: "Custom map styles",
    prioritySupport: "Priority support",
  };
  const label = FEATURE_LABELS[feature] ?? feature;
  return `${label} requires ${plan.name}. Upgrade to unlock this feature.`;
}
