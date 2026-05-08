import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  X, Zap, Camera as CameraIcon, Video, Grid3X3, Sun, Moon, Mountain,
  MapPin, Send, Image as ImageIcon, Sparkles, ChevronDown, RotateCcw, Circle,
  Maximize2, Focus, SunMedium, Upload, Globe as GlobeIcon, Users, Lock, Eye, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { ensureLocationPermission, ensurePhotoPermission } from "@/lib/permissions";
import { geotagPhoto, type PhotoLocation } from "@/lib/exif";

const FILTERS = [
  { id: "none", name: "Original", color: "" },
  { id: "travel_glow", name: "Travel Glow", color: "brightness-110 saturate-125" },
  { id: "cinematic", name: "Cinematic", color: "contrast-110 saturate-90 brightness-95" },
  { id: "vintage", name: "Vintage Film", color: "sepia-[0.3] contrast-105" },
  { id: "neon", name: "Neon Night", color: "saturate-150 contrast-110 hue-rotate-15" },
  { id: "beach", name: "Beach Day", color: "brightness-110 saturate-110 contrast-95" },
  { id: "foodie", name: "Foodie", color: "saturate-130 brightness-105" },
  { id: "adventure", name: "Adventure", color: "contrast-115 saturate-105" },
  { id: "luxury", name: "Luxury", color: "brightness-105 contrast-110 saturate-80" },
];

const STICKERS = [
  "📍 Location", "🏔 Altitude", "📅 Date", "🌤 Weather", "🏅 Badge",
  "✈️ Route", "🌍 Globe Pin", "🗺 Country Flag", "📷 Polaroid", "🎫 Stamp",
];

const MODES = [
  { id: "photo", label: "Photo", icon: CameraIcon },
  { id: "video", label: "Video", icon: Video },
  { id: "portrait", label: "Portrait", icon: Focus },
  { id: "landscape", label: "Landscape", icon: Mountain },
  { id: "night", label: "Night", icon: Moon },
];

type PostTarget = "story" | "memory" | "message" | "globe";

export default function CameraPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState("photo");
  const [activeFilter, setActiveFilter] = useState("none");
  const [showFilters, setShowFilters] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [captured, setCaptured] = useState(false);
  const [showPostOptions, setShowPostOptions] = useState(false);
  const [caption, setCaption] = useState("");
  // Default visibility: Followers (per privacy model). Toggle to Public or Private.
  const [visibility, setVisibility] = useState<"public" | "followers" | "private">("followers");
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [pickedPreview, setPickedPreview] = useState<string | null>(null);
  const [autoLocation, setAutoLocation] = useState<PhotoLocation | null>(null);
  const [geotagging, setGeotagging] = useState(false);
  const [posting, setPosting] = useState(false);

  const handleCapture = async () => {
    // Trigger-based: only ask for camera/photo permission when the user actually captures.
    const ok = await ensurePhotoPermission();
    if (!ok) return;
    setPickedFile(null);
    setPickedPreview(null);
    setAutoLocation(null);
    setCaptured(true);
    setShowPostOptions(true);
  };

  const handlePickFile = () => fileInputRef.current?.click();

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPickedFile(file);
    setPickedPreview(URL.createObjectURL(file));
    setCaptured(true);
    setShowPostOptions(true);

    // Auto-geotag from EXIF immediately so the user sees the detected location.
    setGeotagging(true);
    const loc = await geotagPhoto(file);
    setAutoLocation(loc);
    setGeotagging(false);
    if (loc?.source === "exif") {
      toast.success("Location detected from photo");
    }
  };

  async function uploadStoryMedia(file: File): Promise<string | null> {
    if (!user) return null;
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("checkin-photos").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) {
      toast.error("Upload failed", { description: error.message });
      return null;
    }
    const { data } = supabase.storage.from("checkin-photos").getPublicUrl(path);
    return data.publicUrl;
  }

  const handlePost = async (target: PostTarget) => {
    if (!user) {
      toast.error("Please sign in first");
      return;
    }
    setPosting(true);
    try {
      // Auto-geotag for Story / Globe targets.
      let location = autoLocation;
      if ((target === "story" || target === "globe") && !location) {
        setGeotagging(true);
        location = await geotagPhoto(pickedFile);
        setGeotagging(false);
        setAutoLocation(location);
      }

      // For story posting, persist to DB so it appears in feed AND on the globe.
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
          filter_name: activeFilter === "none" ? null : activeFilter,
          visibility,
          auto_save_to_globe: true, // dual-view: feed + Story Pin on globe
        });
        if (error) throw error;

        toast.success("Posted to your story", {
          description: location
            ? `Pinned to your globe (${location.source === "exif" ? "from photo" : "live location"})`
            : "Visible in your feed",
        });
        navigate("/stories");
        return;
      }

      // Other targets keep their original mock behavior.
      toast.success(
        target === "memory" ? "Saved as a memory!" :
        target === "message" ? "Opening messages..." :
        "Pinned to your globe!"
      );
      if (target === "message") navigate("/messages");
      else navigate("/home");
    } catch (err: any) {
      toast.error("Something went wrong", { description: err?.message });
    } finally {
      setPosting(false);
    }
  };

  const resetCapture = () => {
    setCaptured(false);
    setShowPostOptions(false);
    setCaption("");
    setPickedFile(null);
    setPickedPreview(null);
    setAutoLocation(null);
  };

  if (showPostOptions) {
    return (
      <div className="min-h-screen dark-immersive flex flex-col">
        <div className="absolute inset-0 gradient-dark-radial" />
        <div className="relative flex-1 flex flex-col">
          {/* Preview */}
          <div className="relative px-4 pt-12 pb-3">
            <button onClick={resetCapture} className="absolute top-12 left-4 z-10 h-9 w-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
              <X className="h-4 w-4 text-white" />
            </button>
            <div className={`mx-auto w-full max-w-sm aspect-[3/4] rounded-2xl overflow-hidden flex items-center justify-center border border-white/10 relative ${pickedPreview ? "" : "bg-gradient-to-br from-emerald-900/40 to-primary/20"} ${FILTERS.find(f => f.id === activeFilter)?.color || ""}`}>
              {pickedPreview ? (
                <img src={pickedPreview} alt="Story preview" className="h-full w-full object-cover" />
              ) : (
                <div className="text-center space-y-2">
                  <CameraIcon className="h-12 w-12 text-white/30 mx-auto" />
                  <p className="text-white/40 text-[11px]">HD Photo Preview</p>
                  <p className="text-glow text-[10px] font-bold">4032 × 3024</p>
                </div>
              )}

              {/* Auto-geotag badge */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center gap-1.5 rounded-full bg-black/55 backdrop-blur-md px-3 py-1.5 text-[10px] font-medium text-white/90">
                {geotagging ? (
                  <><Loader2 className="h-3 w-3 animate-spin text-glow" /> Detecting location…</>
                ) : autoLocation ? (
                  <>
                    <MapPin className="h-3 w-3 text-glow" />
                    <span className="truncate">
                      {autoLocation.latitude.toFixed(3)}, {autoLocation.longitude.toFixed(3)}
                    </span>
                    <span className="ml-auto shrink-0 text-[9px] text-glow uppercase tracking-wider">
                      {autoLocation.source === "exif" ? "From photo" : "Live"}
                    </span>
                  </>
                ) : (
                  <><MapPin className="h-3 w-3 text-white/40" /> No location yet — we'll add it on post</>
                )}
              </div>
            </div>
          </div>

          {/* Caption */}
          <div className="px-5 pt-2">
            <input
              type="text"
              placeholder="Add a caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full h-10 rounded-xl px-4 text-[13px] text-white placeholder:text-dark-muted border-0 focus:outline-none dark-card-elevated"
            />
          </div>

          {/* Visibility — Followers default, with Public/Private toggles */}
          <div className="px-5 pt-3">
            <p className="text-[10px] font-bold text-dark-muted uppercase tracking-wider mb-1.5">Who can see this</p>
            <div className="flex gap-2">
              {([
                { id: "followers", label: "Followers", icon: Users },
                { id: "public", label: "Public", icon: Eye },
                { id: "private", label: "Private", icon: Lock },
              ] as const).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setVisibility(id)}
                  className={`flex-1 py-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                    visibility === id ? "gradient-glow text-white glow-accent" : "dark-card-elevated text-dark-muted"
                  }`}
                >
                  <Icon className="h-3 w-3" /> {label}
                </button>
              ))}
            </div>
          </div>

          {/* Post targets */}
          <div className="px-5 pt-4 pb-8 space-y-2.5 mt-auto">
            {([
              { target: "story" as PostTarget, label: "Post to 24h Story", desc: "Appears in feed and on your globe", icon: "⏳", gradient: "gradient-accent" },
              { target: "memory" as PostTarget, label: "Save as Memory", desc: "Pin to your globe forever", icon: "📌", gradient: "gradient-glow" },
              { target: "globe" as PostTarget, label: "Pin to Globe", desc: "Add directly to your map", icon: "🌍", gradient: "gradient-navy" },
              { target: "message" as PostTarget, label: "Send in Message", desc: "Share with a friend", icon: "💬", gradient: "" },
            ]).map((opt) => (
              <button
                key={opt.target}
                onClick={() => handlePost(opt.target)}
                disabled={posting}
                className={`w-full rounded-xl p-3.5 flex items-center gap-3 text-left transition-all disabled:opacity-60 ${opt.gradient || "dark-card-elevated"} text-white`}
              >
                <span className="text-lg">{opt.icon}</span>
                <div className="flex-1">
                  <p className="font-semibold text-[13px]">{opt.label}</p>
                  <p className="text-[11px] opacity-70">{opt.desc}</p>
                </div>
                {posting && opt.target === "story" && <Loader2 className="h-4 w-4 animate-spin" />}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen dark-immersive flex flex-col relative">
      <div className="absolute inset-0 bg-black" />

      {/* Top controls */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-12 pb-3">
        <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
          <X className="h-4 w-4 text-white" />
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowGrid(!showGrid)} className={`h-8 w-8 rounded-full flex items-center justify-center ${showGrid ? "bg-white/20" : "bg-black/40"} backdrop-blur-md`}>
            <Grid3X3 className="h-3.5 w-3.5 text-white" />
          </button>
          <button className="h-8 w-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
            <Zap className="h-3.5 w-3.5 text-white" />
          </button>
          <button className="h-8 w-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
            <SunMedium className="h-3.5 w-3.5 text-white" />
          </button>
        </div>
      </div>

      {/* Viewfinder */}
      <div className="relative flex-1 mx-4 rounded-2xl overflow-hidden border border-white/10">
        <div className="w-full h-full bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
          <div className="text-center space-y-3">
            <CameraIcon className="h-16 w-16 text-white/20 mx-auto" />
            <p className="text-white/30 text-[12px] font-medium">Roavr Camera</p>
            <p className="text-glow text-[10px] font-bold">HD · {mode === "video" ? "4K 30fps" : "48MP"}</p>
          </div>
        </div>

        {/* Grid overlay */}
        {showGrid && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/20" />
            <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/20" />
            <div className="absolute top-1/3 left-0 right-0 h-px bg-white/20" />
            <div className="absolute top-2/3 left-0 right-0 h-px bg-white/20" />
          </div>
        )}

        {/* Focus indicator */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-16 w-16 border-2 border-glow rounded-lg opacity-40" />

        {/* Location tag */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/50 backdrop-blur-md px-2.5 py-1">
          <MapPin className="h-3 w-3 text-glow" />
          <span className="text-white text-[10px] font-medium">Auto-locate</span>
        </div>

        {/* HD indicator */}
        <div className="absolute top-3 right-3 rounded-full bg-black/50 backdrop-blur-md px-2 py-0.5">
          <span className="text-glow text-[9px] font-bold">HD</span>
        </div>
      </div>

      {/* Mode selector */}
      <div className="relative z-10 flex items-center justify-center gap-4 py-3 px-4 overflow-x-auto">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`flex flex-col items-center gap-1 min-w-[48px] transition-all ${mode === m.id ? "text-glow scale-105" : "text-white/40"}`}
          >
            <m.icon className="h-4 w-4" />
            <span className="text-[9px] font-bold">{m.label}</span>
          </button>
        ))}
      </div>

      {/* Capture controls */}
      <div className="relative z-10 flex items-center justify-center gap-6 pb-3">
        <button onClick={() => setShowFilters(!showFilters)} className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-white" />
        </button>
        <button onClick={handleCapture} className="h-[68px] w-[68px] rounded-full border-4 border-white/80 flex items-center justify-center">
          <div className={`h-14 w-14 rounded-full ${mode === "video" ? "bg-red-500" : "bg-white"} transition-all active:scale-90`} />
        </button>
        <button onClick={() => setShowStickers(!showStickers)} className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center">
          <span className="text-sm">🎨</span>
        </button>
      </div>

      {/* Filter strip */}
      {showFilters && (
        <div className="relative z-10 px-4 pb-4 animate-fade-in">
          <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`shrink-0 rounded-xl px-3 py-2 text-[10px] font-bold transition-all ${activeFilter === f.id ? "gradient-glow text-white" : "bg-white/10 text-white/60"}`}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sticker strip */}
      {showStickers && (
        <div className="relative z-10 px-4 pb-4 animate-fade-in">
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {STICKERS.map((s) => (
              <button
                key={s}
                onClick={() => toast.success(`${s} sticker added`)}
                className="shrink-0 rounded-xl bg-white/10 px-3 py-2 text-[10px] font-bold text-white/70 hover:bg-white/20 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="safe-area-bottom" />
    </div>
  );
}
