import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Copy, MessageCircle, Share2, Link, Check } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ShareMapSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName?: string;
}

export default function ShareMapSheet({ open, onOpenChange, userName = "My" }: ShareMapSheetProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const shareUrl = `https://roavr.com/map/${userName.toLowerCase().replace(/\s/g, "")}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      toast({ title: "Link copied!", description: "Share your Roavr map with anyone." });
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="dark-immersive border-t border-white/[0.06] rounded-t-3xl p-0">
        <div className="px-5 pb-8 pt-6 space-y-5">
          <SheetHeader className="text-left">
            <SheetTitle className="font-heading text-lg font-bold text-white">Share Your Map</SheetTitle>
            <p className="text-[12px] text-dark-muted">Let others explore your travel globe</p>
          </SheetHeader>

          {/* Link preview */}
          <div className="dark-card rounded-xl p-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Link className="h-4 w-4 text-glow" />
            </div>
            <p className="text-[11px] text-white/60 truncate flex-1 font-mono">{shareUrl}</p>
            <button
              onClick={handleCopy}
              className="h-8 w-8 rounded-lg dark-card-elevated flex items-center justify-center shrink-0"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-glow" /> : <Copy className="h-3.5 w-3.5 text-white/50" />}
            </button>
          </div>

          {/* Share options */}
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { label: "Message", icon: MessageCircle, color: "from-blue-500/20 to-blue-600/10" },
              { label: "Share Link", icon: Share2, color: "from-emerald-500/20 to-teal-500/10" },
              { label: "Copy Link", icon: Copy, color: "from-purple-500/20 to-violet-500/10" },
            ].map(({ label, icon: Icon, color }) => (
              <button
                key={label}
                onClick={label === "Copy Link" ? handleCopy : undefined}
                className="dark-card rounded-xl p-4 flex flex-col items-center gap-2 hover:bg-white/[0.04] transition-colors"
              >
                <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${color} flex items-center justify-center`}>
                  <Icon className="h-4 w-4 text-white/80" />
                </div>
                <span className="text-[10px] font-semibold text-white/70">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
