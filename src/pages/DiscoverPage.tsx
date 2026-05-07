import { useState } from "react";
import { Search, Sparkles, MapPin, Star, ArrowRight, Compass, TrendingUp, Heart } from "lucide-react";

const CATEGORIES = ["All", "Cities", "Nature", "Beaches", "Culture", "Food", "Adventure"];

const FEATURED_DESTINATIONS = [
  { name: "Bali", country: "Indonesia", image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&q=80", rating: 4.9, tag: "Trending" },
  { name: "Kyoto", country: "Japan", image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=600&q=80", rating: 4.8, tag: "Culture" },
  { name: "Santorini", country: "Greece", image: "https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=600&q=80", rating: 4.9, tag: "Romance" },
];

const AI_PICKS = [
  { name: "Marrakech", country: "Morocco", image: "https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=600&q=80", reason: "Perfect weather this week" },
  { name: "Dubrovnik", country: "Croatia", image: "https://images.unsplash.com/photo-1555990793-da11153b2473?w=600&q=80", reason: "Low crowds right now" },
  { name: "Reykjavik", country: "Iceland", image: "https://images.unsplash.com/photo-1504829857797-ddff29c27927?w=600&q=80", reason: "Northern lights season" },
];

const NEARBY = [
  { name: "Local Food Tour", type: "Experience", distance: "2.3 mi", price: "$45", image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80" },
  { name: "Sunset Rooftop Bar", type: "Nightlife", distance: "0.8 mi", price: "$$", image: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=400&q=80" },
  { name: "Historic Walking Tour", type: "Culture", distance: "1.5 mi", price: "$25", image: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=400&q=80" },
];

export default function DiscoverPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="dark-immersive min-h-screen pb-4">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-dark-radial" />
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-gradient-to-br from-emerald-500/8 to-teal-500/4 blur-3xl" />

        <div className="relative px-5 pt-14 pb-5 space-y-4">
          <div>
            <p className="text-dark-muted text-[10px] font-bold tracking-[0.2em] uppercase">Explore</p>
            <h1 className="font-heading text-[26px] font-bold text-white tracking-tight mt-1 leading-tight">
              Discover<br /><span className="text-glow italic">New Places</span>
            </h1>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-muted" />
            <input
              type="text"
              placeholder="Search cities, activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 rounded-xl pl-10 pr-4 text-[13px] text-white placeholder:text-dark-muted border-0 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 dark-card-elevated"
            />
          </div>

          {/* Categories */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-5 px-5 no-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                  activeCategory === cat
                    ? "gradient-glow text-white"
                    : "text-dark-muted dark-card-elevated"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* AI Picks */}
      <div className="px-5 space-y-3 mt-1">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-glow" />
          <h2 className="font-heading text-[15px] font-semibold text-white">AI Picks for You</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1 -mx-5 px-5 no-scrollbar">
          {AI_PICKS.map((dest) => (
            <div key={dest.name} className="shrink-0 w-64 rounded-2xl overflow-hidden relative group cursor-pointer">
              <img src={dest.image} alt={dest.name} className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <button className="absolute top-3 right-3 h-7 w-7 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-colors">
                <Heart className="h-3.5 w-3.5 text-white" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 p-3.5">
                <p className="text-white font-heading text-lg font-bold leading-tight">{dest.name}</p>
                <p className="text-emerald-300 text-[11px] font-medium mt-0.5">{dest.reason}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Featured Destinations */}
      <div className="px-5 space-y-3 mt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-glow" />
            <h2 className="font-heading text-[15px] font-semibold text-white">Trending</h2>
          </div>
          <button className="text-[11px] text-glow font-semibold flex items-center gap-0.5">
            See All <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {FEATURED_DESTINATIONS.map((dest, i) => (
            <div
              key={dest.name}
              className={`rounded-2xl overflow-hidden relative group cursor-pointer ${i === 0 ? "col-span-2 h-44" : "h-36"}`}
            >
              <img src={dest.image} alt={dest.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute top-2.5 left-2.5">
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full gradient-glow text-white">{dest.tag}</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-white font-heading text-base font-bold">{dest.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <MapPin className="h-2.5 w-2.5 text-white/60" />
                  <span className="text-white/70 text-[11px]">{dest.country}</span>
                  <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400 ml-auto" />
                  <span className="text-white/80 text-[11px] font-medium">{dest.rating}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Nearby */}
      <div className="px-5 space-y-3 mt-6 pb-2">
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-glow" />
          <h2 className="font-heading text-[15px] font-semibold text-white">Near You</h2>
        </div>
        <div className="space-y-2">
          {NEARBY.map((item) => (
            <div key={item.name} className="flex items-center gap-3 rounded-xl p-2.5 cursor-pointer hover:bg-white/[0.03] transition-colors dark-card">
              <img src={item.image} alt={item.name} className="h-14 w-14 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-[13px]">{item.name}</p>
                <p className="text-dark-muted text-[11px] mt-0.5">{item.type} · {item.distance}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-glow text-[11px] font-bold">{item.price}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
