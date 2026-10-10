import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, MapPin, X, ImagePlus, Loader2, Lock, Users, Globe2, Check } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { uploadUserMedia } from "@/lib/media";
import {
  searchCities, resolveCity, validateDates, validatePhoto, todayLocal, saveManualVisit,
  removeUploadedToken, SaveError, MAX_PHOTOS, PHOTO_TYPES, type CityResult, type Visibility,
} from "@/lib/world/manualVisit";

interface PhotoItem { id: string; file: File; preview: string; token?: string }

const VIS: { id: Visibility; label: string; desc: string; Icon: typeof Lock }[] = [
  { id: "private", label: "Private", desc: "Only you", Icon: Lock },
  { id: "followers", label: "Followers", desc: "Approved followers", Icon: Users },
  { id: "public", label: "Public", desc: "Anyone who can see your profile", Icon: Globe2 },
];

const field = { background: "#111827", border: "1px solid #1E2A3F" } as const;

export default function ManualVisitEntry() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CityResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<CityResult | null>(null);
  const seq = useRef(0);

  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [visibility, setVisibility] = useState<Visibility>("private");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Retained across retries so an ambiguous failure can be replayed without a duplicate visit.
  const requestId = useRef<string>(crypto.randomUUID());
  const ambiguousAttempt = useRef(false);
  const placeIdCache = useRef<Map<string, string>>(new Map());

  const today = todayLocal();

  useEffect(() => {
    if (selected) return;
    const q = query.trim();
    const my = ++seq.current;
    if (q.length < 2) { setResults([]); setSearchError(null); setSearching(false); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const r = await searchCities(q);
        if (my !== seq.current) return; // stale
        setResults(r); setSearchError(null);
      } catch (e) {
        if (my !== seq.current) return;
        setResults([]); setSearchError(e instanceof Error ? e.message : "City search is unavailable");
      } finally {
        if (my === seq.current) setSearching(false);
      }
    }, 450);
    return () => clearTimeout(t);
  }, [query, selected]);

  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.preview)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const onQueryChange = (v: string) => { setQuery(v); if (selected) setSelected(null); };
  const pick = (r: CityResult) => { seq.current++; setSelected(r); setQuery(`${r.name}, ${r.country}`); setResults([]); };

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next: PhotoItem[] = [];
    for (const f of Array.from(list)) {
      if (photos.length + next.length >= MAX_PHOTOS) { toast.error(`Up to ${MAX_PHOTOS} photos`); break; }
      const err = validatePhoto(f);
      if (err) { toast.error(err); continue; }
      next.push({ id: crypto.randomUUID(), file: f, preview: URL.createObjectURL(f) });
    }
    setPhotos((p) => [...p, ...next]);
  };

  const removePhoto = (id: string) => {
    setPhotos((p) => {
      const it = p.find((x) => x.id === id);
      if (it) {
        URL.revokeObjectURL(it.preview);
        // Uploaded but never referenced by a committed save → safe to delete.
        if (it.token && !ambiguousAttempt.current) removeUploadedToken(it.token).catch(() => {});
      }
      return p.filter((x) => x.id !== id);
    });
  };

  const cancel = () => {
    if (!ambiguousAttempt.current) {
      photos.forEach((p) => p.token && removeUploadedToken(p.token).catch(() => {}));
    }
    navigate(-1);
  };

  const dateError = start || end ? validateDates(start, end, today) : null;

  const save = async () => {
    setFormError(null);
    if (!user) { setFormError("Please sign in again"); return; }
    if (!selected) { setFormError("Choose a city from the list"); return; }
    const dErr = validateDates(start, end, today);
    if (dErr) { setFormError(dErr); return; }

    setSaving(true);
    try {
      let placeId = placeIdCache.current.get(selected.provider_place_id);
      if (!placeId) {
        placeId = await resolveCity(selected.provider_place_id, `${selected.name}, ${selected.country}`);
        placeIdCache.current.set(selected.provider_place_id, placeId);
      }
      const tokens: string[] = [];
      for (const p of photos) {
        if (!p.token) {
          const ext = (p.file.name.split(".").pop() || "jpg").toLowerCase().slice(0, 5);
          const token = await uploadUserMedia(p.file, user.id, ext);
          p.token = token;
          setPhotos((cur) => cur.map((x) => (x.id === p.id ? { ...x, token } : x)));
        }
        tokens.push(p.token!);
      }
      try {
        await saveManualVisit({
          requestId: requestId.current, placeId, start, end, note, photoTokens: tokens, visibility,
        });
      } catch (e) {
        if (e instanceof SaveError && e.ambiguous) ambiguousAttempt.current = true;
        throw e;
      }
      toast.success("Trip added to your atlas!");
      navigate("/globe", { replace: true });
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not save trip. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen pb-safe" style={{ background: "#080D1A" }}>
      <header className="flex items-center gap-3 px-5 pt-safe pt-4 pb-3">
        <button onClick={cancel} aria-label="Back" className="h-10 w-10 rounded-full flex items-center justify-center" style={field}>
          <ArrowLeft className="h-5 w-5 text-white" strokeWidth={1.5} />
        </button>
        <h1 className="font-heading text-[22px] font-bold text-white">Add Past Trip</h1>
      </header>

      <main className="px-5 space-y-6 pb-10">
        {/* City */}
        <section>
          <label htmlFor="city" className="text-[13px] font-semibold text-white">City</label>
          <div className="relative mt-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#4B5563" }} strokeWidth={1.5} />
            <input
              id="city" value={query} onChange={(e) => onQueryChange(e.target.value)} autoComplete="off"
              placeholder="Search a city" aria-autocomplete="list" aria-controls="city-results"
              className="w-full h-12 rounded-2xl pl-10 pr-10 text-[15px] text-white placeholder:text-[#4B5563] outline-none focus:border-[#3B82F6]"
              style={field}
            />
            {searching && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" style={{ color: "#94A3B8" }} aria-label="Searching" />}
            {selected && <Check className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#10B981" }} aria-label="City selected" />}
          </div>
          {!selected && results.length > 0 && (
            <ul id="city-results" role="listbox" className="mt-2 rounded-2xl overflow-hidden" style={field}>
              {results.map((r) => (
                <li key={r.provider_place_id}>
                  <button role="option" aria-selected={false} onClick={() => pick(r)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#1A2236]">
                    <MapPin className="h-4 w-4 shrink-0" style={{ color: "#3B82F6" }} strokeWidth={1.5} />
                    <span className="min-w-0">
                      <span className="block text-[14px] text-white truncate">{r.name}</span>
                      <span className="block text-[12px] truncate" style={{ color: "#94A3B8" }}>
                        {[r.region, r.country].filter(Boolean).join(", ")}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!selected && !searching && query.trim().length >= 2 && results.length === 0 && !searchError && (
            <p className="mt-2 text-[12px]" style={{ color: "#94A3B8" }}>No cities found. Try another spelling.</p>
          )}
          {searchError && <p role="alert" className="mt-2 text-[12px]" style={{ color: "#EF4444" }}>{searchError}</p>}
        </section>

        {/* Dates */}
        <section className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="start" className="text-[13px] font-semibold text-white">Start date</label>
            <input id="start" type="date" max={today} value={start} onChange={(e) => setStart(e.target.value)}
              className="mt-2 w-full h-12 rounded-2xl px-3 text-[15px] text-white outline-none [color-scheme:dark]" style={field} />
          </div>
          <div>
            <label htmlFor="end" className="text-[13px] font-semibold text-white">End date <span style={{ color: "#4B5563" }}>(optional)</span></label>
            <input id="end" type="date" min={start || undefined} max={today} value={end} onChange={(e) => setEnd(e.target.value)}
              className="mt-2 w-full h-12 rounded-2xl px-3 text-[15px] text-white outline-none [color-scheme:dark]" style={field} />
          </div>
          <p className="col-span-2 text-[12px] -mt-1" style={{ color: dateError ? "#EF4444" : "#4B5563" }} role={dateError ? "alert" : undefined}>
            {dateError ?? "Leave end date empty for a single-day visit."}
          </p>
        </section>

        {/* Note */}
        <section>
          <label htmlFor="note" className="text-[13px] font-semibold text-white">Note <span style={{ color: "#4B5563" }}>(optional)</span></label>
          <textarea id="note" value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} rows={3}
            placeholder="What do you remember?" className="mt-2 w-full rounded-2xl p-3 text-[15px] text-white placeholder:text-[#4B5563] outline-none resize-none" style={field} />
        </section>

        {/* Photos */}
        <section>
          <p className="text-[13px] font-semibold text-white">Photos <span style={{ color: "#4B5563" }}>(optional)</span></p>
          <p className="text-[12px] mt-1" style={{ color: "#94A3B8" }}>
            Up to {MAX_PHOTOS} photos, 15 MB each. They upload only when you tap Save. No location data needed.
          </p>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {photos.map((p) => (
              <div key={p.id} className="relative aspect-square rounded-xl overflow-hidden" style={field}>
                <img src={p.preview} alt={p.file.name} className="h-full w-full object-cover" />
                <button onClick={() => removePhoto(p.id)} disabled={saving} aria-label={`Remove ${p.file.name}`}
                  className="absolute top-1 right-1 h-6 w-6 rounded-full flex items-center justify-center" style={{ background: "rgba(8,13,26,0.8)" }}>
                  <X className="h-3.5 w-3.5 text-white" />
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <label className="aspect-square rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer text-[11px]" style={{ ...field, color: "#94A3B8", borderStyle: "dashed" }}>
                <ImagePlus className="h-5 w-5" strokeWidth={1.5} />
                Add
                <input type="file" accept={PHOTO_TYPES.join(",")} multiple className="sr-only" aria-label="Add photos"
                  onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
              </label>
            )}
          </div>
        </section>

        {/* Visibility */}
        <section>
          <p className="text-[13px] font-semibold text-white">Who can see this trip</p>
          <p className="text-[12px] mt-1" style={{ color: "#94A3B8" }}>Applies to the trip and its note and photos.</p>
          <div role="radiogroup" className="mt-3 space-y-2">
            {VIS.map(({ id, label, desc, Icon }) => {
              const on = visibility === id;
              return (
                <button key={id} role="radio" aria-checked={on} onClick={() => setVisibility(id)}
                  className="w-full flex items-center gap-3 px-4 h-14 rounded-2xl text-left"
                  style={{ background: on ? "rgba(59,130,246,0.12)" : "#111827", border: `1px solid ${on ? "#3B82F6" : "#1E2A3F"}` }}>
                  <Icon className="h-4 w-4" style={{ color: on ? "#3B82F6" : "#94A3B8" }} strokeWidth={1.5} />
                  <span className="flex-1">
                    <span className="block text-[14px] text-white font-medium">{label}</span>
                    <span className="block text-[12px]" style={{ color: "#94A3B8" }}>{desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {formError && <p role="alert" className="text-[13px]" style={{ color: "#EF4444" }}>{formError}</p>}

        <div className="flex gap-2">
          <button onClick={cancel} disabled={saving} className="flex-1 h-12 rounded-full text-white font-semibold text-[15px] disabled:opacity-40" style={field}>
            Cancel
          </button>
          <button onClick={save} disabled={saving || !selected || !start || !!dateError}
            className="flex-[2] h-12 rounded-full text-white font-semibold text-[15px] flex items-center justify-center gap-2 disabled:opacity-40"
            style={{ background: "#3B82F6" }}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Saving…" : "Save trip"}
          </button>
        </div>
      </main>
    </div>
  );
}
