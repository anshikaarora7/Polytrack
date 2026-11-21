'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { X, Box, Layers, RotateCw, ZoomIn, Eye, Sparkles, Download, CheckCircle, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AssetTurntableModalProps {
  isOpen?: boolean;
  onClose: () => void;
  asset?: any;
  assetName?: string;
  category?: string;
  versionNumber?: number;
  polygonCount?: number;
  status?: string;
  onDownload?: () => void;
}

export default function AssetTurntableModal({
  isOpen = true,
  onClose,
  asset,
  assetName,
  category = 'Prop',
  versionNumber = 1,
  polygonCount = 18500,
  status = 'Draft',
  onDownload
}: AssetTurntableModalProps) {
  const nameToDisplay = asset?.name || assetName || '3D Asset Model';
  const categoryToDisplay = asset?.category || category;
  const versionToDisplay = asset?.versionCount || asset?.latestVersion?.versionNumber || versionNumber;
  const polyCountToDisplay = asset?.latestVersion?.polygonCount || polygonCount;
  const statusToDisplay = asset?.status || status;

  const mountRef = useRef<HTMLDivElement>(null);
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [roughness, setRoughness] = useState<number>(0.25);
  const [metalness, setMetalness] = useState<number>(0.85);

  useEffect(() => {
    if (!isOpen) return;

    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 450;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0e17, 0.04);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 4.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;

    container.appendChild(renderer.domElement);

    // Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x818cf8, 2.5);
    keyLight.position.set(4, 5, 4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 3.0);
    rimLight.position.set(-4, 3, -4);
    scene.add(rimLight);

    const fillLight = new THREE.PointLight(0xa855f7, 1.8, 10);
    fillLight.position.set(0, -2, 2);
    scene.add(fillLight);

    // Studio Floor Grid
    const grid = new THREE.GridHelper(10, 20, 0x6366f1, 0x1e293b);
    grid.position.y = -1.2;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.4;
    scene.add(grid);

    // Turntable Group
    const turntableGroup = new THREE.Group();
    scene.add(turntableGroup);

    // Category-specific stylized 3D mesh
    let meshGeo: THREE.BufferGeometry;
    if (category.toLowerCase().includes('char')) {
      meshGeo = new THREE.CylinderGeometry(0.5, 0.8, 1.8, 16);
    } else if (category.toLowerCase().includes('env')) {
      meshGeo = new THREE.DodecahedronGeometry(1.2, 1);
    } else {
      meshGeo = new THREE.IcosahedronGeometry(1.2, 1);
    }

    const meshMat = new THREE.MeshStandardMaterial({
      color: 0x222638,
      roughness: roughness,
      metalness: metalness,
      flatShading: true,
      wireframe: wireframe
    });
    const mainMesh = new THREE.Mesh(meshGeo, meshMat);
    turntableGroup.add(mainMesh);

    // Decorative inner wireframe halo
    const haloGeo = new THREE.TorusGeometry(1.6, 0.015, 16, 64);
    const haloMat = new THREE.MeshBasicMaterial({ color: 0x6366f1, wireframe: true, transparent: true, opacity: 0.5 });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.rotation.x = Math.PI / 2;
    halo.position.y = -1.18;
    turntableGroup.add(halo);

    // Interaction handlers
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    let targetRotY = 0;
    let targetRotX = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      targetRotY += dx * 0.01;
      targetRotX += dy * 0.01;
      prevMouse = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      camera.position.z = THREE.MathUtils.clamp(camera.position.z + e.deltaY * 0.005, 2.5, 7.0);
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel, { passive: false });

    // Render loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);

      if (autoRotate && !isDragging) {
        targetRotY += 0.008;
      }

      turntableGroup.rotation.y += (targetRotY - turntableGroup.rotation.y) * 0.08;
      turntableGroup.rotation.x += (targetRotX - turntableGroup.rotation.x) * 0.08;

      renderer.render(scene, camera);
    };

    animate();

    // Resize Observer
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObs = new ResizeObserver(handleResize);
    resizeObs.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      resizeObs.disconnect();
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('wheel', onWheel);

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      meshGeo.dispose();
      meshMat.dispose();
      haloGeo.dispose();
      haloMat.dispose();
      grid.geometry.dispose();
      renderer.dispose();
    };
  }, [isOpen, wireframe, autoRotate, roughness, metalness, category]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#090d16] border border-border/60 rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]">
        {/* Left: 3D Viewport Stage */}
        <div className="relative flex-1 min-h-[380px] md:min-h-[500px] bg-gradient-to-b from-[#0e1322] via-[#090d16] to-[#04060b] overflow-hidden">
          <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

          {/* Top Stage Badges */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 pointer-events-none">
            <span className="px-2.5 py-1 rounded-full bg-background/80 backdrop-blur-md border border-border/60 text-xs font-mono font-medium text-foreground flex items-center gap-1.5 shadow-sm">
              <Box className="w-3.5 h-3.5 text-primary" />
              <span>3D Turntable Inspection</span>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-primary/20 text-primary border border-primary/30 text-[11px] font-mono">
              v{versionToDisplay}.0
            </span>
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 bg-background/80 backdrop-blur-md border border-border/60 p-1 rounded-lg text-xs font-mono">
              <button
                type="button"
                onClick={() => setWireframe(!wireframe)}
                className={`px-2 py-1 rounded transition-colors ${wireframe ? 'bg-primary text-primary-foreground font-medium' : 'hover:bg-accent text-muted-foreground'}`}
              >
                Wireframe: {wireframe ? 'ON' : 'OFF'}
              </button>
              <div className="w-[1px] h-3.5 bg-border/60" />
              <button
                type="button"
                onClick={() => setAutoRotate(!autoRotate)}
                className={`px-2 py-1 rounded transition-colors ${autoRotate ? 'bg-primary/20 text-primary font-medium' : 'hover:bg-accent text-muted-foreground'}`}
              >
                Orbit: {autoRotate ? 'AUTO' : 'MANUAL'}
              </button>
            </div>

            <div className="text-[11px] font-mono text-muted-foreground/80 bg-background/60 backdrop-blur-md px-2.5 py-1 rounded border border-border/40 hidden sm:block">
              Drag to Rotate • Scroll to Zoom
            </div>
          </div>
        </div>

        {/* Right: Asset Metadata & Pipeline Panel */}
        <div className="w-full md:w-80 p-6 flex flex-col justify-between border-t md:border-t-0 md:border-l border-border/60 bg-card/40 backdrop-blur-xl">
          <div>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-mono text-primary font-semibold">
                  {categoryToDisplay} Asset
                </span>
                <h3 className="text-xl font-bold text-foreground mt-0.5">{nameToDisplay}</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                title="Close Viewer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status Pill */}
            <div className="mb-5">
              <div className="text-xs text-muted-foreground mb-1.5">Review Pipeline Status</div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-background/80 border border-border">
                <span className={`w-2 h-2 rounded-full ${
                  (statusToDisplay || '').toLowerCase() === 'approved' ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' :
                  (statusToDisplay || '').toLowerCase() === 'review' || (statusToDisplay || '').toLowerCase() === 'submitted' ? 'bg-blue-400 shadow-[0_0_8px_#60a5fa]' :
                  (statusToDisplay || '').toLowerCase() === 'rejected' ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' :
                  'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
                }`} />
                <span className="capitalize">{statusToDisplay}</span>
              </div>
            </div>

            {/* Technical Specifications */}
            <div className="space-y-3 mb-6 p-3.5 rounded-xl bg-background/50 border border-border/40 font-mono text-xs">
              <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-sans font-semibold">
                Topology & Shaders
              </div>
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">Triangles:</span>
                <span className="text-foreground font-semibold">{(polyCountToDisplay || 18500).toLocaleString()} tris</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">Active Version:</span>
                <span className="text-primary font-semibold">v{versionToDisplay}.0</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">Texture Space:</span>
                <span className="text-foreground">PBR 4K Metal/Rough</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Renderer:</span>
                <span className="text-emerald-400">Cycles & EEVEE</span>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="space-y-2 pt-4 border-t border-border/40">
            {onDownload && (
              <Button
                type="button"
                onClick={onDownload}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2.5 rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Model File
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="w-full rounded-xl"
            >
              Back to Assets
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
