import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Lock, ChevronRight, Trophy, MapPin } from "lucide-react";
import { TROPHIES } from "@/components/globe/TrophyShelfModal";
import { supabase } from "@/integrations/supabase/client";
import { MOCK_MEMORIES } from "@/data";

const FlagGlobe = lazy(() => import("@/components/globe/FlagGlobe"));

export interface ProfileViewData {
  id: string;
  name: string;
  username: string | null;
  bio: string | null;
  home_city: string | null;
  profile_photo: string | null;
  is_private: boolean;
  countries: number;
  cities: number;
  landmarks: number;
  trophies: number;
}

interface FollowRow {
  user_id: string;
  name: string;
  avatar: string | null;
  username: string | null;
  countries: number;
}

interface Props {
  data: ProfileViewData;
  isOwner: boolean;
  isPrivateLocked: boolean; // private + viewer doesn't follow
  followers: FollowRow[];
  following: FollowRow[];
  actionSlot: React.ReactNode; // edit button or follow button
}

type Tab = "memories" | "globe" | "trophies" | "following" | "followers";

const TABS: { key: Tab; label: string }[] = [
  { key: "memories", label: "Memories" },
  { key: "globe", label: "Globe" },
  { key: "trophies", label: "Trophies" },
  { key: "following", label: "Following" },
  { key: "followers", label: "Followers" },
];

export default function ProfileScaffold({ data, isOwner, isPrivateLocked, followers, following, actionSlot }: Props) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("memories");
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: rows } = await supabase
        .from("check_ins")
        .select("photo, photos")
        .eq("user_id", data.id)
        .order("timestamp", { ascending: false })
        .limit(60);
      if (cancelled) return;
      const list: string[] = [];
      (rows ?? []).forEach((r: any) => {
        if (r.photo) list.push(r.photo);
        (r.photos ?? []).forEach((p: string) => p && list.push(p));
      });
      if (list.length === 0) {
        // fall back to mock memories for the canonical user
        MOCK_MEMORIES.slice(0, 12).forEach((m) => m.mediaUrl && list.push(m.mediaUrl));
      }
      setPhotos(list);
    })();
    return () => { cancelled = true; };
  }, [data.id]);

  const flag = useMemo(() => {
    if (!data.home_city) return "";
    // light heuristic — extract trailing emoji if present
    const m = data.home_city.match(/\p{Extended_Pictographic}/u);
    return m ? ` ${m[0]}` : "";
  }, [data.home_city]);

  const stats = [
    { label: "Countries", value: data.countries },
    { label: "Cities", value: data.cities },
    { label: "Landmarks", value: data.landmarks },
    { label: "Trophies", value: data.trophies },
  ];

  return (
    <div className="min-h-screen pb-28 bg-[#080D1A]">
      {/* TOP NAVY SECTION */}
      <div
        className="px-5 pt-12 pb-7 bg-[#080D1A]"
        style={{ borderRadius: "0 0 24px 24px", boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}
      >
        <div className="flex flex-col items-center text-center">
          <div
            className="h-20 w-20 rounded-full overflow-hidden bg-[#1A2236]"
            style={{ border: "2px solid #F59E0B", boxShadow: "0 4px 16px rgba(245,158,11,0.25)" }}
          >
            {data.profile_photo
              ? <img src={data.profile_photo} alt={data.name} className="h-full w-full object-cover" />
              : <div className="h-full w-full grid place-items-center text-white text-[24px] font-heading">{data.name?.[0] ?? "?"}</div>}
          </div>
          <h1 className="mt-3 font-heading text-[22px] text-white leading-tight">{data.name}</h1>
          {data.username && (
            <p className="text-[13px] text-white/50 mt-0.5">@{data.username}</p>
          )}
          {data.home_city && (
            <p className="text-[12px] text-white/40 mt-1 flex items-center gap-1">
              <MapPin className="h-3 w-3" strokeWidth={1.5} />{data.home_city}{flag}
            </p>
          )}
          {data.bio && (
            <p className="text-[13px] text-white/60 mt-3 max-w-[280px] line-clamp-2">{data.bio}</p>
          )}
          <div className="mt-4">{actionSlot}</div>
        </div>
      </div>

      {/* STATS ROW */}
      <div className="px-5 mt-4 grid grid-cols-4 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-[#111827] border border-[#1E2A3F] px-2 py-3 text-center">
            <p className="font-heading text-[20px] text-white leading-none">{s.value}</p>
            <p className="text-[10px] uppercase tracking-wider text-[#94A3B8] mt-1.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div className="mt-5 px-5 border-b border-[#1E2A3F]">
        <div className="flex gap-5 overflow-x-auto scrollbar-none">
          {TABS.map(({ key, label }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className="relative pb-3 text-[13px] whitespace-nowrap transition-colors"
                style={{ color: active ? "#FFFFFF" : "#94A3B8", fontWeight: active ? 600 : 500 }}
              >
                {label}
                {active && <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-[#3B82F6]" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-5 mt-5">
        {tab === "memories" && (
          isPrivateLocked ? (
            <PrivateLocked />
          ) : photos.length === 0 ? (
            <EmptyTab icon={<Camera className="h-8 w-8" />} title="Your travel memories will appear here." />
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {photos.map((p, i) => (
                <button
                  key={i}
                  onClick={() => navigate("/globe")}
                  className="relative aspect-square overflow-hidden bg-[#111827]"
                >
                  <img src={p} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )
        )}

        {tab === "globe" && (
          <button
            onClick={() => navigate("/globe")}
            className="block w-full overflow-hidden rounded-3xl bg-[#080D1A] border border-[#1E2A3F]"
            style={{ height: 320 }}
          >
            <Suspense fallback={<div className="h-full grid place-items-center text-[#94A3B8] text-[13px]">Loading globe…</div>}>
              <FlagGlobe pins={[]} mode="mine" />
            </Suspense>
          </button>
        )}

        {tab === "trophies" && (
          <div className="grid grid-cols-3 gap-3">
            {TROPHIES.map((t) => (
              <div
                key={t.id}
                className="rounded-2xl bg-[#111827] border border-[#1E2A3F] p-3 text-center"
                style={{ opacity: t.earned ? 1 : 0.5 }}
              >
                <div className="text-[28px] leading-none">{t.icon}</div>
                <p className="mt-2 text-[11px] text-white font-medium line-clamp-2">{t.name}</p>
                {!t.earned && t.progress && (
                  <p className="mt-1 text-[10px] text-[#94A3B8]">{t.progress.current}/{t.progress.total}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === "following" && <UserList rows={following} emptyText="Not following anyone yet." />}
        {tab === "followers" && <UserList rows={followers} emptyText="No followers yet." />}
      </div>
    </div>
  );
}

function PrivateLocked() {
  return (
    <div className="py-16 flex flex-col items-center text-center">
      <div className="h-14 w-14 rounded-full bg-[#111827] border border-[#1E2A3F] grid place-items-center">
        <Lock className="h-6 w-6 text-[#94A3B8]" strokeWidth={1.5} />
      </div>
      <p className="mt-4 text-[14px] text-white font-medium">This profile is private</p>
      <p className="mt-1 text-[12px] text-[#94A3B8]">Follow to see their memories.</p>
    </div>
  );
}

function EmptyTab({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="py-16 flex flex-col items-center text-center text-[#94A3B8]">
      {icon}
      <p className="mt-3 text-[13px]">{title}</p>
    </div>
  );
}

function UserList({ rows, emptyText }: { rows: FollowRow[]; emptyText: string }) {
  const navigate = useNavigate();
  if (rows.length === 0) {
    return <EmptyTab icon={<Trophy className="h-8 w-8 opacity-30" />} title={emptyText} />;
  }
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <button
          key={r.user_id}
          onClick={() => r.username && navigate(`/profile/${r.username}`)}
          className="w-full flex items-center gap-3 p-3 rounded-2xl bg-[#111827] border border-[#1E2A3F] text-left"
        >
          <div className="h-10 w-10 rounded-full overflow-hidden bg-[#1A2236] shrink-0">
            {r.avatar && <img src={r.avatar} alt="" className="h-full w-full object-cover" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] text-white font-medium truncate">{r.name}</p>
            <p className="text-[12px] text-[#94A3B8]">{r.countries} countries</p>
          </div>
          <ChevronRight className="h-4 w-4 text-[#94A3B8]" strokeWidth={1.5} />
        </button>
      ))}
    </div>
  );
}
