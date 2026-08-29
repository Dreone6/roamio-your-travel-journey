/**
 * Avatar stack of the people currently in this trip workspace.
 */
import { AnimatePresence, motion } from "framer-motion";
import type { PresentUser } from "@/hooks/useTripPresence";

const initials = (name: string) =>
  name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();

export default function PresenceAvatars({ users, max = 4 }: { users: PresentUser[]; max?: number }) {
  if (!users.length) return null;
  const shown = users.slice(0, max);
  const extra = users.length - shown.length;

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        <AnimatePresence initial={false}>
          {shown.map((u) => (
            <motion.div
              key={u.user_id}
              layout
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
              title={u.self ? `${u.name} (you)` : u.name}
              className="relative h-7 w-7 rounded-full overflow-hidden flex items-center justify-center"
              style={{ background: "#1A2236", boxShadow: "0 0 0 2px #080D1A" }}
            >
              {u.avatar ? (
                <img src={u.avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                <span style={{ color: "#94A3B8", fontSize: 10, fontWeight: 700 }}>{initials(u.name)}</span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {extra > 0 && (
          <div
            className="h-7 w-7 rounded-full flex items-center justify-center"
            style={{ background: "#1A2236", boxShadow: "0 0 0 2px #080D1A", color: "#94A3B8", fontSize: 10, fontWeight: 700 }}
          >
            +{extra}
          </div>
        )}
      </div>
      <span className="inline-flex items-center gap-1.5" style={{ color: "#94A3B8", fontSize: 11 }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#10B981" }} />
        {users.length === 1 ? "Only you here" : `${users.length} here now`}
      </span>
    </div>
  );
}
