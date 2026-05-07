import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Search, Plus, MessageCircle, Lock, Shield, Timer,
} from "lucide-react";
import EmptyState from "@/components/EmptyState";

interface ConversationPreview {
  id: string;
  title: string | null;
  type: string;
  encryption_mode: string;
  last_message_at: string;
  other_user_name: string;
  other_user_photo: string | null;
  last_message: string | null;
  unread: boolean;
}

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
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", user!.id);

    if (!participations || participations.length === 0) {
      setLoading(false);
      return;
    }

    const convIds = participations.map((p: any) => p.conversation_id);
    const { data: convs } = await supabase
      .from("conversations")
      .select("*")
      .in("id", convIds)
      .order("last_message_at", { ascending: false });

    const previews: ConversationPreview[] = [];
    for (const conv of convs || []) {
      const { data: participants } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", conv.id)
        .neq("user_id", user!.id)
        .limit(1);

      let otherName = "Unknown";
      let otherPhoto: string | null = null;
      if (participants && participants.length > 0) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("name, profile_photo")
          .eq("id", participants[0].user_id)
          .single();
        if (profile) {
          otherName = profile.name || "Traveler";
          otherPhoto = profile.profile_photo;
        }
      }

      const { data: lastMsg } = await supabase
        .from("messages")
        .select("content, message_type, sender_id, read_by, encrypted")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      const lastContent = lastMsg?.encrypted ? "🔒 Encrypted message" :
        lastMsg?.message_type === "image" ? "📷 Photo" :
        lastMsg?.message_type === "video" ? "🎥 Video" :
        lastMsg?.message_type === "trip_share" ? "✈️ Shared a trip" :
        lastMsg?.message_type === "map_pin" ? "📍 Shared a pin" :
        lastMsg?.message_type === "memory_share" ? "🌍 Shared a memory" :
        lastMsg?.message_type === "story_reply" ? "💬 Story reply" :
        lastMsg?.content || null;

      previews.push({
        id: conv.id,
        title: conv.title,
        type: conv.type,
        encryption_mode: (conv as any).encryption_mode || "standard",
        last_message_at: conv.last_message_at,
        other_user_name: conv.title || otherName,
        other_user_photo: otherPhoto,
        last_message: lastContent,
        unread: lastMsg ? !(lastMsg.read_by || []).includes(user!.id) && lastMsg.sender_id !== user!.id : false,
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

  const EncryptionBadge = ({ mode }: { mode: string }) => {
    if (mode === "private") {
      return (
        <span className="inline-flex items-center gap-0.5 text-[8px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">
          <Lock className="h-2 w-2" /> E2E
        </span>
      );
    }
    if (mode === "vanish") {
      return (
        <span className="inline-flex items-center gap-0.5 text-[8px] font-bold uppercase tracking-wider text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">
          <Timer className="h-2 w-2" /> Vanish
        </span>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div className="dark-immersive relative overflow-hidden">
        <div className="absolute inset-0 gradient-dark-radial" />
        <div className="relative px-5 pt-12 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <button onClick={() => navigate("/home")} className="text-dark-muted mb-1 flex items-center gap-1 text-[13px]">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-2">
                <h1 className="font-heading text-[22px] font-bold text-white tracking-tight">Messages</h1>
                <Shield className="h-4 w-4 text-glow" />
              </div>
              <p className="text-dark-muted text-[10px] mt-0.5">Encrypted in transit · Encrypted at rest</p>
            </div>
            <button
              onClick={() => navigate("/messages/new")}
              className="h-9 w-9 rounded-xl gradient-glow flex items-center justify-center glow-accent"
            >
              <Plus className="h-4 w-4 text-white" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-muted" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 rounded-xl pl-10 pr-4 text-[13px] text-white placeholder:text-dark-muted border-0 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 dark-card-elevated"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-3">
            {(["messages", "requests"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 rounded-lg text-[12px] font-bold capitalize transition-all ${
                  activeTab === tab ? "gradient-glow text-white" : "text-dark-muted"
                }`}
              >
                {tab} {tab === "messages" && unreadCount > 0 && (
                  <span className="ml-1 bg-accent text-white text-[9px] rounded-full px-1.5 py-0.5">{unreadCount}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Conversations */}
      <div className="px-4 pt-3">
        {activeTab === "requests" ? (
          <div className="pt-8">
            <EmptyState
              icon={MessageCircle}
              title="No message requests"
              description="When someone you don't follow messages you, it will appear here."
            />
          </div>
        ) : loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
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
          <div className="pt-8">
            <EmptyState
              icon={MessageCircle}
              title="No messages yet"
              description="Start a conversation with a fellow traveler or message a friend."
              actionLabel="New Message"
              onAction={() => navigate("/messages/new")}
            />
          </div>
        ) : (
          <div className="space-y-0.5">
            {filtered.map((conv) => (
              <button
                key={conv.id}
                onClick={() => navigate(`/messages/${conv.id}`)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/30 transition-colors text-left"
              >
                <div className="relative">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-100 to-teal-50 flex items-center justify-center overflow-hidden shrink-0">
                    {conv.other_user_photo ? (
                      <img src={conv.other_user_photo} className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <span className="text-lg">👤</span>
                    )}
                  </div>
                  {conv.unread && (
                    <div className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full gradient-accent border-2 border-background" />
                  )}
                  {conv.encryption_mode === "private" && (
                    <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-background">
                      <Lock className="h-2 w-2 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className={`text-[13px] truncate ${conv.unread ? "font-bold text-foreground" : "font-semibold text-foreground"}`}>
                        {conv.other_user_name}
                      </p>
                      <EncryptionBadge mode={conv.encryption_mode} />
                    </div>
                    <span className={`text-[10px] shrink-0 ml-2 ${conv.unread ? "text-accent font-bold" : "text-muted-foreground"}`}>
                      {timeAgo(conv.last_message_at)}
                    </span>
                  </div>
                  <p className={`text-[12px] truncate mt-0.5 ${conv.unread ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {conv.last_message || "Start a conversation"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
