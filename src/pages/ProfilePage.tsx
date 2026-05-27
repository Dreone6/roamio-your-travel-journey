import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import ProfileScaffold from "@/components/profile/ProfileScaffold";
import EditProfileSheet from "@/components/profile/EditProfileSheet";
import { useProfileData, buildProfileView } from "@/hooks/useProfileData";
import { Pencil } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();
  const { raw, followers, following, trophies, loading, setRaw } = useProfileData(user?.id ?? null);
  const [editOpen, setEditOpen] = useState(false);

  if (loading || !raw) {
    return <div className="min-h-screen bg-[#080D1A] flex items-center justify-center text-[#94A3B8] text-sm">Loading profile…</div>;
  }

  const view = buildProfileView(raw, trophies);

  return (
    <>
      <ProfileScaffold
        data={view}
        isOwner
        isPrivateLocked={false}
        followers={followers}
        following={following}
        actionSlot={
          <button
            onClick={() => setEditOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 h-8 rounded-full border border-white/30 text-white text-[11px] font-medium hover:bg-white/5 transition"
          >
            <Pencil className="h-3 w-3" strokeWidth={1.5} />
            Edit profile
          </button>
        }
      />
      <EditProfileSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        profile={{
          id: raw.id,
          name: raw.name,
          username: raw.username,
          bio: raw.bio,
          home_city: raw.home_city,
          travel_style: (raw as any).travel_style ?? null,
          interests: (raw as any).interests ?? [],
          profile_photo: raw.profile_photo,
          is_private: raw.is_private,
        }}
        onSaved={(u) => setRaw({ ...raw, ...u } as any)}
      />
    </>
  );
}
