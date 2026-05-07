import { useNavigate } from "react-router-dom";
import { Shield, ChevronRight, CheckCircle2, AlertTriangle } from "lucide-react";
import { MOCK_SAFETY_CHECKLIST } from "@/data";

interface SafePassCardProps {
  variant?: "compact" | "full";
  destination?: string;
}

export default function SafePassCard({ variant = "compact", destination }: SafePassCardProps) {
  const navigate = useNavigate();
  const completed = MOCK_SAFETY_CHECKLIST.filter(i => i.completed).length;
  const total = MOCK_SAFETY_CHECKLIST.length;
  const requiredDone = MOCK_SAFETY_CHECKLIST.filter(i => i.required && i.completed).length;
  const totalRequired = MOCK_SAFETY_CHECKLIST.filter(i => i.required).length;
  const allRequiredDone = requiredDone === totalRequired;

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
            {allRequiredDone
              ? "All systems green. You're prepared."
              : `${totalRequired - requiredDone} required items need attention`}
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
        <span className="text-[10px] font-bold text-glow">{completed}/{total}</span>
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
