import { useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  MapPin, Camera, Calendar, Navigation, Eye, Users, Lock,
  Heart, MessageCircle, Share2, Award, Globe,
} from "lucide-react";
import type { MapPin as MapPinType, Visibility } from "@/data/types";

interface PinDetailSheetProps {
  pin: MapPinType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  linkedData?: {
    photo?: string;
    caption?: string;
    tripTitle?: string;
    badgeName?: string;
    date?: string;
    reactions?: number;
    comments?: number;
  };
}

const CATEGORY_LABELS: Record<string, { label: string; icon: typeof MapPin; color: string }> = {
  visited: { label: "Visited", icon: Navigation, color: "text-emerald-400" },
  wishlist: { label: "Wishlist", icon: Globe, color: "text-orange-400" },
  memory: { label: "Memory", icon: Camera, color: "text-purple-400" },
  checkin: { label: "Check-in", icon: MapPin, color: "text-blue-400" },
  trip: { label: "Trip", icon: Navigation, color: "text-teal-400" },
  story: { label: "Story", icon: Camera, color: "text-pink-400" },
  saved: { label: "Saved Place", icon: Heart, color: "text-rose-400" },
  offer: { label: "Offer Claimed", icon: Award, color: "text-amber-400" },
  expert: { label: "Local Expert", icon: Users, color: "text-cyan-400" },
  tip: { label: "Tip", icon: MessageCircle, color: "text-yellow-400" },
};

const VISIBILITY_CONFIG: Record<Visibility, { icon: typeof Eye; label: string; color: string }> = {
  public: { icon: Eye, label: "Public", color: "text-emerald-400" },
  followers: { icon: Users, label: "Followers Only", color: "text-blue-400" },
  private: { icon: Lock, label: "Private", color: "text-dark-muted" },
};

export default function PinDetailSheet({ pin, open, onOpenChange, linkedData }: PinDetailSheetProps) {
  const [liked, setLiked] = useState(false);

  if (!pin) return null;

  const cat = CATEGORY_LABELS[pin.category] || CATEGORY_LABELS.visited;
  const CatIcon = cat.icon;
  const vis = VISIBILITY_CONFIG[pin.visibility];
  const VisIcon = vis.icon;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="dark-immersive border-t border-white/[0.06] rounded-t-3xl max-h-[85vh] overflow-y-auto p-0">
        {/* Photo */}
        {linkedData?.photo && (
          <div className="relative h-52 overflow-hidden rounded-t-3xl">
            <img src={linkedData.photo} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(220,30%,6%)] via-transparent to-transparent" />
          </div>
        )}

        <div className="px-5 pb-8 pt-4 space-y-4">
          <SheetHeader className="text-left">
            <div className="flex items-center gap-2 mb-1">
              <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${cat.color}`}>
                <CatIcon className="h-3 w-3" /> {cat.label}
              </span>
              <span className="text-white/10">·</span>
              <span className={`flex items-center gap-1 text-[10px] font-bold ${vis.color}`}>
                <VisIcon className="h-3 w-3" /> {vis.label}
              </span>
            </div>
            <SheetTitle className="font-heading text-xl font-bold text-white">{pin.label}</SheetTitle>
          </SheetHeader>

          {/* Caption */}
          {(linkedData?.caption || pin.description) && (
            <p className="text-[13px] text-white/70 leading-relaxed">
              {linkedData?.caption || pin.description}
            </p>
          )}

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="dark-card rounded-xl p-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-glow" />
                <div>
                  <p className="text-[9px] text-dark-muted uppercase tracking-wider">Location</p>
                  <p className="text-[12px] text-white font-medium">{pin.label}</p>
                </div>
              </div>
            </div>
            <div className="dark-card rounded-xl p-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-glow" />
                <div>
                  <p className="text-[9px] text-dark-muted uppercase tracking-wider">Date</p>
                  <p className="text-[12px] text-white font-medium">
                    {linkedData?.date
                      ? new Date(linkedData.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      : new Date(pin.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              </div>
            </div>
            {linkedData?.tripTitle && (
              <div className="dark-card rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <Navigation className="h-3.5 w-3.5 text-teal-400" />
                  <div>
                    <p className="text-[9px] text-dark-muted uppercase tracking-wider">Trip</p>
                    <p className="text-[12px] text-white font-medium truncate">{linkedData.tripTitle}</p>
                  </div>
                </div>
              </div>
            )}
            {linkedData?.badgeName && (
              <div className="dark-card rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <Award className="h-3.5 w-3.5 text-amber-400" />
                  <div>
                    <p className="text-[9px] text-dark-muted uppercase tracking-wider">Badge</p>
                    <p className="text-[12px] text-white font-medium truncate">{linkedData.badgeName}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Coordinates */}
          <div className="dark-card rounded-xl p-3 flex items-center justify-between">
            <span className="text-[10px] text-dark-muted font-mono">
              {pin.latitude.toFixed(4)}°, {pin.longitude.toFixed(4)}°
            </span>
            <button className="text-[10px] text-glow font-bold">Open in Maps</button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => setLiked(!liked)}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl dark-card py-3 transition-colors hover:bg-white/[0.04]"
            >
              <Heart className={`h-4 w-4 ${liked ? "fill-rose-500 text-rose-500" : "text-white/50"}`} />
              <span className="text-[11px] font-semibold text-white/70">{(linkedData?.reactions ?? 0) + (liked ? 1 : 0)}</span>
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 rounded-xl dark-card py-3 transition-colors hover:bg-white/[0.04]">
              <MessageCircle className="h-4 w-4 text-white/50" />
              <span className="text-[11px] font-semibold text-white/70">{linkedData?.comments ?? 0}</span>
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 rounded-xl dark-card py-3 transition-colors hover:bg-white/[0.04]">
              <Share2 className="h-4 w-4 text-white/50" />
              <span className="text-[11px] font-semibold text-white/70">Share</span>
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
