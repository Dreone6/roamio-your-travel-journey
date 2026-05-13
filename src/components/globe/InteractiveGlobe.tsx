import { useRef, useMemo, useState, Suspense, useEffect } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
import { TextureLoader } from "three";

/**
 * ROAVR Globe v3 — matte, dark, cinematic.
 * No glass. No specular highlight. No atmosphere neon halo.
 * Land masses: muted navy-blue (#1E3A5F). Ocean: deep (#0A1628).
 * City pins: small blue dots with subtle glow. Most recent pulses.
 * Travel arcs: thin blue lines, drawn once on load.
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
}

const ACCENT = "#3B82F6";
const RADIUS = 2;
const LAND_RADIUS = 2.005;

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// Ocean sphere — matte deep navy
function OceanSphere() {
  return (
    <mesh>
      <sphereGeometry args={[RADIUS, 96, 96]} />
      <meshLambertMaterial color="#0A1628" />
    </mesh>
  );
}

// Land — single navy color masked by earth-water alpha
function Land() {
  const waterMask = useLoader(
    TextureLoader,
    "https://unpkg.com/three-globe@2.31.0/example/img/earth-water.png"
  );
  useMemo(() => {
    waterMask.colorSpace = THREE.NoColorSpace;
    waterMask.needsUpdate = true;
  }, [waterMask]);

  return (
    <mesh>
      <sphereGeometry args={[LAND_RADIUS, 192, 192]} />
      <meshLambertMaterial
        color="#1E3A5F"
        alphaMap={waterMask}
        transparent
        alphaTest={0.55}
      />
    </mesh>
  );
}

// City dot pin
function CityPin({
  pin,
  onClick,
}: {
  pin: GlobePin;
  onClick?: () => void;
}) {
  const haloRef = useRef<THREE.Mesh>(null);
  const pos = useMemo(() => latLngToVector3(pin.lat, pin.lng, LAND_RADIUS + 0.01), [pin.lat, pin.lng]);

  useFrame((state) => {
    if (haloRef.current && pin.recent) {
      const t = (Math.sin(state.clock.elapsedTime * 2) + 1) / 2;
      const s = 1 + t * 0.45;
      haloRef.current.scale.set(s, s, s);
      (haloRef.current.material as THREE.MeshBasicMaterial).opacity = 0.35 - t * 0.22;
    }
  });

  return (
    <group position={pos}>
      {/* Glow */}
      <mesh ref={haloRef}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={0.22} depthWrite={false} />
      </mesh>
      {/* Core dot */}
      <mesh
        onClick={(e) => { e.stopPropagation(); onClick?.(); }}
        onPointerOver={() => { document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { document.body.style.cursor = "default"; }}
      >
        <sphereGeometry args={[0.013, 12, 12]} />
        <meshBasicMaterial color={ACCENT} />
      </mesh>
    </group>
  );
}

// Curved arc between two coordinates — drawn once via dashed stroke animation
function ArcLine({ from, to, delay = 0 }: GlobeArc & { delay?: number }) {
  const matRef = useRef<THREE.LineBasicMaterial>(null);
  const [progress, setProgress] = useState(0);

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

  const geomRef = useRef<THREE.BufferGeometry>(null);

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
      const drawCount = Math.floor(total * progress);
      geomRef.current.setDrawRange(0, drawCount);
    }
  }, [progress, total]);

  return (
    <line>
      <bufferGeometry ref={geomRef}>
        <bufferAttribute
          attach="attributes-position"
          count={total}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial
        ref={matRef}
        color={ACCENT}
        transparent
        opacity={0.2}
        depthWrite={false}
      />
    </line>
  );
}

function Scene({ pins, arcs, onPinClick, autoRotate }: InteractiveGlobeProps) {
  return (
    <>
      {/* Soft ambient + single upper-left directional, NO specular highlight */}
      <ambientLight intensity={0.7} />
      <directionalLight position={[-4, 4, 3]} intensity={0.55} color="#ffffff" />
      <directionalLight position={[3, -2, -2]} intensity={0.12} color="#1E3A5F" />

      <OceanSphere />
      <Suspense fallback={null}>
        <Land />
      </Suspense>

      {arcs?.map((a, i) => (
        <ArcLine key={`arc-${i}`} {...a} delay={i * 180} />
      ))}

      {pins.map((p, i) => (
        <CityPin key={`${p.lat}-${p.lng}-${i}`} pin={p} onClick={() => onPinClick?.(p)} />
      ))}

      <OrbitControls
        enableZoom
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.5}
        zoomSpeed={0.6}
        autoRotate={autoRotate}
        autoRotateSpeed={0.25}
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
  autoRotate = false,
}: InteractiveGlobeProps) {
  return (
    <div
      className="w-full h-full"
      style={{
        background:
          "radial-gradient(ellipse at 50% 45%, #0F1828 0%, #080D1A 75%)",
      }}
    >
      <Canvas
        camera={{ position: [0, 0.4, 5], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        dpr={[1, 2]}
      >
        <Scene pins={pins} arcs={arcs} onPinClick={onPinClick} autoRotate={autoRotate} />
      </Canvas>
    </div>
  );
}
