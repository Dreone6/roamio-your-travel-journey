import { Suspense, lazy, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Sparkles } from "lucide-react";

const InteractiveGlobe = lazy(() => import("@/components/globe/InteractiveGlobe"));

const ITINERARY_LINES = [
  { city: "Day 1 · Tokyo", sub: "Shibuya Crossing, Sushi Dai" },
  { city: "Day 2 · Kyoto", sub: "Fushimi Inari, tea ceremony" },
  { city: "Day 3 · Osaka", sub: "Dotonbori street food" },
  { city: "Day 4 · Hakone", sub: "Onsen + Mt. Fuji views" },
];

// Sample globe pins for screen 3 (premium feel)
const ONBOARDING_PINS = [
  { lat: 40.6281, lng: 14.4848, label: "Positano", category: "memory", recent: true },
  { lat: 35.6895, lng: 139.6917, label: "Tokyo", category: "memory" },
  { lat: 51.5074, lng: -0.1278, label: "London", category: "memory" },
  { lat: 31.6295, lng: -7.9811, label: "Marrakech", category: "memory" },
  { lat: 64.1466, lng: -21.9426, label: "Reykjavik", category: "memory" },
  { lat: 40.7128, lng: -74.0060, label: "New York", category: "memory" },
  { lat: 48.8566, lng: 2.3522, label: "Paris", category: "memory" },
  { lat: -33.8688, lng: 151.2093, label: "Sydney", category: "memory" },
];

const ONBOARDING_ARCS = [
  { from: { lat: 51.5074, lng: -0.1278 }, to: { lat: 40.6281, lng: 14.4848 } },
  { from: { lat: 40.6281, lng: 14.4848 }, to: { lat: 31.6295, lng: -7.9811 } },
  { from: { lat: 51.5074, lng: -0.1278 }, to: { lat: 35.6895, lng: 139.6917 } },
  { from: { lat: 40.7128, lng: -74.0060 }, to: { lat: 48.8566, lng: 2.3522 } },
];

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleFinish = async () => {
    if (!user) { navigate("/home", { replace: true }); return; }
    setSaving(true);
    await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
    navigate("/home", { replace: true });
  };

  const next = () => setStep(s => (s < 3 ? s + 1 : s));

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#080D1A" }}>
      <div className="flex-1 flex flex-col px-5 pt-10 pb-6">
        {step === 1 && <PlanScreen />}
        {step === 2 && <CaptureScreen />}
        {step === 3 && <MapScreen />}
      </div>

      {/* Bottom: dots + CTA */}
      <div className="px-5 pb-10 space-y-5">
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: s === step ? 28 : 8,
                background: s === step ? "#3B82F6" : "#1E2A3F",
              }}
            />
          ))}
        </div>

        {step < 3 ? (
          <button
            onClick={next}
            className="w-full rounded-full flex items-center justify-center gap-2 text-white font-semibold text-[14px]"
            style={{ background: "#3B82F6", height: 52 }}
          >
            Next <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </button>
        ) : (
          <div className="space-y-3">
            <button
              onClick={handleFinish}
              disabled={saving}
              className="w-full rounded-full flex items-center justify-center gap-2 text-white font-semibold text-[14px] disabled:opacity-60"
              style={{ background: "#3B82F6", height: 52 }}
            >
              {saving ? "Loading…" : "Start Exploring"}
            </button>
            <button
              onClick={() => navigate("/auth")}
              className="w-full text-center text-[14px]"
              style={{ color: "#94A3B8" }}
            >
              Already have an account? <span className="font-semibold" style={{ color: "#FFFFFF" }}>Sign in</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Screen 1: PLAN ──────────────────────────────────
function PlanScreen() {
  return (
    <div className="flex-1 flex flex-col items-center justify-between text-center">
      <div className="flex-1 flex items-center justify-center w-full relative py-6">
        {/* Soft blue ambient glow */}
        <div
          className="absolute"
          style={{
            width: 260, height: 260, borderRadius: "50%",
            background: "#3B82F6", opacity: 0.2, filter: "blur(80px)",
          }}
        />
        {/* Phone mockup */}
        <div
          className="relative overflow-hidden"
          style={{
            width: 220, height: 420, borderRadius: 32,
            background: "#111827", border: "8px solid #1A2236",
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          }}
        >
          {/* Phone notch */}
          <div
            className="absolute top-2 left-1/2 -translate-x-1/2 rounded-full"
            style={{ width: 60, height: 5, background: "#080D1A" }}
          />
          {/* Ask Roavr module */}
          <div className="pt-8 px-3">
            <div
              className="rounded-2xl p-3 text-left"
              style={{ background: "#1A2236", border: "1px solid #1E2A3F" }}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="h-3 w-3" style={{ color: "#3B82F6" }} strokeWidth={1.5} />
                <span className="text-[9px] font-semibold uppercase" style={{ color: "#3B82F6", letterSpacing: "0.06em" }}>
                  Ask Roavr
                </span>
              </div>
              <p className="text-[10px] text-white font-medium">7 days in Japan</p>
            </div>
            <div className="mt-2.5 space-y-2">
              {ITINERARY_LINES.map((line, i) => (
                <div
                  key={i}
                  className="rounded-xl p-2.5 text-left animate-in fade-in slide-in-from-bottom-1"
                  style={{
                    background: "#1A2236",
                    animationDelay: `${i * 350}ms`,
                    animationDuration: "500ms",
                    animationFillMode: "both",
                  }}
                >
                  <p className="text-[9px] font-semibold text-white">{line.city}</p>
                  <p className="text-[8px] mt-0.5" style={{ color: "#94A3B8" }}>{line.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2 space-y-3 max-w-[340px]">
        <h1 className="font-heading text-[32px] font-bold text-white tracking-tight leading-tight">
          Plan smarter trips
        </h1>
        <p className="text-[14px] leading-relaxed" style={{ color: "#94A3B8" }}>
          Ask Roavr for itineraries, restaurant picks, translations, and real-time travel help.
        </p>
      </div>
    </div>
  );
}

// ── Screen 2: CAPTURE ────────────────────────────────
function CaptureScreen() {
  const photos = [
    { url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=70", rotate: -8, x: -50, y: 0 },
    { url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=70", rotate: 4, x: 0, y: -20 },
    { url: "https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=400&q=70", rotate: 10, x: 50, y: 10 },
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-between text-center">
      <div className="flex-1 flex items-center justify-center w-full relative">
        <div className="relative" style={{ width: 280, height: 320 }}>
          {photos.map((p, i) => (
            <div
              key={i}
              className="absolute top-1/2 left-1/2 overflow-hidden bg-cover bg-center"
              style={{
                width: 180, height: 220, borderRadius: 16,
                border: "2px solid #FFFFFF",
                boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                backgroundImage: `url(${p.url})`,
                transform: `translate(calc(-50% + ${p.x}px), calc(-50% + ${p.y}px)) rotate(${p.rotate}deg)`,
                zIndex: i,
              }}
            />
          ))}
        </div>
      </div>

      <div className="mt-2 space-y-3 max-w-[340px]">
        <h1 className="font-heading text-[32px] font-bold text-white tracking-tight leading-tight">
          Capture every memory
        </h1>
        <p className="text-[14px] leading-relaxed" style={{ color: "#94A3B8" }}>
          Save photos, check-ins, and bookings in one organized place, tied to every trip.
        </p>
      </div>
    </div>
  );
}

// ── Screen 3: MAP YOUR WORLD ────────────────────────
function MapScreen() {
  const pins = useMemo(() => ONBOARDING_PINS, []);
  const arcs = useMemo(() => ONBOARDING_ARCS, []);

  return (
    <div className="flex-1 flex flex-col">
      {/* Globe — upper 55% */}
      <div className="relative" style={{ height: "55vh", maxHeight: 480 }}>
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at 50% 50%, #1E3A5F 0%, transparent 60%)",
            opacity: 0.25, filter: "blur(6px)",
          }}
        />
        <Suspense
          fallback={
            <div className="h-full flex items-center justify-center">
              <div className="h-12 w-12 rounded-full border-2 border-[#1E2A3F] border-t-[#3B82F6] animate-spin" />
            </div>
          }
        >
          <InteractiveGlobe pins={pins} arcs={arcs} autoRotate />
        </Suspense>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center mt-2 space-y-3 max-w-[340px] mx-auto">
        <h1 className="font-heading text-[32px] font-bold text-white tracking-tight leading-tight">
          Map your world
        </h1>
        <p className="text-[14px] leading-relaxed" style={{ color: "#94A3B8" }}>
          Watch your countries, cities, and memories come alive on your personal travel globe.
        </p>
      </div>
    </div>
  );
}
