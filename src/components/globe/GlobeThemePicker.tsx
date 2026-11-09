import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GLOBE_THEMES, CUSTOM_ID, type GlobePalette } from "@/lib/globe/themes";

interface Props {
  selectedId: string;
  palette: GlobePalette;
  onChange: (id: string, palette: GlobePalette) => void;
  disabled?: boolean;
}

/** Preset swatches + custom colour pickers for ocean, land and glow. */
export default function GlobeThemePicker({ selectedId, palette, onChange, disabled = false }: Props) {
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
            <Button
              key={t.id}
              type="button"
              variant="ghost"
              disabled={disabled}
              role="radio"
              aria-checked={active}
              onClick={() => onChange(t.id, t.palette)}
              className="h-auto px-1 py-1 shrink-0 flex flex-col items-center gap-1.5 hover:bg-transparent"
            >
              <span
                className={`relative h-12 w-12 rounded-full overflow-hidden transition-transform ${active ? "ring-2 ring-ring ring-offset-2 ring-offset-background" : ""}`}
                style={{
                  background: `radial-gradient(circle at 35% 35%, ${t.palette.land} 0 38%, ${t.palette.ocean} 39%)`,
                  transform: active ? "scale(1.06)" : "none",
                }}
              >
                <span className="absolute right-2 bottom-2 h-2.5 w-2.5 rounded-full" style={{ background: t.palette.glow }} />
                {active && <Check className="absolute inset-0 m-auto h-4 w-4 text-foreground" strokeWidth={1.5} />}
              </span>
              <span className={`text-[11px] ${active ? "text-foreground" : "text-muted-foreground"}`}>{t.name}</span>
            </Button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
        <span>Mix your own:</span>
        {([["ocean", "Water"], ["land", "Land"], ["glow", "Visited"]] as const).map(([k, label]) => (
          <label key={k} className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="color"
              disabled={disabled}
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
