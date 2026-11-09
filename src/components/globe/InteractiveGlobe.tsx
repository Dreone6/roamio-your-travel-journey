import { useRef, useMemo, useState, Suspense, useEffect, useCallback, createContext, useContext } from "react";
import { GLOBE_THEMES, type GlobePalette } from "@/lib/globe/themes";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { TextureLoader, BackSide } from "three";

/**
 * ROAVR Globe v4 — matte, dark, cinematic, with visible land + visited highlights.
 * - Ocean: #0A1628
 * - Land:  #1E3A5F (clear contrast vs ocean)
 * - Visited country halos: #3B82F6 soft glow blobs
 * - City pins: blue dot + soft glow; recent pulses
 * - Travel arcs: thin blue, animated draw on first load
 * - Idle auto-rotation, pause on touch, resume after 3s
 * - Subtle atmospheric rim
 */

export interface GlobePin {
  lat: number;
  lng: number;
  label: string;
  category: string;
  thumbnail?: string | null;
  description?: string | null;
  recent?: boolean;
}

export interface GlobeArc {
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  color?: string;
}

interface InteractiveGlobeProps {
  pins: GlobePin[];
  arcs?: GlobeArc[];
  onPinClick?: (pin: GlobePin) => void;
  autoRotate?: boolean;
  /** Transparent backdrop and no scroll-zoom, for decorative placements. */
  decorative?: boolean;
  /** Colour theme for ocean, land, glow and pins. */
  palette?: GlobePalette;
  /** Override the visited-country glows (lat/lng centroids). */
  highlights?: { name: string; lat: number; lng: number; size?: number }[];
  /** Pins drop in one after another (onboarding ignition). */
  ignite?: boolean;
}

const PaletteCtx = createContext<GlobePalette>(GLOBE_THEMES[0].palette);
const usePalette = () => useContext(PaletteCtx);

const ACCENT = "#3B82F6";
const PIN_CORE = "#FFFFFF";
const CLUSTER = "#F59E0B";
const LAND = "#2A4A7F";
const OCEAN = "#080D1A";
const RADIUS = 2;
const LAND_RADIUS = 2.005;

// Approximate centroids of 27 visited countries — used to render visited highlights.
// Without GeoJSON we approximate per-country fill with soft blue glow blobs sized by country footprint.
const VISITED_COUNTRIES: { name: string; lat: number; lng: number; size?: number }[] = [
  { name: "Italy", lat: 41.9, lng: 12.5, size: 0.18 },
  { name: "France", lat: 46.6, lng: 2.2, size: 0.22 },
  { name: "Spain", lat: 40.4, lng: -3.7, size: 0.22 },
  { name: "Portugal", lat: 39.4, lng: -8.2, size: 0.14 },
  { name: "United Kingdom", lat: 54.0, lng: -2.0, size: 0.18 },
  { name: "Ireland", lat: 53.1, lng: -7.7, size: 0.13 },
  { name: "Iceland", lat: 64.9, lng: -19.0, size: 0.15 },
  { name: "Norway", lat: 60.5, lng: 8.5, size: 0.20 },
  { name: "Sweden", lat: 60.1, lng: 18.6, size: 0.20 },
  { name: "Germany", lat: 51.2, lng: 10.5, size: 0.18 },
  { name: "Netherlands", lat: 52.1, lng: 5.3, size: 0.12 },
  { name: "Switzerland", lat: 46.8, lng: 8.2, size: 0.12 },
  { name: "Greece", lat: 39.0, lng: 22.0, size: 0.17 },
  { name: "Croatia", lat: 45.1, lng: 15.2, size: 0.13 },
  { name: "Turkey", lat: 39.0, lng: 35.2, size: 0.24 },
  { name: "Morocco", lat: 31.8, lng: -7.1, size: 0.20 },
  { name: "Egypt", lat: 26.8, lng: 30.8, size: 0.22 },
  { name: "South Africa", lat: -30.6, lng: 22.9, size: 0.24 },
  { name: "United States", lat: 39.8, lng: -98.6, size: 0.34 },
  { name: "Canada", lat: 56.1, lng: -106.3, size: 0.36 },
  { name: "Mexico", lat: 23.6, lng: -102.5, size: 0.24 },
  { name: "Brazil", lat: -14.2, lng: -51.9, size: 0.34 },
  { name: "Argentina", lat: -38.4, lng: -63.6, size: 0.28 },
  { name: "Japan", lat: 36.2, lng: 138.3, size: 0.18 },
  { name: "Thailand", lat: 15.9, lng: 100.9, size: 0.18 },
  { name: "Indonesia", lat: -2.5, lng: 118.0, size: 0.26 },
  { name: "Australia", lat: -25.3, lng: 133.8, size: 0.34 },
];

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// Soft radial sprite texture (white center, transparent edge) — used for visited halos and pin glows.
function useSoftDiscTexture(): THREE.Texture {
  return useMemo(() => {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return new THREE.CanvasTexture(canvas);
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.4, "rgba(255,255,255,0.55)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);
}

// Ocean — bright enough to read as deep blue, not pure black
function OceanSphere() {
  const { ocean: OCEAN } = usePalette();
  return (
    <mesh>
      <sphereGeometry args={[RADIUS, 96, 96]} />
      <meshBasicMaterial color={OCEAN} />
    </mesh>
  );
}

// Land — masked by earth-water alpha; meshBasicMaterial so the navy color always renders at full saturation
function Land() {
  const { land: LAND } = usePalette();
  const waterMask = useLoader(
    TextureLoader,
    "https://unpkg.com/three-globe@2.31.0/example/img/earth-water.png"
  );
  const landMask = useMemo(() => {
    // The provider mask is white over water, while alphaMap needs white over land.
    const image = waterMask.image as HTMLImageElement;
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d");
    if (!context) return waterMask;
    context.drawImage(image, 0, 0);
    context.globalCompositeOperation = "difference";
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.NoColorSpace;
    return texture;
  }, [waterMask]);
  useEffect(() => () => { if (landMask !== waterMask) landMask.dispose(); }, [landMask, waterMask]);

  return (
    <mesh>
      <sphereGeometry args={[LAND_RADIUS, 192, 192]} />
      <meshBasicMaterial
        color={LAND}
        alphaMap={landMask}
        transparent
        alphaTest={0.5}
      />
    </mesh>
  );
}

// Visited country halo — blue soft blob centered on country centroid
function VisitedHalo({ lat, lng, size = 0.2, sprite }: { lat: number; lng: number; size?: number; sprite: THREE.Texture }) {
  const { glow: ACCENT } = usePalette();
  const pos = useMemo(() => latLngToVector3(lat, lng, LAND_RADIUS + 0.012), [lat, lng]);
  const normal = useMemo(() => pos.clone().normalize(), [pos]);
  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    return q;
  }, [normal]);

  return (
    <mesh position={pos} quaternion={quaternion}>
      <circleGeometry args={[size * 0.45, 32]} />
      <meshBasicMaterial
        color={ACCENT}
        map={sprite}
        transparent
        opacity={0.4}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// City pin — small bright dot + glow halo
function CityPin({
  pin,
  onClick,
  sprite,
  delay = 0,
}: {
  pin: GlobePin;
  onClick?: () => void;
  sprite: THREE.Texture;
  delay?: number;
}) {
  const { glow: ACCENT, pin: PIN_CORE } = usePalette();
  const groupRef = useRef<THREE.Group>(null);
  const born = useRef<number | null>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const pos = useMemo(() => latLngToVector3(pin.lat, pin.lng, LAND_RADIUS + 0.018), [pin.lat, pin.lng]);
  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), pos.clone().normalize());
    return q;
  }, [pos]);

  useFrame((state) => {
    if (groupRef.current) {
      // Springy drop-in: overshoot then settle.
      if (born.current == null) born.current = state.clock.elapsedTime + delay / 1000;
      const t = Math.max(0, state.clock.elapsedTime - born.current);
      const s = t <= 0 ? 0 : 1 - Math.exp(-7 * t) * Math.cos(10 * t);
      const k = Math.max(0.001, s);
      groupRef.current.scale.set(k, k, k);
    }
    if (haloRef.current && pin.recent) {
      const t = (Math.sin(state.clock.elapsedTime * 2) + 1) / 2;
      const s = 1 + t * 0.5;
      haloRef.current.scale.set(s, s, 1);
      (haloRef.current.material as THREE.MeshBasicMaterial).opacity = 0.4 - t * 0.2;
    }
  });

  return (
    <group ref={groupRef} position={pos} quaternion={quaternion}>
      {/* Outer glow disc */}
      <mesh ref={haloRef}>
        <circleGeometry args={[0.085, 24]} />
        <meshBasicMaterial color={ACCENT} map={sprite} transparent opacity={0.4} depthWrite={false} />
      </mesh>
      {/* Solid core dot — bright white */}
      <mesh
        onClick={(e) => { e.stopPropagation(); onClick?.(); }}
        onPointerOver={() => { document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { document.body.style.cursor = "default"; }}
      >
        <circleGeometry args={[0.032, 20]} />
        <meshBasicMaterial color={PIN_CORE} depthWrite={false} />
      </mesh>
    </group>
  );
}

// Atmospheric rim — back-side sphere with fresnel-ish soft edge via shader
function Atmosphere() {
  const { glow: ACCENT } = usePalette();
  const material = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    side: BackSide,
    depthWrite: false,
    uniforms: {
      uColor: { value: new THREE.Color(ACCENT) },
    },
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying vec3 vNormal;
      void main() {
        float intensity = pow(0.55 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.4);
        gl_FragColor = vec4(uColor, 1.0) * intensity * 0.55;
      }
    `,
  }), [ACCENT]);
  return (
    <mesh scale={1.12}>
      <sphereGeometry args={[RADIUS, 64, 64]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

// Travel arc (animated draw on first load)
function ArcLine({ from, to, delay = 0 }: GlobeArc & { delay?: number }) {
  const { arc: ACCENT } = usePalette();
  const [progress, setProgress] = useState(0);
  const geomRef = useRef<THREE.BufferGeometry>(null);

  const { positions, total } = useMemo(() => {
    const start = latLngToVector3(from.lat, from.lng, LAND_RADIUS + 0.005);
    const end = latLngToVector3(to.lat, to.lng, LAND_RADIUS + 0.005);
    const mid = start.clone().add(end).multiplyScalar(0.5);
    const distance = start.distanceTo(end);
    const lift = 1 + distance * 0.22;
    mid.normalize().multiplyScalar((LAND_RADIUS + 0.005) * lift);
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const pts = curve.getPoints(64);
    const arr = new Float32Array(pts.length * 3);
    pts.forEach((p, i) => { arr[i * 3] = p.x; arr[i * 3 + 1] = p.y; arr[i * 3 + 2] = p.z; });
    return { positions: arr, total: pts.length };
  }, [from.lat, from.lng, to.lat, to.lng]);

  useEffect(() => {
    const start = performance.now() + delay;
    let raf = 0;
    const tick = () => {
      const t = Math.min(1, Math.max(0, (performance.now() - start) / 1200));
      setProgress(t);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [delay]);

  useEffect(() => {
    if (geomRef.current) {
      geomRef.current.setDrawRange(0, Math.floor(total * progress));
    }
  }, [progress, total]);

  return (
    <line>
      <bufferGeometry ref={geomRef}>
        <bufferAttribute attach="attributes-position" count={total} array={positions} itemSize={3} />
      </bufferGeometry>
      <lineBasicMaterial color={ACCENT} transparent opacity={0.35} depthWrite={false} />
    </line>
  );
}

// Idle auto-rotation controller — rotates the globe group at 360° / 90s when idle, pauses on interaction, resumes 3s after release
function IdleRotator({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null);
  const lastInteractionRef = useRef<number>(0);
  const { gl } = useThree();

  useEffect(() => {
    const el = gl.domElement;
    const onDown = () => { lastInteractionRef.current = performance.now(); };
    const onMove = (e: PointerEvent) => {
      if (e.buttons > 0) lastInteractionRef.current = performance.now();
    };
    const onUp = () => { lastInteractionRef.current = performance.now(); };
    const onWheel = () => { lastInteractionRef.current = performance.now(); };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("wheel", onWheel);
    };
  }, [gl]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const idleFor = performance.now() - lastInteractionRef.current;
    if (lastInteractionRef.current === 0 || idleFor > 3000) {
      // 360° per 90s = 2π / 90 rad/sec
      groupRef.current.rotation.y += (Math.PI * 2 / 90) * delta;
    }
  });

  return <group ref={groupRef}>{children}</group>;
}

function Scene({ pins, arcs, onPinClick, decorative, highlights, ignite }: InteractiveGlobeProps) {
  const halos = highlights ?? VISITED_COUNTRIES;
  const sprite = useSoftDiscTexture();

  return (
    <>
      {/* Pure ambient — meshBasicMaterial doesn't need light, but keeps Suspense-loaded pieces consistent */}
      <ambientLight intensity={1} />

      <Atmosphere />

      <IdleRotator>
        <OceanSphere />
        <Suspense fallback={null}>
          <Land />
        </Suspense>

        {/* Visited country highlights */}
        {halos.map((c) => (
          <VisitedHalo key={c.name} lat={c.lat} lng={c.lng} size={c.size} sprite={sprite} />
        ))}

        {arcs?.map((a, i) => (
          <ArcLine key={`arc-${i}`} {...a} delay={ignite ? 600 + i * 350 : i * 180} />
        ))}

        {pins.map((p, i) => (
          <CityPin key={`${p.lat}-${p.lng}-${i}`} pin={p} onClick={() => onPinClick?.(p)} sprite={sprite} delay={ignite ? i * 220 : 0} />
        ))}
      </IdleRotator>

      <OrbitControls
        enableZoom={!decorative}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.5}
        zoomSpeed={0.6}
        minDistance={3.2}
        maxDistance={7}
      />
    </>
  );
}

export default function InteractiveGlobe({
  pins,
  arcs,
  onPinClick,
  decorative,
  palette,
  highlights,
  ignite,
}: InteractiveGlobeProps) {
  const pal = palette ?? GLOBE_THEMES[0].palette;
  return (
    <div
      className="w-full h-full"
      style={{
        background: decorative
          ? "transparent"
          : `radial-gradient(ellipse at 50% 45%, ${pal.backdrop} 0%, ${pal.ocean} 75%)`,
      }}
    >
      <Canvas
        camera={{ position: [0, 0.4, decorative ? 6.6 : 5], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        dpr={[1, 2]}
      >
        <PaletteCtx.Provider value={pal}>
          <Scene pins={pins} arcs={arcs} onPinClick={onPinClick} decorative={decorative} highlights={highlights} ignite={ignite} />
        </PaletteCtx.Provider>
      </Canvas>
    </div>
  );
}
