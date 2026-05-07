import { Loader2, type LucideIcon } from "lucide-react";

interface LoadingStateProps {
  message?: string;
  icon?: LucideIcon;
  variant?: "default" | "dark" | "inline";
}

export default function LoadingState({ message = "Loading...", icon: Icon, variant = "default" }: LoadingStateProps) {
  if (variant === "inline") {
    return (
      <div className="flex items-center justify-center gap-2 py-6">
        <Loader2 className="h-4 w-4 animate-spin text-accent" />
        <span className="text-sm text-muted-foreground">{message}</span>
      </div>
    );
  }

  const isDark = variant === "dark";

  return (
    <div className={`flex flex-col items-center justify-center py-16 space-y-4 animate-fade-in ${isDark ? "" : ""}`}>
      <div className="relative">
        <div className={`h-16 w-16 rounded-full flex items-center justify-center ${isDark ? "bg-white/5" : "bg-accent/6"}`}>
          {Icon ? (
            <Icon className={`h-7 w-7 ${isDark ? "text-glow" : "text-accent/60"} animate-pulse`} />
          ) : (
            <Loader2 className={`h-7 w-7 animate-spin ${isDark ? "text-glow" : "text-accent"}`} />
          )}
        </div>
        <div className={`absolute inset-0 rounded-full border-2 border-t-transparent animate-spin ${isDark ? "border-emerald-500/20" : "border-accent/15"}`} style={{ animationDuration: "1.5s" }} />
      </div>
      <p className={`text-sm font-medium ${isDark ? "text-dark-muted" : "text-muted-foreground"}`}>{message}</p>
    </div>
  );
}
