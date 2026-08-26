/**
 * One item in the travel feed.
 *
 * Editorial, media-first: real photos carry the card, with author and place
 * floating on a glassmorphic overlay. Engagement stays true to Roavr's model —
 * "message the traveller", "explore the place" — plus saving the place to one
 * of your own trips with a fluid spring confirmation.
 */
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { MapPin, MessageCircle, Trophy, Camera, Clock, Globe2, Bookmark, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useStartConversation } from "@/hooks/useStartConversation";
import type { FeedItem } from "@/lib/social/types";

const TYPE_META: Record<FeedItem["type"], { icon: any; label: string }> = {
  memory: { icon: Camera, label: "Memory" },
  story: { icon: Clock, label: "Story" },
  checkin: { icon: MapPin, label: "Check-in" },
  milestone: { icon: Trophy, label: "Milestone" },
};

/** Glassmorphic overlay surface — feed media cards only. */
const GLASS = {
  background: "rgba(8,13,26,0.42)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.10)",
} as const;

const SPRING = { type: "spring", stiffness: 240, damping: 26 } as const;

function timeAgo(iso: string) {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.round(hrs / 24);
  return days < 7 ? `${days}d` : new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function Avatar({ item, size }: { item: FeedItem; size: number }) {
  if (item.author.avatar) {
    return (
      <img src={item.author.avatar} alt={item.author.name} loading="lazy"
        className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />
    );
  }
  return (
    <div className="rounded-full flex items-center justify-center text-white shrink-0"
      style={{ width: size, height: size, background: "#1A2236", fontSize: size * 0.4, fontWeight: 600 }}>
      {item.author.name.charAt(0).toUpperCase()}
    </div>
  );
}

interface Props {
  item: FeedItem;
  onSave: (item: FeedItem) => void;
  saved: boolean;
  saveBusy: boolean;
}

export default function FeedCard({ item, onSave, saved, saveBusy }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { open, busy } = useStartConversation();
  const meta = TYPE_META[item.type];
  const Icon = meta.icon;
  const isMine = item.author.id === user?.id;
  const place = item.locationName ?? [item.city, item.country].filter(Boolean).join(", ");

  const draft = item.city
    ? `Saw your ${meta.label.toLowerCase()} from ${item.city} — how was it?`
    : `Saw your ${meta.label.toLowerCase()} — how was it?`;

  const openPlace = () =>
    navigate(`/explore?place=${encodeURIComponent(item.city ?? place)}${item.country ? `&country=${encodeURIComponent(item.country)}` : ""}`);

  const saveButton = (
    <motion.button
      onClick={() => onSave(item)}
      disabled={saveBusy || saved}
      whileTap={{ scale: 0.78 }}
      animate={saved ? { scale: [1, 1.45, 1] } : { scale: 1 }}
      transition={saved ? { type: "spring", stiffness: 480, damping: 14 } : SPRING}
      aria-label={saved ? "Saved to trip" : "Save to trip"}
      className="h-9 w-9 rounded-full flex items-center justify-center text-white disabled:cursor-default"
      style={{
        background: saved ? "rgba(59,130,246,0.18)" : "#1A2236",
        border: saved ? "1px solid rgba(59,130,246,0.5)" : "1px solid #1E2A3F",
      }}
    >
      {saveBusy ? (
        <Loader2 className="h-4 w-4 animate-spin" style={{ color: "#3B82F6" }} strokeWidth={1.5} />
      ) : (
        <Bookmark
          className="h-4 w-4"
          strokeWidth={1.5}
          style={{ color: saved ? "#3B82F6" : "#FFFFFF", fill: saved ? "#3B82F6" : "none" }}
        />
      )}
    </motion.button>
  );

  const actions = (
    <div className="flex items-center gap-2">
      {!isMine && (
        <button
          onClick={() => open(item.author.id, draft)}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-full px-3.5 text-white disabled:opacity-60"
          style={{ height: 36, background: "#1A2236", border: "1px solid #1E2A3F", fontSize: 12, fontWeight: 600 }}
        >
          <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.5} /> Message
        </button>
      )}
      <button
        onClick={() => navigate(isMine ? "/globe" : `/passport/${item.author.id}`)}
        className="flex items-center gap-1.5 rounded-full px-3.5 text-white"
        style={{ height: 36, background: "#1A2236", border: "1px solid #1E2A3F", fontSize: 12, fontWeight: 600 }}
      >
        <Globe2 className="h-3.5 w-3.5" strokeWidth={1.5} /> {isMine ? "Your world" : "Their world"}
      </button>
      <div className="flex-1" />
      {saveButton}
    </div>
  );

  const contextChips = item.context.length > 0 && (
    <div className="flex flex-wrap gap-1.5">
      {item.context.map((c) => (
        <span key={c.kind} className="rounded-full px-2.5 py-1"
          style={{ background: "rgba(59,130,246,0.12)", color: "#3B82F6", fontSize: 11, fontWeight: 600 }}>
          {c.label}
        </span>
      ))}
    </div>
  );

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={SPRING}
      className="overflow-hidden rounded-[24px]"
      style={{ background: "#111827", border: "1px solid #1E2A3F" }}
    >
      {item.mediaUrl ? (
        <>
          <div className="relative">
            {item.mediaType === "video" ? (
              <video src={item.mediaUrl} controls playsInline className="w-full object-cover" style={{ maxHeight: 440 }} />
            ) : (
              <img src={item.mediaUrl} alt={place || item.caption || "Travel memory"} loading="lazy"
                className="w-full object-cover" style={{ maxHeight: 440 }} />
            )}

            {/* top glass chips */}
            <div className="absolute inset-x-3 top-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-white"
                style={{ ...GLASS, fontSize: 11, fontWeight: 600 }}>
                <Icon className="h-3 w-3" strokeWidth={1.5} /> {meta.label}
              </span>
              <span className="rounded-full px-2.5 py-1 text-white" style={{ ...GLASS, fontSize: 11, fontWeight: 600 }}>
                {timeAgo(item.createdAt)}
              </span>
            </div>

            {/* bottom glass author bar */}
            <div className="absolute inset-x-3 bottom-3">
              <div className="flex items-center gap-2.5 rounded-2xl px-3 py-2.5" style={GLASS}>
                <button onClick={() => navigate(isMine ? "/profile" : `/u/${item.author.id}`)} className="shrink-0">
                  <Avatar item={item} size={32} />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-white truncate" style={{ fontSize: 13, fontWeight: 600 }}>
                    {isMine ? "You" : item.author.name}
                  </p>
                  {place && (
                    <button onClick={openPlace} className="flex items-center gap-1 truncate"
                      style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: 500 }}>
                      <MapPin className="h-3 w-3 shrink-0" strokeWidth={1.5} />
                      <span className="truncate">{place}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 pt-3 pb-3.5 space-y-2.5">
            {contextChips}
            {item.caption && (
              <p className="text-white" style={{ fontSize: 14, lineHeight: 1.55 }}>{item.caption}</p>
            )}
            {actions}
          </div>
        </>
      ) : (
        /* Text-only items (milestones, note check-ins) go full editorial. */
        <div className="px-5 pt-4 pb-4 space-y-3">
          <header className="flex items-center gap-2.5">
            <button onClick={() => navigate(isMine ? "/profile" : `/u/${item.author.id}`)} className="shrink-0">
              <Avatar item={item} size={36} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-white truncate" style={{ fontSize: 13, fontWeight: 600 }}>
                {isMine ? "You" : item.author.name}
              </p>
              <div className="flex items-center gap-1.5" style={{ color: "#94A3B8", fontSize: 11 }}>
                <Icon className="h-3 w-3" strokeWidth={1.5} />
                <span>{meta.label}</span>
                <span>·</span>
                <span>{timeAgo(item.createdAt)}</span>
              </div>
            </div>
          </header>

          {item.type === "milestone" ? (
            <div className="flex items-start gap-3">
              <div className="rounded-2xl flex items-center justify-center shrink-0"
                style={{ width: 44, height: 44, background: "rgba(244,162,97,0.12)", border: "1px solid rgba(244,162,97,0.3)" }}>
                <Trophy className="h-5 w-5" style={{ color: "#F4A261" }} strokeWidth={1.5} />
              </div>
              <p className="text-white font-heading pt-0.5" style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-0.3px", lineHeight: 1.3 }}>
                {item.caption ? item.caption.replace(/_/g, " ") : "New milestone"}
                {item.country ? <span style={{ color: "#94A3B8" }}> · {item.country}</span> : null}
              </p>
            </div>
          ) : (
            item.caption && (
              <p className="text-white" style={{ fontSize: 15, lineHeight: 1.55 }}>{item.caption}</p>
            )
          )}

          {place && (
            <button onClick={openPlace} className="flex items-center gap-1"
              style={{ color: "#3B82F6", fontSize: 12, fontWeight: 600 }}>
              <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} /> {place}
            </button>
          )}
          {contextChips}
          {actions}
        </div>
      )}
    </motion.article>
  );
}
