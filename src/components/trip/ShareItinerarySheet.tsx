import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, Users, Lock, Shield, Copy, Send, FileText } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tripId: string;
  tripTitle: string;
}

const VISIBILITIES = [
  { value: "public", label: "Public link", desc: "Anyone with the link can view", icon: Eye },
  { value: "followers", label: "Followers only", desc: "Only people who follow you", icon: Users },
  { value: "private", label: "Private invite", desc: "Only people you send the link to", icon: Lock },
  { value: "encrypted", label: "Encrypted message", desc: "Send via end-to-end encrypted DM", icon: Shield },
] as const;

export default function ShareItinerarySheet({ open, onOpenChange, tripId, tripTitle }: Props) {
  const { user } = useAuth();
  const [visibility, setVisibility] = useState<typeof VISIBILITIES[number]["value"]>("private");
  const [link, setLink] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const create = async () => {
    if (!user) return;
    setCreating(true);
    const { data, error } = await supabase.from("trip_shares")
      .insert({ trip_id: tripId, user_id: user.id, visibility })
      .select("token").single();
    setCreating(false);
    if (error || !data) return toast.error(error?.message || "Failed to create share");
    const url = `${window.location.origin}/i/${data.token}`;
    setLink(url);
    if (navigator.share) {
      navigator.share({ title: tripTitle, text: `My trip: ${tripTitle}`, url }).catch(() => {});
    }
  };

  const copy = () => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    toast.success("Link copied");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="dark-immersive border-white/10">
        <SheetHeader>
          <SheetTitle className="text-white font-heading">Share itinerary</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <p className="text-[11px] text-dark-muted">
            Share with friends, family, travel companions or trusted contacts. Use as proof of onward travel.
          </p>

          <div className="space-y-1.5">
            {VISIBILITIES.map(({ value, label, desc, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setVisibility(value)}
                className={`w-full rounded-xl p-3 flex items-center gap-3 text-left transition-all ${
                  visibility === value ? "dark-card-elevated ring-1 ring-emerald-500/30" : "dark-card"
                }`}
              >
                <Icon className={`h-4 w-4 ${visibility === value ? "text-glow" : "text-dark-muted"} shrink-0`} />
                <div className="flex-1">
                  <p className="text-[12px] font-semibold text-white">{label}</p>
                  <p className="text-[10px] text-dark-muted">{desc}</p>
                </div>
              </button>
            ))}
          </div>

          {link ? (
            <div className="dark-card rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2">
                <code className="text-[10px] text-glow flex-1 truncate">{link}</code>
                <button onClick={copy} className="p-1.5 hover:bg-white/5 rounded-lg">
                  <Copy className="h-3.5 w-3.5 text-dark-muted" />
                </button>
              </div>
              <button
                onClick={() => window.open(link, "_blank")}
                className="w-full rounded-lg bg-white/5 hover:bg-white/10 py-2 text-[11px] font-bold text-white flex items-center justify-center gap-1.5"
              >
                <FileText className="h-3.5 w-3.5" /> Open shareable view
              </button>
            </div>
          ) : (
            <button
              onClick={create}
              disabled={creating}
              className="w-full gradient-glow text-white rounded-xl py-3 text-[12px] font-bold glow-accent flex items-center justify-center gap-2"
            >
              <Send className="h-4 w-4" /> {creating ? "Generating…" : "Generate share link"}
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
