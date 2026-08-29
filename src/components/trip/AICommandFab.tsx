/**
 * Contextual AI action: a floating button that expands into a frosted-glass
 * command palette wrapping Ask Roavr. Nothing is saved without a tap inside.
 */
import { useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import AskRoavrPanel from "@/components/trip/AskRoavrPanel";
import type { ItineraryItem, Trip } from "@/lib/trips/types";

interface Props {
  trip: Trip;
  items: ItineraryItem[];
  onItemsAdded: (added: ItineraryItem[]) => void;
}

export default function AICommandFab({ trip, items, onItemsAdded }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <motion.button
        onClick={() => setOpen(true)}
        aria-label="Ask Roavr"
        whileTap={{ scale: 0.92 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="fixed right-5 z-40 inline-flex items-center gap-2 text-white"
        style={{
          bottom: "calc(88px + env(safe-area-inset-bottom))",
          background: "#3B82F6",
          borderRadius: 9999,
          padding: "12px 18px",
          fontSize: 14,
          fontWeight: 600,
          boxShadow: "0 8px 32px rgba(0,0,0,.6)",
        }}
      >
        <Sparkles className="h-4 w-4" strokeWidth={1.5} /> Ask Roavr
      </motion.button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div
                className="absolute inset-0"
                style={{ background: "rgba(8,13,26,.72)", backdropFilter: "blur(16px)" }}
                onClick={() => setOpen(false)}
              />
              <motion.div
                initial={{ y: 40, opacity: 0, scale: 0.98 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 30, opacity: 0, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                className="relative w-full sm:max-w-lg max-h-[85dvh] overflow-y-auto no-scrollbar p-4"
                style={{
                  background: "rgba(17,24,39,.82)",
                  backdropFilter: "blur(24px)",
                  border: "1px solid rgba(255,255,255,.08)",
                  borderRadius: 24,
                  boxShadow: "0 8px 32px rgba(0,0,0,.6)",
                  margin: 12,
                  paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-white font-heading" style={{ fontSize: 15, fontWeight: 600 }}>
                    Command palette
                  </p>
                  <button onClick={() => setOpen(false)} aria-label="Close" className="p-1.5">
                    <X className="h-4 w-4" style={{ color: "#94A3B8" }} />
                  </button>
                </div>
                <AskRoavrPanel
                  trip={trip}
                  trips={[trip]}
                  items={items}
                  onTripSelect={() => undefined}
                  onItemsAdded={(added) => { onItemsAdded(added); setOpen(false); }}
                  onClose={() => setOpen(false)}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
