import type { SubscriptionTier, PlanLimits, SubscriptionPlan } from "../data/types";

// ─── Plan Definitions ─────────────────────────────────────

export const PLANS: Record<SubscriptionTier, SubscriptionPlan> = {
  free: {
    tier: "free",
    name: "Roavr Free",
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      "1 active trip",
      "3 AI trip plans per month",
      "10 check-ins per month",
      "Basic Globe view",
      "Basic public profile",
      "Basic Discover",
      "Basic safety notes",
      "Basic stories (3/day)",
      "Standard messaging",
    ],
    limits: {
      maxTrips: 1,
      maxStoriesPerDay: 3,
      maxSavedPlaces: 10,
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
      "Unlimited check-ins",
      "Premium AI itineraries",
      "Advanced Globe customization",
      "Trip recaps & memory collections",
      "Premium badges",
      "Exclusive local offers",
      "Saved collections",
      "Enhanced stories & more filters",
      "Offline access (concept)",
    ],
    limits: {
      maxTrips: Infinity,
      maxStoriesPerDay: Infinity,
      maxSavedPlaces: 500,
      encryptedChats: false,
      vanishMode: false,
      aiItineraryGen: true,
      offlineAccess: true,
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
      "Group trip planning",
      "Shared itinerary voting",
      "Advanced safety tools",
      "Advanced travel analytics",
      "Creator profile tools",
      "Public map customization",
      "Private Travel Chats (E2E)",
      "Priority AI planning",
      "Early access to new features",
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

// ─── Free Tier Specific Limits ─────────────────────────────

export const FREE_LIMITS = {
  maxActiveTrips: 1,
  aiPlansPerMonth: 3,
  checkInsPerMonth: 10,
  storiesPerDay: 3,
  savedPlaces: 10,
};

// ─── Upgrade Trigger Definitions ──────────────────────────

export type UpgradeTrigger =
  | "ai_plan_limit"
  | "globe_customization"
  | "premium_filters"
  | "unlimited_stories"
  | "group_planning"
  | "advanced_safety"
  | "creator_profile"
  | "priority_ai"
  | "encrypted_chats"
  | "trip_limit"
  | "checkin_limit"
  | "offline_access"
  | "saved_places_limit";

export interface UpgradeTriggerConfig {
  trigger: UpgradeTrigger;
  title: string;
  description: string;
  requiredTier: SubscriptionTier;
  emoji: string;
  ctaLabel: string;
}

export const UPGRADE_TRIGGERS: Record<UpgradeTrigger, UpgradeTriggerConfig> = {
  ai_plan_limit: {
    trigger: "ai_plan_limit",
    title: "You've used all your AI plans this month",
    description: "Upgrade to Roavr Plus for unlimited AI-powered trip planning with premium recommendations.",
    requiredTier: "plus",
    emoji: "🧠",
    ctaLabel: "Unlock Unlimited AI Planning",
  },
  globe_customization: {
    trigger: "globe_customization",
    title: "Customize your Globe",
    description: "Advanced map styles, pin customization, and memory collections are available with Roavr Plus.",
    requiredTier: "plus",
    emoji: "🌍",
    ctaLabel: "Upgrade for Globe Pro",
  },
  premium_filters: {
    trigger: "premium_filters",
    title: "Premium camera filters",
    description: "Unlock cinematic, vintage, and travel-inspired filters to make your memories stand out.",
    requiredTier: "plus",
    emoji: "📸",
    ctaLabel: "Unlock Premium Filters",
  },
  unlimited_stories: {
    trigger: "unlimited_stories",
    title: "More stories, more memories",
    description: "Share unlimited stories per day and access the advanced story archive with Roavr Plus.",
    requiredTier: "plus",
    emoji: "✨",
    ctaLabel: "Go Unlimited",
  },
  group_planning: {
    trigger: "group_planning",
    title: "Plan trips together",
    description: "Group trip planning with shared itinerary voting is a Roavr Pro feature.",
    requiredTier: "pro",
    emoji: "👥",
    ctaLabel: "Unlock Group Planning",
  },
  advanced_safety: {
    trigger: "advanced_safety",
    title: "Advanced safety tools",
    description: "Live location sharing, real-time safety alerts, and enhanced emergency features are available with Roavr Pro.",
    requiredTier: "pro",
    emoji: "🛡️",
    ctaLabel: "Upgrade for Advanced Safety",
  },
  creator_profile: {
    trigger: "creator_profile",
    title: "Creator profile tools",
    description: "Custom public profile, analytics, and audience tools help you build your travel brand with Roavr Pro.",
    requiredTier: "pro",
    emoji: "⭐",
    ctaLabel: "Become a Creator",
  },
  priority_ai: {
    trigger: "priority_ai",
    title: "Priority AI planning",
    description: "Skip the queue and get faster, more detailed AI itineraries with Roavr Pro.",
    requiredTier: "pro",
    emoji: "⚡",
    ctaLabel: "Get Priority Access",
  },
  encrypted_chats: {
    trigger: "encrypted_chats",
    title: "Private Travel Chats",
    description: "End-to-end encrypted messaging for your most private travel conversations. Available with Roavr Pro.",
    requiredTier: "pro",
    emoji: "🔒",
    ctaLabel: "Unlock Private Chats",
  },
  trip_limit: {
    trigger: "trip_limit",
    title: "You've reached your trip limit",
    description: "Free accounts can have 1 active trip. Upgrade to Roavr Plus for unlimited trips.",
    requiredTier: "plus",
    emoji: "✈️",
    ctaLabel: "Unlock Unlimited Trips",
  },
  checkin_limit: {
    trigger: "checkin_limit",
    title: "Check-in limit reached",
    description: "You've used all 10 free check-ins this month. Upgrade for unlimited check-ins.",
    requiredTier: "plus",
    emoji: "📍",
    ctaLabel: "Unlock Unlimited Check-ins",
  },
  offline_access: {
    trigger: "offline_access",
    title: "Take Roavr offline",
    description: "Download maps and itineraries for offline access while traveling without data.",
    requiredTier: "plus",
    emoji: "📱",
    ctaLabel: "Enable Offline Access",
  },
  saved_places_limit: {
    trigger: "saved_places_limit",
    title: "Save more places",
    description: "You've reached the free limit for saved places. Upgrade for more.",
    requiredTier: "plus",
    emoji: "💾",
    ctaLabel: "Expand Your Collection",
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

export function shouldTriggerUpgrade(tier: SubscriptionTier, trigger: UpgradeTrigger): boolean {
  const config = UPGRADE_TRIGGERS[trigger];
  if (!config) return false;
  const tierOrder: SubscriptionTier[] = ["free", "plus", "pro"];
  return tierOrder.indexOf(tier) < tierOrder.indexOf(config.requiredTier);
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
