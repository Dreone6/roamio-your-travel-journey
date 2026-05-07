import type { Trip, TripDay, ItineraryItem, SavedPlace } from "../types";

export const MOCK_TRIPS: Trip[] = [
  {
    id: "t-001", userId: "u-001", title: "Tokyo Adventure", destination: "Tokyo, Japan",
    startDate: "2026-06-10", endDate: "2026-06-20", budget: 3500, travelers: 2,
    tripStyle: "cultural", pace: "balanced", dietary: "none", interests: ["temples", "ramen", "street fashion"],
    status: "planning", coverImage: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800", createdAt: "2026-05-01T00:00:00Z",
  },
  {
    id: "t-002", userId: "u-001", title: "Amalfi Coast Road Trip", destination: "Amalfi, Italy",
    startDate: "2026-08-01", endDate: "2026-08-08", budget: 4200, travelers: 2,
    tripStyle: "romantic", pace: "relaxed", dietary: "vegetarian", interests: ["wine", "beaches", "hiking"],
    status: "planning", coverImage: "https://images.unsplash.com/photo-1534113414509-0eec2bfb493f?w=800", createdAt: "2026-04-20T00:00:00Z",
  },
  {
    id: "t-003", userId: "u-001", title: "Iceland Ring Road", destination: "Reykjavik, Iceland",
    startDate: "2025-09-12", endDate: "2025-09-22", budget: 5000, travelers: 1,
    tripStyle: "adventure", pace: "fast", dietary: null, interests: ["northern lights", "glaciers", "hot springs"],
    status: "completed", coverImage: "https://images.unsplash.com/photo-1504829857797-ddff29c27927?w=800", createdAt: "2025-08-01T00:00:00Z",
  },
  {
    id: "t-004", userId: "u-001", title: "Marrakech Weekend", destination: "Marrakech, Morocco",
    startDate: "2025-11-15", endDate: "2025-11-18", budget: 1200, travelers: 3,
    tripStyle: "cultural", pace: "balanced", dietary: null, interests: ["souks", "riads", "spices"],
    status: "completed", coverImage: "https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?w=800", createdAt: "2025-10-20T00:00:00Z",
  },
];

export const MOCK_TRIP_DAYS: TripDay[] = [
  { id: "td-1", tripId: "t-001", dayNumber: 1, date: "2026-06-10", title: "Arrival & Shibuya", notes: null },
  { id: "td-2", tripId: "t-001", dayNumber: 2, date: "2026-06-11", title: "Asakusa & Akihabara", notes: null },
  { id: "td-3", tripId: "t-001", dayNumber: 3, date: "2026-06-12", title: "Day Trip to Kamakura", notes: null },
  { id: "td-4", tripId: "t-001", dayNumber: 4, date: "2026-06-13", title: "Harajuku & Meiji Shrine", notes: null },
];

export const MOCK_ITINERARY: ItineraryItem[] = [
  { id: "ii-1", tripId: "t-001", userId: "u-001", dayNumber: 1, timeBlock: "morning", time: "10:00", activity: "Check in at Hotel Gracery Shinjuku", location: "Shinjuku", description: "Godzilla head on the roof!", estimatedCost: 0, type: "accommodation", notes: null, completed: false },
  { id: "ii-2", tripId: "t-001", userId: "u-001", dayNumber: 1, timeBlock: "afternoon", time: "14:00", activity: "Explore Shibuya Crossing", location: "Shibuya", description: "World's busiest intersection", estimatedCost: 0, type: "sightseeing", notes: null, completed: false },
  { id: "ii-3", tripId: "t-001", userId: "u-001", dayNumber: 1, timeBlock: "evening", time: "19:00", activity: "Ramen at Ichiran", location: "Shibuya", description: "Famous solo booth ramen", estimatedCost: 15, type: "food", notes: null, completed: false },
  { id: "ii-4", tripId: "t-001", userId: "u-001", dayNumber: 2, timeBlock: "morning", time: "08:00", activity: "Senso-ji Temple", location: "Asakusa", description: "Tokyo's oldest temple", estimatedCost: 0, type: "sightseeing", notes: null, completed: false },
  { id: "ii-5", tripId: "t-001", userId: "u-001", dayNumber: 2, timeBlock: "afternoon", time: "13:00", activity: "Akihabara Electric Town", location: "Akihabara", description: "Electronics and anime paradise", estimatedCost: 50, type: "shopping", notes: null, completed: false },
];

export const MOCK_SAVED_PLACES: SavedPlace[] = [
  { id: "sp-1", userId: "u-001", name: "Blue Bottle Coffee Shibuya", address: "Shibuya, Tokyo", latitude: 35.6595, longitude: 139.7004, category: "cafe", notes: "Great pour-over", tripId: "t-001", createdAt: "2026-05-03T00:00:00Z" },
  { id: "sp-2", userId: "u-001", name: "Path of the Gods", address: "Amalfi Coast, Italy", latitude: 40.6340, longitude: 14.6027, category: "hiking", notes: "Spectacular coastal views", tripId: "t-002", createdAt: "2026-04-21T00:00:00Z" },
  { id: "sp-3", userId: "u-001", name: "Golden Circle Route", address: "Iceland", latitude: 64.3271, longitude: -20.1199, category: "road", notes: "Must-do day trip", tripId: "t-003", createdAt: "2025-08-10T00:00:00Z" },
  { id: "sp-4", userId: "u-001", name: "Jemaa el-Fnaa", address: "Marrakech, Morocco", latitude: 31.6258, longitude: -7.9891, category: "landmark", notes: "Best at night", tripId: "t-004", createdAt: "2025-10-22T00:00:00Z" },
];
