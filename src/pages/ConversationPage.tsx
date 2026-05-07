import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Send, Image, MapPin, Plane, Smile, MoreVertical,
  Camera, Paperclip, Globe, Shield, Flag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Message {
  id: string;
  sender_id: string;
  content: string | null;
  message_type: string;
  media_url: string | null;
  metadata: any;
  created_at: string;
  read_by: string[];
}

const REACTIONS = ["❤️", "😂", "😮", "👏", "🔥", "✈️"];

export default function ConversationPage() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [otherUser, setOtherUser] = useState<{ name: string; photo: string | null }>({ name: "Traveler", photo: null });
  const [loading, setLoading] = useState(true);
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && id) {
      loadMessages();
      loadOtherUser();
      const channel = supabase
        .channel(`messages-${id}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
          (payload) => { setMessages((prev) => [...prev, payload.new as Message]); }
        )
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [user, id]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadMessages = async () => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", id!)
      .order("created_at", { ascending: true });
    setMessages((data as Message[]) || []);
    setLoading(false);
  };

  const loadOtherUser = async () => {
    const { data: participants } = await supabase
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", id!)
      .neq("user_id", user!.id)
      .limit(1);
    if (participants && participants.length > 0) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, profile_photo")
        .eq("id", participants[0].user_id)
        .single();
      if (profile) setOtherUser({ name: profile.name || "Traveler", photo: profile.profile_photo });
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !user || !id) return;
    const content = input.trim();
    setInput("");
    await supabase.from("messages").insert({
      conversation_id: id,
      sender_id: user.id,
      content,
      message_type: "text",
      read_by: [user.id],
    });
    await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", id);
  };

  const addReaction = async (messageId: string, emoji: string) => {
    await supabase.from("message_reactions").upsert({
      message_id: messageId,
      user_id: user!.id,
      emoji,
    });
    setShowReactions(null);
    toast.success(`Reacted with ${emoji}`);
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderMessage = (msg: Message) => {
    const isMine = msg.sender_id === user?.id;
    const isRead = (msg.read_by || []).length > 1;

    return (
      <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"} mb-2 group`}>
        <div className="max-w-[75%]">
          <div
            className={`rounded-2xl px-3.5 py-2.5 relative ${
              isMine
                ? "gradient-accent text-white rounded-br-md"
                : "bg-card border border-border/40 text-foreground rounded-bl-md"
            }`}
            onDoubleClick={() => setShowReactions(msg.id)}
          >
            {msg.message_type === "image" && msg.media_url && (
              <img src={msg.media_url} className="rounded-xl mb-1.5 max-h-48 object-cover" />
            )}
            {msg.message_type === "trip_share" && (
              <div className={`rounded-lg p-2.5 mb-1.5 ${isMine ? "bg-white/15" : "bg-secondary"}`}>
                <div className="flex items-center gap-2">
                  <Plane className="h-4 w-4" />
                  <span className="text-[12px] font-semibold">{msg.metadata?.trip_title || "Shared Trip"}</span>
                </div>
                <p className="text-[11px] opacity-70 mt-0.5">{msg.metadata?.destination || ""}</p>
              </div>
            )}
            {msg.message_type === "map_pin" && (
              <div className={`rounded-lg p-2.5 mb-1.5 ${isMine ? "bg-white/15" : "bg-secondary"}`}>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span className="text-[12px] font-semibold">{msg.metadata?.location_name || "Map Pin"}</span>
                </div>
              </div>
            )}
            {msg.content && <p className="text-[13px] leading-relaxed">{msg.content}</p>}
          </div>
          <div className={`flex items-center gap-1 mt-0.5 ${isMine ? "justify-end" : "justify-start"}`}>
            <span className="text-[9px] text-muted-foreground">{formatTime(msg.created_at)}</span>
            {isMine && <span className="text-[9px] text-muted-foreground">{isRead ? "✓✓" : "✓"}</span>}
          </div>

          {showReactions === msg.id && (
            <div className={`flex gap-1.5 mt-1 p-1.5 rounded-xl bg-card border border-border/40 shadow-elevated animate-scale-in ${isMine ? "justify-end" : "justify-start"}`}>
              {REACTIONS.map((emoji) => (
                <button key={emoji} onClick={() => addReaction(msg.id, emoji)} className="text-lg hover:scale-125 transition-transform">
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="dark-immersive shrink-0 relative">
        <div className="absolute inset-0 gradient-dark-radial" />
        <div className="relative px-4 pt-12 pb-3 flex items-center gap-3">
          <button onClick={() => navigate("/messages")} className="text-dark-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/10 flex items-center justify-center overflow-hidden">
            {otherUser.photo ? (
              <img src={otherUser.photo} className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <span className="text-sm">👤</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-[14px] truncate">{otherUser.name}</p>
            <p className="text-dark-muted text-[10px]">Roavr traveler</p>
          </div>
          <button onClick={() => setShowMenu(!showMenu)} className="text-dark-muted p-1">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
        {showMenu && (
          <div className="absolute right-4 top-20 z-50 rounded-xl dark-card-elevated p-2 shadow-elevated animate-scale-in min-w-[160px]">
            {[
              { label: "View Profile", icon: Globe },
              { label: "Block User", icon: Shield },
              { label: "Report", icon: Flag },
            ].map((item) => (
              <button key={item.label} onClick={() => { setShowMenu(false); toast.info(`${item.label} — coming soon`); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-dark-muted hover:text-white transition-colors rounded-lg">
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3" onClick={() => { setShowReactions(null); setShowMenu(false); }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="h-5 w-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
            <div className="h-14 w-14 rounded-full bg-accent/8 flex items-center justify-center">
              <MessageCircle className="h-7 w-7 text-accent/50" />
            </div>
            <p className="text-[13px] text-muted-foreground max-w-[220px]">
              Start a conversation! Share trips, memories, and travel stories.
            </p>
          </div>
        ) : (
          messages.map(renderMessage)
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border/40 bg-card/98 backdrop-blur-xl px-3 py-2.5 safe-area-bottom">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/camera")} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center shrink-0">
            <Camera className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              className="w-full h-9 rounded-xl bg-secondary px-3.5 text-[13px] text-foreground placeholder:text-muted-foreground border-0 focus:outline-none focus:ring-1 focus:ring-accent/30"
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${
              input.trim() ? "gradient-accent glow-coral" : "bg-secondary"
            }`}
          >
            <Send className={`h-4 w-4 ${input.trim() ? "text-white" : "text-muted-foreground"}`} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Need to import MessageCircle for empty state
import { MessageCircle } from "lucide-react";
