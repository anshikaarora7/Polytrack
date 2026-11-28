'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

interface SceneProps {
  reducedMotion: boolean;
  isTabVisible: boolean;
}

function FloatingParticles({ count = 80, reducedMotion }: { count?: number; reducedMotion: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);

  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const primaryColor = new THREE.Color('#818cf8');
    const accentColor = new THREE.Color('#38bdf8');
    const glowColor = new THREE.Color('#c084fc');

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;

      const mixed = primaryColor.clone().lerp(i % 2 === 0 ? accentColor : glowColor, Math.random());
      col[i * 3] = mixed.r;
      col[i * 3 + 1] = mixed.g;
      col[i * 3 + 2] = mixed.b;
    }
    return [pos, col];
  }, [count]);

  useFrame((state, delta) => {
    if (reducedMotion || !pointsRef.current) return;
    pointsRef.current.rotation.y += delta * 0.03;
    pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.05;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        vertexColors
        transparent
        opacity={0.65}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

function HeroPolyhedron({ reducedMotion, isTabVisible }: SceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const wireRef = useRef<THREE.Mesh>(null);
  const ringRef1 = useRef<THREE.Mesh>(null);
  const ringRef2 = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (!isTabVisible || reducedMotion) return;

    const time = state.clock.getElapsedTime();

    // Mouse parallax
    const targetX = (state.pointer.x * 0.35);
    const targetY = (state.pointer.y * 0.25);

    if (groupRef.current) {
      groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, targetX + time * 0.12, 2.5, delta);
      groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, -targetY + Math.sin(time * 0.4) * 0.08, 2.5, delta);
      groupRef.current.position.y = Math.sin(time * 0.7) * 0.15;
    }

    if (coreRef.current) {
      coreRef.current.rotation.y += delta * 0.15;
      coreRef.current.rotation.z += delta * 0.08;
    }

    if (wireRef.current) {
      wireRef.current.rotation.y -= delta * 0.22;
      wireRef.current.rotation.x += delta * 0.12;
    }

    if (ringRef1.current) {
      ringRef1.current.rotation.x = time * 0.35;
      ringRef1.current.rotation.y = time * 0.2;
    }

    if (ringRef2.current) {
      ringRef2.current.rotation.z = -time * 0.28;
      ringRef2.current.rotation.y = time * 0.18;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Outer Gimbal Ring 1 */}
      <mesh ref={ringRef1}>
        <torusGeometry args={[2.5, 0.015, 16, 64]} />
        <meshBasicMaterial color="#6366f1" transparent opacity={0.35} />
      </mesh>

      {/* Outer Gimbal Ring 2 */}
      <mesh ref={ringRef2} rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[2.85, 0.012, 16, 64]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.25} />
      </mesh>

      {/* Wireframe Icosahedron Shell */}
      <mesh ref={wireRef} scale={1.85}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial
          color="#818cf8"
          wireframe
          transparent
          opacity={0.3}
        />
      </mesh>

      {/* Faceted Low-Poly Core */}
      <mesh ref={coreRef} scale={1.35}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color="#1e1b4b"
          roughness={0.2}
          metalness={0.9}
          flatShading
          emissive="#312e81"
          emissiveIntensity={0.35}
        />
      </mesh>

      {/* Glowing Inner Center Light */}
      <pointLight color="#818cf8" intensity={4} distance={6} />
    </group>
  );
}

export default function LoginHeroBackground3D() {
  const [hasWebGL, setHasWebGL] = useState<boolean>(true);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [isTabVisible, setIsTabVisible] = useState<boolean>(true);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    // Check mobile viewport & reduced motion preference
    if (typeof window !== 'undefined') {
      setIsMobile(window.innerWidth < 768);
      const handleResize = () => setIsMobile(window.innerWidth < 768);
      window.addEventListener('resize', handleResize);

      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReducedMotion(mediaQuery.matches);
      const handleMotionChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mediaQuery.addEventListener('change', handleMotionChange);

      // Check WebGL availability
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        setHasWebGL(Boolean(gl));
      } catch {
        setHasWebGL(false);
      }

      // Page visibility listener
      const handleVisibilityChange = () => {
        setIsTabVisible(!document.hidden);
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        window.removeEventListener('resize', handleResize);
        mediaQuery.removeEventListener('change', handleMotionChange);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, []);

  if (!hasWebGL) {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-hidden bg-radial from-primary/10 via-background to-background" />
    );
  }

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
      {/* Subtle Studio Vignette */}
      <div className="absolute inset-0 bg-radial from-transparent via-[#0B0C0E]/40 to-[#0B0C0E]/90 pointer-events-none" />

      {/* Canvas */}
      <Canvas
        dpr={isMobile ? [1, 1.25] : [1, 1.5]}
        camera={{ position: [0, 0, 6], fov: 45 }}
        gl={{
          antialias: !isMobile,
          alpha: true,
          powerPreference: isMobile ? 'low-power' : 'high-performance',
        }}
        className="w-full h-full"
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 8, 5]} intensity={1.2} color="#ffffff" />
        <directionalLight position={[-5, -4, -2]} intensity={0.8} color="#5e6ad2" />
        <pointLight position={[0, -2, 2]} intensity={1.0} color="#7b86e8" />

        <Float speed={reducedMotion ? 0 : 1.2} rotationIntensity={reducedMotion ? 0 : 0.3} floatIntensity={reducedMotion ? 0 : 0.5}>
          <HeroPolyhedron reducedMotion={reducedMotion} isTabVisible={isTabVisible} />
        </Float>

        <FloatingParticles count={isMobile ? 25 : 50} reducedMotion={reducedMotion} />
      </Canvas>
    </div>
  );
}
