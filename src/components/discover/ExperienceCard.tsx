import { useState } from "react";
import { Star, MapPin, Heart, Share2, Tag, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export interface Experience {
  id: string;
  name: string;
  category: string;
  image: string;
  price: string;
  rating: number;
  distance?: string;
  reviews?: number;
  cta?: "Book" | "Reserve" | "Save" | "Claim" | string;
  verified?: boolean;
}

const CTA_STYLES: Record<string, string> = {
  Book: "gradient-glow text-white",
  Reserve: "gradient-glow text-white",
  Save: "bg-white/10 text-white border border-white/15",
  Claim: "gradient-coral text-white",
};

export default function ExperienceCard({ item }: { item: Experience }) {
  const [saved, setSaved] = useState(false);
  const cta = item.cta || "Book";
  const ctaClass = CTA_STYLES[cta] || "gradient-glow text-white";

  return (
    <div className="dark-card rounded-2xl overflow-hidden group cursor-pointer">
      <div className="relative aspect-[4/3]">
        <img
          src={item.image}
          alt={item.name}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/30" />

        {/* Top: category + verified */}
        <div className="absolute top-2 left-2 flex items-center gap-1">
          <span className="text-[8.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/45 backdrop-blur-md text-white border border-white/10">
            {item.category}
          </span>
          {item.verified && (
            <span className="text-[8.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-electric/20 text-electric border border-electric/30">
              ✓ Verified
            </span>
          )}
        </div>

        {/* Top right: save + share */}
        <div className="absolute top-2 right-2 flex flex-col gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); setSaved(s => !s); toast.success(saved ? "Removed from saved" : "Saved to your places"); }}
            className="h-7 w-7 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/10"
            aria-label="Save"
          >
            <Heart className={`h-3.5 w-3.5 ${saved ? "fill-coral text-coral" : "text-white"}`} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); navigator.share?.({ title: item.name }).catch(() => toast.success("Link copied")); }}
            className="h-7 w-7 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/10"
            aria-label="Share"
          >
            <Share2 className="h-3.5 w-3.5 text-white" />
          </button>
        </div>

        {/* Bottom: name + meta over image */}
        <div className="absolute bottom-0 inset-x-0 p-2.5">
          <p className="text-[12.5px] font-bold text-white leading-tight line-clamp-2 drop-shadow">{item.name}</p>
          <div className="flex items-center gap-2 mt-1 text-[10px] text-white/85">
            <span className="flex items-center gap-0.5">
              <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
              <span className="font-semibold">{item.rating}</span>
              {item.reviews && <span className="text-white/55">({item.reviews})</span>}
            </span>
            {item.distance && (
              <span className="flex items-center gap-0.5">
                <MapPin className="h-2.5 w-2.5" />{item.distance}
              </span>
            )}
            <span className="ml-auto flex items-center gap-0.5 font-bold text-electric">
              <Tag className="h-2.5 w-2.5" />{item.price}
            </span>
          </div>
        </div>
      </div>

      {/* Action row */}
      <div className="flex items-center gap-1 p-2">
        <button className={`flex-1 rounded-lg py-1.5 text-[10px] font-bold ${ctaClass}`}>
          {cta}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); toast("Opening message…"); }}
          className="h-7 w-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center"
          aria-label="Message seller"
        >
          <MessageCircle className="h-3.5 w-3.5 text-electric" />
        </button>
      </div>
    </div>
  );
}
