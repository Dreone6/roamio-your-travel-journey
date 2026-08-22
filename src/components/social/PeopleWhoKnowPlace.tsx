/**
 * "People who know Medellín" — the discovery unit that only Roavr can build,
 * because only Roavr knows who has genuinely been somewhere more than once.
 *
 * Visit counts come from RLS-authorised rows only, so a private traveller is
 * never counted, named or hinted at.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useStartConversation } from "@/hooks/useStartConversation";
import { peopleWhoKnowPlace } from "@/lib/social/discovery";
import type { PlaceExpert } from "@/lib/social/types";

interface Props {
  city: string;
  country?: string | null;
  /** Optional heading override. */
  title?: string;
}

export default function PeopleWhoKnowPlace({ city, country, title }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { open, busy } = useStartConversation();
  const [people, setPeople] = useState<PlaceExpert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !city) return;
    let cancelled = false;
    setLoading(true);
    peopleWhoKnowPlace(user.id, city, country)
      .then((p) => !cancelled && setPeople(p))
      .catch(() => !cancelled && setPeople([]))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [user, city, country]);

  if (loading) {
    return <div className="h-20 rounded-2xl animate-pulse" style={{ background: "#111827" }} />;
  }
  if (!people.length) {
    return (
      <p style={{ color: "#94A3B8", fontSize: 13 }}>
        No one in your Roavr network has shared a visit to {city} yet.
      </p>
    );
  }

  return (
    <section>
      <h2 className="text-white" style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.3px" }}>
        {title ?? `People who know ${city}`}
      </h2>
      <div className="mt-3 space-y-2">
        {people.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-2xl p-3"
            style={{ background: "#111827", border: "1px solid #1E2A3F" }}>
            <button onClick={() => navigate(`/u/${p.id}`)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
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
                <p style={{ color: "#94A3B8", fontSize: 12 }}>
                  {p.visits === 1 ? "Been once" : `Been ${p.visits} times`}
                  {p.lastYear ? ` · last in ${p.lastYear}` : ""}
                </p>
              </div>
            </button>
            <button
              onClick={() => open(p.id, `I'm heading to ${city} — any advice?`)}
              disabled={busy}
              aria-label={`Message ${p.name}`}
              className="h-9 w-9 rounded-full flex items-center justify-center shrink-0 disabled:opacity-60"
              style={{ background: "#1A2236", border: "1px solid #1E2A3F" }}
            >
              <MessageCircle className="h-4 w-4" style={{ color: "#3B82F6" }} strokeWidth={1.5} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
