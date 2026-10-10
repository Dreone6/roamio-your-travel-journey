/**
 * Add a note and/or photos to ONE existing visit. Ownership is enforced by the
 * `add_visit_memory` RPC (visit.user_id must equal auth.uid()); the owner-only
 * button is just UX. Same save-state rules as ManualVisitEntry: locked while
 * in flight, frozen payload + same request id on ambiguous outcomes, and no
 * deletion of uploads that may already be referenced.
 */
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ImagePlus, X, Loader2, Lock, Users, Globe2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { uploadUserMedia } from "@/lib/media";
import { MAX_PHOTOS, PHOTO_TYPES, validatePhoto, removeUploadedToken, SaveError, type Visibility } from "@/lib/world/manualVisit";
import { addVisitMemory, type AddMemoryArgs } from "@/lib/world/visitTimeline";

interface PhotoItem { id: string; file: File; preview: string; token?: string }

const VIS: { id: Visibility; label: string; Icon: typeof Lock }[] = [
  { id: "private", label: "Private", Icon: Lock },
  { id: "followers", label: "Followers", Icon: Users },
  { id: "public", label: "Public", Icon: Globe2 },
];
const field = { background: "#111827", border: "1px solid #1E2A3F" } as const;

interface Props {
  open: boolean;
  visitId: string | null;
  visitLabel: string;
  visitVisibility: Visibility;
  onClose: () => void;
  onSaved: (visitId: string) => void;
}

export default function AddVisitMemoryDialog({ open, visitId, visitLabel, visitVisibility, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [visibility, setVisibility] = useState<Visibility>("private");
  const [saving, setSaving] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestId = useRef(crypto.randomUUID());
  const savingRef = useRef(false);
  const ambiguous = useRef(false);
  const frozen = useRef<AddMemoryArgs | null>(null);
  const photosRef = useRef<PhotoItem[]>([]);
  photosRef.current = photos;
  const locked = saving || uncertain;

  const dropToken = (t: string) => removeUploadedToken(t).catch((e) => console.warn("Could not remove unsaved photo", e));

  // Fresh draft for each opening / target visit.
  useEffect(() => {
    if (!open) return;
    setNote(""); setPhotos([]); setVisibility("private"); setError(null); setUncertain(false);
    requestId.current = crypto.randomUUID(); ambiguous.current = false; frozen.current = null;
  }, [open, visitId]);

  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.preview)), []);

  const discardDraft = () => {
    photosRef.current.forEach((p) => {
      URL.revokeObjectURL(p.preview);
      if (p.token && !ambiguous.current) dropToken(p.token);
    });
    setPhotos([]);
  };

  const close = () => {
    if (savingRef.current) return;
    discardDraft();
    onClose();
  };

  const addFiles = (list: FileList | null) => {
    if (!list || locked) return;
    const next: PhotoItem[] = [];
    for (const f of Array.from(list)) {
      if (photosRef.current.length + next.length >= MAX_PHOTOS) { toast.error(`Up to ${MAX_PHOTOS} photos`); break; }
      const err = validatePhoto(f);
      if (err) { toast.error(err); continue; }
      next.push({ id: crypto.randomUUID(), file: f, preview: URL.createObjectURL(f) });
    }
    setPhotos((p) => [...p, ...next]);
  };

  const removePhoto = (id: string) => {
    if (locked) return;
    const it = photosRef.current.find((x) => x.id === id);
    if (!it) return;
    URL.revokeObjectURL(it.preview);
    if (it.token && !ambiguous.current) dropToken(it.token);
    setPhotos((p) => p.filter((x) => x.id !== id));
  };

  const dispatch = async (args: AddMemoryArgs) => {
    try {
      await addVisitMemory(args);
    } catch (e) {
      if (e instanceof SaveError && e.ambiguous) {
        ambiguous.current = true; setUncertain(true);
        throw new Error("We couldn't confirm this memory was saved. Retry to finish saving the same memory.");
      }
      frozen.current = null; ambiguous.current = false; setUncertain(false);
      requestId.current = crypto.randomUUID();
      throw e;
    }
    toast.success("Memory added");
    photosRef.current.forEach((p) => URL.revokeObjectURL(p.preview));
    setPhotos([]);
    onSaved(args.visitId);
  };

  const run = async (fn: () => Promise<void>) => {
    if (savingRef.current) return;
    savingRef.current = true; setSaving(true); setError(null);
    try { await fn(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not save memory"); }
    finally { savingRef.current = false; setSaving(false); }
  };

  const save = () => run(async () => {
    if (uncertain) return;
    if (!user || !visitId) throw new Error("Please sign in again");
    if (!note.trim() && photosRef.current.length === 0) throw new Error("Add a note or a photo");
    const tokens: string[] = [];
    for (const p of photosRef.current) {
      if (!p.token) {
        const ext = (p.file.name.split(".").pop() || "jpg").toLowerCase().slice(0, 5);
        const token = await uploadUserMedia(p.file, user.id, ext);
        p.token = token;
        setPhotos((cur) => cur.map((x) => (x.id === p.id ? { ...x, token } : x)));
      }
      tokens.push(p.token!);
    }
    frozen.current = { requestId: requestId.current, visitId, note, photoTokens: tokens, visibility };
    await dispatch(frozen.current);
  });

  const retrySame = () => run(async () => { if (frozen.current) await dispatch(frozen.current); });

  const empty = !note.trim() && photos.length === 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); }}>
      <DialogContent
        className="border-0 max-w-[420px] max-h-[90dvh] overflow-y-auto"
        style={{ background: "#111827", borderRadius: 24 }}
        onInteractOutside={(e) => { if (savingRef.current) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (savingRef.current) e.preventDefault(); }}
      >
        <DialogTitle className="font-heading text-[20px] text-white">Add memory</DialogTitle>
        <DialogDescription className="text-[13px]" style={{ color: "#94A3B8" }}>
          To your visit: {visitLabel}
        </DialogDescription>

        <label htmlFor="mem-note" className="mt-2 text-[13px] font-semibold text-white">
          Note <span style={{ color: "#4B5563" }}>(optional if you add a photo)</span>
        </label>
        <textarea id="mem-note" value={note} disabled={locked} maxLength={2000} rows={3}
          onChange={(e) => setNote(e.target.value)} placeholder="What do you remember?"
          className="w-full rounded-2xl p-3 text-[15px] text-white placeholder:text-[#4B5563] outline-none resize-none" style={field} />

        <p className="text-[13px] font-semibold text-white">Photos <span style={{ color: "#4B5563" }}>(optional if you add a note)</span></p>
        <p className="text-[12px] -mt-1" style={{ color: "#94A3B8" }}>Up to {MAX_PHOTOS}, 15 MB each. Uploaded only when you save.</p>
        <div className="grid grid-cols-4 gap-2">
          {photos.map((p) => (
            <div key={p.id} className="relative aspect-square rounded-xl overflow-hidden" style={field}>
              <img src={p.preview} alt={p.file.name} className="h-full w-full object-cover" />
              <button onClick={() => removePhoto(p.id)} disabled={locked} aria-label={`Remove ${p.file.name}`}
                className="absolute top-1 right-1 h-6 w-6 rounded-full flex items-center justify-center disabled:opacity-40" style={{ background: "rgba(8,13,26,0.8)" }}>
                <X className="h-3.5 w-3.5 text-white" />
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && !locked && (
            <label className="aspect-square rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer text-[11px]" style={{ ...field, color: "#94A3B8", borderStyle: "dashed" }}>
              <ImagePlus className="h-5 w-5" strokeWidth={1.5} /> Add
              <input type="file" accept={PHOTO_TYPES.join(",")} multiple className="sr-only" aria-label="Add photos"
                onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
            </label>
          )}
        </div>

        <p className="text-[13px] font-semibold text-white">Who can see this memory</p>
        <div role="radiogroup" className="grid grid-cols-3 gap-2 -mt-1">
          {VIS.map(({ id, label, Icon }) => {
            const on = visibility === id;
            return (
              <button key={id} role="radio" aria-checked={on} disabled={locked} onClick={() => setVisibility(id)}
                className="h-11 rounded-xl flex items-center justify-center gap-1.5 text-[13px] text-white disabled:opacity-60"
                style={{ background: on ? "rgba(59,130,246,0.12)" : "#111827", border: `1px solid ${on ? "#3B82F6" : "#1E2A3F"}` }}>
                <Icon className="h-3.5 w-3.5" strokeWidth={1.5} /> {label}
              </button>
            );
          })}
        </div>
        <p className="text-[12px] -mt-1" style={{ color: "#94A3B8" }}>
          {visitVisibility !== "private"
            ? `This visit is ${visitVisibility === "public" ? "public" : "visible to followers"}. Your memory stays private unless you choose otherwise; the visit's setting won't change.`
            : "The visit's own setting won't change."}
        </p>

        {uncertain && !saving && (
          <p className="text-[12px]" style={{ color: "#F59E0B" }}>
            Editing is paused so a retry can't create a different memory. Closing keeps uploaded photos.
          </p>
        )}
        {error && <p role="alert" className="text-[13px]" style={{ color: "#EF4444" }}>{error}</p>}

        <div className="flex gap-2 pt-1">
          <button onClick={close} disabled={saving} className="flex-1 h-12 rounded-full text-white font-semibold text-[15px] disabled:opacity-40" style={field}>
            Cancel
          </button>
          <button onClick={uncertain ? retrySame : save} disabled={saving || (!uncertain && empty)}
            className="flex-[2] h-12 rounded-full text-white font-semibold text-[15px] flex items-center justify-center gap-2 disabled:opacity-40"
            style={{ background: "#3B82F6" }}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Saving…" : uncertain ? "Retry same memory" : "Save memory"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
