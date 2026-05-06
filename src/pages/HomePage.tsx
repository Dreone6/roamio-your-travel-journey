import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import OffersSection from "@/components/offers/OffersSection";
import EmptyState from "@/components/EmptyState";
import { SkeletonCard } from "@/components/ui/skeleton-card";
import WhatsNewModal from "@/components/WhatsNewModal";
import { useNavigate } from "react-router-dom";
import { MapPin, Sparkles } from "lucide-react";
import roavrIcon from "@/assets/roavr-icon.jpeg";

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
  const navigate = useNavigate();
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
        () => {}
      );
    }
  };

  const loadNearbyOffers = async (lat: number, lng: number) => {
    try {
      const { data } = await supabase.rpc("nearby_offers", { lat, lng, radius_miles: 25 });
      if (data && data.length > 0) setOffers(data as Offer[]);
    } catch {}
    setLoadingOffers(false);
  };

  const loadOffers = async () => {
    try {
      const { data } = await supabase.from("partner_offers").select("*").eq("active", true).limit(20);
      const allOffers = (data as Offer[]) || [];
      setOffers(allOffers);
      const shuffled = [...allOffers].sort(() => 0.5 - Math.random());
      setFeaturedOffers(shuffled.slice(0, 5));
    } catch {}
    setLoadingOffers(false);
  };

  return (
    <div className="px-5 pt-10 pb-4 space-y-6">
      <WhatsNewModal />

      <div className="animate-fade-in flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Welcome back,</p>
          <h1 className="font-heading text-2xl font-bold text-foreground tracking-tight mt-0.5">{displayName}</h1>
        </div>
        <img src={roavrIcon} alt="Roavr" className="h-10 w-10 rounded-xl shadow-soft" />
      </div>

      {/* Featured Offers Carousel */}
      {featuredOffers.length > 0 && (
        <div className="space-y-3 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-accent" /> Featured Offers
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-5 px-5">
            {featuredOffers.map((offer) => (
              <div key={offer.id} className="shrink-0 w-64 rounded-2xl border border-border/50 bg-card overflow-hidden hover:shadow-elevated transition-all duration-300 shadow-soft">
                {offer.image ? (
                  <img src={offer.image} alt={offer.business_name} className="w-full h-28 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <div className="w-full h-28 gradient-navy flex items-center justify-center">
                    <MapPin className="h-8 w-8 text-white/30" />
                  </div>
                )}
                <div className="p-3.5 space-y-1.5">
                  <p className="font-semibold text-sm text-foreground">{offer.business_name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{offer.offer_description}</p>
                  {offer.discount && <span className="inline-block text-[10px] font-bold gradient-accent text-accent-foreground px-2.5 py-0.5 rounded-full">{offer.discount}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Sections */}
      {loadingOffers ? (
        <div className="space-y-4">
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-5 px-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} className="shrink-0 w-56" />
            ))}
          </div>
        </div>
      ) : offers.length > 0 ? (
        <div className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <OffersSection offers={offers} userLat={userLat} userLng={userLng} />
        </div>
      ) : (
        <EmptyState
          icon={MapPin}
          title="Your journey starts here"
          description="Plan trips, check in at destinations, and collect badges along the way."
          actionLabel="Plan Your First Trip"
          onAction={() => navigate("/plan")}
        />
      )}
    </div>
  );
}
