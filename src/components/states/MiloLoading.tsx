/**
 * Milo, sniffing out the best spots.
 *
 * Loading state for AI generation: a looping inline-SVG mascot animation above
 * a rotating set of skeleton previews that mirror the shape of the itinerary
 * that is about to arrive. Deliberately no spinners — the wait should read as
 * "Roavr is working the map", not "the app is stuck".
 */
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const LINES = [
  "Milo is sniffing out the best spots…",
  "Checking what's walkable from your stay…",
  "Sorting mornings, afternoons and late nights…",
  "Picking the places locals actually go…",
];

/** Three skeleton silhouettes of the structures the planner returns. */
const SHAPES = ["day", "map", "list"] as const;

function Bar({ w, h = 10, dim = false }: { w: string | number; h?: number; dim?: boolean }) {
  return (
    <div
      className="rounded-full animate-pulse"
      style={{ width: w, height: h, background: dim ? "#1A2236" : "#1E2A3F" }}
    />
  );
}

function DaySkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-start gap-3">
          <Bar w={38} h={10} />
          <div className="flex-1 space-y-2">
            <Bar w={`${72 - i * 12}%`} h={12} />
            <Bar w={`${48 - i * 8}%`} dim />
          </div>
          <div className="h-7 w-7 rounded-lg animate-pulse" style={{ background: "#1A2236" }} />
        </div>
      ))}
    </div>
  );
}

function MapSkeleton() {
  return (
    <div className="relative h-[104px] rounded-2xl overflow-hidden" style={{ background: "#0A1628" }}>
      <div className="absolute inset-0 animate-pulse" style={{ background: "#111C31" }} />
      {[
        { top: "28%", left: "22%", d: 0 },
        { top: "56%", left: "48%", d: 0.4 },
        { top: "34%", left: "72%", d: 0.8 },
      ].map((p, i) => (
        <motion.span
          key={i}
          className="absolute h-2.5 w-2.5 rounded-full"
          style={{ top: p.top, left: p.left, background: "#3B82F6", boxShadow: "0 0 0 6px rgba(59,130,246,0.18)" }}
          animate={{ scale: [1, 1.35, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.8, repeat: Infinity, delay: p.d, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2.5">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl animate-pulse" style={{ background: "#1A2236" }} />
          <div className="flex-1 space-y-2">
            <Bar w={`${80 - i * 10}%`} h={11} />
            <Bar w={`${40 + i * 6}%`} dim />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Looping mascot: Milo nose-down, tail wagging, scent dots drifting off the trail. */
function MiloSniffing() {
  return (
    <svg width="120" height="84" viewBox="0 0 120 84" role="img" aria-label="Milo sniffing out the best spots">
      {/* ground trail */}
      <motion.path
        d="M12 70 C 34 62, 52 76, 74 66 C 90 59, 100 66, 110 62"
        fill="none"
        stroke="#1E2A3F"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="4 6"
        animate={{ strokeDashoffset: [0, -20] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
      />

      <motion.g
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* body */}
        <ellipse cx="58" cy="48" rx="24" ry="14" fill="#1E3A5F" />
        {/* legs */}
        <rect x="42" y="58" width="5" height="10" rx="2.5" fill="#1E3A5F" />
        <rect x="70" y="58" width="5" height="10" rx="2.5" fill="#1E3A5F" />
        {/* tail — wag */}
        <motion.path
          d="M81 44 C 92 38, 96 32, 94 26"
          fill="none"
          stroke="#1E3A5F"
          strokeWidth="5"
          strokeLinecap="round"
          style={{ originX: "81px", originY: "44px" }}
          animate={{ rotate: [-14, 14, -14] }}
          transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* head — dips to sniff */}
        <motion.g
          style={{ originX: "40px", originY: "42px" }}
          animate={{ rotate: [0, 9, 0, 4, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <circle cx="34" cy="42" r="13" fill="#2A4A7F" />
          {/* ear */}
          <motion.path
            d="M42 32 C 48 28, 51 34, 47 40 C 45 43, 42 42, 41 39 Z"
            fill="#1E3A5F"
            style={{ originX: "43px", originY: "33px" }}
            animate={{ rotate: [0, -10, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* muzzle + nose */}
          <ellipse cx="25" cy="47" rx="9" ry="6.5" fill="#3B82F6" opacity="0.9" />
          <motion.circle
            cx="18"
            cy="46"
            r="3.2"
            fill="#FFFFFF"
            animate={{ scale: [1, 1.18, 1] }}
            transition={{ duration: 0.55, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* eye */}
          <circle cx="35" cy="38" r="2.2" fill="#080D1A" />
        </motion.g>
      </motion.g>

      {/* scent dots drifting up from the nose */}
      {[0, 0.5, 1].map((d, i) => (
        <motion.circle
          key={i}
          cx={16 + i * 3}
          cy={42}
          r={2}
          fill="#3B82F6"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.75, 0], y: [0, -18], x: [0, -6 - i * 3] }}
          transition={{ duration: 1.8, repeat: Infinity, delay: d, ease: "easeOut" }}
        />
      ))}
    </svg>
  );
}

interface Props {
  /** Optional override for the rotating status copy, e.g. the destination. */
  context?: string;
  className?: string;
}

export default function MiloLoading({ context, className }: Props) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setStep((s) => s + 1), 2400);
    return () => clearInterval(t);
  }, []);

  const line = context && step === 0 ? `Milo is sniffing out ${context}…` : LINES[step % LINES.length];
  const shape = SHAPES[step % SHAPES.length];

  return (
    <div className={className} aria-busy="true" aria-live="polite">
      <div className="flex flex-col items-center text-center">
        <MiloSniffing />
        <div className="h-5 mt-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={line}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: "easeInOut" }}
              style={{ color: "#94A3B8", fontSize: 13 }}
            >
              {line}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-5 rounded-2xl p-4" style={{ background: "#1A2236", border: "1px solid #1E2A3F" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={shape}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            {shape === "day" && <DaySkeleton />}
            {shape === "map" && <MapSkeleton />}
            {shape === "list" && <ListSkeleton />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
