import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { Home, Map, Globe, User, Camera } from "lucide-react";

const LEFT_ITEMS = [
  { to: "/home", icon: Home, label: "Home" },
  { to: "/trips", icon: Map, label: "Trips" },
];

const RIGHT_ITEMS = [
  { to: "/globe", icon: Globe, label: "Globe" },
  { to: "/profile", icon: User, label: "Profile" },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const cameraActive = location.pathname.startsWith("/camera");

  const renderItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => (
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
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/98 backdrop-blur-2xl border-t border-border/40 safe-area-bottom">
      <div className="flex items-end justify-around px-1 h-16 relative">
        {LEFT_ITEMS.map(renderItem)}

        {/* Central Camera button (TikTok-style) */}
        <button
          onClick={() => navigate("/camera")}
          aria-label="Camera"
          className={`flex flex-col items-center -mt-5 ${cameraActive ? "scale-105" : ""} transition-transform`}
        >
          <div className="h-12 w-14 rounded-2xl gradient-glow flex items-center justify-center glow-accent shadow-elevated">
            <Camera className="h-6 w-6 text-white" strokeWidth={2.4} />
          </div>
          <span className={`text-[10px] font-semibold tracking-wide mt-0.5 ${cameraActive ? "text-accent" : "text-muted-foreground"}`}>
            Camera
          </span>
        </button>

        {RIGHT_ITEMS.map(renderItem)}
      </div>
    </nav>
  );
}
