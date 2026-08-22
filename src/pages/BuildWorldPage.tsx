import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft, Globe as GlobeIcon, Sparkles, MapPin, ShieldCheck, Lock, Users,
  Check, Images, Trash2, Merge, Pencil, Share2, Compass, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";
import { browserFileSource, demoSource, nativePhotoLibrarySource } from "@/lib/buildworld/mediaSource";
import { extractMetadata } from "@/lib/buildworld/metadata";
import { buildDiscoveredTrips, formatRange, summarize, mergeTrips } from "@/lib/buildworld/cluster";
import { saveDiscoveredTrips } from "@/lib/buildworld/persist";
import type { DiscoveredTrip, MediaItem, Visibility } from "@/lib/buildworld/types";

const FlagGlobe = lazy(() => import("@/components/globe/FlagGlobe"));

type Step = "intro" | "privacy" | "scan" | "review" | "reveal";

const BG = "#080D1A";
const SURFACE = "#111827";
const ELEV = "#1A2236";
const BORDER = "#1E2A3F";
const MUTED = "#94A3B8";
const ACCENT = "#3B82F6";

const PHASES = ["Reading memories…", "Finding locations…", "Connecting trips…", "Building your world…"];

/* ---------------------------------- shell --------------------------------- */

export default function BuildWorldPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("intro");
  const [demoMode, setDemoMode] = useState(false);
  const [trips, setTrips] = useState<DiscoveredTrip[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState({ countries: 0, cities: 0, memories: 0 });

  const back = () => {
    if (step === "intro") navigate(-1);
    else if (step === "privacy") setStep("intro");
    else if (step === "review") setStep("privacy");
    else if (step === "scan") setStep("privacy");
  };

  const handleScanComplete = useCallback((result: DiscoveredTrip[]) => {
    if (result.length === 0) {
      toast.info("No location data found", {
        description: "Those photos had no GPS metadata. Try others, or add places manually.",
      });
      setStep("privacy");
      return;
    }
    setTrips(result);
    setStep("review");
  }, []);

  const handleAdd = async () => {
    if (!user) return;
    const selected = trips.filter((t) => t.selected);
    if (selected.length === 0) {
      toast.info("Select at least one place to add");
      return;
    }
    setSaving(true);
    try {
      const res = await saveDiscoveredTrips(user.id, trips, { demo: demoMode });
      setSaved({ countries: res.countries, cities: res.cities, memories: res.memories });
      setStep("reveal");
    } catch {
      toast.error("Couldn't add those places", { description: "Please try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: BG, paddingBottom: "env(safe-area-inset-bottom)" }}>
      {step !== "reveal" && (
        <div className="px-5 flex items-center" style={{ paddingTop: "calc(env(safe-area-inset-top) + 20px)" }}>
          <button
            onClick={back}
            className="h-11 w-11 rounded-full flex items-center justify-center"
            style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5 text-white" strokeWidth={1.5} />
          </button>
        </div>
      )}

      {step === "intro" && <IntroStep onStart={() => setStep("privacy")} onManual={() => navigate("/checkin")} />}
      {step === "privacy" && (
        <PrivacyStep
          demoMode={demoMode}
          setDemoMode={setDemoMode}
          onContinue={() => setStep("scan")}
        />
      )}
      {step === "scan" && <ScanStep demoMode={demoMode} onComplete={handleScanComplete} onCancel={() => setStep("privacy")} />}
      {step === "review" && (
        <ReviewStep trips={trips} setTrips={setTrips} saving={saving} onAdd={handleAdd} />
      )}
      {step === "reveal" && <RevealStep trips={trips} stats={saved} />}
    </div>
  );
}

/* ----------------------------------- 1 ------------------------------------ */

function IntroStep({ onStart, onManual }: { onStart: () => void; onManual: () => void }) {
  return (
    <div className="px-6 pt-4 pb-10 animate-fade-in">
      <div className="relative mx-auto my-6 h-[190px] w-[190px]">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(circle at 35% 30%, #16304f 0%, #0d1c31 55%, #070c17 100%)",
            boxShadow: `0 0 60px rgba(59,130,246,0.22), inset 0 0 40px rgba(0,0,0,0.6)`,
          }}
        />
        <div className="absolute inset-0 rounded-full" style={{ border: "1px solid rgba(59,130,246,0.28)" }} />
        {[
          { t: "22%", l: "34%", d: "0s" }, { t: "45%", l: "62%", d: "0.6s" },
          { t: "63%", l: "38%", d: "1.2s" }, { t: "34%", l: "72%", d: "1.8s" },
          { t: "72%", l: "58%", d: "2.4s" },
        ].map((p, i) => (
          <span
            key={i}
            className="absolute rounded-full animate-pulse"
            style={{
              top: p.t, left: p.l, height: 7, width: 7, background: ACCENT,
              boxShadow: `0 0 12px 4px rgba(59,130,246,0.45)`, animationDelay: p.d, animationDuration: "2.8s",
            }}
          />
        ))}
      </div>

      <h1 className="font-heading text-white font-bold tracking-tight" style={{ fontSize: 38, lineHeight: 1.05 }}>
        Build Your World
      </h1>
      <p className="mt-3 text-[15px] leading-snug" style={{ color: MUTED }}>
        Turn the places you've been into a living map of your life. With your permission, Roavr reads the
        location and date info already saved inside your photos to find where you've travelled.
      </p>

      <div className="mt-8 space-y-6">
        {[
          { Icon: Sparkles, t: "Discover forgotten trips", d: "Find places hidden throughout years of photos." },
          { Icon: GlobeIcon, t: "Create your travel map", d: "Countries, cities, trips and memories, organised automatically." },
          { Icon: ShieldCheck, t: "You control what's visible", d: "Nothing becomes public unless you choose to share it." },
        ].map(({ Icon, t, d }) => (
          <div key={t} className="flex gap-4">
            <Icon className="h-[22px] w-[22px] shrink-0 mt-0.5" style={{ color: ACCENT, strokeWidth: 1.5 }} />
            <div>
              <p className="text-white" style={{ fontSize: 16, fontWeight: 600 }}>{t}</p>
              <p className="text-[13px] mt-1 leading-snug" style={{ color: MUTED }}>{d}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 space-y-3">
        <PrimaryButton onClick={onStart}>Build My World</PrimaryButton>
        <button
          onClick={onManual}
          className="w-full text-white"
          style={{ height: 52, borderRadius: 9999, background: ELEV, border: `1px solid ${BORDER}`, fontSize: 15, fontWeight: 600 }}
        >
          Add Places Manually
        </button>
      </div>
    </div>
  );
}

/* ----------------------------------- 2 ------------------------------------ */

function PrivacyStep({
  demoMode, setDemoMode, onContinue,
}: { demoMode: boolean; setDemoMode: (v: boolean) => void; onContinue: () => void }) {
  const nativeAvailable = nativePhotoLibrarySource.isAvailable();
  return (
    <div className="px-6 pt-6 pb-10 animate-fade-in">
      <div
        className="h-14 w-14 rounded-2xl flex items-center justify-center"
        style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)" }}
      >
        <Lock className="h-6 w-6" style={{ color: ACCENT, strokeWidth: 1.5 }} />
      </div>

      <h1 className="font-heading text-white font-bold tracking-tight mt-6" style={{ fontSize: 32, lineHeight: 1.08 }}>
        Your memories stay yours.
      </h1>

      <div className="mt-7 space-y-5">
        {[
          "Roavr reads the location and date info stored inside the photos you choose, to work out which trips they belong to.",
          "Private photos never become public automatically. Everything imported starts as private.",
          "You decide which memories appear on your profile, one place at a time.",
          "You can change the visibility of any place later from your World screen.",
        ].map((line) => (
          <div key={line} className="flex gap-3">
            <Check className="h-[18px] w-[18px] shrink-0 mt-0.5" style={{ color: ACCENT, strokeWidth: 2 }} />
            <p className="text-[14px] leading-snug text-white/85">{line}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
        <p className="text-[13px] leading-snug" style={{ color: MUTED }}>
          {nativeAvailable
            ? "Roavr will ask your device for photo-library access on the next screen."
            : "On the web, Roavr can only read the photos you pick yourself — there's no full photo-library scan in a browser. Full library scanning arrives with the Roavr mobile app."}
        </p>
      </div>

      <div
        className="mt-4 rounded-2xl p-4 flex items-center gap-3"
        style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
      >
        <div className="flex-1">
          <p className="text-white" style={{ fontSize: 14, fontWeight: 600 }}>Demo scan</p>
          <p className="text-[12px] mt-0.5 leading-snug" style={{ color: MUTED }}>
            Preview the full experience with a sample travel history. Clearly marked as demo data.
          </p>
        </div>
        <Switch checked={demoMode} onCheckedChange={setDemoMode} />
      </div>

      <div className="mt-8">
        <PrimaryButton onClick={onContinue}>Continue</PrimaryButton>
      </div>
    </div>
  );
}

/* ----------------------------------- 3 ------------------------------------ */

function ScanStep({
  demoMode, onComplete, onCancel,
}: { demoMode: boolean; onComplete: (t: DiscoveredTrip[]) => void; onCancel: () => void }) {
  const [phase, setPhase] = useState(0);
  const [counters, setCounters] = useState({ photos: 0, locations: 0, cities: 0, countries: 0 });
  const [started, setStarted] = useState(false);
  const startedRef = useRef(false);

  const run = useCallback(async (items: MediaItem[]) => {
    if (items.length === 0) { onCancel(); return; }
    setStarted(true);
    setPhase(0);

    const { geotagged } = await extractMetadata(items, (scanned, _total, found) => {
      setCounters((c) => ({ ...c, photos: scanned, locations: found }));
    });

    setPhase(1);
    await wait(320);
    setPhase(2);

    const discovered = await buildDiscoveredTrips(geotagged);
    setCounters({
      photos: items.length,
      locations: geotagged.length,
      cities: new Set(discovered.map((t) => `${t.city}|${t.country}`)).size,
      countries: new Set(discovered.map((t) => t.country)).size,
    });

    setPhase(3);
    await wait(600);
    onComplete(discovered);
  }, [onComplete, onCancel]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    if (demoMode) {
      demoSource.pickMedia().then(run);
    }
  }, [demoMode, run]);

  const pick = async () => {
    const items = await browserFileSource.pickMedia();
    if (items.length === 0) { toast.info("No photos selected"); return; }
    run(items);
  };

  if (!demoMode && !started) {
    return (
      <div className="px-6 pt-8 pb-10 animate-fade-in">
        <h1 className="font-heading text-white font-bold tracking-tight" style={{ fontSize: 32, lineHeight: 1.08 }}>
          Choose your photos
        </h1>
        <p className="mt-3 text-[15px] leading-snug" style={{ color: MUTED }}>
          Pick as many photos as you like. Roavr reads their location data on your device and groups them into trips.
        </p>
        <div
          className="mt-8 rounded-3xl flex flex-col items-center justify-center text-center px-6"
          style={{ background: SURFACE, border: `1px dashed ${BORDER}`, height: 220 }}
        >
          <Images className="h-8 w-8" style={{ color: ACCENT, strokeWidth: 1.4 }} />
          <p className="text-white mt-4" style={{ fontSize: 15, fontWeight: 600 }}>Select photos to scan</p>
          <p className="text-[12px] mt-1.5" style={{ color: MUTED }}>Photos never leave your device during the scan.</p>
        </div>
        <div className="mt-8">
          <PrimaryButton onClick={pick}>Select Photos</PrimaryButton>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 pt-10 pb-10 flex flex-col items-center text-center animate-fade-in">
      <div className="relative h-[150px] w-[150px] mt-6">
        <div
          className="absolute inset-0 rounded-full"
          style={{ background: "radial-gradient(circle at 35% 30%, #16304f 0%, #0d1c31 55%, #070c17 100%)" }}
        />
        <div
          className="absolute inset-0 rounded-full animate-spin"
          style={{ border: "2px solid transparent", borderTopColor: ACCENT, animationDuration: "1.4s" }}
        />
      </div>

      <p className="font-heading text-white font-bold mt-8" style={{ fontSize: 24 }}>
        {PHASES[phase]}
      </p>
      {demoMode && (
        <p className="text-[11px] uppercase mt-2" style={{ color: "#F4A261", letterSpacing: "0.1em" }}>Demo data</p>
      )}

      <div className="grid grid-cols-2 gap-3 w-full mt-10">
        {[
          { l: "Photos analysed", v: counters.photos },
          { l: "Locations found", v: counters.locations },
          { l: "Cities discovered", v: counters.cities },
          { l: "Countries discovered", v: counters.countries },
        ].map((c) => (
          <div key={c.l} className="rounded-2xl py-5" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
            <p className="font-heading text-white font-bold" style={{ fontSize: 30, lineHeight: 1 }}>{c.v}</p>
            <p className="text-[11px] mt-2 uppercase" style={{ color: MUTED, letterSpacing: "0.07em" }}>{c.l}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------------- 4 ------------------------------------ */

function ReviewStep({
  trips, setTrips, saving, onAdd,
}: {
  trips: DiscoveredTrip[];
  setTrips: (t: DiscoveredTrip[]) => void;
  saving: boolean;
  onAdd: () => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [mergeSel, setMergeSel] = useState<string[]>([]);
  const stats = useMemo(() => summarize(trips), [trips]);
  const allSelected = trips.every((t) => t.selected);

  const update = (id: string, patch: Partial<DiscoveredTrip>) =>
    setTrips(trips.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const byCountry = useMemo(() => {
    const map = new Map<string, DiscoveredTrip[]>();
    trips.forEach((t) => map.set(t.country, [...(map.get(t.country) ?? []), t]));
    return [...map.entries()];
  }, [trips]);

  return (
    <div className="px-5 pt-6 animate-fade-in" style={{ paddingBottom: 140 }}>
      <h1 className="font-heading text-white font-bold tracking-tight" style={{ fontSize: 32, lineHeight: 1.08 }}>
        We found your travels
      </h1>
      <p className="mt-2 text-[14px]" style={{ color: MUTED }}>
        {stats.countries} {stats.countries === 1 ? "country" : "countries"} · {stats.cities} {stats.cities === 1 ? "city" : "cities"} · {stats.memories} memories
      </p>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={() => setTrips(trips.map((t) => ({ ...t, selected: !allSelected })))}
          className="text-[13px] font-semibold"
          style={{ color: ACCENT }}
        >
          {allSelected ? "Deselect All" : "Select All"}
        </button>
        {mergeSel.length >= 2 && (
          <button
            onClick={() => { setTrips(mergeTrips(trips, mergeSel)); setMergeSel([]); }}
            className="text-[13px] font-semibold flex items-center gap-1.5"
            style={{ color: "#F4A261" }}
          >
            <Merge className="h-3.5 w-3.5" strokeWidth={1.8} /> Merge {mergeSel.length}
          </button>
        )}
      </div>

      <div className="mt-5 space-y-7">
        {byCountry.map(([country, list]) => (
          <div key={country}>
            <p className="text-white font-heading font-bold" style={{ fontSize: 20 }}>{country}</p>
            <div className="mt-3 space-y-3">
              {list.map((t) => (
                <div
                  key={t.id}
                  className="rounded-2xl p-4"
                  style={{
                    background: SURFACE,
                    border: `1px solid ${mergeSel.includes(t.id) ? "rgba(244,162,97,0.5)" : BORDER}`,
                    opacity: t.selected ? 1 : 0.5,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2 shrink-0">
                      {(t.thumbnails.length ? t.thumbnails : [null]).slice(0, 3).map((src, i) => (
                        <div
                          key={i}
                          className="h-11 w-11 rounded-xl bg-cover bg-center flex items-center justify-center"
                          style={{
                            backgroundImage: src ? `url(${src})` : undefined,
                            background: src ? undefined : ELEV,
                            border: `2px solid ${SURFACE}`,
                            zIndex: 3 - i,
                          }}
                        >
                          {!src && <MapPin className="h-4 w-4" style={{ color: MUTED, strokeWidth: 1.5 }} />}
                        </div>
                      ))}
                    </div>

                    <div className="flex-1 min-w-0">
                      {editing === t.id ? (
                        <div className="space-y-1.5">
                          <input
                            value={t.city}
                            onChange={(e) => update(t.id, { city: e.target.value })}
                            className="w-full rounded-lg px-2.5 py-1.5 text-[14px] text-white"
                            style={{ background: ELEV, border: `1px solid ${BORDER}` }}
                            placeholder="City"
                          />
                          <input
                            value={t.country}
                            onChange={(e) => update(t.id, { country: e.target.value })}
                            className="w-full rounded-lg px-2.5 py-1.5 text-[13px] text-white"
                            style={{ background: ELEV, border: `1px solid ${BORDER}` }}
                            placeholder="Country"
                          />
                        </div>
                      ) : (
                        <>
                          <p className="text-white truncate" style={{ fontSize: 16, fontWeight: 600 }}>{t.city}</p>
                          <p className="text-[12px] mt-0.5" style={{ color: MUTED }}>
                            {formatRange(t.startDate, t.endDate)} · {t.memoryCount} {t.memoryCount === 1 ? "memory" : "memories"}
                          </p>
                        </>
                      )}
                    </div>

                    <Switch checked={t.selected} onCheckedChange={(v) => update(t.id, { selected: v })} />
                  </div>

                  {t.selected && (
                    <>
                      <div className="mt-3 flex p-1 rounded-full" style={{ background: ELEV }}>
                        {([
                          { id: "private", label: "Private", Icon: Lock },
                          { id: "followers", label: "Followers", Icon: Users },
                          { id: "public", label: "Public", Icon: GlobeIcon },
                        ] as const).map(({ id, label, Icon }) => {
                          const active = t.visibility === id;
                          return (
                            <button
                              key={id}
                              onClick={() => update(t.id, { visibility: id as Visibility })}
                              className="flex-1 flex items-center justify-center gap-1.5 rounded-full"
                              style={{
                                background: active ? ACCENT : "transparent",
                                color: active ? "#FFFFFF" : MUTED,
                                padding: "8px 0", fontSize: 12, fontWeight: 600,
                              }}
                            >
                              <Icon className="h-3.5 w-3.5" strokeWidth={1.5} /> {label}
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-3 flex items-center gap-4">
                        <IconAction Icon={Pencil} label={editing === t.id ? "Done" : "Edit"} onClick={() => setEditing(editing === t.id ? null : t.id)} />
                        <IconAction
                          Icon={Merge}
                          label={mergeSel.includes(t.id) ? "Selected" : "Merge"}
                          onClick={() => setMergeSel((s) => (s.includes(t.id) ? s.filter((x) => x !== t.id) : [...s, t.id]))}
                        />
                        <IconAction Icon={Trash2} label="Remove" onClick={() => setTrips(trips.filter((x) => x.id !== t.id))} />
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div
        className="fixed inset-x-0 bottom-0 px-5 pt-6"
        style={{
          background: "linear-gradient(to top, #080D1A 65%, rgba(8,13,26,0))",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)",
        }}
      >
        <PrimaryButton onClick={onAdd} disabled={saving || stats.trips === 0}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saving ? "Adding…" : `Add to My World (${stats.trips})`}
        </PrimaryButton>
      </div>
    </div>
  );
}

function IconAction({ Icon, label, onClick }: { Icon: typeof Pencil; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: MUTED }}>
      <Icon className="h-3.5 w-3.5" strokeWidth={1.6} /> {label}
    </button>
  );
}

/* ----------------------------------- 5 ------------------------------------ */

function RevealStep({
  trips, stats,
}: { trips: DiscoveredTrip[]; stats: { countries: number; cities: number; memories: number } }) {
  const navigate = useNavigate();
  const [revealed, setRevealed] = useState(0);
  const [showCopy, setShowCopy] = useState(false);

  const selected = useMemo(() => trips.filter((t) => t.selected), [trips]);
  const pins = useMemo(
    () =>
      selected.slice(0, revealed).map((t, i) => ({
        lat: t.latitude, lng: t.longitude, label: `${t.city}, ${t.country}`,
        category: "memory", thumbnail: t.thumbnails[0] ?? null, recent: i === 0,
      })),
    [selected, revealed]
  );

  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i++;
      setRevealed(i);
      if (i >= selected.length) {
        clearInterval(id);
        setTimeout(() => setShowCopy(true), 500);
      }
    }, 260);
    if (selected.length === 0) setShowCopy(true);
    return () => clearInterval(id);
  }, [selected.length]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: BG }}>
      <div className="relative flex-1" style={{ minHeight: "48vh" }}>
        <Suspense fallback={null}>
          <FlagGlobe pins={pins} milestoneCodes={[]} />
        </Suspense>
      </div>

      <div
        className="px-6 pb-8 transition-all duration-700"
        style={{ opacity: showCopy ? 1 : 0, transform: showCopy ? "translateY(0)" : "translateY(16px)" }}
      >
        <h1 className="font-heading text-white font-bold tracking-tight" style={{ fontSize: 30, lineHeight: 1.08 }}>
          Your world is bigger than you remembered.
        </h1>
        <p className="mt-2 text-[14px]" style={{ color: MUTED }}>
          This is everywhere your story has taken you.
        </p>

        <div className="mt-7 flex items-end justify-between">
          {[
            { v: stats.countries, l: "Countries" },
            { v: stats.cities, l: "Cities" },
            { v: stats.memories, l: "Memories" },
          ].map((s) => (
            <div key={s.l} className="flex-1 text-center">
              <p className="font-heading text-white font-bold" style={{ fontSize: 34, lineHeight: 1 }}>{s.v}</p>
              <p className="text-[11px] uppercase mt-2" style={{ color: MUTED, letterSpacing: "0.08em" }}>{s.l}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 space-y-3">
          <PrimaryButton onClick={() => navigate("/globe")}>
            <Compass className="h-4 w-4" strokeWidth={1.6} /> Explore My World
          </PrimaryButton>
          <button
            disabled
            className="w-full inline-flex items-center justify-center gap-2"
            style={{
              height: 52, borderRadius: 9999, background: ELEV, border: `1px solid ${BORDER}`,
              fontSize: 15, fontWeight: 600, color: MUTED, opacity: 0.7,
            }}
          >
            <Share2 className="h-4 w-4" strokeWidth={1.6} /> Share My World — coming soon
          </button>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- shared --------------------------------- */

function PrimaryButton({
  children, onClick, disabled,
}: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full inline-flex items-center justify-center gap-2 text-white transition-transform active:scale-[0.98]"
      style={{
        height: 54, borderRadius: 9999, background: ACCENT, fontSize: 15, fontWeight: 600,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {children}
    </button>
  );
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
