import type { GlobeStats } from "@/data/types";
import { Globe, MapPin, Camera, Bookmark, Map } from "lucide-react";

interface GlobeStatsBarProps {
  stats: GlobeStats;
}

export default function GlobeStatsBar({ stats }: GlobeStatsBarProps) {
  const worldPercent = Math.min(100, Math.round((stats.totalCountries / 195) * 100));

  const items = [
    { icon: Globe, value: stats.totalCountries, label: "Countries" },
    { icon: Map, value: stats.totalCities, label: "Cities" },
    { icon: MapPin, value: stats.totalCheckins, label: "Check-ins" },
    { icon: Camera, value: stats.totalMemories, label: "Memories" },
    { icon: Bookmark, value: stats.totalPins, label: "Pins" },
  ];

  return (
    <div className="space-y-3">
      {/* World progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-dark-muted uppercase tracking-wider">World explored</span>
            <span className="text-[11px] font-bold text-glow">{worldPercent}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-1000"
              style={{ width: `${worldPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-5 gap-1.5">
        {items.map(({ icon: Icon, value, label }) => (
          <div key={label} className="rounded-xl p-2.5 text-center dark-card group hover:bg-white/[0.04] transition-colors">
            <Icon className="h-3.5 w-3.5 text-glow mx-auto mb-1 opacity-60 group-hover:opacity-100 transition-opacity" />
            <p className="font-heading font-bold text-[15px] text-white leading-none">{value}</p>
            <p className="text-[8px] text-dark-muted mt-0.5 uppercase tracking-wider">{label}</p>
          </div>
        ))}
      </div>

      {/* Travel score */}
      <div className="flex items-center justify-between dark-card rounded-xl px-4 py-3">
        <div>
          <p className="text-[10px] font-bold text-dark-muted uppercase tracking-wider">Travel Score</p>
          <p className="text-[11px] text-dark-muted mt-0.5">Top continent: {stats.topContinent}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative h-12 w-12">
            <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
              <path
                d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="hsl(225 22% 13%)"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="url(#globe-score-gradient)"
                strokeWidth="3"
                strokeDasharray={`${stats.travelScore}, 100`}
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="globe-score-gradient">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#2dd4bf" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-heading font-bold text-sm text-white">{stats.travelScore}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
