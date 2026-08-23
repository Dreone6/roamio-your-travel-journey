/**
 * Trips data access. Every call goes through RLS — nothing here widens access.
 */
import { supabase } from "@/integrations/supabase/client";
import type {
  ItemType,
  ItineraryItem,
  SavedPlace,
  SuggestedDay,
  Trip,
  TripBucket,
  TripPerson,
} from "./types";

const TRIP_COLS =
  "id, user_id, title, destination, start_date, end_date, travelers, budget, trip_style, pace, dietary, interests, status, cover_photo, invite_code, is_collaborative, world_visit_id, created_at";

const ITEM_COLS =
  "id, trip_id, user_id, day_number, time, activity, location, notes, description, type, estimated_cost, confirmation_ref, sort_order, completed";

/* ---------------- trips ---------------- */

export async function listTrips(userId: string): Promise<Trip[]> {
  // Owned trips plus trips the user was invited to (both allowed by RLS).
  const [{ data: owned }, { data: memberships }] = await Promise.all([
    supabase.from("trips").select(TRIP_COLS).eq("user_id", userId),
    supabase.from("trip_members").select("trip_id").eq("user_id", userId),
  ]);

  const memberIds = (memberships ?? []).map((m) => m.trip_id);
  let shared: Trip[] = [];
  if (memberIds.length) {
    const { data } = await supabase.from("trips").select(TRIP_COLS).in("id", memberIds);
    shared = (data ?? []) as Trip[];
  }

  const byId = new Map<string, Trip>();
  for (const t of [...((owned ?? []) as Trip[]), ...shared]) byId.set(t.id, t);
  return [...byId.values()].sort((a, b) => (b.start_date ?? b.created_at).localeCompare(a.start_date ?? a.created_at));
}

export async function getTrip(tripId: string): Promise<Trip | null> {
  const { data } = await supabase.from("trips").select(TRIP_COLS).eq("id", tripId).maybeSingle();
  return (data as Trip) ?? null;
}

export interface NewTripInput {
  destination: string;
  title?: string;
  start_date: string | null;
  end_date: string | null;
  travelers: number;
}

export async function createTrip(userId: string, input: NewTripInput): Promise<Trip | null> {
  const { data, error } = await supabase
    .from("trips")
    .insert({
      user_id: userId,
      destination: input.destination,
      title: input.title?.trim() || `Trip to ${input.destination}`,
      start_date: input.start_date,
      end_date: input.end_date,
      travelers: input.travelers,
      status: "planning",
    })
    .select(TRIP_COLS)
    .single();
  if (error) throw error;
  // Owner membership makes collaboration RLS uniform for every reader.
  await supabase.from("trip_members").insert({ trip_id: data.id, user_id: userId, role: "owner" });
  return data as Trip;
}

export async function updateTrip(tripId: string, patch: Record<string, unknown>) {
  const { error } = await supabase.from("trips").update(patch as never).eq("id", tripId);
  if (error) throw error;
}

export async function deleteTrip(tripId: string) {
  const { error } = await supabase.from("trips").delete().eq("id", tripId);
  if (error) throw error;
}

/** Upcoming / past / drafts, derived from real dates only. */
export function bucketOf(trip: Trip): TripBucket {
  if (!trip.start_date) return "drafts";
  const end = new Date(trip.end_date ?? trip.start_date);
  end.setHours(23, 59, 59, 999);
  return end.getTime() >= Date.now() ? "upcoming" : "past";
}

export function daysUntil(startDate: string | null): number | null {
  if (!startDate) return null;
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((start.getTime() - today.getTime()) / 86_400_000);
}

export function tripDayCount(trip: Trip): number {
  if (!trip.start_date) return 1;
  const end = new Date(trip.end_date ?? trip.start_date);
  const start = new Date(trip.start_date);
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);
}

export function dateForDay(trip: Trip, dayNumber: number): Date | null {
  if (!trip.start_date) return null;
  const d = new Date(trip.start_date);
  d.setDate(d.getDate() + dayNumber - 1);
  return d;
}

/* ---------------- itinerary ---------------- */

export async function listItems(tripId: string): Promise<ItineraryItem[]> {
  const { data } = await supabase
    .from("itinerary_items")
    .select(ITEM_COLS)
    .eq("trip_id", tripId)
    .order("day_number")
    .order("sort_order")
    .order("time", { nullsFirst: false });
  return (data ?? []) as ItineraryItem[];
}

export interface NewItemInput {
  day_number: number;
  time: string | null;
  activity: string;
  type: ItemType;
  location?: string | null;
  notes?: string | null;
  confirmation_ref?: string | null;
  estimated_cost?: number | null;
}

export async function addItems(
  tripId: string,
  userId: string,
  inputs: NewItemInput[],
  startingSort: number,
): Promise<ItineraryItem[]> {
  const rows = inputs.map((i, idx) => ({
    trip_id: tripId,
    user_id: userId,
    day_number: i.day_number,
    time: i.time,
    activity: i.activity,
    type: i.type,
    location: i.location ?? null,
    notes: i.notes ?? null,
    confirmation_ref: i.confirmation_ref ?? null,
    estimated_cost: i.estimated_cost ?? null,
    sort_order: startingSort + idx,
  }));
  const { data, error } = await supabase.from("itinerary_items").insert(rows).select(ITEM_COLS);
  if (error) throw error;
  return (data ?? []) as ItineraryItem[];
}

export async function updateItem(id: string, patch: Partial<ItineraryItem>) {
  const { error } = await supabase.from("itinerary_items").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteItem(id: string) {
  const { error } = await supabase.from("itinerary_items").delete().eq("id", id);
  if (error) throw error;
}

/** Persists a new order for one day's items. */
export async function persistOrder(items: ItineraryItem[]) {
  await Promise.all(
    items.map((it, idx) =>
      supabase.from("itinerary_items").update({ sort_order: idx }).eq("id", it.id),
    ),
  );
}

/** Converts an AI-suggested day into real, editable itinerary rows. */
export async function commitSuggestedDay(
  tripId: string,
  userId: string,
  day: SuggestedDay,
  startingSort: number,
) {
  return addItems(
    tripId,
    userId,
    day.items.map((i) => ({
      day_number: day.day_number,
      time: i.time,
      activity: i.title,
      type: i.type,
      location: i.location,
      notes: i.notes,
      estimated_cost: i.estimated_cost,
    })),
    startingSort,
  );
}

/* ---------------- saved places ---------------- */

export async function listSaved(tripId: string): Promise<SavedPlace[]> {
  const { data } = await supabase
    .from("trip_saved_places")
    .select("*")
    .eq("trip_id", tripId)
    .order("created_at", { ascending: false });
  return (data ?? []) as SavedPlace[];
}

export interface NewSavedInput {
  title: string;
  kind?: string;
  subtitle?: string | null;
  city?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
  source?: string;
  source_id?: string | null;
}

export async function savePlace(tripId: string, userId: string, input: NewSavedInput) {
  const { data, error } = await supabase
    .from("trip_saved_places")
    .insert({
      trip_id: tripId,
      user_id: userId,
      title: input.title,
      kind: input.kind ?? "place",
      subtitle: input.subtitle ?? null,
      city: input.city ?? null,
      country: input.country ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      notes: input.notes ?? null,
      source: input.source ?? "manual",
      source_id: input.source_id ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as SavedPlace;
}

export async function removeSaved(id: string) {
  const { error } = await supabase.from("trip_saved_places").delete().eq("id", id);
  if (error) throw error;
}

/* ---------------- people ---------------- */

export async function listPeople(tripId: string): Promise<TripPerson[]> {
  const { data: members } = await supabase
    .from("trip_members")
    .select("user_id, role")
    .eq("trip_id", tripId);
  if (!members?.length) return [];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name, username, profile_photo")
    .in("id", members.map((m) => m.user_id));
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  return members.map((m) => {
    const p = byId.get(m.user_id);
    return {
      user_id: m.user_id,
      role: m.role,
      name: p?.name || "Traveler",
      username: p?.username ?? null,
      avatar: p?.profile_photo ?? null,
    };
  });
}

export async function ensureInviteCode(trip: Trip): Promise<string> {
  if (trip.invite_code) return trip.invite_code;
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  await updateTrip(trip.id, { invite_code: code, is_collaborative: true });
  return code;
}

export async function removeMember(tripId: string, userId: string) {
  const { error } = await supabase
    .from("trip_members")
    .delete()
    .eq("trip_id", tripId)
    .eq("user_id", userId);
  if (error) throw error;
}

/* ---------------- past trip → World ---------------- */

export interface WorldLinkState {
  linked: boolean;
  visitId: string | null;
  /** True when a places_visited row already represents this trip. */
  existing: boolean;
}

export async function worldLinkState(trip: Trip, userId: string): Promise<WorldLinkState> {
  if (trip.world_visit_id) return { linked: true, visitId: trip.world_visit_id, existing: true };
  const { data } = await supabase
    .from("places_visited")
    .select("id")
    .eq("user_id", userId)
    .eq("trip_id", trip.id)
    .maybeSingle();
  return { linked: !!data, visitId: data?.id ?? null, existing: !!data };
}

/**
 * Records a finished trip in World, reusing any visit row already tied to the
 * trip so travel history is never duplicated. Stays private by default.
 */
export async function addTripToWorld(trip: Trip, userId: string): Promise<string | null> {
  const state = await worldLinkState(trip, userId);
  if (state.visitId) {
    if (!trip.world_visit_id) await updateTrip(trip.id, { world_visit_id: state.visitId });
    return state.visitId;
  }

  const [city, country] = trip.destination.split(",").map((s) => s.trim());
  const { data, error } = await supabase
    .from("places_visited")
    .insert({
      user_id: userId,
      trip_id: trip.id,
      city: city || trip.destination,
      country: country || city || trip.destination,
      date_visited: trip.start_date,
      end_date: trip.end_date,
      visibility: "private",
      source: "trip",
      import_key: `trip:${trip.id}`,
    })
    .select("id")
    .single();
  if (error) throw error;
  await updateTrip(trip.id, { world_visit_id: data.id });
  return data.id;
}
