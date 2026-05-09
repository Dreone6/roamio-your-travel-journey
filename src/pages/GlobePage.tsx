import { useState, useMemo, Suspense, lazy, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { ensureLocationPermission } from "@/lib/permissions";
import { supabase } from "@/integrations/supabase/client";
import {
  Globe as GlobeIcon, Map, Share2, Camera, Lock, Users, Eye,
  Compass, Sparkles, Settings, MapPin as MapPinIcon, Layers, Crosshair,
  Trophy, Heart, Flame, Award, ChevronRight, Plus, Plane,
} from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import FlatMapView from "@/components/globe/FlatMapView";
import PinDetailSheet from "@/components/globe/PinDetailSheet";
import ShareMapSheet from "@/components/globe/ShareMapSheet";
import StoryConversionSettings from "@/components/globe/StoryConversionSettings";
import {
  MOCK_MAP_PINS, MOCK_GLOBE_STATS, MOCK_CHECKINS,
  MOCK_MEMORIES, MOCK_BADGES, MOCK_USERS, MOCK_TRIPS,
  MOCK_STORIES,
} from "@/data";
import type { MapPin, Visibility } from "@/data/types";

const InteractiveGlobe = lazy(() => import("@/components/globe/InteractiveGlobe"));

type ViewMode = "globe" | "map";
type Tab = "mine" | "followers" | "explore";
type PrivacyMode = "public" | "followers" | "private";
type LayerKey = "trips" | "stories" | "memories" | "checkins" | "offers" | "friends" | "safety";

function buildAllPins(userId: string): MapPin[] {
  const basePins = [...MOCK_MAP_PINS];
  MOCK_CHECKINS.filter(ci => ci.userId === userId && ci.latitude && ci.longitude).forEach(ci => {
    if (!basePins.find(p => p.latitude === ci.latitude && p.longitude === ci.longitude && p.category === "checkin")) {
      basePins.push({
        id: `pin-ci-${ci.id}`, userId, latitude: ci.latitude!, longitude: ci.longitude!,
        label: ci.locationName, description: ci.notes, category: "checkin",
        linkedId: ci.id, visibility: "public", createdAt: ci.timestamp,
      });
    }
  });
  MOCK_MEMORIES.filter(m => m.userId === userId && m.latitude && m.longitude && m.pinnedToGlobe).forEach(m => {
    if (!basePins.find(p => p.linkedId === m.id)) {
      basePins.push({
        id: `pin-mem-${m.id}`, userId, latitude: m.latitude!, longitude: m.longitude!,
        label: m.locationName || "Memory", description: m.caption, category: "memory",
        linkedId: m.id, visibility: m.visibility, createdAt: m.createdAt,
      });
    }
  });
  const now = Date.now();
  MOCK_STORIES.filter(s =>
    s.userId === userId && s.latitude && s.longitude &&
    s.autoSaveToGlobe !== false && new Date(s.expiresAt).getTime() > now
  ).forEach(s => {
    basePins.push({
      id: `pin-story-${s.id}`, userId, latitude: s.latitude!, longitude: s.longitude!,
      label: s.locationName || "Story", description: s.caption,
      category: "tip", linkedId: s.id, visibility: s.visibility, createdAt: s.createdAt,
    });
  });
  return basePins.filter(p => p.latitude !== 0 || p.longitude !== 0);
}

function buildFollowingPins(): MapPin[] {
  const followedIds = ["u-002", "u-004", "u-005"];
  const pins: MapPin[] = [];
  MOCK_MEMORIES.filter(m => followedIds.includes(m.userId) && m.visibility === "public" && m.latitude && m.longitude).forEach(m => {
    pins.push({
      id: `fp-${m.id}`, userId: m.userId, latitude: m.latitude!, longitude: m.longitude!,
      label: m.locationName || "Memory", description: m.caption, category: "memory",
      linkedId: m.id, visibility: "public", createdAt: m.createdAt,
    });
  });
  MOCK_STORIES.filter(s => followedIds.includes(s.userId) && s.visibility === "public" && s.latitude && s.longitude).forEach(s => {
    pins.push({
      id: `fp-s-${s.id}`, userId: s.userId, latitude: s.latitude!, longitude: s.longitude!,
      label: s.locationName || "Story", description: s.caption,
      category: "tip" as MapPin["category"], linkedId: s.id, visibility: "public", createdAt: s.createdAt,
    });
  });
  return pins;
}

function buildExplorePins(): MapPin[] {
  const pins: MapPin[] = [];
  MOCK_STORIES.filter(s => s.visibility === "public" && s.latitude && s.longitude).forEach(s => {
    pins.push({
      id: `ep-s-${s.id}`, userId: s.userId, latitude: s.latitude!, longitude: s.longitude!,
      label: s.locationName || "Story", description: `${s.viewCount} views · ${s.caption || ""}`,
      category: "tip" as MapPin["category"], linkedId: s.id, visibility: "public", createdAt: s.createdAt,
    });
  });
  MOCK_MEMORIES.filter(m => m.visibility === "public" && m.latitude && m.longitude).forEach(m => {
    pins.push({
      id: `ep-m-${m.id}`, userId: m.userId, latitude: m.latitude!, longitude: m.longitude!,
      label: m.locationName || "Memory", description: m.caption, category: "memory",
      linkedId: m.id, visibility: "public", createdAt: m.createdAt,
    });
  });
  return pins;
}

const DEFAULT_LAYERS: Record<LayerKey, boolean> = {
  trips: true, stories: true, memories: true, checkins: true,
  offers: false, friends: false, safety: false,
};

export default function GlobePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>("globe");
  const [activeTab, setActiveTab] = useState<Tab>("mine");
  const [privacy, setPrivacy] = useState<PrivacyMode>("public");
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
  const [pinSheetOpen, setPinSheetOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>(DEFAULT_LAYERS);
  const [storyConversion, setStoryConversion] = useState<"auto" | "ask" | "never">("auto");
  const [recenterKey, setRecenterKey] = useState(0);
  const [sponsoredPins, setSponsoredPins] = useState<MapPin[]>([]);

  useEffect(() => { ensureLocationPermission().catch(() => {}); }, []);

  useEffect(() => {
    let cancelled = false;
    supabase.from("sponsored_pins")
      .select("id, name, tagline, latitude, longitude, sponsor_name, category")
      .eq("active", true)
      .then(({ data }) => {
        if (cancelled || !data) return;
        setSponsoredPins(data.map((s) => ({
          id: `sp-${s.id}`, userId: "milo", latitude: s.latitude, longitude: s.longitude,
          label: `🐾 Milo: ${s.name}`, description: `${s.tagline} · ${s.sponsor_name}`,
          category: "sponsored" as MapPin["category"], linkedId: s.id,
          visibility: "public" as Visibility, createdAt: new Date().toISOString(),
        })));
      });
    return () => { cancelled = true; };
  }, []);

  const stats = MOCK_GLOBE_STATS;
  const memories = MOCK_MEMORIES;
  const badges = MOCK_BADGES;

  const allMyPins = useMemo(() => buildAllPins("u-001"), []);
  const followingPins = useMemo(() => buildFollowingPins(), []);
  const explorePins = useMemo(() => buildExplorePins(), []);

  const tabPins = useMemo(() => {
    const base = activeTab === "mine" ? allMyPins
      : activeTab === "followers" ? followingPins : explorePins;
    return [...base, ...(layers.offers ? sponsoredPins : [])];
  }, [activeTab, allMyPins, followingPins, explorePins, sponsoredPins, layers.offers]);

  // Filter pins by enabled layers
  const activePins = useMemo(() => tabPins.filter((p) => {
    if (p.category === "memory") return layers.memories;
    if (p.category === "checkin") return layers.checkins;
    if (p.category === "tip") return layers.stories;
    if (p.category === "visited" || p.category === "wishlist") return layers.trips;
    if (p.category === "sponsored") return layers.offers;
    return true;
  }), [tabPins, layers]);

  const globePins = useMemo(
    () => activePins.map((p) => ({ lat: p.latitude, lng: p.longitude, label: p.label, category: p.category })),
    [activePins]
  );
  const flatPins = useMemo(
    () => activePins.map((p) => ({ id: p.id, lat: p.latitude, lng: p.longitude, label: p.label, description: p.description, category: p.category })),
    [activePins]
  );

  const handlePinClick = useCallback((pinData: { id?: string; label?: string; lat?: number; lng?: number }) => {
    const pin = activePins.find(p =>
      (pinData.id && p.id === pinData.id) ||
      (pinData.lat && pinData.lng && Math.abs(p.latitude - pinData.lat) < 0.01 && Math.abs(p.longitude - pinData.lng) < 0.01)
    );
    if (pin) { setSelectedPin(pin); setPinSheetOpen(true); }
  }, [activePins]);

  const selectedPinLinked = useMemo(() => {
    if (!selectedPin) return undefined;
    const memory = MOCK_MEMORIES.find(m => m.id === selectedPin.linkedId);
    const checkIn = MOCK_CHECKINS.find(c => c.id === selectedPin.linkedId);
    const trip = MOCK_TRIPS.find(t => t.id === selectedPin.linkedId);
    return {
      photo: memory?.mediaUrl || checkIn?.photo || undefined,
      caption: memory?.caption || checkIn?.notes || undefined,
      tripTitle: trip?.title || (memory?.tripId ? MOCK_TRIPS.find(t => t.id === memory.tripId)?.title : undefined),
      badgeName: undefined,
      date: memory?.createdAt || checkIn?.timestamp || selectedPin.createdAt,
      reactions: Math.floor(Math.random() * 50),
      comments: Math.floor(Math.random() * 12),
    };
  }, [selectedPin]);

  const PrivIcon = privacy === "public" ? Eye : privacy === "followers" ? Users : Lock;
  const cyclePrivacy = () => {
    const order: PrivacyMode[] = ["public", "followers", "private"];
    setPrivacy(order[(order.indexOf(privacy) + 1) % 3]);
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: "mine", label: "My Globe" },
    { key: "followers", label: "Following" },
    { key: "explore", label: "Explore" },
  ];

  // Featured derived data
  const latestMemory = useMemo(
    () => [...memories].filter(m => m.userId === "u-001")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0],
    [memories]
  );
  const favoriteCity = useMemo(() => {
    const counts: Record<string, { count: number; img?: string }> = {};
    memories.filter(m => m.userId === "u-001" && m.locationName).forEach(m => {
      const k = m.locationName!;
      counts[k] = { count: (counts[k]?.count || 0) + 1, img: counts[k]?.img || m.mediaUrl };
    });
    const top = Object.entries(counts).sort((a, b) => b[1].count - a[1].count)[0];
    return top ? { name: top[0], visits: top[1].count, img: top[1].img } : null;
  }, [memories]);
  const topCountry = stats.countriesList?.[0] || "Japan";
  const nextBadge = badges.find(b => true);

  const isEmpty = activeTab === "mine" && activePins.length === 0;

  const STAT_TILES = [
    { label: "Countries", value: stats.totalCountries, icon: GlobeIcon },
    { label: "Cities", value: stats.totalCities, icon: MapPinIcon },
    { label: "Trips", value: MOCK_TRIPS.length, icon: Plane },
    { label: "Check-Ins", value: stats.totalCheckins, icon: Crosshair },
    { label: "Memories", value: stats.totalMemories, icon: Sparkles },
    { label: "Pins", value: stats.totalPins, icon: MapPinIcon },
  ];

  return (
    <div className="dark-immersive min-h-screen pb-28">
      {/* ── Clean Header ───────────────────────────────── */}
      <div className="relative">
        <div className="absolute inset-0 gradient-dark-radial pointer-events-none" />
        <div className="relative px-5 pt-12 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-heading text-[28px] font-bold text-white tracking-tight leading-none">Globe</h1>
              <p className="text-[12px] text-dark-muted mt-1.5">Your world, mapped by memories</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={cyclePrivacy}
                className="flex items-center gap-1.5 rounded-full px-3 h-9 text-[11px] font-semibold dark-card-elevated"
                title="Privacy"
              >
                <PrivIcon className={`h-3.5 w-3.5 ${privacy === "public" ? "text-glow" : privacy === "followers" ? "text-blue-400" : "text-dark-muted"}`} />
                <span className="text-white">
                  {privacy === "public" ? "Public" : privacy === "followers" ? "Followers" : "Private"}
                </span>
              </button>
              <button
                onClick={() => setShareOpen(true)}
                className="h-9 w-9 rounded-full dark-card-elevated flex items-center justify-center"
                aria-label="Share"
              >
                <Share2 className="h-4 w-4 text-glow" />
              </button>
              <button
                onClick={() => setSettingsOpen(true)}
                className="h-9 w-9 rounded-full dark-card-elevated flex items-center justify-center"
                aria-label="Settings"
              >
                <Settings className="h-4 w-4 text-dark-muted" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Immersive Globe Hero ───────────────────────── */}
      <div className="relative px-3">
        <div
          className="relative rounded-3xl overflow-hidden border border-white/[0.06]"
          style={{
            height: "min(58vh, 560px)",
            background:
              "radial-gradient(ellipse at 50% 30%, rgba(30,58,138,0.45) 0%, rgba(8,11,24,1) 70%)",
            boxShadow: "0 30px 80px -20px rgba(30,58,138,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          {/* Atmosphere accent blooms */}
          <div className="absolute -top-24 -left-16 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-16 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

          {/* Floating top-right controls */}
          <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
            <div className="flex rounded-full backdrop-blur-xl bg-white/5 border border-white/10 p-0.5">
              <button
                onClick={() => setViewMode("globe")}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${
                  viewMode === "globe" ? "gradient-glow text-white" : "text-dark-muted"
                }`}
              >
                <GlobeIcon className="h-3 w-3 inline mr-1" />3D
              </button>
              <button
                onClick={() => setViewMode("map")}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${
                  viewMode === "map" ? "gradient-glow text-white" : "text-dark-muted"
                }`}
              >
                <Map className="h-3 w-3 inline mr-1" />Map
              </button>
            </div>
            <button
              onClick={() => setLayersOpen(true)}
              className="h-9 w-9 rounded-full backdrop-blur-xl bg-white/5 border border-white/10 flex items-center justify-center self-end"
              aria-label="Layers"
            >
              <Layers className="h-4 w-4 text-white" />
            </button>
            <button
              onClick={() => setRecenterKey((k) => k + 1)}
              className="h-9 w-9 rounded-full backdrop-blur-xl bg-white/5 border border-white/10 flex items-center justify-center self-end"
              aria-label="Recenter"
            >
              <Crosshair className="h-4 w-4 text-white" />
            </button>
          </div>

          {/* Pin counter — top left */}
          <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 rounded-full backdrop-blur-xl bg-white/5 border border-white/10 px-2.5 py-1.5">
            <MapPinIcon className="h-3 w-3 text-glow" />
            <span className="text-[10px] font-bold text-white">{activePins.length} pins</span>
          </div>

          {/* The globe */}
          <div className="absolute inset-0">
            {viewMode === "globe" ? (
              <Suspense
                fallback={
                  <div className="h-full flex items-center justify-center">
                    <div className="h-16 w-16 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                  </div>
                }
              >
                <InteractiveGlobe
                  key={recenterKey}
                  pins={globePins}
                  onPinClick={(pin) => handlePinClick({ lat: pin.lat, lng: pin.lng, label: pin.label })}
                />
              </Suspense>
            ) : (
              <FlatMapView
                key={recenterKey}
                pins={flatPins}
                onPinClick={(pin) => handlePinClick({ id: pin.id, lat: pin.lat, lng: pin.lng })}
              />
            )}
          </div>

          {/* Bottom gesture hint */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded-full backdrop-blur-xl bg-black/30 border border-white/10">
            <p className="text-[9px] text-white/60 tracking-wide">Drag to rotate · Pinch to zoom</p>
          </div>

          {/* Empty-state overlay CTA */}
          {isEmpty && (
            <div className="absolute inset-x-0 bottom-0 z-20 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <p className="text-center text-white font-heading text-[15px] font-semibold mb-3">
                Start filling your world
              </p>
              <div className="flex gap-2 justify-center">
                <button onClick={() => navigate("/camera")} className="flex items-center gap-1.5 px-3 py-2 rounded-full gradient-glow text-white text-[11px] font-bold">
                  <Camera className="h-3.5 w-3.5" /> Capture
                </button>
                <button onClick={() => navigate("/check-in")} className="flex items-center gap-1.5 px-3 py-2 rounded-full dark-card-elevated text-white text-[11px] font-bold">
                  <MapPinIcon className="h-3.5 w-3.5 text-glow" /> Check In
                </button>
                <button onClick={() => navigate("/trips")} className="flex items-center gap-1.5 px-3 py-2 rounded-full dark-card-elevated text-white text-[11px] font-bold">
                  <Plane className="h-3.5 w-3.5 text-glow" /> Plan Trip
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs (segmented) ───────────────────────────── */}
      <div className="px-5 pt-5">
        <div className="flex gap-1 rounded-full dark-card p-1">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 rounded-full py-2 text-[11px] font-bold transition-all ${
                activeTab === key ? "gradient-glow text-white glow-accent" : "text-dark-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Compact Stats Card ─────────────────────────── */}
      <div className="px-5 pt-4">
        <div className="dark-card rounded-2xl p-3">
          <div className="grid grid-cols-6 gap-1">
            {STAT_TILES.map(({ label, value, icon: Icon }) => (
              <div key={label} className="text-center px-1">
                <Icon className="h-3.5 w-3.5 text-glow mx-auto mb-1" />
                <p className="font-heading font-bold text-[15px] text-white leading-none">{value}</p>
                <p className="text-[8px] text-dark-muted uppercase tracking-wider mt-1 truncate">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Featured Memory Section ────────────────────── */}
      <div className="px-5 pt-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-bold text-white">Highlights</h3>
          <button className="text-[10px] text-glow font-bold flex items-center gap-0.5">
            See all <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Latest Memory — large */}
          {latestMemory && (
            <div
              onClick={() => {
                const pin = allMyPins.find(p => p.linkedId === latestMemory.id);
                if (pin) { setSelectedPin(pin); setPinSheetOpen(true); }
              }}
              className="col-span-2 dark-card rounded-2xl overflow-hidden relative h-36 cursor-pointer group"
            >
              {latestMemory.mediaUrl && (
                <img src={latestMemory.mediaUrl} alt="" className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-700" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-full backdrop-blur-md bg-white/10 border border-white/10">
                <Sparkles className="h-3 w-3 text-glow" />
                <span className="text-[9px] font-bold text-white uppercase tracking-wider">Latest Memory</span>
              </div>
              <div className="absolute bottom-3 left-3 right-3">
                <p className="text-white font-heading text-[16px] font-bold leading-tight">{latestMemory.locationName || "Untitled"}</p>
                {latestMemory.caption && (
                  <p className="text-white/70 text-[11px] mt-0.5 line-clamp-1">{latestMemory.caption}</p>
                )}
              </div>
            </div>
          )}

          {/* Favorite City */}
          <div className="dark-card rounded-2xl overflow-hidden relative h-28">
            {favoriteCity?.img && (
              <img src={favoriteCity.img} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-black/20" />
            <div className="absolute inset-0 p-3 flex flex-col justify-between">
              <div className="flex items-center gap-1.5">
                <Heart className="h-3 w-3 text-rose-400" />
                <span className="text-[9px] font-bold text-white/80 uppercase tracking-wider">Favorite City</span>
              </div>
              <div>
                <p className="text-white font-heading text-[14px] font-bold leading-tight">{favoriteCity?.name || "—"}</p>
                <p className="text-white/60 text-[10px] mt-0.5">{favoriteCity?.visits || 0} visits</p>
              </div>
            </div>
          </div>

          {/* Top Country */}
          <div className="dark-card rounded-2xl p-3 h-28 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl" />
            <div className="flex items-center gap-1.5 relative">
              <Flame className="h-3 w-3 text-orange-400" />
              <span className="text-[9px] font-bold text-white/80 uppercase tracking-wider">Top Country</span>
            </div>
            <div className="relative">
              <p className="text-white font-heading text-[14px] font-bold leading-tight">{topCountry}</p>
              <p className="text-glow text-[10px] font-semibold mt-0.5">{stats.topContinent}</p>
            </div>
          </div>

          {/* Travel Score */}
          <div className="dark-card rounded-2xl p-3 h-28 relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center gap-1.5">
              <Trophy className="h-3 w-3 text-amber-400" />
              <span className="text-[9px] font-bold text-white/80 uppercase tracking-wider">Travel Score</span>
            </div>
            <div>
              <p className="text-white font-heading text-[22px] font-bold leading-none">{stats.travelScore}</p>
              <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full gradient-glow" style={{ width: `${Math.min(stats.travelScore, 100)}%` }} />
              </div>
            </div>
          </div>

          {/* Badge Progress */}
          <div className="dark-card rounded-2xl p-3 h-28 relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center gap-1.5">
              <Award className="h-3 w-3 text-purple-400" />
              <span className="text-[9px] font-bold text-white/80 uppercase tracking-wider">Badges</span>
            </div>
            <div>
              <p className="text-white font-heading text-[14px] font-bold leading-tight truncate">{nextBadge?.badgeName || "Explorer"}</p>
              <p className="text-white/60 text-[10px] mt-0.5">{badges.length} earned</p>
              <div className="mt-2 flex -space-x-1.5">
                {badges.slice(0, 4).map((b, i) => (
                  <div key={b.id} className="h-5 w-5 rounded-full ring-2 ring-[hsl(220_30%_6%)] bg-gradient-to-br from-emerald-500/30 to-teal-500/20 flex items-center justify-center text-[9px]">
                    {b.category === "milestone" ? "🏆" : b.category === "social" ? "🦋" : "⭐"}
                  </div>
                ))}
                {badges.length > 4 && (
                  <div className="h-5 w-5 rounded-full ring-2 ring-[hsl(220_30%_6%)] bg-white/10 flex items-center justify-center text-[8px] text-white font-bold">
                    +{badges.length - 4}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick Action ───────────────────────────────── */}
      <div className="px-5 pt-5">
        <button
          onClick={() => navigate("/camera")}
          className="w-full flex items-center justify-center gap-2 rounded-2xl gradient-glow text-white font-bold py-3.5 text-[13px] glow-accent"
        >
          <Plus className="h-4 w-4" /> Add to your Globe
        </button>
      </div>

      {/* ── Sheets ─────────────────────────────────────── */}
      <PinDetailSheet
        pin={selectedPin}
        open={pinSheetOpen}
        onOpenChange={setPinSheetOpen}
        linkedData={selectedPinLinked}
      />
      <ShareMapSheet
        open={shareOpen}
        onOpenChange={setShareOpen}
        userName={user?.email?.split("@")[0]}
      />

      {/* Layers sheet */}
      <Sheet open={layersOpen} onOpenChange={setLayersOpen}>
        <SheetContent side="bottom" className="dark-card border-white/10 rounded-t-3xl">
          <SheetHeader className="text-left">
            <SheetTitle className="text-white font-heading flex items-center gap-2">
              <Layers className="h-4 w-4 text-glow" /> Map Layers
            </SheetTitle>
            <SheetDescription className="text-dark-muted text-[11px]">
              Choose what to show on your globe
            </SheetDescription>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-2 mt-5">
            {([
              { key: "trips", label: "Trips", icon: Plane },
              { key: "stories", label: "Stories", icon: Sparkles },
              { key: "memories", label: "Memories", icon: Heart },
              { key: "checkins", label: "Check-Ins", icon: MapPinIcon },
              { key: "offers", label: "Offers", icon: Flame },
              { key: "friends", label: "Friends", icon: Users },
              { key: "safety", label: "Safety", icon: Compass },
            ] as { key: LayerKey; label: string; icon: typeof Plane }[]).map(({ key, label, icon: Icon }) => {
              const on = layers[key];
              return (
                <button
                  key={key}
                  onClick={() => setLayers((l) => ({ ...l, [key]: !l[key] }))}
                  className={`flex items-center justify-between rounded-xl px-3 py-3 border transition-all ${
                    on ? "border-emerald-500/40 bg-emerald-500/10" : "border-white/10 bg-white/[0.02]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${on ? "text-glow" : "text-dark-muted"}`} />
                    <span className={`text-[12px] font-semibold ${on ? "text-white" : "text-dark-muted"}`}>{label}</span>
                  </span>
                  <span className={`h-4 w-7 rounded-full p-0.5 transition-colors ${on ? "bg-emerald-500" : "bg-white/10"}`}>
                    <span className={`block h-3 w-3 rounded-full bg-white transition-transform ${on ? "translate-x-3" : ""}`} />
                  </span>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* Settings sheet */}
      <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
        <SheetContent side="bottom" className="dark-card border-white/10 rounded-t-3xl max-h-[85vh] overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle className="text-white font-heading flex items-center gap-2">
              <Settings className="h-4 w-4 text-dark-muted" /> Globe Settings
            </SheetTitle>
            <SheetDescription className="text-dark-muted text-[11px]">
              Control how your world is shared
            </SheetDescription>
          </SheetHeader>
          <div className="mt-5 space-y-4">
            <StoryConversionSettings mode={storyConversion} onChange={setStoryConversion} />
            <div className="dark-card-elevated rounded-xl p-4 space-y-2">
              <h4 className="text-[12px] font-bold text-white flex items-center gap-2">
                <Lock className="h-3.5 w-3.5 text-glow" /> Per-Item Visibility
              </h4>
              <p className="text-[10px] text-dark-muted leading-relaxed">
                Tap any pin to set its visibility individually — Public, Followers, or Private.
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
