import type { Story, StoryView, StoryReaction, CheckIn, Memory, MapPin, Badge, AppNotification, GlobeStats } from "../types";
import { MOCK_USERS } from "./users";

const u = (i: number) => MOCK_USERS[i];

export const MOCK_STORIES: Story[] = [
  {
    id: "s-001", userId: "u-002", userName: u(1).name, userAvatar: u(1).avatarUrl,
    mediaUrl: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800", mediaType: "photo",
    caption: "Bali sunrise never gets old 🌅", locationName: "Ubud, Bali", latitude: -8.5069, longitude: 115.2625,
    tripId: null, filterName: "golden", visibility: "public", viewCount: 234,
    expiresAt: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(), autoSaveToGlobe: true,
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "s-002", userId: "u-004", userName: u(3).name, userAvatar: u(3).avatarUrl,
    mediaUrl: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=800", mediaType: "photo",
    caption: "Positano colors 🎨", locationName: "Positano, Italy", latitude: 40.6281, longitude: 14.4841,
    tripId: null, filterName: null, visibility: "public", viewCount: 1893,
    expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), autoSaveToGlobe: true,
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "s-003", userId: "u-005", userName: u(4).name, userAvatar: u(4).avatarUrl,
    mediaUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800", mediaType: "photo",
    caption: "Best tsukemen in Ikebukuro 🍜", locationName: "Tokyo, Japan", latitude: 35.7295, longitude: 139.7109,
    tripId: null, filterName: "warm", visibility: "public", viewCount: 89,
    expiresAt: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(), autoSaveToGlobe: true,
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "s-004", userId: "u-001", userName: u(0).name, userAvatar: u(0).avatarUrl,
    mediaUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800", mediaType: "photo",
    caption: "Missing this view 🏔️", locationName: "Swiss Alps", latitude: 46.8182, longitude: 8.2275,
    tripId: null, filterName: "crisp", visibility: "public", viewCount: 456,
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), autoSaveToGlobe: true,
    createdAt: new Date(Date.now() - 16 * 60 * 60 * 1000).toISOString(),
  },
];

export const MOCK_STORY_VIEWS: StoryView[] = [
  { id: "sv-1", storyId: "s-004", viewerId: "u-002", viewerName: u(1).name, viewerAvatar: u(1).avatarUrl, createdAt: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: "sv-2", storyId: "s-004", viewerId: "u-004", viewerName: u(3).name, viewerAvatar: u(3).avatarUrl, createdAt: new Date(Date.now() - 1 * 3600000).toISOString() },
];

export const MOCK_STORY_REACTIONS: StoryReaction[] = [
  { id: "sr-1", storyId: "s-004", userId: "u-002", emoji: "🔥", createdAt: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: "sr-2", storyId: "s-004", userId: "u-005", emoji: "😍", createdAt: new Date(Date.now() - 1 * 3600000).toISOString() },
];

export const MOCK_CHECKINS: CheckIn[] = [
  { id: "ci-1", userId: "u-001", locationName: "Shibuya Crossing, Tokyo", latitude: 35.6595, longitude: 139.7004, photo: "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=600", notes: "Incredible energy!", timestamp: "2025-12-15T14:30:00Z" },
  { id: "ci-2", userId: "u-001", locationName: "Blue Lagoon, Iceland", latitude: 63.8803, longitude: -22.4495, photo: "https://images.unsplash.com/photo-1515488764276-beab7607c1e6?w=600", notes: "So warm and surreal", timestamp: "2025-09-14T11:00:00Z" },
  { id: "ci-3", userId: "u-001", locationName: "Jemaa el-Fnaa, Marrakech", latitude: 31.6258, longitude: -7.9891, photo: "https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?w=600", notes: "Night market vibes 🌙", timestamp: "2025-11-16T20:00:00Z" },
];

export const MOCK_MEMORIES: Memory[] = [
  { id: "m-1", userId: "u-001", mediaUrl: "https://images.unsplash.com/photo-1504829857797-ddff29c27927?w=800", mediaType: "photo", caption: "Northern lights over Vik", locationName: "Vik, Iceland", latitude: 63.4186, longitude: -19.0060, tripId: "t-003", visibility: "public", pinnedToGlobe: true, source: "camera", sourceId: null, createdAt: "2025-09-15T22:30:00Z" },
  { id: "m-2", userId: "u-001", mediaUrl: "https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?w=800", mediaType: "photo", caption: "Lost in the souks", locationName: "Marrakech, Morocco", latitude: 31.6295, longitude: -7.9811, tripId: "t-004", visibility: "public", pinnedToGlobe: true, source: "story", sourceId: null, createdAt: "2025-11-16T15:00:00Z" },
  { id: "m-3", userId: "u-001", mediaUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800", mediaType: "photo", caption: "Summit vibes", locationName: "Zermatt, Switzerland", latitude: 46.0207, longitude: 7.7491, tripId: null, visibility: "followers", pinnedToGlobe: true, source: "upload", sourceId: null, createdAt: "2025-07-20T06:00:00Z" },
];

export const MOCK_MAP_PINS: MapPin[] = [
  { id: "mp-1", userId: "u-001", latitude: 35.6762, longitude: 139.6503, label: "Tokyo", description: "Upcoming trip!", category: "wishlist", linkedId: "t-001", visibility: "public", createdAt: "2026-05-01T00:00:00Z" },
  { id: "mp-2", userId: "u-001", latitude: 63.4186, longitude: -19.0060, label: "Vik, Iceland", description: "Northern lights spot", category: "memory", linkedId: "m-1", visibility: "public", createdAt: "2025-09-15T00:00:00Z" },
  { id: "mp-3", userId: "u-001", latitude: 31.6295, longitude: -7.9811, label: "Marrakech", description: "Amazing food & culture", category: "visited", linkedId: null, visibility: "public", createdAt: "2025-11-16T00:00:00Z" },
  { id: "mp-4", userId: "u-001", latitude: 40.6340, longitude: 14.6027, label: "Amalfi Coast", description: "Summer 2026 🌊", category: "wishlist", linkedId: "t-002", visibility: "public", createdAt: "2026-04-20T00:00:00Z" },
  { id: "mp-5", userId: "u-001", latitude: -33.8688, longitude: 151.2093, label: "Sydney", description: "Bucket list", category: "wishlist", linkedId: null, visibility: "public", createdAt: "2026-01-10T00:00:00Z" },
  { id: "mp-6", userId: "u-001", latitude: 48.8566, longitude: 2.3522, label: "Paris", description: "2024 trip", category: "visited", linkedId: null, visibility: "public", createdAt: "2024-05-20T00:00:00Z" },
];

export const MOCK_GLOBE_STATS: GlobeStats = {
  totalCountries: 27,
  totalCities: 64,
  totalCheckins: 187,
  totalMemories: 342,
  totalPins: 6,
  topContinent: "Europe",
  travelScore: 78,
  countriesList: ["Japan", "Iceland", "Morocco", "Italy", "France", "Switzerland", "Thailand", "Vietnam", "Mexico", "USA", "Canada", "UK", "Spain", "Portugal", "Greece", "Turkey", "Germany", "Netherlands", "Czech Republic", "Austria", "Croatia", "Peru", "Colombia", "South Korea", "Indonesia", "Australia", "New Zealand"],
};

export const MOCK_BADGES: Badge[] = [
  { id: "b-1", userId: "u-001", badgeName: "First Steps", badgeImage: null, category: "milestone", earnedDate: "2024-11-15", description: "Complete your first check-in" },
  { id: "b-2", userId: "u-001", badgeName: "Globe Trotter", badgeImage: null, category: "milestone", earnedDate: "2025-03-20", description: "Visit 10 countries" },
  { id: "b-3", userId: "u-001", badgeName: "Night Owl", badgeImage: null, category: "activity", earnedDate: "2025-09-15", description: "Check in after midnight" },
  { id: "b-4", userId: "u-001", badgeName: "Memory Maker", badgeImage: null, category: "social", earnedDate: "2025-11-16", description: "Create 100 memories" },
  { id: "b-5", userId: "u-001", badgeName: "Social Butterfly", badgeImage: null, category: "social", earnedDate: "2026-01-05", description: "Reach 1000 followers" },
  { id: "b-6", userId: "u-001", badgeName: "Foodie Explorer", badgeImage: null, category: "activity", earnedDate: "2025-06-10", description: "Check in at 25 restaurants" },
];

export const MOCK_NOTIFICATIONS: AppNotification[] = [
  { id: "n-1", userId: "u-001", type: "follow", title: "New follower", body: "Maya Chen started following you", actorId: "u-002", actorName: "Maya Chen", actorAvatar: MOCK_USERS[1].avatarUrl, data: {}, read: false, createdAt: new Date(Date.now() - 30 * 60000).toISOString() },
  { id: "n-2", userId: "u-001", type: "story_reaction", title: "Story reaction", body: "Kai Tanaka reacted 😍 to your story", actorId: "u-005", actorName: "Kai Tanaka", actorAvatar: MOCK_USERS[4].avatarUrl, data: { storyId: "s-004" }, read: false, createdAt: new Date(Date.now() - 60 * 60000).toISOString() },
  { id: "n-3", userId: "u-001", type: "badge", title: "New badge earned!", body: "You earned the Social Butterfly badge 🦋", actorId: null, actorName: null, actorAvatar: null, data: { badgeId: "b-5" }, read: true, createdAt: new Date(Date.now() - 24 * 3600000).toISOString() },
  { id: "n-4", userId: "u-001", type: "offer", title: "New offer nearby", body: "20% off at Coastal Kitchen in Austin", actorId: null, actorName: null, actorAvatar: null, data: { offerId: "o-1" }, read: true, createdAt: new Date(Date.now() - 48 * 3600000).toISOString() },
  { id: "n-5", userId: "u-001", type: "trip_invite", title: "Trip invitation", body: "Sofia invited you to join 'Greek Islands Hop'", actorId: "u-004", actorName: "Sofia Bergström", actorAvatar: MOCK_USERS[3].avatarUrl, data: {}, read: true, createdAt: new Date(Date.now() - 72 * 3600000).toISOString() },
];
