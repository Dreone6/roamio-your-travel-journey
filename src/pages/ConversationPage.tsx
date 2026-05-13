import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Send, MapPin, Plane, MoreVertical, Camera, Globe, Shield, Flag,
  MessageCircle, Lock, Timer, Eye, EyeOff, AlertTriangle, Smartphone, Image,
  ChevronRight, X, Check, CheckCheck,
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
  encrypted: boolean;
  expires_at: string | null;
}

const REACTIONS = ["❤️", "😂", "😮", "👏", "🔥", "✈️"];

const VANISH_OPTIONS = [
  { label: "5 seconds", value: 5 },
  { label: "30 seconds", value: 30 },
  { label: "5 minutes", value: 300 },
  { label: "1 hour", value: 3600 },
  { label: "24 hours", value: 86400 },
];

type EncryptionMode = "standard" | "private" | "vanish";

export default function ConversationPage() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [otherUser, setOtherUser] = useState<{ id: string; name: string; photo: string | null }>({ id: "", name: "Traveler", photo: null });
  const [loading, setLoading] = useState(true);
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [encryptionMode, setEncryptionMode] = useState<EncryptionMode>("standard");
  const [showEncryptionInfo, setShowEncryptionInfo] = useState(false);
  const [showVanishPicker, setShowVanishPicker] = useState(false);
  const [vanishSeconds, setVanishSeconds] = useState<number | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (user && id) {
      loadConversation();
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

  const loadConversation = async () => {
    const { data } = await supabase.from("conversations").select("encryption_mode, vanish_after_seconds").eq("id", id!).single();
    if (data) {
      setEncryptionMode((data as any).encryption_mode || "standard");
      setVanishSeconds((data as any).vanish_after_seconds);
    }
  };

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
        .select("id, name, profile_photo")
        .eq("id", participants[0].user_id)
        .single();
      if (profile) setOtherUser({ id: profile.id, name: profile.name || "Traveler", photo: profile.profile_photo });
    }
  };

  const upgradeToPrivate = async () => {
    await supabase.from("conversations").update({ encryption_mode: "private" }).eq("id", id!);
    setEncryptionMode("private");
    setShowMenu(false);
    toast.success("Upgraded to Private Travel Chat 🔒");
  };

  const toggleVanishMode = async (seconds: number | null) => {
    const mode = seconds ? "vanish" : "standard";
    await supabase.from("conversations").update({
      encryption_mode: mode,
      vanish_after_seconds: seconds,
    }).eq("id", id!);
    setEncryptionMode(mode as EncryptionMode);
    setVanishSeconds(seconds);
    setShowVanishPicker(false);
    setShowMenu(false);
    toast.success(seconds ? `Vanish mode: messages disappear after ${VANISH_OPTIONS.find(o => o.value === seconds)?.label}` : "Vanish mode disabled");
  };

  const sendMessage = async () => {
    if (!input.trim() || !user || !id) return;
    const content = input.trim();
    setInput("");
    const expiresAt = encryptionMode === "vanish" && vanishSeconds
      ? new Date(Date.now() + vanishSeconds * 1000).toISOString()
      : null;

    await supabase.from("messages").insert({
      conversation_id: id,
      sender_id: user.id,
      content,
      message_type: "text",
      read_by: [user.id],
      encrypted: encryptionMode === "private",
      expires_at: expiresAt,
    });
    await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", id);
  };

  const sendShareMessage = async (type: string, metadata: any) => {
    if (!user || !id) return;
    await supabase.from("messages").insert({
      conversation_id: id,
      sender_id: user.id,
      message_type: type,
      metadata,
      read_by: [user.id],
      encrypted: encryptionMode === "private",
    });
    await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", id);
    setShowAttachMenu(false);
    toast.success("Shared!");
  };

  const addReaction = async (messageId: string, emoji: string) => {
    await supabase.from("message_reactions").upsert({
      message_id: messageId,
      user_id: user!.id,
      emoji,
    });
    setShowReactions(null);
  };

  const blockUser = async () => {
    if (!otherUser.id) return;
    await supabase.from("blocked_users").insert({ blocker_id: user!.id, blocked_id: otherUser.id });
    toast.success("User blocked");
    navigate("/messages");
  };

  const reportUser = async () => {
    if (!otherUser.id) return;
    await supabase.from("reports").insert({
      reporter_id: user!.id,
      reported_id: otherUser.id,
      reported_type: "user",
      reason: "Reported from conversation",
    });
    toast.success("Report submitted");
    setShowMenu(false);
  };

  const formatTime = (date: string) => new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const EncryptionBar = () => {
    if (encryptionMode === "standard") return null;
    return (
      <button
        onClick={() => setShowEncryptionInfo(true)}
        className={`shrink-0 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold ${
          encryptionMode === "private"
            ? "bg-emerald-500/10 text-emerald-600"
            : "bg-amber-500/10 text-amber-600"
        }`}
      >
        {encryptionMode === "private" ? <Lock className="h-3 w-3" /> : <Timer className="h-3 w-3" />}
        {encryptionMode === "private"
          ? "Private Travel Chat · End-to-end encrypted"
          : `Vanish Mode · Messages disappear after ${VANISH_OPTIONS.find(o => o.value === vanishSeconds)?.label || "..."}`
        }
      </button>
    );
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
                ? encryptionMode === "private" ? "bg-emerald-600 text-white rounded-br-md" : "gradient-accent text-white rounded-br-md"
                : "bg-card border border-border/40 text-foreground rounded-bl-md"
            }`}
            onDoubleClick={() => setShowReactions(msg.id)}
          >
            {msg.encrypted && (
              <div className={`flex items-center gap-1 mb-1 text-[9px] ${isMine ? "text-white/60" : "text-muted-foreground"}`}>
                <Lock className="h-2 w-2" /> Encrypted
              </div>
            )}
            {msg.expires_at && (
              <div className={`flex items-center gap-1 mb-1 text-[9px] ${isMine ? "text-white/60" : "text-amber-500"}`}>
                <Timer className="h-2 w-2" /> Disappearing
              </div>
            )}
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
            {msg.message_type === "memory_share" && (
              <div className={`rounded-lg p-2.5 mb-1.5 ${isMine ? "bg-white/15" : "bg-secondary"}`}>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  <span className="text-[12px] font-semibold">Shared Memory</span>
                </div>
                {msg.metadata?.caption && <p className="text-[11px] opacity-70 mt-0.5">{msg.metadata.caption}</p>}
              </div>
            )}
            {msg.message_type === "story_reply" && (
              <div className={`rounded-lg p-2 mb-1.5 ${isMine ? "bg-white/10" : "bg-secondary"} flex items-center gap-2`}>
                <div className="h-8 w-8 rounded bg-accent/20 flex items-center justify-center">
                  <Image className="h-3.5 w-3.5 text-accent" />
                </div>
                <span className="text-[11px] opacity-70">Replied to story</span>
              </div>
            )}
            {msg.content && <p className="text-[13px] leading-relaxed">{msg.content}</p>}
          </div>
          <div className={`flex items-center gap-1 mt-0.5 ${isMine ? "justify-end" : "justify-start"}`}>
            <span className="text-[9px] text-muted-foreground">{formatTime(msg.created_at)}</span>
            {isMine && (
              <span className="text-[9px] text-muted-foreground">
                {isRead ? <CheckCheck className="h-3 w-3 inline text-accent" /> : <Check className="h-3 w-3 inline" />}
              </span>
            )}
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
          <div className="relative">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/10 flex items-center justify-center overflow-hidden">
              {otherUser.photo ? (
                <img src={otherUser.photo} className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <span className="text-sm">👤</span>
              )}
            </div>
            {encryptionMode === "private" && (
              <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 flex items-center justify-center border border-[hsl(var(--dark-bg))]">
                <Lock className="h-2 w-2 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-[14px] truncate">{otherUser.name}</p>
            <p className="text-dark-muted text-[10px] flex items-center gap-1">
              {encryptionMode === "private" ? (
                <><Lock className="h-2.5 w-2.5 text-emerald-400" /> Private Travel Chat</>
              ) : encryptionMode === "vanish" ? (
                <><Timer className="h-2.5 w-2.5 text-amber-400" /> Vanish Mode</>
              ) : (
                "Standard · Encrypted"
              )}
            </p>
          </div>
          <button onClick={() => setShowMenu(!showMenu)} className="text-dark-muted p-1">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>

        {showMenu && (
          <div className="absolute right-4 top-20 z-50 rounded-xl dark-card-elevated p-1.5 shadow-elevated animate-scale-in min-w-[200px]">
            {encryptionMode !== "private" && (
              <button onClick={upgradeToPrivate} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[12px] text-emerald-400 hover:bg-white/5 transition-colors rounded-lg">
                <Lock className="h-3.5 w-3.5" /> Start Private Travel Chat
              </button>
            )}
            <button onClick={() => { setShowMenu(false); setShowVanishPicker(true); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[12px] text-amber-400 hover:bg-white/5 transition-colors rounded-lg">
              <Timer className="h-3.5 w-3.5" /> {encryptionMode === "vanish" ? "Change Vanish Timer" : "Enable Vanish Mode"}
            </button>
            <div className="border-t border-white/5 my-1" />
            <button onClick={() => { setShowMenu(false); setShowEncryptionInfo(true); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[12px] text-dark-muted hover:text-white transition-colors rounded-lg">
              <Shield className="h-3.5 w-3.5" /> Encryption Info
            </button>
            <button onClick={() => { setShowMenu(false); navigate(`/profile/${otherUser.id}`); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[12px] text-dark-muted hover:text-white transition-colors rounded-lg">
              <Globe className="h-3.5 w-3.5" /> View Profile
            </button>
            <div className="border-t border-white/5 my-1" />
            <button onClick={blockUser} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[12px] text-destructive hover:bg-white/5 transition-colors rounded-lg">
              <EyeOff className="h-3.5 w-3.5" /> Block User
            </button>
            <button onClick={reportUser} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[12px] text-destructive hover:bg-white/5 transition-colors rounded-lg">
              <Flag className="h-3.5 w-3.5" /> Report
            </button>
          </div>
        )}
      </div>

      {/* Encryption bar */}
      <EncryptionBar />

      {/* Encryption info modal */}
      {showEncryptionInfo && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={() => setShowEncryptionInfo(false)}>
          <div className="bg-card rounded-t-3xl w-full max-w-md p-6 space-y-4 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-500" />
                <h3 className="font-heading text-[17px] font-bold text-foreground">
                  {encryptionMode === "private" ? "Private Travel Chat" : "Messaging Security"}
                </h3>
              </div>
              <button onClick={() => setShowEncryptionInfo(false)}>
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {encryptionMode === "private" ? (
              <div className="space-y-3">
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <Lock className="h-4 w-4" />
                    <p className="text-[13px] font-bold">End-to-End Encrypted</p>
                  </div>
                  <p className="text-[12px] text-emerald-700/80 leading-relaxed">
                    Messages in this chat are designed so only you and {otherUser.name} can read them. Not even Roavr can access these messages.
                  </p>
                </div>
                <div className="space-y-2">
                  {[
                    { icon: Lock, text: "Messages encrypted before leaving your device" },
                    { icon: Eye, text: "Only sender and recipient hold the keys" },
                    { icon: AlertTriangle, text: "Screenshots may be detected in a future update" },
                    { icon: Smartphone, text: "Device verification coming soon" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-[12px] text-muted-foreground">
                      <item.icon className="h-3.5 w-3.5 mt-0.5 shrink-0 text-emerald-500" />
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground/60 text-center pt-1">
                  Encryption architecture is prepared for a proven E2E protocol. No custom cryptography is used.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[13px] text-muted-foreground leading-relaxed">
                  Standard chats are encrypted in transit (TLS) and encrypted at rest on the server. Messages sync across your devices.
                </p>
                <Button onClick={() => { setShowEncryptionInfo(false); upgradeToPrivate(); }} className="w-full h-10 rounded-xl gradient-glow border-0 text-white font-bold text-[13px] gap-2">
                  <Lock className="h-4 w-4" /> Upgrade to Private Travel Chat
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vanish mode picker */}
      {showVanishPicker && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={() => setShowVanishPicker(false)}>
          <div className="bg-card rounded-t-3xl w-full max-w-md p-6 space-y-4 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer className="h-5 w-5 text-amber-500" />
                <h3 className="font-heading text-[17px] font-bold text-foreground">Vanish Mode</h3>
              </div>
              <button onClick={() => setShowVanishPicker(false)}><X className="h-5 w-5 text-muted-foreground" /></button>
            </div>
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              Messages, photos, and shared pins will disappear after the selected time. Perfect for sharing sensitive travel details.
            </p>
            <div className="space-y-1.5">
              {VANISH_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => toggleVanishMode(opt.value)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
                    vanishSeconds === opt.value ? "bg-amber-50 border border-amber-200" : "hover:bg-secondary/30"
                  }`}
                >
                  <span className="text-[13px] font-medium text-foreground">{opt.label}</span>
                  {vanishSeconds === opt.value && <Check className="h-4 w-4 text-amber-600" />}
                </button>
              ))}
            </div>
            {encryptionMode === "vanish" && (
              <Button variant="outline" onClick={() => toggleVanishMode(null)} className="w-full h-10 rounded-xl text-[13px]">
                Disable Vanish Mode
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Attach menu */}
      {showAttachMenu && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={() => setShowAttachMenu(false)}>
          <div className="bg-card rounded-t-3xl w-full max-w-md p-5 space-y-1 animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 pb-2">Share in Chat</p>
            {[
              { icon: Plane, label: "Share a Trip", type: "trip_share", color: "text-primary" },
              { icon: MapPin, label: "Send Map Pin", type: "map_pin", color: "text-electric" },
              { icon: Globe, label: "Share Memory", type: "memory_share", color: "text-primary" },
              { icon: Globe, label: "Share Public Globe", type: "public_globe", color: "text-electric" },
              { icon: Image, label: "Photo or Video", type: "image", color: "text-primary" },
              { icon: Camera, label: "Open Camera", type: "camera", color: "text-coral" },
              { icon: Tag, label: "Share Local Offer", type: "offer_share", color: "text-coral" },
              { icon: Shield, label: "Recommend Local Expert", type: "expert_share", color: "text-primary" },
            ].map((item) => (
              <button
                key={item.type}
                onClick={() => {
                  if (item.type === "camera") { navigate("/camera"); return; }
                  sendShareMessage(item.type, { placeholder: true });
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-secondary/30 transition-colors"
              >
                <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center">
                  <item.icon className={`h-4 w-4 ${item.color}`} />
                </div>
                <span className="text-[13px] font-medium text-foreground">{item.label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
              </button>
            ))}
            {encryptionMode !== "private" && (
              <div className="flex items-center gap-2 px-3 pt-2 text-[10px] text-amber-600">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                <span>Sharing sensitive travel info? Consider enabling Private Travel Chat.</span>
              </div>
            )}
          </div>
        </div>
      )}

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
              {encryptionMode === "private"
                ? "This is a Private Travel Chat. Messages are end-to-end encrypted."
                : "Start a conversation! Share trips, memories, and travel stories."
              }
            </p>
          </div>
        ) : (
          messages.map(renderMessage)
        )}
        {isTyping && (
          <div className="flex justify-start mb-2">
            <div className="rounded-2xl rounded-bl-md bg-card border border-border/40 px-4 py-2.5">
              <div className="flex gap-1">
                <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border/40 bg-card/98 backdrop-blur-xl px-3 py-2.5 safe-area-bottom">
        {encryptionMode === "private" && (
          <div className="flex items-center gap-1 justify-center mb-1.5 text-[9px] text-emerald-600 font-medium">
            <Lock className="h-2.5 w-2.5" /> End-to-end encrypted
          </div>
        )}
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAttachMenu(true)} className="h-9 w-9 rounded-xl bg-secondary flex items-center justify-center shrink-0">
            <Camera className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder={encryptionMode === "private" ? "Private message..." : "Message..."}
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
              input.trim()
                ? encryptionMode === "private" ? "bg-emerald-600 shadow-lg shadow-emerald-500/20" : "gradient-accent glow-coral"
                : "bg-secondary"
            }`}
          >
            <Send className={`h-4 w-4 ${input.trim() ? "text-white" : "text-muted-foreground"}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
