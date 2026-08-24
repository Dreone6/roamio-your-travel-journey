/**
 * Marketplace location context.
 *
 * Rules:
 * - Device coordinates are only ever requested after an explicit user action.
 * - Coordinates live in memory for the session; they are never written to the
 *   database or localStorage.
 * - When permission is absent we fall back to the destination of the user's
 *   next trip, and the UI must say which context it is showing.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentLocation } from "@/lib/native/location";

export type LocationMode = "unset" | "device" | "trip" | "denied" | "unavailable";

export interface MarketplaceLocation {
  mode: LocationMode;
  lat: number | null;
  lng: number | null;
  /** Human label: "Around you" or the trip destination. */
  label: string | null;
  city: string | null;
  loading: boolean;
}

const EMPTY: MarketplaceLocation = {
  mode: "unset",
  lat: null,
  lng: null,
  label: null,
  city: null,
  loading: false,
};

export function useMarketplaceLocation(userId?: string) {
  const [state, setState] = useState<MarketplaceLocation>(EMPTY);

  /** Fallback context: the destination of the soonest upcoming trip. */
  const loadTripFallback = useCallback(async () => {
    if (!userId) return;
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("trips")
      .select("destination, start_date")
      .eq("user_id", userId)
      .gte("start_date", today)
      .order("start_date", { ascending: true })
      .limit(1);
    const trip = data?.[0];
    if (!trip?.destination) return;
    const city = trip.destination.split(",")[0].trim();
    const { data: visit } = await supabase
      .from("places_visited")
      .select("latitude, longitude")
      .ilike("city", city)
      .not("latitude", "is", null)
      .limit(1);
    setState((prev) =>
      prev.mode === "device"
        ? prev
        : {
            mode: "trip",
            lat: visit?.[0]?.latitude ?? null,
            lng: visit?.[0]?.longitude ?? null,
            label: trip.destination,
            city,
            loading: false,
          },
    );
  }, [userId]);

  useEffect(() => {
    void loadTripFallback();
  }, [loadTripFallback]);

  /**
   * Must be called from a user gesture — this is the permission prompt.
   * Native (Capacitor Geolocation) on iOS/Android, browser geolocation on web,
   * behind the same one-shot foreground-only contract.
   */
  const requestDeviceLocation = useCallback(async () => {
    setState((p) => ({ ...p, loading: true }));
    const { status, coords } = await getCurrentLocation();

    if (status === "ok" && coords) {
      setState({
        mode: "device",
        lat: coords.latitude,
        lng: coords.longitude,
        label: "Around you",
        city: null,
        loading: false,
      });
      return;
    }

    setState((p) => ({
      ...p,
      mode:
        status === "unavailable"
          ? "unavailable"
          : p.lat != null && p.mode === "trip"
            ? p.mode
            : status === "denied" || status === "restricted"
              ? "denied"
              : p.mode,
      loading: false,
    }));
  }, []);

  return { location: state, requestDeviceLocation };
}
