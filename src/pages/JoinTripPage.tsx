import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function JoinTripPage() {
  const { invite_code } = useParams<{ invite_code: string }>();
  const navigate = useNavigate();
  const { user, loading } = useAuth() as any;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!invite_code) {
      setError("Missing invite code");
      return;
    }
    if (!user) {
      localStorage.setItem("pending_invite_code", invite_code);
      navigate("/auth?signup=1");
      return;
    }
    (async () => {
      const { data, error: rpcErr } = await supabase.rpc("find_trip_by_invite", { _code: invite_code });
      const trip = Array.isArray(data) ? data[0] : data;
      if (rpcErr || !trip) {
        setError("This invite link is invalid or expired.");
        return;
      }
      // Check member limit
      const { count } = await supabase
        .from("trip_members")
        .select("*", { count: "exact", head: true })
        .eq("trip_id", trip.id);
      if ((count ?? 0) >= 8) {
        setError("Trip is full (8/8 members)");
        return;
      }
      // Insert membership if not present
      const { data: existing } = await supabase
        .from("trip_members")
        .select("id")
        .eq("trip_id", trip.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!existing) {
        const { error: insErr } = await supabase
          .from("trip_members")
          .insert({ trip_id: trip.id, user_id: user.id, role: "collaborator" });
        if (insErr) {
          setError(insErr.message);
          return;
        }
        toast.success(`Joined ${trip.title}`);
      }
      localStorage.removeItem("pending_invite_code");
      navigate(`/trips/${trip.id}`);
    })();
  }, [user, loading, invite_code, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
      {error ? (
        <div>
          <p className="font-display text-[18px] font-semibold text-foreground">{error}</p>
          <button onClick={() => navigate("/home")} className="mt-4 rounded-full bg-[#3B82F6] px-5 py-2.5 text-[14px] text-white">
            Back home
          </button>
        </div>
      ) : (
        <p className="text-[14px] text-muted-foreground">Joining trip…</p>
      )}
    </div>
  );
}
