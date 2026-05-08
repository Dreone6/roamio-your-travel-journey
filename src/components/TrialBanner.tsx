import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";

interface TrialBannerProps {
  variant?: "default" | "compact";
}

export default function TrialBanner({ variant = "default" }: TrialBannerProps) {
  const navigate = useNavigate();
  const { isTrialing, daysLeft, status, loading } = useSubscription();
  if (loading) return null;

  // Expired trial → nudge to upgrade
  if (!isTrialing && status === "trialing") {
    return (
      <button
        onClick={() => navigate("/subscription")}
        className="w-full rounded-2xl p-4 text-left bg-gradient-to-r from-primary/15 to-accent/10 border border-primary/20 flex items-center gap-3"
      >
        <div className="h-9 w-9 rounded-xl gradient-glow flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-foreground">Your Pro trial ended</p>
          <p className="text-[11px] text-muted-foreground truncate">Keep unlimited stories, AI research & offline maps</p>
        </div>
        <ArrowRight className="h-4 w-4 text-primary shrink-0" />
      </button>
    );
  }

  if (!isTrialing || daysLeft === null) return null;

  const label = daysLeft === 1 ? "1 day left" : `${daysLeft} days left`;

  if (variant === "compact") {
    return (
      <button
        onClick={() => navigate("/subscription")}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold bg-primary/15 text-primary border border-primary/20"
      >
        <Sparkles className="h-3 w-3" /> Pro trial · {label}
      </button>
    );
  }

  return (
    <button
      onClick={() => navigate("/subscription")}
      className="w-full rounded-2xl p-4 text-left bg-gradient-to-r from-primary/20 via-primary/10 to-accent/10 border border-primary/25 flex items-center gap-3"
    >
      <div className="h-10 w-10 rounded-xl gradient-glow flex items-center justify-center glow-accent">
        <Sparkles className="h-5 w-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-foreground">You're on Roavr Pro · {label}</p>
        <p className="text-[11px] text-muted-foreground">Permanent archive, deep AI research, offline maps</p>
      </div>
      <span className="rounded-full bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground">Keep Pro</span>
    </button>
  );
}
