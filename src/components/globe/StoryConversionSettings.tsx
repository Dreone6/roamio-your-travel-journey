import { Camera, Settings, ChevronRight } from "lucide-react";

interface StoryConversionSettingsProps {
  mode: "auto" | "ask" | "never";
  onChange: (mode: "auto" | "ask" | "never") => void;
}

const OPTIONS: { value: "auto" | "ask" | "never"; label: string; desc: string }[] = [
  { value: "auto", label: "Auto Save", desc: "Expired stories automatically become memory pins" },
  { value: "ask", label: "Ask Me", desc: "Get a prompt before saving expired stories" },
  { value: "never", label: "Never Save", desc: "Expired stories disappear permanently" },
];

export default function StoryConversionSettings({ mode, onChange }: StoryConversionSettingsProps) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <Camera className="h-4 w-4 text-glow" />
        <h3 className="text-[13px] font-bold text-white">Story → Memory Conversion</h3>
      </div>
      <div className="space-y-1.5">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`w-full dark-card rounded-xl p-3 flex items-center gap-3 transition-all ${
              mode === opt.value ? "ring-1 ring-emerald-500/30 bg-emerald-500/[0.04]" : "hover:bg-white/[0.03]"
            }`}
          >
            <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
              mode === opt.value ? "border-emerald-500" : "border-white/20"
            }`}>
              {mode === opt.value && <div className="h-2 w-2 rounded-full bg-emerald-500" />}
            </div>
            <div className="text-left flex-1">
              <p className="text-[12px] font-semibold text-white">{opt.label}</p>
              <p className="text-[10px] text-dark-muted">{opt.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
