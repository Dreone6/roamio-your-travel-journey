import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  X, Zap, ZapOff, Camera as CameraIcon, Video, Grid3X3, MapPin, Sparkles,
  RotateCcw, Maximize2, Upload, Globe as GlobeIcon, Users, Lock, Eye, Loader2,
  Timer, ScanLine, Plane, Briefcase, Send, Heart, Smile, Image as ImageIcon,
  ChevronDown, Cloud, Mountain, Compass, Award, Flag, Clock, Ruler, Tag,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { ensurePhotoPermission } from "@/lib/permissions";
import { geotagPhoto, type PhotoLocation } from "@/lib/exif";
import roavrPin from "@/assets/roavr-pin.png";

const FILTERS = [
  { id: "none", name: "Original", color: "" },
  { id: "cinematic", name: "Cinematic", color: "contrast-110 saturate-90 brightness-95" },
  { id: "sunset", name: "Sunset", color: "saturate-125 hue-rotate-[-10deg] brightness-105" },
  { id: "nightlife", name: "Nightlife", color: "saturate-150 contrast-115 hue-rotate-[20deg]" },
  { id: "beach", name: "Beach", color: "brightness-110 saturate-110 contrast-95" },
  { id: "foodie", name: "Foodie", color: "saturate-130 brightness-105" },
  { id: "vintage", name: "Vintage Film", color: "sepia-[0.35] contrast-105" },
  { id: "luxury", name: "Luxury", color: "brightness-105 contrast-110 saturate-80" },
  { id: "adventure", name: "Adventure", color: "contrast-115 saturate-105" },
  { id: "city_glow", name: "City Glow", color: "brightness-110 saturate-120 contrast-105" },
  { id: "passport", name: "Passport Stamp", color: "sepia-[0.5] contrast-115 saturate-75" },
];

const OVERLAYS = [
  { id: "city", label: "City", icon: MapPin },
  { id: "flag", label: "Flag", icon: Flag },
  { id: "date", label: "Date", icon: Clock },
  { id: "weather", label: "Weather", icon: Cloud },
  { id: "trip", label: "Trip", icon: Plane },
  { id: "pin", label: "Roavr Pin", icon: Compass },
  { id: "altitude", label: "Altitude", icon: Mountain },
  { id: "distance", label: "Distance", icon: Ruler },
  { id: "localtime", label: "Local Time", icon: Clock },
  { id: "badge", label: "Badge", icon: Award },
] as const;

type OverlayId = typeof OVERLAYS[number]["id"];

const MODES = [
  { id: "photo", label: "Photo", icon: CameraIcon },
  { id: "video", label: "Video", icon: Video },
  { id: "story", label: "Story", icon: Sparkles },
  { id: "checkin", label: "Check In", icon: MapPin },
  { id: "memory", label: "Memory", icon: Heart },
  { id: "scan", label: "Scan Booking", icon: ScanLine },
  { id: "share", label: "Share Location", icon: Send },
] as const;

type ModeId = typeof MODES[number]["id"];
type PostTarget = "story" | "memory" | "message" | "globe" | "checkin";
type Visibility = "public" | "followers" | "close" | "private";

interface Trip { id: string; title: string; destination: string }

export default function CameraPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<ModeId>("photo");
  const [activeFilter, setActiveFilter] = useState("none");
  const [activeOverlays, setActiveOverlays] = useState<Set<OverlayId>>(new Set(["city", "date", "pin"]));
  const [showFilters, setShowFilters] = useState(false);
  const [showOverlays, setShowOverlays] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [flash, setFlash] = useState<"off" | "on" | "auto">("off");
  const [timer, setTimer] = useState<0 | 3 | 10>(0);
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [locationOn, setLocationOn] = useState(true);
  const [watermark, setWatermark] = useState(true);

  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripId, setTripId] = useState<string | "">("");
  const [showTripPicker, setShowTripPicker] = useState(false);

  const [captured, setCaptured] = useState(false);
  const [showPostOptions, setShowPostOptions] = useState(false);
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("followers");
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [pickedPreview, setPickedPreview] = useState<string | null>(null);
  const [autoLocation, setAutoLocation] = useState<PhotoLocation | null>(null);
  const [geotagging, setGeotagging] = useState(false);
  const [posting, setPosting] = useState(false);
  const [autoSavePref, setAutoSavePref] = useState<"auto" | "ask" | "never">("auto");

  // Load trips + privacy preferences
  useEffect(() => {
    if (!user) return;
    (async () => {
      const [tRes, pRes] = await Promise.all([
        supabase.from("trips").select("id, title, destination").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("user_privacy_settings").select("auto_save_stories").eq("user_id", user.id).maybeSingle(),
      ]);
      setTrips((tRes.data as Trip[]) || []);
      const pref = (pRes.data as any)?.auto_save_stories;
      if (pref === "auto" || pref === "ask" || pref === "never") setAutoSavePref(pref);
    })();
  }, [user]);

  // Reroute special modes
  useEffect(() => {
    if (mode === "checkin") navigate("/checkin");
    if (mode === "scan") navigate("/trips?import=1");
    if (mode === "share") navigate("/safepass");
  }, [mode, navigate]);

  const handleCapture = async () => {
    const ok = await ensurePhotoPermission();
    if (!ok) return;
    const fire = () => { setCaptured(true); setShowPostOptions(true); };
    if (timer === 0) fire();
    else {
      toast.info(`Capturing in ${timer}s…`);
      setTimeout(fire, timer * 1000);
    }
  };

  const handlePickFile = () => fileInputRef.current?.click();

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPickedFile(file);
    setPickedPreview(URL.createObjectURL(file));
    setCaptured(true);
    setShowPostOptions(true);
    setGeotagging(true);
    const loc = await geotagPhoto(file);
    setAutoLocation(loc);
    setGeotagging(false);
    if (loc?.source === "exif") toast.success("Location detected from photo");
  };

  async function uploadStoryMedia(file: File): Promise<string | null> {
    if (!user) return null;
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("checkin-photos").upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) { toast.error("Upload failed", { description: error.message }); return null; }
    return supabase.storage.from("checkin-photos").getPublicUrl(path).data.publicUrl;
  }

  const visMap: Record<Visibility, string> = {
    public: "public", followers: "followers", close: "close_friends", private: "private",
  };

  const handlePost = async (target: PostTarget) => {
    if (!user) { toast.error("Please sign in first"); return; }
    if (target === "checkin") { navigate("/checkin"); return; }
    setPosting(true);
    try {
      let location = autoLocation;
      if ((target === "story" || target === "globe") && !location && locationOn) {
        setGeotagging(true);
        location = await geotagPhoto(pickedFile);
        setGeotagging(false);
        setAutoLocation(location);
      }

      if (target === "story") {
        let mediaUrl = pickedPreview || "";
        if (pickedFile) {
          const uploaded = await uploadStoryMedia(pickedFile);
          if (!uploaded) { setPosting(false); return; }
          mediaUrl = uploaded;
        }
        const { error } = await supabase.from("stories").insert({
          user_id: user.id,
          media_url: mediaUrl,
          media_type: mode === "video" ? "video" : "photo",
          caption: caption || null,
          location_name: null,
          latitude: location?.latitude ?? null,
          longitude: location?.longitude ?? null,
          trip_id: tripId || null,
          filter_name: activeFilter === "none" ? null : activeFilter,
          visibility: visMap[visibility],
          auto_save_to_globe: autoSavePref !== "never",
        });
        if (error) throw error;
        toast.success("Posted to your story", { description: "Live for 24 hours · pinned to your globe" });
        navigate("/stories");
        return;
      }

      toast.success(
        target === "memory" ? "Saved as a memory!" :
        target === "message" ? "Opening messages..." :
        "Pinned to your globe!"
      );
      if (target === "message") navigate("/messages");
      else navigate("/home");
    } catch (err: any) {
      toast.error("Something went wrong", { description: err?.message });
    } finally { setPosting(false); }
  };

  const resetCapture = () => {
    setCaptured(false); setShowPostOptions(false); setCaption("");
    setPickedFile(null); setPickedPreview(null); setAutoLocation(null);
  };

  const updateAutoSavePref = async (pref: "auto" | "ask" | "never") => {
    setAutoSavePref(pref);
    if (!user) return;
    await supabase.from("user_privacy_settings").upsert({ user_id: user.id, auto_save_stories: pref }, { onConflict: "user_id" });
    toast.success("Story auto-save updated");
  };

  const toggleOverlay = (id: OverlayId) => {
    setActiveOverlays((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedTrip = trips.find((t) => t.id === tripId);

  // ============================================================
  // PREVIEW / POST OPTIONS SCREEN
  // ============================================================
  if (showPostOptions) {
    return (
      <div className="min-h-screen dark-immersive flex flex-col relative">
        <div className="absolute inset-0 gradient-dark-radial" />
        <div className="relative flex-1 flex flex-col">
          <div className="relative px-4 pt-12 pb-3">
            <button onClick={resetCapture} className="absolute top-12 left-4 z-10 h-9 w-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
              <X className="h-4 w-4 text-white" />
            </button>
            <p className="text-center text-white/80 text-[12px] font-bold uppercase tracking-[0.2em]">Preview</p>

            <div className={`mt-3 mx-auto w-full max-w-sm aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 relative ${pickedPreview ? "" : "bg-gradient-to-br from-primary/30 via-[hsl(var(--dark-bg))] to-electric/20"} ${FILTERS.find(f => f.id === activeFilter)?.color || ""}`}>
              {pickedPreview ? (
                <img src={pickedPreview} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <CameraIcon className="h-12 w-12 text-white/30" />
                  <p className="text-white/40 text-[11px]">HD Capture · 4032 × 3024</p>
                </div>
              )}

              {/* Live overlays render on preview */}
              <PreviewOverlays
                overlays={activeOverlays}
                trip={selectedTrip}
                location={autoLocation}
                watermark={watermark}
              />

              <div className="absolute bottom-3 left-3 right-3 flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-3 py-1.5 text-[10px] font-medium text-white/90">
                {geotagging ? (<><Loader2 className="h-3 w-3 animate-spin text-electric" /> Detecting location…</>)
                  : autoLocation ? (<><MapPin className="h-3 w-3 text-electric" />
                      <span className="truncate">{autoLocation.latitude.toFixed(3)}, {autoLocation.longitude.toFixed(3)}</span>
                      <span className="ml-auto shrink-0 text-[9px] text-electric uppercase tracking-wider">{autoLocation.source === "exif" ? "From photo" : "Live"}</span></>)
                  : (<><MapPin className="h-3 w-3 text-white/40" /> {locationOn ? "We'll attach location on post" : "Location off"}</>)}
              </div>
            </div>
          </div>

          {/* Caption */}
          <div className="px-5 pt-2">
            <input
              type="text" placeholder="Add a caption…" value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full h-11 rounded-xl px-4 text-[13px] text-white placeholder:text-white/40 border-0 focus:outline-none dark-card-elevated"
            />
          </div>

          {/* Trip tag */}
          {trips.length > 0 && (
            <div className="px-5 pt-2.5">
              <button
                onClick={() => setShowTripPicker((v) => !v)}
                className="w-full flex items-center gap-2 dark-card-elevated rounded-xl px-3.5 h-11 text-[12px] text-white"
              >
                <Tag className="h-3.5 w-3.5 text-electric" />
                <span className="font-bold uppercase text-[10px] tracking-wider text-white/60">Trip</span>
                <span className="ml-1 truncate">{selectedTrip ? selectedTrip.title : "No trip"}</span>
                <ChevronDown className="ml-auto h-3.5 w-3.5 text-white/50" />
              </button>
              {showTripPicker && (
                <div className="mt-1.5 dark-card-elevated rounded-xl p-1 max-h-44 overflow-y-auto">
                  <button onClick={() => { setTripId(""); setShowTripPicker(false); }} className="w-full text-left px-3 py-2 text-[12px] text-white/70 hover:bg-white/5 rounded-lg">No trip</button>
                  {trips.map((t) => (
                    <button key={t.id} onClick={() => { setTripId(t.id); setShowTripPicker(false); }} className={`w-full text-left px-3 py-2 text-[12px] rounded-lg ${tripId === t.id ? "bg-primary/30 text-white" : "text-white/80 hover:bg-white/5"}`}>
                      <p className="font-bold truncate">{t.title}</p>
                      <p className="text-[10px] text-white/50 truncate">{t.destination}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Visibility */}
          <div className="px-5 pt-3">
            <p className="text-[10px] font-bold text-white/55 uppercase tracking-wider mb-1.5">Who can see this</p>
            <div className="grid grid-cols-4 gap-1.5">
              {([
                { id: "public", label: "Public", icon: Eye },
                { id: "followers", label: "Followers", icon: Users },
                { id: "close", label: "Close", icon: Heart },
                { id: "private", label: "Only me", icon: Lock },
              ] as const).map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setVisibility(id)}
                  className={`py-2 rounded-lg text-[10.5px] font-bold flex flex-col items-center gap-0.5 transition-all ${visibility === id ? "gradient-accent text-white" : "dark-card-elevated text-white/60"}`}>
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </div>
          </div>

          {/* Auto-save expired stories */}
          <div className="px-5 pt-3">
            <p className="text-[10px] font-bold text-white/55 uppercase tracking-wider mb-1.5">After 24h, save story to globe</p>
            <div className="grid grid-cols-3 gap-1.5">
              {(["auto", "ask", "never"] as const).map((p) => (
                <button key={p} onClick={() => updateAutoSavePref(p)}
                  className={`py-2 rounded-lg text-[10.5px] font-bold transition-all ${autoSavePref === p ? "bg-electric text-[hsl(var(--dark-bg))]" : "dark-card-elevated text-white/60"}`}>
                  {p === "auto" ? "Always" : p === "ask" ? "Ask first" : "Never"}
                </button>
              ))}
            </div>
          </div>

          {/* Post targets */}
          <div className="px-5 pt-4 pb-8 space-y-2 mt-auto">
            {([
              { target: "story" as PostTarget, label: "Post to 24h Story", desc: "Feed + globe pin", icon: Sparkles, gradient: "gradient-accent" },
              { target: "memory" as PostTarget, label: "Save as Memory", desc: "Pin to globe forever", icon: Heart, gradient: "gradient-glow" },
              { target: "checkin" as PostTarget, label: "Check In Here", desc: "Add to your travel log", icon: MapPin, gradient: "gradient-coral" },
              { target: "globe" as PostTarget, label: "Pin to Globe", desc: "Add directly to your map", icon: GlobeIcon, gradient: "" },
              { target: "message" as PostTarget, label: "Send in Message", desc: "Share with a friend", icon: Send, gradient: "" },
            ]).map((opt) => (
              <button key={opt.target} onClick={() => handlePost(opt.target)} disabled={posting}
                className={`w-full rounded-xl p-3 flex items-center gap-3 text-left transition-all disabled:opacity-60 ${opt.gradient || "dark-card-elevated"} text-white`}>
                <div className="h-9 w-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                  <opt.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[13px] leading-tight">{opt.label}</p>
                  <p className="text-[10.5px] opacity-75 leading-tight mt-0.5">{opt.desc}</p>
                </div>
                {posting && opt.target === "story" && <Loader2 className="h-4 w-4 animate-spin" />}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // CAMERA VIEWFINDER
  // ============================================================
  return (
    <div className="min-h-screen bg-black flex flex-col relative overflow-hidden">
      {/* Top status bar */}
      <div className="relative z-20 flex items-center justify-between px-4 pt-12 pb-2">
        <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center">
          <X className="h-4 w-4 text-white" />
        </button>
        <div className="flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-full bg-electric/90 text-[hsl(var(--dark-bg))] text-[9px] font-extrabold tracking-wider">HD</span>
          <span className="text-white/70 text-[10px] font-bold">{mode === "video" ? "4K · 30fps" : "48MP"}</span>
        </div>
        <button onClick={handlePickFile} className="h-9 w-9 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center" aria-label="Gallery">
          <ImageIcon className="h-4 w-4 text-white" />
        </button>
      </div>

      {/* Top tool row */}
      <div className="relative z-20 flex items-center justify-center gap-1.5 px-4 pb-2">
        <ToolBtn active={flash !== "off"} onClick={() => setFlash(flash === "off" ? "auto" : flash === "auto" ? "on" : "off")}>
          {flash === "off" ? <ZapOff className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
          <span className="text-[9px] font-bold ml-0.5 uppercase">{flash}</span>
        </ToolBtn>
        <ToolBtn active={showGrid} onClick={() => setShowGrid((v) => !v)}><Grid3X3 className="h-3.5 w-3.5" /></ToolBtn>
        <ToolBtn active={timer > 0} onClick={() => setTimer(timer === 0 ? 3 : timer === 3 ? 10 : 0)}>
          <Timer className="h-3.5 w-3.5" />
          {timer > 0 && <span className="text-[9px] font-bold ml-0.5">{timer}s</span>}
        </ToolBtn>
        <ToolBtn active={locationOn} onClick={() => setLocationOn((v) => !v)}><MapPin className="h-3.5 w-3.5" /></ToolBtn>
        <ToolBtn active={watermark} onClick={() => setWatermark((v) => !v)}>
          <img src={roavrPin} alt="" className="h-3.5 w-3.5 object-contain brightness-0 invert" />
        </ToolBtn>
      </div>

      {/* Viewfinder */}
      <div className="relative flex-1 mx-3 rounded-3xl overflow-hidden border border-white/10 shadow-elevated">
        <div className={`absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#0f0f1c] to-[#0a0a14] ${FILTERS.find(f => f.id === activeFilter)?.color || ""}`} />
        {/* Faux scene */}
        <div className="absolute inset-0 flex items-center justify-center opacity-30">
          <CameraIcon className="h-20 w-20 text-white/30" />
        </div>

        {/* Grid */}
        {showGrid && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/25" />
            <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/25" />
            <div className="absolute top-1/3 left-0 right-0 h-px bg-white/25" />
            <div className="absolute top-2/3 left-0 right-0 h-px bg-white/25" />
          </div>
        )}

        {/* Focus reticle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-20 w-20 border-2 border-electric/70 rounded-xl opacity-50" />

        {/* Overlay chips rendered live */}
        <PreviewOverlays
          overlays={activeOverlays}
          trip={selectedTrip}
          location={autoLocation}
          watermark={watermark}
        />

        {/* Trip tag pill */}
        {trips.length > 0 && (
          <button
            onClick={() => setShowTripPicker((v) => !v)}
            className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1.5"
          >
            <Tag className="h-3 w-3 text-electric" />
            <span className="text-white text-[10px] font-bold truncate max-w-[120px]">
              {selectedTrip ? selectedTrip.title : "Tag a trip"}
            </span>
            <ChevronDown className="h-3 w-3 text-white/60" />
          </button>
        )}

        {showTripPicker && trips.length > 0 && (
          <div className="absolute top-14 left-3 w-56 dark-card-elevated rounded-xl p-1 max-h-52 overflow-y-auto z-30 shadow-elevated">
            <button onClick={() => { setTripId(""); setShowTripPicker(false); }} className="w-full text-left px-3 py-2 text-[12px] text-white/70 hover:bg-white/5 rounded-lg">No trip</button>
            {trips.map((t) => (
              <button key={t.id} onClick={() => { setTripId(t.id); setShowTripPicker(false); }} className={`w-full text-left px-3 py-2 rounded-lg ${tripId === t.id ? "bg-primary/30 text-white" : "text-white/80 hover:bg-white/5"}`}>
                <p className="font-bold text-[12px] truncate">{t.title}</p>
                <p className="text-[10px] text-white/50 truncate">{t.destination}</p>
              </button>
            ))}
          </div>
        )}

        {/* Mode-specific overlay hint */}
        {mode === "story" && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-electric text-[hsl(var(--dark-bg))] text-[10px] font-extrabold uppercase tracking-wider">
            Story · 24h
          </div>
        )}
      </div>

      {/* Filter strip */}
      {showFilters && (
        <div className="relative z-20 px-3 pt-3 animate-fade-in">
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {FILTERS.map((f) => (
              <button key={f.id} onClick={() => setActiveFilter(f.id)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[10.5px] font-bold transition-all ${activeFilter === f.id ? "gradient-glow text-[hsl(var(--dark-bg))]" : "bg-white/10 text-white/70"}`}>
                {f.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Overlay sticker strip */}
      {showOverlays && (
        <div className="relative z-20 px-3 pt-3 animate-fade-in">
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {OVERLAYS.map((o) => {
              const on = activeOverlays.has(o.id);
              return (
                <button key={o.id} onClick={() => toggleOverlay(o.id)}
                  className={`shrink-0 rounded-full px-2.5 py-1.5 text-[10.5px] font-bold flex items-center gap-1 transition-all ${on ? "bg-electric text-[hsl(var(--dark-bg))]" : "bg-white/10 text-white/70"}`}>
                  {on && <CheckCircle2 className="h-3 w-3" />}
                  <o.icon className="h-3 w-3" /> {o.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Mode selector */}
      <div className="relative z-20 flex items-center justify-start gap-4 py-3 px-5 overflow-x-auto no-scrollbar">
        {MODES.map((m) => (
          <button key={m.id} onClick={() => setMode(m.id)}
            className={`shrink-0 flex flex-col items-center gap-0.5 transition-all ${mode === m.id ? "text-electric scale-105" : "text-white/40"}`}>
            <m.icon className="h-4 w-4" />
            <span className="text-[9.5px] font-extrabold uppercase tracking-wider whitespace-nowrap">{m.label}</span>
          </button>
        ))}
      </div>

      {/* Hidden file picker */}
      <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelected} />

      {/* Capture controls */}
      <div className="relative z-20 flex items-center justify-between px-8 pb-2">
        <button onClick={() => setShowFilters((v) => { setShowOverlays(false); return !v; })} className={`h-11 w-11 rounded-full flex items-center justify-center ${showFilters ? "bg-electric text-[hsl(var(--dark-bg))]" : "bg-white/10 text-white"}`} aria-label="Filters">
          <Sparkles className="h-4 w-4" />
        </button>

        <button onClick={handleCapture} className="relative h-[78px] w-[78px] rounded-full border-[3px] border-white flex items-center justify-center active:scale-95 transition-transform">
          <div className={`h-[64px] w-[64px] rounded-full ${mode === "video" ? "bg-coral" : mode === "story" ? "gradient-glow" : "bg-white"} transition-all`} />
          {mode === "story" && <Sparkles className="absolute h-5 w-5 text-[hsl(var(--dark-bg))]" />}
        </button>

        <button onClick={() => setShowOverlays((v) => { setShowFilters(false); return !v; })} className={`h-11 w-11 rounded-full flex items-center justify-center ${showOverlays ? "bg-electric text-[hsl(var(--dark-bg))]" : "bg-white/10 text-white"}`} aria-label="Overlays">
          <Smile className="h-4 w-4" />
        </button>
      </div>

      {/* Bottom utility row */}
      <div className="relative z-20 flex items-center justify-center gap-2 pb-3 px-4">
        <button onClick={() => setFacing(facing === "back" ? "front" : "back")} className="h-8 px-3 rounded-full bg-white/10 flex items-center gap-1.5 text-white text-[10px] font-bold">
          <RotateCcw className="h-3 w-3" /> Flip
        </button>
        <button
          onClick={() => mode === "story" ? handleCapture() : setMode("story")}
          className="h-8 px-3 rounded-full gradient-accent flex items-center gap-1.5 text-white text-[10px] font-bold"
        >
          <Send className="h-3 w-3" /> Publish Story
        </button>
        <button onClick={handlePickFile} className="h-8 px-3 rounded-full bg-white/10 flex items-center gap-1.5 text-white text-[10px] font-bold">
          <Upload className="h-3 w-3" /> Upload
        </button>
      </div>

      <div className="safe-area-bottom pb-2" />
    </div>
  );
}

// ============================================================
// Subcomponents
// ============================================================
function ToolBtn({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`h-8 min-w-8 px-2 rounded-full backdrop-blur-md flex items-center justify-center transition-colors ${active ? "bg-electric text-[hsl(var(--dark-bg))]" : "bg-black/50 text-white"}`}>
      {children}
    </button>
  );
}

function PreviewOverlays({
  overlays, trip, location, watermark,
}: {
  overlays: Set<OverlayId>;
  trip?: Trip;
  location: PhotoLocation | null;
  watermark: boolean;
}) {
  const now = new Date();
  const date = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const localTime = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const chips: { id: OverlayId; node: React.ReactNode }[] = [];
  if (overlays.has("city")) chips.push({ id: "city", node: <>📍 {location ? `${location.latitude.toFixed(1)}°, ${location.longitude.toFixed(1)}°` : "Lisbon, Portugal"}</> });
  if (overlays.has("flag")) chips.push({ id: "flag", node: <>🇵🇹 PT</> });
  if (overlays.has("date")) chips.push({ id: "date", node: <>🗓 {date}</> });
  if (overlays.has("weather")) chips.push({ id: "weather", node: <>☀️ 27°C</> });
  if (overlays.has("trip") && trip) chips.push({ id: "trip", node: <>✈️ {trip.title}</> });
  if (overlays.has("altitude")) chips.push({ id: "altitude", node: <>⛰ 142m</> });
  if (overlays.has("distance")) chips.push({ id: "distance", node: <>📏 8,412 km from home</> });
  if (overlays.has("localtime")) chips.push({ id: "localtime", node: <>🕒 {localTime} local</> });
  if (overlays.has("badge")) chips.push({ id: "badge", node: <>🏅 Globetrotter Lv.3</> });

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top-left stack */}
      <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5 max-w-[60%]">
        {chips.map((c) => (
          <div key={c.id} className="px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1">
            {c.node}
          </div>
        ))}
      </div>

      {/* Roavr pin watermark */}
      {(watermark || overlays.has("pin")) && (
        <div className="absolute bottom-12 right-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/45 backdrop-blur-md">
          <img src={roavrPin} alt="Roavr" className="h-3.5 w-3.5 object-contain" />
          <span className="text-white text-[9px] font-extrabold tracking-widest uppercase">Roavr</span>
        </div>
      )}
    </div>
  );
}
