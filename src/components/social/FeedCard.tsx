/**
 * One item in the travel feed.
 *
 * There is no like or comment affordance here: Roavr's engagement model is
 * "message the traveller" and "explore the place", so the only actions offered
 * are the ones that lead somewhere real.
 */
import { useNavigate } from "react-router-dom";
import { MapPin, MessageCircle, Trophy, Camera, Clock, Globe2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useStartConversation } from "@/hooks/useStartConversation";
import type { FeedItem } from "@/lib/social/types";

const TYPE_META: Record<FeedItem["type"], { icon: any; label: string }> = {
  memory: { icon: Camera, label: "Memory" },
  story: { icon: Clock, label: "Story" },
  checkin: { icon: MapPin, label: "Check-in" },
  milestone: { icon: Trophy, label: "Milestone" },
};

function timeAgo(iso: string) {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.round(hrs / 24);
  return days < 7 ? `${days}d` : new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function FeedCard({ item }: { item: FeedItem }) {
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

  return (
    <article className="overflow-hidden rounded-[20px]" style={{ background: "#111827", border: "1px solid #1E2A3F" }}>
      <header className="flex items-center gap-2.5 px-4 pt-3.5 pb-2.5">
        <button onClick={() => navigate(isMine ? "/profile" : `/u/${item.author.id}`)} className="shrink-0">
          {item.author.avatar ? (
            <img src={item.author.avatar} alt={item.author.name} loading="lazy"
              className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <div className="h-9 w-9 rounded-full flex items-center justify-center text-white"
              style={{ background: "#1A2236", fontSize: 14, fontWeight: 600 }}>
              {item.author.name.charAt(0).toUpperCase()}
            </div>
          )}
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

      {item.context.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2">
          {item.context.map((c) => (
            <span key={c.kind} className="rounded-full px-2.5 py-1"
              style={{ background: "rgba(59,130,246,0.12)", color: "#3B82F6", fontSize: 11, fontWeight: 600 }}>
              {c.label}
            </span>
          ))}
        </div>
      )}

      {item.mediaUrl && (
        item.mediaType === "video" ? (
          <video src={item.mediaUrl} controls playsInline className="w-full object-cover" style={{ maxHeight: 380 }} />
        ) : (
          <img src={item.mediaUrl} alt={place || item.caption || "Travel memory"} loading="lazy"
            className="w-full object-cover" style={{ maxHeight: 380 }} />
        )
      )}

      <div className="px-4 pt-3 pb-3.5">
        {item.type === "milestone" && (
          <p className="text-white" style={{ fontSize: 14, fontWeight: 600 }}>
            {item.caption ? item.caption.replace(/_/g, " ") : "New milestone"}
            {item.country ? ` · ${item.country}` : ""}
          </p>
        )}
        {item.caption && item.type !== "milestone" && (
          <p className="text-white" style={{ fontSize: 14, lineHeight: 1.5 }}>{item.caption}</p>
        )}
        {place && (
          <button
            onClick={() => navigate(`/explore?place=${encodeURIComponent(item.city ?? place)}${item.country ? `&country=${encodeURIComponent(item.country)}` : ""}`)}
            className="mt-2 flex items-center gap-1"
            style={{ color: "#3B82F6", fontSize: 12, fontWeight: 600 }}
          >
            <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} /> {place}
          </button>
        )}

        <div className="mt-3 flex gap-2">
          {!isMine && (
            <button
              onClick={() => open(item.author.id, draft)}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-full px-3.5 text-white disabled:opacity-60"
              style={{ height: 34, background: "#1A2236", border: "1px solid #1E2A3F", fontSize: 12, fontWeight: 600 }}
            >
              <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.5} /> Message
            </button>
          )}
          <button
            onClick={() => navigate(isMine ? "/globe" : `/passport/${item.author.id}`)}
            className="flex items-center gap-1.5 rounded-full px-3.5 text-white"
            style={{ height: 34, background: "#1A2236", border: "1px solid #1E2A3F", fontSize: 12, fontWeight: 600 }}
          >
            <Globe2 className="h-3.5 w-3.5" strokeWidth={1.5} /> {isMine ? "Your world" : "Their world"}
          </button>
        </div>
      </div>
    </article>
  );
}
