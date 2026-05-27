import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  flightNumber: string;
  date: string; // YYYY-MM-DD
}

const STATUS: Record<string, { label: string; cls: string }> = {
  scheduled: { label: "On Time", cls: "bg-[#10B981]/15 text-[#10B981]" },
  active: { label: "In Air", cls: "bg-[#3B82F6]/15 text-[#3B82F6]" },
  landed: { label: "Landed", cls: "bg-muted text-foreground/70" },
  delayed: { label: "Delayed", cls: "bg-[#F59E0B]/15 text-[#F59E0B]" },
  cancelled: { label: "Cancelled", cls: "bg-[#EF4444]/15 text-[#EF4444]" },
};

export default function FlightStatusCard({ flightNumber, date }: Props) {
  const [data, setData] = useState<any>(null);
  const [updatedAt, setUpdatedAt] = useState<number>(Date.now());
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    // Pull latest from flight_alerts last_status if user is tracking this flight, else attempt edge fn
    const { data: row } = await supabase
      .from("flight_alerts")
      .select("last_status, origin, destination")
      .eq("flight_number", flightNumber.replace(/\s/g, ""))
      .eq("departure_date", date)
      .maybeSingle();
    setData(row?.last_status ?? null);
    setUpdatedAt(Date.now());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [flightNumber, date]);

  const status = data?.flight_status ? STATUS[data.flight_status] ?? { label: data.flight_status, cls: "bg-muted text-foreground/70" } : { label: "Unknown", cls: "bg-muted text-foreground/70" };
  const dep = data?.departure ?? {};
  const arr = data?.arrival ?? {};
  const scheduled = dep.scheduled ? new Date(dep.scheduled).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";
  const estimated = dep.estimated ? new Date(dep.estimated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;
  const drift = estimated && estimated !== scheduled;
  const minsAgo = Math.max(0, Math.floor((Date.now() - updatedAt) / 60000));

  return (
    <div className="rounded-2xl border border-border bg-card p-4" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[16px] font-medium">{flightNumber}</span>
            {data?.airline?.name && <span className="text-[12px] text-muted-foreground">{data.airline.name}</span>}
          </div>
          <p className="mt-0.5 text-[13px] text-foreground/80">
            {dep.iata || "—"} → {arr.iata || "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${status.cls}`}>{status.label}</span>
          {dep.gate && <span className="text-[12px] text-foreground/80">Gate {dep.gate}</span>}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 text-[13px]">
        <div>
          <span className="text-muted-foreground">Scheduled </span>
          <span className="text-foreground">{scheduled}</span>
        </div>
        {estimated && (
          <div>
            <span className="text-muted-foreground">Estimated </span>
            <span className={drift ? "text-[#F59E0B]" : "text-foreground"}>{estimated}</span>
          </div>
        )}
      </div>
      {(dep.terminal || arr.terminal) && (
        <p className="mt-1 text-[12px] text-muted-foreground">
          {dep.terminal ? `Dep Terminal ${dep.terminal}` : ""} {arr.terminal ? `· Arr Terminal ${arr.terminal}` : ""}
        </p>
      )}
      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Last updated {minsAgo === 0 ? "just now" : `${minsAgo} min ago`}</span>
        <button onClick={load} className="flex items-center gap-1 hover:text-foreground" aria-label="Refresh">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>
    </div>
  );
}
