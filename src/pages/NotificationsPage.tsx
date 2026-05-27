import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Bell, MessageCircle, Heart, MapPin, Trophy, Globe,
  UserPlus, Plane, Eye, Camera, Check
} from "lucide-react";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
}

const ICON_MAP: Record<string, any> = {
  message: MessageCircle,
  story_reply: MessageCircle,
  story_reaction: Heart,
  story_view_milestone: Eye,
  friend_nearby: MapPin,
  memory_pinned: Globe,
  map_viewed: Eye,
  new_follower: UserPlus,
  trip_invite: Plane,
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadNotifications();
  }, [user]);

  const loadNotifications = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setNotifications((data as NotificationItem[]) || []);
    setLoading(false);
  };

  const markAllRead = async () => {
    await supabase.from("notifications").update({ read: true }).eq("user_id", user!.id).eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

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
              <h1 className="font-heading text-[22px] font-bold text-white tracking-tight">Notifications</h1>
            </div>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-glow text-[12px] font-bold flex items-center gap-1">
                <Check className="h-3 w-3" /> Mark all read
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 pt-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-32 bg-muted rounded" />
                  <div className="h-2.5 w-48 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="pt-8 text-center space-y-3">
            <div className="h-14 w-14 rounded-full bg-accent/8 flex items-center justify-center mx-auto">
              <Bell className="h-7 w-7 text-accent/50" />
            </div>
            <p className="font-heading text-lg font-bold text-foreground">All caught up!</p>
            <p className="text-[13px] text-muted-foreground max-w-[240px] mx-auto">
              You'll see notifications for messages, stories, followers, and travel updates here.
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {notifications.map((n) => {
              const Icon = ICON_MAP[n.type] || Bell;
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${n.read ? "" : "bg-accent/5"}`}
                >
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${n.read ? "bg-secondary" : "bg-accent/10"}`}>
                    <Icon className={`h-4 w-4 ${n.read ? "text-muted-foreground" : "text-accent"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[13px] ${n.read ? "text-foreground" : "text-foreground font-semibold"}`}>{n.title}</p>
                    {n.body && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                  </div>
                  <span className={`text-[10px] shrink-0 ${n.read ? "text-muted-foreground" : "text-accent font-bold"}`}>{timeAgo(n.created_at)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
