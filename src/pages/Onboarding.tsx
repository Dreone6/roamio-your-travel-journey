/**
 * 60-second first run: tag countries → optional photo scan → globe ignition.
 * Everything saved is private by default; nothing is invented.
 */
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, Compass, Search, Images, Loader2, Check, Sparkles, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { GlobeBoundary } from "@/components/GlobeBoundary";
import GlobeThemePicker from "@/components/globe/GlobeThemePicker";
import { COUNTRIES, type TagCountry } from "@/lib/onboarding/countries";
import { saveCountryTags } from "@/lib/onboarding/saveCountryTags";
import { browserFileSource } from "@/lib/buildworld/mediaSource";
import { extractMetadata } from "@/lib/buildworld/metadata";
import { buildDiscoveredTrips } from "@/lib/buildworld/cluster";
import { saveDiscoveredTrips } from "@/lib/buildworld/persist";
import type { DiscoveredTrip } from "@/lib/buildworld/types";
import { loadPalette, savePalette, type GlobePalette } from "@/lib/globe/themes";

const InteractiveGlobe = lazyWithRetry(
  () => import("@/components/globe/InteractiveGlobe"),
  "interactive-globe",
);

const BG = "#080D1A";
const SURFACE = "#111827";
const ELEV = "#1A2236";
const BORDER = "#1E2A3F";
const MUTED = "#94A3B8";
const ACCENT = "#3B82F6";
const GOLD = "#F4A261";

type Step = "tag" | "photos" | "ignite";

function travelerTitle(countries: number) {
  if (countries >= 30) return "Globe Legend";
  if (countries >= 15) return "Seasoned Explorer";
  if (countries >= 7) return "World Wanderer";
  if (countries >= 3) return "Rising Roamer";
  return "First Steps";
}

export default function Onboarding() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState<Step>("tag");
  const [selected, setSelected] = useState<string[]>([]);
  const [trips, setTrips] = useState<DiscoveredTrip[]>([]);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/auth", { replace: true }); return; }
    Promise.resolve(supabase.from("profiles").select("onboarding_completed").eq("id", user.id).single())
      .then(({ data }) => {
        if (data?.onboarding_completed) navigate("/home", { replace: true });
        else setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [user, loading, navigate]);

  const tagged = useMemo(() => COUNTRIES.filter((c) => selected.includes(c.code)), [selected]);

  const finish = async (save: boolean) => {
    if (!user || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      if (save) {
        await saveCountryTags(user.id, tagged);
        if (trips.length) await saveDiscoveredTrips(user.id, trips);
      }
      const { error } = await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
      if (error) throw error;
      navigate("/globe", { replace: true });
    } catch (e) {
      console.error(e);
      toast.error("Couldn't save your globe. Please try again.");
      savingRef.current = false;
      setSaving(false);
    }
  };

  if (loading || checking) {
    return (
      <div className="flex min-h-dvh items-center justify-center" style={{ background: BG }}>
        <Compass className="h-8 w-8 animate-spin" style={{ color: ACCENT }} />
      </div>
    );
  }

  const stepIndex = step === "tag" ? 0 : step === "photos" ? 1 : 2;

  return (
    <div className="min-h-dvh flex flex-col safe-top" style={{ background: BG }}>
      <div className="flex items-center gap-2 px-5 pt-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-1 flex-1 rounded-full transition-colors duration-500"
            style={{ background: i <= stepIndex ? ACCENT : BORDER }} />
        ))}
      </div>

      {step === "tag" && (
        <TagStep
          selected={selected}
          setSelected={setSelected}
          onNext={() => setStep("photos")}
          onSkip={() => finish(false)}
        />
      )}
      {step === "photos" && (
        <PhotoStep
          onDone={(found) => { setTrips(found); setStep("ignite"); }}
          onBack={() => setStep("tag")}
        />
      )}
      {step === "ignite" && (
        <IgniteStep countries={tagged} trips={trips} saving={saving} onFinish={() => finish(true)} />
      )}
    </div>
  );
}

/* ─────────────────────────── 1. Country quick-tagger ─────────────────────────── */

function TagStep({ selected, setSelected, onNext, onSkip }: {
  selected: string[];
  setSelected: (fn: (s: string[]) => string[]) => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const [q, setQ] = useState("");
  const toggle = (code: string) =>
    setSelected((s) => (s.includes(code) ? s.filter((c) => c !== code) : [...s, code]));
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return COUNTRIES.filter((c) => c.popular || selected.includes(c.code));
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(term));
  }, [q, selected]);

  return (
    <div className="flex-1 flex flex-col px-5 pt-8 pb-8">
      <h1 className="font-heading text-[30px] font-bold text-white leading-tight tracking-tight">
        Where have you been?
      </h1>
      <p className="mt-2 text-[14px]" style={{ color: MUTED }}>
        Tap every country you've visited. It takes about 15 seconds.
      </p>

      <div className="mt-5 flex items-center gap-2 rounded-full px-4" style={{ background: ELEV, border: `1px solid ${BORDER}`, height: 46 }}>
        <Search className="h-4 w-4" style={{ color: MUTED }} strokeWidth={1.5} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search any country"
          aria-label="Search countries"
          className="flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-[#4B5563]"
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-2 content-start flex-1 overflow-y-auto">
        {list.map((c) => {
          const on = selected.includes(c.code);
          return (
            <button
              key={c.code}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(c.code)}
              className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium transition-all active:scale-95"
              style={{
                background: on ? ACCENT : SURFACE,
                border: `1px solid ${on ? ACCENT : BORDER}`,
                color: on ? "#FFFFFF" : "#E2E8F0",
                transform: on ? "scale(1.04)" : "none",
              }}
            >
              <span className="text-[16px] leading-none">{c.flag}</span>
              {c.name}
              {on && <Check className="h-3.5 w-3.5" strokeWidth={2} />}
            </button>
          );
        })}
        {list.length === 0 && <p className="text-[13px]" style={{ color: MUTED }}>No country matches "{q}".</p>}
      </div>

      <div className="pt-5 space-y-3">
        <p className="text-center text-[13px] font-semibold" style={{ color: selected.length ? GOLD : MUTED }}>
          {selected.length === 0 ? "Nothing tagged yet" : `${selected.length} ${selected.length === 1 ? "country" : "countries"} · ${travelerTitle(selected.length)}`}
        </p>
        <button
          onClick={onNext}
          className="w-full rounded-full flex items-center justify-center gap-2 text-white font-semibold text-[14px]"
          style={{ background: ACCENT, height: 52 }}
        >
          {selected.length ? "Light up my globe" : "Continue"} <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <button onClick={onSkip} className="w-full text-center text-[13px]" style={{ color: MUTED }}>
          Skip for now
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────── 2. Optional photo scan ─────────────────────────── */

function PhotoStep({ onDone, onBack }: { onDone: (trips: DiscoveredTrip[]) => void; onBack: () => void }) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ scanned: 0, total: 0, found: 0 });
  const [result, setResult] = useState<DiscoveredTrip[] | null>(null);

  const scan = async () => {
    const items = await browserFileSource.pickMedia();
    if (!items.length) return;
    setBusy(true);
    try {
      const ex = await extractMetadata(items, (scanned, total, found) => setProgress({ scanned, total, found }));
      const found = ex.geotagged.length ? await buildDiscoveredTrips(ex.geotagged) : [];
      const ready = found.map((t) => ({ ...t, selected: true, visibility: "private" as const }));
      setResult(ready);
      if (!ready.length) toast("No location info found in those photos — that's okay.");
    } catch (e) {
      console.error(e);
      toast.error("Couldn't read those photos.");
    } finally {
      setBusy(false);
    }
  };

  const cities = result ? new Set(result.map((t) => `${t.city}|${t.country}`)).size : 0;

  return (
    <div className="flex-1 flex flex-col px-5 pt-8 pb-8">
      <h1 className="font-heading text-[30px] font-bold text-white leading-tight tracking-tight">
        Add cities from your photos
      </h1>
      <p className="mt-2 text-[14px]" style={{ color: MUTED }}>
        Pick a few trip photos. We only read where and when each was taken — nothing is uploaded.
      </p>

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full rounded-3xl p-6 text-center" style={{ background: SURFACE, border: `1px dashed ${BORDER}` }}>
          {busy ? (
            <>
              <Loader2 className="mx-auto h-8 w-8 animate-spin" style={{ color: ACCENT }} />
              <p className="mt-3 text-[14px] text-white">Reading photo {progress.scanned} of {progress.total}…</p>
              <p className="mt-1 text-[12px]" style={{ color: MUTED }}>{progress.found} with a location</p>
            </>
          ) : result ? (
            <>
              <div className="mx-auto h-12 w-12 rounded-full flex items-center justify-center" style={{ background: result.length ? ACCENT : ELEV }}>
                <Check className="h-6 w-6 text-white" strokeWidth={2} />
              </div>
              <p className="mt-3 font-heading text-[20px] font-bold text-white">
                {result.length ? `${cities} ${cities === 1 ? "city" : "cities"} found` : "No locations found"}
              </p>
              <p className="mt-1 text-[12px]" style={{ color: MUTED }}>
                {result.slice(0, 4).map((t) => t.city).join(" · ")}
              </p>
              <button onClick={scan} className="mt-4 text-[13px] font-semibold" style={{ color: ACCENT }}>Scan more photos</button>
            </>
          ) : (
            <>
              <Images className="mx-auto h-10 w-10" style={{ color: ACCENT }} strokeWidth={1.5} />
              <button
                onClick={scan}
                className="mt-4 rounded-full px-6 text-white font-semibold text-[14px]"
                style={{ background: ACCENT, height: 46 }}
              >
                Choose photos
              </button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-[12px]" style={{ color: MUTED }}>
                <Lock className="h-3.5 w-3.5" strokeWidth={1.5} /> Saved as private
              </p>
            </>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <button
          disabled={busy}
          onClick={() => onDone(result ?? [])}
          className="w-full rounded-full flex items-center justify-center gap-2 text-white font-semibold text-[14px] disabled:opacity-50"
          style={{ background: result?.length ? ACCENT : ELEV, height: 52 }}
        >
          {result?.length ? "Ignite my globe" : "Skip photos"} <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        </button>
        <button disabled={busy} onClick={onBack} className="w-full text-center text-[13px] disabled:opacity-50" style={{ color: MUTED }}>
          Back
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────── 3. Globe ignition ─────────────────────────── */

function IgniteStep({ countries, trips, saving, onFinish }: {
  countries: TagCountry[];
  trips: DiscoveredTrip[];
  saving: boolean;
  onFinish: () => void;
}) {
  const [theme, setTheme] = useState(() => loadPalette());
  const [showStamp, setShowStamp] = useState(false);
  const pickTheme = (id: string, palette: GlobePalette) => { setTheme({ id, palette }); savePalette(id, palette); };

  const cityCount = new Set(trips.map((t) => `${t.city}|${t.country}`)).size;
  const countryCount = new Set([...countries.map((c) => c.name.toLowerCase()), ...trips.map((t) => t.country.toLowerCase())]).size;

  const pins = useMemo(() => [
    ...trips.map((t, i) => ({ lat: t.latitude, lng: t.longitude, label: t.city, category: "memory", recent: i === 0 })),
    ...countries.map((c) => ({ lat: c.lat, lng: c.lng, label: c.name, category: "visited" })),
  ], [countries, trips]);
  const highlights = useMemo(() => countries.map((c) => ({ name: c.name, lat: c.lat, lng: c.lng, size: 0.35 })), [countries]);
  const arcs = useMemo(() => {
    const pts = pins.slice(0, 10);
    return pts.slice(1).map((p, i) => ({ from: { lat: pts[i].lat, lng: pts[i].lng }, to: { lat: p.lat, lng: p.lng } }));
  }, [pins]);

  useEffect(() => {
    const t = setTimeout(() => setShowStamp(true), 600 + pins.length * 220);
    return () => clearTimeout(t);
  }, [pins.length]);

  const empty = pins.length === 0;

  return (
    <div className="flex-1 flex flex-col">
      <div className="relative" style={{ height: "48vh", maxHeight: 440 }}>
        <GlobeBoundary fallback={<div className="h-full flex items-center justify-center"><Compass className="h-12 w-12" style={{ color: ACCENT }} strokeWidth={1.5} /></div>}>
          <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" style={{ color: ACCENT }} /></div>}>
            <InteractiveGlobe pins={pins} arcs={arcs} highlights={highlights} palette={theme.palette} ignite autoRotate decorative />
          </Suspense>
        </GlobeBoundary>

        {showStamp && !empty && (
          <div
            className="absolute right-4 top-4 rounded-2xl px-3 py-2 animate-in zoom-in-50 fade-in duration-500"
            style={{ background: SURFACE, border: `1px solid ${GOLD}`, transform: "rotate(-6deg)" }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: GOLD }}>Passport stamp</p>
            <p className="text-[13px] font-heading font-bold text-white">{travelerTitle(countryCount)}</p>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col px-5 pb-8">
        <div className="text-center">
          <h1 className="font-heading text-[28px] font-bold text-white leading-tight tracking-tight">
            {empty ? "Your globe is ready" : "Your world, lit up"}
          </h1>
          <p className="mt-1.5 text-[14px]" style={{ color: MUTED }}>
            {empty
              ? "Add your first trip any time from the World screen."
              : `${countryCount} ${countryCount === 1 ? "country" : "countries"}${cityCount ? ` · ${cityCount} ${cityCount === 1 ? "city" : "cities"}` : ""} · saved privately`}
          </p>
        </div>

        <div className="mt-5 rounded-2xl p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
          <p className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-white">
            <Sparkles className="h-4 w-4" style={{ color: GOLD }} strokeWidth={1.5} /> Make it yours
          </p>
          <GlobeThemePicker selectedId={theme.id} palette={theme.palette} onChange={pickTheme} />
        </div>

        <div className="flex-1" />
        <button
          onClick={onFinish}
          disabled={saving}
          className="mt-5 w-full rounded-full flex items-center justify-center gap-2 text-white font-semibold text-[14px] disabled:opacity-60"
          style={{ background: ACCENT, height: 52 }}
        >
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving your globe…</> : <>Explore my world <ArrowRight className="h-4 w-4" strokeWidth={1.5} /></>}
        </button>
      </div>
    </div>
  );
}
