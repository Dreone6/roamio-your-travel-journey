/**
 * 60-second first run: tag countries → optional photo scan → globe ignition.
 * Everything saved is private by default; nothing is invented.
 */
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, Compass, Search, Images, Loader2, Check, Sparkles, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { lazyWithRetry } from "@/lib/lazyWithRetry";
import { GlobeBoundary } from "@/components/GlobeBoundary";
import { Button } from "@/components/ui/button";
import "@/styles/world-onboarding.css";
import GlobeThemePicker from "@/components/globe/GlobeThemePicker";
import { COUNTRIES, type TagCountry } from "@/lib/onboarding/countries";
import { saveCountryTags } from "@/lib/onboarding/saveCountryTags";
import { browserFileSource, nativePhotoLibrarySource, pickNativeMedia } from "@/lib/buildworld/mediaSource";
import { extractMetadata } from "@/lib/buildworld/metadata";
import { buildDiscoveredTrips } from "@/lib/buildworld/cluster";
import { saveDiscoveredTrips } from "@/lib/buildworld/persist";
import type { DiscoveredTrip } from "@/lib/buildworld/types";
import { loadPalette, savePalette, type GlobePalette } from "@/lib/globe/themes";

const InteractiveGlobe = lazyWithRetry(
  () => import("@/components/globe/InteractiveGlobe"),
  "interactive-globe",
);

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
  const [params] = useSearchParams();
  const quickStart = params.get("mode") === "quick-start";
  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState<Step>("tag");
  const [selected, setSelected] = useState<string[]>([]);
  const [trips, setTrips] = useState<DiscoveredTrip[]>([]);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/auth", { replace: true }); return; }
    if (quickStart) { setChecking(false); return; }
    let active = true;
    Promise.resolve(supabase.from("profiles").select("onboarding_completed").eq("id", user.id).single())
      .then(({ data }) => {
        if (!active) return;
        if (data?.onboarding_completed) navigate("/home", { replace: true });
        else setChecking(false);
      })
      .catch(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [user, loading, navigate, quickStart]);

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
      if (!quickStart) {
        const { error } = await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
        if (error) throw error;
      }
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
      <div className="world-onboarding bg-background text-foreground flex min-h-dvh items-center justify-center" >
        <Compass className="h-8 w-8 animate-spin"  />
      </div>
    );
  }

  const stepIndex = step === "tag" ? 0 : step === "photos" ? 1 : 2;

  return (
    <div className="world-onboarding bg-background text-foreground min-h-dvh flex flex-col safe-top" >
      <div className="mx-auto w-full max-w-2xl flex items-center gap-2 px-5 pt-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-500 ${i <= stepIndex ? "bg-primary" : "bg-border"}`} />
        ))}
      </div>

      {step === "tag" && (
        <TagStep
          selected={selected}
          setSelected={setSelected}
          onNext={() => setStep("photos")}
          onSkip={() => quickStart ? navigate("/globe") : finish(false)}
          saving={saving}
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

function TagStep({ selected, setSelected, onNext, onSkip, saving }: {
  selected: string[];
  setSelected: (fn: (s: string[]) => string[]) => void;
  onNext: () => void;
  onSkip: () => void;
  saving: boolean;
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
    <div className="mx-auto w-full max-w-2xl flex-1 flex flex-col px-5 pt-8 pb-8 gap-0">
      <h1 className="font-heading text-[30px] font-bold text-foreground leading-tight tracking-normal">
        Where have you been?
      </h1>
      <p className="mt-2 text-[14px] text-muted-foreground" >
        Every place has a story. Which countries are part of yours?
      </p>

      <div className="mt-5 flex h-12 items-center gap-2 rounded-full px-4 bg-secondary border border-border">
        <Search className="h-4 w-4"  strokeWidth={1.5} />
        <input
          disabled={saving}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search any country"
          aria-label="Search countries"
          className="flex-1 bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-2 content-start flex-1">
        {list.map((c) => {
          const on = selected.includes(c.code);
          return (
            <Button
              key={c.code}
              type="button"
              disabled={saving}
              variant={on ? "default" : "secondary"}
              aria-pressed={on}
              onClick={() => toggle(c.code)}
              className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium transition-all active:scale-95"

            >
              <span className="text-[16px] leading-none">{c.flag}</span>
              {c.name}
              {on && <Check className="h-3.5 w-3.5" strokeWidth={2} />}
            </Button>
          );
        })}
        {list.length === 0 && <p className="text-[13px]" >No country matches "{q}".</p>}
      </div>

      <div className="pt-5 space-y-3">
        <p className="text-center text-[13px] font-semibold text-muted-foreground">
          {selected.length === 0 ? "Nothing tagged yet" : `${selected.length} ${selected.length === 1 ? "country" : "countries"} · ${travelerTitle(selected.length)}`}
        </p>
        <Button
          disabled={saving}
          onClick={onNext}
          className="w-full rounded-full flex items-center justify-center gap-2 text-foreground font-semibold text-[14px]"
          size="lg"
        >
          {selected.length ? "Light up my globe" : "Continue"} <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        </Button>
        <Button disabled={saving} variant="ghost" onClick={onSkip} className="w-full text-center text-[13px]" >
          Skip for now
        </Button>
      </div>
    </div>
  );
}

/* ─────────────────────────── 2. Optional photo scan ─────────────────────────── */

function PhotoStep({ onDone, onBack }: { onDone: (trips: DiscoveredTrip[]) => void; onBack: () => void }) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ scanned: 0, total: 0, found: 0 });
  const [result, setResult] = useState<DiscoveredTrip[] | null>(null);

  const scanRef = useRef(false);
  const activeRef = useRef(true);
  useEffect(() => { activeRef.current = true; return () => { activeRef.current = false; }; }, []);
  const scan = async () => {
    if (scanRef.current) return;
    scanRef.current = true;
    setBusy(true);
    try {
      let items;
      if (nativePhotoLibrarySource.isAvailable()) {
        const picked = await pickNativeMedia();
        if (picked.status === "cancelled") return;
        if (picked.status !== "success") throw new Error("Photo access unavailable");
        items = picked.items;
      } else items = await browserFileSource.pickMedia();
      if (!items.length || !activeRef.current) return;
      const ex = await extractMetadata(items, (scanned, total, found) => activeRef.current && setProgress({ scanned, total, found }));
      const found = ex.geotagged.length ? await buildDiscoveredTrips(ex.geotagged) : [];
      const ready = found.map((t) => ({ ...t, selected: true, visibility: "private" as const }));
      if (!activeRef.current) return;
      setResult((previous) => {
        const combined = new Map((previous ?? []).map((trip) => [trip.importKey, trip]));
        ready.forEach((trip) => combined.set(trip.importKey, trip));
        return [...combined.values()];
      });
      if (!ready.length) toast("No location info found in those photos — that's okay.");
    } catch (e) {
      console.error(e);
      toast.error("Couldn't read those photos.");
    } finally {
      scanRef.current = false;
      if (activeRef.current) setBusy(false);
    }
  };

  const cities = result ? new Set(result.map((t) => `${t.city}|${t.country}`)).size : 0;

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 flex flex-col px-5 pt-8 pb-8 gap-0">
      <h1 className="font-heading text-[30px] font-bold text-foreground leading-tight tracking-normal">
        Add cities from your photos
      </h1>
      <p className="mt-2 text-[14px] text-muted-foreground" >
        Pick a few trip photos. We only read where and when each was taken — nothing is uploaded.
      </p>

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full py-10 text-center border-y border-dashed border-border">
          {busy ? (
            <>
              <Loader2 className="mx-auto h-8 w-8 animate-spin"  />
              <p className="mt-3 text-[14px] text-foreground">Reading photo {progress.scanned} of {progress.total}…</p>
              <p className="mt-1 text-[12px]" >{progress.found} with a location</p>
            </>
          ) : result ? (
            <>
              <div className="mx-auto h-12 w-12 rounded-full flex items-center justify-center" >
                <Check className="h-6 w-6 text-foreground" strokeWidth={2} />
              </div>
              <p className="mt-3 font-heading text-[20px] font-bold text-foreground">
                {result.length ? `${cities} ${cities === 1 ? "city" : "cities"} found` : "No locations found"}
              </p>
              <p className="mt-1 text-[12px]" >
                {result.slice(0, 4).map((t) => t.city).join(" · ")}
              </p>
              <Button variant="ghost" onClick={scan} className="mt-4 text-[13px] font-semibold" >Scan more photos</Button>
            </>
          ) : (
            <>
              <Images className="mx-auto h-10 w-10"  strokeWidth={1.5} />
              <Button
                onClick={scan}
                className="mt-4 rounded-full px-6 text-foreground font-semibold text-[14px]"
                size="lg"
              >
                Choose photos
              </Button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-[12px]" >
                <Lock className="h-3.5 w-3.5" strokeWidth={1.5} /> Saved as private
              </p>
            </>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <Button
          disabled={busy}
          onClick={() => onDone(result ?? [])}
          className="w-full rounded-full flex items-center justify-center gap-2 text-foreground font-semibold text-[14px] disabled:opacity-50"
          size="lg"
          variant={result?.length ? "default" : "secondary"}
        >
          {result?.length ? "Ignite my globe" : "Skip photos"} <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        </Button>
        <Button variant="ghost" disabled={busy} onClick={onBack} className="w-full text-center text-[13px] disabled:opacity-50" >
          Back
        </Button>
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
      <div className="relative h-[44dvh] min-h-64 max-h-[440px]">
        <GlobeBoundary fallback={<div className="h-full flex items-center justify-center"><Compass className="h-12 w-12"  strokeWidth={1.5} /></div>}>
          <Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin"  /></div>}>
            <InteractiveGlobe pins={pins} arcs={arcs} highlights={highlights} palette={theme.palette} ignite autoRotate decorative />
          </Suspense>
        </GlobeBoundary>

        {showStamp && !empty && (
          <div
            className="passport-stamp absolute right-4 top-4 rounded-lg border bg-card px-3 py-2 -rotate-6 animate-in zoom-in-50 fade-in duration-500"

          >
            <p className="text-[10px] font-semibold uppercase tracking-normal" >Passport stamp</p>
            <p className="text-[13px] font-heading font-bold text-foreground">{travelerTitle(countryCount)}</p>
          </div>
        )}
      </div>

      <div className="mx-auto w-full max-w-2xl flex-1 flex flex-col px-5 pb-8">
        <div className="text-center">
          <h1 className="font-heading text-[28px] font-bold text-foreground leading-tight tracking-normal">
            {empty ? "Your globe is ready" : "Your world, lit up"}
          </h1>
          <p className="mt-1.5 text-[14px] text-muted-foreground" >
            {empty
              ? "Add your first trip any time from the World screen."
              : `${countryCount} ${countryCount === 1 ? "country" : "countries"}${cityCount ? ` · ${cityCount} ${cityCount === 1 ? "city" : "cities"}` : ""} · private by default`}
          </p>
        </div>

        <div className="mt-5 border-y border-border py-4">
          <p className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
            <Sparkles className="h-4 w-4"  strokeWidth={1.5} /> Make it yours
          </p>
          <GlobeThemePicker selectedId={theme.id} palette={theme.palette} onChange={pickTheme} disabled={saving} />
        </div>

        <div className="flex-1" />
        <Button
          onClick={onFinish}
          disabled={saving}
          className="mt-5 w-full rounded-full flex items-center justify-center gap-2 text-foreground font-semibold text-[14px] disabled:opacity-60"
          size="lg"
        >
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving your globe…</> : <>Explore my world <ArrowRight className="h-4 w-4" strokeWidth={1.5} /></>}
        </Button>
      </div>
    </div>
  );
}
