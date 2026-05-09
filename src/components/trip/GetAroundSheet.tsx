import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Footprints, Car, Bus, Train, Ship, Plane, Bike } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  destination?: string;
}

const MODES = [
  { icon: Footprints, label: "Walking", time: "12 min", cost: "Free", note: "Best for short hops" },
  { icon: Car, label: "Rideshare", time: "6 min", cost: "$8–12", note: "Uber / Lyft / Bolt" },
  { icon: Bus, label: "Bus", time: "18 min", cost: "$2", note: "Local transit" },
  { icon: Train, label: "Train / Metro", time: "10 min", cost: "$3", note: "Fastest in cities" },
  { icon: Ship, label: "Ferry", time: "25 min", cost: "$6", note: "Scenic routes" },
  { icon: Plane, label: "Flight", time: "—", cost: "Varies", note: "For long distances" },
  { icon: Bike, label: "Bike share", time: "15 min", cost: "$3", note: "Eco-friendly" },
  { icon: Car, label: "Car rental", time: "Flex", cost: "$45/day", note: "For day trips" },
];

export default function GetAroundSheet({ open, onOpenChange, destination }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="dark-immersive border-white/10 max-h-[80vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-white font-heading">How do I get there?</SheetTitle>
        </SheetHeader>
        {destination && (
          <p className="text-[11px] text-dark-muted mt-1">To {destination}</p>
        )}

        <div className="mt-4 space-y-2">
          {MODES.map(({ icon: Icon, label, time, cost, note }) => (
            <button
              key={label}
              className="w-full dark-card rounded-xl p-3 flex items-center gap-3 text-left hover:bg-white/[0.04] transition-colors"
            >
              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-glow" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-semibold text-white">{label}</p>
                  <p className="text-[10px] font-bold text-glow">{time}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-dark-muted">{note}</p>
                  <p className="text-[10px] text-white/60">{cost}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
