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
    <div className="rounded-2xl bg-card border border-border p-8 text-center space-y-4 animate-fade-in">
      <div className="mx-auto h-20 w-20 rounded-full bg-accent/10 flex items-center justify-center">
        <Icon className="h-10 w-10 text-accent" />
      </div>
      <div className="space-y-1">
        <h2 className="font-heading text-lg font-semibold text-foreground">{title}</h2>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">{description}</p>
      </div>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
