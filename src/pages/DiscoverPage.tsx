import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Sparkles, MapPin, Star, ArrowRight, Compass, TrendingUp,
  Heart, Bookmark, Tag, Crown, Zap, Filter, SlidersHorizontal,
} from "lucide-react";
import ExperienceCard, { type Experience } from "@/components/discover/ExperienceCard";
import LocalExpertCard from "@/components/discover/LocalExpertCard";
import { MOCK_EXPERTS, MOCK_OFFERS } from "@/data";
import roavrPin from "@/assets/roavr-pin.png";

const MARKETPLACE: Experience[] = [
  { id: "m1", name: "Sunset Sailing Tour", category: "Tours", image: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=600&q=80", price: "$65", rating: 4.8, reviews: 312, distance: "1.2 mi", cta: "Book", verified: true },
  { id: "m2", name: "Hidden Speakeasy", category: "Nightlife", image: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=600&q=80", price: "$$", rating: 4.7, reviews: 184, distance: "0.5 mi", cta: "Reserve" },
  { id: "m3", name: "Local Cooking Class", category: "Activities", image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80", price: "$45", rating: 4.9, reviews: 528, distance: "2.1 mi", cta: "Book", verified: true },
  { id: "m4", name: "Boutique Riad Stay", category: "Hotels", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&q=80", price: "$120/n", rating: 4.8, reviews: 96, distance: "City center", cta: "Book" },
  { id: "m5", name: "Airport Lux Transfer", category: "Transfers", image: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=600&q=80", price: "$35", rating: 4.9, reviews: 412, distance: "On-demand", cta: "Reserve" },
  { id: "m6", name: "Secret Beach Hike", category: "Hidden Gems", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80", price: "Free", rating: 4.9, reviews: 73, distance: "4.0 mi", cta: "Save" },
  { id: "m7", name: "Floating Lantern Festival", category: "Events", image: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=600&q=80", price: "$28", rating: 4.9, reviews: 211, distance: "3.4 mi", cta: "Reserve" },
  { id: "m8", name: "Omakase Counter", category: "Restaurants", image: "https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=600&q=80", price: "$$$", rating: 4.95, reviews: 88, distance: "0.9 mi", cta: "Reserve", verified: true },
];

const CATEGORIES = [
  { key: "All", icon: Sparkles },
  { key: "Tours", icon: Compass },
  { key: "Activities", icon: Zap },
  { key: "Restaurants", icon: Tag },
  { key: "Nightlife", icon: Star },
  { key: "Local Guides", icon: Crown },
  { key: "Hotels", icon: Bookmark },
  { key: "Transfers", icon: ArrowRight },
  { key: "Events", icon: Sparkles },
  { key: "Hidden Gems", icon: MapPin },
  { key: "Creator Picks", icon: Heart },
];

const FEATURED_DESTINATIONS = [
  { name: "Bali", country: "Indonesia", image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80", rating: 4.9, tag: "Trending" },
  { name: "Kyoto", country: "Japan", image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80", rating: 4.8, tag: "Culture" },
  { name: "Santorini", country: "Greece", image: "https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=800&q=80", rating: 4.9, tag: "Romance" },
];

const AI_PICKS = [
  { name: "Marrakech", country: "Morocco", image: "https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=800&q=80", reason: "Perfect weather this week", match: "94%" },
  { name: "Dubrovnik", country: "Croatia", image: "https://images.unsplash.com/photo-1555990793-da11153b2473?w=800&q=80", reason: "Low crowds right now", match: "91%" },
  { name: "Reykjavik", country: "Iceland", image: "https://images.unsplash.com/photo-1504829857797-ddff29c27927?w=800&q=80", reason: "Northern lights season", match: "88%" },
];

const NEARBY = [
  { name: "Local Food Tour", type: "Experience", distance: "2.3 mi", price: "$45", rating: 4.8, image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80" },
  { name: "Sunset Rooftop Bar", type: "Nightlife", distance: "0.8 mi", price: "$$", rating: 4.6, image: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=400&q=80" },
  { name: "Historic Walking Tour", type: "Culture", distance: "1.5 mi", price: "$25", rating: 4.7, image: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=400&q=80" },
];

const CREATOR_PICKS = [
  { id: "cp-1", curator: "Sofia Bergström", curatorAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=faces", title: "Stockholm in 48 Hours", image: "https://images.unsplash.com/photo-1509356843151-3e7d96241e11?w=800&q=80", places: 12 },
  { id: "cp-2", curator: "Kai Tanaka", curatorAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=faces", title: "Tokyo Ramen Crawl", image: "https://images.unsplash.com/photo-1557872943-16a5ac26437e?w=800&q=80", places: 8 },
  { id: "cp-3", curator: "Maya Chen", curatorAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=faces", title: "Bali Hidden Beaches", image: "https://images.unsplash.com/photo-1518509562904-e7ef99cddc85?w=800&q=80", places: 15 },
];

export default function DiscoverPage() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMarketplace = useMemo(
    () => MARKETPLACE.filter((m) => activeCategory === "All" || m.category === activeCategory),
    [activeCategory]
  );

  // Convert offers into claimable cards
  const offerCards: Experience[] = useMemo(
    () => MOCK_OFFERS.map((o) => ({
      id: o.id,
      name: `${o.businessName} — ${o.discount}`,
      category: o.category === "food" ? "Restaurants" : o.category === "stay" ? "Hotels" : o.category === "transport" ? "Transfers" : "Hidden Gems",
      image: o.image || "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80",
      price: o.discount,
      rating: 4.8,
      reviews: 60,
      distance: o.address.split(",").slice(-1)[0]?.trim() || "Nearby",
      cta: "Claim",
      verified: true,
    })),
    []
  );

  return (
    <div className="dark-immersive min-h-screen pb-28">
      {/* ── Hero header ─────────────────────────────────── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-dark-radial" />
        <div className="absolute -top-24 -right-20 w-72 h-72 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-56 h-56 rounded-full bg-electric/10 blur-3xl pointer-events-none" />

        <div className="relative px-5 pt-12 pb-4 space-y-4">
          <div className="flex items-end justify-between">
            <div className="flex items-center gap-2.5">
              <img src={roavrPin} alt="" className="h-8 w-8 drop-shadow-[0_0_12px_rgba(59,130,246,0.55)]" />
              <div>
                <p className="text-dark-muted text-[9px] font-bold tracking-[0.22em] uppercase">Marketplace</p>
                <h1 className="font-heading text-[24px] font-bold text-white leading-none mt-0.5">Discover</h1>
              </div>
            </div>
            <button className="h-9 w-9 rounded-full dark-card-elevated flex items-center justify-center" aria-label="Filters">
              <SlidersHorizontal className="h-4 w-4 text-electric" />
            </button>
          </div>

          {/* Hero search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-muted" />
            <input
              type="text"
              placeholder="Search places, locals, stays, food, tours…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 rounded-2xl pl-10 pr-20 text-[13px] text-white placeholder:text-dark-muted border border-white/10 bg-white/[0.04] backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-electric/40"
            />
            <button className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 px-3 rounded-xl gradient-glow text-white text-[11px] font-bold flex items-center gap-1">
              <Filter className="h-3 w-3" /> Filter
            </button>
          </div>

          {/* Quick suggestion chips */}
          <div className="flex gap-1.5 overflow-x-auto -mx-5 px-5 no-scrollbar pb-0.5">
            {["Restaurants near me", "Tonight's events", "Top guides", "Free things", "Family"].map((s) => (
              <button
                key={s}
                onClick={() => setSearchQuery(s)}
                className="shrink-0 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-semibold text-white/80"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Categories */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-5 px-5 no-scrollbar">
            {CATEGORIES.map(({ key, icon: Icon }) => {
              const active = activeCategory === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveCategory(key)}
                  className={`shrink-0 flex items-center gap-1 px-3 h-8 rounded-full text-[11px] font-bold transition-all ${
                    active ? "gradient-glow text-white glow-accent" : "text-dark-muted dark-card-elevated"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {key}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── AI Picks ────────────────────────────────────── */}
      <Section title="AI Picks for You" icon={Sparkles}>
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-5 px-5 no-scrollbar">
          {AI_PICKS.map((dest) => (
            <div key={dest.name} className="shrink-0 w-60 rounded-2xl overflow-hidden relative group cursor-pointer">
              <img src={dest.image} alt={dest.name} className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
              <span className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full gradient-coral text-white">
                {dest.match} match
              </span>
              <button className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/10">
                <Heart className="h-3.5 w-3.5 text-white" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-white font-heading text-[16px] font-bold leading-tight">{dest.name}</p>
                <p className="text-electric text-[10.5px] font-medium mt-0.5 flex items-center gap-1">
                  <Sparkles className="h-2.5 w-2.5" /> {dest.reason}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Trending ────────────────────────────────────── */}
      <Section title="Trending" icon={TrendingUp} action="See all">
        <div className="grid grid-cols-2 gap-2">
          {FEATURED_DESTINATIONS.map((dest, i) => (
            <div
              key={dest.name}
              className={`rounded-2xl overflow-hidden relative group cursor-pointer ${i === 0 ? "col-span-2 h-40" : "h-32"}`}
            >
              <img src={dest.image} alt={dest.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
              <span className="absolute top-2 left-2 text-[8.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full gradient-glow text-white">
                {dest.tag}
              </span>
              <div className="absolute bottom-0 inset-x-0 p-2.5">
                <p className="text-white font-heading text-[14px] font-bold">{dest.name}</p>
                <div className="flex items-center gap-1.5 text-[10px] text-white/80 mt-0.5">
                  <MapPin className="h-2.5 w-2.5" />{dest.country}
                  <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400 ml-auto" />
                  <span className="font-semibold">{dest.rating}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Experiences & Activities ───────────────────── */}
      <Section title="Experiences & Activities" icon={Compass} action="See all">
        <div className="grid grid-cols-2 gap-2">
          {filteredMarketplace.map((m) => <ExperienceCard key={m.id} item={m} />)}
        </div>
      </Section>

      {/* ── Verified Local Experts ─────────────────────── */}
      <Section title="Verified Local Experts" icon={Crown} action="See all">
        <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-5 px-5 no-scrollbar">
          {MOCK_EXPERTS.map((e) => (
            <LocalExpertCard
              key={e.id}
              expert={{
                id: e.id, name: e.name, avatarUrl: e.avatarUrl, category: e.category,
                location: e.location, rating: e.rating, reviews: e.totalReviews,
                pricePerHour: e.pricePerHour, currency: e.currency,
                verified: e.verified, available: e.available,
              }}
            />
          ))}
        </div>
      </Section>

      {/* ── Creator Picks ──────────────────────────────── */}
      <Section title="Creator Picks" icon={Heart}>
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-5 px-5 no-scrollbar">
          {CREATOR_PICKS.map((c) => (
            <div key={c.id} className="shrink-0 w-56 rounded-2xl overflow-hidden relative group cursor-pointer">
              <img src={c.image} alt={c.title} className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
              <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
                <img src={c.curatorAvatar} alt="" className="h-4 w-4 rounded-full object-cover" />
                <span className="text-[9px] font-bold text-white">{c.curator}</span>
              </div>
              <div className="absolute bottom-0 inset-x-0 p-3">
                <p className="text-white font-heading text-[14px] font-bold leading-tight">{c.title}</p>
                <p className="text-white/65 text-[10px] mt-0.5">{c.places} curated places</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Local Offers (Claim) ───────────────────────── */}
      <Section title="Local Offers" icon={Tag} action="See all">
        <div className="grid grid-cols-2 gap-2">
          {offerCards.map((o) => <ExperienceCard key={o.id} item={o} />)}
        </div>
      </Section>

      {/* ── Near You ───────────────────────────────────── */}
      <Section title="Near You" icon={MapPin}>
        <div className="space-y-2">
          {NEARBY.map((item) => (
            <button key={item.name} className="w-full flex items-center gap-3 rounded-2xl p-2.5 dark-card text-left">
              <img src={item.image} alt={item.name} className="h-14 w-14 rounded-xl object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-[13px] truncate">{item.name}</p>
                <p className="text-dark-muted text-[10.5px] mt-0.5 flex items-center gap-1.5">
                  {item.type} · {item.distance}
                  <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400 ml-1" />
                  <span className="text-white/80">{item.rating}</span>
                </p>
              </div>
              <div className="text-right shrink-0 flex flex-col items-end gap-1">
                <span className="text-electric text-[11px] font-bold">{item.price}</span>
                <button className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full gradient-glow text-white">Book</button>
              </div>
            </button>
          ))}
        </div>
      </Section>

      {/* ── Saved Places ───────────────────────────────── */}
      <Section title="Saved Places" icon={Bookmark} action="View all">
        <div
          onClick={() => navigate("/profile")}
          className="dark-card rounded-2xl p-4 flex items-center gap-3 cursor-pointer"
        >
          <div className="h-12 w-12 rounded-xl gradient-glow flex items-center justify-center">
            <Bookmark className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-[13px]">Your saved collection</p>
            <p className="text-dark-muted text-[11px] mt-0.5">Bookmarked spots, guides & offers in one place</p>
          </div>
          <ArrowRight className="h-4 w-4 text-electric" />
        </div>
      </Section>
    </div>
  );
}

function Section({
  title, icon: Icon, action, children,
}: {
  title: string;
  icon: typeof Sparkles;
  action?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-5 mt-5 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-electric" />
          <h2 className="font-heading text-[14px] font-bold text-white">{title}</h2>
        </div>
        {action && (
          <button className="text-[10.5px] text-electric font-semibold flex items-center gap-0.5">
            {action} <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
