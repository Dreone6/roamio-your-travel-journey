/**
 * Shared contracts for the Trips planning layer.
 * Everything here maps 1:1 to real, RLS-authorised rows — no fixtures.
 */

export type TripStatus = "planning" | "active" | "completed";
export type TripBucket = "upcoming" | "past" | "drafts";

export interface Trip {
  id: string;
  user_id: string;
  title: string;
  destination: string;
  start_date: string | null;
  end_date: string | null;
  travelers: number;
  budget: number | null;
  trip_style: string | null;
  pace: string | null;
  dietary: string | null;
  interests: string[] | null;
  status: TripStatus;
  cover_photo: string | null;
  invite_code: string | null;
  is_collaborative: boolean;
  world_visit_id: string | null;
  created_at: string;
}

export const ITEM_TYPES = [
  "flight",
  "lodging",
  "restaurant",
  "food",
  "activity",
  "transport",
  "note",
] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export interface ItineraryItem {
  id: string;
  trip_id: string;
  user_id: string;
  day_number: number;
  time: string | null;
  activity: string;
  location: string | null;
  notes: string | null;
  description: string | null;
  type: ItemType;
  estimated_cost: number | null;
  confirmation_ref: string | null;
  sort_order: number;
  completed: boolean;
}

export interface SavedPlace {
  id: string;
  trip_id: string;
  user_id: string;
  kind: string;
  title: string;
  subtitle: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  source: string;
  source_id: string | null;
  created_at: string;
}

export interface TripPerson {
  user_id: string;
  role: string;
  name: string;
  username: string | null;
  avatar: string | null;
}

/** A structured plan suggestion returned by the AI planner, pre-conversion. */
export interface SuggestedItem {
  time: string | null;
  title: string;
  type: ItemType;
  location: string | null;
  notes: string | null;
  estimated_cost: number | null;
}

export interface SuggestedDay {
  day_number: number;
  label: string | null;
  items: SuggestedItem[];
}
