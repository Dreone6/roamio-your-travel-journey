import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { SubscriptionTier } from "@/data/types";

export interface SubscriptionState {
  loading: boolean;
  tier: SubscriptionTier;          // effective tier (trial counts as pro)
  baseTier: SubscriptionTier;      // raw tier on the row
  status: string;
  isTrialing: boolean;
  trialEndsAt: Date | null;
  daysLeft: number | null;
}

export function useSubscription(): SubscriptionState {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    loading: true, tier: "free", baseTier: "free", status: "active",
    isTrialing: false, trialEndsAt: null, daysLeft: null,
  });

  useEffect(() => {
    if (!user) { setState(s => ({ ...s, loading: false })); return; }
    let cancelled = false;
    supabase
      .from("subscriptions")
      .select("tier, status, trial_ends_at")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const baseTier = (data?.tier ?? "free") as SubscriptionTier;
        const status = data?.status ?? "active";
        const trialEndsAt = data?.trial_ends_at ? new Date(data.trial_ends_at) : null;
        const now = Date.now();
        const isTrialing = status === "trialing" && !!trialEndsAt && trialEndsAt.getTime() > now;
        const daysLeft = trialEndsAt
          ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now) / 86_400_000))
          : null;
        // Effective: trialing pro grants pro features; expired trial collapses to free
        const tier: SubscriptionTier =
          isTrialing ? baseTier :
          status === "trialing" ? "free" :
          baseTier;
        setState({ loading: false, tier, baseTier, status, isTrialing, trialEndsAt, daysLeft });
      });
    return () => { cancelled = true; };
  }, [user]);

  return state;
}
