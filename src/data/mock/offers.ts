import type { LocalOffer, OfferClaim, LocalExpert, ExpertReview, SafetyNote, TrustedContact, Referral } from "../types";

export const MOCK_OFFERS: LocalOffer[] = [
  { id: "o-1", businessName: "Coastal Kitchen", offerDescription: "20% off any brunch entrée for Roavr travelers", discount: "20% off", category: "food", address: "1204 San Antonio St, Austin TX", latitude: 30.2672, longitude: -97.7431, image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600", active: true, partnerId: "p-1", commissionRate: 8, contactEmail: "hello@coastalkitchen.com", contactPhone: null, createdAt: "2026-03-01T00:00:00Z" },
  { id: "o-2", businessName: "Sakura Onsen", offerDescription: "Free towel rental with day pass purchase", discount: "Free towel", category: "wellness", address: "Beppu, Oita Prefecture, Japan", latitude: 33.2846, longitude: 131.4913, image: "https://images.unsplash.com/photo-1540555700478-4be289fbec6b?w=600", active: true, partnerId: "p-2", commissionRate: 5, contactEmail: null, contactPhone: null, createdAt: "2026-02-15T00:00:00Z" },
  { id: "o-3", businessName: "Riad Yasmine", offerDescription: "10% off 3+ night stays for Roavr members", discount: "10% off", category: "stay", address: "Marrakech Medina, Morocco", latitude: 31.6295, longitude: -7.9811, image: "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?w=600", active: true, partnerId: "p-3", commissionRate: 12, contactEmail: "book@riadyasmine.com", contactPhone: null, createdAt: "2026-01-20T00:00:00Z" },
  { id: "o-4", businessName: "Vespa Amalfi Rentals", offerDescription: "Free helmet + map with half-day Vespa rental", discount: "Free extras", category: "transport", address: "Amalfi, Italy", latitude: 40.6340, longitude: 14.6027, image: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600", active: true, partnerId: null, commissionRate: 10, contactEmail: null, contactPhone: "+39 089 871 234", createdAt: "2026-04-10T00:00:00Z" },
];

export const MOCK_OFFER_CLAIMS: OfferClaim[] = [
  { id: "oc-1", userId: "u-001", offerId: "o-1", claimedAt: "2026-04-15T12:00:00Z", redeemedAt: "2026-04-16T11:30:00Z", code: "ROAVR-CK20" },
];

export const MOCK_EXPERTS: LocalExpert[] = [
  { id: "ex-1", userId: "u-010", name: "Yuki Hayashi", avatarUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&crop=faces", category: "guide", location: "Tokyo, Japan", bio: "Born & raised in Tokyo. I'll show you the real city — hidden alleyways, tiny bars, and secret ramen spots.", languages: ["Japanese", "English"], rating: 4.9, totalReviews: 127, pricePerHour: 45, currency: "USD", verified: true, available: true, createdAt: "2025-06-01T00:00:00Z" },
  { id: "ex-2", userId: "u-011", name: "Amira Benali", avatarUrl: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&h=200&fit=crop&crop=faces", category: "guide", location: "Marrakech, Morocco", bio: "Medina expert and storyteller. I specialize in cultural tours, souk navigation, and traditional cooking.", languages: ["Arabic", "French", "English"], rating: 4.8, totalReviews: 89, pricePerHour: 30, currency: "USD", verified: true, available: true, createdAt: "2025-08-15T00:00:00Z" },
  { id: "ex-3", userId: "u-012", name: "Luca Moretti", avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces", category: "photographer", location: "Amalfi Coast, Italy", bio: "Professional travel photographer. I capture your trip in cinematic style — couples, families, solo adventures.", languages: ["Italian", "English"], rating: 5.0, totalReviews: 54, pricePerHour: 80, currency: "EUR", verified: true, available: true, createdAt: "2025-05-10T00:00:00Z" },
  { id: "ex-4", userId: "u-013", name: "Sigrun Jónsdóttir", avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=faces", category: "driver", location: "Reykjavik, Iceland", bio: "Super jeep driver and nature guide. Northern lights, glaciers, highlands — I know every trail.", languages: ["Icelandic", "English", "Danish"], rating: 4.7, totalReviews: 201, pricePerHour: 60, currency: "USD", verified: true, available: false, createdAt: "2025-03-20T00:00:00Z" },
];

export const MOCK_EXPERT_REVIEWS: ExpertReview[] = [
  { id: "er-1", expertId: "ex-1", reviewerId: "u-002", reviewerName: "Maya Chen", reviewerAvatar: null, rating: 5, comment: "Yuki took us to places we'd never find on our own. Absolutely incredible night out in Golden Gai!", createdAt: "2026-01-15T00:00:00Z" },
  { id: "er-2", expertId: "ex-3", reviewerId: "u-004", reviewerName: "Sofia Bergström", reviewerAvatar: null, rating: 5, comment: "Luca's photos were magazine quality. Best investment of the entire trip.", createdAt: "2025-09-20T00:00:00Z" },
];

export const MOCK_SAFETY_NOTES: SafetyNote[] = [
  { id: "sn-1", userId: "u-001", locationName: "Marrakech Medina", latitude: 31.6295, longitude: -7.9811, level: "caution", note: "Watch for pickpockets in crowded souks. Keep valuables in front pockets.", source: "user", createdAt: "2025-11-17T00:00:00Z" },
  { id: "sn-2", userId: "u-001", locationName: "Reykjavik", latitude: 64.1466, longitude: -21.9426, level: "safe", note: "Very safe city. Roads can be icy in winter — drive carefully.", source: "system", createdAt: "2025-09-12T00:00:00Z" },
];

export const MOCK_TRUSTED_CONTACTS: TrustedContact[] = [
  { id: "tc-1", userId: "u-001", name: "Mom", phone: "+1-555-0101", email: "mom@family.com", relationship: "Parent", shareLocation: true, notifyOnCheckin: true },
  { id: "tc-2", userId: "u-001", name: "Sarah Rivera", phone: "+1-555-0202", email: null, relationship: "Sister", shareLocation: true, notifyOnCheckin: false },
];

export const MOCK_REFERRALS: Referral[] = [
  { id: "ref-1", referrerId: "u-001", referredEmail: "friend1@example.com", referredId: null, referralCode: "ALEXR8K2", status: "pending", rewardGranted: false, createdAt: "2026-04-01T00:00:00Z" },
  { id: "ref-2", referrerId: "u-001", referredEmail: "james@example.com", referredId: "u-003", referralCode: "ALEXR8K2", status: "rewarded", rewardGranted: true, createdAt: "2025-12-10T00:00:00Z" },
];
