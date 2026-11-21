'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { X, Box, Layers, RotateCw, ZoomIn, Eye, Sparkles, Download } from 'lucide-react';
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
  const [roughness] = useState<number>(0.25);
  const [metalness] = useState<number>(0.85);

  const getStatusDot = (st: string) => {
    switch (st.toLowerCase()) {
      case 'approved':
        return 'bg-success';
      case 'review':
      case 'submitted':
        return 'bg-info';
      case 'rejected':
        return 'bg-danger';
      default:
        return 'bg-warning';
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 450;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 4.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    container.appendChild(renderer.domElement);

    // Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x5e6ad2, 2.5);
    keyLight.position.set(4, 5, 4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x7b86e8, 2.0);
    rimLight.position.set(-4, 3, -4);
    scene.add(rimLight);

    // Studio Floor Grid
    const grid = new THREE.GridHelper(10, 20, 0x5e6ad2, 0x888888);
    grid.position.y = -1.2;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.2;
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
      color: 0x5e6ad2,
      roughness: roughness,
      metalness: metalness,
      flatShading: true,
      wireframe: wireframe
    });
    const mainMesh = new THREE.Mesh(meshGeo, meshMat);
    turntableGroup.add(mainMesh);

    // Decorative inner wireframe halo
    const haloGeo = new THREE.TorusGeometry(1.6, 0.015, 16, 64);
    const haloMat = new THREE.MeshBasicMaterial({ color: 0x5e6ad2, wireframe: true, transparent: true, opacity: 0.3 });
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
        targetRotY += 0.006;
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
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl bg-surface border border-border rounded-[12px] overflow-hidden shadow-[var(--shadow-pop)] flex flex-col md:flex-row max-h-[90vh]">
        {/* Left: 3D Viewport Stage */}
        <div className="relative flex-1 min-h-[380px] md:min-h-[500px] bg-surface-2 overflow-hidden">
          <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

          {/* Top Stage Badges */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-2 pointer-events-none">
            <span className="px-2.5 py-1 rounded-[8px] bg-surface border border-border text-xs font-mono font-medium text-text flex items-center gap-1.5 shadow-xs">
              <Box className="w-3.5 h-3.5 text-accent" strokeWidth={1.75} />
              <span>3D Turntable Inspection</span>
            </span>
            <span className="px-2 py-0.5 rounded-[6px] bg-surface-2 border border-border text-[11px] font-mono text-text-muted">
              v{versionToDisplay}.0
            </span>
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 bg-surface border border-border p-1 rounded-[8px] text-xs font-mono shadow-xs">
              <button
                type="button"
                onClick={() => setWireframe(!wireframe)}
                className={`px-2 py-1 rounded-[6px] transition-colors ${wireframe ? 'bg-accent text-white font-medium' : 'hover:bg-surface-2 text-text-muted'}`}
              >
                Wireframe: {wireframe ? 'ON' : 'OFF'}
              </button>
              <div className="w-[1px] h-3.5 bg-border" />
              <button
                type="button"
                onClick={() => setAutoRotate(!autoRotate)}
                className={`px-2 py-1 rounded-[6px] transition-colors ${autoRotate ? 'bg-accent-tint text-accent font-medium' : 'hover:bg-surface-2 text-text-muted'}`}
              >
                Orbit: {autoRotate ? 'AUTO' : 'MANUAL'}
              </button>
            </div>

            <div className="text-[11px] font-mono text-text-muted bg-surface px-2.5 py-1 rounded-[8px] border border-border shadow-xs hidden sm:block">
              Drag to Rotate • Scroll to Zoom
            </div>
          </div>
        </div>

        {/* Right: Asset Metadata & Pipeline Panel */}
        <div className="w-full md:w-80 p-5 flex flex-col justify-between border-t md:border-t-0 md:border-l border-border bg-surface">
          <div>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-mono text-accent font-semibold">
                  {categoryToDisplay} Asset
                </span>
                <h3 className="text-lg font-semibold text-text mt-0.5">{nameToDisplay}</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-[6px] hover:bg-surface-2 text-text-muted hover:text-text transition-colors"
                title="Close Viewer"
              >
                <X className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </div>

            {/* Status Pill */}
            <div className="mb-4">
              <div className="text-xs text-text-muted mb-1.5">Review Pipeline Status</div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[8px] text-xs font-medium bg-surface-2 border border-border text-text">
                <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(statusToDisplay || '')}`} />
                <span className="capitalize">{statusToDisplay}</span>
              </div>
            </div>

            {/* Technical Specifications */}
            <div className="space-y-2 mb-6 p-3 rounded-[8px] bg-surface-2 border border-border font-mono text-xs">
              <div className="text-[11px] text-text-muted uppercase tracking-wider font-sans font-semibold mb-1">
                Topology & Shaders
              </div>
              <div className="flex justify-between py-1 border-b border-border text-xs">
                <span className="text-text-muted">Triangles:</span>
                <span className="text-text font-medium tabular-nums">{(polyCountToDisplay || 18500).toLocaleString()} tris</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border text-xs">
                <span className="text-text-muted">Active Version:</span>
                <span className="text-accent font-medium">v{versionToDisplay}.0</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border text-xs">
                <span className="text-text-muted">Texture Space:</span>
                <span className="text-text">PBR 4K Metal/Rough</span>
              </div>
              <div className="flex justify-between py-1 text-xs">
                <span className="text-text-muted">Renderer:</span>
                <span className="text-text">Cycles & EEVEE</span>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="space-y-2 pt-3 border-t border-border">
            {onDownload && (
              <Button
                type="button"
                onClick={onDownload}
                className="w-full bg-accent hover:bg-accent-hover text-white text-xs font-medium py-2 rounded-[8px] flex items-center justify-center gap-1.5 shadow-none"
              >
                <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
                Download Model File
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="w-full rounded-[8px] text-xs"
            >
              Back to Assets
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
