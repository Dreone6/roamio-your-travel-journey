import { Star } from "lucide-react";
import { DEAL_LABEL, expiryState, formatPrice, savings, type MarketplaceOffer } from "@/lib/marketplace/types";

const CAT_BG: Record<string, string> = {
  lodging: "#8B5CF6",
  food: "#F59E0B",
  activity: "#10B981",
  transport: "#06B6D4",
  shopping: "#3B82F6",
  other: "#EC4899",
};

const CAT_LABEL: Record<string, string> = {
  lodging: "STAY",
  food: "EATS",
  activity: "DO",
  transport: "RIDE",
  shopping: "SHOP",
  other: "MORE",
};

export function DealBadge({ offer }: { offer: MarketplaceOffer }) {
  if (offer.deal_type === "standard") return null;
  const isDrop = offer.deal_type === "roavr_drop";
  return (
    <span
      className="rounded-full"
      style={{
        background: isDrop ? "#F4A261" : "#3B82F6",
        color: "#FFFFFF",
        padding: "3px 8px",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.2px",
      }}
    >
      {DEAL_LABEL[offer.deal_type].toUpperCase()}
    </span>
  );
}

export function DemoBadge() {
  return (
    <span
      className="rounded-full"
      style={{
        background: "#1E2A3F",
        color: "#94A3B8",
        border: "1px solid #1E2A3F",
        padding: "3px 8px",
        fontSize: 10,
        fontWeight: 700,
      }}
    >
      SAMPLE
    </span>
  );
}

interface Props {
  offer: MarketplaceOffer;
  onOpen: (offer: MarketplaceOffer) => void;
  variant?: "row" | "tile";
}

export default function OfferCard({ offer, onOpen, variant = "row" }: Props) {
  const save = savings(offer);
  const expiry = expiryState(offer);
  const price = offer.roavr_price ?? offer.retail_price;

  if (variant === "tile") {
    return (
      <button
        onClick={() => onOpen(offer)}
        className="shrink-0 relative overflow-hidden text-left active:scale-[0.98] transition-transform"
        style={{ width: 220, height: 150, borderRadius: 16, background: "#111827" }}
      >
        {offer.image_url && (
          <img src={offer.image_url} alt={offer.title} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 58%)" }} />
        <div className="absolute top-2 left-2 flex gap-1.5">
          <span
            className="rounded-full text-white"
            style={{ background: CAT_BG[offer.category] ?? "#3B82F6", padding: "3px 8px", fontSize: 10, fontWeight: 700 }}
          >
            {CAT_LABEL[offer.category] ?? "MORE"}
          </span>
          {offer.is_demo ? <DemoBadge /> : <DealBadge offer={offer} />}
        </div>
        <div className="absolute bottom-2 left-2.5 right-2.5">
          <p className="text-white truncate" style={{ fontSize: 14, fontWeight: 600 }}>{offer.merchant_name}</p>
          <p className="truncate mt-0.5" style={{ color: "#94A3B8", fontSize: 11 }}>{offer.title}</p>
          {(price != null || offer.distance_miles != null) && (
            <p className="mt-1 flex items-center gap-2" style={{ fontSize: 11, color: "#94A3B8" }}>
              {price != null && (
                <span style={{ color: "#FFFFFF", fontWeight: 700 }}>{formatPrice(price, offer.currency)}</span>
              )}
              {offer.distance_miles != null && <span>{offer.distance_miles.toFixed(1)} mi</span>}
            </p>
          )}
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={() => onOpen(offer)}
      className="w-full flex gap-3 rounded-2xl overflow-hidden text-left active:scale-[0.99] transition-transform"
      style={{ background: "#111827", boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}
    >
      {offer.image_url ? (
        <img src={offer.image_url} alt={offer.title} loading="lazy" className="h-28 w-28 object-cover shrink-0" />
      ) : (
        <div className="h-28 w-28 shrink-0" style={{ background: "#1A2236" }} />
      )}
      <div className="flex-1 min-w-0 py-2.5 pr-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className="rounded-full text-white"
            style={{ background: CAT_BG[offer.category] ?? "#3B82F6", padding: "2px 7px", fontSize: 9, fontWeight: 700 }}
          >
            {CAT_LABEL[offer.category] ?? "MORE"}
          </span>
          {offer.is_demo ? <DemoBadge /> : <DealBadge offer={offer} />}
          {expiry && !expiry.expired && (
            <span style={{ color: "#F59E0B", fontSize: 10, fontWeight: 700 }}>{expiry.label}</span>
          )}
        </div>
        <p className="text-white mt-1.5 truncate" style={{ fontSize: 15, fontWeight: 600 }}>{offer.merchant_name}</p>
        <p className="truncate" style={{ color: "#94A3B8", fontSize: 12 }}>{offer.title}</p>

        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
          {price != null && (
            <span className="text-white" style={{ fontSize: 14, fontWeight: 700 }}>
              {formatPrice(price, offer.currency)}
            </span>
          )}
          {save && (
            <>
              <span style={{ color: "#4B5563", fontSize: 12, textDecoration: "line-through" }}>
                {formatPrice(offer.retail_price!, offer.currency)}
              </span>
              <span style={{ color: "#10B981", fontSize: 11, fontWeight: 700 }}>Save {save.pct}%</span>
            </>
          )}
          {offer.rating != null && offer.rating_source && (
            <span className="flex items-center gap-1" style={{ color: "#94A3B8", fontSize: 11 }}>
              <Star className="h-3 w-3" strokeWidth={1.5} />
              {offer.rating.toFixed(1)}
              {offer.rating_count ? ` (${offer.rating_count})` : ""}
            </span>
          )}
          {offer.distance_miles != null && (
            <span style={{ color: "#94A3B8", fontSize: 11 }}>{offer.distance_miles.toFixed(1)} mi</span>
          )}
        </div>
      </div>
    </button>
  );
}
