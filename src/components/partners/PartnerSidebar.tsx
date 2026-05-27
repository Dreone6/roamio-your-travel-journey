import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  BarChart3,
  Tag,
  Map,
  CalendarClock,
  Sparkles,
  TrendingUp,
  Bell,
  Settings,
  LifeBuoy,
} from "lucide-react";
import { PARTNER } from "./PartnerThemeWrapper";
import roavrPin from "@/assets/roavr-pin.png";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; badge?: number };
type Section = { title: string; items: NavItem[] };

const sections: Section[] = [
  {
    title: "Overview",
    items: [
      { to: "/partners/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/partners/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    title: "Campaigns",
    items: [
      { to: "/partners/offers", label: "My Offers", icon: Tag },
      { to: "/partners/coverage", label: "Coverage Map", icon: Map },
      { to: "/partners/schedule", label: "Schedule", icon: CalendarClock },
    ],
  },
  {
    title: "Growth",
    items: [
      { to: "/partners/advisor", label: "AI Advisor", icon: Sparkles, badge: 1 },
      { to: "/partners/benchmarks", label: "Benchmarks", icon: TrendingUp },
      { to: "/partners/reminders", label: "Reminders", icon: Bell },
    ],
  },
  {
    title: "Account",
    items: [
      { to: "/partners/settings", label: "Settings", icon: Settings },
      { to: "/partners/support", label: "Support", icon: LifeBuoy },
    ],
  },
];

export function PartnerSidebar({
  businessName,
  tier,
}: {
  businessName: string;
  tier: string;
}) {
  const navigate = useNavigate();
  return (
    <aside
      className="hidden md:flex h-screen sticky top-0 flex-col w-[220px] shrink-0"
      style={{ background: PARTNER.navy, color: "#FAF6F0" }}
    >
      <div className="p-5">
        <button
          onClick={() => navigate("/partners/dashboard")}
          className="flex items-center gap-2 mb-6"
        >
          <img src={roavrPin} alt="Roavr" className="h-7 w-7" />
          <div
            className="font-dm text-[10px] uppercase tracking-[0.14em]"
            style={{ color: "rgba(250,246,240,0.4)" }}
          >
            Partner Portal
          </div>
        </button>
        <div className="font-dm text-[14px] font-medium truncate">{businessName}</div>
        <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-dm font-medium" style={{ background: PARTNER.amber, color: "#FFF" }}>
          {tier.charAt(0).toUpperCase() + tier.slice(1)}
        </div>
      </div>

      <nav className="flex-1 px-3 overflow-y-auto">
        {sections.map((sec) => (
          <div key={sec.title} className="mb-5">
            <div
              className="px-3 mb-1.5 font-dm text-[10px] uppercase tracking-[0.14em]"
              style={{ color: "rgba(250,246,240,0.4)" }}
            >
              {sec.title}
            </div>
            <ul className="space-y-0.5">
              {sec.items.map((it) => (
                <li key={it.to}>
                  <NavLink
                    to={it.to}
                    end
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-lg font-dm text-[13px] transition-colors ${
                        isActive ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
                      }`
                    }
                  >
                    <it.icon className="h-4 w-4" strokeWidth={1.5} />
                    <span className="flex-1">{it.label}</span>
                    {it.badge ? (
                      <span
                        className="text-[10px] font-medium px-1.5 rounded-full"
                        style={{ background: PARTNER.amber, color: "#FFF" }}
                      >
                        {it.badge}
                      </span>
                    ) : null}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-white/5 flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ background: PARTNER.amber }}
          />
          <span
            className="relative inline-flex rounded-full h-2 w-2"
            style={{ background: PARTNER.amber }}
          />
        </span>
        <span
          className="font-dm text-[11px] leading-tight"
          style={{ color: "rgba(250,246,240,0.4)" }}
        >
          AI Advisor monitoring your performance
        </span>
      </div>
    </aside>
  );
}
