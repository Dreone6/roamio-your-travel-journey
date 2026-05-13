import { Star, MapPin, BadgeCheck, MessageCircle, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";

export interface LocalExpertCardItem {
  id: string;
  name: string;
  avatarUrl: string;
  category: string;
  location: string;
  rating: number;
  reviews?: number;
  pricePerHour?: number;
  currency?: string;
  verified?: boolean;
  available?: boolean;
}

export default function LocalExpertCard({ expert }: { expert: LocalExpertCardItem }) {
  const navigate = useNavigate();
  return (
    <div className="shrink-0 w-[230px] dark-card rounded-2xl p-3 relative overflow-hidden">
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-electric/10 blur-2xl pointer-events-none" />

      <div className="relative flex items-center gap-3">
        <div className="relative">
          <div className="h-12 w-12 rounded-full p-[2px] bg-gradient-to-br from-primary to-electric">
            <img src={expert.avatarUrl} alt={expert.name} className="h-full w-full rounded-full object-cover border-2 border-[hsl(230_50%_7%)]" />
          </div>
          {expert.available && (
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-[hsl(230_50%_7%)]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className="text-white font-bold text-[12.5px] truncate">{expert.name}</p>
            {expert.verified && <BadgeCheck className="h-3.5 w-3.5 text-electric shrink-0" />}
          </div>
          <p className="text-[10px] text-dark-muted capitalize">{expert.category}</p>
        </div>
      </div>

      <div className="relative mt-2.5 flex items-center justify-between text-[10px]">
        <span className="flex items-center gap-1 text-white/80">
          <MapPin className="h-2.5 w-2.5 text-electric" />
          <span className="truncate max-w-[110px]">{expert.location}</span>
        </span>
        <span className="flex items-center gap-0.5 text-white">
          <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
          <span className="font-semibold">{expert.rating}</span>
          {expert.reviews != null && <span className="text-white/50">({expert.reviews})</span>}
        </span>
      </div>

      {expert.pricePerHour != null && (
        <p className="relative mt-1 text-[10px] text-white/70">
          From <span className="text-electric font-bold">{expert.currency === "EUR" ? "€" : "$"}{expert.pricePerHour}</span>/hr
        </p>
      )}

      <div className="relative mt-3 flex items-center gap-1.5">
        <button
          onClick={() => navigate(`/locals/${expert.id}`)}
          className="flex-1 rounded-lg gradient-glow text-white py-1.5 text-[10px] font-bold flex items-center justify-center gap-1"
        >
          <Calendar className="h-3 w-3" /> Book
        </button>
        <button
          onClick={() => navigate("/inbox")}
          className="h-7 w-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center"
          aria-label="Message expert"
        >
          <MessageCircle className="h-3.5 w-3.5 text-electric" />
        </button>
      </div>
    </div>
  );
}
