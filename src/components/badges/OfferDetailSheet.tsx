import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Navigation, X, Star, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useBadges } from "./BadgeProvider";

export interface OfferSheetOffer {
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

interface Props {
  offer: OfferSheetOffer | null;
  open: boolean;
  onClose: () => void;
  userLat?: number | null;
  userLng?: number | null;
}

function distMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 3959;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export default function OfferDetailSheet({ offer, open, onClose, userLat, userLng }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { checkBadges } = useBadges();
  const [claim, setClaim] = useState<{ code: string; expiresAt: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (!claim) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [claim]);

  useEffect(() => { if (!open) setClaim(null); }, [open]);

  if (!offer) return null;

  const dist =
    userLat != null && userLng != null && offer.latitude != null && offer.longitude != null
      ? distMiles({ lat: userLat, lng: userLng }, { lat: offer.latitude, lng: offer.longitude }).toFixed(1)
      : null;

  const openDirections = () => {
    const dest = offer.latitude && offer.longitude
      ? `${offer.latitude},${offer.longitude}`
      : encodeURIComponent(offer.address || offer.business_name);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, "_blank");
  };

  const handleClaim = async () => {
    if (!user || claiming) return;
    setClaiming(true);
    try {
      const code = Math.random().toString(36).slice(2, 8).toUpperCase();
      const expiresAt = Date.now() + 4 * 60 * 60 * 1000;
      const { error } = await supabase.from("offer_interactions").insert({
        user_id: user.id, offer_id: offer.id, interaction_type: "claim",
        claim_code: code, claim_expires_at: new Date(expiresAt).toISOString(),
      });
      if (error) throw error;
      setClaim({ code, expiresAt });
      checkBadges();
    } catch (e: any) {
      toast({ title: "Claim failed", description: e.message, variant: "destructive" });
    } finally {
      setClaiming(false);
    }
  };

  const remaining = claim ? Math.max(0, claim.expiresAt - now) : 0;
  const hh = String(Math.floor(remaining / 3600000)).padStart(2, "0");
  const mm = String(Math.floor((remaining % 3600000) / 60000)).padStart(2, "0");
  const ss = String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0");

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 flex items-end"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full h-[80vh] bg-[#111827] rounded-t-3xl overflow-hidden flex flex-col"
          >
            {claim ? (
              // -------- CLAIM CODE VIEW --------
              <div className="flex-1 bg-[#080D1A] flex flex-col items-center justify-center px-6 text-center">
                <button onClick={onClose} className="absolute top-4 right-4 text-white/60">
                  <X className="w-5 h-5" />
                </button>
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#3B82F6] mb-4">Your claim code</p>
                <p
                  className="text-white text-[36px] font-mono select-all"
                  style={{ letterSpacing: "0.15em", fontFamily: "'Geist Mono', ui-monospace, monospace" }}
                >
                  {claim.code}
                </p>
                <button
                  onClick={() => { navigator.clipboard.writeText(claim.code); toast({ title: "Copied" }); }}
                  className="mt-2 inline-flex items-center gap-1 text-[12px] text-white/50 hover:text-white"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
                <p className="font-display text-[18px] text-white mt-6">{offer.business_name}</p>
                <p className="text-[13px] text-white/60 mt-1">Show this code to staff</p>
                <p className="text-[12px] text-white/40 mt-6 tabular-nums">Expires in {hh}:{mm}:{ss}</p>

                <button
                  onClick={openDirections}
                  className="mt-8 h-11 px-6 rounded-full bg-[#3B82F6] hover:bg-[#2563EB] text-white text-[13px] font-medium inline-flex items-center gap-2"
                >
                  <Navigation className="w-4 h-4" /> Get directions
                </button>
              </div>
            ) : (
              // -------- OFFER DETAIL VIEW --------
              <>
                <div className="relative shrink-0">
                  {offer.image ? (
                    <img src={offer.image} alt={offer.business_name} className="w-full h-[200px] object-cover" />
                  ) : (
                    <div className="w-full h-[200px] bg-[#1A2236]" />
                  )}
                  <button
                    onClick={onClose}
                    className="absolute top-3 right-3 h-9 w-9 rounded-full bg-black/55 backdrop-blur flex items-center justify-center text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 pt-5 pb-32 space-y-4">
                  <h2 className="font-display text-[20px] text-white">{offer.business_name}</h2>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#1A2236] text-white/70 capitalize">{offer.category}</span>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 text-white/20" />
                      ))}
                    </div>
                  </div>

                  {dist && (
                    <div className="flex items-center gap-1.5 text-[13px] text-white/60">
                      <MapPin className="w-3.5 h-3.5" /> {dist} miles from you
                    </div>
                  )}

                  {offer.discount && (
                    <div className="inline-block">
                      <span className="font-display text-[24px] text-white bg-[#3B82F6] px-4 py-1.5 rounded-full">
                        {offer.discount}
                      </span>
                    </div>
                  )}

                  <p className="text-[14px] text-white/85 leading-relaxed">{offer.offer_description}</p>

                  {offer.address && (
                    <div className="rounded-2xl bg-[#1A2236] p-4 flex items-center justify-center h-[140px] text-[12px] text-white/40">
                      {offer.address}
                    </div>
                  )}
                </div>

                <div className="absolute bottom-0 left-0 right-0 px-5 pb-6 pt-3 bg-gradient-to-t from-[#111827] to-transparent flex gap-2">
                  <button
                    onClick={openDirections}
                    className="h-12 px-4 rounded-full border border-white/15 text-white text-[13px] font-medium inline-flex items-center gap-2"
                  >
                    <Navigation className="w-4 h-4" /> Directions
                  </button>
                  <button
                    onClick={handleClaim}
                    disabled={claiming}
                    className="flex-1 h-12 rounded-full bg-[#3B82F6] hover:bg-[#2563EB] text-white text-[14px] font-medium inline-flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {claiming ? "Claiming…" : (<><Check className="w-4 h-4" /> Claim offer</>)}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
