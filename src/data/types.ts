// ─── Enums ───────────────────────────────────────────────

export type SubscriptionTier = "free" | "plus" | "pro";
export type Visibility = "public" | "followers" | "private";
export type RelationshipPermission = "everyone" | "followers" | "mutual" | "nobody";
export type TripStatus = "planning" | "active" | "completed" | "cancelled";
export type TripStyle = "adventure" | "relaxation" | "cultural" | "foodie" | "budget" | "luxury" | "solo" | "family" | "romantic";
export type TimeBlock = "morning" | "afternoon" | "evening" | "night";
export type ItineraryType = "activity" | "food" | "transport" | "accommodation" | "sightseeing" | "shopping";
export type MediaType = "photo" | "video";
export type EncryptionMode = "standard" | "private" | "vanish";
export type MessageType = "text" | "image" | "location" | "trip" | "memory" | "map_pin" | "story_reply" | "offer" | "expert" | "globe";
export type FollowStatus = "pending" | "accepted" | "rejected";
export type ChallengeStatus = "active" | "completed" | "expired";
export type OfferCategory = "food" | "stay" | "experience" | "transport" | "shopping" | "wellness" | "nightlife" | "other";
export type NotificationType = "follow" | "like" | "comment" | "message" | "story_reaction" | "trip_invite" | "badge" | "offer" | "system";
export type SafetyLevel = "safe" | "caution" | "alert";
export type ExpertCategory = "guide" | "photographer" | "translator" | "driver" | "chef" | "instructor" | "host";

// ─── Core Entities ───────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  homeCity: string | null;
  travelStyle: TripStyle | null;
  interests: string[];
  memberSince: string;
  onboardingCompleted: boolean;
  referralCode: string;
  subscription: SubscriptionTier;
}

export interface Profile extends User {
  totalTrips: number;
  totalCountries: number;
  totalCities: number;
  totalCheckIns: number;
  totalMemories: number;
  totalFollowers: number;
  totalFollowing: number;
  verified: boolean;
}

// ─── Trips ───────────────────────────────────────────────

export interface Trip {
  id: string;
  userId: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number | null;
  travelers: number;
  tripStyle: TripStyle | null;
  pace: string | null;
  dietary: string | null;
  interests: string[];
  status: TripStatus;
  coverImage: string | null;
  createdAt: string;
}

export interface TripDay {
  id: string;
  tripId: string;
  dayNumber: number;
  date: string;
  title: string | null;
  notes: string | null;
}

export interface ItineraryItem {
  id: string;
  tripId: string;
  userId: string;
  dayNumber: number;
  timeBlock: TimeBlock;
  time: string | null;
  activity: string;
  location: string | null;
  description: string | null;
  estimatedCost: number | null;
  type: ItineraryType;
  notes: string | null;
  completed: boolean;
}

export interface SavedPlace {
  id: string;
  userId: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  category: string;
  notes: string | null;
  tripId: string | null;
  createdAt: string;
}

// ─── Check-ins & Memories ────────────────────────────────

export interface CheckIn {
  id: string;
  userId: string;
  locationName: string;
  latitude: number | null;
  longitude: number | null;
  photo: string | null;
  notes: string | null;
  timestamp: string;
}

export interface Memory {
  id: string;
  userId: string;
  mediaUrl: string;
  mediaType: MediaType;
  caption: string | null;
  locationName: string | null;
  latitude: number | null;
  longitude: number | null;
  tripId: string | null;
  visibility: Visibility;
  pinnedToGlobe: boolean;
  source: "camera" | "story" | "upload";
  sourceId: string | null;
  createdAt: string;
}

// ─── Stories ─────────────────────────────────────────────

export interface Story {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  mediaUrl: string;
  mediaType: MediaType;
  caption: string | null;
  locationName: string | null;
  latitude: number | null;
  longitude: number | null;
  tripId: string | null;
  filterName: string | null;
  visibility: Visibility;
  viewCount: number;
  expiresAt: string;
  autoSaveToGlobe: boolean;
  createdAt: string;
}

export interface StoryView {
  id: string;
  storyId: string;
  viewerId: string;
  viewerName: string;
  viewerAvatar: string | null;
  createdAt: string;
}

export interface StoryReaction {
  id: string;
  storyId: string;
  userId: string;
  emoji: string;
  createdAt: string;
}

// ─── Map & Globe ─────────────────────────────────────────

export interface MapPin {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  label: string;
  description: string | null;
  category: "visited" | "wishlist" | "memory" | "checkin" | "tip" | "sponsored";
  linkedId: string | null;
  visibility: Visibility;
  createdAt: string;
}

export interface GlobeStats {
  totalCountries: number;
  totalCities: number;
  totalCheckins: number;
  totalMemories: number;
  totalPins: number;
  topContinent: string;
  travelScore: number;
  countriesList: string[];
}

// ─── Social ──────────────────────────────────────────────

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  status: FollowStatus;
  createdAt: string;
}

export interface Follower {
  id: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  isFollowingBack: boolean;
}

// ─── Messaging ───────────────────────────────────────────

export interface Conversation {
  id: string;
  type: "direct" | "group" | "trip";
  title: string | null;
  encryptionMode: EncryptionMode;
  vanishAfterSeconds: number | null;
  createdBy: string;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  participants: ConversationParticipant[];
  unreadCount: number;
}

export interface ConversationParticipant {
  id: string;
  conversationId: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  role: "owner" | "admin" | "member";
  muted: boolean;
  lastReadAt: string | null;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  content: string | null;
  messageType: MessageType;
  mediaUrl: string | null;
  metadata: Record<string, unknown>;
  encrypted: boolean;
  expiresAt: string | null;
  readBy: string[];
  reactions: MessageReaction[];
  createdAt: string;
}

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
}

export interface MessageRequest {
  id: string;
  conversationId: string;
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar: string | null;
  preview: string;
  createdAt: string;
}

// ─── Shared Objects (in-chat) ────────────────────────────

export interface SharedTripObject {
  id: string;
  messageId: string;
  tripId: string;
  tripTitle: string;
  destination: string;
  startDate: string;
}

export interface SharedMapPin {
  id: string;
  messageId: string;
  pinId: string;
  label: string;
  latitude: number;
  longitude: number;
}

export interface SharedMemory {
  id: string;
  messageId: string;
  memoryId: string;
  mediaUrl: string;
  caption: string | null;
}

// ─── Local Offers & Experts ──────────────────────────────

export interface LocalOffer {
  id: string;
  businessName: string;
  offerDescription: string;
  discount: string | null;
  category: OfferCategory;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  image: string | null;
  active: boolean;
  partnerId: string | null;
  commissionRate: number;
  contactEmail: string | null;
  contactPhone: string | null;
  createdAt: string;
}

export interface OfferClaim {
  id: string;
  userId: string;
  offerId: string;
  claimedAt: string;
  redeemedAt: string | null;
  code: string;
}

export interface LocalExpert {
  id: string;
  userId: string;
  name: string;
  avatarUrl: string | null;
  category: ExpertCategory;
  location: string;
  bio: string;
  languages: string[];
  rating: number;
  totalReviews: number;
  pricePerHour: number;
  currency: string;
  verified: boolean;
  available: boolean;
  createdAt: string;
}

export interface ExpertReview {
  id: string;
  expertId: string;
  reviewerId: string;
  reviewerName: string;
  reviewerAvatar: string | null;
  rating: number;
  comment: string;
  createdAt: string;
}

// ─── Badges ──────────────────────────────────────────────

export interface Badge {
  id: string;
  userId: string;
  badgeName: string;
  badgeImage: string | null;
  category: string | null;
  earnedDate: string;
  description: string;
}

// ─── Subscriptions ───────────────────────────────────────

export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  status: "active" | "cancelled" | "past_due" | "trialing";
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
}

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  limits: PlanLimits;
}

export interface PlanLimits {
  maxTrips: number;
  maxStoriesPerDay: number;
  maxSavedPlaces: number;
  encryptedChats: boolean;
  vanishMode: boolean;
  aiItineraryGen: boolean;
  offlineAccess: boolean;
  expertBooking: boolean;
  customMapStyles: boolean;
  prioritySupport: boolean;
}

// ─── Referrals ───────────────────────────────────────────

export interface Referral {
  id: string;
  referrerId: string;
  referredEmail: string | null;
  referredId: string | null;
  referralCode: string;
  status: "pending" | "accepted" | "rewarded";
  rewardGranted: boolean;
  createdAt: string;
}

// ─── Safety ──────────────────────────────────────────────

export interface SafetyNote {
  id: string;
  userId: string;
  locationName: string;
  latitude: number | null;
  longitude: number | null;
  level: SafetyLevel;
  note: string;
  source: "user" | "system" | "embassy";
  createdAt: string;
}

export interface TrustedContact {
  id: string;
  userId: string;
  name: string;
  phone: string | null;
  email: string | null;
  relationship: string;
  shareLocation: boolean;
  notifyOnCheckin: boolean;
}

// ─── Notifications ───────────────────────────────────────

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string | null;
  actorId: string | null;
  actorName: string | null;
  actorAvatar: string | null;
  data: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

// ─── Privacy Settings ────────────────────────────────────

export interface PrivacySettings {
  userId: string;
  publicMapEnabled: boolean;
  defaultStoryVisibility: Visibility;
  messagePermission: RelationshipPermission;
  autoSaveStories: "auto" | "ask" | "never";
  showOnlineStatus: boolean;
  allowTagging: RelationshipPermission;
  showTravelStats: boolean;
}
