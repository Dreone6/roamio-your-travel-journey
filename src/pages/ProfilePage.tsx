import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Pencil, X, Check, MapPin, Globe as GlobeIcon, Share2, MessageCircle,
  Settings, Eye, Lock, Users, Camera, BadgeCheck, Compass, ChevronRight,
  Map as MapIcon, Plane, Sparkles, Bookmark, Trophy, Plus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SkeletonProfileHero, SkeletonStatGrid } from "@/components/ui/skeleton-card";
import roavrPin from "@/assets/roavr-pin.png";
import {
  CURRENT_USER, MOCK_TRIPS, MOCK_BADGES, MOCK_MEMORIES, MOCK_STORIES,
} from "@/data";

interface DbProfile {
  name: string | null;
  email: string | null;
  profile_photo: string | null;
  home_city: string | null;
  bio: string | null;
  member_since: string;
  total_countries_visited: number;
  total_cities_visited: number;
  total_trips: number;
}

type Privacy = "public" | "followers" | "private";
type Tab = "map" | "trips" | "stories" | "badges" | "saved" | "settings";

const BADGE_LIBRARY = [
  { name: "First Steps", emoji: "📍", tier: "bronze", from: "from-amber-400", to: "to-orange-500" },
  { name: "Globe Trotter", emoji: "🌍", tier: "gold", from: "from-yellow-300", to: "to-amber-500" },
  { name: "Memory Maker", emoji: "✨", tier: "silver", from: "from-slate-200", to: "to-slate-400" },
  { name: "Social Butterfly", emoji: "🦋", tier: "platinum", from: "from-cyan-300", to: "to-sky-500" },
  { name: "Night Owl", emoji: "🌙", tier: "silver", from: "from-indigo-300", to: "to-violet-500" },
  { name: "Foodie Explorer", emoji: "🍜", tier: "bronze", from: "from-rose-300", to: "to-orange-400" },
  { name: "Wanderer", emoji: "🧭", tier: "silver", from: "from-emerald-300", to: "to-teal-500" },
  { name: "Streak Keeper", emoji: "🔥", tier: "gold", from: "from-orange-400", to: "to-rose-500" },
];

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [checkInCount, setCheckInCount] = useState(0);
  const [tripsDb, setTripsDb] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", home_city: "", bio: "" });
  const [loading, setLoading] = useState(true);
  const [privacy, setPrivacy] = useState<Privacy>("public");
  const [tab, setTab] = useState<Tab>("map");

  useEffect(() => { if (user) loadAll(); }, [user]);

  const loadAll = async () => {
    try {
      const [profileRes, checkInsRes, tripsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user!.id).single(),
        supabase.from("check_ins").select("id").eq("user_id", user!.id),
        supabase.from("trips").select("id, title, destination, start_date, status, created_at").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(6),
      ]);
      if (profileRes.data) setProfile(profileRes.data as DbProfile);
      setCheckInCount(checkInsRes.data?.length || 0);
      setTripsDb(tripsRes.data || []);
    } catch { toast.error("Failed to load profile data"); }
    setLoading(false);
  };

  const startEdit = () => {
    setEditing(true);
    setEditForm({
      name: profile?.name || CURRENT_USER.name || "",
      home_city: profile?.home_city || CURRENT_USER.homeCity || "",
      bio: profile?.bio || CURRENT_USER.bio || "",
    });
  };
  const saveEdit = async () => {
    const { error } = await supabase.from("profiles").update({ name: editForm.name, home_city: editForm.home_city, bio: editForm.bio }).eq("id", user!.id);
    if (error) { toast.error(error.message); }
    else { setProfile((p) => p ? { ...p, ...editForm } : p); setEditing(false); toast.success("Profile updated"); }
  };

  // Merged identity: prefer real DB, fall back to mock for richness
  const identity = {
    name: profile?.name || CURRENT_USER.name || "Traveler",
    avatar: profile?.profile_photo || CURRENT_USER.avatarUrl,
    homeCity: profile?.home_city || CURRENT_USER.homeCity,
    bio: profile?.bio || CURRENT_USER.bio,
    persona: CURRENT_USER.travelStyle, // adventure/cultural/etc
    verified: CURRENT_USER.verified,
  };

  const stats = {
    countries: profile?.total_countries_visited || CURRENT_USER.totalCountries,
    cities: profile?.total_cities_visited || CURRENT_USER.totalCities,
    trips: tripsDb.length || CURRENT_USER.totalTrips,
    checkIns: checkInCount || CURRENT_USER.totalCheckIns,
    followers: CURRENT_USER.totalFollowers,
    following: CURRENT_USER.totalFollowing,
  };

  const trips = tripsDb.length > 0 ? tripsDb.map((t) => ({
    id: t.id, title: t.title, destination: t.destination, status: t.status,
    coverImage: MOCK_TRIPS.find(m => m.title === t.title)?.coverImage || MOCK_TRIPS[0].coverImage,
  })) : MOCK_TRIPS.map(t => ({ id: t.id, title: t.title, destination: t.destination, status: t.status, coverImage: t.coverImage }));

  const memories = useMemo(
    () => MOCK_MEMORIES.filter(m => m.userId === "u-001" && m.mediaUrl).slice(0, 12),
    []
  );
  const stories = useMemo(() => MOCK_STORIES.filter(s => s.userId === "u-001"), []);

  const badges = MOCK_BADGES;
  const earnedNames = new Set(badges.map(b => b.badgeName));

  const PrivIcon = privacy === "public" ? Eye : privacy === "followers" ? Users : Lock;
  const cyclePrivacy = () => {
    const order: Privacy[] = ["public", "followers", "private"];
    setPrivacy(order[(order.indexOf(privacy) + 1) % 3]);
  };

  if (loading) {
    return (
      <div className="px-5 pt-8 pb-4 space-y-5">
        <SkeletonProfileHero />
        <SkeletonStatGrid />
        <div className="h-40 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  // Cover image: most recent trip cover, fallback
  const coverImage = trips[0]?.coverImage || "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200";

  const TABS: { key: Tab; label: string; icon: typeof MapIcon }[] = [
    { key: "map", label: "Map", icon: MapIcon },
    { key: "trips", label: "Trips", icon: Plane },
    { key: "stories", label: "Stories", icon: Sparkles },
    { key: "badges", label: "Badges", icon: Trophy },
    { key: "saved", label: "Saved", icon: Bookmark },
    { key: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="dark-immersive min-h-screen pb-28">
      {/* ── HERO with cover image ───────────────────────── */}
      <div className="relative">
        <div className="relative h-56 overflow-hidden">
          <img src={coverImage} alt="" className="absolute inset-0 h-full w-full object-cover scale-105" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-[hsl(230_50%_7%)]" />
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 via-transparent to-transparent" />

          {/* Top bar */}
          <div className="absolute top-0 inset-x-0 px-5 pt-12 flex items-center justify-between z-10">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full backdrop-blur-xl bg-white/10 border border-white/15">
              <img src={roavrPin} alt="" className="h-4 w-4" />
              <span className="text-[10px] font-bold text-white tracking-wider uppercase">Roavr Passport</span>
            </div>
            <div className="flex gap-2">
              <button onClick={cyclePrivacy} className="flex items-center gap-1.5 h-9 px-3 rounded-full backdrop-blur-xl bg-white/10 border border-white/15">
                <PrivIcon className="h-3.5 w-3.5 text-white" />
                <span className="text-[10px] font-bold text-white capitalize">{privacy}</span>
              </button>
              {editing && (
                <button onClick={() => setEditing(false)} className="h-9 w-9 rounded-full backdrop-blur-xl bg-white/10 border border-white/15 flex items-center justify-center">
                  <X className="h-4 w-4 text-white" />
                </button>
              )}
              <button onClick={editing ? saveEdit : startEdit} className="h-9 w-9 rounded-full backdrop-blur-xl bg-white/10 border border-white/15 flex items-center justify-center">
                {editing ? <Check className="h-4 w-4 text-white" /> : <Pencil className="h-4 w-4 text-white" />}
              </button>
            </div>
          </div>

          {/* Floating quick stats — top right of cover */}
          <div className="absolute bottom-3 right-4 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full backdrop-blur-xl bg-black/30 border border-white/10 z-10">
            <GlobeIcon className="h-3 w-3 text-electric" />
            <span className="text-[10px] font-bold text-white">{stats.countries} countries · {stats.cities} cities</span>
          </div>
        </div>

        {/* Avatar + identity card overlapping */}
        <div className="px-5 -mt-12 relative z-10">
          <div className="flex items-end gap-3">
            <div className="relative shrink-0">
              <div className="h-24 w-24 rounded-full p-[3px] bg-gradient-to-br from-primary via-electric to-coral shadow-[0_8px_30px_-6px_rgba(59,130,246,0.6)]">
                <div className="h-full w-full rounded-full overflow-hidden bg-[hsl(230_50%_7%)] border-2 border-[hsl(230_50%_7%)]">
                  <img src={identity.avatar} alt={identity.name} className="h-full w-full object-cover" />
                </div>
              </div>
              <button className="absolute -bottom-0.5 -right-0.5 h-7 w-7 rounded-full gradient-glow flex items-center justify-center border-2 border-[hsl(230_50%_7%)]">
                <Camera className="h-3 w-3 text-white" />
              </button>
            </div>

            <div className="flex-1 min-w-0 pb-1">
              <div className="flex items-center gap-1.5">
                <h2 className="font-heading text-[20px] font-bold text-white truncate">{identity.name}</h2>
                {identity.verified && <BadgeCheck className="h-4 w-4 text-electric shrink-0" />}
              </div>
              <p className="text-[11px] text-white/60 flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3" /> {identity.homeCity || "—"}
              </p>
              <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-primary/20 border border-primary/30">
                <Compass className="h-2.5 w-2.5 text-electric" />
                <span className="text-[9px] font-bold text-electric uppercase tracking-wider">{identity.persona} traveler</span>
              </span>
            </div>
          </div>

          {editing ? (
            <div className="mt-3 space-y-2">
              <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Your name" className="bg-white/5 border-white/10 text-white placeholder:text-dark-muted" />
              <Input value={editForm.home_city} onChange={(e) => setEditForm({ ...editForm, home_city: e.target.value })} placeholder="Home city" className="bg-white/5 border-white/10 text-white placeholder:text-dark-muted" />
              <Textarea value={editForm.bio} onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} placeholder="Travel bio…" rows={2} className="bg-white/5 border-white/10 text-white placeholder:text-dark-muted" />
            </div>
          ) : (
            identity.bio && <p className="mt-3 text-[12.5px] text-white/75 leading-relaxed">{identity.bio}</p>
          )}
        </div>
      </div>

      {/* ── Social stats ────────────────────────────────── */}
      <div className="px-5 mt-4">
        <div className="dark-card rounded-2xl p-3 grid grid-cols-6 gap-1">
          {[
            { v: stats.followers, l: "Followers" },
            { v: stats.following, l: "Following" },
            { v: stats.countries, l: "Countries" },
            { v: stats.cities, l: "Cities" },
            { v: stats.trips, l: "Trips" },
            { v: stats.checkIns, l: "Check-Ins" },
          ].map((s) => (
            <div key={s.l} className="text-center px-1">
              <p className="font-heading font-bold text-[15px] text-white leading-none">{s.v >= 1000 ? `${(s.v / 1000).toFixed(1)}k` : s.v}</p>
              <p className="text-[8px] text-dark-muted uppercase tracking-wider mt-1 truncate">{s.l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Primary actions ────────────────────────────── */}
      <div className="px-5 mt-3 grid grid-cols-4 gap-2">
        <button onClick={startEdit} className="rounded-xl gradient-glow text-white py-2.5 text-[11px] font-bold col-span-2 flex items-center justify-center gap-1.5 glow-accent">
          <Pencil className="h-3.5 w-3.5" /> Edit Profile
        </button>
        <button onClick={() => navigate("/inbox")} className="rounded-xl dark-card-elevated text-white py-2.5 text-[11px] font-bold flex items-center justify-center gap-1">
          <MessageCircle className="h-3.5 w-3.5 text-electric" /> Message
        </button>
        <button onClick={() => navigate("/globe")} className="rounded-xl dark-card-elevated text-white py-2.5 text-[11px] font-bold flex items-center justify-center gap-1">
          <Share2 className="h-3.5 w-3.5 text-electric" /> Share
        </button>
      </div>

      {/* ── Stories row ─────────────────────────────────── */}
      <div className="mt-5">
        <div className="px-5 flex items-center justify-between mb-2">
          <h3 className="text-[13px] font-bold text-white">Highlights</h3>
          <button onClick={() => navigate("/camera")} className="text-[10px] font-bold text-electric flex items-center gap-0.5">
            New <Plus className="h-3 w-3" />
          </button>
        </div>
        <div className="px-5 flex gap-3 overflow-x-auto scrollbar-hide pb-1">
          {/* Add story */}
          <button onClick={() => navigate("/camera")} className="shrink-0 flex flex-col items-center gap-1.5 w-16">
            <div className="h-16 w-16 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center">
              <Plus className="h-5 w-5 text-white/60" />
            </div>
            <span className="text-[9px] text-dark-muted">Add</span>
          </button>
          {[...stories, ...memories.slice(0, 8).map((m) => ({ id: m.id, locationName: m.locationName, mediaUrl: m.mediaUrl }))].slice(0, 10).map((s: any, i) => (
            <div key={s.id || i} className="shrink-0 flex flex-col items-center gap-1.5 w-16">
              <div className="h-16 w-16 rounded-full p-[2px] bg-gradient-to-br from-primary via-electric to-coral">
                <div className="h-full w-full rounded-full overflow-hidden bg-[hsl(230_50%_7%)] border-2 border-[hsl(230_50%_7%)]">
                  {s.mediaUrl && <img src={s.mediaUrl} alt="" className="h-full w-full object-cover" />}
                </div>
              </div>
              <span className="text-[9px] text-white/70 truncate max-w-full">{s.locationName?.split(",")[0] || "Trip"}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────── */}
      <div className="mt-5 px-5">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide rounded-full dark-card p-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`shrink-0 flex items-center gap-1 rounded-full px-3 py-2 text-[11px] font-bold transition-all ${
                tab === key ? "gradient-glow text-white glow-accent" : "text-dark-muted"
              }`}
            >
              <Icon className="h-3 w-3" /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ─────────────────────────────────── */}
      <div className="px-5 mt-4">
        {tab === "map" && (
          <div
            onClick={() => navigate("/globe")}
            className="dark-card rounded-2xl overflow-hidden relative h-56 cursor-pointer group"
          >
            <img
              src="https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-s+22d3ee(139.6917,35.6895),pin-s+22d3ee(14.4378,40.6340),pin-s+f97362(-21.9426,64.1466),pin-s+22d3ee(-7.9811,31.6295),pin-s+3b82f6(-97.7431,30.2672)/0,20,1.2/600x300@2x?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw"
              alt="Map preview"
              className="absolute inset-0 h-full w-full object-cover opacity-70 group-hover:opacity-90 transition-opacity"
              onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800"; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(230_50%_7%)] via-transparent to-transparent" />
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full backdrop-blur-xl bg-black/40 border border-white/10">
              <GlobeIcon className="h-3 w-3 text-electric" />
              <span className="text-[10px] font-bold text-white">Public Globe</span>
            </div>
            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
              <div>
                <p className="font-heading text-white font-bold text-[16px] leading-tight">{stats.countries} countries pinned</p>
                <p className="text-white/70 text-[11px]">{stats.cities} cities · {stats.checkIns} check-ins</p>
              </div>
              <button className="px-3 py-1.5 rounded-full gradient-glow text-white text-[10px] font-bold flex items-center gap-1">
                Open <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {tab === "trips" && (
          <div className="grid grid-cols-2 gap-2.5">
            {trips.slice(0, 6).map((t) => (
              <button
                key={t.id}
                onClick={() => navigate("/trips")}
                className="rounded-2xl overflow-hidden relative h-36 group text-left"
              >
                <img src={t.coverImage} alt={t.title} className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                <span className={`absolute top-2 right-2 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                  t.status === "completed" ? "bg-electric/20 text-electric border border-electric/30" : "bg-coral/20 text-coral border border-coral/30"
                }`}>{t.status}</span>
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="text-white font-heading font-bold text-[12px] leading-tight truncate">{t.title}</p>
                  <p className="text-white/70 text-[10px] truncate">{t.destination}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {tab === "stories" && (
          <div className="grid grid-cols-3 gap-1.5">
            {memories.map((m) => (
              <div key={m.id} className="aspect-square rounded-lg overflow-hidden relative">
                <img src={m.mediaUrl!} alt="" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                  <p className="text-white text-[8px] font-semibold truncate">{m.locationName}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "badges" && (
          <div className="grid grid-cols-3 gap-2.5">
            {BADGE_LIBRARY.map((b) => {
              const earned = earnedNames.has(b.name);
              return (
                <div
                  key={b.name}
                  className={`relative rounded-2xl p-3 text-center border transition-all overflow-hidden ${
                    earned ? "border-white/15 bg-white/[0.04]" : "border-white/5 bg-white/[0.02] opacity-50"
                  }`}
                >
                  {earned && <div className={`absolute -inset-8 bg-gradient-to-br ${b.from} ${b.to} opacity-20 blur-2xl`} />}
                  <div className={`relative mx-auto h-14 w-14 rounded-full flex items-center justify-center text-2xl ${
                    earned ? `bg-gradient-to-br ${b.from} ${b.to} shadow-[0_4px_20px_-4px_rgba(59,130,246,0.5)]` : "bg-white/5"
                  }`}>
                    <span className="drop-shadow">{earned ? b.emoji : "🔒"}</span>
                  </div>
                  <p className="relative text-[10px] font-bold text-white mt-2 truncate">{b.name}</p>
                  <p className="relative text-[8px] uppercase tracking-wider text-dark-muted mt-0.5">{b.tier}</p>
                </div>
              );
            })}
          </div>
        )}

        {tab === "saved" && (
          <div className="dark-card rounded-2xl p-8 text-center">
            <Bookmark className="h-8 w-8 text-electric mx-auto mb-2" />
            <p className="text-white text-[13px] font-bold">No saved places yet</p>
            <p className="text-dark-muted text-[11px] mt-1">Bookmark spots from Discover or friends' globes.</p>
            <button onClick={() => navigate("/discover")} className="mt-4 px-4 py-2 rounded-full gradient-glow text-white text-[11px] font-bold">
              Explore Discover
            </button>
          </div>
        )}

        {tab === "settings" && (
          <div className="space-y-1.5">
            {[
              { label: "Account", icon: BadgeCheck, route: "/settings", desc: "Profile, email & login" },
              { label: "Privacy & Visibility", icon: Lock, route: "/settings", desc: "Who can see your map" },
              { label: "Subscription", icon: Sparkles, route: "/subscription", desc: "Manage your plan" },
              { label: "Refer Friends", icon: Users, route: "/referral", desc: "Earn free months" },
              { label: "All Settings", icon: Settings, route: "/settings", desc: "App preferences" },
            ].map((a) => (
              <button key={a.label} onClick={() => navigate(a.route)} className="w-full flex items-center gap-3 rounded-xl dark-card p-3.5 text-left">
                <div className="h-9 w-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                  <a.icon className="h-4 w-4 text-electric" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-white">{a.label}</p>
                  <p className="text-[11px] text-dark-muted">{a.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-dark-muted shrink-0" />
              </button>
            ))}
            <button onClick={signOut} className="w-full mt-2 rounded-xl border border-coral/30 bg-coral/10 text-coral py-3 text-[12px] font-bold">
              Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
