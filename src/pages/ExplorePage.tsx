/**
 * Explore — travel-first search.
 *
 * People, places and live stories. Selecting a place opens the answer only
 * Roavr can give: the travellers who have genuinely been there, ranked by how
 * well they know it.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Search, MapPin, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import PeopleWhoKnowPlace from "@/components/social/PeopleWhoKnowPlace";
import { searchAll, EMPTY_SEARCH, type SearchResults } from "@/lib/social/search";

export default function ExplorePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [results, setResults] = useState<SearchResults>(EMPTY_SEARCH);
  const [loading, setLoading] = useState(false);

  const place = params.get("place");
  const country = params.get("country");

  useEffect(() => {
    if (!user) return;
    const q = query.trim();
    if (q.length < 2) { setResults(EMPTY_SEARCH); return; }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(() => {
      searchAll(user.id, q)
        .then((r) => !cancelled && setResults(r))
        .catch(() => !cancelled && setResults(EMPTY_SEARCH))
        .finally(() => !cancelled && setLoading(false));
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [user, query]);

  const empty = useMemo(
    () => !results.people.length && !results.places.length && !results.stories.length,
    [results]
  );

  const openPlace = (city: string, ctry?: string | null) => {
    const next = new URLSearchParams();
    next.set("place", city);
    if (ctry) next.set("country", ctry);
    setParams(next);
  };

  return (
    <div className="min-h-screen pb-10" style={{ background: "#080D1A" }}>
      <header className="px-5 pt-12 pb-3 flex items-center gap-3">
        <button onClick={() => (place ? setParams({}) : navigate(-1))} aria-label="Back"
          className="h-9 w-9 rounded-full flex items-center justify-center" style={{ background: "#111827" }}>
          <ArrowLeft className="h-[18px] w-[18px] text-white" strokeWidth={1.5} />
        </button>
        <h1 className="text-white" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.4px" }}>
          {place ? place : "Explore"}
        </h1>
      </header>

      {place ? (
        <div className="px-5 pt-2">
          <p className="flex items-center gap-1.5" style={{ color: "#94A3B8", fontSize: 13 }}>
            <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} /> {country ?? "Destination"}
          </p>
          <div className="mt-5">
            <PeopleWhoKnowPlace city={place} country={country} />
          </div>
        </div>
      ) : (
        <>
          <div className="px-5">
            <div className="flex items-center gap-2.5 rounded-2xl px-3.5"
              style={{ background: "#111827", border: "1px solid #1E2A3F", height: 48 }}>
              <Search className="h-[18px] w-[18px] shrink-0" style={{ color: "#94A3B8" }} strokeWidth={1.5} />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Try Lisbon, Colombia, or a traveler's name"
                className="flex-1 bg-transparent outline-none text-white"
                style={{ fontSize: 14 }}
              />
              {query && (
                <button onClick={() => setQuery("")} aria-label="Clear">
                  <X className="h-4 w-4" style={{ color: "#94A3B8" }} strokeWidth={1.5} />
                </button>
              )}
            </div>
          </div>

          {query.trim().length < 2 ? (
            <p className="px-5 pt-6" style={{ color: "#94A3B8", fontSize: 13, lineHeight: 1.5 }}>
              Search a destination to find the travelers who actually know it, or search a name to find someone.
            </p>
          ) : loading ? (
            <div className="px-5 pt-6 space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-2xl animate-pulse" style={{ height: 64, background: "#111827" }} />
              ))}
            </div>
          ) : empty ? (
            <p className="px-5 pt-6" style={{ color: "#94A3B8", fontSize: 13 }}>
              No people, places or live stories match “{query.trim()}”.
            </p>
          ) : (
            <>
              {results.places.length > 0 && (
                <section className="px-5 pt-6">
                  <h2 className="text-white" style={{ fontSize: 16, fontWeight: 600 }}>Places</h2>
                  <div className="mt-2.5 space-y-2">
                    {results.places.map((p) => (
                      <button
                        key={`${p.city}-${p.country}`}
                        onClick={() => openPlace(p.city, p.country)}
                        className="w-full flex items-center gap-3 rounded-2xl p-3.5 text-left"
                        style={{ background: "#111827", border: "1px solid #1E2A3F" }}
                      >
                        <span style={{ fontSize: 22 }}>{p.flag ?? "📍"}</span>
                        <div className="min-w-0">
                          <p className="text-white truncate" style={{ fontSize: 14, fontWeight: 600 }}>
                            {p.city}{p.country ? `, ${p.country}` : ""}
                          </p>
                          <p style={{ color: "#94A3B8", fontSize: 12 }}>
                            {p.travelers} {p.travelers === 1 ? "traveler" : "travelers"} · {p.visits}{" "}
                            {p.visits === 1 ? "visit" : "visits"}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {results.people.length > 0 && (
                <section className="px-5 pt-6">
                  <h2 className="text-white" style={{ fontSize: 16, fontWeight: 600 }}>People</h2>
                  <div className="mt-2.5 space-y-2">
                    {results.people.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => navigate(`/u/${p.id}`)}
                        className="w-full flex items-center gap-3 rounded-2xl p-3 text-left"
                        style={{ background: "#111827", border: "1px solid #1E2A3F" }}
                      >
                        {p.avatar ? (
                          <img src={p.avatar} alt={p.name} loading="lazy" className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          <div className="h-10 w-10 rounded-full flex items-center justify-center text-white"
                            style={{ background: "#1A2236", fontSize: 15, fontWeight: 600 }}>
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-white truncate" style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</p>
                          <p className="truncate" style={{ color: "#94A3B8", fontSize: 12 }}>
                            {p.username ? `@${p.username}` : ""}{p.username && p.homeCity ? " · " : ""}{p.homeCity ?? ""}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {results.stories.length > 0 && (
                <section className="px-5 pt-6">
                  <h2 className="text-white" style={{ fontSize: 16, fontWeight: 600 }}>Live stories</h2>
                  <div className="mt-2.5 flex gap-3 overflow-x-auto no-scrollbar">
                    {results.stories.map((s) => (
                      <button key={s.id} onClick={() => navigate("/stories")} className="shrink-0 text-left">
                        <div className="overflow-hidden rounded-2xl" style={{ width: 108, height: 150, background: "#111827" }}>
                          {s.mediaType === "video" ? (
                            <video src={s.mediaUrl} muted playsInline className="h-full w-full object-cover" />
                          ) : (
                            <img src={s.mediaUrl} alt={s.locationName ?? "Story"} loading="lazy" className="h-full w-full object-cover" />
                          )}
                        </div>
                        <p className="mt-1.5 truncate text-white" style={{ width: 108, fontSize: 12, fontWeight: 600 }}>
                          {s.authorName}
                        </p>
                        {s.locationName && (
                          <p className="truncate" style={{ width: 108, color: "#94A3B8", fontSize: 11 }}>{s.locationName}</p>
                        )}
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
