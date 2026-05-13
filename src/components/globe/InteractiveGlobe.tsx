import { useRef, useMemo, useState, Suspense } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { OrbitControls, Html, MeshTransmissionMaterial, Stars } from "@react-three/drei";
import * as THREE from "three";
import { TextureLoader } from "three";

/**
 * ROAVR proprietary glass-morphic globe.
 * - Frosted, semi-translucent glass sphere with internal Royal Blue emissive glow.
 * - Matte-white "3D Clay" landmasses with displacement (Z-thickness) above the sphere.
 * - Topo-grid micro-detail revealed on zoom-in.
 * - Crystal pin markers with glass-morphic hover preview bubbles.
 * - Glowing royal blue arcs along the curvature for itineraries.
 * - Momentum-based rotation (OrbitControls damping).
 */

export interface GlobePin {
  lat: number;
  lng: number;
  label: string;
  category: string;
  thumbnail?: string | null;
  description?: string | null;
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

// Brand palette
const ROYAL_BLUE = "#1e3a8a";
const ROYAL_BLUE_GLOW = "#3b82f6";
const ELECTRIC_AQUA = "#22d3ee";
const CORAL = "#f97362";

const CATEGORY_COLOR: Record<string, string> = {
  memory: ROYAL_BLUE_GLOW,
  checkin: ELECTRIC_AQUA,
  tip: "#a78bfa",       // story
  visited: ROYAL_BLUE_GLOW,
  wishlist: "#fbbf24",
  sponsored: CORAL,
  friend: "#34d399",
};

const RADIUS = 2;
const LAND_RADIUS = 2.035; // sits slightly above glass

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// ----- Glass shell with internal glow -----
function GlassSphere() {
  return (
    <group>
      {/* Inner royal-blue emissive core (visible through frosted glass) */}
      <mesh>
        <sphereGeometry args={[RADIUS * 0.92, 64, 64]} />
        <meshStandardMaterial
          color={ROYAL_BLUE}
          emissive={ROYAL_BLUE_GLOW}
          emissiveIntensity={0.65}
          roughness={0.35}
          metalness={0.1}
        />
      </mesh>

      {/* Faint inner halo */}
      <mesh>
        <sphereGeometry args={[RADIUS * 0.97, 64, 64]} />
        <meshBasicMaterial color={ROYAL_BLUE_GLOW} transparent opacity={0.08} />
      </mesh>

      {/* Frosted glass outer shell */}
      <mesh>
        <sphereGeometry args={[RADIUS, 96, 96]} />
        <MeshTransmissionMaterial
          transmission={1}
          thickness={0.6}
          roughness={0.18}
          ior={1.45}
          chromaticAberration={0.04}
          anisotropy={0.3}
          distortion={0.08}
          distortionScale={0.4}
          temporalDistortion={0.05}
          clearcoat={1}
          clearcoatRoughness={0.1}
          attenuationDistance={1.6}
          attenuationColor="#dbeafe"
          color="#eff6ff"
        />
      </mesh>

      {/* Outer atmosphere bloom */}
      <mesh>
        <sphereGeometry args={[RADIUS * 1.08, 64, 64]} />
        <meshBasicMaterial
          color={ROYAL_BLUE_GLOW}
          transparent
          opacity={0.06}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[RADIUS * 1.14, 48, 48]} />
        <meshBasicMaterial
          color={ROYAL_BLUE_GLOW}
          transparent
          opacity={0.03}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// ----- Topographic grid revealed on zoom -----
function TopoGrid({ visibility }: { visibility: number }) {
  if (visibility <= 0.01) return null;
  return (
    <group>
      {Array.from({ length: 24 }).map((_, i) => {
        const angle = (i * Math.PI) / 12;
        return (
          <mesh key={`lng-${i}`} rotation={[0, angle, 0]}>
            <torusGeometry args={[LAND_RADIUS + 0.001, 0.0035, 6, 128]} />
            <meshBasicMaterial
              color={ROYAL_BLUE_GLOW}
              transparent
              opacity={0.25 * visibility}
              depthWrite={false}
            />
          </mesh>
        );
      })}
      {Array.from({ length: 13 }).map((_, i) => {
        const lat = -75 + i * 12.5;
        const r = (LAND_RADIUS + 0.001) * Math.cos((lat * Math.PI) / 180);
        const y = (LAND_RADIUS + 0.001) * Math.sin((lat * Math.PI) / 180);
        return (
          <mesh key={`lat-${i}`} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[r - 0.003, r + 0.003, 128]} />
            <meshBasicMaterial
              color={ROYAL_BLUE_GLOW}
              transparent
              opacity={0.22 * visibility}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// ----- Clay landmasses (white matte, raised) -----
function ClayLand() {
  // Earth-water alpha mask: land = white, ocean = black
  const [waterMask, topoMap] = useLoader(TextureLoader, [
    "https://unpkg.com/three-globe@2.31.0/example/img/earth-water.png",
    "https://unpkg.com/three-globe@2.31.0/example/img/earth-topology.png",
  ]);

  // Invert water mask so land becomes the alpha
  // (in earth-water.png: oceans=white, land=black) — we need land visible
  useMemo(() => {
    waterMask.colorSpace = THREE.NoColorSpace;
    topoMap.colorSpace = THREE.NoColorSpace;
    waterMask.needsUpdate = true;
  }, [waterMask, topoMap]);

  return (
    <mesh>
      <sphereGeometry args={[LAND_RADIUS, 256, 256]} />
      <meshStandardMaterial
        color="#f8fafc"
        roughness={0.95}
        metalness={0.0}
        alphaMap={waterMask}
        transparent
        alphaTest={0.55}
        // Subtle z-thickness via displacement
        displacementMap={topoMap}
        displacementScale={0.045}
        displacementBias={0.005}
        bumpMap={topoMap}
        bumpScale={0.015}
        side={THREE.FrontSide}
      />
    </mesh>
  );
}

// ----- Crystal pin marker -----
function CrystalPin({
  pin,
  onClick,
  onHover,
}: {
  pin: GlobePin;
  onClick?: () => void;
  onHover?: (hovering: boolean) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const pos = useMemo(() => latLngToVector3(pin.lat, pin.lng, LAND_RADIUS + 0.06), [pin.lat, pin.lng]);
  const [hovered, setHovered] = useState(false);

  const accent = CATEGORY_COLOR[pin.category] || ROYAL_BLUE_GLOW;
  const isStory = pin.category === "tip";
  const isSponsored = pin.category === "sponsored";
  const hasPhoto = !!pin.thumbnail && (pin.category === "memory" || pin.category === "tip" || pin.category === "checkin");

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.6;
      const s = hovered ? 1.45 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(s, s, s), 0.15);
    }
    if (haloRef.current && (isStory || isSponsored)) {
      const t = (Math.sin(state.clock.elapsedTime * 2.2) + 1) / 2;
      const s = 1 + t * 0.35;
      haloRef.current.scale.set(s, s, s);
      (haloRef.current.material as THREE.MeshBasicMaterial).opacity = 0.35 - t * 0.25;
    }
  });

  // Orient pin upright relative to globe surface
  const lookAt = useMemo(() => pos.clone().multiplyScalar(2), [pos]);

  return (
    <group position={pos}>
      {/* Photo-disc pin (memories / stories / check-ins with media) */}
      {hasPhoto ? (
        <Html
          center
          distanceFactor={6}
          zIndexRange={[10, 0]}
          style={{ pointerEvents: "auto" }}
        >
          <div
            onPointerOver={() => { setHovered(true); onHover?.(true); document.body.style.cursor = "pointer"; }}
            onPointerOut={() => { setHovered(false); onHover?.(false); document.body.style.cursor = "default"; }}
            onClick={(e) => { e.stopPropagation(); onClick?.(); }}
            style={{
              width: hovered ? 38 : 30,
              height: hovered ? 38 : 30,
              borderRadius: "50%",
              padding: 2,
              background: isStory
                ? `conic-gradient(from 0deg, ${accent}, ${ROYAL_BLUE_GLOW}, ${CORAL}, ${accent})`
                : `linear-gradient(135deg, ${accent}, ${ROYAL_BLUE})`,
              boxShadow: `0 0 14px ${accent}aa, 0 6px 18px rgba(0,0,0,0.55)`,
              transition: "all 180ms ease",
              cursor: "pointer",
            }}
          >
            <img
              src={pin.thumbnail!}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                objectFit: "cover",
                display: "block",
                border: "2px solid rgba(8,11,24,0.9)",
              }}
            />
          </div>
        </Html>
      ) : (
        <mesh
          ref={meshRef}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
            onHover?.(true);
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            setHovered(false);
            onHover?.(false);
            document.body.style.cursor = "default";
          }}
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
          onUpdate={(self) => self.lookAt(lookAt)}
        >
          <octahedronGeometry args={[0.05, 0]} />
          <meshPhysicalMaterial
            color={accent}
            emissive={accent}
            emissiveIntensity={1.6}
            metalness={0.2}
            roughness={0.05}
            transmission={0.55}
            thickness={0.3}
            ior={1.7}
            clearcoat={1}
            clearcoatRoughness={0.05}
          />
        </mesh>
      )}

      {/* Static halo */}
      <mesh>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshBasicMaterial color={accent} transparent opacity={0.18} depthWrite={false} />
      </mesh>

      {/* Pulsing ring for stories & sponsored offers */}
      {(isStory || isSponsored) && (
        <mesh ref={haloRef}>
          <sphereGeometry args={[0.13, 20, 20]} />
          <meshBasicMaterial color={accent} transparent opacity={0.3} depthWrite={false} />
        </mesh>
      )}

      {/* Hover label bubble (non-photo pins) */}
      {hovered && !hasPhoto && (
        <Html position={[0, 0.18, 0]} center distanceFactor={6} style={{ pointerEvents: "none" }}>
          <div
            style={{
              minWidth: 120,
              maxWidth: 180,
              padding: 8,
              borderRadius: 12,
              background: "rgba(15, 23, 42, 0.65)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: `1px solid ${accent}66`,
              boxShadow: `0 12px 40px -8px ${accent}55, 0 0 24px ${accent}33`,
              color: "white",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.25 }}>{pin.label}</div>
            {pin.description && (
              <div style={{ fontSize: 9, opacity: 0.75, marginTop: 2, lineHeight: 1.3 }}>
                {pin.description}
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

// ----- Glowing arc connecting two coords -----
function ArcLine({ from, to, color = ROYAL_BLUE_GLOW }: GlobeArc) {
  const curve = useMemo(() => {
    const start = latLngToVector3(from.lat, from.lng, LAND_RADIUS + 0.02);
    const end = latLngToVector3(to.lat, to.lng, LAND_RADIUS + 0.02);
    const mid = start.clone().add(end).multiplyScalar(0.5);
    const distance = start.distanceTo(end);
    const lift = 1 + distance * 0.35;
    mid.normalize().multiplyScalar((LAND_RADIUS + 0.02) * lift);
    const c = new THREE.QuadraticBezierCurve3(start, mid, end);
    return c;
  }, [from.lat, from.lng, to.lat, to.lng]);

  const geometry = useMemo(() => new THREE.TubeGeometry(curve, 64, 0.008, 8, false), [curve]);
  const glowGeometry = useMemo(() => new THREE.TubeGeometry(curve, 64, 0.018, 8, false), [curve]);

  return (
    <group>
      <mesh geometry={glowGeometry}>
        <meshBasicMaterial color={color} transparent opacity={0.18} depthWrite={false} />
      </mesh>
      <mesh geometry={geometry}>
        <meshBasicMaterial color={color} transparent opacity={0.95} />
      </mesh>
    </group>
  );
}

// ----- Scene container -----
function Scene({
  pins,
  arcs,
  onPinClick,
  autoRotate,
}: InteractiveGlobeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const [topoVisibility, setTopoVisibility] = useState(0);
  const [anyHovered, setAnyHovered] = useState(false);

  useFrame(() => {
    // Reveal topo grid as camera zooms in (closer = more visible)
    const dist = camera.position.length();
    const target = THREE.MathUtils.clamp((5.5 - dist) / 2.0, 0, 1);
    setTopoVisibility((v) => THREE.MathUtils.lerp(v, target, 0.1));
  });

  return (
    <>
      <Stars radius={50} depth={30} count={2200} factor={3.5} saturation={0} fade speed={0.6} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 4, 5]} intensity={1.1} color="#ffffff" />
      <pointLight position={[-4, -2, -4]} intensity={0.6} color={ROYAL_BLUE_GLOW} />
      <pointLight position={[0, 0, 0]} intensity={1.2} color={ROYAL_BLUE_GLOW} distance={3} />

      <group ref={groupRef}>
        <GlassSphere />
        <Suspense fallback={null}>
          <ClayLand />
        </Suspense>
        <TopoGrid visibility={topoVisibility} />

        {arcs?.map((a, i) => (
          <ArcLine key={`arc-${i}`} {...a} />
        ))}

        {pins.map((p, i) => (
          <CrystalPin
            key={`${p.lat}-${p.lng}-${i}`}
            pin={p}
            onClick={() => onPinClick?.(p)}
            onHover={(h) => setAnyHovered(h ? true : false)}
          />
        ))}
      </group>

      <OrbitControls
        enableZoom
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.55}
        zoomSpeed={0.7}
        autoRotate={autoRotate && !anyHovered}
        autoRotateSpeed={0.35}
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
  autoRotate = true,
}: InteractiveGlobeProps) {
  return (
    <div
      className="w-full h-full"
      style={{
        background:
          "radial-gradient(ellipse at 50% 35%, rgba(30, 58, 138, 0.35) 0%, rgba(8, 11, 24, 1) 70%)",
      }}
    >
      <Canvas
        camera={{ position: [0, 0.6, 5], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        dpr={[1, 2]}
      >
        <Scene pins={pins} arcs={arcs} onPinClick={onPinClick} autoRotate={autoRotate} />
      </Canvas>
    </div>
  );
}
