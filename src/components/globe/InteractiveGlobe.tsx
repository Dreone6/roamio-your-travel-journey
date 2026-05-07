import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sphere, Html } from "@react-three/drei";
import * as THREE from "three";

interface GlobePin {
  lat: number;
  lng: number;
  label: string;
  category: string;
}

interface InteractiveGlobeProps {
  pins: GlobePin[];
  onPinClick?: (pin: GlobePin) => void;
  autoRotate?: boolean;
}

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function GlobeMesh({ pins, onPinClick }: { pins: GlobePin[]; onPinClick?: (pin: GlobePin) => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.08;
    }
    if (glowRef.current) {
      glowRef.current.rotation.y += delta * 0.08;
    }
  });

  const pinPositions = useMemo(
    () => pins.map((p) => ({ ...p, pos: latLngToVector3(p.lat, p.lng, 2.02) })),
    [pins]
  );

  return (
    <group>
      {/* Atmosphere glow */}
      <Sphere ref={glowRef} args={[2.15, 64, 64]}>
        <meshBasicMaterial color="#26d9a0" transparent opacity={0.04} side={THREE.BackSide} />
      </Sphere>

      {/* Globe body */}
      <Sphere ref={meshRef} args={[2, 64, 64]}>
        <meshStandardMaterial
          color="#0d1521"
          roughness={0.85}
          metalness={0.15}
          emissive="#0a2a3a"
          emissiveIntensity={0.3}
        />
      </Sphere>

      {/* Grid lines */}
      <group>
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * Math.PI) / 6;
          return (
            <mesh key={`lng-${i}`} rotation={[0, angle, 0]}>
              <torusGeometry args={[2.005, 0.002, 8, 100]} />
              <meshBasicMaterial color="#26d9a0" transparent opacity={0.08} />
            </mesh>
          );
        })}
        {Array.from({ length: 7 }).map((_, i) => {
          const lat = -60 + i * 20;
          const r = 2.005 * Math.cos((lat * Math.PI) / 180);
          const y = 2.005 * Math.sin((lat * Math.PI) / 180);
          return (
            <mesh key={`lat-${i}`} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[r - 0.002, r + 0.002, 100]} />
              <meshBasicMaterial color="#26d9a0" transparent opacity={0.08} side={THREE.DoubleSide} />
            </mesh>
          );
        })}
      </group>

      {/* Pins */}
      {pinPositions.map((pin, i) => (
        <group key={i} position={pin.pos}>
          <mesh onClick={() => onPinClick?.(pin)}>
            <sphereGeometry args={[0.04, 16, 16]} />
            <meshStandardMaterial
              color={pin.category === "wishlist" ? "#f97316" : "#26d9a0"}
              emissive={pin.category === "wishlist" ? "#f97316" : "#26d9a0"}
              emissiveIntensity={0.8}
            />
          </mesh>
          {/* Pin glow */}
          <mesh>
            <sphereGeometry args={[0.07, 16, 16]} />
            <meshBasicMaterial
              color={pin.category === "wishlist" ? "#f97316" : "#26d9a0"}
              transparent
              opacity={0.15}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export default function InteractiveGlobe({ pins, onPinClick, autoRotate = true }: InteractiveGlobeProps) {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 1, 5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 3, 5]} intensity={0.8} color="#ffffff" />
        <pointLight position={[-5, -3, -5]} intensity={0.3} color="#26d9a0" />
        <GlobeMesh pins={pins} onPinClick={onPinClick} />
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          autoRotate={autoRotate}
          autoRotateSpeed={0.5}
          minDistance={3.5}
          maxDistance={8}
        />
      </Canvas>
    </div>
  );
}
