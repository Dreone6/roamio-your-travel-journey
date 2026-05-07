/**
 * Roavr Data Services
 *
 * Thin abstraction over data access. Currently reads from mock data,
 * but the interface is designed to swap in real Supabase calls later
 * without changing consumer code.
 */

import type {
  Profile, Trip, Story, Memory, Conversation, Message,
  MapPin, Badge, LocalOffer, LocalExpert, AppNotification,
  CheckIn, GlobeStats, MessageRequest, SafetyNote, TrustedContact,
  Referral, SavedPlace,
} from "../data/types";

import {
  CURRENT_USER, MOCK_USERS, MOCK_TRIPS, MOCK_STORIES, MOCK_MEMORIES,
  MOCK_CONVERSATIONS, MOCK_MESSAGES, MOCK_MESSAGE_REQUESTS,
  MOCK_MAP_PINS, MOCK_BADGES, MOCK_OFFERS, MOCK_EXPERTS,
  MOCK_NOTIFICATIONS, MOCK_CHECKINS, MOCK_GLOBE_STATS,
  MOCK_SAFETY_NOTES, MOCK_TRUSTED_CONTACTS, MOCK_REFERRALS,
  MOCK_SAVED_PLACES, MOCK_FOLLOWERS,
} from "../data";

// Simulate async DB call
const delay = <T>(data: T, ms = 150): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(data), ms));

// ─── Users & Profiles ─────────────────────────────────────

export const getCurrentUser = () => delay(CURRENT_USER);
export const getUserProfile = (userId: string) =>
  delay(MOCK_USERS.find((u) => u.id === userId) ?? null);
export const getFollowers = (userId: string) =>
  delay(MOCK_FOLLOWERS.filter(() => true)); // mock: return all

// ─── Trips ────────────────────────────────────────────────

export const getUserTrips = (userId: string) =>
  delay(MOCK_TRIPS.filter((t) => t.userId === userId));
export const getTripById = (tripId: string) =>
  delay(MOCK_TRIPS.find((t) => t.id === tripId) ?? null);

// ─── Stories ──────────────────────────────────────────────

export const getActiveStories = () =>
  delay(MOCK_STORIES.filter((s) => new Date(s.expiresAt) > new Date()));
export const getUserStories = (userId: string) =>
  delay(MOCK_STORIES.filter((s) => s.userId === userId));

// ─── Memories ─────────────────────────────────────────────

export const getUserMemories = (userId: string) =>
  delay(MOCK_MEMORIES.filter((m) => m.userId === userId));

// ─── Check-ins ────────────────────────────────────────────

export const getUserCheckins = (userId: string) =>
  delay(MOCK_CHECKINS.filter((c) => c.userId === userId));

// ─── Saved Places ─────────────────────────────────────────

export const getUserSavedPlaces = (userId: string) =>
  delay(MOCK_SAVED_PLACES.filter((p) => p.userId === userId));

// ─── Map & Globe ──────────────────────────────────────────

export const getUserMapPins = (userId: string) =>
  delay(MOCK_MAP_PINS.filter((p) => p.userId === userId));
export const getGlobeStats = (userId: string) =>
  delay(MOCK_GLOBE_STATS);

// ─── Messaging ────────────────────────────────────────────

export const getUserConversations = (userId: string) =>
  delay(MOCK_CONVERSATIONS.filter((c) =>
    c.participants.some((p) => p.userId === userId)
  ));
export const getConversationMessages = (conversationId: string) =>
  delay(MOCK_MESSAGES[conversationId] ?? []);
export const getMessageRequests = (userId: string) =>
  delay(MOCK_MESSAGE_REQUESTS);

// ─── Badges ───────────────────────────────────────────────

export const getUserBadges = (userId: string) =>
  delay(MOCK_BADGES.filter((b) => b.userId === userId));

// ─── Notifications ────────────────────────────────────────

export const getUserNotifications = (userId: string) =>
  delay(MOCK_NOTIFICATIONS.filter((n) => n.userId === userId));

// ─── Offers & Experts ─────────────────────────────────────

export const getActiveOffers = () =>
  delay(MOCK_OFFERS.filter((o) => o.active));
export const getNearbyOffers = (lat: number, lng: number, radiusMiles = 50) =>
  delay(MOCK_OFFERS.filter((o) => o.active)); // mock: no distance filter
export const getLocalExperts = (location?: string) =>
  delay(location ? MOCK_EXPERTS.filter((e) => e.location.includes(location)) : MOCK_EXPERTS);

// ─── Safety ───────────────────────────────────────────────

export const getUserSafetyNotes = (userId: string) =>
  delay(MOCK_SAFETY_NOTES.filter((s) => s.userId === userId));
export const getTrustedContacts = (userId: string) =>
  delay(MOCK_TRUSTED_CONTACTS.filter((t) => t.userId === userId));

// ─── Referrals ────────────────────────────────────────────

export const getUserReferrals = (userId: string) =>
  delay(MOCK_REFERRALS.filter((r) => r.referrerId === userId));
