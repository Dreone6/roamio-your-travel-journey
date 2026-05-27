import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, CheckCircle, X, Camera, Sparkles, AlertTriangle, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useBadges } from "@/components/badges/BadgeProvider";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

type Step = "detecting" | "denied" | "found";

const MOODS = ["Amazing", "Emotional", "Challenging", "Peaceful", "Wild", "Unforgettable", "Proud", "Grateful"];
const MILESTONES = ["Proposal", "Anniversary", "Birthday trip", "Baby first trip", "Graduation trip", "Personal goal achieved", "Bucket list", "Other"];

const countryFlag = (country?: string | null) => {
  if (!country) return "🌍";
  const map: Record<string, string> = {
    "United States": "🇺🇸", USA: "🇺🇸", Italy: "🇮🇹", France: "🇫🇷", Spain: "🇪🇸",
    Japan: "🇯🇵", Mexico: "🇲🇽", "United Kingdom": "🇬🇧", Germany: "🇩🇪", Brazil: "🇧🇷",
    Canada: "🇨🇦", Australia: "🇦🇺", Greece: "🇬🇷", Portugal: "🇵🇹", Thailand: "🇹🇭",
  };
  return map[country] || "🌐";
};

const distanceMiles = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 3959;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

export default function CheckInPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [tab, setTab] = useState<"new" | "history">("new");
  const [step, setStep] = useState<Step>("detecting");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [place, setPlace] = useState<{ city: string; country: string; location_name: string } | null>(null);
  const [verified, setVerified] = useState(false);
  const [verificationMeta, setVerificationMeta] = useState<Record<string, any>>({});
  const [showCelebration, setShowCelebration] = useState(false);
  const [isNewCountry, setIsNewCountry] = useState(false);
  const [throttleHours, setThrottleHours] = useState<number | null>(null);

  // memory form
  const [photos, setPhotos] = useState<(File | null)[]>([null, null, null, null, null]);
  const [photoPreviews, setPhotoPreviews] = useState<(string | null)[]>([null, null, null, null, null]);
  const [notes, setNotes] = useState("");
  const [moods, setMoods] = useState<string[]>([]);
  const [isMilestone, setIsMilestone] = useState(false);
  const [milestoneType, setMilestoneType] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const detectedRef = useRef(false);

  // ----- detect location on mount -----
  useEffect(() => {
    if (detectedRef.current || tab !== "new") return;
    detectedRef.current = true;
    if (!navigator.geolocation) {
      setStep("denied");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });

        // reverse geocode via existing edge function
        let location_name = "Current Location", city = "Unknown", country = "Unknown";
        try {
          const { data } = await supabase.functions.invoke("reverse-geocode", { body: { latitude: lat, longitude: lng } });
          if (data) {
            location_name = data.location_name || location_name;
            city = data.city || city;
            country = data.country || country;
          }
        } catch { /* keep defaults */ }

        // verification checks
        const gpsOk = true;
        const timestampOk = true; // client-only proxy
        let distanceOk = true;
        let throttle: number | null = null;

        if (user) {
          const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          const { data: recent } = await supabase
            .from("check_ins")
            .select("latitude,longitude,timestamp,city")
            .eq("user_id", user.id)
            .gte("timestamp", since)
            .order("timestamp", { ascending: false })
            .limit(5);
          if (recent && recent.length) {
            const last2h = recent.find(r => new Date(r.timestamp).getTime() > Date.now() - 2 * 60 * 60 * 1000);
            if (last2h?.latitude && last2h?.longitude) {
              const d = distanceMiles({ lat, lng }, { lat: last2h.latitude, lng: last2h.longitude });
              if (d < 1 && (last2h as any).city === city) distanceOk = false;
            }
            const sameCity = recent.find((r: any) => r.city === city);
            if (sameCity) {
              const hoursAgo = (Date.now() - new Date(sameCity.timestamp).getTime()) / 3600000;
              throttle = Math.max(0, Math.ceil(24 - hoursAgo));
            }
          }

          // new country check
          const { data: existing } = await supabase
            .from("places_visited")
            .select("id")
            .eq("user_id", user.id)
            .eq("country", country)
            .limit(1);
          setIsNewCountry(!existing || existing.length === 0);
        }

        setVerified(gpsOk);
        setVerificationMeta({ gps_captured: gpsOk, timestamp_valid: timestampOk, distance_unique: distanceOk });
        setPlace({ city, country, location_name });
        setThrottleHours(throttle);
        setStep("found");
        if (gpsOk) {
          setTimeout(() => setShowCelebration(true), 300);
          setTimeout(() => setShowCelebration(false), 1200);
        }
      },
      () => setStep("denied"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [tab, user]);

  const handlePhoto = (idx: number, file: File | null) => {
    const np = [...photos]; np[idx] = file; setPhotos(np);
    const npr = [...photoPreviews]; npr[idx] = file ? URL.createObjectURL(file) : null; setPhotoPreviews(npr);
  };

  const toggleMood = (m: string) => {
    setMoods(prev => prev.includes(m) ? prev.filter(x => x !== m) : prev.length >= 3 ? prev : [...prev, m]);
  };

  const handleSave = async () => {
    if (!user || !place || !coords) return;
    setSaving(true);
    try {
      // upload photos
      const photoUrls: string[] = [];
      for (const p of photos) {
        if (!p) continue;
        const ext = p.name.split(".").pop() || "jpg";
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("checkin-photos").upload(path, p);
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("checkin-photos").getPublicUrl(path);
        photoUrls.push(data.publicUrl);
      }

      const { error } = await supabase.from("check_ins").insert({
        user_id: user.id,
        location_name: place.location_name,
        city: place.city,
        country: place.country,
        latitude: coords.lat,
        longitude: coords.lng,
        notes: notes || null,
        photo: photoUrls[0] || null,
        photos: photoUrls,
        mood_tags: moods,
        is_milestone: isMilestone,
        milestone_type: isMilestone ? milestoneType : null,
        verified,
        verification_metadata: verificationMeta,
      });
      if (error) throw error;

      // places_visited upsert
      const { data: existingPlace } = await supabase
        .from("places_visited")
        .select("id,photos_count")
        .eq("user_id", user.id)
        .eq("city", place.city)
        .eq("country", place.country)
        .limit(1);

      const isNewCity = !existingPlace || existingPlace.length === 0;

      if (isNewCity) {
        await supabase.from("places_visited").insert({
          user_id: user.id,
          city: place.city,
          country: place.country,
          latitude: coords.lat,
          longitude: coords.lng,
          date_visited: new Date().toISOString().split("T")[0],
          photos_count: photoUrls.length,
          is_milestone: isMilestone,
          milestone_type: isMilestone ? milestoneType : null,
        });
      } else {
        await supabase.from("places_visited").update({
          photos_count: (existingPlace[0].photos_count || 0) + photoUrls.length,
          ...(isMilestone ? { is_milestone: true, milestone_type: milestoneType } : {}),
        }).eq("id", existingPlace[0].id);
      }

      // profile counters
      const { data: profile } = await supabase
        .from("profiles")
        .select("total_countries_visited,total_cities_visited,total_checkins")
        .eq("id", user.id)
        .maybeSingle();
      if (profile) {
        await supabase.from("profiles").update({
          total_checkins: (profile.total_checkins || 0) + 1,
          total_cities_visited: (profile.total_cities_visited || 0) + (isNewCity ? 1 : 0),
          total_countries_visited: (profile.total_countries_visited || 0) + (isNewCountry ? 1 : 0),
        }).eq("id", user.id);
      }

      // nearby offers
      const { data: offers } = await supabase.rpc("nearby_offers", { lat: coords.lat, lng: coords.lng, radius_miles: 5 });
      const offerCount = offers?.length || 0;

      qc.invalidateQueries({ queryKey: ["check-ins"] });
      // award any newly earned badges
      checkBadges();

      toast({ title: "Memory saved", description: `${place.city}, ${place.country}` });

      if (offerCount > 0 && offers) {
        toast({
          title: `${offers[0].business_name}${offerCount > 1 ? ` and ${offerCount - 1} others` : ""}`,
          description: "have deals near you. Tap to view.",
        });
      }
      navigate("/home");
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // History
  const { data: history, isLoading: histLoading } = useQuery({
    queryKey: ["check-ins", user?.id],
    enabled: !!user && tab === "history",
    staleTime: 60000,
    queryFn: async () => {
      const { data } = await supabase
        .from("check_ins")
        .select("id,city,country,location_name,timestamp,verified,photo,photos")
        .eq("user_id", user!.id)
        .order("timestamp", { ascending: false });
      return data || [];
    },
  });

  return (
    <div className="min-h-screen bg-[#080D1A] text-white pb-24">
      {/* top bar */}
      <div className="px-5 pt-12 pb-3 border-b border-white/5">
        <h1 className="font-display text-[18px] text-center text-white">Check In</h1>
      </div>

      {/* tabs */}
      <div className="flex border-b border-white/5">
        {[
          { id: "new", label: "New" },
          { id: "history", label: "History" },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex-1 py-3 text-[13px] font-medium transition-colors ${
              tab === t.id ? "text-[#3B82F6] border-b-2 border-[#3B82F6]" : "text-white/50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "new" && (
        <div className="relative">
          {/* STATE 1: detecting */}
          {step === "detecting" && (
            <div className="flex flex-col items-center justify-center pt-32 gap-6">
              <div className="relative w-[72px] h-[72px]">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="absolute inset-0 rounded-full border-2 border-[#3B82F6]"
                    initial={{ opacity: 0.8, scale: 0.4 }}
                    animate={{ opacity: 0, scale: 1.8 }}
                    transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.4, ease: "easeOut" }}
                  />
                ))}
                <div className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-[#3B82F6]" />
              </div>
              <p className="text-[14px] text-white/60 font-body">Detecting your location...</p>
            </div>
          )}

          {/* STATE: denied */}
          {step === "denied" && (
            <div className="px-5 pt-16">
              <div className="rounded-2xl bg-[#111827] border border-white/5 p-6 text-center space-y-4">
                <AlertTriangle className="w-10 h-10 mx-auto text-[#F59E0B]" />
                <h2 className="font-display text-[18px]">Location access needed</h2>
                <p className="text-[13px] text-white/60 leading-relaxed">
                  Roavr needs your location to verify check-ins and unlock landmarks on your globe.
                </p>
                <Button
                  onClick={() => { detectedRef.current = false; setStep("detecting"); }}
                  className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-full w-full h-11"
                >
                  Open Settings
                </Button>
              </div>
            </div>
          )}

          {/* STATE 2: found */}
          {step === "found" && place && (
            <div className="px-5 pt-12 pb-6">
              <div className="flex flex-col items-center text-center relative">
                {/* burst particles */}
                <AnimatePresence>
                  {showCelebration && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      {Array.from({ length: 50 }).map((_, i) => {
                        const angle = Math.random() * Math.PI * 2;
                        const dist = 60 + Math.random() * 60;
                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                            animate={{
                              opacity: 0,
                              scale: 0,
                              x: Math.cos(angle) * dist,
                              y: Math.sin(angle) * dist,
                            }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="absolute w-[6px] h-[6px] rounded-full"
                            style={{ background: i % 2 ? "#3B82F6" : "#F59E0B" }}
                          />
                        );
                      })}
                    </div>
                  )}
                </AnimatePresence>

                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 18 }}
                >
                  <MapPin className="w-12 h-12 text-[#3B82F6]" fill="#3B82F6" />
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0, scale: showCelebration ? 1.05 : 1 }}
                  transition={{ delay: 0.15 }}
                  className="font-display text-[36px] mt-4"
                >
                  {place.city}
                </motion.h2>
                <p className="text-[16px] text-white/60 font-body">{place.country}</p>

                {verified && (
                  <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10B981]/15 text-[#10B981] text-[12px]">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Verified
                  </div>
                )}

                {isNewCountry && verified && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-5 w-full rounded-2xl border border-[#3B82F6]/40 bg-[#111827] p-4"
                    style={{ boxShadow: "0 0 24px rgba(59,130,246,0.25)" }}
                  >
                    <p className="font-display text-[18px] flex items-center justify-center gap-2">
                      {countryFlag(place.country)} New country unlocked
                    </p>
                    <p className="text-[13px] text-white/60 mt-1">{place.country}</p>
                  </motion.div>
                )}

                {throttleHours !== null && throttleHours > 0 && (
                  <div className="mt-4 w-full rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 p-3 text-[12px] text-white/80 text-left">
                    You already checked in to {place.city} today. Next check-in available in {throttleHours}h. You can still add a memory below.
                  </div>
                )}
              </div>

              {/* memory form */}
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-8 rounded-3xl bg-[#111827] border border-white/5 p-5 space-y-5"
              >
                <div className="flex items-center gap-2 text-[13px] text-white/70">
                  <span>{countryFlag(place.country)}</span>
                  <span>{place.city}, {place.country}</span>
                </div>

                {/* photos */}
                <div className="flex gap-2 justify-between">
                  {photos.map((p, i) => (
                    <label
                      key={i}
                      className="relative w-[60px] h-[60px] rounded-full bg-[#1A2236] border border-white/10 flex items-center justify-center overflow-hidden cursor-pointer"
                    >
                      {photoPreviews[i] ? (
                        <>
                          <img src={photoPreviews[i]!} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); handlePhoto(i, null); }}
                            className="absolute top-0 right-0 bg-black/60 rounded-full p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <Camera className="w-5 h-5 text-white/40" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => handlePhoto(i, e.target.files?.[0] || null)}
                      />
                    </label>
                  ))}
                </div>

                {/* notes */}
                <div className="relative">
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value.slice(0, 500))}
                    placeholder="What will you remember about this moment?"
                    className="bg-[#1A2236] border-white/10 text-white placeholder:text-white/40 rounded-2xl min-h-[100px] resize-none"
                  />
                  <span className="absolute bottom-2 right-3 text-[11px] text-white/40">{notes.length}/500</span>
                </div>

                {/* moods */}
                <div className="-mx-5 px-5 overflow-x-auto no-scrollbar">
                  <div className="flex gap-2">
                    {MOODS.map(m => {
                      const on = moods.includes(m);
                      return (
                        <button
                          key={m}
                          onClick={() => toggleMood(m)}
                          className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] border transition-colors ${
                            on ? "bg-[#3B82F6] border-[#3B82F6] text-white" : "border-white/15 text-white/70"
                          }`}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* milestone */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#3B82F6]" />
                    <span className="text-[13px]">Mark as a life milestone?</span>
                  </div>
                  <Switch checked={isMilestone} onCheckedChange={setIsMilestone} />
                </div>
                {isMilestone && (
                  <div className="grid grid-cols-2 gap-2">
                    {MILESTONES.map(m => (
                      <button
                        key={m}
                        onClick={() => setMilestoneType(m)}
                        className={`px-3 py-2 rounded-xl text-[12px] border text-left transition-colors ${
                          milestoneType === m ? "bg-[#3B82F6]/20 border-[#3B82F6] text-white" : "border-white/10 text-white/70"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}

                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full h-12 bg-[#3B82F6] hover:bg-[#2563EB] rounded-full text-[14px] font-medium"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save memory"}
                </Button>
                <button
                  onClick={() => navigate("/home")}
                  className="w-full text-center text-[12px] text-white/50 underline-offset-2 hover:underline"
                >
                  Skip
                </button>
              </motion.div>
            </div>
          )}
        </div>
      )}

      {tab === "history" && (
        <div className="px-5 py-5 space-y-2">
          {histLoading && (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-[#1A2236] animate-pulse" />
              ))}
            </div>
          )}
          {!histLoading && history?.length === 0 && (
            <div className="text-center text-white/50 text-[13px] pt-20">No check-ins yet.</div>
          )}
          {history?.map((c: any) => {
            const photo = c.photo || c.photos?.[0];
            return (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-xl bg-[#111827] border border-white/5 p-3"
              >
                <span className="text-[24px]">{countryFlag(c.country)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] text-white truncate">{c.city || c.location_name}</p>
                  <p className="text-[12px] text-white/50 truncate">{c.country}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[12px] text-white/50">{format(new Date(c.timestamp), "MMM d")}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    c.verified ? "bg-[#10B981]/15 text-[#10B981]" : "bg-white/5 text-white/40"
                  }`}>
                    {c.verified ? "Verified" : "Unverified"}
                  </span>
                </div>
                {photo && <img src={photo} className="w-10 h-10 rounded-full object-cover" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
