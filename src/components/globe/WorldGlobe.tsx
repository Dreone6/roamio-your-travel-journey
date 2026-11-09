/**
 * WorldGlobe — the visual hero of Roavr.
 *
 * Renders one illuminated point per *city* (never one per photo or memory), so
 * a traveller with 1,000 visits still draws a few hundred GPU points instead of
 * hundreds of DOM nodes. Above `MERGE_THRESHOLD` cities the points are merged
 * into a single mesh; below it they stay individually pickable so tapping a
 * place opens its detail sheet.
 *
 * The render loop is paused whenever the globe is scrolled out of view or the
 * tab is hidden, and idle auto-rotation is disabled for users who ask for
 * reduced motion.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import Globe, { GlobeMethods } from "react-globe.gl";
import * as THREE from "three";
import type { GlobePalette } from "@/lib/globe/themes";

const COUNTRIES_URL = "https://unpkg.com/globe.gl/example/datasets/ne_110m_admin_0_countries.geojson";
let countriesCache: Promise<any[]> | null = null;
function loadCountries(): Promise<any[]> {
  if (!countriesCache) {
    countriesCache = fetch(COUNTRIES_URL)
      .then((r) => (r.ok ? r.json() : { features: [] }))
      .then((j) => (j.features ?? []).filter((f: any) => f.properties?.ISO_A2 !== "AQ"))
      .catch(() => { countriesCache = null; return []; });
  }
  return countriesCache;
}
const normName = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
function hexA(hex: string, a: number) {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export interface WorldGlobePoint {
  key: string;
  lat: number;
  lng: number;
  label: string;
  /** Visit count — drives point size. */
  weight: number;
  recent?: boolean;
  milestone?: boolean;
}

export interface WorldGlobeArc {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
}

interface Props {
  points: WorldGlobePoint[];
  arcs?: WorldGlobeArc[];
  onPointClick?: (p: WorldGlobePoint) => void;
  /** Compact mode for profile previews: no arcs, no interaction chrome. */
  compact?: boolean;
  interactive?: boolean;
  /** When set, renders a flat "papercraft" globe in these colours. */
  palette?: GlobePalette | null;
  /** Country names to raise and colour as visited (flat mode). */
  visitedCountries?: string[];
}

const BLUE = "#3B82F6";
const AMBER = "#F4A261";
const MERGE_THRESHOLD = 300;
const MAX_ARCS = 24;

function prefersReducedMotion() {
  return typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

export default function WorldGlobe({
  points, arcs = [], onPointClick, compact = false, interactive = true,
  palette = null, visitedCountries = [],
}: Props) {
  const [polys, setPolys] = useState<any[]>([]);
  const [hover, setHover] = useState<any>(null);
  useEffect(() => {
    if (!palette) return;
    let live = true;
    loadCountries().then((f) => { if (live) setPolys(f); });
    return () => { live = false; };
  }, [palette]);
  const visitedSet = useMemo(() => new Set(visitedCountries.map(normName)), [visitedCountries]);
  const isVisited = (f: any) => {
    const p = f.properties ?? {};
    return [p.NAME, p.ADMIN, p.NAME_LONG, p.FORMAL_EN, p.SOVEREIGNT].some((n) => n && visitedSet.has(normName(n)));
  };
  const oceanMat = useMemo(
    () => (palette ? new THREE.MeshPhongMaterial({ color: palette.ocean, shininess: 4 }) : undefined),
    [palette],
  );
  const glow = palette?.glow ?? BLUE;
  const globeRef = useRef<GlobeMethods>();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [visible, setVisible] = useState(true);
  const lastTouch = useRef(0);
  const reduced = useMemo(prefersReducedMotion, []);

  // Size to container
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Pause the render loop when off-screen or backgrounded
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    const onVis = () => setVisible(!document.hidden && !!wrapRef.current);
    document.addEventListener("visibilitychange", onVis);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  useEffect(() => {
    const g = globeRef.current as any;
    if (!g) return;
    if (visible) g.resumeAnimation?.();
    else g.pauseAnimation?.();
  }, [visible, size.w, size.h]);

  // Controls + idle rotation
  useEffect(() => {
    const g = globeRef.current;
    if (!g || !size.w) return;
    const controls: any = g.controls();
    controls.enableZoom = interactive && !compact;
    controls.enablePan = false;
    controls.enableRotate = interactive;
    controls.minDistance = 180;
    controls.maxDistance = 520;
    controls.autoRotate = !reduced;
    controls.autoRotateSpeed = compact ? 0.25 : 0.4;
    g.pointOfView({ lat: 20, lng: 0, altitude: compact ? 2.6 : 2.2 }, 0);

    if (reduced || !interactive) return;
    const dom = g.renderer().domElement;
    const pause = () => { lastTouch.current = performance.now(); controls.autoRotate = false; };
    const resume = () => { lastTouch.current = performance.now(); };
    let raf = 0;
    const tick = () => {
      if (!controls.autoRotate && performance.now() - lastTouch.current > 3000) controls.autoRotate = true;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    dom.addEventListener("pointerdown", pause);
    dom.addEventListener("pointerup", resume);
    dom.addEventListener("wheel", pause, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      dom.removeEventListener("pointerdown", pause);
      dom.removeEventListener("pointerup", resume);
      dom.removeEventListener("wheel", pause);
    };
  }, [size.w, size.h, compact, interactive, reduced]);

  const merge = points.length > MERGE_THRESHOLD;

  const ringData = useMemo(() => {
    if (reduced) return [];
    return points.filter((p) => p.recent || p.milestone).slice(0, 6);
  }, [points, reduced]);

  const arcData = useMemo(() => (compact ? [] : arcs.slice(0, MAX_ARCS)), [arcs, compact]);

  return (
    <div ref={wrapRef} className="h-full w-full">
      {size.w > 0 && (
        <Globe
          ref={globeRef as any}
          width={size.w}
          height={size.h}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl={palette ? undefined : "//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"}
          bumpImageUrl={palette ? undefined : "//unpkg.com/three-globe/example/img/earth-topology.png"}
          globeMaterial={oceanMat as any}
          polygonsData={palette ? polys : []}
          polygonCapColor={(f: any) => (isVisited(f) ? glow : f === hover ? hexA(palette!.land, 1) : palette!.land)}
          polygonSideColor={(f: any) => (isVisited(f) ? hexA(glow, 0.55) : hexA(palette!.land, 0.6))}
          polygonStrokeColor={() => hexA(palette?.ocean ?? "#000000", 0.9)}
          polygonAltitude={(f: any) => (isVisited(f) ? 0.035 : f === hover ? 0.02 : 0.008)}
          polygonsTransitionDuration={reduced ? 0 : 450}
          polygonLabel={(f: any) => (compact ? "" : `${f.properties?.NAME ?? ""}${isVisited(f) ? " · visited" : ""}`)}
          onPolygonHover={interactive && !compact ? setHover : undefined}
          showAtmosphere
          atmosphereColor={glow}
          atmosphereAltitude={0.16}
          animateIn={!reduced}
          pointsData={points}
          pointsMerge={merge}
          pointLat={(d: any) => d.lat}
          pointLng={(d: any) => d.lng}
          pointColor={(d: any) => (d.milestone ? AMBER : palette ? palette.pin : BLUE)}
          pointAltitude={(d: any) => Math.min(0.012 + d.weight * 0.004, 0.06)}
          pointRadius={(d: any) => Math.min(0.22 + d.weight * 0.05, 0.5)}
          pointLabel={(d: any) => (merge || compact ? "" : d.label)}
          onPointClick={merge ? undefined : ((d: any) => onPointClick?.(d as WorldGlobePoint)) as any}
          ringsData={ringData}
          ringLat={(d: any) => d.lat}
          ringLng={(d: any) => d.lng}
          ringColor={(d: any) => (d.milestone
            ? () => "rgba(244,162,97,0.55)"
            : () => hexA(glow, 0.5)) as any}
          ringMaxRadius={2.4}
          ringPropagationSpeed={0.8}
          ringRepeatPeriod={2400}
          arcsData={arcData}
          arcColor={() => [hexA(palette?.arc ?? BLUE, 0.05), hexA(palette?.arc ?? BLUE, 0.6)]}
          arcStroke={0.35}
          arcAltitudeAutoScale={0.35}
          arcDashLength={0.6}
          arcDashGap={0.25}
          arcDashAnimateTime={reduced ? 0 : 4000}
        />
      )}
    </div>
  );
}
