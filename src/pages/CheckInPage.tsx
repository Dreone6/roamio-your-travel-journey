import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Loader2, Camera, X, Trophy, Tag, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface GeoResult {
  city: string;
  country: string;
  landmark: string;
  location_name: string;
  challenge?: { challenge: string; reward_badge: string };
}

interface Offer {
  id: string;
  business_name: string;
  offer_description: string;
  discount: string | null;
  category: string;
  image: string | null;
}

export default function CheckInPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState<"idle" | "locating" | "confirm" | "done">("idle");
  const [lat, setLat] = useState(0);
  const [lng, setLng] = useState(0);
  const [geo, setGeo] = useState<GeoResult | null>(null);
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [nearbyOffers, setNearbyOffers] = useState<Offer[]>([]);
  const [challenge, setChallenge] = useState<{ challenge: string; reward_badge: string } | null>(null);

  const requestLocation = async () => {
    setStep("locating");
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000 });
      });
      const latitude = pos.coords.latitude;
      const longitude = pos.coords.longitude;
      setLat(latitude);
      setLng(longitude);
      const { data, error } = await supabase.functions.invoke("reverse-geocode", {
        body: { latitude, longitude, generate_challenge: true },
      });
      if (error) throw error;
      setGeo(data as GeoResult);
      if (data.challenge) setChallenge(data.challenge);
      setStep("confirm");
    } catch (err: any) {
      toast({ title: "Location error", description: err.message || "Could not get your location.", variant: "destructive" });
      setStep("idle");
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setPhoto(file); setPhotoPreview(URL.createObjectURL(file)); }
  };

  const handleSubmit = async () => {
    if (!user || !geo) return;
    setSubmitting(true);
    try {
      let photoUrl: string | null = null;
      if (photo) {
        const ext = photo.name.split(".").pop() || "jpg";
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("checkin-photos").upload(path, photo);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from("checkin-photos").getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      }
      const { error: checkInErr } = await supabase.from("check_ins").insert({
        user_id: user.id, location_name: geo.location_name, latitude: lat, longitude: lng, notes: note || null, photo: photoUrl,
      });
      if (checkInErr) throw checkInErr;
      const { data: existing } = await supabase.from("places_visited").select("id").eq("user_id", user.id).eq("city", geo.city).eq("country", geo.country).limit(1);
      if (!existing || existing.length === 0) {
        await supabase.from("places_visited").insert({
          user_id: user.id, country: geo.country || "Unknown", city: geo.city || "Unknown",
          latitude: lat, longitude: lng, date_visited: new Date().toISOString().split("T")[0], photos_count: photo ? 1 : 0,
        });
      } else if (photo) {
        const place = existing[0];
        const { data: placeData } = await supabase.from("places_visited").select("photos_count").eq("id", place.id).single();
        if (placeData) await supabase.from("places_visited").update({ photos_count: (placeData.photos_count || 0) + 1 }).eq("id", place.id);
      }
      if (challenge) {
        await supabase.from("challenges").insert({
          user_id: user.id, location: `${geo.city}, ${geo.country}`, challenge_text: challenge.challenge, reward_badge: challenge.reward_badge, status: "active" as const,
        });
      }
      const { data: offers } = await supabase.rpc("nearby_offers", { lat, lng, radius_miles: 5 });
      setNearbyOffers((offers as Offer[]) || []);
      await supabase.functions.invoke("check-badges", { body: { user_id: user.id } });
      toast({ title: "Checked in!", description: `${geo.location_name}, ${geo.city}` });
      setStep("done");
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to check in", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setStep("idle"); setGeo(null); setNote(""); setPhoto(null); setPhotoPreview(null); setNearbyOffers([]); setChallenge(null);
  };

  return (
    <div className="min-h-screen pb-8">
      {/* Dark Header */}
      <div className="dark-immersive relative overflow-hidden">
        <div className="absolute inset-0 gradient-dark-radial" />
        <div className="relative px-5 pt-12 pb-5">
          <button onClick={() => navigate("/home")} className="text-dark-muted mb-3 flex items-center gap-1 text-[13px]">
            <ArrowLeft className="h-4 w-4" /> Home
          </button>
          <h1 className="font-heading text-[22px] font-bold text-white tracking-tight">Check In</h1>
          <p className="text-dark-muted text-[13px] mt-0.5">Drop a pin at your current location</p>
        </div>
      </div>

      <div className="px-4 pt-5">
        {/* IDLE */}
        {step === "idle" && (
          <div className="flex flex-col items-center text-center py-12 space-y-5 animate-fade-in">
            <div className="relative">
              <div className="h-24 w-24 rounded-full bg-accent/8 flex items-center justify-center">
                <MapPin className="h-12 w-12 text-accent" />
              </div>
              <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full gradient-accent flex items-center justify-center animate-pulse">
                <span className="text-white text-[11px] font-bold">!</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="font-heading text-lg font-bold text-foreground">Ready to check in?</p>
              <p className="text-[13px] text-muted-foreground max-w-[260px] leading-relaxed">
                We'll use your location to log where you are and find nearby deals.
              </p>
            </div>
            <Button onClick={requestLocation} className="gradient-accent border-0 text-white font-bold text-[13px] px-8 h-11 rounded-xl glow-coral gap-2">
              <MapPin className="h-4 w-4" /> Check In Here
            </Button>
          </div>
        )}

        {/* LOCATING */}
        {step === "locating" && (
          <div className="flex flex-col items-center justify-center py-20 space-y-3 animate-fade-in">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-muted-foreground text-[13px]">Finding your location...</p>
          </div>
        )}

        {/* CONFIRM */}
        {step === "confirm" && geo && (
          <div className="space-y-3.5 animate-fade-in">
            <div className="rounded-xl border border-border/40 bg-card p-4 shadow-soft space-y-1">
              <p className="font-heading font-bold text-[15px] text-foreground">{geo.location_name}</p>
              <p className="text-[13px] text-muted-foreground">{geo.city}, {geo.country}</p>
              {geo.landmark && <p className="text-[11px] text-muted-foreground truncate">{geo.landmark}</p>}
            </div>

            <Textarea
              placeholder="Add a note about this place..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="rounded-xl text-[13px]"
            />

            {photoPreview ? (
              <div className="relative rounded-xl overflow-hidden">
                <img src={photoPreview} alt="Preview" className="w-full h-36 object-cover" />
                <button onClick={() => { setPhoto(null); setPhotoPreview(null); }} className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white rounded-full p-1.5">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2 text-[13px] text-muted-foreground cursor-pointer border border-dashed border-border/50 rounded-xl p-3.5 hover:border-accent/30 transition-colors">
                <Camera className="h-4 w-4" />
                <span>Add a photo</span>
                <input type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} className="hidden" />
              </label>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => navigate("/camera")}
                className="h-11 w-11 rounded-xl border border-border/40 bg-card flex items-center justify-center shrink-0 hover:bg-secondary/30 transition-colors"
              >
                <Camera className="h-4.5 w-4.5 text-accent" />
              </button>
              <Button onClick={handleSubmit} className="flex-1 h-11 rounded-xl gradient-accent border-0 font-bold text-[13px]" disabled={submitting}>
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</> : "Confirm Check In"}
              </Button>
            </div>
          </div>
        )}

        {/* DONE */}
        {step === "done" && geo && (
          <div className="space-y-4 animate-fade-in">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center space-y-2">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
              <p className="font-heading font-bold text-[15px] text-foreground">Checked in!</p>
              <p className="text-[13px] text-muted-foreground">{geo.city}, {geo.country}</p>
            </div>

            {nearbyOffers.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <Tag className="h-3.5 w-3.5 text-accent" />
                  <h2 className="section-title">Nearby Offers</h2>
                </div>
                <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-4 px-4 no-scrollbar">
                  {nearbyOffers.map((offer) => (
                    <div key={offer.id} className="shrink-0 w-52 rounded-xl border border-border/40 bg-card overflow-hidden shadow-soft">
                      {offer.image && <img src={offer.image} alt={offer.business_name} className="w-full h-24 object-cover" />}
                      <div className="p-3 space-y-1">
                        <p className="font-semibold text-[13px] text-foreground">{offer.business_name}</p>
                        <p className="text-[11px] text-muted-foreground line-clamp-2">{offer.offer_description}</p>
                        {offer.discount && (
                          <span className="inline-block text-[9px] font-bold bg-accent/10 text-accent px-1.5 py-0.5 rounded-full">{offer.discount}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {challenge && (
              <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-accent" />
                  <p className="text-[13px] font-bold text-foreground">Challenge Unlocked</p>
                </div>
                <p className="text-[13px] text-foreground">{challenge.challenge}</p>
                <span className="inline-block text-[10px] font-bold bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">
                  🏅 {challenge.reward_badge}
                </span>
              </div>
            )}

            <Button onClick={reset} variant="outline" className="w-full h-10 rounded-xl text-[13px] font-semibold">Check In Again</Button>
          </div>
        )}
      </div>
    </div>
  );
}
