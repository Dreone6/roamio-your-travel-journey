import { useState } from "react";
import { Search, Sparkles, MapPin, Star, ArrowRight, Compass, TrendingUp } from "lucide-react";

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
  { name: "Local Food Tour", type: "Experience", distance: "2.3 mi", image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80" },
  { name: "Sunset Rooftop Bar", type: "Nightlife", distance: "0.8 mi", image: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=400&q=80" },
  { name: "Historic Walking Tour", type: "Culture", distance: "1.5 mi", image: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=400&q=80" },
];

export default function DiscoverPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="dark-immersive min-h-screen pb-24">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-dark-radial" />
        <div className="absolute top-10 right-0 w-72 h-72 rounded-full bg-gradient-to-br from-emerald-500/10 to-teal-500/5 blur-3xl" />
        
        <div className="relative px-5 pt-12 pb-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-muted text-xs font-semibold tracking-widest uppercase">Explore</p>
              <h1 className="font-heading text-3xl font-bold text-white tracking-tight mt-1">
                Discover<br /><span className="text-glow italic">New Places</span>
              </h1>
            </div>
            <div className="h-10 w-10 rounded-full dark-card-elevated flex items-center justify-center">
              <Compass className="h-5 w-5 text-glow" />
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-muted" />
            <input
              type="text"
              placeholder="Search cities, activities, or experiences..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 rounded-2xl dark-card-elevated pl-11 pr-4 text-sm text-white placeholder:text-dark-muted border-0 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
              style={{ background: 'hsl(220 25% 12%)' }}
            />
          </div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                  activeCategory === cat
                    ? "gradient-glow text-white"
                    : "text-dark-muted hover:text-white"
                }`}
                style={activeCategory !== cat ? { background: 'hsl(220 25% 12%)' } : {}}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* AI Picks */}
      <div className="px-5 space-y-4 mt-2">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-glow" /> AI Picks for You
          </h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-5 px-5">
          {AI_PICKS.map((dest) => (
            <div key={dest.name} className="shrink-0 w-72 rounded-2xl overflow-hidden relative group cursor-pointer">
              <img src={dest.image} alt={dest.name} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p className="text-white font-heading text-xl font-bold">{dest.name}</p>
                <p className="text-emerald-300 text-xs font-medium mt-0.5">{dest.reason}</p>
              </div>
              <div className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
                <ArrowRight className="h-4 w-4 text-white" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Featured Destinations */}
      <div className="px-5 space-y-4 mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-white flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-glow" /> Trending Destinations
          </h2>
          <button className="text-xs text-glow font-medium flex items-center gap-1">
            See All <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {FEATURED_DESTINATIONS.map((dest, i) => (
            <div
              key={dest.name}
              className={`rounded-2xl overflow-hidden relative group cursor-pointer ${i === 0 ? "col-span-2 h-52" : "h-40"}`}
            >
              <img src={dest.image} alt={dest.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute top-3 left-3">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full gradient-glow text-white">{dest.tag}</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-3.5">
                <p className="text-white font-heading text-lg font-bold">{dest.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <MapPin className="h-3 w-3 text-white/60" />
                  <span className="text-white/70 text-xs">{dest.country}</span>
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400 ml-auto" />
                  <span className="text-white/80 text-xs font-medium">{dest.rating}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Nearby Experiences */}
      <div className="px-5 space-y-4 mt-8">
        <h2 className="font-heading text-lg font-semibold text-white flex items-center gap-2">
          <MapPin className="h-4 w-4 text-glow" /> Near You
        </h2>
        <div className="space-y-3">
          {NEARBY.map((item) => (
            <div key={item.name} className="flex items-center gap-4 rounded-2xl p-3 cursor-pointer hover:bg-white/5 transition-colors" style={{ background: 'hsl(220 25% 10%)' }}>
              <img src={item.image} alt={item.name} className="h-16 w-16 rounded-xl object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm">{item.name}</p>
                <p className="text-dark-muted text-xs mt-0.5">{item.type}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-glow text-xs font-medium">{item.distance}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
