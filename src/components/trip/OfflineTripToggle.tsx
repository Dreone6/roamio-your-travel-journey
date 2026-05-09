import { useEffect, useState } from "react";
import { CloudDownload, CheckCircle2, Crown } from "lucide-react";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";
import { saveTripOffline, isTripOffline, removeTripOffline } from "@/lib/offlineCache";

interface Props {
  tripId: string;
  tripData: any;
}

export default function OfflineTripToggle({ tripId, tripData }: Props) {
  const { tier } = useSubscription();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    isTripOffline(tripId).then(setSaved);
  }, [tripId]);

  const toggle = async () => {
    if (tier !== "pro") {
      toast.info("Offline mode is a Roavr Plus feature. Try it free during your trial.");
      return;
    }
    setBusy(true);
    try {
      if (saved) {
        await removeTripOffline(tripId);
        setSaved(false);
        toast.success("Removed from offline");
      } else {
        await saveTripOffline(tripId, tripData);
        setSaved(true);
        toast.success("Saved for offline use");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className="w-full dark-card rounded-xl p-3 flex items-center gap-3 hover:bg-white/[0.04] transition-colors text-left"
    >
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${saved ? "bg-emerald-500/15" : "bg-white/5"}`}>
        {saved ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <CloudDownload className="h-4 w-4 text-glow" />}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-[12px] font-semibold text-white">{saved ? "Saved offline" : "Save for offline"}</p>
          {tier !== "pro" && <Crown className="h-3 w-3 text-amber-400" />}
        </div>
        <p className="text-[10px] text-dark-muted">
          Itinerary, bookings, map pins, hotel address, emergency contacts, phrases & currency
        </p>
      </div>
    </button>
  );
}
