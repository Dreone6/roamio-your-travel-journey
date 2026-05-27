import { useState } from "react";
import { Menu, ChevronLeft, Bell, Plane } from "lucide-react";
import { useLocation, useNavigate, matchPath } from "react-router-dom";
import { useAppStore } from "@/stores/useAppStore";
import FlightAlertsModal from "@/components/flight/FlightAlertsModal";

const TOP_LEVEL = ["/home", "/trips", "/globe", "/checkin", "/profile", "/discover"];

const TITLES: Record<string, string> = {
  "/home": "Home",
  "/trips": "Trips",
  "/discover": "Discover",
  "/globe": "World",
  "/checkin": "Check In",
  "/profile": "You",
};

interface Props {
  onMenuClick: () => void;
}

export default function ShellTopBar({ onMenuClick }: Props) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const count = useAppStore((s) => s.notifications.count);
  const [flightOpen, setFlightOpen] = useState(false);

  const isTopLevel = TOP_LEVEL.some((p) => matchPath(p, pathname));
  const title =
    TITLES[pathname] ??
    Object.entries(TITLES).find(([p]) => pathname.startsWith(p))?.[1] ??
    "Roavr";

  return (
    <header
      className="sticky top-0 z-40 h-14 w-full border-b border-border/60 bg-background/85 backdrop-blur-md"
      style={{ borderBottomWidth: "0.5px" }}
    >
      <div className="flex h-full items-center justify-between px-4">
        <button
          onClick={isTopLevel ? onMenuClick : () => navigate(-1)}
          className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full text-foreground/90 hover:bg-muted/40"
          aria-label={isTopLevel ? "Open menu" : "Go back"}
        >
          {isTopLevel ? <Menu size={22} strokeWidth={1.75} /> : <ChevronLeft size={24} strokeWidth={1.75} />}
        </button>

        <h1 className="font-display text-[17px] font-semibold tracking-tight text-foreground">
          {title}
        </h1>

        <div className="-mr-2 flex items-center">
          <button
            onClick={() => setFlightOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-foreground/90 hover:bg-muted/40"
            aria-label="Flight alerts"
          >
            <Plane size={22} strokeWidth={1.75} />
          </button>
          <button
            onClick={() => navigate("/notifications")}
            className="relative flex h-10 w-10 items-center justify-center rounded-full text-foreground/90 hover:bg-muted/40"
            aria-label="Notifications"
          >
            <Bell size={22} strokeWidth={1.75} />
            {count > 0 && (
              <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-[#EF4444] ring-2 ring-background" />
            )}
          </button>
        </div>
      </div>
      <FlightAlertsModal open={flightOpen} onClose={() => setFlightOpen(false)} />
    </header>
  );
}
