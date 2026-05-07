import { type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="rounded-2xl bg-card border border-border/40 p-8 text-center space-y-4 animate-fade-in shadow-soft">
      <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-accent/8 to-accent/4 flex items-center justify-center">
        <Icon className="h-8 w-8 text-accent/70" />
      </div>
      <div className="space-y-1.5">
        <h2 className="font-heading text-lg font-bold text-foreground">{title}</h2>
        <p className="text-muted-foreground text-[13px] max-w-[260px] mx-auto leading-relaxed">{description}</p>
      </div>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="gradient-accent border-0 rounded-xl h-10 px-6 font-bold text-[13px]">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
