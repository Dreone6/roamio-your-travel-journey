import type { Profile } from "@/data/types";
import { UserPlus, Globe } from "lucide-react";

interface TravelerCardProps {
  profile: Profile;
  isFollowing?: boolean;
  onFollow?: () => void;
  onViewGlobe?: () => void;
}

export default function TravelerCard({ profile, isFollowing = false, onFollow, onViewGlobe }: TravelerCardProps) {
  return (
    <div className="dark-card rounded-2xl p-3.5 min-w-[200px] snap-start hover:bg-white/[0.04] transition-colors">
      <div className="flex items-center gap-3">
        <div className="relative">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.name}
              className="h-11 w-11 rounded-full object-cover ring-2 ring-emerald-500/30"
            />
          ) : (
            <div className="h-11 w-11 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <span className="text-sm font-bold text-glow">{profile.name[0]}</span>
            </div>
          )}
          {profile.verified && (
            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center ring-2 ring-[hsl(225,22%,13%)]">
              <svg className="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
              </svg>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-white truncate">{profile.name}</p>
          <p className="text-[10px] text-dark-muted mt-0.5">
            {profile.totalCountries} countries · {profile.totalCities} cities
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mt-3">
        <button
          onClick={onFollow}
          className={`flex-1 h-8 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${
            isFollowing
              ? "dark-card-elevated text-dark-muted"
              : "gradient-glow text-white glow-accent"
          }`}
        >
          <UserPlus className="h-3 w-3" />
          {isFollowing ? "Following" : "Follow"}
        </button>
        <button
          onClick={onViewGlobe}
          className="h-8 w-8 rounded-lg dark-card-elevated flex items-center justify-center"
        >
          <Globe className="h-3.5 w-3.5 text-glow" />
        </button>
      </div>
    </div>
  );
}
