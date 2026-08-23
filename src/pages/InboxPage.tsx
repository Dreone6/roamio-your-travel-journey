import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Search, Plus, MessageCircle, Lock, Shield, Timer, ChevronRight,
  Sparkles, Plane, MapPin, Globe, Image as ImageIcon, Video, Heart, Tag, UserPlus,
} from "lucide-react";
import { MOCK_USERS } from "@/data/mock/users";

interface ConversationPreview {
  id: string;
  title: string | null;
  type: string;
  encryption_mode: string;
  last_message_at: string;
  other_user_name: string;
  other_user_photo: string | null;
  last_message: string | null;
  last_type: string;
  unread: boolean;
  online: boolean;
}

const SUGGESTED = MOCK_USERS.slice(1, 6).map((u, i) => ({
  ...u,
  meta: ["In Lisbon now", "Just back from Bali", "Planning Tokyo", "Local · Barcelona", "27 countries"][i],
}));

export default function InboxPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"messages" | "requests">("messages");

  useEffect(() => {
    if (user) loadConversations();
  }, [user]);

  const loadConversations = async () => {
    const { data: participations } = await supabase
      .from("conversation_participants").select("conversation_id").eq("user_id", user!.id);

    if (!participations || participations.length === 0) { setLoading(false); return; }

    const convIds = participations.map((p: any) => p.conversation_id);
    const { data: convs } = await supabase
      .from("conversations").select("*").in("id", convIds).order("last_message_at", { ascending: false });

    const previews: ConversationPreview[] = [];
    for (const conv of convs || []) {
      const { data: participants } = await supabase
        .from("conversation_participants").select("user_id")
        .eq("conversation_id", conv.id).neq("user_id", user!.id).limit(1);

      let otherName = "Unknown"; let otherPhoto: string | null = null;
      if (participants && participants.length > 0) {
        const { data: profile } = await supabase
          .from("profiles").select("name, profile_photo").eq("id", participants[0].user_id).single();
        if (profile) { otherName = profile.name || "Traveler"; otherPhoto = profile.profile_photo; }
      }

      const { data: lastMsg } = await supabase
        .from("messages").select("content, message_type, sender_id, read_by, encrypted")
        .eq("conversation_id", conv.id).order("created_at", { ascending: false }).limit(1).single();

      const lastContent = lastMsg?.encrypted ? "Encrypted message" :
        lastMsg?.message_type === "image" ? "Photo" :
        lastMsg?.message_type === "video" ? "Video" :
        lastMsg?.message_type === "trip_share" ? "Shared a trip" :
        lastMsg?.message_type === "map_pin" ? "Shared a pin" :
        lastMsg?.message_type === "memory_share" ? "Shared a memory" :
        lastMsg?.message_type === "story_reply" ? "Replied to your story" :
        lastMsg?.message_type === "offer_share" ? "Shared an offer" :
        lastMsg?.message_type === "expert_share" ? "Shared a local expert" :
        lastMsg?.message_type === "public_globe" ? "Shared their globe" :
        lastMsg?.content || null;

      previews.push({
        id: conv.id, title: conv.title, type: conv.type,
        encryption_mode: (conv as any).encryption_mode || "standard",
        last_message_at: conv.last_message_at,
        other_user_name: conv.title || otherName,
        other_user_photo: otherPhoto,
        last_message: lastContent,
        last_type: lastMsg?.message_type || "text",
        unread: lastMsg ? !(lastMsg.read_by || []).includes(user!.id) && lastMsg.sender_id !== user!.id : false,
        online: Math.random() > 0.55, // placeholder presence
      });
    }
    setConversations(previews);
    setLoading(false);
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

  const filtered = conversations.filter((c) =>
    c.other_user_name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const unreadCount = conversations.filter((c) => c.unread).length;

  const lastTypeIcon = (type: string) => {
    const props = "h-3 w-3 text-electric shrink-0";
    if (type === "image") return <ImageIcon className={props} />;
    if (type === "video") return <Video className={props} />;
    if (type === "trip_share") return <Plane className={props} />;
    if (type === "map_pin") return <MapPin className={props} />;
    if (type === "memory_share") return <Heart className={props} />;
    if (type === "story_reply") return <Sparkles className={props} />;
    if (type === "public_globe") return <Globe className={props} />;
    if (type === "offer_share") return <Tag className={props} />;
    return null;
  };

  return (
    <div className="min-h-dvh pb-8 bg-background">
      {/* === HEADER (dark immersive) === */}
      <div className="dark-immersive relative overflow-hidden">
        <div className="absolute inset-0 gradient-dark-radial" />
        <div className="absolute -top-20 -right-10 w-56 h-56 rounded-full bg-electric/10 blur-3xl" />
        <div className="absolute -bottom-12 -left-12 w-44 h-44 rounded-full bg-primary/20 blur-3xl" />

        <div className="relative px-5 pt-12 pb-4">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate("/home")} className="h-9 w-9 rounded-full dark-card-elevated flex items-center justify-center">
              <ArrowLeft className="h-4 w-4 text-white/85" />
            </button>
            <div className="text-center">
              <h1 className="font-heading text-[18px] font-extrabold text-white tracking-tight leading-none">Messages</h1>
              <p className="text-white/55 text-[10px] mt-0.5 flex items-center justify-center gap-1">
                <Shield className="h-2.5 w-2.5 text-electric" /> Encrypted in transit & at rest
              </p>
            </div>
            <button
              onClick={() => navigate("/messages/new")}
              className="h-9 w-9 rounded-xl gradient-glow flex items-center justify-center glow-accent active:scale-95 transition-transform"
              aria-label="New message"
            >
              <Plus className="h-4 w-4 text-[hsl(var(--dark-bg))]" />
            </button>
          </div>

          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              type="text" placeholder="Search travelers, trips, places…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 rounded-xl pl-10 pr-4 text-[13px] text-white placeholder:text-white/40 border-0 focus:outline-none focus:ring-1 focus:ring-electric/40 dark-card-elevated"
            />
          </div>

          {/* Active travelers row */}
          <div className="mt-4 -mx-5 px-5 flex gap-3 overflow-x-auto no-scrollbar">
            <button
              onClick={() => navigate("/messages/new")}
              className="shrink-0 flex flex-col items-center gap-1.5 w-[58px]"
            >
              <div className="h-[54px] w-[54px] rounded-full border-2 border-dashed border-white/30 flex items-center justify-center">
                <Plus className="h-4 w-4 text-white/70" />
              </div>
              <p className="text-[10px] text-white/70 font-medium">New</p>
            </button>
            {SUGGESTED.slice(0, 6).map((u) => (
              <button
                key={u.id}
                onClick={() => navigate("/messages/new")}
                className="shrink-0 flex flex-col items-center gap-1.5 w-[58px] active:scale-95 transition-transform"
              >
                <div className="relative h-[54px] w-[54px] rounded-full p-[2px] bg-gradient-to-tr from-primary via-electric to-primary">
                  <img src={u.avatarUrl} alt={u.name} className="h-full w-full rounded-full object-cover border-2 border-[hsl(var(--dark-bg))]" />
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-[#22c55e] ring-2 ring-[hsl(var(--dark-bg))]" />
                </div>
                <p className="text-[10px] text-white/80 font-medium truncate max-w-full">{u.name.split(" ")[0]}</p>
              </button>
            ))}
          </div>

          {/* Tabs */}
          <div className="mt-4 flex gap-1 p-1 rounded-xl bg-white/5">
            {(["messages", "requests"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 rounded-lg text-[11.5px] font-bold capitalize transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === tab ? "bg-white text-[hsl(var(--dark-bg))]" : "text-white/60"
                }`}
              >
                {tab === "messages" ? "Inbox" : "Requests"}
                {tab === "messages" && unreadCount > 0 && (
                  <span className={`text-[9px] rounded-full px-1.5 py-0.5 font-extrabold ${activeTab === tab ? "bg-coral text-white" : "bg-coral/90 text-white"}`}>{unreadCount}</span>
                )}
                {tab === "requests" && (
                  <span className="text-[9px] rounded-full px-1.5 py-0.5 font-extrabold bg-white/15 text-white/70">2</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* === BODY === */}
      <div className="px-3 pt-3">
        {activeTab === "requests" ? (
          <div className="space-y-2">
            {SUGGESTED.slice(0, 2).map((u) => (
              <div key={u.id} className="rounded-2xl bg-card border border-border/50 p-3 flex items-center gap-3">
                <img src={u.avatarUrl} alt={u.name} className="h-11 w-11 rounded-full object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[13px] truncate">{u.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{u.meta} · wants to chat</p>
                </div>
                <button className="px-3 h-8 rounded-lg gradient-accent text-white text-[11px] font-bold">Accept</button>
                <button className="px-2 h-8 rounded-lg bg-secondary text-foreground/70 text-[11px] font-bold">Skip</button>
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground text-center pt-3">
              Only people you don't follow appear here.
            </p>
          </div>
        ) : loading ? (
          <div className="space-y-3 px-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                <div className="h-12 w-12 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 bg-muted rounded" />
                  <div className="h-2.5 w-40 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          // === PREMIUM EMPTY STATE ===
          <div className="px-2 pt-4 pb-10">
            <div className="rounded-2xl dark-immersive relative overflow-hidden p-5 text-center">
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-electric/15 blur-3xl" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-primary/25 blur-3xl" />
              <div className="relative">
                <div className="h-14 w-14 rounded-2xl gradient-glow mx-auto flex items-center justify-center glow-accent">
                  <MessageCircle className="h-6 w-6 text-[hsl(var(--dark-bg))]" />
                </div>
                <h3 className="mt-3 font-heading text-[18px] font-extrabold text-white tracking-tight">No messages yet</h3>
                <p className="text-white/65 text-[12px] mt-1 max-w-[260px] mx-auto leading-relaxed">
                  Start a conversation with a fellow traveler, share a trip, or reply to a story.
                </p>
                <button
                  onClick={() => navigate("/messages/new")}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 h-10 rounded-xl bg-white text-[hsl(var(--dark-bg))] text-[12px] font-bold active:scale-95 transition-transform"
                >
                  <Plus className="h-4 w-4" /> New message
                </button>
              </div>
            </div>

            {/* Suggested travelers */}
            <div className="mt-5">
              <div className="flex items-center justify-between px-1.5 mb-2">
                <h4 className="font-heading font-extrabold text-foreground text-[14px] flex items-center gap-1.5">
                  <UserPlus className="h-3.5 w-3.5 text-primary" /> Suggested travelers
                </h4>
                <button className="text-[11px] font-bold text-primary flex items-center gap-0.5">
                  See all <ChevronRight className="h-3 w-3" />
                </button>
              </div>
              <div className="space-y-1.5">
                {SUGGESTED.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => navigate("/messages/new")}
                    className="w-full rounded-2xl bg-card border border-border/40 p-3 flex items-center gap-3 hover:shadow-elevated active:scale-[0.99] transition-all text-left"
                  >
                    <div className="relative">
                      <img src={u.avatarUrl} alt={u.name} className="h-11 w-11 rounded-full object-cover" />
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-[#22c55e] ring-2 ring-card" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[13px] text-foreground truncate">{u.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{u.meta}</p>
                    </div>
                    <span className="px-2.5 h-7 rounded-lg gradient-accent text-white text-[10.5px] font-bold flex items-center">
                      Message
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          // === CONVERSATION LIST ===
          <div className="space-y-0.5">
            {filtered.map((conv) => (
              <button
                key={conv.id}
                onClick={() => navigate(`/messages/${conv.id}`)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-secondary/40 active:scale-[0.99] transition-all text-left"
              >
                <div className="relative shrink-0">
                  <div className={`h-12 w-12 rounded-full p-[2px] ${conv.unread ? "bg-gradient-to-tr from-primary via-electric to-primary" : "bg-transparent"}`}>
                    <div className="h-full w-full rounded-full bg-gradient-to-br from-primary/15 to-electric/10 flex items-center justify-center overflow-hidden border border-card">
                      {conv.other_user_photo ? (
                        <img src={conv.other_user_photo} alt={conv.other_user_name ?? "Traveler"} className="h-full w-full rounded-full object-cover" />
                      ) : (
                        <span className="text-lg">👤</span>
                      )}
                    </div>
                  </div>
                  {conv.online && (
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-[#22c55e] ring-2 ring-background" />
                  )}
                  {conv.encryption_mode === "private" && (
                    <div className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary flex items-center justify-center border-2 border-background">
                      <Lock className="h-2 w-2 text-white" />
                    </div>
                  )}
                  {conv.encryption_mode === "vanish" && (
                    <div className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-coral flex items-center justify-center border-2 border-background">
                      <Timer className="h-2 w-2 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className={`text-[13.5px] truncate ${conv.unread ? "font-extrabold text-foreground" : "font-semibold text-foreground"}`}>
                        {conv.other_user_name}
                      </p>
                      {conv.encryption_mode === "private" && (
                        <span className="inline-flex items-center gap-0.5 text-[8.5px] font-extrabold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                          <Lock className="h-2 w-2" /> Private
                        </span>
                      )}
                    </div>
                    <span className={`text-[10px] shrink-0 ${conv.unread ? "text-primary font-extrabold" : "text-muted-foreground"}`}>
                      {timeAgo(conv.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {lastTypeIcon(conv.last_type)}
                    <p className={`text-[12px] truncate ${conv.unread ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                      {conv.last_message || "Start a conversation"}
                    </p>
                    {conv.unread && (
                      <span className="ml-auto h-2 w-2 rounded-full bg-coral shrink-0" />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
