import { AlertTriangle, RefreshCw, WifiOff, MapPinOff, ImageOff, CreditCard, MessageCircleX, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

type ErrorType = "network" | "upload" | "message" | "location" | "ai" | "payment" | "generic";

const ERROR_CONFIG: Record<ErrorType, { icon: LucideIcon; title: string; description: string }> = {
  network: { icon: WifiOff, title: "No connection", description: "Check your internet and try again." },
  upload: { icon: ImageOff, title: "Upload failed", description: "The file couldn't be uploaded. Please try again." },
  message: { icon: MessageCircleX, title: "Message not sent", description: "Something went wrong. Tap retry to send again." },
  location: { icon: MapPinOff, title: "Location unavailable", description: "Enable location access in your device settings to continue." },
  ai: { icon: AlertTriangle, title: "AI generation failed", description: "Our AI service is temporarily busy. Please try again shortly." },
  payment: { icon: CreditCard, title: "Payment issue", description: "Your payment couldn't be processed. Check your details and retry." },
  generic: { icon: AlertTriangle, title: "Something went wrong", description: "An unexpected error occurred. Please try again." },
};

interface ErrorStateProps {
  type?: ErrorType;
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export default function ErrorState({ type = "generic", title, description, onRetry, retryLabel = "Try Again" }: ErrorStateProps) {
  const config = ERROR_CONFIG[type];
  const Icon = config.icon;

  return (
    <div className="rounded-2xl bg-card border border-border/40 p-6 text-center space-y-4 animate-fade-in shadow-soft">
      <div className="mx-auto h-14 w-14 rounded-2xl bg-destructive/8 flex items-center justify-center">
        <Icon className="h-6 w-6 text-destructive/70" />
      </div>
      <div className="space-y-1.5">
        <h3 className="font-heading text-base font-bold text-foreground">{title || config.title}</h3>
        <p className="text-muted-foreground text-[13px] max-w-[280px] mx-auto leading-relaxed">
          {description || config.description}
        </p>
      </div>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="rounded-xl h-10 px-6 font-semibold text-[13px] gap-2">
          <RefreshCw className="h-3.5 w-3.5" /> {retryLabel}
        </Button>
      )}
    </div>
  );
}
