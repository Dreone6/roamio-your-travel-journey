import { useState, useMemo, Suspense, lazy, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ensureLocationPermission } from "@/lib/permissions";
import { Settings, Share2, Crosshair, Map as MapIcon, ChevronRight, Camera, Image as ImageIcon, Trophy } from "lucide-react";
import { toast } from "sonner";
import roavrPin from "@/assets/roavr-pin.png";
import FlatMapView from "@/components/globe/FlatMapView";
import PinDetailSheet from "@/components/globe/PinDetailSheet";
import PinContextMenu from "@/components/globe/PinContextMenu";
import TrophyShelfModal from "@/components/globe/TrophyShelfModal";
import {
  MOCK_MAP_PINS, MOCK_CHECKINS, MOCK_MEMORIES, MOCK_USERS, MOCK_TRIPS,
} from "@/data";
import type { MapPin, Visibility } from "@/data/types";

const InteractiveGlobe = lazy(() => import("@/components/globe/FlagGlobe"));


type Tab = "mine" | "followers" | "explore";
type ViewMode = "globe" | "map";

// CANONICAL DATA — must match Home and You
const STATS = { countries: 27, cities: 64, memories: 342 };
const TOTAL_PINS = 12;
const LATEST_PIN = {
  city: "Positano",
  country: "Italy",
  ago: "2h ago",
  lat: 40.6281,
  lng: 14.4848,
};

function buildMyPins(userId: string): MapPin[] {
  const base = [...MOCK_MAP_PINS];
  MOCK_CHECKINS.filter(ci => ci.userId === userId && ci.latitude && ci.longitude).forEach(ci => {
    if (!base.find(p => p.latitude === ci.latitude && p.longitude === ci.longitude && p.category === "checkin")) {
      base.push({
        id: `pin-ci-${ci.id}`, userId, latitude: ci.latitude!, longitude: ci.longitude!,
        label: ci.locationName, description: ci.notes, category: "checkin",
        linkedId: ci.id, visibility: "public", createdAt: ci.timestamp,
      });
    }
  });
  MOCK_MEMORIES.filter(m => m.userId === userId && m.latitude && m.longitude && m.pinnedToGlobe).forEach(m => {
    if (!base.find(p => p.linkedId === m.id)) {
      base.push({
        id: `pin-mem-${m.id}`, userId, latitude: m.latitude!, longitude: m.longitude!,
        label: m.locationName || "Memory", description: m.caption, category: "memory",
        linkedId: m.id, visibility: m.visibility, createdAt: m.createdAt,
      });
    }
  });
  return base
    .filter(p => p.latitude !== 0 || p.longitude !== 0)
    .map(p => ({
      ...p,
      verifiedSource:
        p.category === "wishlist" ? "wishlist" as const :
        p.category === "checkin"  ? "checkin"  as const :
        p.category === "memory"   ? "capture"  as const :
        "exif" as const,
      verifiedAt: p.createdAt,
    }));
}

export default function GlobePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("mine");
  const [viewMode, setViewMode] = useState<ViewMode>("globe");
  const [selectedPin, setSelectedPin] = useState<MapPin | null>(null);
  const [pinSheetOpen, setPinSheetOpen] = useState(false);
  const [contextPin, setContextPin] = useState<MapPin | null>(null);
  const [contextOpen, setContextOpen] = useState(false);
  const [recenterKey, setRecenterKey] = useState(0);
  const [trophyOpen, setTrophyOpen] = useState(false);


  useEffect(() => { ensureLocationPermission().catch(() => {}); }, []);

  const allMyPins = useMemo(() => buildMyPins("u-001"), []);

  const memoryByLinked = useMemo(() => {
    const map: Record<string, string> = {};
    MOCK_MEMORIES.forEach(m => { if (m.mediaUrl) map[m.id] = m.mediaUrl; });
    return map;
  }, []);

  const globePins = useMemo(() => {
    const sorted = [...allMyPins].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const recentId = sorted[0]?.id;
    return sorted.map(p => ({
      lat: p.latitude,
      lng: p.longitude,
      label: p.label,
      category: p.category,
      thumbnail: p.linkedId ? memoryByLinked[p.linkedId] ?? null : null,
      description: p.description,
      recent: p.id === recentId,
    }));
  }, [allMyPins, memoryByLinked]);

  const globeArcs = useMemo(() => {
    const memPins = allMyPins
      .filter(p => p.category === "memory" || p.category === "checkin")
      .slice(0, 8);
    const arcs: { from: { lat: number; lng: number }; to: { lat: number; lng: number } }[] = [];
    for (let i = 0; i < memPins.length - 1; i++) {
      arcs.push({
        from: { lat: memPins[i].latitude, lng: memPins[i].longitude },
        to: { lat: memPins[i + 1].latitude, lng: memPins[i + 1].longitude },
      });
    }
    return arcs;
  }, [allMyPins]);

  const flatPins = useMemo(
    () => allMyPins.map(p => ({ id: p.id, lat: p.latitude, lng: p.longitude, label: p.label, description: p.description, category: p.category })),
    [allMyPins]
  );

  const handlePinClick = useCallback((pinData: { id?: string; label?: string; lat?: number; lng?: number }) => {
    const pin = allMyPins.find(p =>
      (pinData.id && p.id === pinData.id) ||
      (pinData.lat != null && pinData.lng != null && Math.abs(p.latitude - pinData.lat) < 0.01 && Math.abs(p.longitude - pinData.lng) < 0.01)
    );
    if (pin) { setSelectedPin(pin); setPinSheetOpen(true); }
  }, [allMyPins]);

  const selectedPinLinked = useMemo(() => {
    if (!selectedPin) return undefined;
    const memory = MOCK_MEMORIES.find(m => m.id === selectedPin.linkedId);
    const checkIn = MOCK_CHECKINS.find(c => c.id === selectedPin.linkedId);
    return {
      photo: memory?.mediaUrl || checkIn?.photo || undefined,
      caption: memory?.caption || checkIn?.notes || undefined,
      tripTitle: memory?.tripId ? MOCK_TRIPS.find(t => t.id === memory.tripId)?.title : undefined,
      badgeName: undefined,
      date: memory?.createdAt || checkIn?.timestamp || selectedPin.createdAt,
      reactions: 0,
      comments: 0,
    };
  }, [selectedPin]);

  const TABS: { key: Tab; label: string }[] = [
    { key: "mine", label: "My Globe" },
    { key: "followers", label: "Following" },
    { key: "explore", label: "Explore" },
  ];

  const followingActivity = useMemo(() => {
    const followed = ["u-002", "u-004", "u-005"];
    return MOCK_MEMORIES
      .filter(m => followed.includes(m.userId) && m.locationName)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5)
      .map(m => {
        const u = MOCK_USERS.find(u => u.id === m.userId);
        return {
          id: m.id,
          name: (u as any)?.name || "Traveler",
          avatar: (u as any)?.avatarUrl,
          city: m.locationName!,
          photo: m.mediaUrl,
          when: timeAgo(m.createdAt),
        };
      });
  }, []);

  const exploreCards = useMemo(() => {
    return MOCK_MEMORIES
      .filter(m => m.mediaUrl && m.locationName)
      .slice(0, 6)
      .map(m => ({
        id: m.id,
        city: m.locationName!,
        country: m.locationName?.split(",").pop()?.trim() || "",
        img: m.mediaUrl!,
      }));
  }, []);

  return (
    <div className="min-h-screen pb-28" style={{ background: "#080D1A" }}>
      {/* Header */}
      <div className="px-5 pt-12 pb-4 flex items-start justify-between">
        <div>
          <h1 className="font-heading text-[32px] font-bold text-white tracking-tight leading-none">World</h1>
          <p className="text-[14px] text-[#94A3B8] mt-2">Your life, mapped by memories</p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={() => setTrophyOpen(true)}
            className="h-10 w-10 rounded-full flex items-center justify-center relative"
            style={{ background: "#111827", border: "1px solid rgba(244,162,97,0.35)" }}
            aria-label="Trophy shelf"
            title="Trophy shelf"
          >
            <Trophy className="h-[18px] w-[18px]" style={{ color: "#F4A261", strokeWidth: 1.6 }} />
            <span
              className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full text-[9px] font-bold flex items-center justify-center"
              style={{ background: "#F4A261", color: "#080D1A", border: "1.5px solid #080D1A" }}
            >
              8
            </span>
          </button>
          <button
            onClick={() => navigate("/travel-history")}
            className="h-10 w-10 rounded-full flex items-center justify-center"
            style={{ background: "#111827", border: "1px solid #1E2A3F" }}
            aria-label="Sync from Photos"
            title="Sync from Photos"
          >
            <ImageIcon className="h-[18px] w-[18px]" style={{ color: "#94A3B8", strokeWidth: 1.5 }} />
          </button>

          <button
            className="h-10 w-10 rounded-full flex items-center justify-center"
            style={{ background: "#111827", border: "1px solid #1E2A3F" }}
            aria-label="Share"
          >
            <Share2 className="h-[18px] w-[18px]" style={{ color: "#94A3B8", strokeWidth: 1.5 }} />
          </button>
          <button
            onClick={() => navigate("/settings")}
            className="h-10 w-10 rounded-full flex items-center justify-center"
            style={{ background: "#111827", border: "1px solid #1E2A3F" }}
            aria-label="Settings"
          >
            <Settings className="h-[18px] w-[18px]" style={{ color: "#94A3B8", strokeWidth: 1.5 }} />
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="px-5 pb-5">
        <div className="flex items-end justify-between">
          {[
            { v: STATS.countries, l: "Countries" },
            { v: STATS.cities, l: "Cities" },
            { v: STATS.memories, l: "Memories" },
          ].map(s => (
            <div key={s.l} className="flex-1 text-center">
              <p className="font-heading text-[32px] font-bold text-white leading-none tracking-tight">{s.v}</p>
              <p className="text-[12px] text-[#94A3B8] uppercase mt-2" style={{ letterSpacing: "0.08em" }}>{s.l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Segment Control */}
      <div className="px-5 pb-4">
        <div className="flex p-1 rounded-full" style={{ background: "#1A2236" }}>
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="flex-1 rounded-full py-2.5 text-[13px] font-semibold transition-all"
              style={{
                background: activeTab === key ? "#3B82F6" : "transparent",
                color: activeTab === key ? "#FFFFFF" : "#94A3B8",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* THE GLOBE */}
      <div className="px-3">
        <div
          className="relative overflow-hidden"
          style={{
            height: "55vh",
            maxHeight: 560,
            borderRadius: 24,
            background: "#080D1A",
            border: "1px solid #1E2A3F",
          }}
        >
          {/* Pin count chip — top-left */}
          <div
            className="absolute top-3 left-3 z-20 flex items-center gap-1.5 rounded-full"
            style={{ background: "rgba(0,0,0,0.45)", padding: "4px 10px" }}
          >
            <img src={roavrPin} alt="" className="h-3 w-3" />
            <span className="text-[12px] text-white font-medium">{TOTAL_PINS} pins</span>
          </div>

          {/* The globe / map */}
          <div className="absolute inset-0">
            {viewMode === "globe" ? (
              <Suspense
                fallback={
                  <div className="h-full flex items-center justify-center">
                    <div className="h-12 w-12 rounded-full border-2 border-[#1E2A3F] border-t-[#3B82F6] animate-spin" />
                  </div>
                }
              >
                <InteractiveGlobe
                  key={recenterKey}
                  pins={globePins}
                  arcs={globeArcs}
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

          {/* Recenter — bottom-right */}
          <div className="absolute bottom-3 right-3 z-20 flex flex-col items-end gap-2">
            <button
              onClick={() => setRecenterKey(k => k + 1)}
              className="rounded-full flex items-center gap-1.5"
              style={{ background: "#1A2236", border: "1px solid #1E2A3F", padding: "8px 14px" }}
              aria-label="Recenter"
            >
              <Crosshair className="h-4 w-4 text-white" style={{ strokeWidth: 1.5 }} />
            </button>
            <button
              onClick={() => setViewMode(v => v === "globe" ? "map" : "globe")}
              className="rounded-full flex items-center gap-1.5"
              style={{ background: "#1A2236", border: "1px solid #1E2A3F", padding: "6px 12px" }}
              aria-label="Toggle map view"
            >
              <MapIcon className="h-3.5 w-3.5 text-white" style={{ strokeWidth: 1.5 }} />
              <span className="text-[12px] text-white font-medium">{viewMode === "globe" ? "Map" : "Globe"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content below */}
      <div className="px-5 pt-5">
        {activeTab === "mine" && (
          allMyPins.length === 0 ? (
            <div className="text-center py-8">
              <p className="font-heading text-[16px] font-semibold text-white">Your globe is waiting.</p>
              <p className="text-[14px] text-[#94A3B8] mt-2">Check in somewhere to start mapping your world.</p>
              <button
                onClick={() => navigate("/camera")}
                className="mt-5 px-6 rounded-full font-semibold text-white text-[14px]"
                style={{ background: "#3B82F6", height: 52 }}
              >
                Open Capture
              </button>
            </div>
          ) : (
            <div
              onContextMenu={(e) => {
                e.preventDefault();
                const sorted = [...allMyPins].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
                if (sorted[0]) { setContextPin(sorted[0]); setContextOpen(true); }
              }}
              className="rounded-2xl p-4 flex items-center gap-3 cursor-pointer"
              style={{ background: "#111827", boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}
            >
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "rgba(59,130,246,0.12)" }}
              >
                <img src={roavrPin} alt="" className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[16px] font-semibold text-white leading-tight">
                  {LATEST_PIN.city}, {LATEST_PIN.country}
                </p>
                <p className="text-[12px] text-[#94A3B8] mt-0.5">{LATEST_PIN.ago} · 1 check-in</p>
              </div>
              <div
                className="h-10 w-10 rounded-lg shrink-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url(https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?auto=format&fit=crop&w=200&q=70)`,
                }}
              />
            </div>
          )
        )}

        {activeTab === "followers" && (
          <div className="space-y-2">
            {followingActivity.map(a => (
              <div
                key={a.id}
                className="flex items-center gap-3 p-3 rounded-2xl"
                style={{ background: "#111827" }}
              >
                <div
                  className="h-8 w-8 rounded-full bg-cover bg-center shrink-0"
                  style={{ background: a.avatar ? `url(${a.avatar})` : "#1A2236", backgroundSize: "cover" }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] text-white leading-tight">
                    <span className="font-semibold">{a.name}</span>
                    <span className="text-[#94A3B8]"> checked in at </span>
                    <span className="font-semibold">{a.city}</span>
                  </p>
                  <p className="text-[12px] text-[#94A3B8] mt-0.5">{a.when}</p>
                </div>
                {a.photo && (
                  <div
                    className="h-10 w-10 rounded-lg shrink-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${a.photo})` }}
                  />
                )}
              </div>
            ))}
            <button className="w-full mt-2 text-[13px] font-semibold flex items-center justify-center gap-1" style={{ color: "#3B82F6" }}>
              See all <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>
        )}

        {activeTab === "explore" && (
          <div className="-mx-5 px-5 overflow-x-auto scrollbar-none">
            <div className="flex gap-3" style={{ width: "max-content" }}>
              {exploreCards.map(c => (
                <div
                  key={c.id}
                  className="relative overflow-hidden bg-cover bg-center shrink-0"
                  style={{ width: 140, height: 160, borderRadius: 16, backgroundImage: `url(${c.img})` }}
                >
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent 50%)" }} />
                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-[12px] text-white font-semibold leading-tight">{c.city}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <PinDetailSheet
        pin={selectedPin}
        open={pinSheetOpen}
        onOpenChange={setPinSheetOpen}
        linkedData={selectedPinLinked}
      />

      <PinContextMenu
        pin={contextPin}
        open={contextOpen}
        onOpenChange={setContextOpen}
        onChangeVisibility={(v: Visibility) => {
          toast.success(`Pin set to ${v}`);
        }}
        onDelete={() => toast.success("Pin deleted")}
        onViewPhoto={() => { if (contextPin) { setSelectedPin(contextPin); setPinSheetOpen(true); } }}
      />
    </div>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
