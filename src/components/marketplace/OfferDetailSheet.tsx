import { useEffect, useState } from "react";
import { Bookmark, ExternalLink, MapPin, Navigation, ShieldCheck, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { listTrips, savePlace } from "@/lib/trips/api";
import type { Trip } from "@/lib/trips/types";
import { trackInteraction } from "@/lib/marketplace/api";
import {
  bookingAction,
  expiryState,
  formatPrice,
  savings,
  DEAL_LABEL,
  type MarketplaceOffer,
} from "@/lib/marketplace/types";
import PeopleWhoKnowPlace from "@/components/social/PeopleWhoKnowPlace";

interface Props {
  offer: MarketplaceOffer;
  onClose: () => void;
}

export default function OfferDetailSheet({ offer, onClose }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [savingTo, setSavingTo] = useState<string | null>(null);
  const [showTrips, setShowTrips] = useState(false);

  const action = bookingAction(offer);
  const save = savings(offer);
  const expiry = expiryState(offer);
  const price = offer.roavr_price ?? offer.retail_price;

  useEffect(() => {
    void trackInteraction(user?.id, offer, "view");
  }, [user?.id, offer]);

  useEffect(() => {
    if (!user || !showTrips) return;
    void listTrips(user.id).then(setTrips);
  }, [user, showTrips]);

  const handleBook = () => {
    if (!action.enabled || !action.url) return;
    void trackInteraction(user?.id, offer, "click");
    window.open(action.url, "_blank", "noopener,noreferrer");
  };

  const handleSave = async (tripId: string) => {
    if (!user) return;
    setSavingTo(tripId);
    try {
      await savePlace(tripId, user.id, {
        title: offer.merchant_name,
        kind: offer.category === "lodging" ? "stay" : offer.category === "food" ? "food" : "activity",
        subtitle: offer.title,
        city: offer.city,
        country: offer.country,
        latitude: offer.latitude,
        longitude: offer.longitude,
        source: "marketplace",
        source_id: offer.id,
      });
      toast({ title: "Saved to trip" });
      setShowTrips(false);
    } catch {
      toast({ title: "Couldn't save this", variant: "destructive" });
    } finally {
      setSavingTo(null);
    }
  };

  const openDirections = () => {
    const dest =
      offer.latitude != null && offer.longitude != null
        ? `${offer.latitude},${offer.longitude}`
        : encodeURIComponent(offer.address ?? `${offer.merchant_name} ${offer.city ?? ""}`);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div
        className="w-full max-w-lg overflow-y-auto"
        style={{
          background: "#0B1220",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          maxHeight: "88vh",
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        }}
      >
        <div className="relative">
          {offer.image_url && <img src={offer.image_url} alt={offer.title} className="w-full h-48 object-cover" />}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 rounded-full p-2"
            style={{ background: "rgba(0,0,0,0.55)" }}
            aria-label="Close"
          >
            <X className="h-4 w-4 text-white" strokeWidth={1.5} />
          </button>
        </div>

        <div className="p-5 pb-8 space-y-5">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {offer.deal_type !== "standard" && (
                <span
                  className="rounded-full text-white"
                  style={{
                    background: offer.deal_type === "roavr_drop" ? "#F4A261" : "#3B82F6",
                    padding: "3px 9px",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {DEAL_LABEL[offer.deal_type].toUpperCase()}
                </span>
              )}
              {expiry && !expiry.expired && (
                <span style={{ color: "#F59E0B", fontSize: 11, fontWeight: 700 }}>{expiry.label}</span>
              )}
              {offer.inventory_remaining != null && (
                <span style={{ color: "#94A3B8", fontSize: 11 }}>{offer.inventory_remaining} left</span>
              )}
            </div>
            <h2 className="text-white mt-2" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.3px" }}>
              {offer.merchant_name}
            </h2>
            <p style={{ color: "#94A3B8", fontSize: 14 }}>{offer.title}</p>
          </div>

          {price != null && (
            <div className="flex items-baseline gap-2.5">
              <span className="text-white" style={{ fontSize: 26, fontWeight: 700 }}>
                {formatPrice(price, offer.currency)}
              </span>
              {save && (
                <>
                  <span style={{ color: "#4B5563", fontSize: 15, textDecoration: "line-through" }}>
                    {formatPrice(offer.retail_price!, offer.currency)}
                  </span>
                  <span style={{ color: "#10B981", fontSize: 13, fontWeight: 700 }}>
                    Save {formatPrice(save.amount, offer.currency)}
                  </span>
                </>
              )}
            </div>
          )}

          {offer.description && (
            <p className="text-white" style={{ fontSize: 14, lineHeight: 1.5 }}>{offer.description}</p>
          )}

          {offer.whats_included.length > 0 && (
            <div>
              <h3 className="text-white" style={{ fontSize: 14, fontWeight: 600 }}>What's included</h3>
              <ul className="mt-2 space-y-1">
                {offer.whats_included.map((i) => (
                  <li key={i} className="flex gap-2" style={{ color: "#94A3B8", fontSize: 13 }}>
                    <ShieldCheck className="h-4 w-4 shrink-0" strokeWidth={1.5} style={{ color: "#10B981" }} />
                    {i}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(offer.address || offer.city) && (
            <div className="flex items-start gap-2" style={{ color: "#94A3B8", fontSize: 13 }}>
              <MapPin className="h-4 w-4 mt-0.5 shrink-0" strokeWidth={1.5} />
              <span>{offer.address || [offer.city, offer.country].filter(Boolean).join(", ")}</span>
            </div>
          )}

          {offer.is_demo && (
            <div className="rounded-2xl p-3.5" style={{ background: "#111827", border: "1px solid #1E2A3F" }}>
              <p style={{ color: "#F59E0B", fontSize: 12, fontWeight: 700 }}>Sample listing</p>
              <p className="mt-1" style={{ color: "#94A3B8", fontSize: 12 }}>
                This is preview inventory used to show how the marketplace works. It isn't a real, bookable offer.
              </p>
            </div>
          )}

          {(offer.terms || offer.cancellation_policy) && (
            <div className="space-y-1.5">
              {offer.cancellation_policy && (
                <p style={{ color: "#94A3B8", fontSize: 12 }}>
                  <span className="text-white font-semibold">Cancellation: </span>
                  {offer.cancellation_policy}
                </p>
              )}
              {offer.terms && (
                <p style={{ color: "#4B5563", fontSize: 11, lineHeight: 1.5 }}>{offer.terms}</p>
              )}
            </div>
          )}

          {offer.city && user && (
            <PeopleWhoKnowPlace viewerId={user.id} city={offer.city} country={offer.country ?? undefined} />
          )}

          <div className="space-y-2.5">
            <button
              onClick={handleBook}
              disabled={!action.enabled}
              className="w-full rounded-full flex items-center justify-center gap-2"
              style={{
                background: action.enabled ? "#3B82F6" : "#1A2236",
                color: action.enabled ? "#FFFFFF" : "#4B5563",
                padding: "14px 16px",
                fontSize: 15,
                fontWeight: 700,
              }}
            >
              {action.enabled && <ExternalLink className="h-4 w-4" strokeWidth={1.5} />}
              {action.label}
            </button>
            {action.note && (
              <p className="text-center" style={{ color: "#4B5563", fontSize: 11 }}>{action.note}</p>
            )}

            <div className="flex gap-2.5">
              <button
                onClick={() => setShowTrips((s) => !s)}
                className="flex-1 rounded-full flex items-center justify-center gap-2"
                style={{ background: "#1A2236", color: "#FFFFFF", padding: "12px", fontSize: 14, fontWeight: 600 }}
              >
                <Bookmark className="h-4 w-4" strokeWidth={1.5} /> Save to trip
              </button>
              <button
                onClick={openDirections}
                className="flex-1 rounded-full flex items-center justify-center gap-2"
                style={{ background: "#1A2236", color: "#FFFFFF", padding: "12px", fontSize: 14, fontWeight: 600 }}
              >
                <Navigation className="h-4 w-4" strokeWidth={1.5} /> Directions
              </button>
            </div>

            {showTrips && (
              <div className="rounded-2xl p-3 space-y-2" style={{ background: "#111827" }}>
                {trips.length === 0 ? (
                  <p style={{ color: "#94A3B8", fontSize: 13 }}>No trips yet — create one to save places.</p>
                ) : (
                  trips.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleSave(t.id)}
                      disabled={savingTo === t.id}
                      className="w-full text-left rounded-xl px-3 py-2.5"
                      style={{ background: "#1A2236", color: "#FFFFFF", fontSize: 14 }}
                    >
                      {t.title}
                      <span style={{ color: "#94A3B8", fontSize: 12 }}> · {t.destination}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
