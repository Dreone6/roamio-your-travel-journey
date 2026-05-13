import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import SafePassCard from "@/components/safety/SafePassCard";
import WhatsNewModal from "@/components/WhatsNewModal";
import TrialBanner from "@/components/TrialBanner";
import { useNavigate } from "react-router-dom";
import {
  MapPin, Sparkles, ArrowRight, Compass, Globe, Plus, Shield,
  MessageCircle, Bell, Plane, Sun, Briefcase, Search,
  Heart, Trophy, Users, Flame, ChevronRight, Mic
} from "lucide-react";
import roavrLogo from "@/assets/roavr-logo.png";
import { MOCK_USERS } from "@/data/mock/users";
import { MOCK_OFFERS } from "@/data/mock/offers";
import { MOCK_STORIES } from "@/data/mock/social";

interface Trip {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  status: string;
}

const HERO_IMG =
  "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=1200&q=80&auto=format&fit=crop";

const NEARBY = [
  { tag: "Offer", title: "Coastal Kitchen", sub: "20% off brunch · 0.4 mi", img: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600", route: "/discover" },
  { tag: "Tour", title: "Sunset Sailing", sub: "From $48 · Tonight", img: "https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=600", route: "/discover" },
  { tag: "Food", title: "Sakura Ramen", sub: "4.8 ★ · 8 min walk", img: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600", route: "/discover" },
  { tag: "Nightlife", title: "Rooftop 360", sub: "Live DJ tonight", img: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600", route: "/discover" },
  { tag: "Event", title: "Street Food Fest", sub: "Sat · Old Town", img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600", route: "/discover" },
  { tag: "Expert", title: "Yuki — Tokyo guide", sub: "4.9 ★ · 127 trips", img: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600", route: "/discover" },
];

const STORY_CATS = ["You", "Friends", "Travelers", "Nearby", "Creators"] as const;

const MEMORIES = [
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=300",
  "https://images.unsplash.com/photo-1493558103817-58b2924bce98?w=300",
  "https://images.unsplash.com/photo-1528127269322-539801943592?w=300",
  "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=300",
];

const FEED = [
  { type: "checkin", user: MOCK_USERS[1], text: "checked in at Positano", meta: "2h · Italy", img: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=600" },
  { type: "badge", user: MOCK_USERS[3], text: "unlocked Globetrotter Lv.3", meta: "5h · 25 countries", img: null },
  { type: "trip", user: MOCK_USERS[2], text: "wrapped a trip to Iceland", meta: "1d · 14 memories", img: "https://images.unsplash.com/photo-1531168556467-80aace0d0144?w=600" },
  { type: "story", user: MOCK_USERS[4], text: "shared a story from Tokyo", meta: "3h · 89 views", img: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600" },
];

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Traveler";
  const [trips, setTrips] = useState<Trip[]>([]);
  const [stats, setStats] = useState({ countries: 0, cities: 0, trips: 0, checkIns: 0 });
  const [aiInput, setAiInput] = useState("");
  const [storyCat, setStoryCat] = useState<typeof STORY_CATS[number]>("Friends");

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    const [tripsRes, placesRes, checkInsRes] = await Promise.all([
      supabase.from("trips").select("id, title, destination, start_date, status").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(5),
      supabase.from("places_visited").select("country, city").eq("user_id", user!.id),
      supabase.from("check_ins").select("id").eq("user_id", user!.id),
    ]);
    setTrips((tripsRes.data as Trip[]) || []);
    const places = placesRes.data || [];
    setStats({
      countries: new Set(places.map((p: any) => p.country)).size,
      cities: new Set(places.map((p: any) => `${p.city}-${p.country}`)).size,
      trips: tripsRes.data?.length || 0,
      checkIns: checkInsRes.data?.length || 0,
    });
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  };

  const upcomingTrip = trips.find((t) => t.status === "active" || t.status === "planning");

  const countdown = useMemo(() => {
    if (!upcomingTrip) return null;
    const ms = new Date(upcomingTrip.start_date).getTime() - Date.now();
    const d = Math.ceil(ms / 86400000);
    return d > 0 ? `${d}d to go` : d === 0 ? "Today" : "In progress";
  }, [upcomingTrip]);

  const worldPercent = Math.min(100, Math.round((stats.countries / 195) * 100));
  const unread = 3;

  // Stories: Your Story + friends from mock
  const stories = [
    { id: "you", name: "Your story", avatar: user?.user_metadata?.avatar_url || MOCK_USERS[0].avatarUrl, isYou: true, viewed: false },
    ...MOCK_STORIES.slice(0, 6).map((s) => ({ id: s.id, name: s.userName.split(" ")[0], avatar: s.userAvatar || s.mediaUrl, isYou: false, viewed: false })),
  ];

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    (window as any).__roavrSwipe = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = (window as any).__roavrSwipe;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > 70 && Math.abs(dy) < 50) {
      if (dx > 0) navigate("/camera");
      else navigate("/messages");
    }
    (window as any).__roavrSwipe = null;
  };

  const handleAsk = () => {
    if (!aiInput.trim()) return;
    navigate(`/trips?ask=${encodeURIComponent(aiInput)}`);
  };

  return (
    <div className="pb-6 bg-background min-h-screen" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <WhatsNewModal />

      {/* === HEADER (dark immersive) === */}
      <div className="dark-immersive relative overflow-hidden">
        <div className="absolute inset-0 gradient-dark-radial" />
        <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-[hsl(var(--dark-glow))]/10 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-56 h-56 rounded-full bg-primary/15 blur-3xl" />

        <div className="relative px-4 pt-12 pb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={roavrLogo} alt="Roavr" className="h-7 w-auto brightness-0 invert" />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/notifications")}
                className="relative h-10 w-10 rounded-full dark-card-elevated flex items-center justify-center active:scale-95 transition-transform"
                aria-label="Notifications"
              >
                <Bell className="h-[18px] w-[18px] text-white/85" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-coral ring-2 ring-[hsl(var(--dark-card-elevated))]" />
              </button>
              <button
                onClick={() => navigate("/messages")}
                className="relative h-10 w-10 rounded-full dark-card-elevated flex items-center justify-center active:scale-95 transition-transform"
                aria-label="Messages"
              >
                <MessageCircle className="h-[18px] w-[18px] text-white/85" />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-coral text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-[hsl(var(--dark-bg))]">
                    {unread}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-white/55 text-[12px] font-medium tracking-wide">{greeting()}</p>
            <h1 className="font-heading text-[26px] font-extrabold text-white tracking-tight leading-tight mt-0.5">
              {displayName} <span className="inline-block">👋</span>
            </h1>
          </div>

          {/* === STORY CATEGORY CHIPS === */}
          <div className="mt-5 -mx-4 px-4 flex gap-1.5 overflow-x-auto no-scrollbar">
            {STORY_CATS.map((c) => (
              <button
                key={c}
                onClick={() => setStoryCat(c)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all ${
                  storyCat === c
                    ? "bg-white text-[hsl(var(--dark-bg))]"
                    : "bg-white/10 text-white/70 hover:bg-white/15"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* === STORIES ROW === */}
          <div className="mt-3 -mx-4 px-4 flex gap-3.5 overflow-x-auto no-scrollbar">
            {stories.map((s) => (
              <button
                key={s.id}
                onClick={() => navigate("/stories")}
                className="shrink-0 flex flex-col items-center gap-1.5 w-[64px] active:scale-95 transition-transform"
              >
                <div className={`relative h-[62px] w-[62px] rounded-full p-[2.5px] ${s.viewed ? "bg-white/15" : "bg-gradient-to-tr from-primary via-electric to-primary"}`}>
                  <div className="h-full w-full rounded-full p-[2px] bg-[hsl(var(--dark-bg))]">
                    <img src={s.avatar} alt={s.name} className="h-full w-full rounded-full object-cover" />
                  </div>
                  {s.isYou && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-electric border-2 border-[hsl(var(--dark-bg))] flex items-center justify-center">
                      <Plus className="h-3 w-3 text-[hsl(var(--dark-bg))] stroke-[3]" />
                    </span>
                  )}
                </div>
                <p className="text-[10.5px] text-white/80 font-medium truncate max-w-full">{s.name}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* === BODY === */}
      <div className="px-4 pt-4 space-y-4">
        <TrialBanner />

        {/* === UPCOMING TRIP HERO (cinematic) === */}
        <button
          onClick={() => navigate("/trips")}
          className="w-full rounded-2xl overflow-hidden relative shadow-elevated active:scale-[0.99] transition-transform text-left animate-fade-in"
        >
          <div className="relative h-56">
            <img
              src={HERO_IMG}
              alt={upcomingTrip?.destination || "Next adventure"}
              className="absolute inset-0 h-full w-full object-cover scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--dark-bg))] via-[hsl(var(--dark-bg))]/55 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-transparent to-electric/15 mix-blend-overlay" />
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Plane className="h-3 w-3" /> {upcomingTrip ? "Upcoming trip" : "Plan next trip"}
              </span>
              {countdown && (
                <span className="px-2.5 py-1 rounded-full gradient-glow text-[hsl(var(--dark-bg))] text-[10px] font-extrabold uppercase tracking-wider animate-pulse">
                  {countdown}
                </span>
              )}
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <p className="text-white/70 text-[11px] font-semibold uppercase tracking-wider">
                {upcomingTrip
                  ? new Date(upcomingTrip.start_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
                  : "Tap to start planning"}
              </p>
              <h2 className="font-heading text-[22px] font-extrabold text-white tracking-tight leading-tight mt-0.5">
                {upcomingTrip?.title || "Where to next?"}
              </h2>
              <p className="text-white/80 text-[12px] flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3" /> {upcomingTrip?.destination || "Discover your next destination"}
              </p>
            </div>
          </div>
          <div className="bg-white grid grid-cols-4 divide-x divide-border/50">
            {[
              { icon: Sun, label: "Weather", val: "27°" },
              { icon: Shield, label: "SafePass", val: "Active" },
              { icon: Briefcase, label: "Bookings", val: "4" },
              { icon: ArrowRight, label: "View", val: "Trip" },
            ].map((m) => (
              <div key={m.label} className="px-2 py-2.5 flex flex-col items-center gap-0.5">
                <m.icon className="h-3.5 w-3.5 text-primary" />
                <p className="text-[13px] font-bold text-foreground leading-none">{m.val}</p>
                <p className="text-[9.5px] text-muted-foreground uppercase tracking-wider">{m.label}</p>
              </div>
            ))}
          </div>
        </button>

        {/* === ASK ROAVR AI === */}
        <div className="rounded-2xl overflow-hidden border border-primary/15 bg-card shadow-soft">
          <div className="px-4 pt-3.5 pb-2 flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg gradient-glow flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--dark-bg))]" />
            </div>
            <div className="flex-1">
              <p className="font-heading text-[14px] font-bold text-foreground leading-tight">Ask Roavr</p>
              <p className="text-[11px] text-muted-foreground">Plan, find, translate, compare or solve any travel issue</p>
            </div>
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-electric bg-electric/10 px-1.5 py-0.5 rounded">AI</span>
          </div>
          <div className="px-3 pb-3">
            <div className="flex items-center gap-2 rounded-xl bg-secondary/70 border border-border/60 px-3 py-2.5 focus-within:border-primary/50 transition-colors">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                placeholder="‘Plan 5 days in Lisbon under $1500’"
                className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground/70 outline-none"
              />
              <button onClick={handleAsk} className="h-7 w-7 rounded-lg gradient-accent flex items-center justify-center active:scale-95 transition-transform">
                {aiInput.trim() ? <ArrowRight className="h-3.5 w-3.5 text-white" /> : <Mic className="h-3.5 w-3.5 text-white" />}
              </button>
            </div>
            <div className="flex gap-1.5 mt-2 overflow-x-auto no-scrollbar -mx-1 px-1">
              {["Best ramen near me", "5 days in Lisbon", "Translate menu", "Cheapest flights to Bali"].map((q) => (
                <button
                  key={q}
                  onClick={() => { setAiInput(q); }}
                  className="shrink-0 text-[11px] font-medium text-muted-foreground bg-secondary/70 hover:bg-primary/10 hover:text-primary px-2.5 py-1 rounded-full border border-border/50 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* === QUICK ACTIONS === */}
        <div className="grid grid-cols-4 gap-2.5">
          {[
            { label: "Plan", icon: Sparkles, route: "/trips", tone: "primary" },
            { label: "Discover", icon: Compass, route: "/discover", tone: "electric" },
            { label: "I'm Safe", icon: Shield, route: "/safepass", tone: "coral" },
            { label: "Import", icon: Briefcase, route: "/trips?import=1", tone: "navy" },
          ].map((a) => (
            <button
              key={a.label}
              onClick={() => navigate(a.route)}
              className="rounded-2xl bg-card border border-border/50 p-3 text-center hover:shadow-elevated active:scale-95 transition-all"
            >
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center mx-auto mb-1.5 ${
                a.tone === "primary" ? "gradient-accent text-white" :
                a.tone === "electric" ? "gradient-glow text-[hsl(var(--dark-bg))]" :
                a.tone === "coral" ? "gradient-coral text-white" :
                "gradient-navy text-white"
              }`}>
                <a.icon className="h-[18px] w-[18px]" />
              </div>
              <p className="text-[11.5px] font-bold text-foreground leading-tight">{a.label}</p>
            </button>
          ))}
        </div>

        {/* === NEARBY & TRENDING === */}
        <div>
          <div className="flex items-center justify-between mb-2.5 px-0.5">
            <div>
              <h2 className="font-heading text-[17px] font-extrabold text-foreground tracking-tight flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-coral" /> Nearby & Trending
              </h2>
              <p className="text-[11px] text-muted-foreground">Handpicked for tonight</p>
            </div>
            <button onClick={() => navigate("/discover")} className="text-[12px] font-bold text-primary flex items-center gap-0.5">
              See all <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-1 no-scrollbar">
            {NEARBY.map((n) => (
              <button
                key={n.title}
                onClick={() => navigate(n.route)}
                className="shrink-0 w-[180px] rounded-2xl overflow-hidden bg-card border border-border/50 shadow-soft active:scale-[0.98] transition-transform text-left"
              >
                <div className="relative h-[112px]">
                  <img src={n.img} alt={n.title} className="absolute inset-0 h-full w-full object-cover" />
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-white/95 text-[9.5px] font-extrabold uppercase tracking-wider text-primary">
                    {n.tag}
                  </span>
                  <button className="absolute top-2 right-2 h-7 w-7 rounded-full bg-white/90 backdrop-blur flex items-center justify-center">
                    <Heart className="h-3.5 w-3.5 text-foreground" />
                  </button>
                </div>
                <div className="p-2.5">
                  <p className="font-bold text-[13px] text-foreground truncate leading-tight">{n.title}</p>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{n.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* === GLOBE PROGRESS === */}
        <button
          onClick={() => navigate("/globe")}
          className="w-full rounded-2xl dark-immersive relative overflow-hidden p-4 text-left active:scale-[0.99] transition-transform shadow-elevated"
        >
          <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-electric/15 blur-3xl" />
          <div className="absolute -left-12 -bottom-12 w-44 h-44 rounded-full bg-primary/25 blur-3xl" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl gradient-glow flex items-center justify-center">
                <Globe className="h-[18px] w-[18px] text-[hsl(var(--dark-bg))]" />
              </div>
              <div>
                <p className="font-heading font-extrabold text-white text-[15px] leading-tight">Your Globe</p>
                <p className="text-white/55 text-[11px]">{worldPercent}% of the world explored</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-white/60" />
          </div>
          <div className="relative mt-3.5 h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full gradient-glow" style={{ width: `${Math.max(worldPercent, 6)}%` }} />
          </div>
          <div className="relative mt-3 grid grid-cols-4 gap-2">
            {[
              { v: stats.countries, l: "Countries" },
              { v: stats.cities, l: "Cities" },
              { v: stats.checkIns, l: "Check-ins" },
              { v: stats.trips, l: "Trips" },
            ].map((s) => (
              <div key={s.l} className="rounded-lg bg-white/5 px-2 py-2 text-center">
                <p className="text-white font-extrabold text-[15px] leading-none">{s.v}</p>
                <p className="text-white/55 text-[9.5px] uppercase tracking-wider mt-1">{s.l}</p>
              </div>
            ))}
          </div>
        </button>

        {/* === SAFEPASS === */}
        <SafePassCard variant="compact" />

        {/* === TRAVEL FEED === */}
        <div>
          <div className="flex items-center justify-between mb-2.5 px-0.5">
            <h2 className="font-heading text-[17px] font-extrabold text-foreground tracking-tight flex items-center gap-1.5">
              <Users className="h-4 w-4 text-primary" /> Travel feed
            </h2>
            <button onClick={() => navigate("/social")} className="text-[12px] font-bold text-primary flex items-center gap-0.5">
              Open <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-2.5">
            {FEED.map((f, i) => (
              <button
                key={i}
                onClick={() => navigate("/social")}
                className="w-full rounded-2xl bg-card border border-border/50 p-3 flex items-center gap-3 hover:shadow-elevated active:scale-[0.99] transition-all text-left"
              >
                <div className="relative shrink-0">
                  <img src={f.user.avatarUrl} alt={f.user.name} className="h-11 w-11 rounded-full object-cover" />
                  <span className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center ring-2 ring-card">
                    {f.type === "checkin" && <MapPin className="h-3 w-3 text-white" />}
                    {f.type === "badge" && <Trophy className="h-3 w-3 text-white" />}
                    {f.type === "trip" && <Plane className="h-3 w-3 text-white" />}
                    {f.type === "story" && <Sparkles className="h-3 w-3 text-white" />}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-foreground leading-tight">
                    <span className="font-bold">{f.user.name}</span>{" "}
                    <span className="text-muted-foreground">{f.text}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{f.meta}</p>
                </div>
                {f.img && (
                  <img src={f.img} alt="" className="h-11 w-11 rounded-lg object-cover shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
