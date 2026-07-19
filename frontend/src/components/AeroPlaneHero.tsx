import React, { useRef, Component, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Environment } from '@react-three/drei';
import * as THREE from 'three';

// ─── Error Boundary ───────────────────────────────────────────────────────────
class WebGLBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

// ─── CSS Fallback (shown when WebGL isn't available) ─────────────────────────
function PlaneFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center relative overflow-hidden" style={{ minHeight: 420 }}>
      {/* Glowing orb */}
      <div
        className="absolute rounded-full"
        style={{
          width: 340,
          height: 340,
          background: 'radial-gradient(ellipse, rgba(59,130,246,0.22) 0%, rgba(6,182,212,0.10) 55%, transparent 80%)',
          animation: 'pulse 3s ease-in-out infinite',
        }}
      />
      {/* Animated SVG plane silhouette */}
      <div
        style={{
          animation: 'floatPlane 4s ease-in-out infinite',
          filter: 'drop-shadow(0 0 24px rgba(59,130,246,0.7)) drop-shadow(0 0 60px rgba(6,182,212,0.3))',
        }}
      >
        <svg viewBox="0 0 220 120" width="320" height="175" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Fuselage */}
          <ellipse cx="110" cy="60" rx="75" ry="14" fill="#0d1b3e" stroke="#3b82f6" strokeWidth="1.2" />
          {/* Nose */}
          <ellipse cx="185" cy="60" rx="14" ry="10" fill="#1a3a7a" />
          {/* Tail */}
          <ellipse cx="35" cy="60" rx="12" ry="8" fill="#0a1628" />
          {/* Main wings */}
          <path d="M 95 60 L 140 18 L 152 22 L 115 60 Z" fill="#1d4ed8" stroke="#3b82f6" strokeWidth="0.8" />
          <path d="M 95 60 L 140 102 L 152 98 L 115 60 Z" fill="#1d4ed8" stroke="#3b82f6" strokeWidth="0.8" />
          {/* Winglets */}
          <path d="M 140 18 L 148 12 L 152 22 Z" fill="#3b82f6" />
          <path d="M 140 102 L 148 108 L 152 98 Z" fill="#3b82f6" />
          {/* Tail fins */}
          <path d="M 38 60 L 28 42 L 38 48 Z" fill="#1e40af" stroke="#60a5fa" strokeWidth="0.6" />
          <path d="M 38 60 L 28 78 L 38 72 Z" fill="#1e40af" stroke="#60a5fa" strokeWidth="0.6" />
          {/* Accent stripe */}
          <line x1="45" y1="54" x2="180" y2="54" stroke="#60a5fa" strokeWidth="1.5" strokeOpacity="0.6" />
          {/* Windows */}
          {[150, 135, 120].map((x, i) => (
            <rect key={i} x={x} y="55" width="8" height="6" rx="2" fill="#60a5fa" fillOpacity="0.8" />
          ))}
          {/* Engine glow */}
          <ellipse cx="118" cy="72" rx="9" ry="5" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="0.8" />
          <ellipse cx="118" cy="48" rx="9" ry="5" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="0.8" />
          {/* Glow emanating from engines */}
          <ellipse cx="109" cy="72" rx="5" ry="3" fill="#3b82f6" fillOpacity="0.5" />
          <ellipse cx="109" cy="48" rx="5" ry="3" fill="#06b6d4" fillOpacity="0.5" />
        </svg>
      </div>
      {/* Particle dots */}
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-blue-400"
          style={{
            width: 3,
            height: 3,
            opacity: 0.35 + Math.random() * 0.3,
            left: `${15 + Math.random() * 70}%`,
            top: `${15 + Math.random() * 70}%`,
            animation: `twinkle ${2 + Math.random() * 3}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 2}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes floatPlane {
          0%, 100% { transform: translateY(0px) rotate(-2deg); }
          50%       { transform: translateY(-18px) rotate(1deg); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50%       { opacity: 0.8;  transform: scale(1.4); }
        }
      `}</style>
    </div>
  );
}

// ─── 3-D Aeroplane mesh ───────────────────────────────────────────────────────
function AeroplaneMesh() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.4) * 0.08;
    groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.04 - 0.12;
  });

  const fuselageMat = new THREE.MeshPhysicalMaterial({
    color: '#0f172a', metalness: 0.9, roughness: 0.1,
    clearcoat: 1, clearcoatRoughness: 0.05,
    emissive: '#0d2a5e', emissiveIntensity: 0.15,
  });
  const wingMat = new THREE.MeshPhysicalMaterial({
    color: '#0d1b3e', metalness: 0.95, roughness: 0.08,
    clearcoat: 0.8, clearcoatRoughness: 0.1,
    emissive: '#1a3a7a', emissiveIntensity: 0.10,
  });
  const accentMat = new THREE.MeshPhysicalMaterial({
    color: '#3b82f6', metalness: 0.5, roughness: 0.2,
    emissive: '#3b82f6', emissiveIntensity: 0.6,
  });
  const engineMat = new THREE.MeshPhysicalMaterial({
    color: '#1e293b', metalness: 0.9, roughness: 0.1, clearcoat: 1,
  });
  const windowMat = new THREE.MeshPhysicalMaterial({
    color: '#60a5fa', emissive: '#3b82f6', emissiveIntensity: 0.8,
    metalness: 0.1, roughness: 0,
    transmission: 0.6, transparent: true, opacity: 0.9,
  });

  return (
    <group ref={groupRef} rotation={[0, Math.PI * 0.1, 0]}>
      {/* Fuselage body */}
      <mesh material={fuselageMat} castShadow>
        <cylinderGeometry args={[0.22, 0.28, 3.8, 24]} />
      </mesh>
      {/* Nose */}
      <mesh position={[0, 1.95, 0]} material={fuselageMat} castShadow>
        <coneGeometry args={[0.22, 0.9, 24]} />
      </mesh>
      {/* Tail taper */}
      <mesh position={[0, -2.1, 0]} rotation={[Math.PI, 0, 0]} material={fuselageMat} castShadow>
        <coneGeometry args={[0.28, 0.6, 24]} />
      </mesh>
      {/* Accent stripe */}
      <mesh position={[0.23, 0, 0]} material={accentMat}>
        <boxGeometry args={[0.025, 3.5, 0.025]} />
      </mesh>
      {/* Cockpit windows */}
      <mesh position={[0, 1.5, 0.18]} material={windowMat}>
        <boxGeometry args={[0.28, 0.18, 0.04]} />
      </mesh>
      {/* Cabin windows */}
      {[-0.5, -0.1, 0.3, 0.7, 1.1].map((y, i) => (
        <mesh key={i} position={[0.23, y, 0.06]} material={windowMat}>
          <boxGeometry args={[0.04, 0.1, 0.1]} />
        </mesh>
      ))}
      {/* Left wing */}
      <mesh position={[-1.6, 0.1, 0]} rotation={[0, 0, 0.06]} material={wingMat} castShadow>
        <boxGeometry args={[2.6, 0.06, 0.85]} />
      </mesh>
      {/* Right wing */}
      <mesh position={[1.6, 0.1, 0]} rotation={[0, 0, -0.06]} material={wingMat} castShadow>
        <boxGeometry args={[2.6, 0.06, 0.85]} />
      </mesh>
      {/* Wing accent lines */}
      <mesh position={[-1.6, 0.14, 0.32]} material={accentMat}>
        <boxGeometry args={[2.4, 0.015, 0.015]} />
      </mesh>
      <mesh position={[1.6, 0.14, 0.32]} material={accentMat}>
        <boxGeometry args={[2.4, 0.015, 0.015]} />
      </mesh>
      {/* Winglets */}
      <mesh position={[-2.88, 0.22, 0]} rotation={[0, 0, -0.4]} material={wingMat} castShadow>
        <boxGeometry args={[0.06, 0.42, 0.4]} />
      </mesh>
      <mesh position={[2.88, 0.22, 0]} rotation={[0, 0, 0.4]} material={wingMat} castShadow>
        <boxGeometry args={[0.06, 0.42, 0.4]} />
      </mesh>
      {/* Engines */}
      <mesh position={[-1.1, -0.08, 0.42]} material={engineMat} castShadow>
        <cylinderGeometry args={[0.16, 0.14, 0.7, 16]} />
      </mesh>
      <mesh position={[-1.1, 0.28, 0.42]} material={accentMat}>
        <cylinderGeometry args={[0.16, 0.16, 0.04, 16]} />
      </mesh>
      <mesh position={[1.1, -0.08, 0.42]} material={engineMat} castShadow>
        <cylinderGeometry args={[0.16, 0.14, 0.7, 16]} />
      </mesh>
      <mesh position={[1.1, 0.28, 0.42]} material={accentMat}>
        <cylinderGeometry args={[0.16, 0.16, 0.04, 16]} />
      </mesh>
      {/* Tail */}
      <mesh position={[0, -1.9, -0.32]} rotation={[0.15, 0, 0]} material={wingMat} castShadow>
        <boxGeometry args={[0.06, 0.7, 0.5]} />
      </mesh>
      <mesh position={[0, -1.62, -0.22]} rotation={[0.15, 0, 0]} material={accentMat}>
        <boxGeometry args={[0.065, 0.1, 0.06]} />
      </mesh>
      <mesh position={[-0.48, -2.05, -0.22]} rotation={[0.08, 0, 0.05]} material={wingMat} castShadow>
        <boxGeometry args={[0.8, 0.05, 0.32]} />
      </mesh>
      <mesh position={[0.48, -2.05, -0.22]} rotation={[0.08, 0, -0.05]} material={wingMat} castShadow>
        <boxGeometry args={[0.8, 0.05, 0.32]} />
      </mesh>
      {/* Engine glow lights */}
      <pointLight position={[-1.1, -0.3, 0.5]} color="#3b82f6" intensity={0.8} distance={2} />
      <pointLight position={[1.1, -0.3, 0.5]} color="#06b6d4" intensity={0.8} distance={2} />
    </group>
  );
}

function CloudParticles() {
  const count = 60;
  const positions = React.useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3]     = (Math.random() - 0.5) * 18;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 14;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 10 - 3;
    }
    return arr;
  }, []);

  const ref = useRef<THREE.Points>(null);
  useFrame((s) => {
    if (ref.current) ref.current.rotation.y = s.clock.elapsedTime * 0.015;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#3b82f6" size={0.04} transparent opacity={0.4} sizeAttenuation />
    </points>
  );
}

// ─── WebGL canvas ─────────────────────────────────────────────────────────────
function PlaneCanvas() {
  return (
    <Canvas
      camera={{ position: [5, 2, 8], fov: 38 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 10, 5]} intensity={1.2} color="#ffffff" castShadow />
      <directionalLight position={[-5, -3, -5]} intensity={0.4} color="#1a4fbd" />
      <pointLight position={[0, 5, 0]} intensity={0.6} color="#60a5fa" distance={12} />
      <pointLight position={[0, -5, 0]} intensity={0.3} color="#0d2a5e" distance={10} />
      <Environment preset="city" />
      <Float speed={1.2} rotationIntensity={0.2} floatIntensity={0.5} floatingRange={[-0.15, 0.15]}>
        <AeroplaneMesh />
      </Float>
      <CloudParticles />
    </Canvas>
  );
}

// ─── WebGL availability check ─────────────────────────────────────────────────
function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      (canvas as any).getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return false;
    // Confirm the context isn't immediately lost (headless / no GPU)
    if (gl.isContextLost()) return false;
    // Try a trivial GPU operation to confirm the driver is real
    const buf = gl.createBuffer();
    if (!buf) return false;
    gl.deleteBuffer(buf);
    return true;
  } catch {
    return false;
  }
}

// ─── Public export ────────────────────────────────────────────────────────────
export default function AeroPlaneHero() {
  const webgl = React.useMemo(() => supportsWebGL(), []);

  return (
    <div className="w-full h-full" style={{ minHeight: 420 }}>
      {webgl ? (
        <WebGLBoundary fallback={<PlaneFallback />}>
          <PlaneCanvas />
        </WebGLBoundary>
      ) : (
        <PlaneFallback />
      )}
    </div>
  );
}
