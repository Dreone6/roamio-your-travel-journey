/**
 * Opens (or creates) a direct conversation and optionally pre-fills the
 * composer with a context-aware opening line. The draft travels as a query
 * param so nothing is written to the database until the user actually sends.
 */
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { startConversation } from "@/lib/messaging/startConversation";

export function useStartConversation() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const open = useCallback(
    async (otherUserId: string, draft?: string) => {
      if (!user || busy || otherUserId === user.id) return;
      setBusy(true);
      const id = await startConversation(user.id, otherUserId);
      setBusy(false);
      if (!id) {
        toast.error("Couldn't open a conversation");
        return;
      }
      navigate(draft ? `/messages/${id}?draft=${encodeURIComponent(draft)}` : `/messages/${id}`);
    },
    [user, busy, navigate]
  );

  return { open, busy };
}
