import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { ThemeMode } from '../types/clarity';

interface ClarityCore3DProps {
  theme: ThemeMode;
  activeAgentsCount: number;
  workloadStatus: 'Balanced' | 'Elevated Load' | 'Recovery Recommended';
  focusMode: 'balanced' | 'focus' | 'decision' | 'recovery';
  onSelectMode: (mode: 'balanced' | 'focus' | 'decision' | 'recovery') => void;
}

const MODE_COLORS: Record<ClarityCore3DProps['focusMode'], number> = {
  balanced: 0x3b82f6,
  focus: 0x06b6d4,
  decision: 0x8b5cf6,
  recovery: 0x10b981,
};

export function ClarityCore3D({
  theme,
  activeAgentsCount,
  workloadStatus,
  focusMode,
  onSelectMode,
}: ClarityCore3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const modeRef = useRef(focusMode);
  const themeRef = useRef(theme);
  const [webglError, setWebglError] = useState(false);

  modeRef.current = focusMode;
  themeRef.current = theme;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let frameId = 0;
    let disposed = false;

    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas').getContext('webgl2');
        if (!probe) return true;
        const ext = probe.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param));
        probe.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = false;

    const width = Math.max(260, container.clientWidth);
    const height = Math.max(240, container.clientHeight);
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglError(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    const scene = new THREE.Scene();
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.55, 6.2);
    camera.lookAt(0, 0, 0);

    // 3-point studio lighting with warm/cool contrast
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 1.1);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1e6, 2.2);
    keyLight.position.set(4, 5, 5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x60a5fa, 1.6);
    rimLight.position.set(-4, -2, -4);
    scene.add(rimLight);

    // Composite 3-12 part procedural CLARITY CORE assembly
    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // 1. Primary inner crystalline polyhedron
    const innerGeo = new THREE.OctahedronGeometry(0.82, 1);
    const innerMat = new THREE.MeshPhysicalMaterial({
      color: MODE_COLORS[focusMode],
      metalness: 0.2,
      roughness: 0.18,
      clearcoat: 1.0,
      clearcoatRoughness: 0.12,
      emissive: MODE_COLORS[focusMode],
      emissiveIntensity: 0.35,
    });
    const innerCore = new THREE.Mesh(innerGeo, innerMat);
    coreGroup.add(innerCore);

    // 2. Wireframe precision lattice shell
    const cageGeo = new THREE.IcosahedronGeometry(1.12, 1);
    const cageMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.85,
      roughness: 0.25,
      wireframe: true,
      transparent: true,
      opacity: 0.45,
    });
    const cageMesh = new THREE.Mesh(cageGeo, cageMat);
    coreGroup.add(cageMesh);

    // 3. Three articulated metallic orbital gimbal rings
    const ringMatPrimary = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      metalness: 0.92,
      roughness: 0.2,
    });
    const ringMatAccent = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      metalness: 0.75,
      roughness: 0.28,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.25,
    });

    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.52, 0.032, 16, 72), ringMatPrimary);
    ring1.rotation.x = Math.PI / 3;
    coreGroup.add(ring1);

    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.86, 0.025, 16, 72), ringMatAccent);
    ring2.rotation.y = Math.PI / 4;
    ring2.rotation.x = -Math.PI / 5;
    coreGroup.add(ring2);

    const ring3 = new THREE.Mesh(new THREE.TorusGeometry(2.18, 0.018, 12, 84), ringMatPrimary);
    ring3.rotation.x = Math.PI / 2.2;
    ring3.rotation.z = Math.PI / 6;
    coreGroup.add(ring3);

    // 4. Seven specialized agent satellite nodes mounted on orbit
    const nodeGeo = new THREE.SphereGeometry(0.085, 16, 16);
    const nodeColors = [0x3b82f6, 0x06b6d4, 0x8b5cf6, 0x10b981, 0xf59e0b, 0xec4899, 0x6366f1];
    const satelliteMeshes: THREE.Mesh[] = [];
    const satelliteMaterials: THREE.MeshStandardMaterial[] = [];

    for (let i = 0; i < 7; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: nodeColors[i],
        metalness: 0.4,
        roughness: 0.22,
        emissive: nodeColors[i],
        emissiveIntensity: 0.4,
      });
      const sat = new THREE.Mesh(nodeGeo, mat);
      satelliteMaterials.push(mat);
      satelliteMeshes.push(sat);
      coreGroup.add(sat);
    }

    // 5. Subtle floor grounding ring (contact plane)
    const groundRingGeo = new THREE.RingGeometry(1.3, 2.35, 64);
    const groundRingMat = new THREE.MeshBasicMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const groundRing = new THREE.Mesh(groundRingGeo, groundRingMat);
    groundRing.rotation.x = -Math.PI / 2;
    groundRing.position.y = -2.25;
    scene.add(groundRing);

    const targetColor = new THREE.Color();
    const startTime = performance.now();
    let lastTime = startTime;
    let pointerX = 0;
    let pointerY = 0;

    const handlePointerMove = (ev: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointerX = ((ev.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      pointerY = -(((ev.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1);
    };
    renderer.domElement.addEventListener('pointermove', handlePointerMove);

    const handleResize = () => {
      if (!mountRef.current || disposed) return;
      const w = Math.max(260, mountRef.current.clientWidth);
      const h = Math.max(240, mountRef.current.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function tick() {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      const elapsed = (now - startTime) / 1000;
      lastTime = now;

      const desiredHex = MODE_COLORS[modeRef.current];
      targetColor.setHex(desiredHex);
      innerMat.color.lerp(targetColor, 1 - Math.exp(-5 * dt));
      innerMat.emissive.lerp(targetColor, 1 - Math.exp(-5 * dt));
      ringMatAccent.color.lerp(targetColor, 1 - Math.exp(-4 * dt));

      const speedFactor = prefersReducedMotion ? 0.15 : modeRef.current === 'recovery' ? 0.55 : 1.0;

      innerCore.rotation.y += dt * 0.45 * speedFactor;
      innerCore.rotation.x += dt * 0.18 * speedFactor;
      cageMesh.rotation.y -= dt * 0.25 * speedFactor;

      ring1.rotation.z += dt * 0.35 * speedFactor;
      ring2.rotation.y += dt * 0.28 * speedFactor;
      ring3.rotation.z -= dt * 0.22 * speedFactor;

      const damp = 1 - Math.exp(-4 * dt);
      coreGroup.rotation.y += (pointerX * 0.25 - coreGroup.rotation.y) * damp;
      coreGroup.rotation.x += (pointerY * 0.15 - coreGroup.rotation.x) * damp;

      for (let i = 0; i < satelliteMeshes.length; i++) {
        const angle = (i / 7) * Math.PI * 2 + elapsed * (0.35 + (i % 2) * 0.12) * speedFactor;
        const radius = i % 2 === 0 ? 1.86 : 2.18;
        const tilt = i % 2 === 0 ? 0.45 : -0.38;
        satelliteMeshes[i].position.set(
          Math.cos(angle) * radius,
          Math.sin(angle * 1.3) * 0.65 + Math.sin(elapsed + i) * 0.05,
          Math.sin(angle) * radius * Math.cos(tilt)
        );
      }

      renderer.render(scene, camera);

      if (prefersReducedMotion) return;
      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      innerGeo.dispose();
      innerMat.dispose();
      cageGeo.dispose();
      cageMat.dispose();
      ringMatPrimary.dispose();
      ringMatAccent.dispose();
      nodeGeo.dispose();
      satelliteMaterials.forEach((m) => m.dispose());
      groundRingGeo.dispose();
      groundRingMat.dispose();
      envRT.dispose();
      renderer.dispose();
    };
  }, []);

  const modes: Array<{ id: ClarityCore3DProps['focusMode']; label: string }> = [
    { id: 'balanced', label: 'Balanced' },
    { id: 'focus', label: 'Deep Focus' },
    { id: 'decision', label: 'Decision' },
    { id: 'recovery', label: 'Recovery' },
  ];

  return (
    <section
      aria-label="CLARITY CORE 3D Intelligence System"
      className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#0D111A]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5 dark:border-white/10">
        <div>
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            CLARITY CORE Intelligence
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {activeAgentsCount} specialized agents coordinated · {workloadStatus}
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-white/5" role="group" aria-label="Core operating mode">
          {modes.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelectMode(m.id)}
              className={`whitespace-nowrap shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                focusMode === m.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative h-[265px] w-full bg-gradient-to-b from-slate-100/70 to-slate-200/40 dark:from-[#0B0F18] dark:to-[#090B10]">
        {webglError ? (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center">
            <div className="h-24 w-24 rounded-full border border-blue-500/40 bg-blue-500/10 flex items-center justify-center">
              <span className="font-display text-sm font-semibold text-blue-600 dark:text-blue-400">CORE</span>
            </div>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              CLARITY CORE active in 2D safe mode ({focusMode}).
            </p>
          </div>
        ) : (
          <div
            ref={mountRef}
            data-testid="clarity-core-canvas"
            data-mode={focusMode}
            className="h-full w-full"
          />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-5 py-2.5 text-xs text-slate-600 dark:border-white/10 dark:text-slate-400">
        <span>Move pointer over core to inspect orbital telemetry</span>
        <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
          Mode: {focusMode.charAt(0).toUpperCase() + focusMode.slice(1)}
        </span>
      </div>
    </section>
  );
}
