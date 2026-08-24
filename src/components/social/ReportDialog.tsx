/**
 * ReportDialog — the shared reporting surface for user-generated content.
 *
 * Apple 1.2 (UGC) and Google's UGC policy both require an in-app mechanism to
 * report objectionable content and abusive users. Reports land in
 * `public.reports`, which only admins can read and resolve.
 */
import { useState } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export type ReportableType = "user" | "story" | "message" | "trip" | "offer";

const REASONS = [
  { id: "harassment", label: "Harassment or bullying" },
  { id: "sexual_content", label: "Sexual or explicit content" },
  { id: "violence", label: "Violence or dangerous behaviour" },
  { id: "spam", label: "Spam or scam" },
  { id: "impersonation", label: "Impersonation" },
  { id: "other", label: "Something else" },
] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: ReportableType;
  targetId: string;
  targetLabel?: string;
  /** Called after a successful report — typically to also block the user. */
  onReported?: () => void;
}

export function ReportDialog({ open, onOpenChange, targetType, targetId, targetLabel, onReported }: Props) {
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!reason) return;
    setSubmitting(true);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) {
      setSubmitting(false);
      toast.error("You need to be signed in to report content.");
      return;
    }
    const { error } = await supabase.from("reports").insert({
      reporter_id: uid,
      reported_type: targetType,
      reported_id: targetId,
      reason,
      details: details.trim() || null,
      status: "pending",
    });
    setSubmitting(false);
    if (error) {
      toast.error("Report could not be sent. Please try again.");
      return;
    }
    toast.success("Report sent. Our team reviews reports within 24 hours.");
    setReason(null);
    setDetails("");
    onOpenChange(false);
    onReported?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[15px]">
            <Flag className="h-4 w-4" /> Report {targetLabel ?? targetType}
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            Reports are confidential. We review every report and remove content that breaks our rules.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          {REASONS.map((r) => (
            <button
              key={r.id}
              onClick={() => setReason(r.id)}
              className={`w-full text-left rounded-xl border px-3 py-2.5 text-[12px] transition-colors ${
                reason === r.id ? "border-primary bg-primary/10 text-foreground" : "border-border/50 text-muted-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <Textarea
          value={details}
          onChange={(e) => setDetails(e.target.value.slice(0, 500))}
          placeholder="Add details (optional)"
          className="text-[12px] rounded-xl"
          rows={3}
        />

        <Button onClick={submit} disabled={!reason || submitting} className="w-full rounded-xl h-10 text-[13px]">
          {submitting ? "Sending…" : "Submit report"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
