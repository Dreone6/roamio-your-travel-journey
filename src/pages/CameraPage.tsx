import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  X, Zap, ZapOff, ChevronDown, Sparkles, Smile, Type as TypeIcon, Info,
  SlidersHorizontal, MapPin, Calendar, Tag as TagIcon, Users, Lock, Globe as GlobeIcon,
  Eye, Loader2, CheckCircle2, Plus, ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";
import { ensurePhotoPermission, ensureLocationPermission } from "@/lib/permissions";
import { geotagPhoto, type PhotoLocation } from "@/lib/exif";
import GeoFilterCarousel, { GeoFilterOverlay } from "@/components/camera/GeoFilterCarousel";
import type { GeoFilter } from "@/lib/geoFilters";

// ─────────────────────────── DATA ───────────────────────────

const MODES = ["Photo", "Check In", "Scan"] as const;
type ModeId = typeof MODES[number];

const STYLE_FILTERS = [
  { id: "none", name: "None", css: "" },
  { id: "cinematic", name: "Cinematic", css: "contrast-110 saturate-75 brightness-95" },
  { id: "postcard", name: "Postcard", css: "saturate-110 brightness-105" },
  { id: "passport", name: "Passport", css: "grayscale contrast-125" },
  { id: "golden", name: "Golden Hour", css: "sepia-[0.25] saturate-125 brightness-105" },
  { id: "nightlife", name: "Nightlife", css: "contrast-125 saturate-90 brightness-90" },
  { id: "foodie", name: "Foodie", css: "saturate-150 brightness-105" },
  { id: "beach", name: "Beach", css: "brightness-110 saturate-110 contrast-95" },
];

const STAMPS = [
  { id: "passport", label: "Passport Stamp" },
  { id: "city", label: "City Name" },
  { id: "flag", label: "Country Flag" },
  { id: "trip", label: "Trip Name" },
  { id: "time", label: "Local Time" },
  { id: "weather", label: "Weather" },
  { id: "pin", label: "Map Pin" },
  { id: "coords", label: "Coordinates" },
] as const;
type StampId = typeof STAMPS[number]["id"];

const TABS = [
  { id: "frames", label: "Frames", icon: Sparkles },
  { id: "stickers", label: "Stickers", icon: Smile },
  { id: "text", label: "Text", icon: TypeIcon },
  { id: "details", label: "Details", icon: Info },
  { id: "adjust", label: "Adjust", icon: SlidersHorizontal },
] as const;
type TabId = typeof TABS[number]["id"];

type Visibility = "private" | "followers" | "public";

interface Trip { id: string; title: string; destination: string }
interface PlacedStamp { id: StampId; x: number; y: number }

// ─────────────────────────── PAGE ───────────────────────────

export default function CameraPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [mode, setMode] = useState<ModeId>("Photo");
  const [flash, setFlash] = useState(false);

  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [pickedPreview, setPickedPreview] = useState<string | null>(null);
  const [autoLocation, setAutoLocation] = useState<PhotoLocation | null>(null);
  const [detectedCity, setDetectedCity] = useState<string | null>(null);
  const [selectedGeoFilter, setSelectedGeoFilter] = useState<GeoFilter | null>(null);

  const [editing, setEditing] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [scanReview, setScanReview] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Reverse-geocode on mount so geo filters know which city we're in
  useEffect(() => {
    (async () => {
      const ok = await ensureLocationPermission();
      if (!ok) {
        setDetectedCity("Positano"); // canonical fallback
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { data } = await supabase.functions.invoke("reverse-geocode", {
              body: { lat: pos.coords.latitude, lng: pos.coords.longitude },
            });
            setDetectedCity(data?.city || "Positano");
          } catch {
            setDetectedCity("Positano");
          }
        },
        () => setDetectedCity("Positano"),
        { timeout: 8000, maximumAge: 5 * 60e3 }
      );
    })();
  }, []);

  const reset = () => {
    setEditing(false);
    setCheckInOpen(false);
    setScanReview(false);
    setPublishOpen(false);
    setPickedFile(null);
    setPickedPreview(null);
    setAutoLocation(null);
  };

  // Capture flow → opens correct post-capture screen
  const handleShutter = async () => {
    const ok = await ensurePhotoPermission();
    if (!ok) return;
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPickedFile(file);
    setPickedPreview(URL.createObjectURL(file));
    if (mode === "Check In") {
      setCheckInOpen(true);
    } else if (mode === "Scan") {
      setScanReview(true);
    } else {
      setEditing(true);
    }
    const loc = await geotagPhoto(file);
    setAutoLocation(loc);
  };

  // ─────────────── ROUTES ───────────────
  if (publishOpen && pickedPreview) {
    return (
      <PublishSheet
        previewUrl={pickedPreview}
        onClose={() => setPublishOpen(false)}
        onPosted={() => { reset(); navigate("/home"); }}
        pickedFile={pickedFile}
        userId={user?.id}
        location={autoLocation}
      />
    );
  }

  if (editing && pickedPreview) {
    return (
      <EditScreen
        previewUrl={pickedPreview}
        onRetake={reset}
        onSave={() => { toast.success("Saved privately to your globe"); reset(); navigate("/globe"); }}
        onPostMoment={() => setPublishOpen(true)}
        location={autoLocation}
      />
    );
  }

  if (checkInOpen) {
    return (
      <CheckInScreen
        previewUrl={pickedPreview}
        location={autoLocation}
        onBack={reset}
        onDropped={() => { toast.success("Pinned to your World globe"); reset(); navigate("/globe"); }}
      />
    );
  }

  if (scanReview) {
    return <ScanReviewScreen onBack={reset} onAdded={() => { reset(); navigate("/trips"); }} />;
  }

  // ─────────────── LIVE CAMERA ───────────────
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#000000" }}>
      {/* Top row — 3 elements */}
      <div className="px-5 pt-12 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          aria-label="Close"
          className="h-10 w-10 flex items-center justify-center active:scale-95 transition-transform"
        >
          <X className="h-6 w-6 text-white" strokeWidth={1.5} />
        </button>
        <p className="text-white" style={{ fontSize: 14, letterSpacing: "0.1px" }}>
          {mode}
        </p>
        <button
          onClick={() => galleryInputRef.current?.click()}
          aria-label="Gallery"
          className="h-9 w-9 active:scale-95 transition-transform"
          style={{ borderRadius: 8, border: "1px solid #FFFFFF", overflow: "hidden", background: "#1A2236" }}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={handleFileSelected}
        />
      </div>

      {/* Flash toggle */}
      <div className="px-5 pt-4">
        <button
          onClick={() => setFlash((f) => !f)}
          aria-label="Flash"
          className="h-9 w-9 flex items-center justify-center active:scale-95 transition-transform"
        >
          {flash ? (
            <Zap className="h-6 w-6" style={{ color: "#F59E0B", fill: "#F59E0B" }} strokeWidth={1.5} />
          ) : (
            <ZapOff className="h-6 w-6" style={{ color: "#94A3B8" }} strokeWidth={1.5} />
          )}
        </button>
      </div>

      {/* Clean viewport */}
      <div className="flex-1 mx-5 mt-4 mb-6 relative overflow-hidden" style={{ borderRadius: 24, background: "#080D1A" }}>
        {mode === "Scan" && (
          <>
            {/* Corner-only scan frame */}
            {[
              { top: 24, left: 24, br: ["1.5px solid white", "none", "none", "1.5px solid white"] },
              { top: 24, right: 24, br: ["1.5px solid white", "1.5px solid white", "none", "none"] },
              { bottom: 24, left: 24, br: ["none", "none", "1.5px solid white", "1.5px solid white"] },
              { bottom: 24, right: 24, br: ["none", "1.5px solid white", "1.5px solid white", "none"] },
            ].map((c, i) => (
              <span
                key={i}
                className="absolute"
                style={{
                  width: 28,
                  height: 28,
                  top: c.top,
                  bottom: c.bottom,
                  left: c.left,
                  right: c.right,
                  borderTop: c.br[0],
                  borderRight: c.br[1],
                  borderBottom: c.br[2],
                  borderLeft: c.br[3],
                }}
              />
            ))}
            <p
              className="absolute left-0 right-0 text-center"
              style={{ bottom: 28, color: "#94A3B8", fontSize: 12, letterSpacing: "0.2px" }}
            >
              Point at your booking confirmation
            </p>
          </>
        )}
      </div>

      {/* Mode selector — text only */}
      <div className="flex items-center justify-center gap-8 pb-3">
        {MODES.map((m) => {
          const active = m === mode;
          return (
            <button key={m} onClick={() => setMode(m)} className="flex flex-col items-center gap-1.5">
              <span style={{ color: active ? "#FFFFFF" : "#94A3B8", fontSize: 14, fontWeight: active ? 600 : 400 }}>
                {m}
              </span>
              <span
                className="rounded-full"
                style={{
                  width: 4,
                  height: 4,
                  background: active ? "#3B82F6" : "transparent",
                }}
              />
            </button>
          );
        })}
      </div>

      {/* Shutter */}
      <div className="flex justify-center pb-12">
        <button
          onClick={handleShutter}
          aria-label="Capture"
          className="active:scale-95 transition-transform flex items-center justify-center rounded-full"
          style={{ width: 80, height: 80, border: "2px solid white" }}
        >
          <span className="rounded-full" style={{ width: 72, height: 72, background: "white" }} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={mode === "Scan" ? "image/*" : "image/*,video/*"}
          capture="environment"
          className="hidden"
          onChange={handleFileSelected}
        />
      </div>
    </div>
  );
}

// ─────────────────────────── EDIT SCREEN ───────────────────────────

function EditScreen({
  previewUrl,
  onRetake,
  onSave,
  onPostMoment,
  location,
}: {
  previewUrl: string;
  onRetake: () => void;
  onSave: () => void;
  onPostMoment: () => void;
  location: PhotoLocation | null;
}) {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabId>("frames");
  const [filter, setFilter] = useState("none");
  const [stamps, setStamps] = useState<PlacedStamp[]>([]);
  const [caption, setCaption] = useState("");
  const [tripId, setTripId] = useState<string>("");
  const [trips, setTrips] = useState<Trip[]>([]);
  const [adjust, setAdjust] = useState({ brightness: 0, contrast: 0, saturation: 0, warmth: 0 });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("trips")
      .select("id, title, destination")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setTrips((data as Trip[]) || []));
  }, [user]);

  const filterCss = STYLE_FILTERS.find((f) => f.id === filter)?.css || "";
  const hasFrame = filter !== "none" || stamps.length > 0;

  const toggleStamp = (id: StampId) => {
    setStamps((prev) => {
      const existing = prev.find((s) => s.id === id);
      if (existing) return prev.filter((s) => s.id !== id);
      return [...prev, { id, x: 50, y: 50 }];
    });
  };

  // Drag handler for stamps (pointer-based, viewport-relative)
  const dragRef = useRef<HTMLDivElement>(null);
  const onStampPointerDown = (id: StampId) => (e: React.PointerEvent) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    const rect = dragRef.current?.getBoundingClientRect();
    if (!rect) return;
    const move = (ev: PointerEvent) => {
      const x = ((ev.clientX - rect.left) / rect.width) * 100;
      const y = ((ev.clientY - rect.top) / rect.height) * 100;
      setStamps((prev) =>
        prev.map((s) => (s.id === id ? { ...s, x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) } : s)),
      );
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const removeStamp = (id: StampId) => setStamps((prev) => prev.filter((s) => s.id !== id));

  const stampLabel = (id: StampId): string => {
    if (id === "passport") return "✦ POSITANO · MAY 12 ✦";
    if (id === "city") return "POSITANO";
    if (id === "flag") return "🇮🇹";
    if (id === "trip") return "Trip to California";
    if (id === "time") return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (id === "weather") return "☀️ 24°";
    if (id === "pin") return "📍 Positano";
    if (id === "coords") {
      const lat = location?.latitude ?? 40.628;
      const lng = location?.longitude ?? 14.485;
      return `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
    }
    return "";
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#000000" }}>
      {/* Preview */}
      <div ref={dragRef} className="relative flex-1 overflow-hidden touch-none">
        <img
          src={previewUrl}
          alt="Preview"
          className={`absolute inset-0 h-full w-full object-cover ${filterCss}`}
          style={{
            filter: `brightness(${1 + adjust.brightness / 200}) contrast(${1 + adjust.contrast / 200}) saturate(${1 + adjust.saturation / 200}) hue-rotate(${adjust.warmth / 5}deg)`,
          }}
        />

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 px-5 pt-12 flex items-center justify-between">
          <button onClick={onRetake} className="text-white inline-flex items-center gap-1" style={{ fontSize: 14, fontWeight: 600 }}>
            <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
            Retake
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onSave}
              className="text-white"
              style={{
                background: "#1A2236",
                border: "1px solid #1E2A3F",
                borderRadius: 9999,
                padding: "8px 16px",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Save
            </button>
            <button
              onClick={onPostMoment}
              className="text-white"
              style={{
                background: "#3B82F6",
                borderRadius: 9999,
                padding: "8px 18px",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Post Moment
            </button>
          </div>
        </div>

        {/* Stamps */}
        {stamps.map((s) => (
          <div
            key={s.id}
            onPointerDown={onStampPointerDown(s.id)}
            onDoubleClick={() => removeStamp(s.id)}
            className="absolute select-none cursor-move text-white"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              transform: "translate(-50%, -50%)",
              background: "rgba(0,0,0,0.55)",
              padding: "8px 14px",
              borderRadius: 9999,
              fontSize: 14,
              fontWeight: 600,
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              touchAction: "none",
            }}
          >
            {stampLabel(s.id)}
          </div>
        ))}

        {/* RF watermark */}
        {hasFrame && (
          <span
            className="absolute text-white"
            style={{ bottom: 16, right: 16, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", opacity: 0.6 }}
          >
            RF
          </span>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex items-stretch" style={{ background: "#080D1A", borderTop: "1px solid #1E2A3F" }}>
        {TABS.map((t) => {
          const active = tab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 flex flex-col items-center gap-1 pt-2.5 pb-2 relative"
            >
              <Icon className="h-5 w-5" style={{ color: active ? "#FFFFFF" : "#94A3B8" }} strokeWidth={1.5} />
              <span style={{ color: active ? "#FFFFFF" : "#94A3B8", fontSize: 12, fontWeight: active ? 600 : 400 }}>
                {t.label}
              </span>
              {active && (
                <span className="absolute left-4 right-4 bottom-0 h-0.5 rounded-full" style={{ background: "#3B82F6" }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content sheet */}
      <div style={{ background: "#111827", maxHeight: "40vh", overflowY: "auto" }}>
        {tab === "frames" && (
          <div className="px-5 py-4">
            <h3 className="text-white" style={{ fontSize: 16, fontWeight: 600 }}>Roavr Frames</h3>

            <p className="mt-3" style={{ color: "#94A3B8", fontSize: 12, letterSpacing: "0.2px" }}>Filters</p>
            <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
              {STYLE_FILTERS.map((f) => {
                const selected = filter === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className="shrink-0 relative overflow-hidden"
                    style={{
                      width: 64,
                      height: 96,
                      borderRadius: 12,
                      border: selected ? "2px solid #FFFFFF" : "2px solid transparent",
                      background: "#1A2236",
                    }}
                  >
                    <img src={previewUrl} alt={f.name} className={`absolute inset-0 h-full w-full object-cover ${f.css}`} />
                    <span
                      className="absolute bottom-1 left-0 right-0 text-center text-white"
                      style={{ fontSize: 10, fontWeight: 600, textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}
                    >
                      {f.name}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="mt-4" style={{ color: "#94A3B8", fontSize: 12, letterSpacing: "0.2px" }}>Stamps</p>
            <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-2">
              {STAMPS.map((s) => {
                const active = stamps.some((p) => p.id === s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleStamp(s.id)}
                    className="shrink-0 text-white"
                    style={{
                      borderRadius: 12,
                      padding: "10px 14px",
                      fontSize: 12,
                      fontWeight: 500,
                      background: active ? "#3B82F6" : "#1A2236",
                      border: `1px solid ${active ? "#3B82F6" : "#1E2A3F"}`,
                    }}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-1" style={{ color: "#4B5563", fontSize: 12, letterSpacing: "0.2px" }}>
              Tap to add · drag to reposition · double-tap to remove
            </p>
          </div>
        )}

        {tab === "stickers" && (
          <div className="px-5 py-5">
            <p style={{ color: "#94A3B8", fontSize: 14 }}>Travel sticker packs coming soon.</p>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {["🗼", "🏟", "🗻", "🛂", "🎫", "🧳", "🛫", "☕", "🍣", "🏄"].map((s) => (
                <button
                  key={s}
                  className="aspect-square flex items-center justify-center text-2xl"
                  style={{ background: "#1A2236", borderRadius: 12 }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === "text" && (
          <div className="px-5 py-5 space-y-3">
            <button
              className="w-full text-white text-left"
              style={{ background: "#1A2236", borderRadius: 12, padding: 14, border: "1px solid #1E2A3F" }}
            >
              + Add text layer
            </button>
            <p style={{ color: "#94A3B8", fontSize: 12 }}>Styles: Serif · Bold Sans · Handwritten</p>
          </div>
        )}

        {tab === "details" && (
          <div className="px-5 py-4 space-y-3">
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Describe this moment…"
              className="w-full text-white outline-none"
              style={{
                background: "#1A2236",
                border: "1px solid #1E2A3F",
                borderRadius: 12,
                padding: "12px 14px",
                fontSize: 14,
              }}
            />
            <DetailRow icon={<MapPin className="h-5 w-5" style={{ color: "#3B82F6" }} strokeWidth={1.5} />}
              text={location ? `${location.latitude.toFixed(3)}, ${location.longitude.toFixed(3)}` : "Positano, Italy"} />
            <DetailRow icon={<Calendar className="h-5 w-5" style={{ color: "#94A3B8" }} strokeWidth={1.5} />}
              text={new Date().toLocaleDateString()} muted />
            <div
              className="flex items-center gap-3"
              style={{ background: "#1A2236", border: "1px solid #1E2A3F", borderRadius: 12, padding: "12px 14px" }}
            >
              <TagIcon className="h-5 w-5 shrink-0" style={{ color: "#94A3B8" }} strokeWidth={1.5} />
              <select
                value={tripId}
                onChange={(e) => setTripId(e.target.value)}
                className="flex-1 bg-transparent text-white outline-none"
                style={{ fontSize: 14 }}
              >
                <option value="" style={{ background: "#1A2236" }}>Add to a trip</option>
                {trips.map((t) => (
                  <option key={t.id} value={t.id} style={{ background: "#1A2236" }}>
                    {t.title}
                  </option>
                ))}
              </select>
              <ChevronDown className="h-4 w-4" style={{ color: "#94A3B8" }} strokeWidth={1.5} />
            </div>
            <DetailRow icon={<Users className="h-5 w-5" style={{ color: "#94A3B8" }} strokeWidth={1.5} />}
              text="Tag friends…" muted />
          </div>
        )}

        {tab === "adjust" && (
          <div className="px-5 py-4 space-y-4">
            {(["brightness", "contrast", "saturation", "warmth"] as const).map((k) => (
              <div key={k}>
                <div className="flex justify-between" style={{ color: "#94A3B8", fontSize: 12 }}>
                  <span className="capitalize">{k}</span>
                  <span>{adjust[k]}</span>
                </div>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  value={adjust[k]}
                  onChange={(e) => setAdjust((a) => ({ ...a, [k]: Number(e.target.value) }))}
                  className="w-full mt-1 accent-[#3B82F6]"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ icon, text, muted }: { icon: React.ReactNode; text: string; muted?: boolean }) {
  return (
    <div
      className="flex items-center gap-3"
      style={{ background: "#1A2236", border: "1px solid #1E2A3F", borderRadius: 12, padding: "12px 14px" }}
    >
      {icon}
      <span style={{ color: muted ? "#94A3B8" : "#FFFFFF", fontSize: 14, letterSpacing: "0.1px" }}>{text}</span>
    </div>
  );
}

// ─────────────────────────── PUBLISH SHEET ───────────────────────────

function PublishSheet({
  previewUrl,
  onClose,
  onPosted,
  pickedFile,
  userId,
  location,
}: {
  previewUrl: string;
  onClose: () => void;
  onPosted: () => void;
  pickedFile: File | null;
  userId?: string;
  location: PhotoLocation | null;
}) {
  const [vis, setVis] = useState<Visibility>("private");
  const [posting, setPosting] = useState(false);

  const post = async (savePrivate: boolean) => {
    if (!userId) {
      toast.error("Please sign in first");
      return;
    }
    setPosting(true);
    try {
      let mediaUrl = previewUrl;
      if (pickedFile) {
        const ext = pickedFile.name.split(".").pop() || "jpg";
        const path = `${userId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("checkin-photos")
          .upload(path, pickedFile, { cacheControl: "3600", upsert: false });
        if (upErr) throw upErr;
        mediaUrl = supabase.storage.from("checkin-photos").getPublicUrl(path).data.publicUrl;
      }
      const visibility = savePrivate ? "private" : vis;
      const { error } = await supabase.from("memories").insert({
        user_id: userId,
        media_url: mediaUrl,
        media_type: "photo",
        visibility,
        pinned_to_globe: true,
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        source: "camera",
      });
      if (error) throw error;
      toast.success("Pinned to your World globe");
      onPosted();
    } catch (e: any) {
      toast.error(e?.message || "Post failed");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div
        className="w-full"
        style={{
          background: "#111827",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          padding: 24,
          boxShadow: "0px 8px 32px rgba(0,0,0,0.6)",
        }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-white" style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.3px" }}>
            Post Moment
          </h2>
          <button onClick={onClose} aria-label="Close" className="h-9 w-9 flex items-center justify-center">
            <X className="h-5 w-5" style={{ color: "#94A3B8" }} strokeWidth={1.5} />
          </button>
        </div>

        {/* Preview strip */}
        <div className="mt-4 overflow-hidden" style={{ height: 80, borderRadius: 12 }}>
          <img src={previewUrl} alt="" className="w-full h-full object-cover" />
        </div>

        {/* Visibility */}
        <p className="mt-5" style={{ color: "#94A3B8", fontSize: 12, letterSpacing: "0.2px" }}>
          Who can see this
        </p>
        <div
          className="mt-2 flex p-1"
          style={{ background: "#1A2236", borderRadius: 9999, border: "1px solid #1E2A3F" }}
        >
          {([
            { id: "private", label: "Private", Icon: Lock },
            { id: "followers", label: "Followers", Icon: Users },
            { id: "public", label: "Public", Icon: GlobeIcon },
          ] as const).map(({ id, label, Icon }) => {
            const active = vis === id;
            return (
              <button
                key={id}
                onClick={() => setVis(id)}
                className="flex-1 flex items-center justify-center gap-1.5 transition-colors"
                style={{
                  background: active ? "#3B82F6" : "transparent",
                  color: active ? "#FFFFFF" : "#94A3B8",
                  borderRadius: 9999,
                  padding: "10px 0",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <Icon className="h-4 w-4" strokeWidth={1.5} />
                {label}
              </button>
            );
          })}
        </div>
        <p className="mt-2" style={{ color: "#4B5563", fontSize: 12 }}>
          {vis === "private" ? "Only you can see it" : vis === "followers" ? "Your followers see it for 24h" : "Anyone on Roavr can see it for 24h"}
        </p>

        {/* What happens */}
        <div className="mt-5 space-y-3">
          <StatusRow icon="📍" text="Pinned to your World globe — permanently" />
          <StatusRow icon="✈️" text="Saved to Trip to California — permanently" />
          {vis !== "private" && <StatusRow icon="👁" text="Live in feed for 24 hours" />}
        </div>

        {/* Buttons */}
        <div className="mt-6 space-y-2.5">
          <button
            onClick={() => post(false)}
            disabled={posting}
            className="w-full text-white inline-flex items-center justify-center gap-2 disabled:opacity-60"
            style={{
              background: "#3B82F6",
              borderRadius: 9999,
              height: 52,
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            {posting && <Loader2 className="h-4 w-4 animate-spin" />}
            Post Moment
          </button>
          <button
            onClick={() => post(true)}
            disabled={posting}
            className="w-full text-white disabled:opacity-60"
            style={{
              background: "#1A2236",
              border: "1px solid #1E2A3F",
              borderRadius: 9999,
              height: 52,
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            Save Private Only
          </button>
        </div>

        <p className="mt-3 text-center" style={{ color: "#4B5563", fontSize: 12, letterSpacing: "0.2px" }}>
          After 24 hours, this Moment leaves the live feed but stays on your globe and in your trip forever.
        </p>
      </div>
    </div>
  );
}

function StatusRow({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ color: "#FFFFFF", fontSize: 14, letterSpacing: "0.1px" }}>{text}</span>
    </div>
  );
}

// ─────────────────────────── CHECK IN SCREEN ───────────────────────────

function CheckInScreen({
  previewUrl,
  location,
  onBack,
  onDropped,
}: {
  previewUrl: string | null;
  location: PhotoLocation | null;
  onBack: () => void;
  onDropped: () => void;
}) {
  const { user } = useAuth();
  const [vis, setVis] = useState<Visibility>("private");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const drop = async () => {
    if (!user) { toast.error("Please sign in"); return; }
    setBusy(true);
    const { error } = await supabase.from("check_ins").insert({
      user_id: user.id,
      location_name: "Positano, Italy",
      latitude: location?.latitude ?? 40.628,
      longitude: location?.longitude ?? 14.485,
      notes: note || null,
      photo: previewUrl || null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    onDropped();
  };

  return (
    <div className="min-h-screen pb-6" style={{ background: "#080D1A" }}>
      <header className="px-5 pt-12 flex items-center justify-between">
        <button onClick={onBack} className="text-white inline-flex items-center gap-1" style={{ fontSize: 14, fontWeight: 600 }}>
          <ChevronLeft className="h-5 w-5" strokeWidth={1.5} /> Back
        </button>
        <h1 className="text-white" style={{ fontSize: 16, fontWeight: 600 }}>Check In</h1>
        <span className="w-10" />
      </header>

      {/* Map card */}
      <div className="mx-5 mt-5 relative overflow-hidden" style={{ height: 200, borderRadius: 24, background: "#111827" }}>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 60%, rgba(59,130,246,0.25), transparent 60%), linear-gradient(180deg, #0a1426 0%, #080D1A 100%)",
          }}
        />
        {/* Pin */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <span className="block rounded-full" style={{ width: 16, height: 16, background: "#3B82F6", boxShadow: "0 0 0 6px rgba(59,130,246,0.25)" }} />
        </div>
        {/* Subtle grid lines */}
        <svg className="absolute inset-0 w-full h-full opacity-20" preserveAspectRatio="none">
          {[1, 2, 3].map((i) => (
            <line key={"h" + i} x1={0} y1={(i * 100) / 4 + "%"} x2="100%" y2={(i * 100) / 4 + "%"} stroke="#1E2A3F" />
          ))}
          {[1, 2, 3].map((i) => (
            <line key={"v" + i} x1={(i * 100) / 4 + "%"} y1={0} x2={(i * 100) / 4 + "%"} y2="100%" stroke="#1E2A3F" />
          ))}
        </svg>
      </div>

      <div className="px-5 mt-5">
        <h2 className="text-white" style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.3px" }}>
          Positano, Italy
        </h2>
        <p style={{ color: "#94A3B8", fontSize: 12, letterSpacing: "0.2px" }}>
          {(location?.latitude ?? 40.628).toFixed(3)}, {(location?.longitude ?? 14.485).toFixed(3)} · tap to edit
        </p>
      </div>

      <div className="px-5 mt-5 space-y-3">
        {previewUrl && (
          <div className="overflow-hidden" style={{ borderRadius: 16, height: 120 }}>
            <img src={previewUrl} className="w-full h-full object-cover" alt="" />
          </div>
        )}
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note…"
          className="w-full text-white outline-none"
          style={{
            background: "#1A2236",
            border: "1px solid #1E2A3F",
            borderRadius: 12,
            padding: "12px 14px",
            fontSize: 14,
          }}
        />

        <p className="pt-1" style={{ color: "#94A3B8", fontSize: 12, letterSpacing: "0.2px" }}>
          Who can see this
        </p>
        <div className="flex p-1" style={{ background: "#1A2236", borderRadius: 9999, border: "1px solid #1E2A3F" }}>
          {([
            { id: "private", label: "Private", Icon: Lock },
            { id: "followers", label: "Followers", Icon: Users },
            { id: "public", label: "Public", Icon: GlobeIcon },
          ] as const).map(({ id, label, Icon }) => {
            const active = vis === id;
            return (
              <button
                key={id}
                onClick={() => setVis(id)}
                className="flex-1 flex items-center justify-center gap-1.5"
                style={{
                  background: active ? "#3B82F6" : "transparent",
                  color: active ? "#FFFFFF" : "#94A3B8",
                  borderRadius: 9999,
                  padding: "10px 0",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <Icon className="h-4 w-4" strokeWidth={1.5} />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-5 mt-6">
        <button
          onClick={drop}
          disabled={busy}
          className="w-full text-white inline-flex items-center justify-center gap-2 disabled:opacity-60"
          style={{
            background: "#3B82F6",
            borderRadius: 9999,
            height: 52,
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Pin to Globe
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────── SCAN REVIEW SCREEN ───────────────────────────

function ScanReviewScreen({ onBack, onAdded }: { onBack: () => void; onAdded: () => void }) {
  return (
    <div className="min-h-screen pb-6" style={{ background: "#080D1A" }}>
      <header className="px-5 pt-12 flex items-center justify-between">
        <button onClick={onBack} className="text-white inline-flex items-center gap-1" style={{ fontSize: 14, fontWeight: 600 }}>
          <ChevronLeft className="h-5 w-5" strokeWidth={1.5} /> Back
        </button>
        <h1 className="text-white" style={{ fontSize: 16, fontWeight: 600 }}>Booking Found</h1>
        <span className="w-10" />
      </header>

      <div className="mx-5 mt-6 flex items-center justify-center">
        <span
          className="rounded-full flex items-center justify-center"
          style={{ width: 64, height: 64, background: "rgba(59,130,246,0.15)" }}
        >
          <CheckCircle2 className="h-8 w-8" style={{ color: "#3B82F6" }} strokeWidth={1.5} />
        </span>
      </div>

      <div className="px-5 mt-6 space-y-3">
        <Row label="Provider" value="Delta Airlines" />
        <Row label="Confirmation" value="K3FZ9P" />
        <Row label="Dates" value="Jul 12 → Jul 19" />
        <Row label="Route" value="JFK → CDG" />
      </div>

      <div className="px-5 mt-6 space-y-2.5">
        <button
          onClick={onAdded}
          className="w-full text-white"
          style={{
            background: "#3B82F6",
            borderRadius: 9999,
            height: 52,
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          Add to Trip
        </button>
        <button
          onClick={onBack}
          className="w-full"
          style={{ color: "#3B82F6", fontSize: 14, fontWeight: 600, padding: 12 }}
        >
          Enter Manually
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex items-center justify-between"
      style={{ background: "#1A2236", border: "1px solid #1E2A3F", borderRadius: 12, padding: "14px 16px" }}
    >
      <span style={{ color: "#94A3B8", fontSize: 12, letterSpacing: "0.2px" }}>{label}</span>
      <span className="text-white" style={{ fontSize: 14, fontWeight: 600 }}>{value}</span>
    </div>
  );
}
