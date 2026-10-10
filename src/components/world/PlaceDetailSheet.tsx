/**
 * City visit timeline. Distinct visit cards, newest first, each with its
 * linked memories (photos/videos with captions below, and note-only entries).
 *
 * Scope: the target world's owner + the exact visit ids grouped into this
 * city. RLS still decides which visits/memories the viewer may read.
 */
import { useCallback, useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Share2, MapPin, Plus, RefreshCw, ImageOff, Lock, Users, Globe2, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { flagEmoji } from "@/lib/world/countries";
import { formatVisitDate, type CityPlace } from "@/lib/world/visits";
import { resolveMediaUrl } from "@/lib/media";
import { fetchCityTimeline, sourceLabel, type TimelineMemory, type TimelineVisit } from "@/lib/world/visitTimeline";
import PeopleWhoKnowPlace from "@/components/social/PeopleWhoKnowPlace";
import AddVisitMemoryDialog from "./AddVisitMemoryDialog";

interface Props {
  place: CityPlace | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** User id whose world this is. Every query is scoped to it. */
  ownerId: string | null | undefined;
  /** Called after a memory is durably saved so the world totals reload. */
  onWorldChanged?: () => void;
}

const VIS_ICON = { private: Lock, followers: Users, public: Globe2 } as const;

function MemoryMedia({ memory, city }: { memory: TimelineMemory; city: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [full, setFull] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    resolveMediaUrl(memory.mediaUrl)
      .then((u) => { if (cancelled) return; if (u) { setUrl(u); } else setState("error"); })
      .catch(() => { if (!cancelled) setState("error"); });
    return () => { cancelled = true; };
  }, [memory.mediaUrl, attempt]);

  const alt = memory.caption || `Memory from ${city}`;
  if (state === "error") {
    return (
      <button onClick={() => setAttempt((a) => a + 1)}
        className="w-full aspect-[4/3] rounded-xl flex flex-col items-center justify-center gap-1 text-[12px]"
        style={{ background: "#1A2236", color: "#94A3B8" }} aria-label="Couldn't load photo. Retry">
        <ImageOff className="h-5 w-5" strokeWidth={1.5} /> Couldn't load · Tap to retry
      </button>
    );
  }
  return (
    <>
      <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden" style={{ background: "#1A2236" }}>
        {state === "loading" && <div className="absolute inset-0 animate-pulse" style={{ background: "#1A2236" }} />}
        {url && (memory.mediaType === "video" ? (
          <video src={url} controls preload="metadata" className="h-full w-full object-cover"
            onLoadedData={() => setState("ready")} onError={() => setState("error")} />
        ) : (
          <button onClick={() => setFull(true)} className="h-full w-full" aria-label={`View photo: ${alt}`}>
            <img src={url} alt={alt} loading="lazy" className="h-full w-full object-cover"
              onLoad={() => setState("ready")} onError={() => setState("error")} />
          </button>
        ))}
      </div>
      {full && url && (
        <div role="dialog" aria-modal="true" aria-label={alt}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(8,13,26,0.95)" }}
          onClick={() => setFull(false)}>
          <img src={url} alt={alt} className="max-h-full max-w-full object-contain rounded-xl" />
          <button onClick={() => setFull(false)} aria-label="Close photo" autoFocus
            className="absolute top-4 right-4 h-10 w-10 rounded-full flex items-center justify-center" style={{ background: "#1A2236" }}>
            <X className="h-5 w-5 text-white" />
          </button>
        </div>
      )}
    </>
  );
}

function VisitCard({ visit, owner, onAdd }: { visit: TimelineVisit; owner: boolean; onAdd: () => void }) {
  const VisIcon = VIS_ICON[visit.visibility] ?? Lock;
  const date = visit.startDate ? formatVisitDate(visit.startDate, visit.endDate) : "Date unknown";
  return (
    <article className="rounded-2xl p-4" style={{ background: "#1A2236", border: "1px solid #1E2A3F" }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-white">{date}</p>
          <p className="text-[12px] mt-0.5" style={{ color: "#94A3B8" }}>{sourceLabel(visit.source)}</p>
        </div>
        {owner && (
          <span className="flex items-center gap-1 text-[11px] capitalize shrink-0" style={{ color: "#94A3B8" }}>
            <VisIcon className="h-3 w-3" strokeWidth={1.5} /> {visit.visibility}
          </span>
        )}
      </div>

      {visit.memories.length > 0 && (
        <div className="mt-3 space-y-3">
          {visit.memories.map((m) =>
            m.mediaType === "note" ? (
              <p key={m.id} className="text-[14px] text-white whitespace-pre-wrap rounded-xl p-3" style={{ background: "#111827" }}>
                {m.caption}
              </p>
            ) : (
              <figure key={m.id}>
                <MemoryMedia memory={m} city={visit.city} />
                {m.caption && <figcaption className="mt-1.5 text-[13px] text-white whitespace-pre-wrap">{m.caption}</figcaption>}
              </figure>
            ),
          )}
        </div>
      )}

      {visit.memories.length === 0 && (
        <p className="mt-2 text-[12px]" style={{ color: "#4B5563" }}>No saved memories yet.</p>
      )}
      {visit.scannedPhotos > 0 && (
        <p className="mt-2 text-[12px]" style={{ color: "#4B5563" }}>
          {visit.scannedPhotos} {visit.scannedPhotos === 1 ? "photo" : "photos"} found on your device (not uploaded)
        </p>
      )}

      {owner && visit.source !== "demo" && (
        <button onClick={onAdd}
          className="mt-3 h-10 px-4 rounded-full inline-flex items-center gap-1.5 text-[13px] font-semibold text-white"
          style={{ background: "#3B82F6" }}>
          <Plus className="h-4 w-4" strokeWidth={1.5} /> Add Memory
        </button>
      )}
    </article>
  );
}

export default function PlaceDetailSheet({ place, open, onOpenChange, ownerId, onWorldChanged }: Props) {
  const { user } = useAuth();
  const viewerId = user?.id ?? null;
  const owner = !!viewerId && viewerId === ownerId;

  const [visits, setVisits] = useState<TimelineVisit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [target, setTarget] = useState<TimelineVisit | null>(null);

  const visitIds = place?.visits.map((v) => v.id).sort().join(",") ?? "";

  // Reset whenever city / world owner / viewer changes or the sheet closes,
  // so a former viewer's private data never lingers.
  useEffect(() => {
    setVisits([]); setError(null); setTarget(null);
    if (!open || !ownerId || !visitIds || !viewerId) return;
    let cancelled = false;
    setLoading(true);
    fetchCityTimeline(ownerId, visitIds.split(","))
      .then((v) => { if (!cancelled) setVisits(v); })
      .catch((e) => { if (!cancelled) setError(e?.message ?? "Couldn't load visits"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, ownerId, viewerId, visitIds, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  if (!place) return null;
  const flag = flagEmoji(place.country);
  const count = visits.length || (loading || error ? place.visitCount : 0);

  const share = async () => {
    const text = `${place.city}, ${place.country}`;
    try {
      if (navigator.share) await navigator.share({ title: text, text });
      else { await navigator.clipboard.writeText(text); toast.success("Place copied"); }
    } catch { /* dismissed */ }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="border-0 px-0 pb-0 flex flex-col max-h-[88dvh]"
          style={{ background: "#111827", borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
          <div className="px-5 pt-2 pb-3 flex items-start gap-3 shrink-0">
            <div className="h-11 w-11 rounded-full flex items-center justify-center text-[20px] shrink-0" style={{ background: "rgba(59,130,246,0.12)" }}>
              {flag ?? <MapPin className="h-5 w-5" style={{ color: "#3B82F6" }} strokeWidth={1.5} />}
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="font-heading text-[24px] font-bold text-white leading-tight tracking-tight truncate">{place.city}</SheetTitle>
              <SheetDescription className="text-[13px] mt-0.5" style={{ color: "#94A3B8" }}>
                {place.country} · {count === 1 ? "1 visit" : `${count} visits`}
              </SheetDescription>
            </div>
            <button onClick={share} aria-label="Share place"
              className="h-10 w-10 rounded-full flex items-center justify-center text-white shrink-0 mr-8"
              style={{ background: "#1A2236", border: "1px solid #1E2A3F" }}>
              <Share2 className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-3 pb-safe">
            {loading && visits.length === 0 && (
              <div aria-busy="true" aria-label="Loading visits" className="space-y-3">
                {[0, 1].map((i) => <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: "#1A2236" }} />)}
              </div>
            )}
            {error && (
              <div role="alert" className="rounded-2xl p-4 text-center" style={{ background: "#1A2236" }}>
                <p className="text-[14px] text-white">Couldn't load these visits.</p>
                <p className="text-[12px] mt-1" style={{ color: "#94A3B8" }}>{error}</p>
                <button onClick={reload} className="mt-3 h-10 px-4 rounded-full inline-flex items-center gap-1.5 text-[13px] font-semibold text-white" style={{ background: "#3B82F6" }}>
                  <RefreshCw className="h-4 w-4" strokeWidth={1.5} /> Retry
                </button>
              </div>
            )}
            {!loading && !error && visits.length === 0 && (
              <p className="text-[13px] text-center py-6" style={{ color: "#94A3B8" }}>No visits you can view here.</p>
            )}
            {visits.map((v) => (
              <VisitCard key={v.id} visit={v} owner={owner} onAdd={() => setTarget(v)} />
            ))}

            <div className="pt-3">
              <PeopleWhoKnowPlace city={place.city} country={place.country} />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {owner && (
        <AddVisitMemoryDialog
          open={!!target}
          visitId={target?.id ?? null}
          visitLabel={target ? `${place.city}, ${target.startDate ? formatVisitDate(target.startDate, target.endDate) : "date unknown"}` : ""}
          visitVisibility={target?.visibility ?? "private"}
          onClose={() => setTarget(null)}
          onSaved={() => { setTarget(null); reload(); onWorldChanged?.(); }}
        />
      )}
    </>
  );
}
