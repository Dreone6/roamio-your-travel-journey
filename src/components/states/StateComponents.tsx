// Loading + error state primitives, design-system aligned.

import { Globe, MapPin, Sparkles } from "lucide-react";
import { toast } from "sonner";

// ─── LOADING ──────────────────────────────────────

export function TypingDots({ caption = "Roavr is thinking…" }: { caption?: string }) {
  return (
    <div className="flex flex-col items-start gap-2 py-2">
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="block h-1.5 w-1.5 rounded-full"
            style={{
              background: "#3B82F6",
              animation: `roavr-dot 1.2s ${i * 0.18}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>
      <p className="text-[12px]" style={{ color: "#94A3B8" }}>{caption}</p>
      <style>{`
        @keyframes roavr-dot {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-3px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export function Shimmer({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`overflow-hidden relative ${className}`}
      style={{ background: "#1A2236", ...style }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(90deg, transparent, #2D3F5A 50%, transparent)",
          animation: "roavr-shimmer 1.6s linear infinite",
        }}
      />
      <style>{`
        @keyframes roavr-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl p-4 space-y-3" style={{ background: "#1A2236", borderRadius: 16 }}>
      <Shimmer style={{ height: 14, width: "60%", borderRadius: 6 }} />
      <Shimmer style={{ height: 12, width: "85%", borderRadius: 6 }} />
      <Shimmer style={{ height: 12, width: "40%", borderRadius: 6 }} />
    </div>
  );
}

export function GlobeShimmer() {
  return (
    <Shimmer className="absolute inset-0" style={{ background: "#1A2236" }} />
  );
}

export function ImportProgressBar({ caption = "Reading your booking…" }: { caption?: string }) {
  return (
    <div className="space-y-2">
      <p className="text-[12px]" style={{ color: "#94A3B8" }}>{caption}</p>
      <div className="relative h-2 rounded-full overflow-hidden" style={{ background: "#1A2236" }}>
        <div
          className="absolute top-0 h-full rounded-full"
          style={{
            width: "40%",
            background: "#3B82F6",
            animation: "roavr-progress 1.6s ease-in-out infinite",
          }}
        />
      </div>
      <style>{`
        @keyframes roavr-progress {
          0% { left: -40%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
}

// ─── ERRORS ──────────────────────────────────────

export function showAiUnavailableToast(onRetry?: () => void) {
  toast.custom((t) => (
    <div
      className="flex items-center gap-3 p-4 rounded-2xl w-[340px]"
      style={{
        background: "#1A2236",
        border: "1px solid #1E2A3F",
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
      }}
    >
      <Sparkles className="h-5 w-5 shrink-0" style={{ color: "#94A3B8" }} strokeWidth={1.5} />
      <p className="flex-1 text-[14px] text-white">Roavr needs a moment. Try again.</p>
      <button
        onClick={() => { toast.dismiss(t); onRetry?.(); }}
        className="text-[14px] font-semibold"
        style={{ color: "#3B82F6" }}
      >
        Retry
      </button>
    </div>
  ), { duration: 4000 });
}

interface InlineErrorProps {
  message: string;
  primaryLabel?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export function InlineErrorCard({ message, primaryLabel, onPrimary, secondaryLabel, onSecondary }: InlineErrorProps) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: "#111827",
        borderLeft: "3px solid #EF4444",
        boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
      }}
    >
      <p className="text-[14px] text-white leading-relaxed">{message}</p>
      {(primaryLabel || secondaryLabel) && (
        <div className="flex gap-2 mt-3">
          {primaryLabel && (
            <button
              onClick={onPrimary}
              className="px-4 rounded-full text-[12px] font-semibold text-white"
              style={{ background: "#3B82F6", height: 36 }}
            >
              {primaryLabel}
            </button>
          )}
          {secondaryLabel && (
            <button
              onClick={onSecondary}
              className="px-4 rounded-full text-[12px] font-semibold text-white"
              style={{ background: "#1A2236", border: "1px solid #1E2A3F", height: 36 }}
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function LocationUnavailableCard({ onEnable }: { onEnable?: () => void }) {
  return (
    <div
      className="rounded-2xl p-4 flex items-start gap-3"
      style={{ background: "#111827", boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}
    >
      <MapPin className="h-5 w-5 mt-0.5 shrink-0" style={{ color: "#94A3B8" }} strokeWidth={1.5} />
      <div className="flex-1">
        <p className="text-[14px] text-white leading-relaxed">
          Location access helps Roavr find things near you.
        </p>
        <button
          onClick={onEnable}
          className="mt-2 text-[14px] font-semibold"
          style={{ color: "#3B82F6" }}
        >
          Enable in Settings
        </button>
      </div>
    </div>
  );
}

export function OfflineBanner({ onRetry }: { onRetry?: () => void }) {
  return (
    <div
      className="flex items-center gap-2 px-5 py-2"
      style={{ background: "#1A2236", borderBottom: "1px solid #1E2A3F" }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full animate-pulse"
        style={{ background: "#F59E0B" }}
      />
      <p className="text-[12px] text-white flex-1">You're offline — some features are limited</p>
      <button
        onClick={onRetry}
        className="text-[12px] font-semibold"
        style={{ color: "#3B82F6" }}
      >
        Retry
      </button>
    </div>
  );
}

export function GlobeLoadError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
      <Globe className="h-10 w-10 mb-3" style={{ color: "#94A3B8" }} strokeWidth={1.5} />
      <p className="text-[16px] font-semibold text-white">Globe couldn't load.</p>
      <p className="text-[14px] mt-1.5 max-w-[260px]" style={{ color: "#94A3B8" }}>
        Check your connection and try again.
      </p>
      <button
        onClick={onRetry}
        className="mt-5 px-6 rounded-full text-[14px] font-semibold text-white"
        style={{ background: "#3B82F6", height: 44 }}
      >
        Retry
      </button>
    </div>
  );
}
