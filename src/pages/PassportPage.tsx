/**
 * Travel Passport — a traveller's collection of countries, cities and visits.
 *
 * Every number is derived from `places_visited` through the canonical world
 * layer. Viewing someone else's passport runs the same query, so RLS decides
 * what is visible; nothing is filtered client-side.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronRight, Globe as GlobeIcon, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useTravelerWorld } from "@/hooks/useTravelerWorld";
import { formatVisitDate, type CityPlace, type CountryEntry } from "@/lib/world/visits";

export default function PassportPage() {
  const { userId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const targetId = userId ?? user?.id ?? null;
  const isOwner = !!targetId && targetId === user?.id;
  const { world, loading } = useTravelerWorld(targetId);

  const [name, setName] = useState<string>("");
  const [openCountry, setOpenCountry] = useState<string | null>(null);
  const [openCity, setOpenCity] = useState<CityPlace | null>(null);

  useEffect(() => {
    if (!targetId) return;
    supabase.from("profiles").select("name, username").eq("id", targetId).maybeSingle()
      .then(({ data }) => setName(data?.name || data?.username || "Traveler"));
  }, [targetId]);

  const s = world.summary;

  const stats = useMemo(() => {
    const out: { label: string; value: string }[] = [
      { label: "Countries", value: String(s.countries) },
      { label: "Cities", value: String(s.cities) },
      { label: "Visits", value: String(s.visits) },
    ];
    if (s.memories > 0) out.push({ label: "Memories", value: String(s.memories) });
    if (s.yearsTraveling && s.yearsTraveling > 1) {
      out.push({ label: "Years traveling", value: String(s.yearsTraveling) });
    }
    return out;
  }, [s]);

  return (
    <div className="min-h-screen pb-24" style={{ background: "#080D1A" }}>
      <div className="px-5 pt-12 pb-2 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "#111827", border: "1px solid #1E2A3F" }}
          aria-label="Back"
        >
          <ArrowLeft className="h-[18px] w-[18px] text-white" strokeWidth={1.5} />
        </button>
        <div className="min-w-0">
          <h1 className="font-heading text-[28px] font-bold text-white leading-none tracking-tight">
            Travel Passport
          </h1>
          <p className="text-[13px] mt-1.5 truncate" style={{ color: "#94A3B8" }}>
            {isOwner ? "Everywhere you've been, collected" : name}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="px-5 pt-6 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: "#111827" }} />
          ))}
        </div>
      ) : world.isEmpty ? (
        <EmptyPassport owner={isOwner} name={name} onBuild={() => navigate("/build-world")} />
      ) : (
        <>
          {/* Overview — restrained, no cards-in-cards */}
          <div className="px-5 pt-6">
            <div className="grid grid-cols-3 gap-y-6">
              {stats.map((st) => (
                <div key={st.label}>
                  <p className="font-heading text-[28px] font-bold text-white leading-none tracking-tight">{st.value}</p>
                  <p className="text-[11px] uppercase mt-2" style={{ color: "#94A3B8", letterSpacing: "0.08em" }}>
                    {st.label}
                  </p>
                </div>
              ))}
            </div>

            {(s.mostVisitedCountry || s.mostVisitedCity || s.firstYear) && (
              <div className="mt-6 space-y-1.5">
                {s.mostVisitedCountry && (
                  <Line label="Most visited country"
                    value={`${s.mostVisitedCountry.country} · ${s.mostVisitedCountry.visits} visits`} />
                )}
                {s.mostVisitedCity && (
                  <Line label="Most visited city"
                    value={`${s.mostVisitedCity.city} · ${s.mostVisitedCity.visits} visits`} />
                )}
                {s.firstYear && s.lastYear && s.firstYear !== s.lastYear && (
                  <Line label="Traveling since" value={String(s.firstYear)} />
                )}
              </div>
            )}
          </div>

          {/* Country collection */}
          <div className="mt-8">
            <h2 className="px-5 font-heading text-[20px] font-semibold text-white tracking-tight">
              Country collection
            </h2>
            <div className="mt-3">
              {world.countries.map((c) => (
                <CountryRow
                  key={c.country}
                  entry={c}
                  expanded={openCountry === c.country}
                  onToggle={() => setOpenCountry(openCountry === c.country ? null : c.country)}
                  onCity={(city) => setOpenCity(openCity?.key === city.key ? null : city)}
                  openCityKey={openCity?.key ?? null}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-[13px]" style={{ color: "#94A3B8" }}>{label}</span>
      <span className="text-[13px] text-white font-medium">{value}</span>
    </div>
  );
}

function CountryRow({
  entry, expanded, onToggle, onCity, openCityKey,
}: {
  entry: CountryEntry;
  expanded: boolean;
  onToggle: () => void;
  onCity: (c: CityPlace) => void;
  openCityKey: string | null;
}) {
  return (
    <div style={{ borderTop: "1px solid #1E2A3F" }}>
      <button onClick={onToggle} className="w-full px-5 py-4 flex items-center gap-3 text-left">
        <span className="text-[26px] leading-none w-8 shrink-0">{entry.flag ?? "🏳️"}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[16px] font-semibold text-white truncate">{entry.country}</p>
          <p className="text-[12px] mt-0.5" style={{ color: "#94A3B8" }}>
            {entry.cityCount} {entry.cityCount === 1 ? "city" : "cities"} · {entry.visitCount}{" "}
            {entry.visitCount === 1 ? "visit" : "visits"}
          </p>
        </div>
        <ChevronRight
          className="h-4 w-4 shrink-0 transition-transform"
          style={{ color: "#4B5563", transform: expanded ? "rotate(90deg)" : "none" }}
          strokeWidth={1.5}
        />
      </button>

      {expanded && (
        <div className="pb-2">
          {entry.cities.map((city) => (
            <div key={city.key} className="pl-16 pr-5">
              <button onClick={() => onCity(city)} className="w-full py-2.5 flex items-center justify-between text-left">
                <span className="text-[14px] text-white">{city.city}</span>
                <span className="text-[12px]" style={{ color: "#94A3B8" }}>
                  {city.visitCount} {city.visitCount === 1 ? "visit" : "visits"}
                </span>
              </button>
              {openCityKey === city.key && (
                <div className="pb-3 space-y-1">
                  {city.visits.map((v) => (
                    <div key={v.id} className="flex items-center justify-between">
                      <span className="text-[13px]" style={{ color: "#94A3B8" }}>
                        {formatVisitDate(v.startDate, v.endDate)}
                      </span>
                      {v.memories > 0 && (
                        <span className="text-[12px]" style={{ color: "#4B5563" }}>{v.memories}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyPassport({ owner, name, onBuild }: { owner: boolean; name: string; onBuild: () => void }) {
  return (
    <div className="px-8 pt-24 text-center">
      <GlobeIcon className="h-10 w-10 mx-auto" style={{ color: "#1E2A3F" }} strokeWidth={1.2} />
      <p className="font-heading text-[20px] font-bold text-white mt-4">
        {owner ? "Your passport is unstamped" : `${name || "This traveler"}'s world is private`}
      </p>
      <p className="text-[14px] mt-2" style={{ color: "#94A3B8" }}>
        {owner
          ? "Import your photo library and Roavr will reconstruct the places you've already been."
          : "They haven't shared any places with you."}
      </p>
      {owner && (
        <button
          onClick={onBuild}
          className="mt-6 inline-flex items-center gap-2 px-6 rounded-full text-white font-semibold text-[14px]"
          style={{ background: "#3B82F6", height: 52 }}
        >
          <Sparkles className="h-4 w-4" strokeWidth={1.6} /> Build My World
        </button>
      )}
    </div>
  );
}
