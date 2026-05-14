import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Lock, Users, Globe as GlobeIcon, Camera, ShieldCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { MOCK_MEMORIES } from "@/data";

type Vis = "private" | "followers" | "public";

interface DetectedLocation {
  id: string;
  city: string;
  country: string;
  dateRange: string;
  photos: string[];
  count: number;
}

// Mock: cluster from canonical memory data
const DETECTED: DetectedLocation[] = [
  { id: "loc-1", city: "Positano", country: "Italy", dateRange: "Jun 2025", photos: pickThumbs(0, 3), count: 14 },
  { id: "loc-2", city: "Tokyo",    country: "Japan", dateRange: "Mar 2025", photos: pickThumbs(3, 3), count: 27 },
  { id: "loc-3", city: "Lisbon",   country: "Portugal", dateRange: "Jan 2025", photos: pickThumbs(6, 3), count: 12 },
  { id: "loc-4", city: "Marrakech",country: "Morocco", dateRange: "Nov 2024", photos: pickThumbs(9, 3), count: 18 },
  { id: "loc-5", city: "Reykjavik",country: "Iceland", dateRange: "Sep 2024", photos: pickThumbs(12, 3), count: 9 },
  { id: "loc-6", city: "Mexico City", country: "Mexico", dateRange: "Jul 2024", photos: pickThumbs(15, 3), count: 22 },
];

function pickThumbs(start: number, n: number): string[] {
  const all = MOCK_MEMORIES.filter(m => m.mediaUrl).map(m => m.mediaUrl!);
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(all[(start + i) % all.length]);
  return out;
}

export default function TravelHistoryPage() {
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(DETECTED.map(d => [d.id, true]))
  );
  const [vis, setVis] = useState<Record<string, Vis>>(
    Object.fromEntries(DETECTED.map(d => [d.id, "private"]))
  );

  const selected = DETECTED.filter(d => enabled[d.id]);
  const totalPhotos = useMemo(
    () => selected.reduce((s, d) => s + d.count, 0),
    [selected]
  );

  const handleAdd = () => {
    if (selected.length === 0) {
      toast.info("Toggle at least one location to add");
      return;
    }
    toast.success(`Added ${selected.length} locations to your globe`, {
      description: "Pinned from your photo library — GPS read on device only.",
    });
    navigate("/globe");
  };

  return (
    <div className="min-h-screen pb-32" style={{ background: "#080D1A" }}>
      {/* Header */}
      <div className="px-5 pt-12 pb-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="h-10 w-10 rounded-full flex items-center justify-center"
          style={{ background: "#111827", border: "1px solid #1E2A3F" }}
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5 text-white" strokeWidth={1.5} />
        </button>
      </div>

      <div className="px-5 pb-4">
        <h1 className="font-heading text-[32px] font-bold text-white tracking-tight leading-[1.05]">
          We found your travels
        </h1>
        <p className="text-[14px] text-[#94A3B8] mt-2 leading-snug">
          Review locations from your photos. Choose what goes on your globe.
        </p>
        <div
          className="mt-4 flex items-center gap-2 rounded-xl px-3 py-2.5"
          style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}
        >
          <ShieldCheck className="h-4 w-4 shrink-0" style={{ color: "#3B82F6", strokeWidth: 1.5 }} />
          <p className="text-[12px] text-white/80 leading-snug">
            GPS coordinates are read on your device only. Never sent to Roavr servers.
          </p>
        </div>
      </div>

      {/* Location list */}
      <div className="px-5 space-y-3">
        {DETECTED.map(loc => (
          <div
            key={loc.id}
            className="rounded-2xl p-4"
            style={{ background: "#111827", boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}
          >
            <div className="flex items-center gap-3">
              {/* Thumbnail strip */}
              <div className="flex -space-x-2 shrink-0">
                {loc.photos.map((src, i) => (
                  <div
                    key={i}
                    className="h-10 w-10 rounded-lg bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${src})`,
                      border: "2px solid #111827",
                      zIndex: 3 - i,
                    }}
                  />
                ))}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-white leading-tight truncate">
                  {loc.city}, {loc.country}
                </p>
                <p className="text-[12px] text-[#94A3B8] mt-0.5">
                  {loc.dateRange} · {loc.count} photos
                </p>
              </div>

              <Switch
                checked={enabled[loc.id]}
                onCheckedChange={(v) => setEnabled(s => ({ ...s, [loc.id]: v }))}
              />
            </div>

            {enabled[loc.id] && (
              <div className="mt-3 flex p-1 rounded-full" style={{ background: "#1A2236" }}>
                {([
                  { id: "private",   label: "Private",   Icon: Lock },
                  { id: "followers", label: "Followers", Icon: Users },
                  { id: "public",    label: "Public",    Icon: GlobeIcon },
                ] as const).map(({ id, label, Icon }) => {
                  const active = vis[loc.id] === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setVis(s => ({ ...s, [loc.id]: id }))}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-full transition-all"
                      style={{
                        background: active ? "#3B82F6" : "transparent",
                        color: active ? "#FFFFFF" : "#94A3B8",
                        padding: "7px 0",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Sticky bottom action */}
      <div
        className="fixed bottom-0 inset-x-0 px-5 py-4"
        style={{
          background: "linear-gradient(to top, #080D1A 70%, rgba(8,13,26,0))",
        }}
      >
        <button
          onClick={handleAdd}
          className="w-full text-white inline-flex items-center justify-center gap-2"
          style={{
            background: "#3B82F6",
            borderRadius: 9999,
            height: 52,
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          <Camera className="h-4 w-4" strokeWidth={1.5} />
          Add {selected.length} {selected.length === 1 ? "location" : "locations"} ({totalPhotos} photos)
        </button>
      </div>
    </div>
  );
}
