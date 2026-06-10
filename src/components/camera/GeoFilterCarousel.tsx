import { useEffect, useState } from "react";
import { MapPin, Sparkles } from "lucide-react";
import { resolveGeoFilters, type GeoFilter } from "@/lib/geoFilters";

interface Props {
  city: string | null;
  selectedId: string | null;
  onSelect: (filter: GeoFilter | null) => void;
}

export default function GeoFilterCarousel({ city, selectedId, onSelect }: Props) {
  const [filters, setFilters] = useState<GeoFilter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    resolveGeoFilters(city).then((res) => {
      if (!cancelled) {
        setFilters(res);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [city]);

  return (
    <div className="px-5 py-3">
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="h-4 w-4" style={{ color: "#3B82F6" }} strokeWidth={1.5} />
        <p className="text-white" style={{ fontSize: 13, fontWeight: 600 }}>
          {city ? `Geo Filters · ${city}` : "Geo Filters"}
        </p>
        {loading && <Sparkles className="h-3.5 w-3.5 animate-pulse" style={{ color: "#94A3B8" }} />}
      </div>
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
        {/* None */}
        <button
          onClick={() => onSelect(null)}
          className="shrink-0 flex flex-col items-center gap-1.5"
        >
          <div
            className="h-[60px] w-[60px] rounded-2xl flex items-center justify-center"
            style={{
              background: "#1A2236",
              border: selectedId === null ? "2px solid #3B82F6" : "1px solid #1E2A3F",
            }}
          >
            <span className="text-white text-xl">∅</span>
          </div>
          <span className="text-[10px] text-white">None</span>
        </button>

        {filters.map(f => {
          const active = selectedId === f.id;
          return (
            <button
              key={f.id}
              onClick={() => onSelect(f)}
              className="shrink-0 flex flex-col items-center gap-1.5"
            >
              <div
                className="h-[60px] w-[60px] rounded-2xl flex items-center justify-center relative overflow-hidden"
                style={{
                  background: f.accent,
                  border: active ? "2px solid #3B82F6" : "1px solid #1E2A3F",
                }}
              >
                <span className="text-2xl">{f.emoji}</span>
                {f.source === "ai" && (
                  <span
                    className="absolute top-0.5 right-0.5 rounded-full text-white"
                    style={{ background: "#F4A261", padding: "1px 4px", fontSize: 7, fontWeight: 700 }}
                  >
                    AI
                  </span>
                )}
              </div>
              <span className="text-[10px] text-white truncate max-w-[68px]">{f.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Renders the selected filter as an overlay on a photo preview */
export function GeoFilterOverlay({ filter }: { filter: GeoFilter }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {filter.topText && (
        <div className="absolute top-6 left-0 right-0 flex justify-center">
          <div
            className="px-4 py-1.5 rounded-full text-white text-center"
            style={{
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.15em",
            }}
          >
            <span className="mr-2">{filter.emoji}</span>
            {filter.topText}
          </div>
        </div>
      )}
      {filter.bottomText && (
        <div className="absolute bottom-8 left-0 right-0 flex justify-center">
          <div
            className="px-4 py-1.5 rounded-full text-white"
            style={{
              background: filter.accent,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.2em",
            }}
          >
            {filter.bottomText}
          </div>
        </div>
      )}
      {!filter.topText && !filter.bottomText && (
        <div className="absolute top-8 right-8">
          <span className="text-5xl drop-shadow-lg">{filter.emoji}</span>
        </div>
      )}
    </div>
  );
}
