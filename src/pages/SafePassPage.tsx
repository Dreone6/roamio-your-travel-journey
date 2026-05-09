import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield, ChevronLeft, ChevronRight, Eye, FileText, Heart,
  Phone, MapPin, Users, AlertTriangle, Sun, Navigation,
  Smartphone, Share2, CheckCircle2, Circle, Lock,
  Globe, Flame, Info, ArrowRight, Compass, Zap,
} from "lucide-react";
import {
  MOCK_DESTINATION_SAFETY, MOCK_SAFETY_CHECKLIST,
  MOCK_TRIP_SHARING, MOCK_TRUSTED_CONTACTS, MOCK_SAFETY_NOTES,
} from "@/data";
import type { SafetyChecklistItem } from "@/data/mock/safety";
import TrustedContactsList from "@/components/safety/TrustedContactsList";
import LiveLocationToggle from "@/components/safety/LiveLocationToggle";

type SafetyView = "overview" | "checklist" | "destination" | "contacts" | "emergency" | "sharing" | "settings";

const CATEGORY_ICONS: Record<string, typeof FileText> = {
  documents: FileText,
  health: Heart,
  safety: Shield,
  packing: Navigation,
  sharing: Share2,
};

const LEVEL_COLORS = {
  safe: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", label: "Safe" },
  caution: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", label: "Caution" },
  alert: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/20", label: "Alert" },
};

export default function SafePassPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<SafetyView>("overview");
  const [checklist, setChecklist] = useState(MOCK_SAFETY_CHECKLIST);
  const [selectedDestination, setSelectedDestination] = useState(MOCK_DESTINATION_SAFETY[0]);
  const [tripSharing, setTripSharing] = useState(MOCK_TRIP_SHARING);

  const completedCount = checklist.filter(i => i.completed).length;
  const totalRequired = checklist.filter(i => i.required).length;
  const completedRequired = checklist.filter(i => i.required && i.completed).length;

  const toggleChecklistItem = (id: string) => {
    setChecklist(prev => prev.map(item =>
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const renderHeader = (title: string, subtitle?: string) => (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 gradient-dark-radial" />
      <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-emerald-500/5 blur-3xl" />
      <div className="relative px-5 pt-14 pb-5">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => view === "overview" ? navigate(-1) : setView("overview")}
            className="h-9 w-9 rounded-xl dark-card-elevated flex items-center justify-center"
          >
            <ChevronLeft className="h-4 w-4 text-white" />
          </button>
          <div className="flex-1">
            <p className="text-dark-muted text-[10px] font-bold tracking-[0.2em] uppercase">SafePass</p>
            <h1 className="font-heading text-[22px] font-bold text-white tracking-tight mt-0.5">{title}</h1>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-glow" />
          </div>
        </div>
        {subtitle && <p className="text-[12px] text-dark-muted leading-relaxed">{subtitle}</p>}
      </div>
    </div>
  );

  // ── Overview ──────────────────────────────────────
  if (view === "overview") {
    return (
      <div className="dark-immersive min-h-screen pb-24">
        {renderHeader("SafePass", "Stay prepared, aware, and protected on every trip.")}

        <div className="px-5 space-y-5">
          {/* Safety Score */}
          <div className="dark-card rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-bold text-white">Safety Readiness</h3>
              <span className="text-[10px] font-bold text-glow">{completedCount}/{checklist.length} complete</span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full gradient-glow transition-all duration-700"
                style={{ width: `${(completedCount / checklist.length) * 100}%` }}
              />
            </div>
            <div className="flex gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                completedRequired === totalRequired ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
              }`}>
                {completedRequired}/{totalRequired} required items
              </span>
            </div>
          </div>

          {/* Three Pillars */}
          <div className="space-y-2">
            <h3 className="text-[11px] font-bold text-dark-muted uppercase tracking-wider">Your SafePass</h3>
            {[
              {
                title: "Prepare",
                desc: "Documents, health, and packing checklist",
                icon: FileText,
                color: "from-blue-500/15 to-indigo-500/10",
                iconColor: "text-blue-400",
                action: () => setView("checklist"),
                badge: `${completedCount}/${checklist.length}`,
              },
              {
                title: "Stay Aware",
                desc: "Destination safety, scams, and local tips",
                icon: Eye,
                color: "from-amber-500/15 to-orange-500/10",
                iconColor: "text-amber-400",
                action: () => setView("destination"),
                badge: `${MOCK_DESTINATION_SAFETY.length} destinations`,
              },
              {
                title: "Reach Help",
                desc: "Emergency contacts, numbers, and embassy info",
                icon: Phone,
                color: "from-rose-500/15 to-pink-500/10",
                iconColor: "text-rose-400",
                action: () => setView("emergency"),
                badge: `${MOCK_TRUSTED_CONTACTS.length} contacts`,
              },
            ].map((pillar) => (
              <button
                key={pillar.title}
                onClick={pillar.action}
                className="w-full dark-card rounded-2xl p-4 flex items-center gap-4 hover:bg-white/[0.04] transition-all text-left group"
              >
                <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${pillar.color} flex items-center justify-center shrink-0`}>
                  <pillar.icon className={`h-5 w-5 ${pillar.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-white">{pillar.title}</p>
                  <p className="text-[11px] text-dark-muted mt-0.5">{pillar.desc}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[9px] font-bold text-dark-muted">{pillar.badge}</span>
                  <ChevronRight className="h-4 w-4 text-dark-muted group-hover:text-glow transition-colors" />
                </div>
              </button>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="space-y-2">
            <h3 className="text-[11px] font-bold text-dark-muted uppercase tracking-wider">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Trusted Contacts", icon: Users, action: () => setView("contacts") },
                { label: "Trip Sharing", icon: Share2, action: () => setView("sharing") },
                { label: "Safety Settings", icon: Lock, action: () => setView("settings") },
                { label: "Emergency Help", icon: Zap, action: () => setView("emergency"), highlight: true },
              ].map((qa) => (
                <button
                  key={qa.label}
                  onClick={qa.action}
                  className={`dark-card rounded-xl p-3.5 flex items-center gap-2.5 hover:bg-white/[0.04] transition-colors ${
                    qa.highlight ? "ring-1 ring-rose-500/20" : ""
                  }`}
                >
                  <qa.icon className={`h-4 w-4 ${qa.highlight ? "text-rose-400" : "text-glow"}`} />
                  <span className="text-[11px] font-semibold text-white">{qa.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Destination Safety Preview */}
          <div className="space-y-2">
            <h3 className="text-[11px] font-bold text-dark-muted uppercase tracking-wider">Destination Safety</h3>
            <div className="flex gap-2.5 overflow-x-auto -mx-5 px-5 pb-1 no-scrollbar snap-x">
              {MOCK_DESTINATION_SAFETY.map((dest) => {
                const level = LEVEL_COLORS[dest.overallLevel];
                return (
                  <button
                    key={dest.id}
                    onClick={() => { setSelectedDestination(dest); setView("destination"); }}
                    className="dark-card rounded-2xl p-4 min-w-[180px] snap-start hover:bg-white/[0.04] transition-colors text-left"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="h-3.5 w-3.5 text-glow" />
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${level.bg} ${level.text}`}>
                        {level.label}
                      </span>
                    </div>
                    <p className="text-[13px] font-bold text-white">{dest.destination}</p>
                    <p className="text-[10px] text-dark-muted mt-0.5">{dest.country}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Trusted contacts + live location */}
          <LiveLocationToggle />
          <TrustedContactsList />
        </div>
      </div>
    );
  }

  // ── Checklist ─────────────────────────────────────
  if (view === "checklist") {
    const grouped = checklist.reduce<Record<string, SafetyChecklistItem[]>>((acc, item) => {
      (acc[item.category] = acc[item.category] || []).push(item);
      return acc;
    }, {});

    return (
      <div className="dark-immersive min-h-screen pb-24">
        {renderHeader("Trip Checklist", "Prepare everything before you go.")}

        <div className="px-5 space-y-5">
          {/* Progress */}
          <div className="dark-card rounded-xl p-4 flex items-center gap-4">
            <div className="relative h-14 w-14">
              <svg className="h-14 w-14 -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                <circle
                  cx="28" cy="28" r="24" fill="none" stroke="url(#glow)" strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${(completedCount / checklist.length) * 150.8} 150.8`}
                />
                <defs>
                  <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="hsl(160, 80%, 50%)" />
                    <stop offset="100%" stopColor="hsl(170, 70%, 45%)" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[13px] font-bold text-white">{Math.round((completedCount / checklist.length) * 100)}%</span>
              </div>
            </div>
            <div>
              <p className="text-[13px] font-bold text-white">{completedCount} of {checklist.length} items</p>
              <p className="text-[10px] text-dark-muted mt-0.5">
                {completedRequired === totalRequired ? "All required items complete ✓" : `${totalRequired - completedRequired} required items remaining`}
              </p>
            </div>
          </div>

          {/* Categories */}
          {Object.entries(grouped).map(([category, items]) => {
            const Icon = CATEGORY_ICONS[category] || Shield;
            const catLabels: Record<string, string> = {
              documents: "Documents & ID",
              health: "Health & Medical",
              safety: "Safety Setup",
              packing: "Safety Packing",
              sharing: "Trip Sharing",
            };
            return (
              <div key={category} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-glow" />
                  <h3 className="text-[12px] font-bold text-white">{catLabels[category] || category}</h3>
                </div>
                <div className="space-y-1">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => toggleChecklistItem(item.id)}
                      className="w-full dark-card rounded-xl p-3.5 flex items-start gap-3 hover:bg-white/[0.04] transition-colors text-left"
                    >
                      {item.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="h-5 w-5 text-white/20 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`text-[12px] font-semibold ${item.completed ? "text-white/40 line-through" : "text-white"}`}>
                            {item.label}
                          </p>
                          {item.required && !item.completed && (
                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400">
                              Required
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-dark-muted mt-0.5">{item.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Destination Safety ────────────────────────────
  if (view === "destination") {
    const dest = selectedDestination;
    const level = LEVEL_COLORS[dest.overallLevel];

    return (
      <div className="dark-immersive min-h-screen pb-24">
        {renderHeader(dest.destination, dest.summary)}

        <div className="px-5 space-y-5">
          {/* Overall level badge */}
          <div className={`dark-card rounded-2xl p-4 border ${level.border} flex items-center gap-3`}>
            <div className={`h-12 w-12 rounded-xl ${level.bg} flex items-center justify-center`}>
              <Shield className={`h-6 w-6 ${level.text}`} />
            </div>
            <div>
              <p className={`text-[14px] font-bold ${level.text}`}>Overall: {level.label}</p>
              <p className="text-[10px] text-dark-muted mt-0.5">
                Updated {new Date(dest.lastUpdated).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </p>
            </div>
          </div>

          {/* Destination selector */}
          <div className="flex gap-2 overflow-x-auto -mx-5 px-5 pb-1 no-scrollbar">
            {MOCK_DESTINATION_SAFETY.map((d) => (
              <button
                key={d.id}
                onClick={() => setSelectedDestination(d)}
                className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold transition-all whitespace-nowrap ${
                  d.id === dest.id ? "gradient-glow text-white glow-accent" : "dark-card text-dark-muted hover:text-white/60"
                }`}
              >
                {d.destination}
              </button>
            ))}
          </div>

          {/* Safety categories */}
          <div className="space-y-2">
            <h3 className="text-[12px] font-bold text-white">Safety Breakdown</h3>
            {dest.categories.map((cat) => {
              const cl = LEVEL_COLORS[cat.level];
              return (
                <div key={cat.name} className="dark-card rounded-xl p-3.5 flex items-start gap-3">
                  <span className="text-lg">{cat.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[12px] font-semibold text-white">{cat.name}</p>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${cl.bg} ${cl.text}`}>
                        {cl.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-dark-muted mt-1 leading-relaxed">{cat.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tips */}
          <div className="space-y-2">
            <h3 className="text-[12px] font-bold text-white flex items-center gap-2">
              <Info className="h-3.5 w-3.5 text-glow" /> Travel Tips
            </h3>
            <div className="dark-card rounded-xl p-4 space-y-2.5">
              {dest.tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="h-5 w-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[9px] font-bold text-glow">{i + 1}</span>
                  </div>
                  <p className="text-[11px] text-white/70 leading-relaxed">{tip}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Emergency numbers */}
          <div className="space-y-2">
            <h3 className="text-[12px] font-bold text-white flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-rose-400" /> Emergency Numbers
            </h3>
            <div className="space-y-1.5">
              {dest.emergencyNumbers.map((num) => (
                <div key={num.label} className="dark-card rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-[12px] font-semibold text-white">{num.label}</p>
                    {num.notes && <p className="text-[9px] text-dark-muted mt-0.5">{num.notes}</p>}
                  </div>
                  <a
                    href={`tel:${num.number}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 text-[11px] font-bold"
                  >
                    <Phone className="h-3 w-3" /> {num.number}
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Embassy */}
          {dest.embassy && (
            <div className="space-y-2">
              <h3 className="text-[12px] font-bold text-white flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-blue-400" /> Embassy / Consulate
              </h3>
              <div className="dark-card rounded-xl p-4 space-y-2">
                <p className="text-[13px] font-semibold text-white">{dest.embassy.name}</p>
                <p className="text-[10px] text-dark-muted">{dest.embassy.address}</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  <a href={`tel:${dest.embassy.phone}`} className="text-[10px] font-bold text-glow flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {dest.embassy.phone}
                  </a>
                  {dest.embassy.email && (
                    <span className="text-[10px] text-dark-muted">{dest.embassy.email}</span>
                  )}
                </div>
                <p className="text-[9px] text-dark-muted">{dest.embassy.hours}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Trusted Contacts ──────────────────────────────
  if (view === "contacts") {
    return (
      <div className="dark-immersive min-h-screen pb-24">
        {renderHeader("Trusted Contacts", "People who will be notified in case of emergency.")}

        <div className="px-5 space-y-4">
          {MOCK_TRUSTED_CONTACTS.map((contact) => (
            <div key={contact.id} className="dark-card rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-glow">{contact.name[0]}</span>
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-white">{contact.name}</p>
                  <p className="text-[10px] text-dark-muted">{contact.relationship}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {contact.phone && (
                  <a href={`tel:${contact.phone}`} className="flex items-center gap-1 px-2.5 py-1 rounded-lg dark-card-elevated text-[10px] font-bold text-white">
                    <Phone className="h-3 w-3 text-glow" /> {contact.phone}
                  </a>
                )}
                {contact.email && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg dark-card-elevated text-[10px] text-dark-muted">
                    ✉️ {contact.email}
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <div className={`flex items-center gap-1.5 text-[10px] font-bold ${contact.shareLocation ? "text-emerald-400" : "text-dark-muted"}`}>
                  <MapPin className="h-3 w-3" /> Location sharing {contact.shareLocation ? "on" : "off"}
                </div>
                <div className={`flex items-center gap-1.5 text-[10px] font-bold ${contact.notifyOnCheckin ? "text-emerald-400" : "text-dark-muted"}`}>
                  <CheckCircle2 className="h-3 w-3" /> Check-in alerts {contact.notifyOnCheckin ? "on" : "off"}
                </div>
              </div>
            </div>
          ))}

          {/* Add contact */}
          <button className="w-full dark-card rounded-2xl p-4 border-2 border-dashed border-white/[0.08] flex items-center justify-center gap-2 hover:border-emerald-500/20 transition-colors">
            <Users className="h-4 w-4 text-dark-muted" />
            <span className="text-[12px] font-semibold text-dark-muted">Add Trusted Contact</span>
          </button>
        </div>
      </div>
    );
  }

  // ── Emergency ─────────────────────────────────────
  if (view === "emergency") {
    return (
      <div className="dark-immersive min-h-screen pb-24">
        {renderHeader("Emergency Help", "Quick access when you need it most.")}

        <div className="px-5 space-y-5">
          {/* Emergency SOS */}
          <div className="dark-card rounded-2xl p-6 border border-rose-500/20 text-center space-y-3">
            <div className="h-20 w-20 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto">
              <Phone className="h-8 w-8 text-rose-400" />
            </div>
            <h3 className="font-heading text-lg font-bold text-white">Emergency SOS</h3>
            <p className="text-[11px] text-dark-muted">
              This will alert your trusted contacts with your current location and send an emergency notification.
            </p>
            <button className="w-full rounded-xl bg-rose-500/20 border border-rose-500/30 py-3 text-[13px] font-bold text-rose-400 hover:bg-rose-500/30 transition-colors">
              Activate Emergency Alert
            </button>
            <p className="text-[9px] text-dark-muted">Placeholder — will connect to real emergency services in production</p>
          </div>

          {/* Quick call numbers */}
          <div className="space-y-2">
            <h3 className="text-[12px] font-bold text-white">Local Emergency Numbers</h3>
            {MOCK_DESTINATION_SAFETY.map((dest) => (
              <div key={dest.id} className="dark-card rounded-xl p-3.5">
                <p className="text-[11px] font-bold text-white mb-2">{dest.destination}, {dest.country}</p>
                <div className="flex flex-wrap gap-1.5">
                  {dest.emergencyNumbers.map((num) => (
                    <a
                      key={num.label}
                      href={`tel:${num.number}`}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-500/10 text-[10px] font-bold text-rose-400"
                    >
                      <Phone className="h-2.5 w-2.5" /> {num.label}: {num.number}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Trusted contacts quick dial */}
          <div className="space-y-2">
            <h3 className="text-[12px] font-bold text-white">Quick Call Contacts</h3>
            {MOCK_TRUSTED_CONTACTS.filter(c => c.phone).map((contact) => (
              <a
                key={contact.id}
                href={`tel:${contact.phone}`}
                className="dark-card rounded-xl p-3.5 flex items-center gap-3 hover:bg-white/[0.04] transition-colors block"
              >
                <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-glow">{contact.name[0]}</span>
                </div>
                <div className="flex-1">
                  <p className="text-[12px] font-semibold text-white">{contact.name}</p>
                  <p className="text-[10px] text-dark-muted">{contact.relationship}</p>
                </div>
                <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Phone className="h-4 w-4 text-glow" />
                </div>
              </a>
            ))}
          </div>

          {/* Share location concept */}
          <div className="dark-card rounded-2xl p-4 space-y-2 border border-blue-500/10">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-blue-400" />
              <h3 className="text-[12px] font-bold text-white">Share Live Location</h3>
            </div>
            <p className="text-[10px] text-dark-muted leading-relaxed">
              Share your real-time location with trusted contacts for a set duration. They'll see your position on a map until you stop sharing.
            </p>
            <button className="flex items-center gap-1.5 text-[11px] font-bold text-blue-400">
              <MapPin className="h-3 w-3" /> Start Sharing Location
            </button>
            <p className="text-[9px] text-dark-muted">Coming soon — requires device location permissions</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Trip Sharing ──────────────────────────────────
  if (view === "sharing") {
    return (
      <div className="dark-immersive min-h-screen pb-24">
        {renderHeader("Trip Sharing", "Let trusted contacts follow your journey.")}

        <div className="px-5 space-y-5">
          {/* Main toggle */}
          <div className="dark-card rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Share2 className="h-5 w-5 text-glow" />
              <div>
                <p className="text-[13px] font-semibold text-white">Trip Sharing</p>
                <p className="text-[10px] text-dark-muted">Share your travel details with contacts</p>
              </div>
            </div>
            <button
              onClick={() => setTripSharing(prev => ({ ...prev, enabled: !prev.enabled }))}
              className={`h-7 w-12 rounded-full transition-all ${
                tripSharing.enabled ? "bg-emerald-500" : "bg-white/10"
              } relative`}
            >
              <div className={`h-5 w-5 rounded-full bg-white absolute top-1 transition-all ${
                tripSharing.enabled ? "left-6" : "left-1"
              }`} />
            </button>
          </div>

          {tripSharing.enabled && (
            <>
              {/* Sharing options */}
              {[
                { label: "Share Itinerary", desc: "Your trip plan and daily schedule", key: "shareItinerary" as const, icon: FileText },
                { label: "Share Location", desc: "Real-time location during trip", key: "shareLocation" as const, icon: MapPin },
                { label: "Share Check-ins", desc: "Notify when you check in", key: "shareCheckIns" as const, icon: CheckCircle2 },
                { label: "Auto-Notify on Arrival", desc: "Send a message when you arrive", key: "autoNotifyOnArrival" as const, icon: Navigation },
              ].map((opt) => (
                <div key={opt.key} className="dark-card rounded-xl p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <opt.icon className="h-4 w-4 text-glow" />
                    <div>
                      <p className="text-[12px] font-semibold text-white">{opt.label}</p>
                      <p className="text-[10px] text-dark-muted">{opt.desc}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setTripSharing(prev => ({ ...prev, [opt.key]: !prev[opt.key] }))}
                    className={`h-6 w-10 rounded-full transition-all ${
                      tripSharing[opt.key] ? "bg-emerald-500" : "bg-white/10"
                    } relative`}
                  >
                    <div className={`h-4 w-4 rounded-full bg-white absolute top-1 transition-all ${
                      tripSharing[opt.key] ? "left-5" : "left-1"
                    }`} />
                  </button>
                </div>
              ))}

              {/* Shared with */}
              <div className="space-y-2">
                <h3 className="text-[12px] font-bold text-white">Sharing With</h3>
                {MOCK_TRUSTED_CONTACTS.map((c) => (
                  <div key={c.id} className="dark-card rounded-xl p-3 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <span className="text-sm font-bold text-glow">{c.name[0]}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-[12px] font-semibold text-white">{c.name}</p>
                      <p className="text-[9px] text-dark-muted">{c.relationship}</p>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Safety Settings ───────────────────────────────
  if (view === "settings") {
    return (
      <div className="dark-immersive min-h-screen pb-24">
        {renderHeader("Safety Settings", "Configure your SafePass preferences.")}

        <div className="px-5 space-y-4">
          {[
            { label: "Auto-share location in emergencies", desc: "Automatically send location to trusted contacts", enabled: true },
            { label: "Check-in reminders", desc: "Remind you to check in at regular intervals while traveling", enabled: false },
            { label: "Destination safety alerts", desc: "Get notified about safety changes at your destination", enabled: true },
            { label: "Weather warnings", desc: "Receive severe weather alerts for your trip locations", enabled: true },
            { label: "Pre-trip safety review", desc: "Show safety checklist before each trip starts", enabled: true },
            { label: "Emergency message template", desc: "Pre-write a message to send in emergencies", enabled: false },
          ].map((setting, i) => (
            <div key={i} className="dark-card rounded-xl p-3.5 flex items-center justify-between">
              <div className="flex-1 pr-4">
                <p className="text-[12px] font-semibold text-white">{setting.label}</p>
                <p className="text-[10px] text-dark-muted mt-0.5">{setting.desc}</p>
              </div>
              <div className={`h-6 w-10 rounded-full ${setting.enabled ? "bg-emerald-500" : "bg-white/10"} relative`}>
                <div className={`h-4 w-4 rounded-full bg-white absolute top-1 ${setting.enabled ? "left-5" : "left-1"}`} />
              </div>
            </div>
          ))}

          <div className="dark-card rounded-xl p-4 space-y-2 mt-4">
            <p className="text-[11px] text-dark-muted leading-relaxed">
              SafePass is designed to help you feel prepared and connected. Real emergency features, including live location sharing and emergency messaging, will be available in a future update using proven safety APIs.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
