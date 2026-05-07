import type { CheckIn, Memory, Badge } from "@/data/types";
import { MapPin, Camera, Trophy, Clock } from "lucide-react";

interface TravelTimelineProps {
  checkIns: CheckIn[];
  memories: Memory[];
  badges: Badge[];
}

interface TimelineEntry {
  id: string;
  type: "checkin" | "memory" | "badge";
  title: string;
  subtitle: string;
  image?: string | null;
  timestamp: string;
}

export default function TravelTimeline({ checkIns, memories, badges }: TravelTimelineProps) {
  const entries: TimelineEntry[] = [
    ...checkIns.map((c) => ({
      id: c.id,
      type: "checkin" as const,
      title: c.locationName,
      subtitle: c.notes || "Checked in",
      image: c.photo,
      timestamp: c.timestamp,
    })),
    ...memories.map((m) => ({
      id: m.id,
      type: "memory" as const,
      title: m.locationName || "Memory",
      subtitle: m.caption || "Travel memory",
      image: m.mediaUrl,
      timestamp: m.createdAt,
    })),
    ...badges.map((b) => ({
      id: b.id,
      type: "badge" as const,
      title: b.badgeName,
      subtitle: b.description,
      image: null,
      timestamp: b.earnedDate + "T00:00:00Z",
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const ICONS = {
    checkin: { icon: MapPin, color: "text-blue-400", bg: "bg-blue-400/10" },
    memory: { icon: Camera, color: "text-purple-400", bg: "bg-purple-400/10" },
    badge: { icon: Trophy, color: "text-amber-400", bg: "bg-amber-400/10" },
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-4 w-4 text-glow" />
        <h3 className="text-[13px] font-bold text-white">Travel Timeline</h3>
      </div>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[17px] top-2 bottom-2 w-px bg-gradient-to-b from-emerald-500/40 via-purple-500/20 to-transparent" />

        <div className="space-y-3">
          {entries.slice(0, 8).map((entry) => {
            const { icon: Icon, color, bg } = ICONS[entry.type];
            return (
              <div key={entry.id} className="flex gap-3 group">
                <div className={`h-9 w-9 rounded-xl ${bg} flex items-center justify-center shrink-0 z-10`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-white truncate">{entry.title}</p>
                      <p className="text-[10px] text-dark-muted mt-0.5 line-clamp-1">{entry.subtitle}</p>
                    </div>
                    <span className="text-[9px] text-dark-muted shrink-0 mt-0.5">{formatDate(entry.timestamp)}</span>
                  </div>
                  {entry.image && (
                    <div className="mt-1.5 rounded-lg overflow-hidden h-16 w-24">
                      <img src={entry.image} alt="" className="h-full w-full object-cover" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
