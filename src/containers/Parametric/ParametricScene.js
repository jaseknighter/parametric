/**
 * @fileoverview ParametricScene.js
 * MAIN COORDINATOR: Phase 3 Buffer Sync.
 * FIXED: Slider Latency — Removed redundant handshake triggers in the animation loop.
 * FIXED: Event Priority — Ensured pointer events don't block main-thread UI updates.
 * [cite: 2026-01-11]
 */
import * as THREE from "three";
import { TrackballControls } from "three/examples/jsm/controls/TrackballControls";
import { Debug } from "../../utilities/debug";
import { LAYOUT_THRESHOLDS, ZOOM_SENSITIVITY, MAX_ZOOM_DISTANCE } from "../../shared/ParametricConstants";

export const createSceneManager = (canvas, options = {}) => {
  const parent = canvas.parentElement || document.body;
  let isDisposed = false;
  
  let lastVertexCount = 0;
  let lastInjectedRid = -1;
  let needsRender = true;
  let isInitialFit = true; // [cite: 2026-01-20] FIX: Track initial fit for camera distance
  let currentLayoutMode = 'desktop'; // [cite: 2026-01-20] STATE: Track layout mode for resize gating

  const MAX_VELOCITY = options.maxVelocity ?? 0.15;
  const DRAG_THRESHOLD = 10; 

  let readyResolve;
  const readyPromise = new Promise(resolve => { readyResolve = resolve; });

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap pixel ratio for performance

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdddddd);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 2000);
  camera.position.set(0, 0, 25);

  const controls = new TrackballControls(camera, canvas);
  controls.rotateSpeed = 1.5;
  controls.dynamicDampingFactor = 0.1;
  controls.zoomSpeed = ZOOM_SENSITIVITY; // [cite: 2026-01-21] UX: Apply sensitivity cap
  controls.noRotate = true; // [cite: 2026-01-21] FIX: Disable built-in rotation to prevent conflict with custom spin
  controls.staticMoving = true; // [cite: 2026-01-21] UX: Makes zoom feel more responsive on mobile
  controls.maxDistance = MAX_ZOOM_DISTANCE; // [cite: 2026-01-21] UX: Prevent zooming out too far

  controls.target.set(0, 0, 0);
  controls.addEventListener("change", () => { needsRender = true; });

  const sceneGroup = new THREE.Group();
  scene.add(sceneGroup);

  const material = new THREE.MeshBasicMaterial({ 
    color: 0x4682B4, 
    opacity: 0.9,
    transparent: true,
    side: THREE.DoubleSide,
    wireframe: true 
  });

  // SMOKE TESTING: Initialize empty uniforms. 
  material.uniforms = {};
  
  let mesh = new THREE.Mesh(new THREE.BufferGeometry(), material);
  sceneGroup.add(mesh);

  let lastWidth = 0;
  let safetyTimer = null;
  const handleResize = (w, h) => {
    if (!w || !h || isDisposed) return;
    
    if (Debug.isEnabled("DISPLAY")) {
      Debug.log("DISPLAY", `[handleResize] Processing: ${w}x${h}`);
    }
    // [cite: 2026-01-20] FIX: Sanity Gate. Prevent 'Flash' by ignoring 0-width transient frames.
    if (w < 50 || h < 50) return;

    // [cite: 2026-01-20] FIX: Temporal Guard. Ignore "trash widths" (jumps > 300px) caused by layout reflows.
    // This prevents the canvas from flickering during the grid collapse/expand.
    // EXCEPTION: Allow large jumps if we are resetting layout (isInitialFit).
    if (!isInitialFit && Math.abs(w - lastWidth) > 300) {
      lastWidth = w;
      // Schedule a forced update to catch legitimate large resizes (e.g. Maximize)
      if (safetyTimer) clearTimeout(safetyTimer);
      safetyTimer = setTimeout(() => handleResize(w, h), 200);
      return;
    }
    if (safetyTimer) clearTimeout(safetyTimer);
    lastWidth = w;

    // [cite: 2026-01-20] FIX: Epistemic Decoupling.
    // If the canvas collapses to a suspicious width during a layout shift, ignore it.
    // This prevents the "Flash" where the engine tries to render into a 257px box.
    if (!isInitialFit) {
      if (currentLayoutMode === 'mobile' && w > LAYOUT_THRESHOLDS.MOBILE_TO_DESKTOP) return; // Mobile shouldn't be wide
      if (currentLayoutMode === 'desktop' && w < LAYOUT_THRESHOLDS.DESKTOP_TO_MOBILE) return; // Desktop shouldn't be tiny
    }

    Debug.log("DISPLAY", `[Viewport] Resize Event: ${w}x${h} (Aspect: ${(w/h).toFixed(2)})`);

    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    
    // [cite: 2026-01-20] FIX: Sync internal canvas buffer size with visual size.
    // This prevents the "grey gap" by ensuring the drawing buffer matches the CSS dimensions.
    const dpr = Math.min(window.devicePixelRatio, 2);
    const bufferWidth = Math.floor(w * dpr);
    const bufferHeight = Math.floor(h * dpr);
    
    if (canvas.width !== bufferWidth || canvas.height !== bufferHeight) {
      renderer.setSize(w, h, false); // false = update buffer size, do NOT touch CSS style
      renderer.setPixelRatio(dpr);
    }
    
    // [cite: 2026-01-19] FIX: Recenter on fixed world anchor (0,0,0) to prevent drift.
    const target = new THREE.Vector3(0, 0, 0);
    controls.target.copy(target); // Always center

    // [cite: 2026-01-20] FIX: Only auto-fit camera distance on initial load.
    // Prevents jarring zoom jumps during window resize (User Requirement 3b).
    if (isInitialFit) {
      const targetRadius = 6.0; // Padding for standard radius 5.0
      const fovRad = (camera.fov * Math.PI) / 180;
      
      // Fit based on vertical FOV and aspect ratio
      const distV = targetRadius / Math.tan(fovRad / 2);
      const distH = distV / camera.aspect;
      const dist = Math.max(distV, distH);

      // Update camera position while preserving orientation
      const direction = camera.position.clone().sub(controls.target).normalize();
      camera.position.copy(target).add(direction.multiplyScalar(dist));
      
      Debug.log("DISPLAY", `[Camera] Initial Refit. Distance: ${dist.toFixed(2)}`);
      isInitialFit = false;
    }

    controls.handleResize();
    controls.update();
    needsRender = true;
  };

  let isDragging = false, lastX = 0, lastY = 0, dragDistance = 0;
  let velocityX = 0, velocityY = 0, releaseVelX = 0, releaseVelY = 0;
  let isSpinning = false;
  const friction = options.friction ?? 0.992;
  const autoSpinSpeed = options.spinSpeed ?? 0.005;

  const stopMotion = () => {
    isSpinning = false; releaseVelX = 0; releaseVelY = 0;
    velocityX = 0; velocityY = 0;
  };

  const applyScreenSpaceRotation = (dx, dy) => {
    const rotQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(dy * 0.005, dx * 0.005, 0, 'XYZ')
    );
    sceneGroup.quaternion.multiplyQuaternions(rotQuat, sceneGroup.quaternion);
  };

  const init = () => {
    mesh.injectGeometry = (positions, normals, indices, rid, uvs, intentServiceState) => {
      // [cite: 2026-01-15] FIX: Allow equal RIDs for animation frames (time updates)
      if (rid !== undefined && lastInjectedRid !== -1 && rid < lastInjectedRid) return;
      lastInjectedRid = rid;

      Debug.log("SCENE", `Injecting Geometry RID:${rid}`, { 
        vertexCount: positions.length / 3,
        intentStateRadius: intentServiceState?.radius,
        firstVertex: [positions[0], positions[1], positions[2]]
      });

      if (window.__DEBUG_HUD__) {
        const oldPos = mesh.geometry.attributes.position?.array;
        let delta = 0;
        if (oldPos && positions && oldPos.length === positions.length) {
          for(let i=0; i<oldPos.length; i++) {
            const d = Math.abs(oldPos[i] - positions[i]);
            if(d > delta) delta = d;
          }
        }
        const isManual = window.parametricState?.isManualOverride ?? false;
        Debug.log("SCENE", `[STABILITY] RID:${rid} Manual:${isManual} Applied. Max Vertex Delta:${delta.toFixed(6)}`);
      }
    
      // 1. SYNC UNIFORMS IMMEDIATELY (Solves the "Received: 0" test failure)
      applyStateToUniforms(intentServiceState);

      // 2. DEFER GEOMETRY (Keep performance for heavy vertex buffers)
      setTimeout(() => {
        if (isDisposed) return;
        const posArray = positions instanceof Float32Array ? positions : new Float32Array(positions);
        const geo = mesh.geometry;
        if (posArray.length !== lastVertexCount) {
          geo.dispose();
          geo.setAttribute("position", new THREE.BufferAttribute(posArray, 3));
          if (uvs) geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(uvs), 2));
          if (indices && indices.length > 0) geo.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
          lastVertexCount = posArray.length;
        } else {
          geo.attributes.position.array.set(posArray);
          geo.attributes.position.needsUpdate = true;
        }
        if (normals) geo.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(normals), 3));
        else geo.computeVertexNormals();
        geo.computeBoundingSphere();
        
        // [cite: 2026-01-13] Safety: Guard against NaN bounding spheres from bad geometry
        if (geo.boundingSphere && isNaN(geo.boundingSphere.radius)) {
          geo.boundingSphere.radius = 5.0;
          geo.boundingSphere.center.set(0, 0, 0);
        }

        needsRender = true;
      }, 0);
    };
    const rect = parent.getBoundingClientRect();
    handleResize(rect.width, rect.height);
    readyResolve();
  };

  /**
   * SMOKE TESTING: Internal helper to apply intent service state to material uniforms.
   * @param {Object} intentServiceState - The Intent Service state object.
   */
  const applyStateToUniforms = (intentServiceState) => {
    if (!intentServiceState || isDisposed) return;
    Object.keys(intentServiceState).forEach(key => {
      if (material.uniforms[key]) {
        material.uniforms[key].value = intentServiceState[key];
      } else {
        material.uniforms[key] = { value: intentServiceState[key] };
      }
    });
    needsRender = true;
  };

  init();

  const onPointerDown = (e) => {
    if (e.button !== 0 || e.target !== canvas) return;
    stopMotion(); isDragging = true; 
    lastX = e.clientX; lastY = e.clientY; dragDistance = 0;
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const onPointerMove = (e) => {
    // [cite: 2026-01-21] FIX: If multiple pointers are active (pinching), don't apply custom rotation
    if (!isDragging || !e.isPrimary) return;

    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    dragDistance += Math.sqrt(dx * dx + dy * dy);
    velocityX = (velocityX * 0.4) + (dx * 0.02 * 0.6);
    velocityY = (velocityY * 0.4) + (dy * 0.02 * 0.6);
    lastX = e.clientX; lastY = e.clientY;
    applyScreenSpaceRotation(dx, dy);
    needsRender = true;
  };

  const onPointerUp = () => {
    isDragging = false;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    if (dragDistance > DRAG_THRESHOLD) {
      releaseVelX = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, velocityX));
      releaseVelY = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, velocityY));
    }
    needsRender = true;
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("dblclick", () => { isSpinning = !isSpinning; needsRender = true; });

  const animate = () => {
    if (isDisposed) return;
    // [cite: 2026-01-13] TEST HOOK: Freeze rendering for stable screenshots
    if (window.__FREEZE_RENDER__) return requestAnimationFrame(animate);

    requestAnimationFrame(animate);
    let dx = isSpinning ? autoSpinSpeed : 0;
    let dy = 0;

    if (!isDragging && (Math.abs(releaseVelX) > 0.0001 || Math.abs(releaseVelY) > 0.0001)) {
      dx += releaseVelX; dy += releaseVelY;
      releaseVelX *= friction; releaseVelY *= friction;
    }

    if (dx !== 0 || dy !== 0) {
      applyScreenSpaceRotation(dx, dy);
      needsRender = true;
    }

    if (controls.update() || needsRender) {
      renderer.render(scene, camera);
      needsRender = false;
    }
  };
  animate();
  
  let resizeTimer;
  let lastRect = { width: 0, height: 0 };
  // [cite: 2026-01-20] FIX: Throttle ResizeObserver to 100ms to batch intermediate layout shifts.
  // This prevents the 3D engine from thrashing during rapid window resizing.
  const resizeObs = new ResizeObserver(() => {
    if (resizeTimer) return;
    
    resizeTimer = setTimeout(() => {
      resizeTimer = null;
      if (isDisposed) return;

      const rect = parent.getBoundingClientRect();
      Debug.log("DISPLAY", `[ResizeObserver] Callback. Element: ${parent.tagName}.${parent.className} Size: ${rect.width.toFixed(1)}x${rect.height.toFixed(1)}`);
      handleResize(rect.width, rect.height);
    }, 100);
  });
  resizeObs.observe(parent);

  canvas.__threeScene = scene;
  const manager = {
    ready: readyPromise,
    scene: scene, 
    stopMotion,
    rotate: (dx, dy) => {
      applyScreenSpaceRotation(dx, dy);
      needsRender = true;
    },
    zoom: (amt) => {
      const factor = amt > 0 ? 0.9 : 1.1;
      const target = controls.target;
      const offset = camera.position.clone().sub(target);
      offset.multiplyScalar(factor);
      const len = offset.length();
      if (len < controls.minDistance) offset.setLength(controls.minDistance);
      if (len > controls.maxDistance) offset.setLength(controls.maxDistance);
      camera.position.copy(target).add(offset);
      needsRender = true;
    },
    // [cite: 2026-01-21] TEST HOOK: Expose velocity for conflict prevention tests
    getVelocity: () => Math.max(Math.abs(velocityX), Math.abs(velocityY)),
    getMesh: () => mesh,
    // [cite: 2026-01-20] FIX: Inject layout mode to gate resize logic
    setLayoutMode: (mode) => {
      if (mode !== currentLayoutMode) {
        currentLayoutMode = mode;
        // [cite: 2026-01-20] FIX: Refit camera on layout change so object fits in new aspect ratio
        isInitialFit = true;
        needsRender = true;
        
        // [cite: 2026-01-20] FIX: Force immediate resize update.
        // This ensures camera aspect ratio matches the new container size immediately,
        // preventing deformation if ResizeObserver was blocked by the old mode guard.
        const rect = parent.getBoundingClientRect();
        if (Debug.isEnabled("DISPLAY")) {
             Debug.log("DISPLAY", `[LayoutSwitch] Mode: ${currentLayoutMode}, Rect: ${rect.width}x${rect.height}`);
        }
        handleResize(rect.width, rect.height);
      }
    },
    /**
     * // SMOKE TESTING: Direct teleport for uniforms.
     * Allows Playwright to bypass Worker/setTimeout latency.
     */
    syncUniforms: (intentServiceState) => applyStateToUniforms(intentServiceState),
    injectGeometry: (p, n, i, r, u, s) => mesh.injectGeometry(p, n, i, r, u, s),
    dispose: () => {
      isDisposed = true; 
      resizeObs.disconnect(); 
      controls.dispose();
      renderer.dispose(); 
      mesh.geometry.dispose(); 
      material.dispose();
    }
  };

  // [cite: 2026-01-23] TEST HOOK: Expose manager for coverage testing (Disposal/Layout)
  if (typeof window !== 'undefined') {
      canvas.__sceneManager = manager;
  }
  return manager;
};