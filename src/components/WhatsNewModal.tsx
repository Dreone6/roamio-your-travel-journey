import { useState, useEffect } from "react";
import { X, Sparkles, Globe } from "lucide-react";

const STORAGE_KEY = "roavr_whats_new_v3";

const FEATURES = [
  {
    title: "Ask Roavr",
    body: "Build a full itinerary in seconds. Just tell Roavr where you're going.",
    Icon: Sparkles,
    bg: "linear-gradient(135deg, #1A2236, #1E3A5F)",
  },
  {
    title: "Your World Globe",
    body: "Every check-in and memory mapped on your personal travel globe.",
    Icon: Globe,
    bg: "radial-gradient(circle at 35% 35%, #1E3A5F 0%, #0A1628 75%)",
  },
];

export default function WhatsNewModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      const t = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    setOpen(false);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={dismiss}
    >
      <div
        className="relative w-full animate-scale-in"
        style={{
          maxWidth: 340,
          background: "#111827",
          borderRadius: 24,
          padding: 24,
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dismiss */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 h-8 w-8 flex items-center justify-center"
          aria-label="Close"
        >
          <X className="h-5 w-5" style={{ color: "#94A3B8" }} strokeWidth={1.5} />
        </button>

        {/* Header card */}
        <div
          className="text-center"
          style={{ background: "#080D1A", borderRadius: 16, padding: 20 }}
        >
          <h2 className="font-heading text-[20px] font-semibold text-white tracking-tight">
            What's New in Roavr
          </h2>
          <p className="text-[14px] mt-1.5" style={{ color: "#94A3B8" }}>
            Your world, one trip at a time
          </p>
        </div>

        {/* Features (2 only) */}
        <div className="mt-5 space-y-4">
          {FEATURES.map(({ title, body, Icon, bg }) => (
            <div key={title} className="flex gap-3 items-start">
              <div
                className="shrink-0 flex items-center justify-center"
                style={{ width: 40, height: 40, borderRadius: 8, background: bg }}
              >
                <Icon className="h-5 w-5 text-white" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[16px] font-semibold text-white leading-tight">{title}</p>
                <p className="text-[14px] mt-1 leading-snug" style={{ color: "#94A3B8" }}>
                  {body}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={dismiss}
          className="w-full mt-6 rounded-full font-semibold text-white text-[14px]"
          style={{ background: "#3B82F6", height: 52 }}
        >
          See What's New
        </button>
      </div>
    </div>
  );
}
