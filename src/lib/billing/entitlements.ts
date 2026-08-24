/**
 * Entitlement resolution.
 *
 * The client NEVER decides whether a user is premium. It calls
 * `public.current_entitlement()`, a security-definer function that applies
 * expiry, revocation and trial windows server-side. Users have no INSERT or
 * UPDATE grant on `subscriptions`, so an on-device flag cannot fabricate access.
 */
import { supabase } from "@/integrations/supabase/client";
import type { SubscriptionTier } from "@/data/types";
import { FREE_ENTITLEMENT, type Entitlement } from "./types";

function toDate(value: unknown): Date | null {
  return typeof value === "string" && value ? new Date(value) : null;
}

export async function fetchEntitlement(): Promise<Entitlement> {
  const { data, error } = await supabase.rpc("current_entitlement" as never);
  if (error) return FREE_ENTITLEMENT;

  const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
  const row = Array.isArray(rows) ? rows[0] : undefined;
  if (!row) {
    // First read for a brand-new account: create the free row server-side, once.
    await supabase.rpc("ensure_subscription" as never);
    return FREE_ENTITLEMENT;
  }

  return {
    tier: (row.tier as SubscriptionTier) ?? "free",
    baseTier: (row.base_tier as SubscriptionTier) ?? "free",
    status: (row.status as string) ?? "active",
    source: (row.entitlement_source as Entitlement["source"]) ?? "none",
    platform: (row.platform as Entitlement["platform"]) ?? "none",
    productId: (row.product_id as string) ?? null,
    expiresAt: toDate(row.expires_at),
    autoRenew: typeof row.auto_renew === "boolean" ? row.auto_renew : null,
    lastVerifiedAt: toDate(row.last_verified_at),
    isTrialing: row.is_trialing === true,
    trialEndsAt: toDate(row.trial_ends_at),
  };
}

/** Days remaining on a trial, or null when not trialing. */
export function trialDaysLeft(e: Entitlement): number | null {
  if (!e.isTrialing || !e.trialEndsAt) return null;
  return Math.max(0, Math.ceil((e.trialEndsAt.getTime() - Date.now()) / 86_400_000));
}

/** True when a paid entitlement exists but the store reports it will not renew. */
export function isExpiring(e: Entitlement): boolean {
  return e.tier !== "free" && e.autoRenew === false && !!e.expiresAt;
}
