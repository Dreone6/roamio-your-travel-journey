/**
 * The Home travel feed.
 *
 * Ranked by travel relevance, not recency alone — see `lib/social/ranking`.
 * When the viewer follows nobody the feed does not pretend to have content:
 * it hands them straight to discovery.
 */
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Compass, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import FeedCard from "@/components/social/FeedCard";
import SaveToTripSheet from "@/components/social/SaveToTripSheet";
import { useSaveToTrip, feedItemToSave } from "@/hooks/useSaveToTrip";
import { loadFeed, loadViewerContext, PAGE_SIZE } from "@/lib/social/feed";
import type { FeedItem } from "@/lib/social/types";
import type { ViewerContext } from "@/lib/social/ranking";

export default function TravelFeed() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [ctx, setCtx] = useState<ViewerContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [followsNobody, setFollowsNobody] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const context = await loadViewerContext(user.id);
      const res = await loadFeed(user.id, context);
      if (cancelled) return;
      setCtx(context);
      setItems(res.items);
      setHasMore(res.hasMore);
      setFollowsNobody(res.followsNobody);
    })()
      .catch(() => { if (!cancelled) setItems([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user]);

  const loadMore = useCallback(async () => {
    if (!user || !ctx || loadingMore || !items.length) return;
    setLoadingMore(true);
    try {
      const before = items[items.length - 1].createdAt;
      const res = await loadFeed(user.id, ctx, { before, limit: PAGE_SIZE });
      const seen = new Set(items.map((i) => i.id));
      setItems((prev) => [...prev, ...res.items.filter((i) => !seen.has(i.id))]);
      setHasMore(res.hasMore && res.items.length > 0);
    } finally {
      setLoadingMore(false);
    }
  }, [user, ctx, items, loadingMore]);

  return (
    <section className="px-5 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-white" style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.3px" }}>
          From your travelers
        </h2>
        <button onClick={() => navigate("/discover")} style={{ color: "#3B82F6", fontSize: 13, fontWeight: 600 }}>
          Discover
        </button>
      </div>

      {loading ? (
        <div className="mt-3 space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-[20px] animate-pulse" style={{ height: 180, background: "#111827" }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <button
          onClick={() => navigate("/discover")}
          className="mt-3 w-full text-left p-5 active:scale-[0.99] transition-transform"
          style={{ borderRadius: 20, background: "#111827", border: "1px solid #1E2A3F" }}
        >
          <div className="flex items-center gap-2">
            {followsNobody ? (
              <Users className="h-5 w-5" style={{ color: "#3B82F6" }} strokeWidth={1.5} />
            ) : (
              <Compass className="h-5 w-5" style={{ color: "#3B82F6" }} strokeWidth={1.5} />
            )}
            <p className="text-white" style={{ fontSize: 16, fontWeight: 600 }}>
              {followsNobody ? "Your feed starts with people" : "Nothing new yet"}
            </p>
          </div>
          <p className="mt-2" style={{ color: "#94A3B8", fontSize: 13, lineHeight: 1.45 }}>
            {followsNobody
              ? "Follow travelers who've been where you've been — their memories, stories and milestones land here."
              : "The travelers you follow haven't shared anything recently. Find more people who know your places."}
          </p>
          <span className="inline-block mt-3" style={{ color: "#3B82F6", fontSize: 13, fontWeight: 600 }}>
            Find travelers →
          </span>
        </button>
      ) : (
        <>
          <div className="mt-3 space-y-3">
            {items.map((item) => <FeedCard key={item.id} item={item} />)}
          </div>
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="mt-3 w-full text-white disabled:opacity-60"
              style={{ height: 44, borderRadius: 12, background: "#1A2236", border: "1px solid #1E2A3F", fontSize: 13, fontWeight: 600 }}
            >
              {loadingMore ? "Loading…" : "Show more"}
            </button>
          )}
        </>
      )}
    </section>
  );
}
