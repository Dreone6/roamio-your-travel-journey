import type { GlobeStats } from "@/data/types";

const REGIONS = [
  { name: "Europe", countries: 44, flag: "🇪🇺" },
  { name: "Asia", countries: 49, flag: "🌏" },
  { name: "Africa", countries: 54, flag: "🌍" },
  { name: "North America", countries: 23, flag: "🌎" },
  { name: "South America", countries: 12, flag: "🌎" },
  { name: "Oceania", countries: 14, flag: "🌏" },
];

// Mock: visited count per continent for the current user
const VISITED_BY_REGION: Record<string, number> = {
  "Europe": 12,
  "Asia": 6,
  "Africa": 1,
  "North America": 3,
  "South America": 2,
  "Oceania": 3,
};

export default function CountryProgress() {
  return (
    <div className="space-y-2.5">
      <h3 className="text-[13px] font-bold text-white flex items-center gap-2">
        <span>🗺️</span> Country Completion
      </h3>
      <div className="space-y-2">
        {REGIONS.map((region) => {
          const visited = VISITED_BY_REGION[region.name] || 0;
          const pct = Math.round((visited / region.countries) * 100);
          return (
            <div key={region.name} className="dark-card rounded-xl px-3.5 py-2.5 hover:bg-white/[0.04] transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{region.flag}</span>
                  <span className="text-[11px] font-semibold text-white">{region.name}</span>
                </div>
                <span className="text-[10px] font-bold text-glow">{visited}/{region.countries}</span>
              </div>
              <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    background: pct > 50
                      ? "linear-gradient(90deg, #10b981, #2dd4bf)"
                      : pct > 20
                        ? "linear-gradient(90deg, #3b82f6, #8b5cf6)"
                        : "linear-gradient(90deg, #6366f1, #a78bfa)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
