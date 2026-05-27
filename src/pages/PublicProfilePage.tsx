import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ProfileScaffold from "@/components/profile/ProfileScaffold";
import { useProfileData, buildProfileView } from "@/hooks/useProfileData";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";

export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userId, setUserId] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  useEffect(() => {
    if (!username) return;
    setNotFound(false);
    supabase
      .from("profiles").select("id").eq("username", username.toLowerCase()).maybeSingle()
      .then(({ data }) => {
        if (!data) setNotFound(true);
        else setUserId(data.id);
      });
  }, [username]);

  const { raw, followers, following, trophies, loading, reload } = useProfileData(userId);

  useEffect(() => {
    if (!user || !userId) return;
    supabase.from("user_follows")
      .select("id").eq("follower_id", user.id).eq("following_id", userId).maybeSingle()
      .then(({ data }) => setIsFollowing(!!data));
  }, [user, userId]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#080D1A] flex flex-col items-center justify-center text-white">
        <p className="font-heading text-[20px]">User not found</p>
        <button onClick={() => navigate(-1)} className="mt-3 text-[13px] text-[#3B82F6]">Go back</button>
      </div>
    );
  }
  if (!userId || loading || !raw) {
    return <div className="min-h-screen bg-[#080D1A] flex items-center justify-center text-[#94A3B8] text-sm">Loading…</div>;
  }

  const isOwner = user?.id === userId;
  const view = buildProfileView(raw, trophies);
  const isPrivateLocked = !!raw.is_private && !isOwner && !isFollowing;

  const toggleFollow = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setFollowBusy(true);
    try {
      if (isFollowing) {
        const { error } = await supabase.from("user_follows")
          .delete().eq("follower_id", user.id).eq("following_id", userId);
        if (error) throw error;
        setIsFollowing(false);
      } else {
        const { error } = await supabase.from("user_follows")
          .insert({ follower_id: user.id, following_id: userId });
        if (error) throw error;
        setIsFollowing(true);
      }
      reload();
    } catch (err: any) {
      toast.error(err.message ?? "Couldn't update follow");
    } finally {
      setFollowBusy(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 z-10 h-9 w-9 rounded-full bg-black/40 backdrop-blur grid place-items-center"
        aria-label="Back"
      >
        <ChevronLeft className="h-5 w-5 text-white" strokeWidth={1.5} />
      </button>
      <ProfileScaffold
        data={view}
        isOwner={isOwner}
        isPrivateLocked={isPrivateLocked}
        followers={followers}
        following={following}
        actionSlot={
          isOwner ? null : (
            <button
              onClick={toggleFollow}
              disabled={followBusy}
              className={`inline-flex items-center px-5 h-8 rounded-full text-[12px] font-semibold transition ${
                isFollowing
                  ? "border border-white/40 text-white hover:bg-white/5"
                  : "bg-[#F59E0B] text-[#080D1A] hover:bg-[#D97706]"
              }`}
            >
              {isFollowing ? "Following" : "Follow"}
            </button>
          )
        }
      />
    </div>
  );
}
