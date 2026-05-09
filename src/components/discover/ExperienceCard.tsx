import { Star, MapPin, Heart, Share2 } from "lucide-react";

export interface Experience {
  id: string;
  name: string;
  category: string;
  image: string;
  price: string;
  rating: number;
  distance?: string;
  cta?: string;
}

export default function ExperienceCard({ item }: { item: Experience }) {
  return (
    <div className="dark-card rounded-2xl overflow-hidden group cursor-pointer">
      <div className="relative h-32">
        <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute top-2 left-2">
          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md text-white">
            {item.category}
          </span>
        </div>
        <div className="absolute top-2 right-2 flex gap-1">
          <button className="h-7 w-7 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-colors">
            <Heart className="h-3.5 w-3.5 text-white" />
          </button>
          <button className="h-7 w-7 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-colors">
            <Share2 className="h-3.5 w-3.5 text-white" />
          </button>
        </div>
      </div>
      <div className="p-3 space-y-1.5">
        <p className="text-[12px] font-semibold text-white truncate">{item.name}</p>
        <div className="flex items-center gap-2 text-[10px] text-dark-muted">
          <span className="flex items-center gap-0.5"><Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />{item.rating}</span>
          {item.distance && <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{item.distance}</span>}
          <span className="ml-auto font-bold text-glow">{item.price}</span>
        </div>
        <button className="w-full mt-1.5 rounded-lg gradient-glow text-white py-1.5 text-[10px] font-bold glow-accent">
          {item.cta || "Book now"}
        </button>
      </div>
    </div>
  );
}
