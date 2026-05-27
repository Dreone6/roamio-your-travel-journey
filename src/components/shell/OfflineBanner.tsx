import { AnimatePresence, motion } from "framer-motion";
import { WifiOff } from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";

export default function OfflineBanner() {
  const isOffline = useAppStore((s) => s.app.isOffline);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -32, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -32, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="sticky top-14 z-30 flex h-8 w-full items-center justify-center gap-2 bg-[#F59E0B]/15 text-[12px] font-medium text-[#F59E0B]"
        >
          <WifiOff size={14} strokeWidth={1.75} />
          You are offline. Some features are limited.
        </motion.div>
      )}
    </AnimatePresence>
  );
}
