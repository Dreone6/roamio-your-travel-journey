/**
 * Another traveller's world.
 *
 * Everything on this page comes from records the database authorises the
 * viewer to read. A private visit is never fetched, and no statistic, count or
 * "in common" line is derived from anything but the authorised rows — so the
 * existence of hidden places cannot leak through totals.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Lock, MessageCircle, MoreHorizontal, ChevronRight, Globe as GlobeIcon, Check, Clock,
} from "lucide-react";
import { Suspense, lazy } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useTravelerWorld } from "@/hooks/useTravelerWorld";
import { useFollowState } from "@/hooks/useFollowState";
import { conversationStarters, sharedWorld, type CityPlace } from "@/lib/world/visits";
import { flagEmoji } from "@/lib/world/countries";
import { startConversation } from "@/lib/messaging/startConversation";
import PlaceDetailSheet from "@/components/world/PlaceDetailSheet";
import { ReportDialog } from "@/components/social/ReportDialog";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const WorldGlobe = lazy(() => import("@/components/globe/WorldGlobe"));

interface ProfileRow {
  id: string;
  name: string | null;
  username: string | null;
  bio: string | null;
  home_city: string | null;
  profile_photo: string | null;
  is_private: boolean;
}

export default function TravelerProfilePage() {
  const { handle } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<ProfileRow | null | "missing">(null);
  const [place, setPlace] = useState<CityPlace | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    if (!handle) return;
    let cancelled = false;
    (async () => {
      const isUuid = /^[0-9a-f-]{36}$/i.test(handle);
      const q = supabase.from("profiles").select("id, name, username, bio, home_city, profile_photo, is_private");
      const { data } = isUuid ? await q.eq("id", handle).maybeSingle() : await q.eq("username", handle).maybeSingle();
      if (!cancelled) setProfile((data as ProfileRow) ?? "missing");
    })();
    return () => { cancelled = true; };
  }, [handle]);

  const targetId = profile && profile !== "missing" ? profile.id : null;
  const follow = useFollowState(targetId);
  const theirs = useTravelerWorld(follow.blocked ? null : targetId);
  const mine = useTravelerWorld(user?.id ?? null);

  const shared = useMemo(
    () => (theirs.world.isEmpty || mine.world.isEmpty ? null : sharedWorld(mine.world, theirs.world)),
    [mine.world, theirs.world]
  );

  const name = profile && profile !== "missing" ? profile.name || profile.username || "Traveler" : "";
  const starters = useMemo(
    () => (shared ? conversationStarters(name, theirs.world, shared) : []),
    [name, theirs.world, shared]
  );

  const globePoints = useMemo(
    () => theirs.world.places
      .filter((p) => p.lat !== 0 || p.lng !== 0)
      .map((p, i) => ({
        key: p.key, lat: p.lat, lng: p.lng, label: p.city,
        weight: p.visitCount, recent: i === 0, milestone: p.isMilestone,
      })),
    [theirs.world.places]
  );

  if (profile === "missing") {
    return (
      <Shell onBack={() => navigate(-1)}>
        <p className="px-5 pt-24 text-center text-[15px]" style={{ color: "#94A3B8" }}>
          This traveler doesn't exist.
        </p>
      </Shell>
    );
  }
  if (!profile) {
    return (
      <Shell onBack={() => navigate(-1)}>
        <div className="px-5 pt-10 space-y-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: "#111827" }} />)}
        </div>
      </Shell>
    );
  }

  if (targetId === user?.id) {
    navigate("/profile", { replace: true });
    return null;
  }

  const message = async (draft?: string) => {
    if (!user || !targetId || messaging) return;
    setMessaging(true);
    const id = await startConversation(user.id, targetId);
    setMessaging(false);
    if (id) navigate(draft ? `/messages/${id}?draft=${encodeURIComponent(draft)}` : `/messages/${id}`);
    else toast.error("Couldn't open a conversation");
  };

  const followLabel =
    follow.status === "following" ? "Following" : follow.status === "requested" ? "Requested" : "Follow";

  const worldIsHidden = follow.blocked || (theirs.world.isEmpty && !theirs.loading);

  return (
    <Shell onBack={() => navigate(-1)}>
      {/* Identity */}
      <div className="px-5 pt-2">
        <div className="flex items-start gap-4">
          <div className="h-[72px] w-[72px] rounded-full overflow-hidden flex items-center justify-center shrink-0"
            style={{ border: "2px solid #1E2A3F", background: "#1A2236" }}>
            {profile.profile_photo
              ? <img src={profile.profile_photo} alt={name} className="h-full w-full object-cover" />
              : <span className="font-heading text-[26px] font-bold text-white">{name.charAt(0).toUpperCase()}</span>}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-[26px] font-bold text-white leading-tight tracking-tight truncate">{name}</h1>
            {profile.username && (
              <p className="text-[13px]" style={{ color: "#94A3B8" }}>@{profile.username}</p>
            )}
            {profile.home_city && (
              <p className="text-[12px] mt-1" style={{ color: "#4B5563" }}>Based in {profile.home_city}</p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "#111827", border: "1px solid #1E2A3F" }} aria-label="More">
                <MoreHorizontal className="h-4 w-4" style={{ color: "#94A3B8" }} strokeWidth={1.5} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" style={{ background: "#1A2236", border: "1px solid #1E2A3F" }}>
              <DropdownMenuItem className="text-white" onClick={follow.toggleBlock}>
                {follow.blockedByMe ? "Unblock traveler" : "Block traveler"}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-white" onClick={() => setReportOpen(true)}>
                Report traveler
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {profile.bio && (
          <p className="mt-3 text-[14px] leading-relaxed" style={{ color: "#94A3B8" }}>{profile.bio}</p>
        )}

        {/* Social + travel identity */}
        <div className="mt-5 flex items-end gap-7">
          <Stat v={follow.followers} l="Followers" />
          <Stat v={follow.following} l="Following" />
          {!worldIsHidden && (
            <>
              <Stat v={theirs.world.summary.countries} l="Countries" />
              <Stat v={theirs.world.summary.cities} l="Cities" />
            </>
          )}
        </div>

        {/* Follow / message */}
        {!follow.blocked && (
          <div className="mt-5 flex gap-2">
            <button
              onClick={follow.toggleFollow}
              disabled={follow.busy}
              className="flex-1 rounded-full flex items-center justify-center gap-2 font-semibold text-[14px] disabled:opacity-60"
              style={{
                height: 52,
                background: follow.status === "none" ? "#3B82F6" : "#1A2236",
                border: follow.status === "none" ? "none" : "1px solid #1E2A3F",
                color: "#FFFFFF",
              }}
            >
              {follow.status === "following" && <Check className="h-4 w-4" strokeWidth={1.8} />}
              {follow.status === "requested" && <Clock className="h-4 w-4" strokeWidth={1.6} />}
              {followLabel}
            </button>
            <button
              onClick={() => message()}
              disabled={messaging}
              className="rounded-full flex items-center justify-center text-white"
              style={{ background: "#1A2236", border: "1px solid #1E2A3F", height: 52, width: 52 }}
              aria-label="Message"
            >
              <MessageCircle className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>
        )}
        {follow.blockedByMe && (
          <p className="mt-4 text-[13px]" style={{ color: "#94A3B8" }}>
            You've blocked this traveler. Their world stays hidden until you unblock them.
          </p>
        )}
      </div>

      {/* Their world */}
      {!follow.blocked && (
        <div className="mt-7">
          <div className="px-5 flex items-baseline justify-between">
            <h2 className="font-heading text-[20px] font-semibold text-white tracking-tight">
              {name.split(" ")[0]}'s world
            </h2>
            {!worldIsHidden && (
              <button onClick={() => navigate(`/passport/${profile.id}`)}
                className="text-[12px] font-semibold flex items-center gap-0.5" style={{ color: "#3B82F6" }}>
                Passport <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            )}
          </div>

          {worldIsHidden ? (
            <div className="mx-5 mt-3 rounded-[24px] px-6 py-10 text-center" style={{ background: "#111827" }}>
              <Lock className="h-6 w-6 mx-auto" style={{ color: "#4B5563" }} strokeWidth={1.4} />
              <p className="font-heading text-[16px] font-semibold text-white mt-3">Their world is private</p>
              <p className="text-[13px] mt-1.5" style={{ color: "#94A3B8" }}>
                {follow.status === "following"
                  ? "They haven't shared any places yet."
                  : "Follow them to see the places they choose to share."}
              </p>
            </div>
          ) : (
            <div className="px-3 mt-3">
              <div className="relative overflow-hidden"
                style={{ height: "42vh", maxHeight: 420, borderRadius: 24, background: "#080D1A", border: "1px solid #1E2A3F" }}>
                <Suspense fallback={<div className="h-full" />}>
                  <WorldGlobe
                    points={globePoints}
                    onPointClick={(p) => {
                      const found = theirs.world.places.find((x) => x.key === p.key);
                      if (found) { setPlace(found); setSheetOpen(true); }
                    }}
                  />
                </Suspense>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Places in common */}
      {shared && (shared.countryCount > 0 || shared.cityCount > 0) && (
        <div className="mt-8 px-5">
          <h2 className="font-heading text-[20px] font-semibold text-white tracking-tight">
            You &amp; {name.split(" ")[0]}
          </h2>
          <p className="text-[14px] mt-1.5" style={{ color: "#94A3B8" }}>
            {shared.countryCount > 0 && `${shared.countryCount} ${shared.countryCount === 1 ? "country" : "countries"} in common`}
            {shared.countryCount > 0 && shared.cityCount > 0 && " · "}
            {shared.cityCount > 0 && `${shared.cityCount} ${shared.cityCount === 1 ? "city" : "cities"} in common`}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {shared.cities.slice(0, 8).map((c) => (
              <span key={`${c.city}-${c.country}`} className="rounded-full text-[13px] text-white flex items-center gap-1.5"
                style={{ background: "#111827", border: "1px solid #1E2A3F", padding: "8px 14px" }}>
                <span>{c.flag ?? "📍"}</span> {c.city}
              </span>
            ))}
            {shared.cityCount === 0 && shared.countries.slice(0, 8).map((c) => (
              <span key={c} className="rounded-full text-[13px] text-white flex items-center gap-1.5"
                style={{ background: "#111827", border: "1px solid #1E2A3F", padding: "8px 14px" }}>
                <span>{flagEmoji(c) ?? "🏳️"}</span> {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Conversation starters */}
      {starters.length > 0 && !follow.blocked && (
        <div className="mt-8 px-5">
          <h2 className="font-heading text-[20px] font-semibold text-white tracking-tight">Start a conversation</h2>
          <div className="mt-3 space-y-2">
            {starters.map((s) => (
              <button
                key={s.id}
                onClick={() => message(s.text)}
                disabled={messaging}
                className="w-full text-left rounded-2xl px-4 py-3.5 flex items-center gap-3 disabled:opacity-60"
                style={{ background: "#111827", border: "1px solid #1E2A3F" }}
              >
                <MessageCircle className="h-4 w-4 shrink-0" style={{ color: "#3B82F6" }} strokeWidth={1.5} />
                <span className="text-[14px] text-white">{s.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="h-16" />

      <PlaceDetailSheet place={place} open={sheetOpen} onOpenChange={setSheetOpen} />
      {targetId && (
        <ReportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          targetType="user"
          targetId={targetId}
          targetLabel={profile.name ?? "traveler"}
        />
      )}
    </Shell>
  );
}

function Shell({ children, onBack }: { children: React.ReactNode; onBack: () => void }) {
  return (
    <div className="min-h-dvh pb-16" style={{ background: "#080D1A" }}>
      <div className="px-5 pt-12 pb-4">
        <button onClick={onBack} className="h-10 w-10 rounded-full flex items-center justify-center"
          style={{ background: "#111827", border: "1px solid #1E2A3F" }} aria-label="Back">
          <ArrowLeft className="h-[18px] w-[18px] text-white" strokeWidth={1.5} />
        </button>
      </div>
      {children}
    </div>
  );
}

function Stat({ v, l }: { v: number; l: string }) {
  return (
    <div>
      <p className="font-heading text-[20px] font-semibold text-white leading-none tracking-tight">{v}</p>
      <p className="text-[11px] uppercase mt-1.5" style={{ color: "#94A3B8", letterSpacing: "0.07em" }}>{l}</p>
    </div>
  );
}
