/**
 * A traveller as Roavr presents them: not a follower count, but where they
 * have actually been and what they share with you.
 */
import { useNavigate } from "react-router-dom";
import { MapPin } from "lucide-react";
import { useFollowState } from "@/hooks/useFollowState";
import type { TravelerSummary } from "@/lib/social/types";

function Avatar({ name, photo, size = 48 }: { name: string; photo: string | null; size?: number }) {
  return photo ? (
    <img src={photo} alt={name} loading="lazy" className="rounded-full object-cover shrink-0"
      style={{ width: size, height: size }} />
  ) : (
    <div className="rounded-full shrink-0 flex items-center justify-center text-white"
      style={{ width: size, height: size, background: "#1A2236", fontSize: size / 2.6, fontWeight: 600 }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function TravelerRow({ traveler, compact = false }: { traveler: TravelerSummary; compact?: boolean }) {
  const navigate = useNavigate();
  const follow = useFollowState(traveler.id);

  if (follow.blocked) return null;

  const label = follow.status === "following" ? "Following" : follow.status === "requested" ? "Requested" : "Follow";
  const isFollowing = follow.status !== "none";

  return (
    <div
      className="flex items-center gap-3 rounded-2xl p-3.5"
      style={{ background: "#111827", border: "1px solid #1E2A3F", width: compact ? 260 : undefined }}
    >
      <button onClick={() => navigate(`/u/${traveler.id}`)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
        <Avatar name={traveler.name} photo={traveler.avatar} />
        <div className="min-w-0">
          <p className="text-white truncate" style={{ fontSize: 14, fontWeight: 600 }}>{traveler.name}</p>
          {traveler.reason && (
            <p className="truncate" style={{ color: "#3B82F6", fontSize: 12 }}>{traveler.reason}</p>
          )}
          <p className="truncate flex items-center gap-1" style={{ color: "#94A3B8", fontSize: 11 }}>
            <MapPin className="h-3 w-3 shrink-0" strokeWidth={1.5} />
            {traveler.countries} {traveler.countries === 1 ? "country" : "countries"} · {traveler.cities}{" "}
            {traveler.cities === 1 ? "city" : "cities"}
          </p>
          {traveler.topCountries.length > 0 && (
            <p className="truncate mt-0.5" style={{ fontSize: 12 }}>
              {traveler.topCountries.map((c) => c.flag ?? "").join(" ")}
            </p>
          )}
        </div>
      </button>
      <button
        onClick={follow.toggleFollow}
        disabled={follow.busy}
        className="shrink-0 rounded-full px-3.5 disabled:opacity-60 active:scale-95 transition-transform"
        style={{
          height: 32,
          fontSize: 12,
          fontWeight: 600,
          background: isFollowing ? "transparent" : "#3B82F6",
          border: isFollowing ? "1px solid #1E2A3F" : "none",
          color: isFollowing ? "#94A3B8" : "#FFFFFF",
        }}
      >
        {label}
      </button>
    </div>
  );
}
