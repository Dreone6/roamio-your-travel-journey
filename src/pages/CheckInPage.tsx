import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Loader2, Camera, X, Trophy, Tag } from "lucide-react";

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
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
        });
      });

      const latitude = pos.coords.latitude;
      const longitude = pos.coords.longitude;
      setLat(latitude);
      setLng(longitude);

      // Reverse geocode + generate challenge
      const { data, error } = await supabase.functions.invoke("reverse-geocode", {
        body: { latitude, longitude, generate_challenge: true },
      });

      if (error) throw error;

      setGeo(data as GeoResult);
      if (data.challenge) setChallenge(data.challenge);
      setStep("confirm");
    } catch (err: any) {
      console.error(err);
      toast({ title: "Location error", description: err.message || "Could not get your location. Please enable location services.", variant: "destructive" });
      setStep("idle");
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!user || !geo) return;
    setSubmitting(true);

    try {
      let photoUrl: string | null = null;

      // Upload photo if present
      if (photo) {
        const ext = photo.name.split(".").pop() || "jpg";
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("checkin-photos")
          .upload(path, photo);
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage
          .from("checkin-photos")
          .getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      }

      // Create check-in
      const { error: checkInErr } = await supabase.from("check_ins").insert({
        user_id: user.id,
        location_name: geo.location_name,
        latitude: lat,
        longitude: lng,
        notes: note || null,
        photo: photoUrl,
      });
      if (checkInErr) throw checkInErr;

      // Add to places_visited if new city/country
      const { data: existing } = await supabase
        .from("places_visited")
        .select("id")
        .eq("user_id", user.id)
        .eq("city", geo.city)
        .eq("country", geo.country)
        .limit(1);

      if (!existing || existing.length === 0) {
        await supabase.from("places_visited").insert({
          user_id: user.id,
          country: geo.country || "Unknown",
          city: geo.city || "Unknown",
          latitude: lat,
          longitude: lng,
          date_visited: new Date().toISOString().split("T")[0],
          photos_count: photo ? 1 : 0,
        });
      } else if (photo) {
        // Increment photos_count
        const place = existing[0];
        const { data: placeData } = await supabase
          .from("places_visited")
          .select("photos_count")
          .eq("id", place.id)
          .single();
        if (placeData) {
          await supabase
            .from("places_visited")
            .update({ photos_count: (placeData.photos_count || 0) + 1 })
            .eq("id", place.id);
        }
      }

      // Save challenge
      if (challenge) {
        await supabase.from("challenges").insert({
          user_id: user.id,
          location: `${geo.city}, ${geo.country}`,
          challenge_text: challenge.challenge,
          reward_badge: challenge.reward_badge,
          status: "active" as const,
        });
      }

      // Fetch nearby offers
      const { data: offers } = await supabase.rpc("nearby_offers", {
        lat,
        lng,
        radius_miles: 5,
      });
      setNearbyOffers((offers as Offer[]) || []);

      toast({ title: "Checked in!", description: `${geo.location_name}, ${geo.city}` });
      setStep("done");
    } catch (err: any) {
      console.error(err);
      toast({ title: "Error", description: err.message || "Failed to check in", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setStep("idle");
    setGeo(null);
    setNote("");
    setPhoto(null);
    setPhotoPreview(null);
    setNearbyOffers([]);
    setChallenge(null);
  };

  return (
    <div className="px-5 pt-12 pb-4 space-y-5">
      <h1 className="font-heading text-2xl font-semibold text-foreground">Check In</h1>

      {/* IDLE STATE */}
      {step === "idle" && (
        <div className="flex flex-col items-center justify-center py-16 space-y-6">
          <div className="relative">
            <div className="h-28 w-28 rounded-full bg-accent/10 flex items-center justify-center">
              <MapPin className="h-14 w-14 text-accent" />
            </div>
            <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-accent flex items-center justify-center animate-pulse">
              <span className="text-accent-foreground text-xs font-bold">!</span>
            </div>
          </div>
          <Button onClick={requestLocation} size="lg" className="text-base px-8 py-6 rounded-xl">
            <MapPin className="mr-2 h-5 w-5" /> Check In Here
          </Button>
          <p className="text-muted-foreground text-xs text-center max-w-xs">
            We will use your location to log where you are and find nearby deals for you
          </p>
        </div>
      )}

      {/* LOCATING */}
      {step === "locating" && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-accent" />
          <p className="text-muted-foreground text-sm">Finding your location...</p>
        </div>
      )}

      {/* CONFIRM */}
      {step === "confirm" && geo && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <p className="font-heading font-semibold text-foreground">{geo.location_name}</p>
            <p className="text-sm text-muted-foreground">{geo.city}, {geo.country}</p>
            <p className="text-xs text-muted-foreground truncate">{geo.landmark}</p>
          </div>

          <Textarea
            placeholder="Add a note about this place..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
          />

          <div>
            {photoPreview ? (
              <div className="relative rounded-lg overflow-hidden">
                <img src={photoPreview} alt="Preview" className="w-full h-40 object-cover rounded-lg" />
                <button onClick={() => { setPhoto(null); setPhotoPreview(null); }} className="absolute top-2 right-2 bg-foreground/70 text-background rounded-full p-1">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer border border-dashed border-border rounded-lg p-4 hover:border-accent/50 transition-colors">
                <Camera className="h-5 w-5" />
                <span>Add a photo</span>
                <input type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} className="hidden" />
              </label>
            )}
          </div>

          <Button onClick={handleSubmit} className="w-full" disabled={submitting}>
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</> : "Confirm Check In"}
          </Button>
        </div>
      )}

      {/* DONE */}
      {step === "done" && geo && (
        <div className="space-y-5">
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 text-center space-y-2">
            <MapPin className="mx-auto h-8 w-8 text-accent" />
            <p className="font-heading font-semibold text-foreground">Checked in at {geo.city}</p>
            <p className="text-xs text-muted-foreground">{geo.country}</p>
          </div>

          {/* Nearby Offers */}
          {nearbyOffers.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
                <Tag className="h-4 w-4 text-accent" /> Nearby for you
              </h2>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5">
                {nearbyOffers.map((offer) => (
                  <div key={offer.id} className="shrink-0 w-60 rounded-xl border border-border bg-card overflow-hidden">
                    {offer.image && <img src={offer.image} alt={offer.business_name} className="w-full h-28 object-cover" />}
                    <div className="p-3 space-y-1">
                      <p className="font-medium text-sm text-foreground">{offer.business_name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{offer.offer_description}</p>
                      {offer.discount && (
                        <span className="inline-block text-[10px] font-medium bg-accent/10 text-accent px-2 py-0.5 rounded-full">{offer.discount}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Challenge */}
          {challenge && (
            <div className="rounded-xl border border-border bg-card p-4 space-y-2">
              <h3 className="font-heading font-semibold text-sm text-foreground flex items-center gap-2">
                <Trophy className="h-4 w-4 text-accent" /> Challenge
              </h3>
              <p className="text-sm text-foreground">{challenge.challenge}</p>
              <span className="inline-block text-[10px] font-medium bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">
                🏅 {challenge.reward_badge}
              </span>
            </div>
          )}

          <Button onClick={reset} variant="outline" className="w-full">Check In Again</Button>
        </div>
      )}
    </div>
  );
}
