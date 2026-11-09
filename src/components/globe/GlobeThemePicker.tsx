import { Check } from "lucide-react";
import { GLOBE_THEMES, CUSTOM_ID, type GlobePalette } from "@/lib/globe/themes";

interface Props {
  selectedId: string;
  palette: GlobePalette;
  onChange: (id: string, palette: GlobePalette) => void;
}

/** Preset swatches + custom colour pickers for ocean, land and glow. */
export default function GlobeThemePicker({ selectedId, palette, onChange }: Props) {
  const setCustom = (key: keyof GlobePalette, value: string) => {
    const next = { ...palette, [key]: value };
    if (key === "glow") next.arc = value;
    if (key === "ocean") next.backdrop = value;
    onChange(CUSTOM_ID, next);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1" role="radiogroup" aria-label="Globe theme">
        {GLOBE_THEMES.map((t) => {
          const active = t.id === selectedId;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(t.id, t.palette)}
              className="shrink-0 flex flex-col items-center gap-1.5"
            >
              <span
                className="relative h-12 w-12 rounded-full overflow-hidden transition-transform"
                style={{
                  background: `radial-gradient(circle at 35% 35%, ${t.palette.land} 0 38%, ${t.palette.ocean} 39%)`,
                  boxShadow: active ? `0 0 0 2px #080D1A, 0 0 0 4px ${t.palette.glow}` : "none",
                  transform: active ? "scale(1.06)" : "none",
                }}
              >
                <span className="absolute right-2 bottom-2 h-2.5 w-2.5 rounded-full" style={{ background: t.palette.glow }} />
                {active && <Check className="absolute inset-0 m-auto h-4 w-4 text-white" strokeWidth={2} />}
              </span>
              <span className="text-[11px]" style={{ color: active ? "#FFFFFF" : "#94A3B8" }}>{t.name}</span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-3 text-[12px]" style={{ color: "#94A3B8" }}>
        <span>Mix your own:</span>
        {([["ocean", "Water"], ["land", "Land"], ["glow", "Visited"]] as const).map(([k, label]) => (
          <label key={k} className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="color"
              value={palette[k]}
              onChange={(e) => setCustom(k, e.target.value)}
              aria-label={`${label} colour`}
              className="h-6 w-6 rounded-full border-0 bg-transparent p-0 cursor-pointer"
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
}
