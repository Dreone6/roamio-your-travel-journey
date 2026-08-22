/**
 * useTravelerWorld — loads any traveller's world (your own or someone else's).
 *
 * The same query runs in both cases; Row Level Security decides which visits
 * come back, so a viewer can only ever see what the database authorises.
 */
import { useCallback, useEffect, useState } from "react";
import { EMPTY_WORLD, loadWorld, type World } from "@/lib/world/visits";

export interface TravelerWorldState {
  loading: boolean;
  error: boolean;
  world: World;
  refresh: () => void;
}

export function useTravelerWorld(userId: string | null | undefined): TravelerWorldState {
  const [world, setWorld] = useState<World>(EMPTY_WORLD);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [nonce, setNonce] = useState(0);
  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!userId) {
      setWorld(EMPTY_WORLD);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);
    loadWorld(userId)
      .then((w) => { if (!cancelled) { setWorld(w); setLoading(false); } })
      .catch(() => { if (!cancelled) { setWorld(EMPTY_WORLD); setError(true); setLoading(false); } });
    return () => { cancelled = true; };
  }, [userId, nonce]);

  return { loading, error, world, refresh };
}
