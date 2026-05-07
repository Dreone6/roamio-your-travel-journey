import { useState, useMemo, Suspense, lazy, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Globe as GlobeIcon, Map, Share2, Camera, Lock, Users, Eye,
  ChevronRight, Flame, Compass, Sparkles, Settings, MapPin as MapPinIcon,
} from "lucide-react";
import GlobeStatsBar from "@/components/globe/GlobeStatsBar";
import FlatMapView from "@/components/globe/FlatMapView";
import TravelTimeline from "@/components/globe/TravelTimeline";
import TravelerCard from "@/components/globe/TravelerCard";
import CountryProgress from "@/components/globe/CountryProgress";
import PinDetailSheet from "@/components/globe/PinDetailSheet";
import GlobeEmptyState from "@/components/globe/GlobeEmptyState";
import ShareMapSheet from "@/components/globe/ShareMapSheet";
import StoryConversionSettings from "@/components/globe/StoryConversionSettings";
import {
  MOCK_MAP_PINS, MOCK_GLOBE_STATS, MOCK_CHECKINS,
  MOCK_MEMORIES, MOCK_BADGES, MOCK_USERS, MOCK_TRIPS,
  MOCK_STORIES, MOCK_OFFERS,
} from "@/data";
import type { MapPin, Visibility } from "@/data/types";

const InteractiveGlobe = lazy(() => import("@/components/globe/InteractiveGlobe"));

type ViewMode = "globe" | "map";
type Tab = "mine" | "followers" | "explore";
type PrivacyMode = "public" | "followers" | "private";

// Build comprehensive pins from all data sources
function buildAllPins(userId: string): MapPin[] {
  const basePins = [...MOCK_MAP_PINS];

  // Add check-in pins
  MOCK_CHECKINS.filter(ci => ci.userId === userId && ci.latitude && ci.longitude).forEach(ci => {
    if (!basePins.find(p => p.latitude === ci.latitude && p.longitude === ci.longitude && p.category === "checkin")) {
      basePins.push({
        id: `pin-ci-${ci.id}`, userId, latitude: ci.latitude!, longitude: ci.longitude!,
        label: ci.locationName, description: ci.notes, category: "checkin",
        linkedId: ci.id, visibility: "public", createdAt: ci.timestamp,
      });
    }
  });

  // Add memory pins
  MOCK_MEMORIES.filter(m => m.userId === userId && m.latitude && m.longitude && m.pinnedToGlobe).forEach(m => {
    if (!basePins.find(p => p.linkedId === m.id)) {
      basePins.push({
        id: `pin-mem-${m.id}`, userId, latitude: m.latitude!, longitude: m.longitude!,
        label: m.locationName || "Memory", description: m.caption, category: "memory",
        linkedId: m.id, visibility: m.visibility, createdAt: m.createdAt,
      });
    }
  });

  // Add trip destination pins
  MOCK_TRIPS.filter(t => t.userId === userId).forEach(t => {
    const existing = basePins.find(p => p.linkedId === t.id);
    if (!existing) {
      // Use a rough geocode placeholder - in production this would be real coordinates
      basePins.push({
        id: `pin-trip-${t.id}`, userId, latitude: 0, longitude: 0,
        label: t.destination, description: t.title,
        category: t.status === "completed" ? "visited" : "wishlist",
        linkedId: t.id, visibility: "public", createdAt: t.createdAt,
      });
    }
  });

  return basePins.filter(p => p.latitude !== 0 || p.longitude !== 0);
}

// Build pins from followed users for Following tab
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

// Build explore pins (trending public content)
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

export default function GlobePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>("globe");
  const [activeTab, setActiveTab] = useState<Tab>("mine");
  const [privacy, setPrivacy] = useState<PrivacyMode>("public");
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
  const [pinSheetOpen, setPinSheetOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [storyConversion, setStoryConversion] = useState<"auto" | "ask" | "never">("auto");
  const [showEmpty] = useState(false); // Toggle for demo

  const stats = MOCK_GLOBE_STATS;
  const checkIns = MOCK_CHECKINS;
  const memories = MOCK_MEMORIES;
  const badges = MOCK_BADGES;
  const travelers = MOCK_USERS.filter((u) => u.id !== "u-001");

  // Build pins based on active tab
  const allMyPins = useMemo(() => buildAllPins("u-001"), []);
  const followingPins = useMemo(() => buildFollowingPins(), []);
  const explorePins = useMemo(() => buildExplorePins(), []);

  const activePins = useMemo(() => {
    switch (activeTab) {
      case "mine": return allMyPins;
      case "followers": return followingPins;
      case "explore": return explorePins;
    }
  }, [activeTab, allMyPins, followingPins, explorePins]);

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
    if (pin) {
      setSelectedPin(pin);
      setPinSheetOpen(true);
    }
  }, [activePins]);

  // Get linked data for selected pin
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

  const privacyIcon = privacy === "public" ? Eye : privacy === "followers" ? Users : Lock;
  const PrivIcon = privacyIcon;

  const cyclePrivacy = () => {
    const order: PrivacyMode[] = ["public", "followers", "private"];
    setPrivacy(order[(order.indexOf(privacy) + 1) % 3]);
  };

  const TABS: { key: Tab; label: string; icon: typeof GlobeIcon }[] = [
    { key: "mine", label: "My Globe", icon: GlobeIcon },
    { key: "followers", label: "Following", icon: Users },
    { key: "explore", label: "Explore", icon: Compass },
  ];

  return (
    <div className="dark-immersive min-h-screen pb-24">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-dark-radial" />
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-emerald-500/5 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-teal-500/4 blur-3xl" />

        <div className="relative px-5 pt-14 pb-4 space-y-4">
          {/* Title row */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-muted text-[10px] font-bold tracking-[0.2em] uppercase">Your Journey</p>
              <h1 className="font-heading text-[24px] font-bold text-white tracking-tight mt-0.5">Globe</h1>
            </div>
            <div className="flex items-center gap-2">
              {activeTab === "mine" && (
                <button
                  onClick={cyclePrivacy}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold dark-card-elevated transition-all"
                >
                  <PrivIcon className={`h-3 w-3 ${privacy === "public" ? "text-glow" : privacy === "followers" ? "text-blue-400" : "text-dark-muted"}`} />
                  <span className={privacy === "public" ? "text-glow" : privacy === "followers" ? "text-blue-400" : "text-dark-muted"}>
                    {privacy === "public" ? "Public" : privacy === "followers" ? "Followers" : "Private"}
                  </span>
                </button>
              )}
              <button
                className="h-9 w-9 rounded-xl dark-card-elevated flex items-center justify-center"
                onClick={() => setShareOpen(true)}
              >
                <Share2 className="h-4 w-4 text-glow" />
              </button>
              {activeTab === "mine" && (
                <button
                  className="h-9 w-9 rounded-xl dark-card-elevated flex items-center justify-center"
                  onClick={() => setShowSettings(!showSettings)}
                >
                  <Settings className="h-4 w-4 text-dark-muted" />
                </button>
              )}
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 rounded-xl dark-card p-1">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-bold transition-all ${
                  activeTab === key
                    ? "gradient-glow text-white glow-accent"
                    : "text-dark-muted hover:text-white/60"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Settings Panel ─────────────────────────────── */}
      {showSettings && activeTab === "mine" && (
        <div className="px-5 py-4 space-y-4 border-b border-white/[0.04]">
          <StoryConversionSettings mode={storyConversion} onChange={setStoryConversion} />

          {/* Per-item visibility info */}
          <div className="dark-card rounded-xl p-4 space-y-2">
            <h4 className="text-[12px] font-bold text-white flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-glow" /> Per-Item Visibility
            </h4>
            <p className="text-[10px] text-dark-muted leading-relaxed">
              Tap any pin on the map to change its visibility individually. You can set each trip, memory, check-in, and story to Public, Followers Only, or Private.
            </p>
            <div className="flex gap-2 mt-2">
              {[
                { icon: Eye, label: "Public", color: "text-emerald-400 bg-emerald-500/10" },
                { icon: Users, label: "Followers", color: "text-blue-400 bg-blue-500/10" },
                { icon: Lock, label: "Private", color: "text-white/40 bg-white/5" },
              ].map(({ icon: Icon, label, color }) => (
                <div key={label} className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold ${color}`}>
                  <Icon className="h-2.5 w-2.5" /> {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Globe / Map View (shared across all tabs) ─── */}
      {showEmpty && activeTab === "mine" ? (
        <GlobeEmptyState />
      ) : (
        <>
          <div className="relative">
            {/* Toggle */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex rounded-full dark-card-elevated p-0.5">
              <button
                onClick={() => setViewMode("globe")}
                className={`px-4 py-1.5 rounded-full text-[10px] font-bold transition-all ${
                  viewMode === "globe" ? "gradient-glow text-white" : "text-dark-muted"
                }`}
              >
                <GlobeIcon className="h-3 w-3 inline mr-1" />3D Globe
              </button>
              <button
                onClick={() => setViewMode("map")}
                className={`px-4 py-1.5 rounded-full text-[10px] font-bold transition-all ${
                  viewMode === "map" ? "gradient-glow text-white" : "text-dark-muted"
                }`}
              >
                <Map className="h-3 w-3 inline mr-1" />Flat Map
              </button>
            </div>

            {/* Pin count badge */}
            <div className="absolute top-3 right-3 z-10">
              <div className="dark-card-elevated rounded-full px-2.5 py-1 flex items-center gap-1.5">
                <MapPinIcon className="h-3 w-3 text-glow" />
                <span className="text-[10px] font-bold text-white">{activePins.length}</span>
              </div>
            </div>

            <div className="h-[340px] w-full">
              {viewMode === "globe" ? (
                <Suspense
                  fallback={
                    <div className="h-full flex items-center justify-center">
                      <div className="h-16 w-16 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
                    </div>
                  }
                >
                  <InteractiveGlobe
                    pins={globePins}
                    onPinClick={(pin) => handlePinClick({ lat: pin.lat, lng: pin.lng, label: pin.label })}
                  />
                </Suspense>
              ) : (
                <FlatMapView
                  pins={flatPins}
                  onPinClick={(pin) => handlePinClick({ id: pin.id, lat: pin.lat, lng: pin.lng })}
                />
              )}
            </div>

            {/* Floating action */}
            {activeTab === "mine" && (
              <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-2">
                <button
                  onClick={() => navigate("/camera")}
                  className="h-10 w-10 rounded-full gradient-accent flex items-center justify-center shadow-lg"
                >
                  <Camera className="h-4 w-4 text-white" />
                </button>
              </div>
            )}
          </div>

          {/* ── My Globe Tab Content ────────────────────── */}
          {activeTab === "mine" && (
            <div className="px-5 pt-5 space-y-6">
              <GlobeStatsBar stats={stats} />

              {/* Recent Check-ins */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-[13px] font-bold text-white">Recent Check-ins</h3>
                  <button className="text-[10px] text-glow font-bold flex items-center gap-0.5">
                    See all <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
                <div className="flex gap-2.5 overflow-x-auto -mx-5 px-5 pb-1 no-scrollbar snap-x">
                  {checkIns.map((ci) => (
                    <div
                      key={ci.id}
                      onClick={() => {
                        const pin = allMyPins.find(p => p.linkedId === ci.id);
                        if (pin) { setSelectedPin(pin); setPinSheetOpen(true); }
                      }}
                      className="dark-card rounded-2xl overflow-hidden min-w-[160px] snap-start group hover:bg-white/[0.04] transition-colors cursor-pointer"
                    >
                      {ci.photo && (
                        <div className="h-20 overflow-hidden">
                          <img src={ci.photo} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        </div>
                      )}
                      <div className="p-3">
                        <p className="text-[11px] font-semibold text-white truncate">{ci.locationName}</p>
                        <p className="text-[9px] text-dark-muted mt-0.5">
                          {new Date(ci.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Memory Recaps by Trip */}
              <div className="space-y-2.5">
                <h3 className="text-[13px] font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-glow" /> Memory Recaps
                </h3>
                <div className="flex gap-2.5 overflow-x-auto -mx-5 px-5 pb-1 no-scrollbar snap-x">
                  {MOCK_TRIPS.filter((t) => t.status === "completed").map((trip) => {
                    const tripMemories = memories.filter((m) => m.tripId === trip.id);
                    return (
                      <div key={trip.id} className="dark-card rounded-2xl overflow-hidden min-w-[200px] snap-start">
                        <div className="h-24 relative overflow-hidden">
                          {trip.coverImage && (
                            <img src={trip.coverImage} alt="" className="h-full w-full object-cover" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                          <div className="absolute bottom-2 left-3 right-3">
                            <p className="text-[11px] font-bold text-white truncate">{trip.title}</p>
                            <p className="text-[9px] text-white/60">{trip.destination}</p>
                          </div>
                        </div>
                        <div className="p-3 flex items-center justify-between">
                          <span className="text-[10px] text-dark-muted">{tripMemories.length} memories</span>
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-glow">
                            View
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Country Progress */}
              <CountryProgress />

              {/* Timeline */}
              <TravelTimeline checkIns={checkIns} memories={memories} badges={badges} />

              {/* Badges */}
              <div className="space-y-2.5">
                <h3 className="text-[13px] font-bold text-white">Destination Badges</h3>
                <div className="grid grid-cols-3 gap-2">
                  {badges.slice(0, 6).map((b) => (
                    <div key={b.id} className="dark-card rounded-xl p-3 text-center hover:bg-white/[0.04] transition-colors">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/10 flex items-center justify-center mx-auto mb-2">
                        <span className="text-lg">
                          {b.category === "milestone" ? "🏆" : b.category === "social" ? "🦋" : "⭐"}
                        </span>
                      </div>
                      <p className="text-[10px] font-semibold text-white truncate">{b.badgeName}</p>
                      <p className="text-[8px] text-dark-muted mt-0.5">{b.earnedDate}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Followers Tab Content ───────────────────── */}
          {activeTab === "followers" && (
            <div className="px-5 pt-5 space-y-5">
              <div className="space-y-2.5">
                <h3 className="text-[13px] font-bold text-white">Following · Maps</h3>
                <p className="text-[11px] text-dark-muted">Pins from travelers you follow appear on the map above</p>
              </div>

              {/* Following travelers list */}
              <div className="space-y-3">
                {travelers.map((t) => (
                  <div key={t.id} className="dark-card rounded-2xl p-4 hover:bg-white/[0.04] transition-colors">
                    <div className="flex items-center gap-3">
                      {t.avatarUrl ? (
                        <img src={t.avatarUrl} alt={t.name} className="h-12 w-12 rounded-full object-cover ring-2 ring-emerald-500/20" />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                          <span className="text-lg font-bold text-glow">{t.name[0]}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-[13px] font-semibold text-white truncate">{t.name}</p>
                          {t.verified && <span className="text-[9px] text-glow">✓</span>}
                        </div>
                        <p className="text-[10px] text-dark-muted mt-0.5">{t.bio}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[9px] text-dark-muted">{t.totalCountries} countries</span>
                          <span className="text-[9px] text-dark-muted">{t.totalCities} cities</span>
                          <span className="text-[9px] text-dark-muted">{t.totalMemories} memories</span>
                        </div>
                      </div>
                      <button className="h-9 w-9 rounded-xl dark-card-elevated flex items-center justify-center shrink-0">
                        <GlobeIcon className="h-4 w-4 text-glow" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Explore Tab Content ─────────────────────── */}
          {activeTab === "explore" && (
            <div className="px-5 pt-5 space-y-5">
              {/* Featured Travelers */}
              <div className="space-y-2.5">
                <h3 className="text-[13px] font-bold text-white flex items-center gap-2">
                  <Compass className="h-4 w-4 text-glow" /> Featured Travelers
                </h3>
                <p className="text-[11px] text-dark-muted">Trending public pins are shown on the map above</p>
              </div>

              <div className="flex gap-3 overflow-x-auto -mx-5 px-5 pb-1 no-scrollbar snap-x">
                {travelers.map((t) => (
                  <TravelerCard
                    key={t.id}
                    profile={t}
                    isFollowing={t.id === "u-002" || t.id === "u-004"}
                    onFollow={() => {}}
                    onViewGlobe={() => {}}
                  />
                ))}
              </div>

              {/* Trending Destinations */}
              <div className="space-y-2.5">
                <h3 className="text-[13px] font-bold text-white flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-400" /> Trending Destinations
                </h3>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { name: "Tokyo, Japan", travelers: "2.4k", img: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400" },
                    { name: "Bali, Indonesia", travelers: "1.8k", img: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400" },
                    { name: "Lisbon, Portugal", travelers: "1.2k", img: "https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=400" },
                    { name: "Medellín, Colombia", travelers: "890", img: "https://images.unsplash.com/photo-1583997052301-0042b33fc598?w=400" },
                  ].map((dest) => (
                    <div key={dest.name} className="dark-card rounded-2xl overflow-hidden group hover:bg-white/[0.04] transition-colors cursor-pointer">
                      <div className="h-28 overflow-hidden relative">
                        <img src={dest.img} alt="" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                        <div className="absolute bottom-2 left-2.5 right-2.5">
                          <p className="text-[11px] font-bold text-white">{dest.name}</p>
                          <p className="text-[9px] text-white/60">{dest.travelers} travelers</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Global Stats */}
              <div className="dark-card rounded-2xl p-4 space-y-3">
                <h3 className="text-[13px] font-bold text-white">🌍 Roavr Community</h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Travelers", value: "124K" },
                    { label: "Countries", value: "195" },
                    { label: "Pins Dropped", value: "2.1M" },
                  ].map((s) => (
                    <div key={s.label} className="text-center">
                      <p className="font-heading font-bold text-lg text-glow">{s.value}</p>
                      <p className="text-[9px] text-dark-muted uppercase tracking-wider">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

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
    </div>
  );
}
