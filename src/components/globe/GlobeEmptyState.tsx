import { useNavigate } from "react-router-dom";
import { Globe, MapPin, Compass, Sparkles } from "lucide-react";

export default function GlobeEmptyState() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center space-y-6">
      {/* Animated globe placeholder */}
      <div className="relative">
        <div className="h-32 w-32 rounded-full bg-gradient-to-br from-emerald-500/10 to-teal-500/5 flex items-center justify-center animate-pulse">
          <Globe className="h-16 w-16 text-emerald-500/30" />
        </div>
        <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/10 flex items-center justify-center">
          <MapPin className="h-4 w-4 text-glow" />
        </div>
        <div className="absolute -bottom-1 -left-3 h-6 w-6 rounded-full bg-gradient-to-br from-teal-500/20 to-emerald-500/10 flex items-center justify-center">
          <Sparkles className="h-3 w-3 text-teal-400" />
        </div>
      </div>

      <div className="space-y-2 max-w-[260px]">
        <h3 className="font-heading text-xl font-bold text-white">Start filling your world.</h3>
        <p className="text-[12px] text-dark-muted leading-relaxed">
          Every trip, check-in, and memory becomes a pin on your personal globe. Begin your journey today.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => navigate("/camera")}
          className="flex items-center gap-2 rounded-xl gradient-glow px-5 py-2.5 text-[12px] font-bold text-white glow-accent"
        >
          <MapPin className="h-3.5 w-3.5" /> Check In
        </button>
        <button
          onClick={() => navigate("/trips")}
          className="flex items-center gap-2 rounded-xl dark-card-elevated px-5 py-2.5 text-[12px] font-bold text-white hover:bg-white/[0.06] transition-colors"
        >
          <Compass className="h-3.5 w-3.5 text-glow" /> Plan a Trip
        </button>
      </div>
    </div>
  );
}
