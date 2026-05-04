import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Compass, Loader2 } from "lucide-react";
import OffersSection from "@/components/offers/OffersSection";

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

export default function HomePage() {
  const { user } = useAuth();
  const displayName = user?.user_metadata?.full_name || "Traveler";
  const [offers, setOffers] = useState<Offer[]>([]);
  const [featuredOffers, setFeaturedOffers] = useState<Offer[]>([]);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [loadingOffers, setLoadingOffers] = useState(true);

  useEffect(() => {
    loadOffers();
    getUserLocation();
  }, []);

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLat(pos.coords.latitude);
          setUserLng(pos.coords.longitude);
          loadNearbyOffers(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          // Fallback: load all active offers
          loadOffers();
        }
      );
    }
  };

  const loadNearbyOffers = async (lat: number, lng: number) => {
    const { data } = await supabase.rpc("nearby_offers", { lat, lng, radius_miles: 25 });
    if (data && data.length > 0) {
      setOffers(data as Offer[]);
    }
    setLoadingOffers(false);
  };

  const loadOffers = async () => {
    const { data } = await supabase.from("partner_offers").select("*").eq("active", true).limit(20);
    const allOffers = (data as Offer[]) || [];
    setOffers(allOffers);
    // Pick random featured
    const shuffled = [...allOffers].sort(() => 0.5 - Math.random());
    setFeaturedOffers(shuffled.slice(0, 5));
    setLoadingOffers(false);
  };

  return (
    <div className="px-5 pt-12 pb-4 space-y-6">
      <div>
        <p className="text-muted-foreground text-sm">Welcome back,</p>
        <h1 className="font-heading text-2xl font-semibold text-foreground">{displayName}</h1>
      </div>

      {/* Featured Offers Carousel */}
      {featuredOffers.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-heading text-sm font-semibold text-foreground">Featured Offers</h3>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-5 px-5">
            {featuredOffers.map((offer) => (
              <div key={offer.id} className="shrink-0 w-64 rounded-xl border border-accent/20 bg-gradient-to-br from-accent/5 to-primary/5 overflow-hidden">
                {offer.image && <img src={offer.image} alt={offer.business_name} className="w-full h-28 object-cover" />}
                <div className="p-3 space-y-1">
                  <p className="font-medium text-sm text-foreground">{offer.business_name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{offer.offer_description}</p>
                  {offer.discount && <span className="inline-block text-[10px] font-medium bg-accent/10 text-accent px-2 py-0.5 rounded-full">{offer.discount}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Sections */}
      {loadingOffers ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : offers.length > 0 ? (
        <OffersSection offers={offers} userLat={userLat} userLng={userLng} />
      ) : (
        <div className="rounded-2xl bg-card border border-border p-6 text-center space-y-3">
          <Compass className="mx-auto h-12 w-12 text-accent" />
          <h2 className="font-heading text-lg font-medium text-foreground">Your journey starts here</h2>
          <p className="text-muted-foreground text-sm">Plan trips, check in at destinations, and collect badges along the way.</p>
        </div>
      )}
    </div>
  );
}
