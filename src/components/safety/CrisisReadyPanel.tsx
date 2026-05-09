import { useEffect, useState } from "react";
import {
  ChevronLeft, ShieldCheck, LifeBuoy, FileLock2, Globe2, Phone,
  CheckCircle2, Circle, MapPin, Clock, Sparkles, Lock, Info,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import TrustedContactsList from "./TrustedContactsList";

interface Props {
  onBack: () => void;
}

const STORAGE_KEY = "roavr.crisis-ready.v1";

const DEFAULT_CHECKLIST = [
  "Passport copy",
  "Travel insurance",
  "Medication",
  "Emergency cash",
  "Power bank",
  "Offline map",
  "Hotel address",
  "Embassy contact",
  "Backup lodging",
  "Transportation backup",
];

interface OfflineInfo {
  hotelAddress: string;
  embassyInfo: string;
  insuranceInfo: string;
  passportNotes: string;
  emergencyContacts: string;
  tripNotes: string;
}

const EMPTY_INFO: OfflineInfo = {
  hotelAddress: "",
  embassyInfo: "",
  insuranceInfo: "",
  passportNotes: "",
  emergencyContacts: "",
  tripNotes: "",
};

const SAFETY_CARDS = [
  { title: "Safety notes", desc: "Local advisories from verified sources will appear here.", icon: ShieldCheck },
  { title: "Health alerts", desc: "Region-specific health updates — placeholder, no medical advice.", icon: LifeBuoy },
  { title: "Travel disruptions", desc: "Strikes, weather and transit issues for your destinations.", icon: Globe2 },
  { title: "Local restrictions", desc: "Curfews, permits and entry rules — placeholder data.", icon: Info },
];

const FUTURE_CARDS = [
  { title: "Border restrictions", desc: "Live entry & exit rules per country" },
  { title: "Lockdown alerts", desc: "Calm, verified lockdown notices" },
  { title: "Quarantine planner", desc: "Plan stays around quarantine windows" },
  { title: "Evacuation options", desc: "Routes, flights and transit alternatives" },
  { title: "Verified alerts", desc: "Sourced from official agencies only" },
];

export default function CrisisReadyPanel({ onBack }: Props) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [info, setInfo] = useState<OfflineInfo>(EMPTY_INFO);
  const [lastSafe, setLastSafe] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setChecked(parsed.checked || {});
        setInfo({ ...EMPTY_INFO, ...(parsed.info || {}) });
        setLastSafe(parsed.lastSafe || null);
      }
    } catch {}
  }, []);

  const persist = (next: Partial<{ checked: Record<string, boolean>; info: OfflineInfo; lastSafe: string | null }>) => {
    const merged = { checked, info, lastSafe, ...next };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  };

  const toggle = (item: string) => {
    const next = { ...checked, [item]: !checked[item] };
    setChecked(next);
    persist({ checked: next });
  };

  const saveInfo = () => {
    persist({ info });
    toast.success("Saved for offline access");
  };

  const sendImSafe = () => {
    const ts = new Date().toISOString();
    setLastSafe(ts);
    persist({ lastSafe: ts });
    toast.success("‘I’m Safe’ update sent to trusted contacts");
  };

  const completed = DEFAULT_CHECKLIST.filter((i) => checked[i]).length;

  return (
    <div className="dark-immersive min-h-screen pb-24">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-dark-radial" />
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-emerald-500/5 blur-3xl" />
        <div className="relative px-5 pt-14 pb-5">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={onBack} className="h-9 w-9 rounded-xl dark-card-elevated flex items-center justify-center">
              <ChevronLeft className="h-4 w-4 text-white" />
            </button>
            <div className="flex-1">
              <p className="text-dark-muted text-[10px] font-bold tracking-[0.2em] uppercase">SafePass</p>
              <h1 className="font-heading text-[22px] font-bold text-white tracking-tight mt-0.5">Crisis Ready</h1>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-glow" />
            </div>
          </div>
          <p className="text-[12px] text-dark-muted leading-relaxed">
            Calm, smart preparedness for unexpected travel disruptions. Your essentials, ready offline.
          </p>
        </div>
      </div>

      <div className="px-5 space-y-6">
        {/* I'm Safe */}
        <div className="dark-card rounded-2xl p-5 space-y-3 border border-emerald-500/15">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-glow" />
            <h3 className="text-[13px] font-bold text-white">I’m Safe Check-In</h3>
          </div>
          <p className="text-[11px] text-dark-muted leading-relaxed">
            Send a quick reassurance update to your trusted contacts. No location is shared unless you enable it.
          </p>
          <Button onClick={sendImSafe} className="w-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30">
            Send “I’m Safe” update
          </Button>
          {lastSafe && (
            <p className="text-[10px] text-dark-muted flex items-center gap-1.5">
              <Clock className="h-3 w-3" /> Last sent {new Date(lastSafe).toLocaleString()}
            </p>
          )}
        </div>

        {/* Trusted contacts */}
        <TrustedContactsList />

        {/* Crisis Ready Checklist */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[12px] font-bold text-white flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-glow" /> Crisis Ready Checklist
            </h3>
            <span className="text-[10px] font-bold text-glow">{completed}/{DEFAULT_CHECKLIST.length}</span>
          </div>
          <div className="dark-card rounded-2xl p-2">
            {DEFAULT_CHECKLIST.map((item) => (
              <button
                key={item}
                onClick={() => toggle(item)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors text-left"
              >
                {checked[item] ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-white/20 shrink-0" />
                )}
                <span className={`text-[12px] ${checked[item] ? "text-white/40 line-through" : "text-white"}`}>
                  {item}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Offline Emergency Info */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <FileLock2 className="h-3.5 w-3.5 text-glow" />
            <h3 className="text-[12px] font-bold text-white">Offline Emergency Info</h3>
          </div>
          <p className="text-[10px] text-dark-muted">Saved on this device for offline access.</p>
          <div className="dark-card rounded-2xl p-4 space-y-3">
            {[
              { key: "hotelAddress", label: "Hotel address", placeholder: "Hotel name, street, city" },
              { key: "embassyInfo", label: "Embassy info", placeholder: "Embassy name, phone, address" },
              { key: "insuranceInfo", label: "Insurance info", placeholder: "Provider, policy #, hotline" },
              { key: "passportNotes", label: "Passport notes", placeholder: "Number, issue/expiry, location of copy" },
              { key: "emergencyContacts", label: "Emergency contacts", placeholder: "Names and phone numbers" },
              { key: "tripNotes", label: "Key trip details", placeholder: "Flights, transfers, important notes" },
            ].map((f) => (
              <div key={f.key} className="space-y-1">
                <label className="text-[10px] font-bold text-dark-muted uppercase tracking-wider">{f.label}</label>
                <Textarea
                  rows={2}
                  placeholder={f.placeholder}
                  value={(info as any)[f.key]}
                  onChange={(e) => setInfo({ ...info, [f.key]: e.target.value } as OfflineInfo)}
                  className="bg-white/[0.03] border-white/[0.06] text-[12px] text-white"
                />
              </div>
            ))}
            <Button onClick={saveInfo} className="w-full" size="sm">Save offline</Button>
          </div>
        </div>

        {/* Destination Safety Notes (placeholders) */}
        <div className="space-y-3">
          <h3 className="text-[12px] font-bold text-white flex items-center gap-2">
            <Globe2 className="h-3.5 w-3.5 text-glow" /> Destination Safety Notes
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {SAFETY_CARDS.map((c) => (
              <div key={c.title} className="dark-card rounded-2xl p-3.5 space-y-2">
                <c.icon className="h-4 w-4 text-glow" />
                <p className="text-[12px] font-semibold text-white">{c.title}</p>
                <p className="text-[10px] text-dark-muted leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-dark-muted px-1">
            Placeholder content. Future updates will pull from verified official sources.
          </p>
        </div>

        {/* Emergency Help Screen */}
        <div className="space-y-3">
          <h3 className="text-[12px] font-bold text-white flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-rose-400" /> Emergency Help
          </h3>
          <div className="dark-card rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-semibold text-white">Local emergency number</p>
                <p className="text-[10px] text-dark-muted">Auto-detected from your destination</p>
              </div>
              <span className="text-[11px] font-bold text-rose-300">— —</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-semibold text-white">Embassy</p>
                <p className="text-[10px] text-dark-muted">Nearest consulate placeholder</p>
              </div>
              <span className="text-[11px] font-bold text-dark-muted">Add in Offline Info</span>
            </div>
            <Button variant="outline" size="sm" className="w-full border-white/10 bg-white/[0.02]">
              <MapPin className="h-3.5 w-3.5 mr-1.5" /> Share my location (concept)
            </Button>
          </div>
        </div>

        {/* Future Crisis Mode */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[12px] font-bold text-white flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-glow" /> Crisis Mode
            </h3>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white/[0.06] text-dark-muted flex items-center gap-1">
              <Lock className="h-2.5 w-2.5" /> Coming soon
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {FUTURE_CARDS.map((c) => (
              <div key={c.title} className="dark-card rounded-xl p-3.5 flex items-start gap-3 opacity-60">
                <div className="h-8 w-8 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                  <Lock className="h-3.5 w-3.5 text-dark-muted" />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-white">{c.title}</p>
                  <p className="text-[10px] text-dark-muted">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-dark-muted px-1 leading-relaxed">
            We’re building Crisis Mode with verified sources. No health claims or medical advice — just clear, calm information when you need it.
          </p>
        </div>
      </div>
    </div>
  );
}
