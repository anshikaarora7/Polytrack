'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface Studio3DViewportProps {
  className?: string;
  interactive?: boolean;
  wireframe?: boolean;
  accentColor?: string;
  showGrid?: boolean;
  titleBadge?: string;
  showControls?: boolean;
}

export default function Studio3DViewport({
  className = 'w-full h-full min-h-[350px]',
  interactive = true,
  wireframe = false,
  accentColor = '#6366f1',
  showGrid = true,
  titleBadge = '3D STUDIO ENGINE',
  showControls = true
}: Studio3DViewportProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hasWebGL, setHasWebGL] = useState<boolean>(true);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isRotating, setIsRotating] = useState<boolean>(true);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(60);

  useEffect(() => {
    // Detect prefers-reduced-motion
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReducedMotion(mediaQuery.matches);
    }

    const container = mountRef.current;
    if (!container) return;

    // Check WebGL support
    const checkWebGL = () => {
      try {
        const canvas = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
      } catch {
        return false;
      }
    };

    if (!checkWebGL()) {
      setHasWebGL(false);
      return;
    }

    // Three.js Scene Setup
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 350;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x090d16, 0.04);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 5.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    container.appendChild(renderer.domElement);

    // Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x818cf8, 2.8);
    keyLight.position.set(4, 6, 4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 3.2);
    rimLight.position.set(-5, 3, -4);
    scene.add(rimLight);

    const bottomFillLight = new THREE.PointLight(0xa855f7, 2.0, 10);
    bottomFillLight.position.set(0, -2, 2);
    scene.add(bottomFillLight);

    // Studio Grid Floor
    let gridHelper: THREE.GridHelper | null = null;
    if (showGrid) {
      gridHelper = new THREE.GridHelper(12, 24, 0x6366f1, 0x1e293b);
      gridHelper.position.y = -1.4;
      (gridHelper.material as THREE.Material).transparent = true;
      (gridHelper.material as THREE.Material).opacity = 0.35;
      scene.add(gridHelper);
    }

    // Central 3D Sculpture Group
    const heroGroup = new THREE.Group();
    scene.add(heroGroup);

    // 1. Faceted Icosahedron Outer Core
    const coreGeo = new THREE.IcosahedronGeometry(1.2, 0);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x1e1e38,
      roughness: 0.18,
      metalness: 0.85,
      flatShading: true,
      wireframe: wireframe
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    heroGroup.add(coreMesh);

    // 2. Glowing Wireframe Shell
    const wireGeo = new THREE.IcosahedronGeometry(1.28, 1);
    const wireMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(accentColor),
      wireframe: true,
      transparent: true,
      opacity: 0.45
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    heroGroup.add(wireMesh);

    // 3. Inner Pulsing Core
    const innerGeo = new THREE.OctahedronGeometry(0.65, 0);
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0x6366f1,
      emissive: 0x4338ca,
      emissiveIntensity: 0.8,
      roughness: 0.2,
      metalness: 0.9,
      flatShading: true
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    heroGroup.add(innerMesh);

    // 4. Orbiting Gimbal Ring 1
    const ringGeo1 = new THREE.TorusGeometry(1.85, 0.025, 16, 64);
    const ringMat1 = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0x0284c7,
      emissiveIntensity: 0.5
    });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI / 3;
    heroGroup.add(ring1);

    // 5. Orbiting Gimbal Ring 2
    const ringGeo2 = new THREE.TorusGeometry(2.15, 0.02, 16, 64);
    const ringMat2 = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x7e22ce,
      emissiveIntensity: 0.4
    });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.y = Math.PI / 4;
    ring2.rotation.z = Math.PI / 6;
    heroGroup.add(ring2);

    // 6. Floating Spec Particles
    const particleCount = 45;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 5;
      positions[i + 1] = (Math.random() - 0.5) * 4;
      positions[i + 2] = (Math.random() - 0.5) * 4;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x818cf8,
      size: 0.04,
      transparent: true,
      opacity: 0.7
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Mouse / Touch Interaction State
    let targetRotationX = 0;
    let targetRotationY = 0;
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      if (!interactive) return;
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (isDragging && interactive) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;

        targetRotationY += deltaX * 0.008;
        targetRotationX += deltaY * 0.008;

        previousMousePosition = { x: e.clientX, y: e.clientY };
      } else {
        // Gentle parallax hover response
        const rect = container.getBoundingClientRect();
        const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const normY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
        camera.position.x += (normX * 0.35 - camera.position.x) * 0.05;
        camera.position.y += (1.2 + normY * 0.25 - camera.position.y) * 0.05;
        camera.lookAt(0, 0, 0);
      }
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      if (!interactive) return;
      e.preventDefault();
      camera.position.z = THREE.MathUtils.clamp(camera.position.z + e.deltaY * 0.004, 3.2, 7.5);
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel, { passive: false });

    // Animation Loop
    let animationFrameId: number;
    let lastTime = performance.now();
    let frameCount = 0;
    let lastFpsTime = lastTime;

    const animate = (time: number) => {
      animationFrameId = requestAnimationFrame(animate);

      // FPS tracking
      frameCount++;
      if (time - lastFpsTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastFpsTime = time;
      }

      const delta = (time - lastTime) * 0.001;
      lastTime = time;

      if (!reducedMotion && isRotating) {
        // Continuous slow turntable spin
        targetRotationY += 0.005;

        // Animate gimbal rings at distinct rates
        ring1.rotation.z += 0.012;
        ring2.rotation.x -= 0.008;

        // Pulse inner core gently
        const pulse = 1 + Math.sin(time * 0.002) * 0.06;
        innerMesh.scale.set(pulse, pulse, pulse);

        // Drift particles
        particles.rotation.y += 0.001;
      }

      // Smooth damping of rotation towards target
      heroGroup.rotation.y += (targetRotationY - heroGroup.rotation.y) * 0.08;
      heroGroup.rotation.x += (targetRotationX - heroGroup.rotation.x) * 0.08;

      renderer.render(scene, camera);
    };

    animate(performance.now());

    // Resize Observer
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('wheel', onWheel);

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      // Dispose resources
      coreGeo.dispose();
      coreMat.dispose();
      wireGeo.dispose();
      wireMat.dispose();
      innerGeo.dispose();
      innerMat.dispose();
      ringGeo1.dispose();
      ringMat1.dispose();
      ringGeo2.dispose();
      ringMat2.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      if (gridHelper) {
        gridHelper.geometry.dispose();
        (gridHelper.material as THREE.Material).dispose();
      }
      renderer.dispose();
    };
  }, [interactive, wireframe, accentColor, showGrid, reducedMotion, isRotating]);

  // Fallback for browsers with no WebGL or if explicitly broken
  if (!hasWebGL) {
    return (
      <div className={`relative flex items-center justify-center bg-card/60 border border-border/40 rounded-xl overflow-hidden p-8 ${className}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/5 pointer-events-none" />
        <div className="relative text-center space-y-3 z-10">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center text-primary shadow-lg shadow-primary/20 animate-pulse">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div className="text-sm font-semibold text-foreground tracking-wide">PolyTrack 3D Studio Core</div>
          <div className="text-xs text-muted-foreground max-w-xs">Interactive hardware acceleration fallback active. All studio tracking flows operational.</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-[12px] overflow-hidden select-none bg-surface-2 border border-border shadow-[var(--shadow-pop)] ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 3D Canvas Mount Point */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Studio Overlay Badge */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 pointer-events-none">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-[8px] bg-surface/90 border border-border text-[10px] font-mono font-medium text-text shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-success" />
          <span>{titleBadge}</span>
        </div>
        <div className="px-2 py-0.5 rounded-[8px] bg-surface/90 border border-border text-[9px] font-mono text-text-muted hidden sm:block">
          {fps} FPS
        </div>
      </div>

      {/* Interactive Controls Overlay */}
      <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 bg-surface border border-border p-1 rounded-[8px] text-[10px] font-mono text-text-muted shadow-xs">
        <button
          type="button"
          onClick={() => setIsRotating(!isRotating)}
          className={`px-2 py-0.5 rounded-[6px] transition-colors ${isRotating ? 'bg-accent-tint text-accent font-medium' : 'hover:bg-surface-2 text-text-muted'}`}
          title="Toggle Turntable Rotation"
        >
          {isRotating ? 'Spin: ON' : 'Spin: OFF'}
        </button>
        <div className="w-[1px] h-3 bg-border" />
        <span className="px-1.5 hidden sm:inline text-[9px] text-text-muted">Drag to Orbit • Scroll to Zoom</span>
      </div>
    </div>
  );
}
