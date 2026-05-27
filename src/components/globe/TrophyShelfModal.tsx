import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trophy, Lock, Sparkles } from "lucide-react";

export interface TrophyDef {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji glyph
  earned: boolean;
  earnedAt?: string;
  progress?: { current: number; total: number };
  tier: "bronze" | "silver" | "gold" | "platinum";
}

// Canonical trophy set — matches Roavr's 27 countries / 64 cities / 342 memories
export const TROPHIES: TrophyDef[] = [
  { id: "first-pin", name: "First Footprint", description: "Drop your first pin", icon: "📍", earned: true, earnedAt: "2024-03-12", tier: "bronze" },
  { id: "five-countries", name: "Wanderer", description: "Visit 5 countries", icon: "🧭", earned: true, earnedAt: "2024-06-08", tier: "bronze" },
  { id: "ten-countries", name: "Globetrotter", description: "Visit 10 countries", icon: "🌍", earned: true, earnedAt: "2024-09-21", tier: "silver" },
  { id: "twenty-five-countries", name: "Continental", description: "Visit 25 countries", icon: "🏔️", earned: true, earnedAt: "2025-08-04", tier: "gold" },
  { id: "fifty-cities", name: "City Hopper", description: "Visit 50 cities", icon: "🏙️", earned: true, earnedAt: "2025-04-17", tier: "silver" },
  { id: "italy-deep", name: "Dolce Vita", description: "Pin 5 cities in Italy", icon: "🇮🇹", earned: true, earnedAt: "2025-05-22", tier: "silver" },
  { id: "ocean-crosser", name: "Ocean Crosser", description: "Visit 3 continents", icon: "🌊", earned: true, earnedAt: "2025-01-30", tier: "silver" },
  { id: "sunrise-club", name: "Sunrise Club", description: "Capture a sunrise abroad", icon: "🌅", earned: true, earnedAt: "2025-06-11", tier: "bronze" },
  { id: "fifty-countries", name: "Half the World", description: "Visit 50 countries", icon: "🗺️", earned: false, progress: { current: 27, total: 50 }, tier: "gold" },
  { id: "hundred-cities", name: "Centurion", description: "Visit 100 cities", icon: "🏛️", earned: false, progress: { current: 64, total: 100 }, tier: "gold" },
  { id: "seven-continents", name: "Seven Seas", description: "Visit all 7 continents", icon: "🧊", earned: false, progress: { current: 5, total: 7 }, tier: "platinum" },
  { id: "thousand-memories", name: "Storyteller", description: "Capture 1,000 memories", icon: "📖", earned: false, progress: { current: 342, total: 1000 }, tier: "platinum" },
];

const TIER_COLOR: Record<TrophyDef["tier"], string> = {
  bronze: "#CD7F32",
  silver: "#C0C0C0",
  gold: "#F4A261",
  platinum: "#A78BFA",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TrophyShelfModal({ open, onOpenChange }: Props) {
  const earned = TROPHIES.filter(t => t.earned);
  const locked = TROPHIES.filter(t => !t.earned);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md p-0 border-0 overflow-hidden"
        style={{ background: "#111827", borderRadius: 24 }}
      >
        <DialogHeader className="px-5 pt-5 pb-3 text-left">
          <DialogTitle className="font-heading text-[22px] font-bold text-white tracking-tight flex items-center gap-2">
            <Trophy className="h-5 w-5" style={{ color: "#F4A261", strokeWidth: 1.8 }} />
            Trophy Shelf
          </DialogTitle>
          <p className="text-[13px] text-[#94A3B8] mt-1">
            {earned.length} of {TROPHIES.length} earned
          </p>
        </DialogHeader>

        <div className="px-5 pb-6 max-h-[70vh] overflow-y-auto">
          {/* Earned */}
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] mb-2.5 mt-1">
            Earned
          </p>
          <div className="grid grid-cols-3 gap-2.5 mb-5">
            {earned.map(t => (
              <TrophyTile key={t.id} trophy={t} />
            ))}
          </div>

          {/* Locked */}
          {locked.length > 0 && (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] mb-2.5">
                Locked
              </p>
              <div className="grid grid-cols-3 gap-2.5">
                {locked.map(t => (
                  <TrophyTile key={t.id} trophy={t} />
                ))}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TrophyTile({ trophy }: { trophy: TrophyDef }) {
  const ringColor = TIER_COLOR[trophy.tier];
  return (
    <div
      className="relative rounded-2xl p-3 flex flex-col items-center text-center"
      style={{
        background: trophy.earned ? "#1A2236" : "#0F1828",
        border: `1px solid ${trophy.earned ? "rgba(244,162,97,0.18)" : "#1E2A3F"}`,
      }}
    >
      {trophy.earned && (
        <div
          className="absolute -top-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center"
          style={{ background: ringColor }}
        >
          <Sparkles className="h-2.5 w-2.5 text-white" strokeWidth={2.5} />
        </div>
      )}
      <div
        className="h-12 w-12 rounded-full flex items-center justify-center mb-2"
        style={{
          background: trophy.earned
            ? `radial-gradient(circle, rgba(244,162,97,0.22), transparent 70%)`
            : "#111827",
          filter: trophy.earned ? "none" : "grayscale(1) opacity(0.45)",
        }}
      >
        <span className="text-[26px] leading-none">{trophy.icon}</span>
      </div>
      <p className="text-[11px] font-semibold text-white leading-tight">{trophy.name}</p>
      <p className="text-[9px] text-[#94A3B8] leading-tight mt-0.5 line-clamp-2">
        {trophy.description}
      </p>
      {!trophy.earned && trophy.progress && (
        <div className="w-full mt-1.5">
          <div className="h-1 rounded-full overflow-hidden" style={{ background: "#1E2A3F" }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, (trophy.progress.current / trophy.progress.total) * 100)}%`,
                background: ringColor,
              }}
            />
          </div>
          <p className="text-[9px] text-[#94A3B8] mt-1">
            {trophy.progress.current} / {trophy.progress.total}
          </p>
        </div>
      )}
      {trophy.earned && (
        <p className="text-[9px] font-semibold mt-1" style={{ color: ringColor }}>
          Unlocked
        </p>
      )}
      {!trophy.earned && !trophy.progress && (
        <Lock className="h-3 w-3 mt-1 text-[#4B5563]" strokeWidth={1.8} />
      )}
    </div>
  );
}
