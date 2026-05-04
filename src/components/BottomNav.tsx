import { NavLink } from "react-router-dom";
import { Home, Map, Globe, MapPin, User } from "lucide-react";

const NAV_ITEMS = [
  { to: "/home", icon: Home, label: "Home" },
  { to: "/plan", icon: Map, label: "Plan" },
  { to: "/globe", icon: Globe, label: "Globe" },
  { to: "/checkin", icon: MapPin, label: "Check In" },
  { to: "/profile", icon: User, label: "Profile" },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/home"}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive ? "text-accent" : "text-muted-foreground"
              }`
            }
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
