import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Plus, Plane, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import AddFlightAlertSheet from "./AddFlightAlertSheet";

interface Alert {
  id: string;
  flight_number: string;
  origin: string | null;
  destination: string | null;
  departure_date: string | null;
  alert_types: string[] | null;
  last_status: any;
}

const STATUS_COLOR: Record<string, string> = {
  active: "bg-[#10B981]/15 text-[#10B981]",
  scheduled: "bg-[#10B981]/15 text-[#10B981]",
  delayed: "bg-[#F59E0B]/15 text-[#F59E0B]",
  cancelled: "bg-[#EF4444]/15 text-[#EF4444]",
};

function statusLabel(s: any): { label: string; key: string } {
  const raw = s?.flight_status || s?.status;
  if (!raw) return { label: "Unknown", key: "unknown" };
  if (raw === "scheduled" || raw === "active") return { label: "On Time", key: "active" };
  if (raw === "cancelled") return { label: "Cancelled", key: "cancelled" };
  if (raw === "delayed") return { label: "Delayed", key: "delayed" };
  return { label: raw, key: "unknown" };
}

export default function FlightAlertsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("flight_alerts")
      .select("*")
      .eq("user_id", user.id)
      .eq("active", true)
      .order("departure_date", { ascending: true });
    setAlerts((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (open) load();
  }, [open, user]);

  const remove = async (id: string) => {
    await supabase.from("flight_alerts").update({ active: false }).eq("id", id);
    setAlerts((a) => a.filter((x) => x.id !== id));
    toast("Alert removed");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] bg-background"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 280 }}
        >
          <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border/60 bg-background/95 px-4 backdrop-blur">
            <button onClick={onClose} className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted/40">
              <X size={22} strokeWidth={1.75} />
            </button>
            <h2 className="font-display text-[17px] font-semibold tracking-tight">Flight alerts</h2>
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-1.5 rounded-full bg-[#3B82F6] px-3.5 py-1.5 text-[13px] font-medium text-white hover:bg-[#2563EB]"
            >
              <Plus size={15} strokeWidth={2} /> Add
            </button>
          </header>

          <div className="px-4 pt-4 pb-24">
            {loading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted/30" />
                ))}
              </div>
            ) : alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-muted/30">
                  <Plane size={28} strokeWidth={1.5} className="text-muted-foreground" />
                </div>
                <p className="text-[15px] text-foreground">No active flight alerts</p>
                <p className="mb-6 mt-1 text-[13px] text-muted-foreground">Get notified about delays, gate changes, and more.</p>
                <button
                  onClick={() => setAddOpen(true)}
                  className="rounded-full bg-[#3B82F6] px-5 py-2.5 text-[14px] font-medium text-white hover:bg-[#2563EB]"
                >
                  Track your first flight
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((a) => {
                  const st = statusLabel(a.last_status);
                  return (
                    <div
                      key={a.id}
                      className="rounded-2xl border border-border bg-card p-4"
                      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[15px] font-medium text-foreground">{a.flight_number}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOR[st.key] ?? "bg-muted text-muted-foreground"}`}>
                              {st.label}
                            </span>
                          </div>
                          <p className="mt-1 text-[13px] text-foreground/80">
                            {a.origin || "—"} → {a.destination || "—"}
                          </p>
                          <p className="mt-0.5 text-[12px] text-muted-foreground">
                            {a.departure_date ? new Date(a.departure_date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) : ""}
                          </p>
                          {a.alert_types && a.alert_types.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {a.alert_types.map((t) => (
                                <span key={t} className="rounded-full bg-muted/40 px-2 py-0.5 text-[10px] text-foreground/70">
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => remove(a.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                          aria-label="Delete alert"
                        >
                          <Trash2 size={16} strokeWidth={1.75} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <AddFlightAlertSheet
            open={addOpen}
            onClose={() => setAddOpen(false)}
            onCreated={() => {
              setAddOpen(false);
              load();
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
