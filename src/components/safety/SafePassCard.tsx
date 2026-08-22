import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, ChevronRight, CheckCircle2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface SafePassCardProps {
  variant?: "compact" | "full";
  destination?: string;
}

interface SafeItem { label: string; required: boolean; completed: boolean }

export default function SafePassCard({ variant = "compact", destination }: SafePassCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<SafeItem[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [profileRes, contactsRes, privacyRes, docsRes] = await Promise.all([
        supabase.from("profiles").select("name, home_city, profile_photo").eq("id", user.id).maybeSingle(),
        supabase.from("trusted_contacts").select("id, share_live_location").eq("user_id", user.id),
        supabase.from("user_privacy_settings").select("id").eq("user_id", user.id).maybeSingle(),
        supabase.from("checklists").select("id, completed").eq("user_id", user.id).eq("category", "documents"),
      ]);
      if (cancelled) return;

      const profile = profileRes.data;
      const contacts = contactsRes.data ?? [];
      const docs = docsRes.data ?? [];

      setItems([
        { label: "Profile details", required: true, completed: !!(profile?.name && profile?.home_city) },
        { label: "Trusted contact added", required: true, completed: contacts.length > 0 },
        { label: "Location sharing set up", required: false, completed: contacts.some((c) => c.share_live_location) },
        { label: "Privacy preferences", required: false, completed: !!privacyRes.data },
        { label: "Travel documents checked", required: false, completed: docs.length > 0 && docs.every((d) => d.completed) },
      ]);
    })().catch(() => { if (!cancelled) setItems([]); });
    return () => { cancelled = true; };
  }, [user]);

  const total = items.length || 1;
  const completed = items.filter((i) => i.completed).length;
  const requiredItems = items.filter((i) => i.required);
  const requiredDone = requiredItems.filter((i) => i.completed).length;
  const allRequiredDone = requiredItems.length > 0 && requiredDone === requiredItems.length;

  if (variant === "compact") {
    return (
      <button
        onClick={() => navigate("/safety")}
        className="w-full rounded-2xl border border-border/40 bg-card p-4 flex items-center gap-3 shadow-soft hover:shadow-elevated transition-all text-left group animate-fade-in"
      >
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
          allRequiredDone ? "bg-emerald-500/10" : "bg-amber-500/10"
        }`}>
          <Shield className={`h-5 w-5 ${allRequiredDone ? "text-emerald-600" : "text-amber-600"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-foreground">SafePass</p>
          <p className="text-[11px] text-muted-foreground">
            {items.length === 0
              ? "Set up your safety essentials"
              : allRequiredDone
                ? "All systems green. You're prepared."
                : `${requiredItems.length - requiredDone} required item${requiredItems.length - requiredDone === 1 ? "" : "s"} need attention`}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors shrink-0" />
      </button>
    );
  }

  return (
    <button
      onClick={() => navigate("/safety")}
      className="w-full dark-card rounded-2xl p-4 space-y-3 hover:bg-white/[0.04] transition-colors text-left"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-glow" />
          <p className="text-[13px] font-bold text-white">SafePass</p>
        </div>
        <span className="text-[10px] font-bold text-glow">{completed}/{items.length || 0}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full gradient-glow transition-all duration-700"
          style={{ width: `${(completed / total) * 100}%` }}
        />
      </div>
      {destination && (
        <p className="text-[10px] text-dark-muted flex items-center gap-1">
          {allRequiredDone ? (
            <><CheckCircle2 className="h-3 w-3 text-emerald-400" /> {destination} — ready</>
          ) : (
            <><AlertTriangle className="h-3 w-3 text-amber-400" /> {destination} — action needed</>
          )}
        </p>
      )}
    </button>
  );
}
