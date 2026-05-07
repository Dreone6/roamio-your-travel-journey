import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Eye, Heart, MessageCircle, MapPin, Send, ChevronLeft, ChevronRight,
  X, Plus, Camera, Globe, Clock, Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/EmptyState";
import { toast } from "sonner";

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  caption: string | null;
  location_name: string | null;
  filter_name: string | null;
  visibility: string;
  view_count: number;
  created_at: string;
  expires_at: string;
  user_name?: string;
  user_photo?: string | null;
}

const MOCK_STORIES: Story[] = [
  { id: "1", user_id: "mock", media_url: "", media_type: "photo", caption: "Sunset in Santorini 🌅", location_name: "Santorini, Greece", filter_name: "cinematic", visibility: "public", view_count: 42, created_at: new Date(Date.now() - 3600000).toISOString(), expires_at: new Date(Date.now() + 72000000).toISOString(), user_name: "Sofia M.", user_photo: null },
  { id: "2", user_id: "mock2", media_url: "", media_type: "photo", caption: "Street food heaven 🍜", location_name: "Bangkok, Thailand", filter_name: "foodie", visibility: "public", view_count: 28, created_at: new Date(Date.now() - 7200000).toISOString(), expires_at: new Date(Date.now() + 64800000).toISOString(), user_name: "Marco R.", user_photo: null },
];

export default function StoriesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stories, setStories] = useState<Story[]>([]);
  const [myStories, setMyStories] = useState<Story[]>([]);
  const [viewingStory, setViewingStory] = useState<Story | null>(null);
  const [viewIndex, setViewIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"feed" | "mine">("feed");

  useEffect(() => {
    if (user) loadStories();
  }, [user]);

  const loadStories = async () => {
    const { data: myData } = await supabase
      .from("stories")
      .select("*")
      .eq("user_id", user!.id)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    setMyStories((myData as Story[]) || []);

    // For now, show mock + real stories
    const { data: publicData } = await supabase
      .from("stories")
      .select("*")
      .eq("visibility", "public")
      .gt("expires_at", new Date().toISOString())
      .neq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(20);

    const realStories = (publicData as Story[]) || [];
    setStories(realStories.length > 0 ? realStories : MOCK_STORIES);
    setLoading(false);
  };

  const hoursLeft = (expires: string) => {
    const h = Math.max(0, Math.floor((new Date(expires).getTime() - Date.now()) / 3600000));
    return `${h}h left`;
  };

  // Story viewer
  if (viewingStory) {
    const allStories = activeTab === "mine" ? myStories : stories;
    const current = allStories[viewIndex] || viewingStory;

    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col">
        {/* Progress bars */}
        <div className="flex gap-1 px-3 pt-12 pb-2">
          {allStories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 rounded-full bg-white/20 overflow-hidden">
              <div className={`h-full rounded-full bg-white transition-all duration-300 ${i < viewIndex ? "w-full" : i === viewIndex ? "w-1/2 animate-[grow_5s_linear]" : "w-0"}`} />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-500/20 flex items-center justify-center">
              <span className="text-xs">👤</span>
            </div>
            <div>
              <p className="text-white text-[12px] font-semibold">{current.user_name || "You"}</p>
              <p className="text-white/50 text-[10px]">{hoursLeft(current.expires_at)}</p>
            </div>
          </div>
          <button onClick={() => setViewingStory(null)} className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
            <X className="h-4 w-4 text-white" />
          </button>
        </div>

        {/* Story content */}
        <div className="flex-1 mx-4 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative overflow-hidden">
          <div className="text-center space-y-3 px-8">
            {current.location_name && (
              <div className="flex items-center justify-center gap-1.5 text-glow text-[11px] font-medium">
                <MapPin className="h-3 w-3" /> {current.location_name}
              </div>
            )}
            <p className="text-white text-lg font-heading font-bold">{current.caption || "Travel moment"}</p>
            {current.filter_name && (
              <span className="inline-block text-[9px] font-bold text-white/50 bg-white/10 rounded-full px-2 py-0.5">{current.filter_name}</span>
            )}
          </div>

          {/* Nav areas */}
          <button onClick={() => { if (viewIndex > 0) setViewIndex(viewIndex - 1); }} className="absolute left-0 top-0 bottom-0 w-1/3" />
          <button onClick={() => { if (viewIndex < allStories.length - 1) setViewIndex(viewIndex + 1); else setViewingStory(null); }} className="absolute right-0 top-0 bottom-0 w-1/3" />
        </div>

        {/* Bottom info */}
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-white/50 text-[11px]">
              <Eye className="h-3 w-3" /> {current.view_count}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => toast.success("❤️")} className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
              <Heart className="h-3.5 w-3.5 text-white" />
            </button>
            <button onClick={() => toast.info("Reply — coming soon")} className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
              <Send className="h-3.5 w-3.5 text-white" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      <div className="dark-immersive relative overflow-hidden">
        <div className="absolute inset-0 gradient-dark-radial" />
        <div className="relative px-5 pt-12 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <button onClick={() => navigate("/home")} className="text-dark-muted mb-1 flex items-center gap-1 text-[13px]">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <h1 className="font-heading text-[22px] font-bold text-white tracking-tight">Stories</h1>
            </div>
            <button onClick={() => navigate("/camera")} className="h-9 w-9 rounded-xl gradient-accent flex items-center justify-center glow-coral">
              <Camera className="h-4 w-4 text-white" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            {(["feed", "mine"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 rounded-lg text-[12px] font-bold capitalize ${activeTab === tab ? "gradient-glow text-white" : "text-dark-muted"}`}
              >
                {tab === "feed" ? "Friends" : "My Stories"} {tab === "mine" && myStories.length > 0 && (
                  <span className="ml-1 bg-accent text-white text-[9px] rounded-full px-1.5 py-0.5">{myStories.length}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 pt-4">
        {/* Story circles */}
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 no-scrollbar">
          {/* Add story */}
          <button onClick={() => navigate("/camera")} className="shrink-0 flex flex-col items-center gap-1.5">
            <div className="h-16 w-16 rounded-full border-2 border-dashed border-accent/40 flex items-center justify-center">
              <Plus className="h-5 w-5 text-accent" />
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground">Add</span>
          </button>
          {/* Story avatars */}
          {(activeTab === "mine" ? myStories : stories).map((s, i) => (
            <button
              key={s.id}
              onClick={() => { setViewingStory(s); setViewIndex(i); }}
              className="shrink-0 flex flex-col items-center gap-1.5"
            >
              <div className="h-16 w-16 rounded-full p-0.5 bg-gradient-to-br from-accent to-emerald-500">
                <div className="h-full w-full rounded-full bg-background flex items-center justify-center">
                  <span className="text-lg">👤</span>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-foreground max-w-[60px] truncate">{s.user_name || "You"}</span>
            </button>
          ))}
        </div>

        {/* Story cards */}
        {loading ? (
          <div className="grid grid-cols-2 gap-2.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : (activeTab === "mine" ? myStories : stories).length === 0 ? (
          <EmptyState
            icon={Camera}
            title={activeTab === "mine" ? "No stories yet" : "No stories from friends"}
            description={activeTab === "mine" ? "Capture a travel moment and share it as a story." : "Follow more travelers to see their stories here."}
            actionLabel="Open Camera"
            onAction={() => navigate("/camera")}
          />
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {(activeTab === "mine" ? myStories : stories).map((s, i) => (
              <button
                key={s.id}
                onClick={() => { setViewingStory(s); setViewIndex(i); }}
                className="aspect-[3/4] rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-black/40 backdrop-blur-md rounded-full px-2 py-0.5">
                  <Clock className="h-2.5 w-2.5 text-white/60" />
                  <span className="text-[9px] text-white/60 font-medium">{hoursLeft(s.expires_at)}</span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white text-[12px] font-semibold line-clamp-2">{s.caption || "Travel moment"}</p>
                  {s.location_name && (
                    <p className="text-white/60 text-[10px] mt-0.5 flex items-center gap-0.5">
                      <MapPin className="h-2.5 w-2.5" /> {s.location_name}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
