import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import WhatsNewModal from "@/components/WhatsNewModal";
import StoriesRow from "@/components/home/StoriesRow";
import NearbyStrip from "@/components/home/NearbyStrip";
import { useNavigate } from "react-router-dom";
import {
  Sparkles, MessageCircle, Bell, Search, Mic, Camera, ImageIcon, Paperclip,
} from "lucide-react";
import { toast } from "sonner";
import roavrLogo from "@/assets/roavr-logo.png";

const CANON = {
  unread: 3,
  hasNotifications: true,
};

const CALIFORNIA_IMG =
  "https://images.unsplash.com/photo-1506146332389-18140dc7b2fb?w=1200&q=80&auto=format&fit=crop";

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.user_metadata?.full_name?.split(" ")[0] || "Andre";
  const [aiInput, setAiInput] = useState("");
  const imageInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

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

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    toast.success(`${files.length} file${files.length > 1 ? "s" : ""} ready — opening capture`);
    navigate("/camera");
  };

  return (
    <div className="min-h-screen pb-6" style={{ background: "#080D1A" }}>
      <WhatsNewModal />

      {/* HEADER */}
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
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full" style={{ background: "#EF4444" }} />
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

      {/* GREETING */}
      <div className="px-5 pt-4">
        <h1 className="text-white" style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.5px", lineHeight: 1.1 }}>
          {greeting()}, {displayName} 👋
        </h1>
      </div>

      {/* 24h STORIES ROW */}
      <StoriesRow />

      {/* ASK ROAVR */}
      <section className="px-5 pt-6">
        <div className="rounded-[24px] p-5" style={{ background: "#111827", boxShadow: "0px 2px 8px rgba(0,0,0,0.4)" }}>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" style={{ color: "#3B82F6" }} strokeWidth={1.5} />
            <h2 className="text-white" style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.3px" }}>Ask Roavr</h2>
            <span className="rounded-full px-2.5 py-0.5 text-white" style={{ background: "#3B82F6", fontSize: 10, fontWeight: 700, letterSpacing: 0.4 }}>AI</span>
          </div>
          <p className="mt-2" style={{ color: "#94A3B8", fontSize: 14 }}>
            Plan, find, translate, compare, or solve any travel issue
          </p>
          <div className="mt-4 flex items-center gap-2.5 rounded-2xl px-3" style={{ background: "#1A2236", height: 48 }}>
            <Search className="h-[18px] w-[18px] shrink-0" style={{ color: "#94A3B8" }} strokeWidth={1.5} />
            <input
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAsk()}
              placeholder="Plan 5 days in Lisbon under $1500"
              className="flex-1 bg-transparent outline-none text-white"
              style={{ fontSize: 14 }}
            />
            <button onClick={handleAsk} aria-label="Voice" className="h-8 w-8 flex items-center justify-center active:scale-95 transition-transform">
              <Mic className="h-5 w-5" style={{ color: "#3B82F6" }} strokeWidth={1.5} />
            </button>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
            {["Plan a trip", "Find food nearby", "Translate menu"].map((q) => (
              <button
                key={q}
                onClick={() => setAiInput(q)}
                className="shrink-0 text-white"
                style={{ background: "#1A2236", border: "1px solid #1E2A3F", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}
              >
                {q}
              </button>
            ))}
          </div>

          {/* Upload row */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => navigate("/camera")}
              className="flex-1 flex items-center justify-center gap-1.5 text-white active:scale-[0.98] transition-transform"
              style={{ background: "#3B82F6", borderRadius: 12, height: 44, fontSize: 13, fontWeight: 600 }}
            >
              <Camera className="h-4 w-4" strokeWidth={1.5} /> Capture
            </button>
            <button
              onClick={() => imageInput.current?.click()}
              className="flex-1 flex items-center justify-center gap-1.5 text-white active:scale-[0.98] transition-transform"
              style={{ background: "#1A2236", border: "1px solid #1E2A3F", borderRadius: 12, height: 44, fontSize: 13, fontWeight: 600 }}
            >
              <ImageIcon className="h-4 w-4" strokeWidth={1.5} /> Image
            </button>
            <button
              onClick={() => fileInput.current?.click()}
              className="flex-1 flex items-center justify-center gap-1.5 text-white active:scale-[0.98] transition-transform"
              style={{ background: "#1A2236", border: "1px solid #1E2A3F", borderRadius: 12, height: 44, fontSize: 13, fontWeight: 600 }}
            >
              <Paperclip className="h-4 w-4" strokeWidth={1.5} /> File
            </button>
            <input ref={imageInput} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFiles} />
            <input ref={fileInput} type="file" multiple className="hidden" onChange={handleFiles} />
          </div>
        </div>
      </section>

      {/* RECENT TRIP — California */}
      <section className="px-5 pt-4">
        <button
          onClick={() => navigate("/trips")}
          className="relative w-full overflow-hidden text-left active:scale-[0.99] transition-transform"
          style={{ height: 160, borderRadius: 24 }}
        >
          <img src={CALIFORNIA_IMG} alt="Trip to California" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #080D1A 0%, rgba(8,13,26,0.85) 25%, rgba(8,13,26,0) 60%)" }} />
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center rounded-full text-white" style={{ background: "rgba(0,0,0,0.5)", padding: "4px 10px", fontSize: 12 }}>
              ✈️ RECENT TRIP
            </span>
          </div>
          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
            <div className="min-w-0">
              <p className="text-white" style={{ fontSize: 16, fontWeight: 600 }}>Trip to California</p>
              <p className="mt-0.5" style={{ color: "#94A3B8", fontSize: 12 }}>California · May 7</p>
            </div>
            <span className="shrink-0" style={{ color: "#3B82F6", fontSize: 14, fontWeight: 600 }}>Open Trip →</span>
          </div>
        </button>
      </section>

      {/* NEARBY STRIP (deals) */}
      <NearbyStrip />
    </div>
  );
}
