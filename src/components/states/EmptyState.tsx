import { ReactNode } from "react";

export type EmptyStateVariant =
  | "trips-upcoming"
  | "trips-past"
  | "globe-empty"
  | "memories-empty"
  | "saved-empty"
  | "location-denied";

import {
  PlaneIllustration, PassportIllustration, GlobeWaitingIllustration,
  CameraIllustration, BookmarkPinIllustration, LocationLockIllustration,
} from "./illustrations";

interface EmptyStateProps {
  illustration?: ReactNode;
  title: string;
  body: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export function EmptyState({ illustration, title, body, ctaLabel, onCta }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center text-center py-10 px-5">
      {illustration && <div className="mb-5 opacity-90">{illustration}</div>}
      <h3 className="font-heading text-[20px] font-semibold text-white tracking-tight">{title}</h3>
      <p className="text-[14px] mt-2 max-w-[300px]" style={{ color: "#94A3B8" }}>{body}</p>
      {ctaLabel && onCta && (
        <button
          onClick={onCta}
          className="mt-6 px-6 rounded-full font-semibold text-white text-[14px]"
          style={{ background: "#3B82F6", height: 52 }}
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}

const VARIANTS: Record<
  EmptyStateVariant,
  { illustration: ReactNode; title: string; body: string; ctaLabel: string }
> = {
  "trips-upcoming": {
    illustration: <PlaneIllustration />,
    title: "No upcoming trips yet.",
    body: "Tap + New Trip to start planning your next adventure.",
    ctaLabel: "+ New Trip",
  },
  "trips-past": {
    illustration: <PassportIllustration />,
    title: "No past trips yet.",
    body: "Your travel history starts the moment you take your first trip.",
    ctaLabel: "+ New Trip",
  },
  "globe-empty": {
    illustration: <GlobeWaitingIllustration />,
    title: "Your globe is waiting.",
    body: "Check in somewhere to start mapping your world.",
    ctaLabel: "Open Capture",
  },
  "memories-empty": {
    illustration: <CameraIllustration />,
    title: "No memories yet.",
    body: "Capture your first travel moment to start your collection.",
    ctaLabel: "Open Capture",
  },
  "saved-empty": {
    illustration: <BookmarkPinIllustration />,
    title: "Nothing saved yet.",
    body: "Save places and offers while you explore.",
    ctaLabel: "Explore Nearby",
  },
  "location-denied": {
    illustration: <LocationLockIllustration />,
    title: "Location access needed.",
    body: "Roavr uses your location to show what's nearby tonight.",
    ctaLabel: "Enable in Settings",
  },
};

export function EmptyStatePreset({ variant, onCta }: { variant: EmptyStateVariant; onCta?: () => void }) {
  const v = VARIANTS[variant];
  return (
    <EmptyState
      illustration={v.illustration}
      title={v.title}
      body={v.body}
      ctaLabel={v.ctaLabel}
      onCta={onCta}
    />
  );
}
