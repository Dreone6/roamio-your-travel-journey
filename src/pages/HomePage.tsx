import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import WhatsNewModal from "@/components/WhatsNewModal";
import { useNavigate } from "react-router-dom";
import {
  MapPin, Sparkles, Globe, Shield,
  MessageCircle, Bell, Search, Heart, ChevronRight, Mic,
} from "lucide-react";
import roavrLogo from "@/assets/roavr-logo.png";

// Canonical data — locked
const CANON = {
  countries: 27,
  cities: 64,
  memories: 342,
  followers: 1200,
  following: 318,
  latestPin: "Positano, Italy · 2h ago",
  unread: 3,
  hasNotifications: true,
  safePassNeedsAttention: true,
};

const LATEST_THUMBS = [
  "https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=120&q=80", // Positano
  "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=120&q=80", // Paris
  "https://images.unsplash.com/photo-1493558103817-58b2924bce98?w=120&q=80", // Switzerland
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=120&q=80", // Beach
];

// California coastal — Big Sur / PCH
const CALIFORNIA_IMG =
  "https://images.unsplash.com/photo-1506146332389-18140dc7b2fb?w=1200&q=80&auto=format&fit=crop";

const NEARBY = [
  {
    tag: "OFFER",
    tagBg: "bg-[#3B82F6]",
    title: "Coastal Kitchen",
    sub: "20% off brunch · 0.4 mi",
    img: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80",
  },
  {
    tag: "TOUR",
    tagBg: "bg-[#10B981]",
    title: "Sunset Sailing",
    sub: "From $48 · Tonight",
    img: "https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=600&q=80",
  },
  {
    tag: "FOOD",
    tagBg: "bg-[#F59E0B]",
    title: "Sakura Ramen",
    sub: "4.8 ★ · 8 min walk",
    img: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80",
  },
  {
    tag: "FOOD",
    tagBg: "bg-[#F59E0B]",
    title: "Rooftop 360",
    sub: "Live DJ tonight",
    img: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&q=80",
  },
];

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.user_metadata?.full_name?.split(" ")[0] || "Andre";
  const [aiInput, setAiInput] = useState("");

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  };

  const handleAsk = () => {
    if (!aiInput.trim()) return;
    navigate(`/trips?ask=${encodeURIComponent(aiInput)}`);
  };

  return (
    <div className="min-h-screen pb-6" style={{ background: "#080D1A" }}>
      <WhatsNewModal />

      {/* === HEADER (40px) === */}
      <header className="px-5 pt-12 pb-2">
        <div className="h-10 flex items-center justify-between">
          <img src={roavrLogo} alt="Roavr" className="h-5 w-auto brightness-0 invert" />
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/notifications")}
              aria-label="Notifications"
              className="relative h-10 w-10 rounded-full flex items-center justify-center active:scale-95 transition-transform"
              style={{ background: "#111827" }}
            >
              <Bell className="h-[18px] w-[18px] text-white" strokeWidth={1.5} />
              {CANON.hasNotifications && (
                <span
                  className="absolute top-2 right-2 h-2 w-2 rounded-full"
                  style={{ background: "#EF4444" }}
                />
              )}
            </button>
            <button
              onClick={() => navigate("/messages")}
              aria-label="Messages"
              className="relative h-10 w-10 rounded-full flex items-center justify-center active:scale-95 transition-transform"
              style={{ background: "#111827" }}
            >
              <MessageCircle className="h-[18px] w-[18px] text-white" strokeWidth={1.5} />
              {CANON.unread > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                  style={{ background: "#EF4444", boxShadow: "0 0 0 2px #080D1A" }}
                >
                  {CANON.unread}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* === GREETING (Large Title) === */}
      <div className="px-5 pt-4">
        <h1
          className="text-white"
          style={{
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: "-0.5px",
            lineHeight: 1.1,
          }}
        >
          {greeting()}, {displayName} 👋
        </h1>
      </div>

      {/* === ASK ROAVR (HERO) === */}
      <section className="px-5 pt-6">
        <div
          className="rounded-[24px] p-5"
          style={{
            background: "#111827",
            boxShadow: "0px 2px 8px rgba(0,0,0,0.4)",
          }}
        >
          {/* Row 1 */}
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" style={{ color: "#3B82F6" }} strokeWidth={1.5} />
            <h2
              className="text-white"
              style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.3px" }}
            >
              Ask Roavr
            </h2>
            <span
              className="rounded-full px-2.5 py-0.5 text-white"
              style={{ background: "#3B82F6", fontSize: 10, fontWeight: 700, letterSpacing: 0.4 }}
            >
              AI
            </span>
          </div>

          {/* Row 2 */}
          <p
            className="mt-2"
            style={{ color: "#94A3B8", fontSize: 14, fontWeight: 400, letterSpacing: "0.1px" }}
          >
            Plan, find, translate, compare, or solve any travel issue
          </p>

          {/* Row 3 — Input */}
          <div
            className="mt-4 flex items-center gap-2.5 rounded-2xl px-3"
            style={{ background: "#1A2236", height: 48 }}
          >
            <Search className="h-[18px] w-[18px] shrink-0" style={{ color: "#94A3B8" }} strokeWidth={1.5} />
            <input
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAsk()}
              placeholder="Plan 5 days in Lisbon under $1500"
              className="flex-1 bg-transparent outline-none text-white"
              style={{ fontSize: 14 }}
            />
            <button
              onClick={handleAsk}
              aria-label="Voice"
              className="h-8 w-8 flex items-center justify-center active:scale-95 transition-transform"
            >
              <Mic className="h-5 w-5" style={{ color: "#3B82F6" }} strokeWidth={1.5} />
            </button>
          </div>

          {/* Row 4 — Chips */}
          <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
            {["Plan a trip", "Find food nearby", "Translate menu"].map((q) => (
              <button
                key={q}
                onClick={() => setAiInput(q)}
                className="shrink-0 text-white"
                style={{
                  background: "#1A2236",
                  border: "1px solid #1E2A3F",
                  borderRadius: 8,
                  padding: "8px 12px",
                  fontSize: 12,
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* === YOUR WORLD === */}
      <section className="px-5 pt-4">
        <button
          onClick={() => navigate("/globe")}
          className="w-full text-left rounded-[24px] p-5 active:scale-[0.99] transition-transform"
          style={{ background: "#111827", boxShadow: "0px 2px 8px rgba(0,0,0,0.4)" }}
        >
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5" style={{ color: "#3B82F6" }} strokeWidth={1.5} />
            <h3
              className="flex-1 text-white"
              style={{ fontSize: 16, fontWeight: 600 }}
            >
              Your World
            </h3>
            <ChevronRight className="h-5 w-5" style={{ color: "#94A3B8" }} strokeWidth={1.5} />
          </div>

          <p
            className="mt-2"
            style={{ color: "#94A3B8", fontSize: 12, letterSpacing: "0.2px" }}
          >
            {CANON.countries} countries · {CANON.cities} cities · {CANON.memories} memories
          </p>

          <div className="mt-4 flex items-center gap-3">
            <div className="flex">
              {LATEST_THUMBS.map((t, i) => (
                <img
                  key={i}
                  src={t}
                  alt=""
                  className="h-6 w-6 rounded-full object-cover"
                  style={{
                    border: "1.5px solid #FFFFFF",
                    marginLeft: i === 0 ? 0 : -8,
                  }}
                />
              ))}
            </div>
            <p
              className="flex-1 truncate"
              style={{ color: "#94A3B8", fontSize: 12, letterSpacing: "0.2px" }}
            >
              Latest Pin: {CANON.latestPin}
            </p>
          </div>
        </button>
      </section>

      {/* === CURRENT TRIP — California (Past) === */}
      <section className="px-5 pt-4">
        <button
          onClick={() => navigate("/trips")}
          className="relative w-full overflow-hidden text-left active:scale-[0.99] transition-transform"
          style={{ height: 160, borderRadius: 24 }}
        >
          <img
            src={CALIFORNIA_IMG}
            alt="Trip to California"
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Gradient overlay starting at 40% from bottom */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, #080D1A 0%, rgba(8,13,26,0.85) 25%, rgba(8,13,26,0) 60%)",
            }}
          />

          {/* Top-left chip */}
          <div className="absolute top-3 left-3">
            <span
              className="inline-flex items-center rounded-full text-white"
              style={{
                background: "rgba(0,0,0,0.5)",
                padding: "4px 10px",
                fontSize: 12,
                letterSpacing: "0.2px",
              }}
            >
              ✈️ RECENT TRIP
            </span>
          </div>

          {/* Bottom row */}
          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
            <div className="min-w-0">
              <p className="text-white" style={{ fontSize: 16, fontWeight: 600 }}>
                Trip to California
              </p>
              <p className="mt-0.5" style={{ color: "#94A3B8", fontSize: 12, letterSpacing: "0.2px" }}>
                California · May 7
              </p>
            </div>
            <span
              className="shrink-0"
              style={{ color: "#3B82F6", fontSize: 14, fontWeight: 600 }}
            >
              Open Trip →
            </span>
          </div>
        </button>
      </section>

      {/* === SAFEPASS ALERT (conditional) === */}
      {CANON.safePassNeedsAttention && (
        <section className="px-5 pt-4">
          <button
            onClick={() => navigate("/safety")}
            className="w-full flex items-center gap-3 active:scale-[0.99] transition-transform"
            style={{
              background: "#FFFFFF",
              borderLeft: "3px solid #F59E0B",
              borderRadius: 16,
              padding: 16,
            }}
          >
            <Shield className="h-5 w-5 shrink-0" style={{ color: "#F59E0B" }} strokeWidth={1.5} />
            <div className="flex-1 min-w-0 text-left">
              <p style={{ color: "#080D1A", fontSize: 16, fontWeight: 600 }}>SafePass</p>
              <p style={{ color: "#94A3B8", fontSize: 14, letterSpacing: "0.1px" }}>
                3 required items need attention
              </p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0" style={{ color: "#94A3B8" }} strokeWidth={1.5} />
          </button>
        </section>
      )}

      {/* === NEARBY TONIGHT === */}
      <section className="pt-6">
        <div className="px-5 flex items-center justify-between">
          <h2
            className="text-white"
            style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.3px" }}
          >
            🔥 Nearby Tonight
          </h2>
          <button
            onClick={() => navigate("/discover")}
            style={{ color: "#3B82F6", fontSize: 14, fontWeight: 600 }}
          >
            See all ›
          </button>
        </div>

        <div className="mt-4 flex gap-3 overflow-x-auto no-scrollbar pl-5 pr-5">
          {NEARBY.map((n) => (
            <button
              key={n.title}
              onClick={() => navigate("/discover")}
              className="shrink-0 relative overflow-hidden text-left active:scale-[0.98] transition-transform"
              style={{ width: 160, height: 180, borderRadius: 16 }}
            >
              <img
                src={n.img}
                alt={n.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 50%)",
                }}
              />

              {/* Top-left tag */}
              <span
                className={`absolute top-2 left-2 rounded-full text-white ${n.tagBg}`}
                style={{ padding: "3px 8px", fontSize: 12, fontWeight: 700, letterSpacing: "0.2px" }}
              >
                {n.tag}
              </span>

              {/* Top-right heart */}
              <button
                aria-label="Save"
                className="absolute top-2 right-2 h-7 w-7 rounded-full flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                <Heart className="h-5 w-5 text-white" strokeWidth={1.5} />
              </button>

              {/* Bottom-left text */}
              <div className="absolute bottom-2 left-2.5 right-2.5">
                <p
                  className="text-white truncate"
                  style={{ fontSize: 16, fontWeight: 600 }}
                >
                  {n.title}
                </p>
                <p
                  className="truncate mt-0.5"
                  style={{ color: "#94A3B8", fontSize: 12, letterSpacing: "0.2px" }}
                >
                  {n.sub}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
