import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useTravelIdentity } from "@/hooks/useTravelIdentity";
import WhatsNewModal from "@/components/WhatsNewModal";
import StoriesRow from "@/components/home/StoriesRow";
import NearbyStrip from "@/components/home/NearbyStrip";
import TravelFeed from "@/components/home/TravelFeed";
import { useNavigate } from "react-router-dom";
import {
  Sparkles, MessageCircle, Bell, Search, Mic, Camera, ImageIcon, Paperclip, Compass,
} from "lucide-react";
import { toast } from "sonner";
import roavrLogo from "@/assets/roavr-logo.png";

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const identity = useTravelIdentity();
  const displayName = (identity.name || user?.email?.split("@")[0] || "Traveler").split(" ")[0];
  const [aiInput, setAiInput] = useState("");
  const [unread, setUnread] = useState(0);
  const imageInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("conversation_participants")
        .select("conversation_id, last_read_at")
        .eq("user_id", user.id);
      if (cancelled || !data?.length) return;
      let count = 0;
      for (const p of data) {
        const q = supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", p.conversation_id)
          .neq("sender_id", user.id);
        const { count: c } = await (p.last_read_at ? q.gt("created_at", p.last_read_at) : q);
        count += c ?? 0;
      }
      if (!cancelled) setUnread(count);
    })().catch(() => { /* non-critical */ });
    return () => { cancelled = true; };
  }, [user]);

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
              {identity.unreadNotifications > 0 && (
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
              {unread > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                  style={{ background: "#EF4444", boxShadow: "0 0 0 2px #080D1A" }}
                >
                  {unread > 9 ? "9+" : unread}
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

      {/* BUILD MY WORLD — shown while the user has no travel data yet */}
      {!identity.loading && identity.isEmpty && (
        <section className="px-5 pt-4">
          <button
            onClick={() => navigate("/build-world")}
            className="w-full text-left p-5 active:scale-[0.99] transition-transform"
            style={{
              borderRadius: 24,
              background: "linear-gradient(135deg, rgba(59,130,246,0.18) 0%, #111827 65%)",
              border: "1px solid rgba(59,130,246,0.25)",
            }}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" style={{ color: "#3B82F6" }} strokeWidth={1.5} />
              <p className="text-white" style={{ fontSize: 16, fontWeight: 600 }}>Build My World</p>
            </div>
            <p className="mt-2" style={{ color: "#94A3B8", fontSize: 13, lineHeight: 1.4 }}>
              Turn the places you've been into a living map of your life — from the photos you already have.
            </p>
            <span className="inline-block mt-3" style={{ color: "#3B82F6", fontSize: 13, fontWeight: 600 }}>
              Start now →
            </span>
          </button>
        </section>
      )}

      {/* RECENT TRIP — real data, or an invitation to plan one */}
      <section className="px-5 pt-4">

        {identity.recentTrip ? (
          <button
            onClick={() => navigate(`/trips?trip=${identity.recentTrip!.id}`)}
            className="relative w-full overflow-hidden text-left active:scale-[0.99] transition-transform"
            style={{ height: 160, borderRadius: 24, background: "#111827" }}
          >
            {identity.recentTrip.coverPhoto && (
              <img
                src={identity.recentTrip.coverPhoto}
                alt={identity.recentTrip.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #080D1A 0%, rgba(8,13,26,0.85) 25%, rgba(8,13,26,0) 60%)" }} />
            <div className="absolute top-3 left-3">
              <span className="inline-flex items-center rounded-full text-white" style={{ background: "rgba(0,0,0,0.5)", padding: "4px 10px", fontSize: 12 }}>
                ✈️ RECENT TRIP
              </span>
            </div>
            <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
              <div className="min-w-0">
                <p className="text-white truncate" style={{ fontSize: 16, fontWeight: 600 }}>{identity.recentTrip.title}</p>
                <p className="mt-0.5 truncate" style={{ color: "#94A3B8", fontSize: 12 }}>
                  {identity.recentTrip.destination}
                  {identity.recentTrip.startDate
                    ? ` · ${new Date(identity.recentTrip.startDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                    : ` · ${identity.recentTrip.status}`}
                </p>
              </div>
              <span className="shrink-0" style={{ color: "#3B82F6", fontSize: 14, fontWeight: 600 }}>Open Trip →</span>
            </div>
          </button>
        ) : identity.loading ? (
          <div className="w-full animate-pulse" style={{ height: 160, borderRadius: 24, background: "#111827" }} />
        ) : (
          <button
            onClick={() => navigate("/trips")}
            className="w-full text-left p-5 active:scale-[0.99] transition-transform"
            style={{ borderRadius: 24, background: "#111827", boxShadow: "0px 2px 8px rgba(0,0,0,0.4)" }}
          >
            <div className="flex items-center gap-2">
              <Compass className="h-5 w-5" style={{ color: "#3B82F6" }} strokeWidth={1.5} />
              <p className="text-white" style={{ fontSize: 16, fontWeight: 600 }}>No trips yet</p>
            </div>
            <p className="mt-2" style={{ color: "#94A3B8", fontSize: 14 }}>
              Plan your first trip and it'll show up here.
            </p>
            <span className="inline-block mt-3" style={{ color: "#3B82F6", fontSize: 14, fontWeight: 600 }}>Plan a trip →</span>
          </button>
        )}
      </section>


      {/* TRAVEL FEED — people you follow, ranked by travel relevance */}
      <TravelFeed />

      {/* NEARBY STRIP (deals) */}
      <NearbyStrip />
    </div>
  );
}
