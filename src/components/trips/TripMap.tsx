import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { type Map as MlMap, type Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface Item {
  id: string;
  activity: string;
  time?: string | null;
  time_block?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface Props {
  days: [number, Item[]][];
  startDate?: string | null;
}

const ACCENT = "#3B82F6";
const BG = "#080D1A";

export default function TripMap({ days }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [activeDay, setActiveDay] = useState<number>(days[0]?.[0] ?? 1);

  const items = useMemo(() => {
    const day = days.find(([n]) => n === activeDay);
    return (day?.[1] ?? []).filter(
      (i) => typeof i.latitude === "number" && typeof i.longitude === "number"
    );
  }, [days, activeDay]);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const m = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/positron",
      center: [0, 20],
      zoom: 2,
      attributionControl: { compact: true },
    });
    mapRef.current = m;
    return () => {
      m.remove();
      mapRef.current = null;
    };
  }, []);

  // Render markers + line for active day
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;

    // Wait for style to load
    const apply = () => {
      // Clear old markers
      markersRef.current.forEach((mk) => mk.remove());
      markersRef.current = [];
      if (m.getLayer("route-line")) m.removeLayer("route-line");
      if (m.getSource("route")) m.removeSource("route");

      if (items.length === 0) return;

      const coords: [number, number][] = items.map((i) => [i.longitude!, i.latitude!]);

      items.forEach((i, idx) => {
        const el = document.createElement("div");
        el.style.cssText = `width:28px;height:28px;border-radius:9999px;background:${ACCENT};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4);`;
        el.textContent = String(idx + 1);
        const popup = new maplibregl.Popup({ offset: 18 }).setHTML(
          `<div style="font-family:'DM Sans',sans-serif"><b>${i.activity}</b><br/><span style="color:#666;font-size:12px">${i.time_block ?? i.time ?? ""}</span></div>`
        );
        const mk = new maplibregl.Marker({ element: el })
          .setLngLat([i.longitude!, i.latitude!])
          .setPopup(popup)
          .addTo(m);
        markersRef.current.push(mk);
      });

      // Polyline
      m.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: { type: "LineString", coordinates: coords },
          properties: {},
        },
      });
      m.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        paint: {
          "line-color": ACCENT,
          "line-width": 2.5,
          "line-dasharray": [1.5, 1.5],
        },
      });

      // Fit
      const bounds = coords.reduce(
        (b, c) => b.extend(c),
        new maplibregl.LngLatBounds(coords[0], coords[0])
      );
      m.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 500 });
    };

    if (m.isStyleLoaded()) apply();
    else m.once("load", apply);
  }, [items]);

  return (
    <div>
      {/* Day pills */}
      <div className="mb-3 flex gap-1.5 overflow-x-auto no-scrollbar">
        {days.map(([n]) => (
          <button
            key={n}
            onClick={() => setActiveDay(n)}
            className="shrink-0 rounded-full px-3 py-1 text-[12px] font-medium transition-colors"
            style={{
              background: activeDay === n ? ACCENT : "#111827",
              color: activeDay === n ? "#fff" : "rgba(255,255,255,0.6)",
              border: "1px solid #1E2A3F",
            }}
          >
            Day {n}
          </button>
        ))}
      </div>

      <div
        ref={containerRef}
        className="h-[420px] w-full overflow-hidden rounded-2xl"
        style={{ background: BG, border: "1px solid #1E2A3F" }}
      />

      {items.length === 0 && (
        <p className="mt-2 text-center text-[12px] text-white/50">
          No mapped locations for this day.
        </p>
      )}
    </div>
  );
}
