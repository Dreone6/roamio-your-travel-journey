/**
 * World — the hero screen.
 *
 * Every pin, number and list on this screen comes from the canonical visit
 * store via `useTravelIdentity`. One point per city (never one per photo), so
 * the globe stays cheap no matter how large a travel history gets.
 */
import { useState, useMemo, Suspense, lazy, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ensureLocationPermission } from "@/lib/permissions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTravelIdentity } from "@/hooks/useTravelIdentity";
import {
  Settings, Share2, Crosshair, Map as MapIcon, ChevronRight, Image as ImageIcon,
  Trophy, Camera, Users, Compass, BookMarked,
} from "lucide-react";
import { toast } from "sonner";
import roavrPin from "@/assets/roavr-pin.png";
import FlatMapView from "@/components/globe/FlatMapView";
import PlaceDetailSheet from "@/components/world/PlaceDetailSheet";
import TrophyShelfModal from "@/components/globe/TrophyShelfModal";
import type { CityPlace } from "@/lib/world/visits";

const WorldGlobe = lazy(() => import("@/components/globe/WorldGlobe"));

type Tab = "mine" | "followers" | "explore";
type ViewMode = "globe" | "map";

interface FeedItem {
  id: string;
  userId: string;
  name: string;
  avatar?: string | null;
  city: string;
  photo?: string | null;
  when: string;
}

export default function GlobePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const identity = useTravelIdentity();
  const world = identity.world;

  const [activeTab, setActiveTab] = useState<Tab>("mine");
  const [viewMode, setViewMode] = useState<ViewMode>("globe");
  const [place, setPlace] = useState<CityPlace | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [recenterKey, setRecenterKey] = useState(0);
  const [trophyOpen, setTrophyOpen] = useState(false);
  const [following, setFollowing] = useState<FeedItem[] | null>(null);
  const [explore, setExplore] = useState<FeedItem[] | null>(null);

  useEffect(() => { ensureLocationPermission().catch(() => {}); }, []);

  // Following + Explore feeds come from real public memories, never fixtures.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data: follows } = await supabase
        .from("follows").select("following_id")
        .eq("follower_id", user.id).eq("status", "accepted");
      const ids = (follows ?? []).map((f) => f.following_id);

      const mapRows = async (rows: any[]): Promise<FeedItem[]> => {
        const userIds = [...new Set(rows.map((r) => r.user_id))];
        const { data: profiles } = userIds.length
          ? await supabase.from("profiles").select("id, name, profile_photo").in("id", userIds)
          : { data: [] as any[] };
        const byId = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]));
        return rows.map((r) => ({
          id: r.id,
          userId: r.user_id,
          name: byId[r.user_id]?.name || "Traveler",
          avatar: byId[r.user_id]?.profile_photo,
          city: r.location_name,
          photo: r.media_url,
          when: timeAgo(r.created_at),
        }));
      };

      if (ids.length) {
        const { data } = await supabase
          .from("memories")
          .select("id, user_id, location_name, media_url, created_at")
          .in("user_id", ids).eq("visibility", "public").not("location_name", "is", null)
          .order("created_at", { ascending: false }).limit(8);
        if (!cancelled) setFollowing(await mapRows(data ?? []));
      } else if (!cancelled) setFollowing([]);

      const { data: pub } = await supabase
        .from("memories")
        .select("id, user_id, location_name, media_url, created_at")
        .eq("visibility", "public").not("location_name", "is", null).not("media_url", "is", null)
        .neq("user_id", user.id)
        .order("created_at", { ascending: false }).limit(10);
      if (!cancelled) setExplore(await mapRows(pub ?? []));
    })().catch(() => {
      if (!cancelled) { setFollowing([]); setExplore([]); }
    });
    return () => { cancelled = true; };
  }, [user]);

  // One globe point per city — aggregated, never one per memory.
  const globePoints = useMemo(
    () => world.places
      .filter((p) => p.lat !== 0 || p.lng !== 0)
      .map((p, i) => ({
        key: p.key,
        lat: p.lat,
        lng: p.lng,
        label: p.city,
        weight: p.visitCount,
        recent: i === 0,
        milestone: p.isMilestone,
      })),
    [world.places]
  );

  // Chronological trail between the cities of the travel history.
  const globeArcs = useMemo(() => {
    const ordered = [...world.places]
      .filter((p) => p.lastVisit && (p.lat !== 0 || p.lng !== 0))
      .sort((a, b) => (a.lastVisit ?? "").localeCompare(b.lastVisit ?? ""))
      .slice(-25);
    return ordered.slice(0, -1).map((p, i) => ({
      startLat: p.lat, startLng: p.lng,
      endLat: ordered[i + 1].lat, endLng: ordered[i + 1].lng,
    }));
  }, [world.places]);

  const flatPins = useMemo(
    () => world.places.map((p) => ({
      id: p.key, lat: p.lat, lng: p.lng, label: `${p.city}, ${p.country}`, category: "memory",
    })),
    [world.places]
  );

  const openPlace = useCallback((key: string) => {
    const found = world.places.find((p) => p.key === key);
    if (found) { setPlace(found); setSheetOpen(true); }
  }, [world.places]);

  const TABS: { key: Tab; label: string }[] = [
    { key: "mine", label: "My Globe" },
    { key: "followers", label: "Following" },
    { key: "explore", label: "Explore" },
  ];

  const handleShare = async () => {
    const url = `${window.location.origin}/globe`;
    try {
      if (navigator.share) await navigator.share({ title: "My Roavr world", url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    } catch { /* user dismissed */ }
  };

  const hasPlaces = world.places.length > 0;
  const recentPlace = world.places[0];
  const early = hasPlaces && world.places.length <= 3;

  return (
    <div className="min-h-screen pb-28" style={{ background: "#080D1A" }}>
      {/* Header */}
      <div className="px-5 pt-12 pb-4 flex items-start justify-between">
        <div>
          <h1 className="font-heading text-[32px] font-bold text-white tracking-tight leading-none">Your World</h1>
          <p className="text-[14px] text-[#94A3B8] mt-2">
            {identity.loading
              ? "…"
              : hasPlaces
                ? `${world.summary.countries} ${world.summary.countries === 1 ? "country" : "countries"} · ${world.summary.cities} ${world.summary.cities === 1 ? "city" : "cities"} · ${world.summary.visits} ${world.summary.visits === 1 ? "trip" : "trips"}`
                : "Your life, mapped by memories"}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={() => setTrophyOpen(true)}
            className="h-10 w-10 rounded-full flex items-center justify-center relative"
            style={{ background: "#111827", border: "1px solid rgba(244,162,97,0.35)" }}
            aria-label="Trophy shelf"
          >
            <Trophy className="h-[18px] w-[18px]" style={{ color: "#F4A261", strokeWidth: 1.6 }} />
            {identity.badges > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full text-[9px] font-bold flex items-center justify-center"
                style={{ background: "#F4A261", color: "#080D1A", border: "1.5px solid #080D1A" }}
              >
                {identity.badges}
              </span>
            )}
          </button>
          <button
            onClick={() => navigate("/build-world")}
            className="h-10 w-10 rounded-full flex items-center justify-center"
            style={{ background: "#111827", border: "1px solid #1E2A3F" }}
            aria-label="Sync from Photos"
          >
            <ImageIcon className="h-[18px] w-[18px]" style={{ color: "#94A3B8", strokeWidth: 1.5 }} />
          </button>
          <button
            onClick={handleShare}
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
          style={{ height: "55vh", maxHeight: 560, borderRadius: 24, background: "#080D1A", border: "1px solid #1E2A3F" }}
        >
          <div
            className="absolute top-3 left-3 z-20 flex items-center gap-1.5 rounded-full"
            style={{ background: "rgba(0,0,0,0.45)", padding: "4px 10px" }}
          >
            <img src={roavrPin} alt="" className="h-3 w-3" />
            <span className="text-[12px] text-white font-medium">
              {world.places.length} {world.places.length === 1 ? "place" : "places"}
            </span>
          </div>

          <div className="absolute inset-0">
            {viewMode === "globe" ? (
              <Suspense
                fallback={
                  <div className="h-full flex items-center justify-center">
                    <div className="h-12 w-12 rounded-full border-2 border-[#1E2A3F] border-t-[#3B82F6] animate-spin" />
                  </div>
                }
              >
                <WorldGlobe
                  key={recenterKey}
                  points={globePoints}
                  arcs={globeArcs}
                  onPointClick={(p) => openPlace(p.key)}
                />
              </Suspense>
            ) : (
              <FlatMapView
                key={recenterKey}
                pins={flatPins}
                onPinClick={(pin) => openPlace(pin.id)}
              />
            )}
          </div>

          {/* Empty-globe invitation overlay */}
          {!identity.loading && !hasPlaces && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-8 text-center"
              style={{ background: "linear-gradient(to top, rgba(8,13,26,0.92) 30%, rgba(8,13,26,0.35))" }}>
              <p className="font-heading text-[22px] font-bold text-white leading-tight">
                Your world is empty — for now.
              </p>
              <p className="text-[13px] mt-2 max-w-[280px]" style={{ color: "#94A3B8" }}>
                Every place you've been becomes a pin. Build your world from your photos, or capture something new.
              </p>
              <div className="mt-5 flex flex-col gap-2 w-full max-w-[260px]">
                <button
                  onClick={() => navigate("/build-world")}
                  className="rounded-full font-semibold text-white text-[14px] flex items-center justify-center gap-2"
                  style={{ background: "#3B82F6", height: 52 }}
                >
                  <ImageIcon className="h-4 w-4" strokeWidth={1.5} /> Build My World
                </button>
                <button
                  onClick={() => navigate("/camera")}
                  className="rounded-full font-semibold text-white text-[14px] flex items-center justify-center gap-2"
                  style={{ background: "#1A2236", border: "1px solid #1E2A3F", height: 52 }}
                >
                  <Camera className="h-4 w-4" strokeWidth={1.5} /> Capture a moment
                </button>
              </div>
            </div>
          )}

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
          !hasPlaces ? (
            <div className="text-center py-4">
              <p className="text-[13px]" style={{ color: "#94A3B8" }}>
                Places you add stay private until you choose otherwise.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {early && (
                <p className="text-[13px] leading-relaxed" style={{ color: "#94A3B8" }}>
                  {world.places.length === 1 ? "Your first place is on the map." : "Your world is taking shape."} Add
                  more from your photo library and the map fills in itself.
                </p>
              )}

              {recentPlace && (
                <button
                  onClick={() => { setPlace(recentPlace); setSheetOpen(true); }}
                  className="w-full text-left rounded-2xl p-4 flex items-center gap-3"
                  style={{ background: "#111827", boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}
                >
                  <div className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "rgba(59,130,246,0.12)" }}>
                    <img src={roavrPin} alt="" className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[16px] font-semibold text-white leading-tight truncate">
                      {recentPlace.city}, {recentPlace.country}
                    </p>
                    <p className="text-[12px] text-[#94A3B8] mt-0.5">
                      Most recent place · {recentPlace.visitCount} {recentPlace.visitCount === 1 ? "visit" : "visits"}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0" style={{ color: "#4B5563" }} strokeWidth={1.5} />
                </button>
              )}

              <button
                onClick={() => navigate("/passport")}
                className="w-full text-left rounded-2xl p-4 flex items-center gap-3"
                style={{ background: "#111827", boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}
              >
                <div className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "rgba(244,162,97,0.12)" }}>
                  <BookMarked className="h-5 w-5" style={{ color: "#F4A261" }} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[16px] font-semibold text-white leading-tight">Travel Passport</p>
                  <p className="text-[12px] text-[#94A3B8] mt-0.5">
                    {world.summary.countries} {world.summary.countries === 1 ? "country" : "countries"} collected
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0" style={{ color: "#4B5563" }} strokeWidth={1.5} />
              </button>
            </div>
          )
        )}

        {activeTab === "followers" && (
          following === null ? (
            <SkeletonRows />
          ) : following.length === 0 ? (
            <TabEmpty
              icon={Users}
              title="No traveler activity yet"
              body="Follow travelers whose world you want to explore and their newest places will land here."
              cta="Find travelers"
              onCta={() => navigate("/feed")}
            />
          ) : (
            <div className="space-y-2">
              {following.map(a => (
                <button
                  key={a.id}
                  onClick={() => navigate(`/u/${a.userId}`)}
                  className="w-full text-left flex items-center gap-3 p-3 rounded-2xl"
                  style={{ background: "#111827" }}
                >
                  <div
                    className="h-8 w-8 rounded-full bg-cover bg-center shrink-0"
                    style={{ background: a.avatar ? `url(${a.avatar})` : "#1A2236", backgroundSize: "cover" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] text-white leading-tight">
                      <span className="font-semibold">{a.name}</span>
                      <span className="text-[#94A3B8]"> posted from </span>
                      <span className="font-semibold">{a.city}</span>
                    </p>
                    <p className="text-[12px] text-[#94A3B8] mt-0.5">{a.when}</p>
                  </div>
                  {a.photo && (
                    <div className="h-10 w-10 rounded-lg shrink-0 bg-cover bg-center" style={{ backgroundImage: `url(${a.photo})` }} />
                  )}
                </button>
              ))}
              <button
                onClick={() => navigate("/feed")}
                className="w-full mt-2 text-[13px] font-semibold flex items-center justify-center gap-1"
                style={{ color: "#3B82F6" }}
              >
                See all <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </div>
          )
        )}

        {activeTab === "explore" && (
          explore === null ? (
            <SkeletonRows />
          ) : explore.length === 0 ? (
            <TabEmpty
              icon={Compass}
              title="Nothing public to explore yet"
              body="Public memories from the Roavr community will appear here as travelers share them."
              cta="Share a moment"
              onCta={() => navigate("/camera")}
            />
          ) : (
            <div className="-mx-5 px-5 overflow-x-auto scrollbar-none">
              <div className="flex gap-3" style={{ width: "max-content" }}>
                {explore.map(c => (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/u/${c.userId}`)}
                    className="relative overflow-hidden bg-cover bg-center shrink-0"
                    style={{ width: 140, height: 160, borderRadius: 16, backgroundImage: `url(${c.photo})` }}
                  >
                    <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent 50%)" }} />
                    <div className="absolute bottom-3 left-3 right-3 text-left">
                      <p className="text-[12px] text-white font-semibold leading-tight">{c.city}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: "#94A3B8" }}>{c.name}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )
        )}
      </div>

      <PlaceDetailSheet
        place={place}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        owner
        onViewVisits={() => { setSheetOpen(false); navigate("/passport"); }}
        onAddMemory={() => { setSheetOpen(false); navigate("/camera"); }}
      />

      <TrophyShelfModal open={trophyOpen} onOpenChange={setTrophyOpen} />
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map(i => (
        <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: "#111827" }} />
      ))}
    </div>
  );
}

function TabEmpty({ icon: Icon, title, body, cta, onCta }: {
  icon: any; title: string; body: string; cta: string; onCta: () => void;
}) {
  return (
    <div className="text-center py-8">
      <div className="mx-auto h-12 w-12 rounded-2xl flex items-center justify-center" style={{ background: "#111827", border: "1px solid #1E2A3F" }}>
        <Icon className="h-5 w-5" style={{ color: "#3B82F6" }} strokeWidth={1.5} />
      </div>
      <p className="font-heading text-[16px] font-semibold text-white mt-4">{title}</p>
      <p className="text-[13px] mt-2 max-w-[280px] mx-auto leading-relaxed" style={{ color: "#94A3B8" }}>{body}</p>
      <button
        onClick={onCta}
        className="mt-5 px-6 rounded-full font-semibold text-white text-[14px]"
        style={{ background: "#3B82F6", height: 52 }}
      >
        {cta}
      </button>
    </div>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
