import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const ALERT_TYPES = [
  { id: "gate_change", label: "Gate changes" },
  { id: "departure_delay", label: "Departure delay" },
  { id: "arrival_delay", label: "Arrival delay" },
  { id: "cancellation", label: "Cancellation alert" },
  { id: "baggage", label: "Baggage carousel" },
];

const DELAY_OPTIONS = [
  { id: "delay_15", label: "15 min" },
  { id: "delay_30", label: "30 min" },
  { id: "delay_60", label: "1 hour" },
];

const FLIGHT_RE = /^[A-Z]{2}\s?\d{1,4}$/;

export default function AddFlightAlertSheet({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { user } = useAuth();
  const [flight, setFlight] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [types, setTypes] = useState<string[]>(["gate_change", "departure_delay"]);
  const [delayThreshold, setDelayThreshold] = useState("delay_30");
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const toggle = (id: string) => setTypes((t) => (t.includes(id) ? t.filter((x) => x !== id) : [...t, id]));

  const submit = async () => {
    const clean = flight.trim().toUpperCase().replace(/\s+/g, " ");
    if (!FLIGHT_RE.test(clean)) {
      toast.error("Invalid flight number (e.g. AA 1234)");
      return;
    }
    if (!user) return;
    setSaving(true);
    const finalTypes = types.includes("departure_delay") ? [...types, delayThreshold] : types;
    const { error } = await supabase.from("flight_alerts").insert({
      user_id: user.id,
      flight_number: clean.replace(/\s/g, ""),
      departure_date: date,
      alert_types: finalTypes,
      active: true,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast(`Tracking ${clean} on ${new Date(date).toLocaleDateString()}.`);
    setFlight("");
    setTypes(["gate_change", "departure_delay"]);
    onCreated();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[70] bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-[71] rounded-t-3xl bg-card p-5"
            style={{ height: "75vh", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 300 }}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted" />
            <h3 className="mb-5 font-display text-[18px] font-semibold">Add flight alert</h3>

            <label className="block text-[12px] font-medium text-muted-foreground">Flight number</label>
            <input
              value={flight}
              onChange={(e) => setFlight(e.target.value.toUpperCase())}
              placeholder="AA 1234"
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-3 font-mono text-[15px] uppercase outline-none focus:border-[#3B82F6]"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
            />

            <label className="mt-4 block text-[12px] font-medium text-muted-foreground">Date</label>
            <input
              type="date"
              value={date}
              min={today}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-3.5 py-3 text-[14px] outline-none focus:border-[#3B82F6]"
            />

            <label className="mt-4 block text-[12px] font-medium text-muted-foreground">Notify me about</label>
            <div className="mt-2 space-y-2 overflow-y-auto" style={{ maxHeight: "30vh" }}>
              {ALERT_TYPES.map((t) => (
                <div key={t.id}>
                  <button
                    onClick={() => toggle(t.id)}
                    className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-[14px] ${
                      types.includes(t.id) ? "border-[#3B82F6] bg-[#3B82F6]/10" : "border-border bg-background"
                    }`}
                  >
                    <span>{t.label}</span>
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        types.includes(t.id) ? "border-[#3B82F6] bg-[#3B82F6] text-white" : "border-muted-foreground"
                      }`}
                    >
                      {types.includes(t.id) ? "✓" : ""}
                    </span>
                  </button>
                  {t.id === "departure_delay" && types.includes("departure_delay") && (
                    <div className="mt-2 flex gap-2 pl-2">
                      {DELAY_OPTIONS.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => setDelayThreshold(d.id)}
                          className={`rounded-full px-3 py-1 text-[12px] ${
                            delayThreshold === d.id ? "bg-[#3B82F6] text-white" : "bg-muted/40 text-foreground/70"
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={submit}
              disabled={saving}
              className="mt-5 w-full rounded-full bg-[#3B82F6] py-3.5 text-[15px] font-medium text-white hover:bg-[#2563EB] disabled:opacity-60"
            >
              {saving ? "Saving…" : "Track flight"}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
