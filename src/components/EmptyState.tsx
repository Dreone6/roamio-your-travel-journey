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
    <div className="rounded-2xl bg-card border border-border/50 p-10 text-center space-y-5 animate-fade-in shadow-soft">
      <div className="mx-auto h-20 w-20 rounded-2xl bg-gradient-to-br from-accent/10 to-accent/5 flex items-center justify-center">
        <Icon className="h-10 w-10 text-accent" />
      </div>
      <div className="space-y-2">
        <h2 className="font-heading text-xl font-bold text-foreground">{title}</h2>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto leading-relaxed">{description}</p>
      </div>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-2 gradient-accent border-0 rounded-xl h-11 px-8 font-semibold">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
