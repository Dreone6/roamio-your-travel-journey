import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Map, MapPin, Trophy } from "lucide-react";

const FEATURES = [
  {
    icon: Map,
    title: "AI Trip Planner",
    description: "Get personalized itineraries powered by AI based on your style, budget, and interests.",
  },
  {
    icon: MapPin,
    title: "Check In & Discover",
    description: "Drop a pin at any destination, unlock nearby offers, and complete fun travel challenges.",
  },
  {
    icon: Trophy,
    title: "Badges & Globe",
    description: "Earn badges as you explore, and watch your personal globe fill up with every new city.",
  },
];

const STORAGE_KEY = "roavr_whats_new_seen";

export default function WhatsNewModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      const timer = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    setOpen(false);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-foreground/40 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl overflow-hidden shadow-elevated animate-scale-in">
        <div className="relative gradient-navy px-6 pt-8 pb-6 text-center">
          <button onClick={dismiss} className="absolute top-3 right-3 text-primary-foreground/60 hover:text-primary-foreground">
            <X className="h-5 w-5" />
          </button>
          <h2 className="font-heading text-2xl font-bold text-primary-foreground">What's New in Roavr</h2>
          <p className="text-primary-foreground/70 text-sm mt-1">Your world, one trip at a time</p>
        </div>

        <div className="px-6 py-5 space-y-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex gap-3">
              <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                <f.icon className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="font-heading font-semibold text-sm text-foreground">{f.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 pb-6">
          <Button onClick={dismiss} className="w-full h-11 rounded-xl gradient-accent border-0 font-semibold">Let's Explore</Button>
        </div>
      </div>
    </div>
  );
}
