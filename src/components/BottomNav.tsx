import { NavLink, useNavigate } from "react-router-dom";
import { Home, Map, Compass, Globe, User, MapPin } from "lucide-react";

const NAV_ITEMS = [
  { to: "/home", icon: Home, label: "Home" },
  { to: "/trips", icon: Map, label: "Trips" },
  { to: "/discover", icon: Compass, label: "Discover" },
  { to: "/globe", icon: Globe, label: "Globe" },
  { to: "/profile", icon: User, label: "Profile" },
];

export default function BottomNav() {
  const navigate = useNavigate();

  return (
    <>
      {/* Floating Check-In FAB */}
      <button
        onClick={() => navigate("/checkin")}
        className="fixed bottom-[5.5rem] right-4 z-50 h-13 w-13 rounded-full gradient-accent flex items-center justify-center glow-coral active:scale-90 transition-transform duration-150"
        aria-label="Check In"
        style={{ height: 52, width: 52 }}
      >
        <MapPin className="h-5 w-5 text-white" strokeWidth={2.5} />
      </button>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/98 backdrop-blur-2xl border-t border-border/40 safe-area-bottom">
        <div className="flex items-center justify-around px-1 h-16">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/home"}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 min-w-[3.5rem] py-1.5 text-[10px] font-semibold tracking-wide transition-colors duration-150 ${
                  isActive ? "text-accent" : "text-muted-foreground"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1.5 rounded-xl transition-colors duration-150 ${isActive ? "bg-accent/10" : ""}`}>
                    <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.5 : 1.8} />
                  </div>
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
