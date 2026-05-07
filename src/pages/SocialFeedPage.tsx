import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft, Heart, MessageCircle, MapPin, Trophy, Globe, Share2,
  Bookmark, MoreHorizontal, Camera, Sparkles, Users
} from "lucide-react";
import { toast } from "sonner";

interface FeedItem {
  id: string;
  type: "story" | "checkin" | "badge" | "trip" | "memory" | "globe";
  user: { name: string; photo: string | null };
  content: string;
  location?: string;
  time: string;
  likes: number;
  comments: number;
}

const MOCK_FEED: FeedItem[] = [
  { id: "1", type: "checkin", user: { name: "Sofia M.", photo: null }, content: "Just checked in at the Acropolis! The view from up here is unreal. 🏛️", location: "Athens, Greece", time: "2h", likes: 24, comments: 5 },
  { id: "2", type: "badge", user: { name: "Marco R.", photo: null }, content: "Earned the Globetrotter badge! 🌍 5 countries and counting.", time: "4h", likes: 38, comments: 12 },
  { id: "3", type: "trip", user: { name: "Aisha K.", photo: null }, content: "Just finished planning a 10-day Japan itinerary with Roavr AI! Tokyo → Kyoto → Osaka 🇯🇵", time: "6h", likes: 56, comments: 8 },
  { id: "4", type: "memory", user: { name: "James L.", photo: null }, content: "This memory from Bali just got pinned to my globe. Still can't believe that sunset. 🌅", location: "Bali, Indonesia", time: "8h", likes: 89, comments: 15 },
  { id: "5", type: "checkin", user: { name: "Elena V.", photo: null }, content: "Found the best hidden coffee shop in Lisbon's Alfama district. ☕️", location: "Lisbon, Portugal", time: "12h", likes: 31, comments: 7 },
];

const TYPE_ICON: Record<string, any> = {
  story: Camera,
  checkin: MapPin,
  badge: Trophy,
  trip: Sparkles,
  memory: Globe,
  globe: Globe,
};

export default function SocialFeedPage() {
  const navigate = useNavigate();
  const [feed] = useState<FeedItem[]>(MOCK_FEED);

  return (
    <div className="min-h-screen pb-8">
      <div className="dark-immersive relative overflow-hidden">
        <div className="absolute inset-0 gradient-dark-radial" />
        <div className="relative px-5 pt-12 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <button onClick={() => navigate("/home")} className="text-dark-muted mb-1 flex items-center gap-1 text-[13px]">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <h1 className="font-heading text-[22px] font-bold text-white tracking-tight">Feed</h1>
            </div>
            <div className="flex gap-2">
              <button onClick={() => navigate("/stories")} className="h-9 w-9 rounded-xl dark-card-elevated flex items-center justify-center">
                <Camera className="h-4 w-4 text-glow" />
              </button>
              <button onClick={() => navigate("/messages")} className="h-9 w-9 rounded-xl dark-card-elevated flex items-center justify-center">
                <MessageCircle className="h-4 w-4 text-glow" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Story bar */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex gap-3 overflow-x-auto no-scrollbar">
          <button onClick={() => navigate("/camera")} className="shrink-0 flex flex-col items-center gap-1">
            <div className="h-14 w-14 rounded-full border-2 border-dashed border-accent/40 flex items-center justify-center">
              <Camera className="h-4 w-4 text-accent" />
            </div>
            <span className="text-[9px] font-semibold text-muted-foreground">Add</span>
          </button>
          {["Sofia", "Marco", "Aisha", "James", "Elena"].map((name) => (
            <button key={name} onClick={() => navigate("/stories")} className="shrink-0 flex flex-col items-center gap-1">
              <div className="h-14 w-14 rounded-full p-0.5 bg-gradient-to-br from-accent to-emerald-500">
                <div className="h-full w-full rounded-full bg-background flex items-center justify-center">
                  <span className="text-sm">👤</span>
                </div>
              </div>
              <span className="text-[9px] font-semibold text-foreground">{name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className="px-4 space-y-3 pt-2">
        {feed.map((item) => {
          const TypeIcon = TYPE_ICON[item.type] || MapPin;
          return (
            <div key={item.id} className="rounded-2xl border border-border/40 bg-card overflow-hidden shadow-soft animate-fade-in">
              {/* Header */}
              <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-2">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-100 to-teal-50 flex items-center justify-center">
                  <span className="text-sm">👤</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-foreground">{item.user.name}</p>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <TypeIcon className="h-2.5 w-2.5" />
                    <span className="capitalize">{item.type === "checkin" ? "Check-in" : item.type}</span>
                    <span>·</span>
                    <span>{item.time}</span>
                  </div>
                </div>
                <button className="text-muted-foreground">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>

              {/* Content */}
              <div className="px-4 pb-3">
                <p className="text-[13px] text-foreground leading-relaxed">{item.content}</p>
                {item.location && (
                  <p className="text-[11px] text-accent font-medium mt-1.5 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {item.location}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center border-t border-border/30 px-4 py-2.5">
                <button onClick={() => toast.success("❤️ Liked!")} className="flex items-center gap-1.5 text-muted-foreground hover:text-accent transition-colors mr-4">
                  <Heart className="h-4 w-4" />
                  <span className="text-[11px] font-semibold">{item.likes}</span>
                </button>
                <button className="flex items-center gap-1.5 text-muted-foreground mr-4">
                  <MessageCircle className="h-4 w-4" />
                  <span className="text-[11px] font-semibold">{item.comments}</span>
                </button>
                <button onClick={() => toast.info("Shared!")} className="flex items-center gap-1.5 text-muted-foreground mr-4">
                  <Share2 className="h-4 w-4" />
                </button>
                <button onClick={() => toast.success("Saved!")} className="ml-auto text-muted-foreground">
                  <Bookmark className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
