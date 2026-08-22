/**
 * Finds the existing direct conversation with a traveller, or creates one.
 * Returns the conversation id, or null when messaging is unavailable.
 */
import { supabase } from "@/integrations/supabase/client";

export async function startConversation(myId: string, otherUserId: string): Promise<string | null> {
  const { data: mine } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", myId);

  const convIds = (mine ?? []).map((c) => c.conversation_id);
  if (convIds.length) {
    const { data: shared } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", otherUserId)
      .in("conversation_id", convIds);
    if (shared && shared.length) return shared[0].conversation_id;
  }

  const { data: conv, error } = await supabase
    .from("conversations")
    .insert({ type: "direct", created_by: myId })
    .select("id")
    .single();
  if (error || !conv) return null;

  const { error: partErr } = await supabase.from("conversation_participants").insert([
    { conversation_id: conv.id, user_id: myId, role: "owner" },
    { conversation_id: conv.id, user_id: otherUserId, role: "member" },
  ]);
  if (partErr) return null;

  return conv.id;
}
