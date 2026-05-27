import { useMemo } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  itemId: string;
  tripId: string;
  userId: string;
  memberCount: number;
}

export default function ItemVotes({ itemId, tripId, userId, memberCount }: Props) {
  const qc = useQueryClient();
  const votesQ = useQuery({
    queryKey: ["trip", tripId, "votes", itemId],
    queryFn: async () => {
      const { data } = await supabase
        .from("itinerary_item_votes")
        .select("user_id, vote")
        .eq("item_id", itemId);
      return data ?? [];
    },
  });

  const myVote = useMemo(
    () => votesQ.data?.find((v: any) => v.user_id === userId)?.vote as "up" | "down" | undefined,
    [votesQ.data, userId]
  );

  const cast = useMutation({
    mutationFn: async (vote: "up" | "down") => {
      await supabase
        .from("itinerary_item_votes")
        .upsert(
          { item_id: itemId, trip_id: tripId, user_id: userId, vote },
          { onConflict: "item_id,user_id" }
        );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trip", tripId, "votes", itemId] });
    },
  });

  const votes = votesQ.data ?? [];
  const up = votes.filter((v: any) => v.vote === "up").length;
  const down = votes.filter((v: any) => v.vote === "down").length;
  const total = up + down;
  const majorityDown = total >= Math.ceil(memberCount / 2) && down > up;
  const showTally = !!myVote;

  return (
    <div className="mt-2 flex items-center gap-2">
      <button
        onClick={() => cast.mutate("up")}
        className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] transition-colors ${
          myVote === "up" ? "bg-[#10B981]/20 text-[#10B981]" : "bg-white/5 text-white/60 hover:bg-white/10"
        }`}
      >
        <ThumbsUp size={11} strokeWidth={2} /> {showTally && up}
      </button>
      <button
        onClick={() => cast.mutate("down")}
        className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] transition-colors ${
          myVote === "down" ? "bg-[#EF4444]/20 text-[#EF4444]" : "bg-white/5 text-white/60 hover:bg-white/10"
        }`}
      >
        <ThumbsDown size={11} strokeWidth={2} /> {showTally && down}
      </button>
      {majorityDown && (
        <span className="rounded-full bg-[#EF4444]/15 px-2 py-0.5 text-[10px] text-[#EF4444]">
          The group voted no on this.
        </span>
      )}
    </div>
  );
}

export function useMajorityDown(itemId: string, tripId: string, memberCount: number) {
  const { data } = useQuery({
    queryKey: ["trip", tripId, "votes", itemId],
    queryFn: async () => {
      const { data } = await supabase
        .from("itinerary_item_votes")
        .select("vote")
        .eq("item_id", itemId);
      return data ?? [];
    },
  });
  const up = (data ?? []).filter((v: any) => v.vote === "up").length;
  const down = (data ?? []).filter((v: any) => v.vote === "down").length;
  const total = up + down;
  return total >= Math.ceil(memberCount / 2) && down > up;
}
