import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, PencilLine, Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import ManualBookingForm from "./ManualBookingForm";
import BookingsList from "./BookingsList";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tripId?: string;
}

export default function BookingImportSheet({ open, onOpenChange, tripId }: Props) {
  const { user } = useAuth();
  const [mode, setMode] = useState<"menu" | "manual">("menu");
  const [refreshKey, setRefreshKey] = useState(0);

  const forwardEmail = `bookings+${user?.id?.slice(0, 8) || "you"}@roavr.app`;

  const copy = () => {
    navigator.clipboard.writeText(forwardEmail);
    toast.success("Email copied");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="dark-immersive border-white/10 max-h-[88vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-white font-heading">Import bookings</SheetTitle>
        </SheetHeader>

        {mode === "manual" ? (
          <div className="mt-4">
            <ManualBookingForm
              tripId={tripId}
              onBack={() => setMode("menu")}
              onSaved={() => { setRefreshKey((k) => k + 1); setMode("menu"); }}
            />
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <button
              onClick={() => setMode("manual")}
              className="w-full dark-card rounded-2xl p-4 flex items-center gap-3 text-left hover:bg-white/[0.04] transition-colors"
            >
              <div className="h-10 w-10 rounded-xl gradient-glow flex items-center justify-center glow-accent">
                <PencilLine className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-white">Manual add</p>
                <p className="text-[11px] text-dark-muted">Enter flight, hotel, car or any reservation</p>
              </div>
            </button>

            <div className="dark-card rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-glow" />
                <p className="text-[13px] font-semibold text-white">Forward booking email</p>
              </div>
              <p className="text-[11px] text-dark-muted">
                Forward your confirmation emails to this address and Roavr will parse them into your trip.
              </p>
              <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2">
                <code className="text-[11px] text-glow flex-1 truncate">{forwardEmail}</code>
                <button onClick={copy} className="p-1.5 hover:bg-white/5 rounded-lg">
                  <Copy className="h-3.5 w-3.5 text-dark-muted" />
                </button>
              </div>
              <p className="text-[10px] text-dark-muted flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Supports flights, hotels, cars, tours, restaurants, transfers, trains, buses, events
              </p>
            </div>

            <div>
              <p className="text-[10px] font-bold text-dark-muted uppercase tracking-wider mb-2">Your bookings</p>
              <BookingsList tripId={tripId} refreshKey={refreshKey} />
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
