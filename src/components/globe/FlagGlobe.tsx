import { useEffect, useMemo, useRef, useState } from "react";
import Globe, { GlobeMethods } from "react-globe.gl";
import * as THREE from "three";

export interface FlagGlobePin {
  lat: number;
  lng: number;
  label: string;
  category: string;
  thumbnail?: string | null;
  description?: string | null;
  recent?: boolean;
}

export interface FlagGlobeArc {
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
}

interface CountryDef {
  name: string;
  code: string; // ISO 3166-1 alpha-2 lowercase
  lat: number;
  lng: number;
}

// 27 visited countries — centroid + ISO code for flagcdn
const VISITED: CountryDef[] = [
  { name: "Italy", code: "it", lat: 41.9, lng: 12.5 },
  { name: "France", code: "fr", lat: 46.6, lng: 2.2 },
  { name: "Spain", code: "es", lat: 40.4, lng: -3.7 },
  { name: "Portugal", code: "pt", lat: 39.4, lng: -8.2 },
  { name: "United Kingdom", code: "gb", lat: 54.0, lng: -2.0 },
  { name: "Ireland", code: "ie", lat: 53.1, lng: -7.7 },
  { name: "Iceland", code: "is", lat: 64.9, lng: -19.0 },
  { name: "Norway", code: "no", lat: 60.5, lng: 8.5 },
  { name: "Sweden", code: "se", lat: 60.1, lng: 18.6 },
  { name: "Germany", code: "de", lat: 51.2, lng: 10.5 },
  { name: "Netherlands", code: "nl", lat: 52.1, lng: 5.3 },
  { name: "Switzerland", code: "ch", lat: 46.8, lng: 8.2 },
  { name: "Greece", code: "gr", lat: 39.0, lng: 22.0 },
  { name: "Croatia", code: "hr", lat: 45.1, lng: 15.2 },
  { name: "Turkey", code: "tr", lat: 39.0, lng: 35.2 },
  { name: "Morocco", code: "ma", lat: 31.8, lng: -7.1 },
  { name: "Egypt", code: "eg", lat: 26.8, lng: 30.8 },
  { name: "South Africa", code: "za", lat: -30.6, lng: 22.9 },
  { name: "United States", code: "us", lat: 39.8, lng: -98.6 },
  { name: "Canada", code: "ca", lat: 56.1, lng: -106.3 },
  { name: "Mexico", code: "mx", lat: 23.6, lng: -102.5 },
  { name: "Brazil", code: "br", lat: -14.2, lng: -51.9 },
  { name: "Argentina", code: "ar", lat: -38.4, lng: -63.6 },
  { name: "Japan", code: "jp", lat: 36.2, lng: 138.3 },
  { name: "Thailand", code: "th", lat: 15.9, lng: 100.9 },
  { name: "Indonesia", code: "id", lat: -2.5, lng: 118.0 },
  { name: "Australia", code: "au", lat: -25.3, lng: 133.8 },
];

function nearestCountry(lat: number, lng: number): CountryDef {
  let best = VISITED[0];
  let bestD = Infinity;
  for (const c of VISITED) {
    const d = (c.lat - lat) ** 2 + (c.lng - lng) ** 2;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

type FlagDatum = CountryDef & { count: number; recent: boolean; milestone: boolean };

interface Props {
  pins: FlagGlobePin[];
  arcs?: FlagGlobeArc[];
  onPinClick?: (pin: FlagGlobePin) => void;
  /** ISO-2 country codes that represent a milestone (5th, 10th, 25th country) — get amber halo */
  milestoneCodes?: string[];
  /** Filter pins/countries to those visited on or before this year */
  yearFilter?: number;
  /** Tab mode — 'mine' shows your visited, 'explore' colors by global density */
  mode?: "mine" | "explore";
}

export default function FlagGlobe({ pins, arcs, onPinClick, milestoneCodes, yearFilter, mode = "mine" }: Props) {

  const milestoneSet = useMemo(
    () => new Set((milestoneCodes ?? ["it", "jp", "za"]).map(c => c.toLowerCase())),
    [milestoneCodes]
  );

  const globeRef = useRef<GlobeMethods>();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const lastInteractionRef = useRef(0);

  // size observe
  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver(() => {
      const r = wrapRef.current!.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  // initialize controls
  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    const controls: any = g.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.35;
    controls.enableZoom = true;
    controls.enablePan = false;
    controls.minDistance = 200;
    controls.maxDistance = 500;
    g.pointOfView({ lat: 25, lng: 0, altitude: 2.2 }, 0);

    // pause auto-rotate on interaction, resume after 3s
    const dom = g.renderer().domElement;
    const onDown = () => {
      lastInteractionRef.current = performance.now();
      controls.autoRotate = false;
    };
    const onUp = () => {
      lastInteractionRef.current = performance.now();
    };
    const tick = () => {
      if (!controls.autoRotate && performance.now() - lastInteractionRef.current > 3000) {
        controls.autoRotate = true;
      }
      raf = requestAnimationFrame(tick);
    };
    let raf = requestAnimationFrame(tick);
    dom.addEventListener("pointerdown", onDown);
    dom.addEventListener("pointerup", onUp);
    dom.addEventListener("wheel", onDown, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      dom.removeEventListener("pointerdown", onDown);
      dom.removeEventListener("pointerup", onUp);
      dom.removeEventListener("wheel", onDown);
    };
  }, [size.w, size.h]);

  // ---- Country polygons (GeoJSON) ----
  const [countries, setCountries] = useState<any[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetch("https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson")
      .then(r => r.json())
      .then(j => { if (!cancelled) setCountries(j.features || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const visitedSet = useMemo(() => new Set(VISITED.map(v => v.code.toUpperCase())), []);

  // ---- Stars background (500 points on sphere) ----
  useEffect(() => {
    const g = globeRef.current;
    if (!g || !size.w) return;
    const scene = g.scene();
    const positions: number[] = [];
    const sizes: number[] = [];
    const opacities: number[] = [];
    for (let i = 0; i < 500; i++) {
      const r = 200;
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = 2 * Math.PI * Math.random();
      positions.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
      sizes.push(0.3 + Math.random() * 1.2);
      opacities.push(0.2 + Math.random() * 0.6);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffffff, size: 1.0, transparent: true, opacity: 0.6, sizeAttenuation: true,
    });
    const points = new THREE.Points(geo, mat);
    points.name = "roavr-stars";
    scene.add(points);
    return () => { scene.remove(points); geo.dispose(); mat.dispose(); };
  }, [size.w, size.h]);

  // ---- Idle drift to most visited region after 30s ----
  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    let timer: number | null = null;
    const reset = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        // pick highest-count country
        const counts = new Map<string, number>();
        pins.forEach(p => {
          const c = nearestCountry(p.lat, p.lng);
          counts.set(c.code, (counts.get(c.code) ?? 0) + 1);
        });
        let topCode = VISITED[0].code; let topN = 0;
        counts.forEach((n, code) => { if (n > topN) { topN = n; topCode = code; } });
        const c = VISITED.find(v => v.code === topCode) || VISITED[0];
        g.pointOfView({ lat: c.lat, lng: c.lng, altitude: 2.0 }, 3000);
      }, 30000);
    };
    const dom = g.renderer().domElement;
    dom.addEventListener("pointerdown", reset);
    dom.addEventListener("wheel", reset, { passive: true });
    reset();
    return () => {
      if (timer) window.clearTimeout(timer);
      dom.removeEventListener("pointerdown", reset);
      dom.removeEventListener("wheel", reset);
    };
  }, [pins]);


  // build flag data: 1 entry per visited country, with count of pins in that country
  const flagData: FlagDatum[] = useMemo(() => {
    const counts = new Map<string, number>();
    let recentCode: string | null = null;
    for (const p of pins) {
      const c = nearestCountry(p.lat, p.lng);
      counts.set(c.code, (counts.get(c.code) ?? 0) + 1);
      if (p.recent) recentCode = c.code;
    }
    return VISITED.map(c => ({
      ...c,
      count: counts.get(c.code) ?? 1,
      recent: c.code === recentCode,
      milestone: milestoneSet.has(c.code),
    }));
  }, [pins, milestoneSet]);


  // arc data mapped for react-globe.gl
  const arcData = useMemo(
    () =>
      (arcs ?? []).map(a => ({
        startLat: a.from.lat,
        startLng: a.from.lng,
        endLat: a.to.lat,
        endLng: a.to.lng,
      })),
    [arcs]
  );

  // pin pulse + milestone halo + unlock particles
  useEffect(() => {
    if (document.getElementById("flagpin-anim")) return;
    const el = document.createElement("style");
    el.id = "flagpin-anim";
    el.innerHTML = `
      @keyframes flagpin-pulse {
        0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(59,130,246,0.6); }
        50% { transform: scale(1.06); box-shadow: 0 0 0 8px rgba(59,130,246,0); }
      }
      .flagpin-recent { animation: flagpin-pulse 1.8s ease-in-out infinite; }
      @keyframes flagpin-halo {
        0%, 100% { box-shadow: 0 0 0 0 rgba(244,162,97,0.55), 0 0 14px 2px rgba(244,162,97,0.35); }
        50% { box-shadow: 0 0 0 6px rgba(244,162,97,0), 0 0 22px 6px rgba(244,162,97,0.55); }
      }
      .flagpin-milestone {
        position:absolute; inset:-6px; border-radius:9999px;
        border:1.5px solid rgba(244,162,97,0.75);
        animation: flagpin-halo 2.4s ease-in-out infinite;
        pointer-events:none;
      }
      @keyframes flagpin-spark {
        0% { transform: translate(-50%,-50%) scale(0.4); opacity: 1; }
        100% { transform: translate(var(--tx), var(--ty)) scale(1); opacity: 0; }
      }
      .flagpin-spark {
        position:absolute; left:50%; top:50%; width:4px; height:4px;
        border-radius:9999px; background:#F4A261;
        box-shadow:0 0 6px 1px rgba(244,162,97,0.9);
        animation: flagpin-spark 2.6s ease-out infinite;
        pointer-events:none;
      }
    `;
    document.head.appendChild(el);
  }, []);


  if (!size.w || !size.h) {
    return <div ref={wrapRef} className="w-full h-full" />;
  }

  return (
    <div
      ref={wrapRef}
      className="w-full h-full"
      style={{
        background: "radial-gradient(ellipse at 50% 45%, #0F1828 0%, #080D1A 75%)",
      }}
    >
      <Globe
        ref={globeRef as any}
        width={size.w}
        height={size.h}
        backgroundColor="rgba(0,0,0,0)"
        showGlobe={true}
        showAtmosphere={true}
        atmosphereColor="#47B6D8"
        atmosphereAltitude={0.2}
        globeMaterial={
          new THREE.MeshPhongMaterial({
            color: new THREE.Color("#ffffff"),
            emissive: new THREE.Color("#1E88C8"),
            emissiveIntensity: 0.06,
            shininess: 10,
          })
        }
        globeImageUrl="https://unpkg.com/three-globe@2.31.0/example/img/earth-blue-marble.jpg"
        bumpImageUrl="https://unpkg.com/three-globe@2.31.0/example/img/earth-topology.png"
        // country polygons — visited highlight
        polygonsData={countries}
        polygonCapColor={(f: any) => {
          const code = (f.properties?.ISO_A2 || f.properties?.iso_a2 || "").toUpperCase();
          if (mode === "explore") {
            // pseudo-density: visited countries bright, others dim
            return visitedSet.has(code) ? "rgba(59,130,246,0.55)" : "rgba(45,106,79,0.15)";
          }
          return visitedSet.has(code) ? "rgba(59,130,246,0.45)" : "rgba(26,46,26,0.35)";
        }}
        polygonSideColor={(f: any) => {
          const code = (f.properties?.ISO_A2 || f.properties?.iso_a2 || "").toUpperCase();
          return visitedSet.has(code) ? "rgba(59,130,246,0.25)" : "rgba(26,46,26,0.15)";
        }}
        polygonStrokeColor={() => "rgba(255,255,255,0.06)"}
        polygonAltitude={(f: any) => {
          const code = (f.properties?.ISO_A2 || f.properties?.iso_a2 || "").toUpperCase();
          return visitedSet.has(code) ? 0.012 : 0.006;
        }}
        // arcs
        arcsData={arcData}
        arcColor={() => ["rgba(59,130,246,0)", "rgba(59,130,246,0.6)", "rgba(59,130,246,0)"]}
        arcStroke={0.4}
        arcDashLength={0.9}
        arcDashGap={0.2}
        arcDashAnimateTime={3000}
        arcAltitudeAutoScale={0.35}

        // flag pins as HTML elements
        htmlElementsData={flagData}
        htmlLat={(d: any) => d.lat}
        htmlLng={(d: any) => d.lng}
        htmlAltitude={0.01}
        htmlElement={(d: any) => {
          const data = d as FlagDatum;
          const el = document.createElement("div");
          el.style.pointerEvents = "auto";
          el.style.cursor = "pointer";
          el.style.transform = "translate(-50%, -50%)";
          el.style.position = "relative";
          el.style.width = "32px";
          el.style.height = "32px";
          const sparks = data.milestone
            ? Array.from({ length: 6 })
                .map((_, i) => {
                  const angle = (i / 6) * Math.PI * 2;
                  const dist = 22;
                  const tx = `${Math.cos(angle) * dist}px`;
                  const ty = `${Math.sin(angle) * dist}px`;
                  return `<span class="flagpin-spark" style="--tx:${tx};--ty:${ty};animation-delay:${i * 0.18}s"></span>`;
                })
                .join("")
            : "";
          el.innerHTML = `
            ${data.milestone ? `<span class="flagpin-milestone"></span>` : ""}
            ${sparks}
            <div class="${data.recent ? "flagpin-recent" : ""}" style="
              width:28px;height:28px;border-radius:9999px;
              background-image:url(https://flagcdn.com/w80/${data.code}.png);
              background-size:cover;background-position:center;
              border:2px solid ${data.milestone ? "#F4A261" : "#FFFFFF"};
              box-shadow:0 2px 8px rgba(0,0,0,0.55);
              position:relative;
            "></div>
            ${
              data.count > 1
                ? `<div style="
                    position:absolute;top:-4px;right:-6px;min-width:18px;height:18px;
                    padding:0 5px;border-radius:9999px;background:#3B82F6;
                    color:#fff;font-size:10px;font-weight:700;line-height:18px;
                    text-align:center;border:1.5px solid #080D1A;
                    font-family:'Sora','DM Sans',sans-serif;
                  ">${data.count}</div>`
                : ""
            }
          `;

          el.onclick = (e) => {
            e.stopPropagation();
            // find best matching pin in country
            const match = pins.find(p => nearestCountry(p.lat, p.lng).code === data.code);
            if (match) onPinClick?.(match);
            else
              onPinClick?.({
                lat: data.lat,
                lng: data.lng,
                label: data.name,
                category: "visited",
              });
          };
          return el;
        }}
      />
    </div>
  );
}
