import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { SubscriptionTier } from "@/data/types";
import { fetchEntitlement, trialDaysLeft } from "@/lib/billing/entitlements";
import { FREE_ENTITLEMENT, type Entitlement } from "@/lib/billing/types";

/**
 * Feature gates read this hook, and this hook reads the server-computed
 * entitlement (`public.current_entitlement`). There is no client-side premium
 * flag anywhere: expiry, revocation and trial windows are all decided in the
 * database, and users hold no write grant on `subscriptions`.
 */
export interface SubscriptionState {
  loading: boolean;
  tier: SubscriptionTier;          // effective tier (verified entitlement)
  baseTier: SubscriptionTier;      // raw tier on the row
  status: string;
  isTrialing: boolean;
  trialEndsAt: Date | null;
  daysLeft: number | null;
  entitlement: Entitlement;
  refresh: () => Promise<void>;
}

export function useSubscription(): SubscriptionState {
  const { user } = useAuth();
  const [entitlement, setEntitlement] = useState<Entitlement>(FREE_ENTITLEMENT);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setEntitlement(FREE_ENTITLEMENT);
      setLoading(false);
      return;
    }
    const next = await fetchEntitlement();
    setEntitlement(next);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setEntitlement(FREE_ENTITLEMENT);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchEntitlement().then((next) => {
      if (cancelled) return;
      setEntitlement(next);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [user]);

  return {
    loading,
    tier: entitlement.tier,
    baseTier: entitlement.baseTier,
    status: entitlement.status,
    isTrialing: entitlement.isTrialing,
    trialEndsAt: entitlement.trialEndsAt,
    daysLeft: trialDaysLeft(entitlement),
    entitlement,
    refresh,
  };
}
