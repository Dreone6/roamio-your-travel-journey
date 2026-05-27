import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Share2, X } from "lucide-react";

export type Badge = {
  slug: string; name: string; description: string; category: string; emoji: string;
};

type Ctx = {
  /** Calls check-badges edge function and queues celebrations for newly awarded badges. */
  checkBadges: () => Promise<void>;
};

const BadgeContext = createContext<Ctx>({ checkBadges: async () => {} });
export const useBadges = () => useContext(BadgeContext);

export function BadgeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [queue, setQueue] = useState<Badge[]>([]);
  const current = queue[0];

  const checkBadges = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase.functions.invoke("check-badges", { body: { user_id: user.id } });
      if (data?.newly_awarded?.length) {
        setQueue(prev => [...prev, ...data.newly_awarded]);
      }
    } catch (e) {
      console.error("badge check failed", e);
    }
  }, [user]);

  const dismiss = useCallback(() => setQueue(prev => prev.slice(1)), []);

  // auto-dismiss after 6s
  useEffect(() => {
    if (!current) return;
    const t = setTimeout(dismiss, 6000);
    return () => clearTimeout(t);
  }, [current, dismiss]);

  return (
    <BadgeContext.Provider value={{ checkBadges }}>
      {children}
      <AnimatePresence>
        {current && (
          <motion.div
            key={current.slug}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.97 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] bg-[#080D1A] flex flex-col items-center justify-center px-8"
          >
            {/* particles */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {Array.from({ length: 30 }).map((_, i) => {
                const angle = (i / 30) * Math.PI * 2;
                const dist = 120 + Math.random() * 80;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                    animate={{ opacity: 0, scale: 0, x: Math.cos(angle) * dist, y: Math.sin(angle) * dist }}
                    transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
                    className="absolute w-2 h-2 rounded-full"
                    style={{ background: i % 2 ? "#3B82F6" : "#F59E0B", boxShadow: "0 0 8px currentColor" }}
                  />
                );
              })}
            </div>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.1, 1] }}
              transition={{ type: "spring", stiffness: 220, damping: 14, times: [0, 0.6, 1] }}
              className="text-[80px] leading-none mb-6"
            >
              {current.emoji}
            </motion.div>

            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="font-display text-[24px] text-white text-center"
            >
              {current.name}
            </motion.h2>
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-[14px] text-white/60 text-center mt-2 max-w-xs"
            >
              {current.description}
            </motion.p>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: `I just earned the ${current.name} badge on Roavr!`, text: current.description }).catch(() => {});
                  }
                  dismiss();
                }}
                className="h-11 px-5 rounded-full bg-[#3B82F6] hover:bg-[#2563EB] text-white text-[13px] font-medium flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" /> Share
              </button>
              <button
                onClick={dismiss}
                className="h-11 px-5 rounded-full text-white/70 text-[13px] font-medium flex items-center gap-2"
              >
                <X className="w-4 h-4" /> Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </BadgeContext.Provider>
  );
}
