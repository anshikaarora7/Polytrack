'use client';

import React, { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Grid, Center, Html } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { Loader2, AlertCircle, RotateCcw, Box, Eye, Layers, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface AssetViewer3DProps {
  url?: string;
  format?: 'glb' | 'gltf' | 'fbx' | 'auto';
  assetName?: string;
  category?: string;
  polygonCount?: number;
  className?: string;
  showWireframeToggle?: boolean;
  autoRotate?: boolean;
}

interface ModelRendererProps {
  url?: string;
  format?: 'glb' | 'gltf' | 'fbx' | 'auto';
  wireframe: boolean;
  category?: string;
  onError: (err: string) => void;
  onLoaded: () => void;
}

// Procedural fallback model for when no external file URL is provided
function ProceduralStudioModel({ wireframe, category }: { wireframe: boolean; category?: string }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.2;
    }
  });

  const geometry = useMemo(() => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('character') || cat.includes('creature')) {
      return new THREE.CapsuleGeometry(0.8, 1.4, 16, 32);
    } else if (cat.includes('environment') || cat.includes('building')) {
      return new THREE.BoxGeometry(1.6, 2.2, 1.6);
    } else if (cat.includes('vehicle') || cat.includes('prop')) {
      return new THREE.DodecahedronGeometry(1.2, 1);
    }
    return new THREE.IcosahedronGeometry(1.2, 0);
  }, [category]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  return (
    <Center top>
      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial
          color="#6366f1"
          metalness={0.7}
          roughness={0.25}
          wireframe={wireframe}
          flatShading={!wireframe}
        />
      </mesh>
    </Center>
  );
}

// Dynamic Model Loader Component supporting GLB, GLTF, and FBX
function ExternalModelRenderer({ url, format, wireframe, onError, onLoaded }: ModelRendererProps) {
  const [sceneObject, setSceneObject] = useState<THREE.Object3D | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!url) {
      setLoading(false);
      onLoaded();
      return;
    }

    setLoading(true);
    let isCancelled = false;

    // Detect format
    const lowerUrl = url.toLowerCase();
    const isFBX = format === 'fbx' || lowerUrl.endsWith('.fbx');

    if (isFBX) {
      const loader = new FBXLoader();
      loader.load(
        url,
        (fbx) => {
          if (isCancelled) return;
          // Traverse and adjust materials
          fbx.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              mesh.castShadow = true;
              mesh.receiveShadow = true;
            }
          });
          setSceneObject(fbx);
          setLoading(false);
          onLoaded();
        },
        undefined,
        (err) => {
          if (isCancelled) return;
          setLoading(false);
          const msg = err instanceof Error ? err.message : String(err) || 'Unknown error';
          onError(`Failed to parse FBX model: ${msg}`);
        }
      );
    } else {
      const loader = new GLTFLoader();
      loader.load(
        url,
        (gltf) => {
          if (isCancelled) return;
          gltf.scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              mesh.castShadow = true;
              mesh.receiveShadow = true;
            }
          });
          setSceneObject(gltf.scene);
          setLoading(false);
          onLoaded();
        },
        undefined,
        (err) => {
          if (isCancelled) return;
          setLoading(false);
          const msg = err instanceof Error ? err.message : String(err) || 'Unknown error';
          onError(`Failed to load GLTF/GLB model: ${msg}`);
        }
      );
    }

    return () => {
      isCancelled = true;
      if (sceneObject) {
        sceneObject.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.geometry?.dispose();
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m) => m.dispose());
            } else {
              mesh.material?.dispose();
            }
          }
        });
      }
    };
  }, [url, format]);

  // Handle wireframe toggling on loaded scene
  useEffect(() => {
    if (!sceneObject) return;
    sceneObject.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => {
            if ('wireframe' in m) (m as THREE.MeshStandardMaterial).wireframe = wireframe;
          });
        } else if (mesh.material && 'wireframe' in mesh.material) {
          (mesh.material as THREE.MeshStandardMaterial).wireframe = wireframe;
        }
      }
    });
  }, [wireframe, sceneObject]);

  if (loading) {
    return (
      <Html center>
        <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-background/80 backdrop-blur-md border border-border shadow-lg font-mono text-xs text-muted-foreground">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
          <span>Streaming 3D Asset...</span>
        </div>
      </Html>
    );
  }

  if (!sceneObject) return null;

  return (
    <Center top>
      <primitive object={sceneObject} />
    </Center>
  );
}

export default function AssetViewer3D({
  url,
  format = 'auto',
  assetName = '3D Asset',
  category = 'Prop',
  polygonCount = 24500,
  className = 'w-full h-80 min-h-[300px]',
  showWireframeToggle = true,
  autoRotate = false,
}: AssetViewer3DProps) {
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [isRotating, setIsRotating] = useState<boolean>(autoRotate);
  const [lightingPreset, setLightingPreset] = useState<'studio' | 'warm' | 'cyber'>('studio');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hasWebGL, setHasWebGL] = useState<boolean>(true);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [isTabVisible, setIsTabVisible] = useState<boolean>(true);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkMobile = () => setIsMobile(window.innerWidth < 768);
      checkMobile();
      window.addEventListener('resize', checkMobile);

      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReducedMotion(mediaQuery.matches);
      const handleMotion = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mediaQuery.addEventListener('change', handleMotion);

      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        setHasWebGL(Boolean(gl));
      } catch {
        setHasWebGL(false);
      }

      const handleVisibility = () => setIsTabVisible(!document.hidden);
      document.addEventListener('visibilitychange', handleVisibility);

      return () => {
        window.removeEventListener('resize', checkMobile);
        mediaQuery.removeEventListener('change', handleMotion);
        document.removeEventListener('visibilitychange', handleVisibility);
      };
    }
  }, []);

  if (!hasWebGL) {
    return (
      <div className={`flex flex-col items-center justify-center p-6 bg-card/60 border border-border/60 rounded-xl text-center space-y-2 ${className}`}>
        <AlertCircle className="w-8 h-8 text-amber-400" />
        <p className="text-sm font-semibold text-foreground">WebGL Disabled or Unavailable</p>
        <p className="text-xs text-muted-foreground">Rendering static asset card instead.</p>
      </div>
    );
  }

  return (
    <div className={`relative rounded-[12px] overflow-hidden border border-border bg-surface-2 flex flex-col shadow-[var(--shadow-pop)] ${className}`}>
      {/* Top Overlay Badges */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 pointer-events-none">
        <span className="px-2.5 py-1 rounded-[8px] bg-surface/90 border border-border text-[11px] font-mono text-text flex items-center gap-1.5 shadow-xs">
          <Box className="w-3.5 h-3.5 text-accent" strokeWidth={1.75} />
          <span>{assetName}</span>
        </span>
        <span className="px-2 py-0.5 rounded-[6px] bg-surface-2 border border-border text-[10px] font-mono text-text-muted">
          {category}
        </span>
        {polygonCount ? (
          <span className="px-2 py-0.5 rounded-[6px] bg-surface border border-border text-text-muted text-[10px] font-mono hidden sm:inline tabular-nums">
            {polygonCount.toLocaleString()} tris
          </span>
        ) : null}
      </div>

      {/* Top Controls Overlay */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 flex-wrap justify-end">
        {/* Studio Lighting Toggle */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const nextPreset: Record<string, 'studio' | 'warm' | 'cyber'> = {
              studio: 'warm',
              warm: 'cyber',
              cyber: 'studio',
            };
            setLightingPreset(nextPreset[lightingPreset]);
          }}
          className="h-7 px-2 text-[10px] font-mono rounded-[8px] border bg-surface hover:bg-surface-2 text-text-muted transition-colors capitalize"
          title={`Lighting: ${lightingPreset}`}
        >
          <Sun className="w-3 h-3 mr-1 text-warning" strokeWidth={1.75} />
          <span>{lightingPreset}</span>
        </Button>

        {showWireframeToggle && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setWireframe(!wireframe)}
            className={`h-7 px-2 text-[10px] font-mono rounded-[8px] border transition-colors ${
              wireframe ? 'bg-accent text-white border-accent' : 'bg-surface hover:bg-surface-2 text-text-muted'
            }`}
          >
            <Layers className="w-3 h-3 mr-1" strokeWidth={1.75} />
            {wireframe ? 'Shaded' : 'Wireframe'}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsRotating(!isRotating)}
          className={`h-7 px-2 text-[10px] font-mono rounded-[8px] border transition-colors ${
            isRotating ? 'bg-accent-tint text-accent border-accent/30' : 'bg-surface hover:bg-surface-2 text-text-muted'
          }`}
        >
          <RotateCcw className="w-3 h-3 mr-1" strokeWidth={1.75} />
          {isRotating ? 'Pause' : 'Orbit'}
        </Button>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="absolute bottom-3 left-3 right-3 z-10 p-2.5 bg-destructive/20 border border-destructive/40 rounded-lg backdrop-blur-md flex items-center justify-between text-xs text-destructive">
          <div className="flex items-center gap-1.5 truncate">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="truncate">{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-[10px] underline ml-2 shrink-0 hover:text-foreground"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 3D Canvas Stage */}
      <div className="flex-1 w-full h-full min-h-0 relative">
        <Canvas
          dpr={isMobile ? [1, 1.25] : [1, 1.5]}
          camera={{ position: [0, 1.8, 3.8], fov: 45 }}
          gl={{
            antialias: !isMobile,
            alpha: true,
            powerPreference: isMobile ? 'low-power' : 'high-performance',
          }}
          className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
        >
          {/* Dynamic Studio Lighting Presets */}
          {lightingPreset === 'studio' && (
            <>
              <ambientLight intensity={0.6} />
              <directionalLight position={[6, 8, 5]} intensity={1.5} color="#ffffff" castShadow={!isMobile} />
              <directionalLight position={[-6, 4, -4]} intensity={0.8} color="#818cf8" />
              <pointLight position={[0, -2, 2]} intensity={0.6} color="#38bdf8" />
            </>
          )}
          {lightingPreset === 'warm' && (
            <>
              <ambientLight intensity={0.5} />
              <directionalLight position={[6, 8, 5]} intensity={1.8} color="#fef08a" castShadow={!isMobile} />
              <directionalLight position={[-6, 4, -4]} intensity={0.7} color="#fb923c" />
              <pointLight position={[0, -2, 2]} intensity={0.6} color="#f97316" />
            </>
          )}
          {lightingPreset === 'cyber' && (
            <>
              <ambientLight intensity={0.4} />
              <directionalLight position={[6, 8, 5]} intensity={1.6} color="#06b6d4" castShadow={!isMobile} />
              <directionalLight position={[-6, 4, -4]} intensity={1.2} color="#ec4899" />
              <pointLight position={[0, -2, 2]} intensity={0.8} color="#a855f7" />
            </>
          )}

          <Suspense
            fallback={
              <Html center>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-background/80 backdrop-blur-md border border-border text-xs font-mono text-muted-foreground">
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  <span>Mounting Studio Stage...</span>
                </div>
              </Html>
            }
          >
            {url ? (
              <ExternalModelRenderer
                url={url}
                format={format}
                wireframe={wireframe}
                category={category}
                onError={(err) => setErrorMsg(err)}
                onLoaded={() => setErrorMsg(null)}
              />
            ) : (
              <ProceduralStudioModel wireframe={wireframe} category={category} />
            )}
          </Suspense>

          <Grid
            infiniteGrid
            cellSize={0.5}
            sectionSize={2.0}
            cellColor="#1e293b"
            sectionColor="#334155"
            fadeDistance={20}
            fadeStrength={1.5}
          />

          <OrbitControls
            autoRotate={isRotating && !reducedMotion && isTabVisible}
            autoRotateSpeed={1.5}
            enableDamping
            dampingFactor={0.05}
            minDistance={1.2}
            maxDistance={12}
            maxPolarAngle={Math.PI / 2 + 0.05}
            touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
          />
        </Canvas>
      </div>

      {/* Footer Instruction Hint */}
      <div className="px-3 py-1.5 bg-surface border-t border-border flex items-center justify-between text-[10px] font-mono text-text-muted select-none">
        <span>Touch / Drag to Orbit • Pinch to Zoom</span>
        <span className="text-accent font-medium capitalize">{lightingPreset} Light</span>
      </div>
    </div>
  );
}
