import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MapPin, ExternalLink, X, Tag, ChevronRight, Navigation } from "lucide-react";

const CATEGORY_ICONS: Record<string, string> = {
  food: "🍽️", activity: "🎯", lodging: "🏨", transport: "🚗", shopping: "🛍️", other: "✨"
};

const CATEGORY_LABELS: Record<string, string> = {
  food: "Restaurants Near You", activity: "Experiences Near You", lodging: "Stays Near You", shopping: "Shopping Near You", transport: "Getting Around", other: "More Offers"
};

interface Offer {
  id: string;
  business_name: string;
  category: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  offer_description: string;
  discount: string | null;
  image: string | null;
}

interface OfferDetailProps {
  offer: Offer;
  onClose: () => void;
  userLat: number | null;
  userLng: number | null;
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function OfferDetail({ offer, onClose, userLat, userLng }: OfferDetailProps) {
  const { user } = useAuth();

  const handleClaim = async () => {
    if (!user) return;
    await supabase.from("offer_interactions").insert({ user_id: user.id, offer_id: offer.id, interaction_type: "claim" });
  };

  const openDirections = () => {
    if (offer.latitude && offer.longitude) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${offer.latitude},${offer.longitude}`, "_blank");
    } else if (offer.address) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(offer.address)}`, "_blank");
    }
  };

  const dist = userLat && userLng && offer.latitude && offer.longitude
    ? getDistance(userLat, userLng, offer.latitude, offer.longitude).toFixed(1)
    : null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="w-full max-w-lg bg-card border border-border rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto">
        <div className="relative">
          {offer.image && <img src={offer.image} alt={offer.business_name} className="w-full h-48 object-cover rounded-t-2xl" />}
          <button onClick={onClose} className="absolute top-3 right-3 bg-foreground/60 text-background rounded-full p-1.5"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">{CATEGORY_ICONS[offer.category] || "✨"}</span>
              <h2 className="font-heading text-lg font-semibold text-foreground">{offer.business_name}</h2>
            </div>
            {offer.discount && <span className="inline-block mt-1 text-xs font-medium bg-accent/10 text-accent px-2.5 py-1 rounded-full">{offer.discount}</span>}
          </div>
          <p className="text-sm text-foreground">{offer.offer_description}</p>
          {offer.address && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{offer.address}</span>
            </div>
          )}
          {dist && <p className="text-xs text-muted-foreground">{dist} miles away</p>}
          {offer.latitude && offer.longitude && (
            <div className="rounded-lg overflow-hidden border border-border h-32">
              <img
                src={`https://staticmap.openstreetmap.de/staticmap.php?center=${offer.latitude},${offer.longitude}&zoom=15&size=600x200&markers=${offer.latitude},${offer.longitude},lightblue`}
                alt="Map"
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={() => { handleClaim(); }} className="flex-1 gap-1">
              <Tag className="h-4 w-4" /> Claim Offer
            </Button>
            <Button variant="outline" onClick={openDirections} className="gap-1">
              <Navigation className="h-4 w-4" /> Directions
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface OffersSectionProps {
  offers: Offer[];
  userLat: number | null;
  userLng: number | null;
}

export default function OffersSection({ offers, userLat, userLng }: OffersSectionProps) {
  const { user } = useAuth();
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);

  const trackView = async (offerId: string) => {
    if (!user) return;
    await supabase.from("offer_interactions").insert({ user_id: user.id, offer_id: offerId, interaction_type: "view" });
  };

  const openOffer = (offer: Offer) => {
    trackView(offer.id);
    setSelectedOffer(offer);
  };

  // Group by category
  const grouped = offers.reduce((acc, o) => {
    const cat = o.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(o);
    return acc;
  }, {} as Record<string, Offer[]>);

  const categories = Object.keys(grouped);

  if (offers.length === 0) return null;

  return (
    <>
      {categories.map((cat) => (
        <div key={cat} className="space-y-2">
          <h3 className="font-heading text-sm font-semibold text-foreground">{CATEGORY_LABELS[cat] || cat}</h3>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-5 px-5">
            {grouped[cat].map((offer) => {
              const dist = userLat && userLng && offer.latitude && offer.longitude
                ? getDistance(userLat, userLng, offer.latitude, offer.longitude).toFixed(1)
                : null;
              return (
                <button
                  key={offer.id}
                  onClick={() => openOffer(offer)}
                  className="shrink-0 w-56 rounded-xl border border-border bg-card overflow-hidden text-left hover:border-accent/40 transition-all"
                >
                  {offer.image && <img src={offer.image} alt={offer.business_name} className="w-full h-24 object-cover" />}
                  <div className="p-3 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{CATEGORY_ICONS[offer.category] || "✨"}</span>
                      <p className="font-medium text-sm text-foreground truncate">{offer.business_name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{offer.offer_description}</p>
                    <div className="flex items-center justify-between">
                      {offer.discount && <span className="text-[10px] font-medium bg-accent/10 text-accent px-2 py-0.5 rounded-full">{offer.discount}</span>}
                      {dist && <span className="text-[10px] text-muted-foreground">{dist} mi</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {selectedOffer && (
        <OfferDetail offer={selectedOffer} onClose={() => setSelectedOffer(null)} userLat={userLat} userLng={userLng} />
      )}
    </>
  );
}
