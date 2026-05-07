import type { Profile, Follower, PrivacySettings } from "../types";

export const CURRENT_USER: Profile = {
  id: "u-001",
  email: "alex@roavr.com",
  name: "Alex Rivera",
  avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces",
  bio: "Explorer at heart. 27 countries and counting 🌍",
  homeCity: "Austin, TX",
  travelStyle: "adventure",
  interests: ["hiking", "street food", "photography", "history"],
  memberSince: "2024-11-15T00:00:00Z",
  onboardingCompleted: true,
  referralCode: "ALEXR8K2",
  subscription: "plus",
  totalTrips: 12,
  totalCountries: 27,
  totalCities: 64,
  totalCheckIns: 187,
  totalMemories: 342,
  totalFollowers: 1243,
  totalFollowing: 318,
  verified: true,
};

export const MOCK_USERS: Profile[] = [
  CURRENT_USER,
  {
    id: "u-002", email: "maya@example.com", name: "Maya Chen", avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=faces",
    bio: "Digital nomad 🏝️ Currently in Bali", homeCity: "San Francisco, CA", travelStyle: "cultural", interests: ["yoga", "surfing", "temples"],
    memberSince: "2025-01-20T00:00:00Z", onboardingCompleted: true, referralCode: "MAYAC4X1", subscription: "pro",
    totalTrips: 23, totalCountries: 41, totalCities: 112, totalCheckIns: 456, totalMemories: 890, totalFollowers: 8920, totalFollowing: 412, verified: true,
  },
  {
    id: "u-003", email: "james@example.com", name: "James Okafor", avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces",
    bio: "Budget traveler | 🎒 Backpacking SE Asia", homeCity: "London, UK", travelStyle: "budget", interests: ["hostels", "local food", "trains"],
    memberSince: "2025-03-10T00:00:00Z", onboardingCompleted: true, referralCode: "JAMESOQ9", subscription: "free",
    totalTrips: 8, totalCountries: 15, totalCities: 38, totalCheckIns: 92, totalMemories: 156, totalFollowers: 342, totalFollowing: 187, verified: false,
  },
  {
    id: "u-004", email: "sofia@example.com", name: "Sofia Bergström", avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=faces",
    bio: "Travel photographer 📷 | Chasing golden hours", homeCity: "Stockholm, Sweden", travelStyle: "luxury", interests: ["photography", "wine", "architecture"],
    memberSince: "2024-08-05T00:00:00Z", onboardingCompleted: true, referralCode: "SOFIAB7Z", subscription: "pro",
    totalTrips: 31, totalCountries: 52, totalCities: 143, totalCheckIns: 621, totalMemories: 1847, totalFollowers: 24100, totalFollowing: 290, verified: true,
  },
  {
    id: "u-005", email: "kai@example.com", name: "Kai Tanaka", avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=faces",
    bio: "Foodie traveler 🍜 | Always searching for the best ramen", homeCity: "Tokyo, Japan", travelStyle: "foodie", interests: ["ramen", "street markets", "cooking classes"],
    memberSince: "2025-02-14T00:00:00Z", onboardingCompleted: true, referralCode: "KAIT5W3", subscription: "plus",
    totalTrips: 16, totalCountries: 19, totalCities: 57, totalCheckIns: 312, totalMemories: 478, totalFollowers: 2310, totalFollowing: 445, verified: false,
  },
];

export const MOCK_FOLLOWERS: Follower[] = [
  { id: "f-1", userId: "u-002", name: "Maya Chen", avatarUrl: MOCK_USERS[1].avatarUrl, bio: MOCK_USERS[1].bio, isFollowingBack: true },
  { id: "f-2", userId: "u-003", name: "James Okafor", avatarUrl: MOCK_USERS[2].avatarUrl, bio: MOCK_USERS[2].bio, isFollowingBack: false },
  { id: "f-3", userId: "u-004", name: "Sofia Bergström", avatarUrl: MOCK_USERS[3].avatarUrl, bio: MOCK_USERS[3].bio, isFollowingBack: true },
  { id: "f-4", userId: "u-005", name: "Kai Tanaka", avatarUrl: MOCK_USERS[4].avatarUrl, bio: MOCK_USERS[4].bio, isFollowingBack: true },
];

export const MOCK_PRIVACY: PrivacySettings = {
  userId: "u-001",
  publicMapEnabled: true,
  defaultStoryVisibility: "public",
  messagePermission: "everyone",
  autoSaveStories: "auto",
  showOnlineStatus: true,
  allowTagging: "followers",
  showTravelStats: true,
};
