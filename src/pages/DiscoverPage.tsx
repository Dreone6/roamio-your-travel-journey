/**
 * Discover — travellers, not listings.
 *
 * Every person on this screen is surfaced because of a fact in the authorised
 * travel data: you have stood in the same city, they know where you're going
 * next, or people you follow follow them. Nothing here is ranked by popularity
 * and nothing is fabricated when the data is thin — empty sections simply
 * disappear.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Users, Plane, MapPin, Sparkles, Compass } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import TravelerRow from "@/components/social/TravelerRow";
import { loadDiscovery } from "@/lib/social/discovery";
import { EMPTY_DISCOVER, type DiscoverSections, type TravelerSummary } from "@/lib/social/types";

function Section({
  icon: Icon, title, subtitle, travelers,
}: { icon: any; title: string; subtitle: string; travelers: TravelerSummary[] }) {
  if (!travelers.length) return null;
  return (
    <section className="px-5 pt-7">
      <div className="flex items-center gap-2">
        <Icon className="h-[18px] w-[18px]" style={{ color: "#3B82F6" }} strokeWidth={1.5} />
        <h2 className="text-white" style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.3px" }}>{title}</h2>
      </div>
      <p className="mt-1" style={{ color: "#94A3B8", fontSize: 13 }}>{subtitle}</p>
      <div className="mt-3 space-y-2">
        {travelers.map((t) => <TravelerRow key={t.id} traveler={t} />)}
      </div>
    </section>
  );
}

export default function DiscoverPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sections, setSections] = useState<DiscoverSections>(EMPTY_DISCOVER);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    loadDiscovery(user.id)
      .then((s) => !cancelled && setSections(s))
      .catch(() => !cancelled && setSections(EMPTY_DISCOVER))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [user]);

  const total =
    sections.placesInCommon.length + sections.knowWhereYoureGoing.length +
    sections.mayKnow.length + sections.interesting.length;

  return (
    <div className="min-h-dvh pb-6" style={{ background: "#080D1A" }}>
      <header className="px-5 pt-12 pb-1">
        <h1 className="text-white" style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.5px" }}>Discover</h1>
        <p className="mt-1" style={{ color: "#94A3B8", fontSize: 14 }}>
          Travelers who've been where you've been — and where you're going.
        </p>
      </header>

      <div className="px-5 pt-4">
        <button
          onClick={() => navigate("/explore")}
          className="w-full flex items-center gap-2.5 rounded-2xl px-3.5 text-left"
          style={{ background: "#111827", border: "1px solid #1E2A3F", height: 48 }}
        >
          <Search className="h-[18px] w-[18px]" style={{ color: "#94A3B8" }} strokeWidth={1.5} />
          <span style={{ color: "#94A3B8", fontSize: 14 }}>Search people, places and stories</span>
        </button>
      </div>

      {loading ? (
        <div className="px-5 pt-6 space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl animate-pulse" style={{ height: 76, background: "#111827" }} />
          ))}
        </div>
      ) : total === 0 ? (
        <div className="px-5 pt-8">
          <div className="rounded-[20px] p-5" style={{ background: "#111827", border: "1px solid #1E2A3F" }}>
            <div className="flex items-center gap-2">
              <Compass className="h-5 w-5" style={{ color: "#3B82F6" }} strokeWidth={1.5} />
              <p className="text-white" style={{ fontSize: 16, fontWeight: 600 }}>Nobody to show yet</p>
            </div>
            <p className="mt-2" style={{ color: "#94A3B8", fontSize: 13, lineHeight: 1.45 }}>
              Discovery is built from real travel history. Add the places you've been and Roavr can match you with
              travelers who know them.
            </p>
            <button
              onClick={() => navigate("/build-world")}
              className="mt-3 text-white"
              style={{ background: "#3B82F6", borderRadius: 12, height: 42, padding: "0 16px", fontSize: 13, fontWeight: 600 }}
            >
              Build my world
            </button>
          </div>
        </div>
      ) : (
        <>
          <Section
            icon={MapPin}
            title="Places in common"
            subtitle="You've walked the same streets."
            travelers={sections.placesInCommon}
          />
          <Section
            icon={Plane}
            title="They know where you're going"
            subtitle="Real repeat visitors to your next destination."
            travelers={sections.knowWhereYoureGoing}
          />
          <Section
            icon={Users}
            title="Travelers you may know"
            subtitle="Followed by people you already follow."
            travelers={sections.mayKnow}
          />
          <Section
            icon={Sparkles}
            title="Interesting travelers"
            subtitle="Deep, verified travel worth following."
            travelers={sections.interesting}
          />
        </>
      )}
    </div>
  );
}
