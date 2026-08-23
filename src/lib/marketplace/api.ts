/**
 * Marketplace data access.
 *
 * Reads `marketplace_offers` — the single normalized inventory table. Legacy
 * `partner_offers` rows were migrated into it as `source = 'demo'` preview
 * inventory, so the client never queries two competing offer models.
 *
 * Future suppliers (HBX, RateHawk, Viator, ...) plug in as adapters that return
 * `MarketplaceOffer[]`; nothing supplier-specific may leak into components.
 */
import { supabase } from "@/integrations/supabase/client";
import type { MarketplaceOffer, DealType, OfferCategory } from "./types";

const COLS = "*";

export interface OfferQuery {
  /** Live coordinates from an explicit permission grant, or a chosen city centre. */
  lat?: number | null;
  lng?: number | null;
  radiusMiles?: number;
  city?: string | null;
  category?: OfferCategory | "all";
  dealType?: DealType | "all";
  query?: string;
  maxPrice?: number | null;
  includeDemo?: boolean;
  limit?: number;
}

export function distanceMiles(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 3959;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function applyClientFilters(rows: MarketplaceOffer[], q: OfferQuery): MarketplaceOffer[] {
  let out = rows;
  if (q.category && q.category !== "all") out = out.filter((o) => o.category === q.category);
  if (q.dealType && q.dealType !== "all") out = out.filter((o) => o.deal_type === q.dealType);
  if (q.maxPrice != null) out = out.filter((o) => o.roavr_price == null || o.roavr_price <= q.maxPrice!);
  if (q.query?.trim()) {
    const needle = q.query.trim().toLowerCase();
    out = out.filter(
      (o) =>
        o.title.toLowerCase().includes(needle) ||
        o.merchant_name.toLowerCase().includes(needle) ||
        (o.city ?? "").toLowerCase().includes(needle) ||
        (o.description ?? "").toLowerCase().includes(needle),
    );
  }
  // Expired inventory is never surfaced.
  const now = Date.now();
  out = out.filter((o) => !o.expires_at || new Date(o.expires_at).getTime() > now);
  return out;
}

export async function fetchOffers(q: OfferQuery = {}): Promise<MarketplaceOffer[]> {
  const includeDemo = q.includeDemo ?? true;
  let rows: MarketplaceOffer[] = [];

  if (q.lat != null && q.lng != null) {
    const { data, error } = await supabase.rpc("nearby_marketplace_offers", {
      lat: q.lat,
      lng: q.lng,
      radius_miles: q.radiusMiles ?? 15,
      include_demo: includeDemo,
    });
    if (error) throw error;
    rows = (data ?? []) as unknown as MarketplaceOffer[];
  } else {
    let sel = supabase.from("marketplace_offers").select(COLS).eq("active", true).limit(q.limit ?? 60);
    if (!includeDemo) sel = sel.eq("is_demo", false);
    if (q.city) sel = sel.ilike("city", `%${q.city}%`);
    const { data, error } = await sel;
    if (error) throw error;
    rows = (data ?? []) as unknown as MarketplaceOffer[];
  }

  const withDistance =
    q.lat != null && q.lng != null
      ? rows.map((o) => ({
          ...o,
          distance_miles:
            o.latitude != null && o.longitude != null
              ? distanceMiles({ lat: q.lat!, lng: q.lng! }, { lat: o.latitude, lng: o.longitude })
              : null,
        }))
      : rows.map((o) => ({ ...o, distance_miles: null }));

  return applyClientFilters(withDistance, q).slice(0, q.limit ?? 60);
}

export async function getOffer(id: string): Promise<MarketplaceOffer | null> {
  const { data } = await supabase.from("marketplace_offers").select(COLS).eq("id", id).maybeSingle();
  return (data as unknown as MarketplaceOffer) ?? null;
}

/** Analytics on real interactions only; demo offers are not tracked. */
export async function trackInteraction(
  userId: string | undefined,
  offer: MarketplaceOffer,
  type: "view" | "click",
) {
  if (!userId || offer.is_demo || offer.source !== "partner") return;
  if (!offer.source_offer_id) return;
  await supabase
    .from("offer_interactions")
    .insert({ user_id: userId, offer_id: offer.source_offer_id, interaction_type: type });
}
