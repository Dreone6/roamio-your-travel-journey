import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X, MapPin, Globe as GlobeIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface StoryRow {
  id: string;
  user_id: string;
  media_url: string;
  caption: string | null;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  expires_at: string;
}
interface ProfileRow { id: string; name: string | null; profile_photo: string | null }

interface Bucket {
  userId: string;
  name: string;
  avatar: string | null;
  stories: StoryRow[];
  unseen: boolean;
  isSelf: boolean;
}

const FALLBACK_AVATAR =
  "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=128&q=80";




export default function StoriesRow() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [seenIds, setSeenIds] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("seen_stories") || "[]")); }
    catch { return new Set(); }
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const nowIso = new Date().toISOString();
      // Try real data first
      const { data: stories } = await supabase
        .from("stories")
        .select("id,user_id,media_url,caption,location_name,latitude,longitude,created_at,expires_at")
        .gt("expires_at", nowIso)
        .order("created_at", { ascending: false });

      let liveBuckets: Bucket[] = [];
      if (stories && stories.length) {
        const ids = Array.from(new Set(stories.map(s => s.user_id)));
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id,name,profile_photo")
          .in("id", ids);
        const pmap = new Map((profiles as ProfileRow[] || []).map(p => [p.id, p]));
        const grouped = new Map<string, StoryRow[]>();
        for (const s of stories as StoryRow[]) {
          if (!grouped.has(s.user_id)) grouped.set(s.user_id, []);
          grouped.get(s.user_id)!.push(s);
        }
        liveBuckets = Array.from(grouped.entries()).map(([uid, list]) => {
          const p = pmap.get(uid);
          return {
            userId: uid,
            name: p?.name || "Traveler",
            avatar: p?.profile_photo || FALLBACK_AVATAR,
            stories: list,
            unseen: list.some(s => !seenIds.has(s.id)),
            isSelf: uid === user?.id,
          };
        });
      }

      const merged = [...liveBuckets];
      // Sort: self first, then unseen, then by latest story
      merged.sort((a, b) => {
        if (a.isSelf !== b.isSelf) return a.isSelf ? -1 : 1;
        if (a.unseen !== b.unseen) return a.unseen ? -1 : 1;
        return (b.stories[0]?.created_at || "").localeCompare(a.stories[0]?.created_at || "");
      });

      if (!cancelled) setBuckets(merged);
    })();
    return () => { cancelled = true; };
  }, [user?.id, seenIds]);

  const selfBucket = useMemo(() => buckets.find(b => b.isSelf), [buckets]);
  const others = useMemo(() => buckets.filter(b => !b.isSelf), [buckets]);

  const markSeen = (storyId: string) => {
    setSeenIds(prev => {
      const next = new Set(prev);
      next.add(storyId);
      localStorage.setItem("seen_stories", JSON.stringify(Array.from(next)));
      return next;
    });
  };

  return (
    <>
      <section className="px-5 pt-5">
        <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
          {/* Your Story tile */}
          <button
            onClick={() => selfBucket ? setActiveIdx(buckets.indexOf(selfBucket)) : navigate("/camera")}
            className="shrink-0 flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
          >
            <div className="relative">
              <div
                className="rounded-full p-[2.5px]"
                style={{
                  background: selfBucket?.unseen
                    ? "linear-gradient(135deg, #3B82F6, #F4A261)"
                    : "#1E2A3F",
                }}
              >
                <div
                  className="h-[60px] w-[60px] rounded-full overflow-hidden"
                  style={{ border: "2px solid #080D1A", background: "#1A2236" }}
                >
                  {selfBucket?.stories[0] ? (
                    <img src={selfBucket.stories[0].media_url} alt="Your story" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full" style={{ background: "#1A2236" }} />
                  )}
                </div>
              </div>
              <div
                className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full flex items-center justify-center"
                style={{ background: "#3B82F6", border: "2px solid #080D1A" }}
                onClick={(e) => { e.stopPropagation(); navigate("/camera"); }}
              >
                <Plus className="h-3 w-3 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <span className="text-[11px] text-white font-medium">Your Story</span>
          </button>

          {others.map((b, i) => {
            const idx = buckets.indexOf(b);
            return (
              <button
                key={b.userId}
                onClick={() => setActiveIdx(idx)}
                className="shrink-0 flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
              >
                <div
                  className="rounded-full p-[2.5px]"
                  style={{
                    background: b.unseen
                      ? "linear-gradient(135deg, #3B82F6, #F4A261)"
                      : "#1E2A3F",
                  }}
                >
                  <div
                    className="h-[60px] w-[60px] rounded-full overflow-hidden"
                    style={{ border: "2px solid #080D1A" }}
                  >
                    <img src={b.avatar || FALLBACK_AVATAR} alt={b.name} className="h-full w-full object-cover" />
                  </div>
                </div>
                <span className="text-[11px] text-white font-medium max-w-[68px] truncate">{b.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      {activeIdx !== null && buckets[activeIdx] && (
        <StoryViewer
          bucket={buckets[activeIdx]}
          onClose={() => setActiveIdx(null)}
          onAdvanceUser={(dir) => {
            const next = activeIdx + dir;
            if (next < 0 || next >= buckets.length) setActiveIdx(null);
            else setActiveIdx(next);
          }}
          onSeen={markSeen}
          onViewPin={(s) => {
            setActiveIdx(null);
            navigate(`/globe?lat=${s.latitude}&lng=${s.longitude}`);
          }}
        />
      )}
    </>
  );
}

function StoryViewer({
  bucket, onClose, onAdvanceUser, onSeen, onViewPin,
}: {
  bucket: Bucket;
  onClose: () => void;
  onAdvanceUser: (dir: 1 | -1) => void;
  onSeen: (id: string) => void;
  onViewPin: (s: StoryRow) => void;
}) {
  const [idx, setIdx] = useState(0);
  const current = bucket.stories[idx];

  useEffect(() => {
    if (!current) return;
    onSeen(current.id);
    const t = setTimeout(() => {
      if (idx < bucket.stories.length - 1) setIdx(idx + 1);
      else onAdvanceUser(1);
    }, 5000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, bucket.userId]);

  if (!current) return null;

  return (
    <div className="fixed inset-0 z-[100]" style={{ background: "#000" }}>
      <img src={current.media_url} alt="" className="absolute inset-0 h-full w-full object-cover" />

      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 flex gap-1 px-3 pt-3 z-10">
        {bucket.stories.map((_, i) => (
          <div key={i} className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.3)" }}>
            <div
              className="h-full bg-white"
              style={{
                width: i < idx ? "100%" : i === idx ? "100%" : "0%",
                transition: i === idx ? "width 5s linear" : "none",
                animation: i === idx ? "storyProgress 5s linear forwards" : undefined,
              }}
            />
          </div>
        ))}
      </div>
      <style>{`@keyframes storyProgress { from { width: 0% } to { width: 100% } }`}</style>

      {/* Header */}
      <div className="absolute top-6 left-0 right-0 px-4 pt-2 flex items-center gap-2 z-10">
        <img src={bucket.avatar || FALLBACK_AVATAR} alt="" className="h-8 w-8 rounded-full object-cover border border-white/40" />
        <div className="flex-1 min-w-0">
          <p className="text-white text-[14px] font-semibold truncate">{bucket.name}</p>
          <p className="text-white/70 text-[11px]">{timeAgo(current.created_at)}</p>
        </div>
        <button onClick={onClose} className="h-9 w-9 flex items-center justify-center">
          <X className="h-6 w-6 text-white" strokeWidth={2} />
        </button>
      </div>

      {/* Tap zones */}
      <button
        onClick={() => idx > 0 ? setIdx(idx - 1) : onAdvanceUser(-1)}
        className="absolute left-0 top-0 bottom-0 w-1/3 z-[5]"
        aria-label="Previous"
      />
      <button
        onClick={() => idx < bucket.stories.length - 1 ? setIdx(idx + 1) : onAdvanceUser(1)}
        className="absolute right-0 top-0 bottom-0 w-1/3 z-[5]"
        aria-label="Next"
      />

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 p-5 pb-8 z-10"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)" }}
      >
        {current.caption && (
          <p className="text-white text-[15px] font-medium mb-3">{current.caption}</p>
        )}
        <div className="flex items-center justify-between gap-3">
          {current.location_name && (
            <div className="flex items-center gap-1.5 text-white/90 text-[12px]">
              <MapPin className="h-4 w-4" strokeWidth={1.5} />
              {current.location_name}
            </div>
          )}
          {current.latitude != null && (
            <button
              onClick={() => onViewPin(current)}
              className="ml-auto inline-flex items-center gap-1.5 text-white font-semibold text-[12px] rounded-full px-3 py-1.5"
              style={{ background: "#3B82F6" }}
            >
              <GlobeIcon className="h-3.5 w-3.5" strokeWidth={2} />
              View pin
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600e3);
  if (h < 1) return `${Math.max(1, Math.floor(diff / 60e3))}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
