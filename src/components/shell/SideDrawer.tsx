import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Settings, Bell, HelpCircle, Shield, FileText, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppStore } from "@/stores/useAppStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Props {
  open: boolean;
  onClose: () => void;
}

const APP_VERSION = "0.9.0";

export default function SideDrawer({ open, onClose }: Props) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const profile = useAppStore((s) => s.user.profile);

  const name = profile?.name || "Traveler";
  const homeCity = profile?.home_city || "Add home city";
  const initials = name
    .split(" ")
    .map((p: string) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const go = (path: string) => {
    onClose();
    navigate(path);
  };

  const handleSignOut = async () => {
    onClose();
    await signOut();
    navigate("/auth");
  };

  const navItems = [
    { icon: Settings, label: "Account settings", path: "/settings" },
    { icon: Bell, label: "Notifications", path: "/notifications" },
    { icon: HelpCircle, label: "Help", path: "/settings" },
    { icon: Shield, label: "Privacy policy", path: "/privacy" },
    { icon: FileText, label: "Terms of service", path: "/settings" },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed left-0 top-0 z-[61] flex h-full w-[280px] flex-col bg-[#111827] text-foreground shadow-2xl"
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) onClose();
            }}
          >
            {/* Profile */}
            <div className="flex items-center gap-3 px-5 pb-4 pt-8">
              <Avatar className="h-12 w-12">
                <AvatarImage src={profile?.profile_photo} alt={name} />
                <AvatarFallback className="bg-primary/20 text-sm font-semibold text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-display text-base font-semibold leading-tight">{name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{homeCity}</p>
              </div>
            </div>

            <div className="mx-5 h-px bg-border/60" />

            {/* Stats — canonical project numbers */}
            <div className="grid grid-cols-3 px-2 py-4">
              {[
                { label: "Countries", value: profile?.total_countries_visited ?? 27, path: "/globe" },
                { label: "Cities", value: profile?.total_cities_visited ?? 64, path: "/globe" },
                { label: "Trips", value: profile?.total_trips ?? 1, path: "/trips" },
              ].map((s) => (
                <button
                  key={s.label}
                  onClick={() => go(s.path)}
                  className="flex flex-col items-center rounded-lg py-2 hover:bg-muted/30"
                >
                  <span className="font-display text-lg font-semibold">{s.value}</span>
                  <span className="text-[11px] text-muted-foreground">{s.label}</span>
                </button>
              ))}
            </div>

            <div className="mx-5 h-px bg-border/60" />

            {/* Nav links */}
            <nav className="flex flex-col px-2 py-3">
              {navItems.map(({ icon: Icon, label, path }) => (
                <button
                  key={label}
                  onClick={() => go(path)}
                  className="flex h-11 items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                >
                  <Icon size={18} strokeWidth={1.75} />
                  <span>{label}</span>
                </button>
              ))}
            </nav>

            <div className="mt-auto px-2 pb-6">
              <button
                onClick={handleSignOut}
                className="flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm text-[#EF4444] hover:bg-[#EF4444]/10"
              >
                <LogOut size={18} strokeWidth={1.75} />
                <span>Sign out</span>
              </button>
              <p className="mt-3 px-3 text-[11px] text-muted-foreground/70">
                Roavr v{APP_VERSION}
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
