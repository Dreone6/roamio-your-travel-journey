/**
 * Trip collaboration. Membership is the only thing that grants itinerary
 * access — followers never see a trip just because they follow the owner.
 */
import { useEffect, useState } from "react";
import { Copy, Lock, Users, UserMinus, Crown } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { ensureInviteCode, listPeople, removeMember } from "@/lib/trips/api";
import type { Trip, TripPerson } from "@/lib/trips/types";
import PeopleWhoKnowPlace from "@/components/social/PeopleWhoKnowPlace";

interface Props {
  trip: Trip;
  onTripChange: (patch: Partial<Trip>) => void;
}

export default function TripPeopleSection({ trip, onTripChange }: Props) {
  const { user } = useAuth();
  const [people, setPeople] = useState<TripPerson[]>([]);
  const isOwner = user?.id === trip.user_id;

  useEffect(() => {
    listPeople(trip.id).then(setPeople).catch(() => setPeople([]));
  }, [trip.id]);

  const invite = async () => {
    const code = await ensureInviteCode(trip);
    onTripChange({ invite_code: code, is_collaborative: true });
    const link = `${window.location.origin}/trips?join=${code}`;
    await navigator.clipboard.writeText(link).catch(() => undefined);
    toast.success("Invite link copied");
  };

  const kick = async (uid: string) => {
    try {
      await removeMember(trip.id, uid);
      setPeople((p) => p.filter((x) => x.user_id !== uid));
    } catch (e: any) {
      toast.error(e.message ?? "Couldn't remove that traveller");
    }
  };

  const city = trip.destination.split(",")[0]?.trim();

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-4" style={{ background: "#111827", border: "1px solid #1E2A3F" }}>
        <div className="flex items-center gap-2">
          {trip.is_collaborative ? (
            <Users className="h-4 w-4" style={{ color: "#3B82F6" }} strokeWidth={1.5} />
          ) : (
            <Lock className="h-4 w-4" style={{ color: "#94A3B8" }} strokeWidth={1.5} />
          )}
          <p className="text-white" style={{ fontSize: 14, fontWeight: 600 }}>
            {trip.is_collaborative ? "Shared trip" : "Private trip"}
          </p>
        </div>
        <p className="mt-1" style={{ color: "#94A3B8", fontSize: 12 }}>
          {trip.is_collaborative
            ? "Only people you invite can open this itinerary."
            : "Only you can see this trip. Invite someone to plan together."}
        </p>
        {isOwner && (
          <button
            onClick={invite}
            className="mt-3 inline-flex items-center gap-1.5 text-white"
            style={{ background: "#3B82F6", borderRadius: 9999, padding: "8px 14px", fontSize: 13, fontWeight: 600 }}
          >
            <Copy className="h-3.5 w-3.5" /> {trip.invite_code ? "Copy invite link" : "Invite travellers"}
          </button>
        )}
      </div>

      <div className="space-y-2">
        {people.map((p) => (
          <div key={p.user_id} className="flex items-center gap-3 rounded-2xl p-3" style={{ background: "#111827", border: "1px solid #1E2A3F" }}>
            <div className="h-9 w-9 rounded-full overflow-hidden shrink-0" style={{ background: "#1A2236" }}>
              {p.avatar && <img src={p.avatar} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white truncate" style={{ fontSize: 14, fontWeight: 500 }}>{p.name}</p>
              <p className="capitalize" style={{ color: "#94A3B8", fontSize: 11 }}>{p.role}</p>
            </div>
            {p.role === "owner" ? (
              <Crown className="h-4 w-4" style={{ color: "#F4A261" }} strokeWidth={1.5} />
            ) : isOwner ? (
              <button onClick={() => kick(p.user_id)} aria-label="Remove traveller" className="p-1.5">
                <UserMinus className="h-4 w-4" style={{ color: "#EF4444" }} />
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {city && <PeopleWhoKnowPlace city={city} title={`People who know ${city}`} />}
    </div>
  );
}
