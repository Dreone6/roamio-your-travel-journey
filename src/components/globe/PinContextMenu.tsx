import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Lock, Users, Globe as GlobeIcon, Trash2, Image, Navigation } from "lucide-react";
import type { MapPin, Visibility } from "@/data/types";

interface Props {
  pin: MapPin | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onChangeVisibility: (v: Visibility) => void;
  onDelete: () => void;
  onViewPhoto?: () => void;
  onViewTrip?: () => void;
}

export default function PinContextMenu({
  pin, open, onOpenChange, onChangeVisibility, onDelete, onViewPhoto, onViewTrip,
}: Props) {
  if (!pin) return null;

  const Item = ({ icon: Icon, label, onClick, danger }: { icon: any; label: string; onClick: () => void; danger?: boolean }) => (
    <button
      onClick={() => { onClick(); onOpenChange(false); }}
      className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/5"
    >
      <Icon className="h-4 w-4 shrink-0" style={{ color: danger ? "#EF4444" : "#94A3B8", strokeWidth: 1.5 }} />
      <span className="text-[14px] font-medium" style={{ color: danger ? "#EF4444" : "#FFFFFF" }}>
        {label}
      </span>
    </button>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="dark-immersive border-t border-white/[0.06] rounded-t-3xl p-0">
        <div className="px-5 pt-4 pb-2">
          <p className="text-[11px] uppercase tracking-wider text-[#94A3B8]">Pin actions</p>
          <p className="text-[15px] font-semibold text-white mt-0.5 truncate">{pin.label}</p>
        </div>
        <div className="divide-y divide-white/[0.04] mt-2">
          {pin.visibility !== "private" && (
            <Item icon={Lock} label="Make Private" onClick={() => onChangeVisibility("private")} />
          )}
          {pin.visibility !== "followers" && (
            <Item icon={Users} label="Share with Followers" onClick={() => onChangeVisibility("followers")} />
          )}
          {pin.visibility !== "public" && (
            <Item icon={GlobeIcon} label="Make Public" onClick={() => onChangeVisibility("public")} />
          )}
          {onViewPhoto && <Item icon={Image} label="View Photo" onClick={onViewPhoto} />}
          {onViewTrip && <Item icon={Navigation} label="View in Trip" onClick={onViewTrip} />}
          <Item icon={Trash2} label="Delete Pin" onClick={onDelete} danger />
        </div>
        <div className="h-6" />
      </SheetContent>
    </Sheet>
  );
}
