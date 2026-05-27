import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";

// Lightweight global store. Page-level data still flows through React Query;
// this is for cross-page ephemeral state (active trip context, globe UI state,
// notification badge, offline flag, current location).

interface UserSlice {
  profile: Record<string, any> | null;
  session: Session | null;
  authUser: User | null;
  isLoading: boolean;
  setUser: (u: Partial<Pick<UserSlice, "profile" | "session" | "authUser" | "isLoading">>) => void;
}

interface ActiveTripSlice {
  trip: Record<string, any> | null;
  itinerary: any[];
  members: any[];
  setActiveTrip: (t: Partial<Pick<ActiveTripSlice, "trip" | "itinerary" | "members">>) => void;
  clearActiveTrip: () => void;
}

type GlobeTab = "world" | "trophies" | "timeline";
interface GlobeSlice {
  visitedCountries: string[];
  pins: any[];
  landmarks: any[];
  activeTab: GlobeTab;
  setGlobe: (g: Partial<Pick<GlobeSlice, "visitedCountries" | "pins" | "landmarks" | "activeTab">>) => void;
}

interface NotificationSlice {
  count: number;
  items: any[];
  setNotifications: (n: Partial<Pick<NotificationSlice, "count" | "items">>) => void;
}

interface AppSlice {
  isOffline: boolean;
  currentLocation: { lat: number; lng: number } | null;
  setApp: (a: Partial<Pick<AppSlice, "isOffline" | "currentLocation">>) => void;
}

type Store = {
  user: UserSlice;
  activeTrip: ActiveTripSlice;
  globe: GlobeSlice;
  notifications: NotificationSlice;
  app: AppSlice;
};

export const useAppStore = create<Store>((set) => ({
  user: {
    profile: null,
    session: null,
    authUser: null,
    isLoading: true,
    setUser: (u) => set((s) => ({ user: { ...s.user, ...u } })),
  },
  activeTrip: {
    trip: null,
    itinerary: [],
    members: [],
    setActiveTrip: (t) => set((s) => ({ activeTrip: { ...s.activeTrip, ...t } })),
    clearActiveTrip: () =>
      set((s) => ({ activeTrip: { ...s.activeTrip, trip: null, itinerary: [], members: [] } })),
  },
  globe: {
    visitedCountries: [],
    pins: [],
    landmarks: [],
    activeTab: "world",
    setGlobe: (g) => set((s) => ({ globe: { ...s.globe, ...g } })),
  },
  notifications: {
    count: 0,
    items: [],
    setNotifications: (n) => set((s) => ({ notifications: { ...s.notifications, ...n } })),
  },
  app: {
    isOffline: typeof navigator !== "undefined" ? !navigator.onLine : false,
    currentLocation: null,
    setApp: (a) => set((s) => ({ app: { ...s.app, ...a } })),
  },
}));
