import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield, ChevronLeft, Settings as SettingsIcon, CheckCircle2, Circle,
  AlertTriangle, Globe2, Bell, Clock, Calendar, Phone, Building2,
  HeartPulse, MapPin, Share2, MessageSquare, Plus, X, ChevronRight,
  Wifi, WifiOff, Plane,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

// ─── tokens ────────────────────────────────────────────────
const C = {
  bg: "#080D1A",
  surface: "#111827",
  elevated: "#1A2236",
  border: "#1E2A3F",
  blue: "#3B82F6",
  blueHover: "#2563EB",
  text: "#FFFFFF",
  text2: "#94A3B8",
  text3: "#4B5563",
  green: "#10B981",
  yellow: "#F59E0B",
  red: "#EF4444",
};

type Tab = "prepare" | "monitor" | "respond";
type ItemStatus = "ok" | "missing" | "na";

interface ChecklistItem {
  id: string;
  label: string;
  detail: string;
  tier: "critical" | "important";
  done: boolean;
  status?: ItemStatus;
}

interface Contact { id: string; name: string; phone: string; relationship: string; }

const STORAGE_KEY = "roavr.safepass.v1";

// Canonical trip context — California
const TRIP = {
  name: "Trip to California",
  destination: "California, USA",
  countryCode: "US",
  homeCountry: "United Kingdom",
  departure: new Date(Date.now() + 1000 * 60 * 60 * 26), // ~26h away
  emergencyNumber: "911",
  embassy: {
    name: "British Consulate-General, Los Angeles",
    address: "2029 Century Park East, Suite 1350, Los Angeles, CA 90067",
    phone: "+1 310-789-0031",
  },
  plugType: "Type A/B (USA)",
};

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: "passport", label: "Passport / ID", detail: "Valid · expires 2029-04-12 (6+ months ✓)", tier: "critical", done: true, status: "ok" },
  { id: "visa", label: "Visa / Travel Authorization", detail: "ESTA required for USA — not yet approved", tier: "critical", done: false, status: "missing" },
  { id: "flight", label: "Flight confirmation", detail: "BA279 · LHR → LAX · imported to Trips", tier: "critical", done: true, status: "ok" },
  { id: "insurance", label: "Travel insurance", detail: "Upload policy or confirm active cover", tier: "critical", done: false, status: "missing" },
  { id: "payment", label: "International payment method", detail: "Confirm card works abroad", tier: "critical", done: true, status: "ok" },
  { id: "contacts", label: "Emergency contacts", detail: "2 contacts added", tier: "critical", done: true, status: "ok" },

  { id: "address", label: "Accommodation address (offline)", detail: "Hotel Casa del Mar saved to trip", tier: "important", done: true },
  { id: "numbers", label: "Local emergency numbers", detail: "Loaded: 911 (Police · Fire · Ambulance)", tier: "important", done: true },
  { id: "maps", label: "Offline maps downloaded", detail: "Los Angeles · Big Sur — not downloaded", tier: "important", done: false },
  { id: "currency", label: "Destination currency plan", detail: "USD · confirm card or exchange", tier: "important", done: true },
  { id: "phone", label: "International phone plan", detail: "Confirm roaming or eSIM", tier: "important", done: false },
  { id: "copies", label: "Document copies saved", detail: "Passport photo not uploaded", tier: "important", done: false },
  { id: "adapter", label: "Plug adapter", detail: "Destination uses Type A/B — pack adapter", tier: "important", done: false },
];

const DEFAULT_CONTACTS: Contact[] = [
  { id: "c1", name: "Sarah Pelissier", phone: "+44 7700 900123", relationship: "Family" },
  { id: "c2", name: "James Holt", phone: "+44 7700 900456", relationship: "Friend" },
];

interface MedicalInfo {
  bloodType: string;
  allergies: string;
  medications: string;
  conditions: string;
}

const EMPTY_MEDICAL: MedicalInfo = { bloodType: "", allergies: "", medications: "", conditions: "" };

interface ReminderPrefs {
  r24: boolean;
  r12: boolean;
  rFinal: 3 | 3.5 | 4;
  notifyOnDepart: boolean;
}

const DEFAULT_REMINDERS: ReminderPrefs = { r24: true, r12: true, rFinal: 3.5, notifyOnDepart: false };

interface CheckInPrefs {
  enabled: boolean;
  cadence: 12 | 24 | 48;
}

// ─── small helpers ─────────────────────────────────────────
const ring = (color: string) => ({ boxShadow: `0 0 0 2px ${color}33 inset` });

function StatusDot({ color }: { color: string }) {
  return <span className="inline-block w-2 h-2 rounded-full" style={{ background: color }} />;
}

function Pill({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold"
      style={{ background: bg, color, fontSize: 11, letterSpacing: 0.2 }}
    >
      {children}
    </span>
  );
}

// ─── PAGE ──────────────────────────────────────────────────
export default function SafePassPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("prepare");
  const [checklist, setChecklist] = useState<ChecklistItem[]>(DEFAULT_CHECKLIST);
  const [contacts, setContacts] = useState<Contact[]>(DEFAULT_CONTACTS);
  const [medical, setMedical] = useState<MedicalInfo>(EMPTY_MEDICAL);
  const [reminders, setReminders] = useState<ReminderPrefs>(DEFAULT_REMINDERS);
  const [checkIn, setCheckIn] = useState<CheckInPrefs>({ enabled: false, cadence: 24 });
  const [setupOpen, setSetupOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const [medicalOpen, setMedicalOpen] = useState(false);
  const [embassyOpen, setEmbassyOpen] = useState(false);
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  // hydrate
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p.checklist) setChecklist(p.checklist);
        if (p.contacts) setContacts(p.contacts);
        if (p.medical) setMedical(p.medical);
        if (p.reminders) setReminders(p.reminders);
        if (p.checkIn) setCheckIn(p.checkIn);
      } else {
        // first-time → setup
        setSetupOpen(true);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  const persist = (next: Partial<{ checklist: ChecklistItem[]; contacts: Contact[]; medical: MedicalInfo; reminders: ReminderPrefs; checkIn: CheckInPrefs }>) => {
    const merged = { checklist, contacts, medical, reminders, checkIn, ...next };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  };

  // ─── derived ─────────────────────────────────────────────
  const critical = checklist.filter(i => i.tier === "critical");
  const important = checklist.filter(i => i.tier === "important");
  const criticalDone = critical.filter(i => i.done).length;
  const importantDone = important.filter(i => i.done).length;
  const criticalAllDone = criticalDone === critical.length;

  const hoursUntilDeparture = (TRIP.departure.getTime() - Date.now()) / (1000 * 60 * 60);
  const departureSoon = hoursUntilDeparture < 12;

  const overallStatus: "green" | "yellow" | "red" =
    !criticalAllDone && departureSoon ? "red"
      : !criticalAllDone || importantDone < important.length ? "yellow"
        : "green";

  const statusColor = overallStatus === "green" ? C.green : overallStatus === "yellow" ? C.yellow : C.red;
  const prepareDot = criticalAllDone ? C.green : (criticalDone / Math.max(critical.length, 1)) > 0.5 ? C.yellow : C.red;
  const monitorDot = checkIn.enabled ? C.green : C.text3;
  const respondDot = contacts.length > 0 ? C.green : C.red;

  const tripCountdown = useMemo(() => {
    const ms = TRIP.departure.getTime() - Date.now();
    if (ms < 0) return "departed";
    const h = Math.floor(ms / (1000 * 60 * 60));
    if (h < 24) return `Departure in ${h}h`;
    return `Departure in ${Math.floor(h / 24)}d`;
  }, []);

  // ─── actions ─────────────────────────────────────────────
  const toggleItem = (id: string) => {
    const next = checklist.map(i => i.id === id ? { ...i, done: !i.done } : i);
    setChecklist(next);
    persist({ checklist: next });
  };

  const addContact = () => {
    const next = [...contacts, { id: crypto.randomUUID(), name: "", phone: "", relationship: "Family" }];
    setContacts(next);
    persist({ contacts: next });
  };

  const updateContact = (id: string, patch: Partial<Contact>) => {
    const next = contacts.map(c => c.id === id ? { ...c, ...patch } : c);
    setContacts(next);
    persist({ contacts: next });
  };

  const removeContact = (id: string) => {
    const next = contacts.filter(c => c.id !== id);
    setContacts(next);
    persist({ contacts: next });
  };

  const sendSOS = () => {
    setSosOpen(false);
    if (!online) {
      toast.error("SOS queued — will send when connected", { duration: 4000 });
      return;
    }
    toast.success(`SOS sent to ${contacts.length} contact${contacts.length === 1 ? "" : "s"}`, { duration: 4000 });
  };

  const callEmergency = () => {
    window.location.href = `tel:${TRIP.emergencyNumber}`;
  };

  const shareLocation = async () => {
    const text = `My location: https://maps.google.com/?q=34.0195,-118.4912 (approximate)`;
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); toast.success("Location copied"); }
    } catch {}
  };

  // ─── render ──────────────────────────────────────────────
  return (
    <div className="min-h-dvh pb-12" style={{ background: C.bg, color: C.text, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Drag handle (sheet aesthetic) */}
      <div className="pt-3 flex justify-center">
        <div style={{ width: 32, height: 4, borderRadius: 999, background: C.border }} />
      </div>

      {/* Header */}
      <header className="px-5 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="h-9 w-9 rounded-xl flex items-center justify-center"
            style={{ background: C.elevated, border: `1px solid ${C.border}` }}
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <div className="flex-1 flex items-center gap-2">
            <Shield className="h-6 w-6" style={{ color: C.blue }} strokeWidth={1.5} />
            <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: 28, fontWeight: 700, letterSpacing: -0.5 }}>SafePass</h1>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="SafePass settings"
            className="h-9 w-9 rounded-xl flex items-center justify-center"
            style={{ background: C.elevated, border: `1px solid ${C.border}` }}
          >
            <SettingsIcon className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
        <p className="mt-2" style={{ color: C.text2, fontSize: 14, letterSpacing: 0.1 }}>
          Your 3-point travel safety system
        </p>
      </header>

      {/* Trip context */}
      <section className="px-5 mt-1">
        <div
          className="flex items-center gap-3"
          style={{ background: C.surface, borderRadius: 16, padding: "12px 16px", border: `1px solid ${C.border}` }}
        >
          <div className="h-9 w-9 rounded-full flex items-center justify-center" style={{ ...ring(statusColor), background: `${statusColor}1A` }}>
            <Plane className="h-4 w-4" style={{ color: statusColor }} strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate" style={{ fontSize: 14, fontWeight: 600 }}>Active trip: {TRIP.name}</p>
            <p style={{ color: C.text2, fontSize: 12, letterSpacing: 0.2 }}>{tripCountdown} · {TRIP.destination}</p>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <nav className="px-5 mt-5 flex gap-2" role="tablist">
        {([
          { key: "prepare", label: "Prepare", dot: prepareDot },
          { key: "monitor", label: "Monitor", dot: monitorDot },
          { key: "respond", label: "Respond", dot: respondDot },
        ] as { key: Tab; label: string; dot: string }[]).map(t => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className="flex-1 flex items-center justify-center gap-2 transition-colors"
              style={{
                height: 40,
                borderRadius: 999,
                background: active ? C.blue : "transparent",
                color: active ? C.text : C.text2,
                border: active ? "none" : `1px solid ${C.border}`,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <StatusDot color={t.dot} />
              {t.label}
            </button>
          );
        })}
      </nav>

      {/* Offline banner */}
      {!online && (
        <div className="mx-5 mt-4 flex items-center gap-2 rounded-2xl px-4 py-3" style={{ background: `${C.yellow}1A`, border: `1px solid ${C.yellow}40` }}>
          <WifiOff className="h-4 w-4" style={{ color: C.yellow }} strokeWidth={1.5} />
          <p style={{ fontSize: 12, color: C.yellow }}>Offline — Respond tab still works. SOS will queue and fire on reconnect.</p>
        </div>
      )}

      {/* Tab content */}
      <main className="px-5 pt-6">
        {tab === "prepare" && (
          <PrepareTab
            critical={critical}
            important={important}
            criticalDone={criticalDone}
            onToggle={toggleItem}
          />
        )}
        {tab === "monitor" && <MonitorTab checkIn={checkIn} setCheckIn={(v) => { setCheckIn(v); persist({ checkIn: v }); }} />}
        {tab === "respond" && (
          <RespondTab
            contacts={contacts}
            onSOS={() => setSosOpen(true)}
            onCallEmergency={callEmergency}
            onOpenEmbassy={() => setEmbassyOpen(true)}
            onOpenMedical={() => setMedicalOpen(true)}
            onShareLocation={shareLocation}
            onAddContact={addContact}
            onMessageContact={(c) => {
              if (c.phone) window.location.href = `sms:${c.phone}`;
              else toast.error(`${c.name} has no phone number saved`);
            }}


          />
        )}
      </main>

      {/* SOS confirmation */}
      {sosOpen && (
        <Sheet onClose={() => setSosOpen(false)}>
          <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 600, letterSpacing: -0.3 }}>Send SOS?</h2>
          <p className="mt-1" style={{ color: C.text2, fontSize: 14 }}>
            We'll send the following to {contacts.length} contact{contacts.length === 1 ? "" : "s"}:
          </p>
          <div className="mt-4 rounded-2xl p-4 space-y-1" style={{ background: C.elevated, border: `1px solid ${C.border}`, fontSize: 12, color: C.text2 }}>
            <p><strong style={{ color: C.text }}>Andre needs help.</strong></p>
            <p>Location: 34.0195, -118.4912 (Los Angeles)</p>
            <p>Trip: {TRIP.name}, {TRIP.destination}</p>
            <p>Accommodation: Hotel Casa del Mar</p>
            <p>Time: {new Date().toLocaleTimeString()}</p>
          </div>
          <button
            onClick={sendSOS}
            className="mt-5 w-full rounded-full font-semibold"
            style={{ background: C.red, color: C.text, height: 52, fontSize: 16 }}
          >
            Confirm — Send SOS
          </button>
          <button onClick={() => setSosOpen(false)} className="mt-2 w-full font-semibold" style={{ color: C.blue, fontSize: 14, height: 44 }}>
            Cancel
          </button>
        </Sheet>
      )}

      {/* Embassy */}
      {embassyOpen && (
        <Sheet onClose={() => setEmbassyOpen(false)}>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5" style={{ color: C.blue }} strokeWidth={1.5} />
            <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 600, letterSpacing: -0.3 }}>Nearest embassy</h2>
          </div>
          <div className="mt-4 space-y-2" style={{ fontSize: 14 }}>
            <p style={{ fontWeight: 600 }}>{TRIP.embassy.name}</p>
            <p style={{ color: C.text2 }}>{TRIP.embassy.address}</p>
            <p style={{ color: C.text2 }}>{TRIP.embassy.phone}</p>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <a href={`tel:${TRIP.embassy.phone}`} className="rounded-full font-semibold flex items-center justify-center gap-2" style={{ background: C.blue, color: C.text, height: 48 }}>
              <Phone className="h-4 w-4" strokeWidth={1.5} /> Call
            </a>
            <a target="_blank" rel="noreferrer" href={`https://maps.google.com/?q=${encodeURIComponent(TRIP.embassy.address)}`} className="rounded-full font-semibold flex items-center justify-center gap-2" style={{ background: C.elevated, color: C.text, border: `1px solid ${C.border}`, height: 48 }}>
              <MapPin className="h-4 w-4" strokeWidth={1.5} /> Directions
            </a>
          </div>
        </Sheet>
      )}

      {/* Medical card (full screen) */}
      {medicalOpen && (
        <div className="fixed inset-0 z-50" style={{ background: C.text }}>
          <div className="px-6 pt-12 pb-8 max-w-md mx-auto" style={{ color: "#0B0B0B", fontFamily: "'DM Sans', sans-serif" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HeartPulse className="h-6 w-6" style={{ color: C.red }} strokeWidth={2} />
                <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" }}>Medical card</p>
              </div>
              <button onClick={() => setMedicalOpen(false)} aria-label="Close" className="h-9 w-9 rounded-full flex items-center justify-center" style={{ background: "#F1F5F9" }}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <h1 className="mt-6" style={{ fontFamily: "'Sora', sans-serif", fontSize: 32, fontWeight: 700, letterSpacing: -0.5 }}>
              Andre A Pelissier
            </h1>
            <p className="mt-1" style={{ fontSize: 14, color: "#475569" }}>Show this to first responders</p>

            <div className="mt-6 space-y-4">
              <Field label="Blood type" value={medical.bloodType || "Not set"} />
              <Field label="Allergies" value={medical.allergies || "None recorded"} />
              <Field label="Current medications" value={medical.medications || "None recorded"} />
              <Field label="Conditions" value={medical.conditions || "None recorded"} />
              <Field label="Emergency contact" value={contacts[0] ? `${contacts[0].name} · ${contacts[0].phone}` : "Not set"} />
            </div>

            <button
              onClick={() => setMedicalOpen(false)}
              className="mt-8 w-full rounded-full font-semibold"
              style={{ background: "#0B0B0B", color: C.text, height: 52, fontSize: 16 }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Settings */}
      {settingsOpen && (
        <Sheet onClose={() => setSettingsOpen(false)}>
          <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 600, letterSpacing: -0.3 }}>SafePass settings</h2>
          <div className="mt-5 space-y-4">
            <SettingRow
              label="24-hour reminder"
              description="Notify when online check-in opens"
              checked={reminders.r24}
              onChange={(v) => { const next = { ...reminders, r24: v }; setReminders(next); persist({ reminders: next }); }}
            />
            <SettingRow
              label="12-hour checklist"
              description="Full checklist nudge"
              checked={reminders.r12}
              onChange={(v) => { const next = { ...reminders, r12: v }; setReminders(next); persist({ reminders: next }); }}
            />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600 }}>Final reminder</p>
              <p style={{ fontSize: 12, color: C.text2 }}>How long before departure</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {([3, 3.5, 4] as const).map(v => (
                  <button
                    key={v}
                    onClick={() => { const next = { ...reminders, rFinal: v }; setReminders(next); persist({ reminders: next }); }}
                    className="rounded-full font-semibold"
                    style={{
                      height: 40,
                      fontSize: 13,
                      background: reminders.rFinal === v ? C.blue : "transparent",
                      color: reminders.rFinal === v ? C.text : C.text2,
                      border: reminders.rFinal === v ? "none" : `1px solid ${C.border}`,
                    }}
                  >
                    {v}h
                  </button>
                ))}
              </div>
            </div>
            <SettingRow
              label="Notify contacts on departure"
              description="Auto-message when you depart"
              checked={reminders.notifyOnDepart}
              onChange={(v) => { const next = { ...reminders, notifyOnDepart: v }; setReminders(next); persist({ reminders: next }); }}
            />
            <button
              onClick={() => { setSettingsOpen(false); setSetupOpen(true); }}
              className="w-full text-left rounded-2xl px-4 py-3 flex items-center justify-between"
              style={{ background: C.elevated, border: `1px solid ${C.border}` }}
            >
              <div>
                <p style={{ fontSize: 13, fontWeight: 600 }}>Re-run setup</p>
                <p style={{ fontSize: 12, color: C.text2 }}>Update contacts and medical info</p>
              </div>
              <ChevronRight className="h-4 w-4" style={{ color: C.text2 }} strokeWidth={1.5} />
            </button>
          </div>
        </Sheet>
      )}

      {/* First-time setup */}
      {setupOpen && (
        <SetupWizard
          contacts={contacts}
          medical={medical}
          reminders={reminders}
          onContactsChange={(v) => { setContacts(v); }}
          onMedicalChange={(v) => { setMedical(v); }}
          onRemindersChange={(v) => { setReminders(v); }}
          onComplete={() => {
            persist({ contacts, medical, reminders });
            setSetupOpen(false);
            toast.success("SafePass activated");
          }}
          onClose={() => setSetupOpen(false)}
        />
      )}
    </div>
  );
}

// ─── Prepare ───────────────────────────────────────────────
function PrepareTab({
  critical, important, criticalDone, onToggle,
}: {
  critical: ChecklistItem[]; important: ChecklistItem[]; criticalDone: number;
  onToggle: (id: string) => void;
}) {
  const pct = Math.round((criticalDone / Math.max(critical.length, 1)) * 100);
  const done = criticalDone === critical.length;
  const ringColor = done ? C.green : pct > 50 ? C.yellow : C.red;

  return (
    <div className="space-y-6">
      {/* Completion ring */}
      <div className="rounded-3xl p-5 flex items-center gap-5" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
        <RingProgress percent={pct} color={ringColor} />
        <div className="flex-1">
          <p style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 600, letterSpacing: -0.3 }}>
            {criticalDone} of {critical.length} critical
          </p>
          <p style={{ color: C.text2, fontSize: 13 }}>
            {done ? "All critical items complete." : "Finish these before you board."}
          </p>
        </div>
      </div>

      <Section
        title="Critical"
        icon={<Shield className="h-4 w-4" style={{ color: C.red }} strokeWidth={1.5} />}
        helper={`${criticalDone}/${critical.length}`}
      >
        {critical.map(item => <ChecklistRow key={item.id} item={item} onToggle={onToggle} />)}
      </Section>

      <Section
        title="Recommended"
        icon={<Shield className="h-4 w-4" style={{ color: C.yellow }} strokeWidth={1.5} />}
        helper={`${important.filter(i => i.done).length}/${important.length}`}
      >
        {important.map(item => <ChecklistRow key={item.id} item={item} onToggle={onToggle} />)}
      </Section>
    </div>
  );
}

function ChecklistRow({ item, onToggle }: { item: ChecklistItem; onToggle: (id: string) => void }) {
  const chip =
    item.status === "ok" || item.done
      ? <Pill bg={`${C.green}1A`} color={C.green}>Ready</Pill>
      : item.status === "missing"
        ? <Pill bg={`${C.red}1A`} color={C.red}>Action</Pill>
        : <Pill bg={`${C.text3}33`} color={C.text2}>To-do</Pill>;

  return (
    <button
      onClick={() => onToggle(item.id)}
      className="w-full text-left flex items-start gap-3 rounded-2xl px-4 py-3 transition-colors"
      style={{ background: C.surface, border: `1px solid ${C.border}` }}
    >
      {item.done ? (
        <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: C.green }} strokeWidth={1.5} />
      ) : (
        <Circle className="h-5 w-5 shrink-0" style={{ color: C.text3 }} strokeWidth={1.5} />
      )}
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: 16, fontWeight: 600, color: item.done ? C.text2 : C.text, textDecoration: item.done ? "line-through" : "none" }}>
          {item.label}
        </p>
        <p className="mt-0.5" style={{ fontSize: 13, color: C.text2 }}>{item.detail}</p>
      </div>
      <div className="shrink-0">{chip}</div>
    </button>
  );
}

function Section({ title, icon, helper, children }: { title: string; icon: React.ReactNode; helper?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          {icon}
          <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: 14, fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase", color: C.text2 }}>{title}</h3>
        </div>
        {helper && <span style={{ fontSize: 12, color: C.text2, fontWeight: 600 }}>{helper}</span>}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function RingProgress({ percent, color }: { percent: number; color: string }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72">
      <circle cx="36" cy="36" r={r} stroke={C.border} strokeWidth="6" fill="none" />
      <circle
        cx="36" cy="36" r={r} stroke={color} strokeWidth="6" fill="none"
        strokeDasharray={c} strokeDashoffset={c - (c * percent) / 100}
        strokeLinecap="round" transform="rotate(-90 36 36)"
      />
      <text x="36" y="40" textAnchor="middle" fill={C.text} fontSize="16" fontWeight="700" fontFamily="Sora, sans-serif">
        {percent}%
      </text>
    </svg>
  );
}

// ─── Monitor ───────────────────────────────────────────────
function MonitorTab({ checkIn, setCheckIn }: { checkIn: CheckInPrefs; setCheckIn: (v: CheckInPrefs) => void }) {
  return (
    <div className="space-y-4">
      {/* Advisory */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe2 className="h-4 w-4" style={{ color: C.blue }} strokeWidth={1.5} />
            <p style={{ fontSize: 16, fontWeight: 600 }}>Travel Advisory</p>
          </div>
          <Pill bg={`${C.green}1A`} color={C.green}>Safe</Pill>
        </div>
        <p className="mt-2" style={{ fontSize: 14, color: C.text2 }}>
          Exercise normal precautions in California, USA. No active travel warnings for your destination.
        </p>
        <p className="mt-2" style={{ fontSize: 12, color: C.text3 }}>
          Source: UK Foreign, Commonwealth & Development Office · Updated 2h ago
        </p>
      </Card>

      {/* Check-in cadence */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" style={{ color: C.blue }} strokeWidth={1.5} />
            <p style={{ fontSize: 16, fontWeight: 600 }}>Safety Check-In</p>
          </div>
          <Switch checked={checkIn.enabled} onCheckedChange={(v) => setCheckIn({ ...checkIn, enabled: v })} />
        </div>
        {checkIn.enabled ? (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {([12, 24, 48] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setCheckIn({ ...checkIn, cadence: v })}
                  className="rounded-full font-semibold"
                  style={{
                    height: 40,
                    fontSize: 13,
                    background: checkIn.cadence === v ? C.blue : "transparent",
                    color: checkIn.cadence === v ? C.text : C.text2,
                    border: checkIn.cadence === v ? "none" : `1px solid ${C.border}`,
                  }}
                >
                  Every {v}h
                </button>
              ))}
            </div>
            <div style={{ fontSize: 13, color: C.text2 }}>
              Next check-in due in {checkIn.cadence}h. We'll nudge you, then escalate after 30 min, then auto-SOS after 60 min.
            </div>
          </div>
        ) : (
          <p className="mt-2" style={{ fontSize: 13, color: C.text2 }}>
            Get a quiet nudge at your chosen interval. Miss it and we escalate, then send SOS automatically.
          </p>
        )}
      </Card>

      {/* Local alerts */}
      <Card>
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4" style={{ color: C.blue }} strokeWidth={1.5} />
          <p style={{ fontSize: 16, fontWeight: 600 }}>Local Alerts</p>
        </div>
        <p className="mt-2" style={{ fontSize: 14, color: C.text2 }}>No alerts at your current location.</p>
        <p className="mt-1" style={{ fontSize: 12, color: C.text3 }}>Source: NWS · Cal OES</p>
      </Card>

      {/* Trip timeline */}
      <Card>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" style={{ color: C.blue }} strokeWidth={1.5} />
          <p style={{ fontSize: 16, fontWeight: 600 }}>Trip Timeline</p>
        </div>
        <p className="mt-2" style={{ fontSize: 14, color: C.text2 }}>{TRIP.name} · ends May 14, 2026</p>
        <p className="mt-1" style={{ fontSize: 12, color: C.text3 }}>We'll nudge you to confirm safe return when the trip ends.</p>
      </Card>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      {children}
    </div>
  );
}

// ─── Respond ───────────────────────────────────────────────
function RespondTab({
  contacts, onSOS, onCallEmergency, onOpenEmbassy, onOpenMedical, onShareLocation, onAddContact, onMessageContact,
}: {
  contacts: Contact[];
  onSOS: () => void;
  onCallEmergency: () => void;
  onOpenEmbassy: () => void;
  onOpenMedical: () => void;
  onShareLocation: () => void;
  onAddContact: () => void;
  onMessageContact: (c: Contact) => void;
}) {
  const [openLocal, setOpenLocal] = useState(false);

  return (
    <div className="space-y-5">
      {/* SOS */}
      <button
        onClick={onSOS}
        className="w-full flex items-center justify-center gap-3 active:scale-[0.99] transition-transform"
        style={{ background: C.red, color: C.text, height: 64, borderRadius: 24, fontSize: 22, fontWeight: 700, fontFamily: "'Sora', sans-serif", letterSpacing: -0.3 }}
      >
        <Shield className="h-6 w-6" strokeWidth={2} fill={`${C.text}33`} />
        Send SOS
      </button>
      <p className="-mt-3 text-center" style={{ fontSize: 12, color: C.text2 }}>
        Sends your location to emergency contacts
      </p>

      {/* Action tiles 2x2 */}
      <div className="grid grid-cols-2 gap-3">
        <Tile icon={<Phone className="h-5 w-5" style={{ color: C.red }} strokeWidth={1.5} />} title="Call Emergency" sub={`${TRIP.emergencyNumber} in USA`} onClick={onCallEmergency} />
        <Tile icon={<Building2 className="h-5 w-5" style={{ color: C.blue }} strokeWidth={1.5} />} title="Find Embassy" sub={`Your nearest ${TRIP.homeCountry} embassy`} onClick={onOpenEmbassy} />
        <Tile icon={<HeartPulse className="h-5 w-5" style={{ color: C.green }} strokeWidth={1.5} />} title="My Medical Info" sub="Show to first responders" onClick={onOpenMedical} />
        <Tile icon={<MapPin className="h-5 w-5" style={{ color: C.yellow }} strokeWidth={1.5} />} title="Share Location" sub="Send your GPS to a contact" onClick={onShareLocation} />
      </div>

      {/* Contacts */}
      <div>
        <div className="flex items-center justify-between px-1">
          <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 600, letterSpacing: -0.3 }}>Emergency Contacts</h3>
          <button onClick={onAddContact} style={{ color: C.blue, fontSize: 13, fontWeight: 600 }}>Edit</button>
        </div>
        <div className="mt-3 space-y-2">
          {contacts.map(c => (
            <div key={c.id} className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
              <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ background: C.elevated, fontSize: 14, fontWeight: 700 }}>
                {c.name.split(" ").map(n => n[0]).join("").slice(0, 2) || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 14, fontWeight: 600 }}>{c.name || "Unnamed"}</p>
                <p style={{ fontSize: 12, color: C.text2 }}>{c.relationship} · {c.phone}</p>
              </div>
              <a href={`tel:${c.phone}`} aria-label={`Call ${c.name}`} className="h-9 w-9 rounded-full flex items-center justify-center" style={{ background: C.elevated }}>
                <Phone className="h-4 w-4" style={{ color: C.blue }} strokeWidth={1.5} />
              </a>
              <button onClick={() => onMessageContact(c)} aria-label={`Message ${c.name}`} className="h-9 w-9 rounded-full flex items-center justify-center" style={{ background: C.elevated }}>
                <MessageSquare className="h-4 w-4" style={{ color: C.blue }} strokeWidth={1.5} />
              </button>
            </div>
          ))}
          {contacts.length < 3 && (
            <button onClick={onAddContact} className="w-full flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: "transparent", border: `1px dashed ${C.border}`, color: C.text2 }}>
              <Plus className="h-4 w-4" strokeWidth={1.5} />
              <span style={{ fontSize: 14 }}>Add contact</span>
            </button>
          )}
        </div>
      </div>

      {/* Local numbers reference */}
      <div className="rounded-2xl" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
        <button onClick={() => setOpenLocal(o => !o)} className="w-full flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4" style={{ color: C.text2 }} strokeWidth={1.5} />
            <p style={{ fontSize: 14, fontWeight: 600 }}>Local Numbers — USA</p>
          </div>
          <ChevronRight className="h-4 w-4 transition-transform" style={{ color: C.text2, transform: openLocal ? "rotate(90deg)" : "none" }} />
        </button>
        {openLocal && (
          <div className="px-4 pb-4 space-y-2" style={{ fontSize: 13 }}>
            {[
              { label: "Police · Fire · Ambulance", num: "911" },
              { label: "Coast Guard", num: "+1 305-415-6800" },
              { label: "Poison Control", num: "1-800-222-1222" },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between">
                <span style={{ color: C.text2 }}>{r.label}</span>
                <a href={`tel:${r.num}`} style={{ color: C.blue, fontWeight: 600 }}>{r.num}</a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Tile({ icon, title, sub, onClick }: { icon: React.ReactNode; title: string; sub: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-2xl p-4 active:scale-[0.98] transition-transform"
      style={{ background: C.surface, border: `1px solid ${C.border}`, minHeight: 116 }}
    >
      <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ background: C.elevated }}>
        {icon}
      </div>
      <p className="mt-3" style={{ fontSize: 16, fontWeight: 600 }}>{title}</p>
      <p className="mt-0.5" style={{ fontSize: 12, color: C.text2 }}>{sub}</p>
    </button>
  );
}

// ─── Sheet primitive ───────────────────────────────────────
function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div
        className="w-full max-w-md mx-auto rounded-t-3xl p-6 animate-in slide-in-from-bottom"
        style={{ background: C.bg, border: `1px solid ${C.border}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center mb-4">
          <div style={{ width: 32, height: 4, borderRadius: 999, background: C.border }} />
        </div>
        {children}
      </div>
    </div>
  );
}

function SettingRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: C.elevated, border: `1px solid ${C.border}` }}>
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: 13, fontWeight: 600 }}>{label}</p>
        <p style={{ fontSize: 12, color: C.text2 }}>{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", color: "#475569", fontWeight: 700 }}>{label}</p>
      <p style={{ fontSize: 18, fontWeight: 600, marginTop: 2 }}>{value}</p>
    </div>
  );
}

// ─── Setup wizard ──────────────────────────────────────────
function SetupWizard({
  contacts, medical, reminders,
  onContactsChange, onMedicalChange, onRemindersChange, onComplete, onClose,
}: {
  contacts: Contact[]; medical: MedicalInfo; reminders: ReminderPrefs;
  onContactsChange: (v: Contact[]) => void;
  onMedicalChange: (v: MedicalInfo) => void;
  onRemindersChange: (v: ReminderPrefs) => void;
  onComplete: () => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const canContinue = step === 1 ? contacts.some(c => c.name && c.phone) : true;

  return (
    <Sheet onClose={onClose}>
      <div className="flex items-center justify-between mb-3">
        <p style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: C.text2, fontWeight: 700 }}>
          SafePass setup · Step {step} of 3
        </p>
        <button onClick={onClose} className="text-xs" style={{ color: C.text2 }}>Skip</button>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 600, letterSpacing: -0.3 }}>
            Who should we contact if you need help?
          </h2>
          <div className="space-y-2 max-h-[40vh] overflow-y-auto">
            {contacts.map((c, i) => (
              <div key={c.id} className="rounded-2xl p-3 space-y-2" style={{ background: C.elevated, border: `1px solid ${C.border}` }}>
                <Input
                  placeholder="Name"
                  value={c.name}
                  onChange={(e) => onContactsChange(contacts.map(x => x.id === c.id ? { ...x, name: e.target.value } : x))}
                  style={{ background: C.surface, color: C.text, borderColor: C.border }}
                />
                <Input
                  placeholder="Phone (e.g. +44 7700 900123)"
                  value={c.phone}
                  onChange={(e) => onContactsChange(contacts.map(x => x.id === c.id ? { ...x, phone: e.target.value } : x))}
                  style={{ background: C.surface, color: C.text, borderColor: C.border }}
                />
                <div className="flex gap-2">
                  {(["Family", "Friend", "Colleague"] as const).map(r => (
                    <button
                      key={r}
                      onClick={() => onContactsChange(contacts.map(x => x.id === c.id ? { ...x, relationship: r } : x))}
                      className="flex-1 rounded-full font-semibold"
                      style={{
                        height: 36,
                        fontSize: 12,
                        background: c.relationship === r ? C.blue : "transparent",
                        color: c.relationship === r ? C.text : C.text2,
                        border: c.relationship === r ? "none" : `1px solid ${C.border}`,
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {contacts.length < 3 && (
              <button
                onClick={() => onContactsChange([...contacts, { id: crypto.randomUUID(), name: "", phone: "", relationship: "Family" }])}
                className="w-full rounded-2xl py-3 flex items-center justify-center gap-2"
                style={{ background: "transparent", border: `1px dashed ${C.border}`, color: C.text2, fontSize: 13 }}
              >
                <Plus className="h-4 w-4" /> Add contact
              </button>
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 600, letterSpacing: -0.3 }}>Medical information</h2>
          <p style={{ fontSize: 13, color: C.text2 }}>In an emergency, first responders may need this. Stored on this device only.</p>
          <Input placeholder="Blood type (e.g. O+)" value={medical.bloodType} onChange={(e) => onMedicalChange({ ...medical, bloodType: e.target.value })} style={{ background: C.elevated, color: C.text, borderColor: C.border }} />
          <Textarea rows={2} placeholder="Allergies" value={medical.allergies} onChange={(e) => onMedicalChange({ ...medical, allergies: e.target.value })} style={{ background: C.elevated, color: C.text, borderColor: C.border }} />
          <Textarea rows={2} placeholder="Current medications" value={medical.medications} onChange={(e) => onMedicalChange({ ...medical, medications: e.target.value })} style={{ background: C.elevated, color: C.text, borderColor: C.border }} />
          <Textarea rows={2} placeholder="Conditions to be aware of" value={medical.conditions} onChange={(e) => onMedicalChange({ ...medical, conditions: e.target.value })} style={{ background: C.elevated, color: C.text, borderColor: C.border }} />
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 600, letterSpacing: -0.3 }}>Reminder preferences</h2>
          <p style={{ fontSize: 13, color: C.text2 }}>When do you want to be reminded before a flight?</p>
          <SettingRow label="24-hour reminder" description="Online check-in opens" checked={reminders.r24} onChange={(v) => onRemindersChange({ ...reminders, r24: v })} />
          <SettingRow label="12-hour checklist" description="Full review nudge" checked={reminders.r12} onChange={(v) => onRemindersChange({ ...reminders, r12: v })} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 600 }}>Final reminder</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {([3, 3.5, 4] as const).map(v => (
                <button
                  key={v}
                  onClick={() => onRemindersChange({ ...reminders, rFinal: v })}
                  className="rounded-full font-semibold"
                  style={{
                    height: 40,
                    fontSize: 13,
                    background: reminders.rFinal === v ? C.blue : "transparent",
                    color: reminders.rFinal === v ? C.text : C.text2,
                    border: reminders.rFinal === v ? "none" : `1px solid ${C.border}`,
                  }}
                >
                  {v}h before
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mt-5 flex gap-2">
        {step > 1 && (
          <button
            onClick={() => setStep((step - 1) as 1 | 2 | 3)}
            className="rounded-full font-semibold"
            style={{ background: C.elevated, color: C.text, height: 52, fontSize: 14, border: `1px solid ${C.border}`, paddingLeft: 24, paddingRight: 24 }}
          >
            Back
          </button>
        )}
        {step < 3 ? (
          <button
            disabled={!canContinue}
            onClick={() => setStep((step + 1) as 1 | 2 | 3)}
            className="flex-1 rounded-full font-semibold"
            style={{ background: canContinue ? C.blue : C.elevated, color: C.text, height: 52, fontSize: 16, opacity: canContinue ? 1 : 0.5 }}
          >
            Continue
          </button>
        ) : (
          <button
            onClick={onComplete}
            className="flex-1 rounded-full font-semibold"
            style={{ background: C.blue, color: C.text, height: 52, fontSize: 16 }}
          >
            Done — Activate SafePass
          </button>
        )}
      </div>
    </Sheet>
  );
}
