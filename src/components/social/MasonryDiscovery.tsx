/**
 * Masonry grid of real, publicly shared travel media — the organic discovery
 * surface on Discover. CSS columns keep it light on mobile; tiles spring in
 * as they enter the viewport. Empty data means the section simply disappears.
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Images, MapPin } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { loadDiscoveryMedia, type DiscoveryTile } from "@/lib/social/discoveryMedia";

const GLASS = {
  background: "rgba(8,13,26,0.42)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.10)",
} as const;

/* Varied crops give the grid its organic rhythm. */
const RATIOS = ["4 / 5", "1 / 1", "3 / 4", "4 / 5", "1 / 1", "3 / 4"];

export default function MasonryDiscovery() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tiles, setTiles] = useState<DiscoveryTile[] | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    loadDiscoveryMedia(user.id)
      .then((t) => !cancelled && setTiles(t))
      .catch(() => !cancelled && setTiles([]));
    return () => { cancelled = true; };
  }, [user]);

  if (!tiles || tiles.length === 0) return null;

  return (
    <section className="px-5 pt-7">
      <div className="flex items-center gap-2">
        <Images className="h-[18px] w-[18px]" style={{ color: "#3B82F6" }} strokeWidth={1.5} />
        <h2 className="text-white" style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.3px" }}>
          Fresh from the community
        </h2>
      </div>
      <p className="mt-1" style={{ color: "#94A3B8", fontSize: 13 }}>Real moments travelers chose to share publicly.</p>

      <div className="mt-3 columns-2 gap-3">
        {tiles.map((t, i) => (
          <motion.button
            key={t.id}
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-30px" }}
            transition={{ type: "spring", stiffness: 250, damping: 24 }}
            onClick={() => navigate(`/u/${t.author.id}`)}
            className="relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-[20px] text-left"
            style={{ background: "#111827", border: "1px solid #1E2A3F", aspectRatio: RATIOS[i % RATIOS.length] }}
          >
            {t.mediaType === "video" ? (
              <video src={t.mediaUrl} muted playsInline className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <img src={t.mediaUrl} alt={t.locationName ?? `Shared by ${t.author.name}`} loading="lazy"
                className="absolute inset-0 h-full w-full object-cover" />
            )}
            <div className="absolute inset-x-2 bottom-2">
              <div className="rounded-xl px-2.5 py-1.5" style={GLASS}>
                <p className="text-white truncate" style={{ fontSize: 11, fontWeight: 600 }}>{t.author.name}</p>
                {t.locationName && (
                  <p className="flex items-center gap-0.5 truncate" style={{ color: "rgba(255,255,255,0.75)", fontSize: 10 }}>
                    <MapPin className="h-2.5 w-2.5 shrink-0" strokeWidth={1.5} />
                    <span className="truncate">{t.locationName}</span>
                  </p>
                )}
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </section>
  );
}
