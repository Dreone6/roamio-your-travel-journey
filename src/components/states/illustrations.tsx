// Subtle line-art illustrations for empty states.
// Thin strokes, travel-themed, dark-friendly.

const STROKE = "#94A3B8";
const ACCENT = "#3B82F6";

export function PlaneIllustration() {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden>
      <path
        d="M14 70 Q 36 38, 56 30 Q 70 25, 82 22"
        stroke={STROKE}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="2 4"
      />
      <path
        d="M52 24 L78 14 L74 28 L84 36 L70 38 L66 50 L58 38 L46 36 L56 30 Z"
        stroke="#FFFFFF"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="14" cy="70" r="2.5" fill={ACCENT} />
    </svg>
  );
}

export function PassportIllustration() {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden>
      <rect x="20" y="18" width="44" height="60" rx="3" stroke={STROKE} strokeWidth="1.5" />
      <rect x="32" y="18" width="44" height="60" rx="3" stroke="#FFFFFF" strokeWidth="1.5" fill="none" />
      <line x1="40" y1="34" x2="68" y2="34" stroke={STROKE} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="54" cy="50" r="8" stroke={ACCENT} strokeWidth="1.5" />
      <line x1="40" y1="64" x2="68" y2="64" stroke={STROKE} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="40" y1="70" x2="62" y2="70" stroke={STROKE} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function GlobeWaitingIllustration() {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden>
      <circle cx="48" cy="48" r="28" stroke={STROKE} strokeWidth="1.5" />
      <ellipse cx="48" cy="48" rx="28" ry="11" stroke={STROKE} strokeWidth="1.5" />
      <line x1="20" y1="48" x2="76" y2="48" stroke={STROKE} strokeWidth="1.5" />
      <line x1="48" y1="20" x2="48" y2="76" stroke={STROKE} strokeWidth="1.5" />
      <circle cx="62" cy="36" r="3" fill={ACCENT}>
        <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

export function CameraIllustration() {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden>
      <rect x="18" y="32" width="60" height="42" rx="6" stroke={STROKE} strokeWidth="1.5" />
      <path d="M34 32 L40 24 L56 24 L62 32" stroke={STROKE} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="48" cy="53" r="11" stroke="#FFFFFF" strokeWidth="1.5" />
      <circle cx="48" cy="53" r="5" stroke={STROKE} strokeWidth="1.5" />
      <path d="M72 22 L72 28 M69 25 L75 25" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M78 16 L78 20 M76 18 L80 18" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function BookmarkPinIllustration() {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden>
      <path d="M30 18 L60 18 L60 76 L45 64 L30 76 Z" stroke={STROKE} strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M70 32 C 70 40, 60 50, 60 50 C 60 50, 50 40, 50 32 A 10 10 0 0 1 70 32 Z" stroke="#FFFFFF" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="60" cy="32" r="3" fill={ACCENT} />
    </svg>
  );
}

export function LocationLockIllustration() {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden>
      <path d="M62 38 C 62 52, 44 70, 44 70 C 44 70, 26 52, 26 38 A 18 18 0 0 1 62 38 Z" stroke={STROKE} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="44" cy="38" r="6" stroke={STROKE} strokeWidth="1.5" />
      <rect x="58" y="56" width="20" height="16" rx="2" stroke="#FFFFFF" strokeWidth="1.5" />
      <path d="M62 56 L62 50 A 6 6 0 0 1 74 50 L74 56" stroke="#FFFFFF" strokeWidth="1.5" />
      <circle cx="68" cy="64" r="1.5" fill={ACCENT} />
    </svg>
  );
}
