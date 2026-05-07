import { useNavigate } from "react-router-dom";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ArrowRight, X } from "lucide-react";
import { UPGRADE_TRIGGERS, PLANS, type UpgradeTrigger } from "@/services/subscriptions";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: UpgradeTrigger;
  onDismiss?: () => void;
}

export default function UpgradeModal({ open, onOpenChange, trigger, onDismiss }: UpgradeModalProps) {
  const navigate = useNavigate();
  const config = UPGRADE_TRIGGERS[trigger];
  if (!config) return null;

  const plan = PLANS[config.requiredTier];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dark-immersive border border-white/[0.06] rounded-3xl max-w-sm mx-auto p-0 gap-0 [&>button]:hidden">
        {/* Glow background */}
        <div className="relative overflow-hidden rounded-t-3xl">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/8 to-transparent" />
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl" />

          <div className="relative px-6 pt-8 pb-4 text-center">
            {/* Dismiss */}
            <button
              onClick={() => { onOpenChange(false); onDismiss?.(); }}
              className="absolute top-4 right-4 h-7 w-7 rounded-full dark-card-elevated flex items-center justify-center"
            >
              <X className="h-3.5 w-3.5 text-dark-muted" />
            </button>

            {/* Emoji */}
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">{config.emoji}</span>
            </div>

            <DialogHeader>
              <DialogTitle className="font-heading text-lg font-bold text-white text-center">
                {config.title}
              </DialogTitle>
            </DialogHeader>

            <p className="text-[12px] text-dark-muted leading-relaxed mt-3 max-w-[280px] mx-auto">
              {config.description}
            </p>
          </div>
        </div>

        {/* Plan preview */}
        <div className="px-6 pb-2">
          <div className="dark-card rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[12px] font-bold text-white">{plan.name}</p>
              <p className="text-[10px] text-dark-muted mt-0.5">
                Starting at ${plan.priceMonthly}/mo
              </p>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-glow">
                ${(plan.priceYearly / 12).toFixed(2)}/mo billed yearly
              </span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="px-6 pb-6 pt-2 space-y-2">
          <button
            onClick={() => { onOpenChange(false); navigate("/subscription"); }}
            className="w-full rounded-xl gradient-glow py-3 text-[13px] font-bold text-white flex items-center justify-center gap-2 glow-accent"
          >
            {config.ctaLabel} <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => { onOpenChange(false); onDismiss?.(); }}
            className="w-full text-[11px] text-dark-muted font-medium py-2 hover:text-white/40 transition-colors"
          >
            Maybe later
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
