/**
 * @fileoverview ParametricManager.js
 * COORDINATOR: Orchestrates Worker messages and Scene injection.
 * FIXED: Bridge manualFormula and globalScale to Worker.
 * FIXED: Explicitly set 'CALCULATE' type for Worker processing.
 * [cite: 2026-01-12]
 */
import { getWorkerDataPacket } from "./ParametricLogic";
import { intentService } from "../../services/ParametricIntentService";
import { FormulaEvents, FormulaMode } from "../../shared/ParametricConstants";
import { Debug } from "../../utilities/debug";
import { FeatureFlags } from "../../shared/featureFlagUtils";
import { FEATURE_FLAGS } from "../../shared/FEATURE_FLAGS";

export const createParametricManager = (workerLoader, sceneRef, onStatus) => {
  const instanceId = Math.random().toString(36).substring(7);
  let isDisposed = false;
  let hasResponded = false;
  let highestRidProcessed = -1; // [cite: 2026-01-16] FIX: Monotonic Guard
  let lastDispatchedRid = -1;   // [cite: 2026-01-17] MVA: Track latest intent for flush

  // [cite: 2026-01-24] TEST HANDSHAKE: Reset global flag on init
  if (typeof window !== 'undefined') {
    window.workerReady = false;
    window.__PARAMETRIC_READY__ = false; // [cite: 2026-01-24] ALIAS: Signal-based testing
  }

  // [cite: 2026-01-27] SAFARI RESILIENCE: Retry worker load on transient fetch failure
  let worker;
  try {
    worker = workerLoader();
  } catch (e) {
    Debug.warn("WORKER", "⚠️ Worker load failed (Safari FetchEvent?). Retrying once...", e);
    try {
      worker = workerLoader();
    } catch (retryErr) {
      Debug.error("WORKER", "🚨 Fatal Worker Load Failure:", retryErr);
      throw retryErr;
    }
  }

  Debug.log("WORKER", `🏗️ [Manager] New Instance Created: ${instanceId}`);

  /**
   * 🛰️ FLAG SYNC: Authoritative push to worker
   * [cite: 2026-01-27] v0.5.2: Protect worker from URL-param injection (Safari Safe)
   */
  const syncFlagsToWorker = () => {
    const workerContextFlags = {};
    // Extract only the logic flags the worker needs to stay lean
    Object.keys(FEATURE_FLAGS).forEach(key => {
      workerContextFlags[key] = FeatureFlags.isEnabled(key);
    });
    
    worker.postMessage({ 
      type: 'UPDATE_FLAGS', 
      flags: workerContextFlags 
    });
  };

  // Initial sync
  syncFlagsToWorker();

  // Patch FeatureFlags.setFlag to auto-sync the worker
  const originalSetFlag = FeatureFlags.setFlag.bind(FeatureFlags);
  FeatureFlags.setFlag = (key, enable) => {
    originalSetFlag(key, enable);
    syncFlagsToWorker();
  };

  const thunkScene = () => (typeof sceneRef === 'function' ? sceneRef() : sceneRef);

  let handshakeTimer = setTimeout(() => {
    if (!isDisposed && !hasResponded) {
      onStatus?.({ status: 'ERROR', error: 'Worker Handshake Timeout' });
    }
  }, 5000);

  worker.postMessage("PING");

  worker.onmessage = (e) => {
    if (!e || !e.data) return;
    const msg = e.data;
    
    // Guard against non-object messages (like "ALIVE")
    const type = (typeof msg === 'object') ? msg.type : null;
    const rid = (typeof msg === 'object') ? msg.rid : undefined;

    if (msg === "ALIVE" || type === "WORKER_READY") {
      hasResponded = true;
      if (handshakeTimer) clearTimeout(handshakeTimer);
      onStatus?.({ status: 'READY' });
      return;
    }

    if (type === 'DEBUG_TRACE') {
      const method = msg.level === 'error' ? 'error' : 'log';
      // Force call to debug utility; let the utility handle the 'isEnabled' logic
      Debug[method](msg.channel || 'WORKER', msg.message, msg.data);
      return;
    }

    if (type === 'ERROR') {
      // [cite: 2026-01-23] TEST HOOK: Expose error for Playwright even if console is quiet
      if (typeof window !== 'undefined') window.__lastWorkerError = msg.error;

      // [cite: 2026-01-23] QUIET HUD: Demote worker syntax errors to warnings to prevent console spam during typing.
      // These are expected when the user is editing the formula.
      Debug.warn("WORKER", "🚨 [Worker-Logic-Mismatch]", {
        error: msg.error,
        failedSource: msg.failedSource
      });
      // [cite: 2026-01-14] FIX: Propagate error to UI to update HUD status dot and stop loop
      onStatus?.({ status: 'ERROR', error: msg.error });
      return;
    }

    if (isDisposed) return;

    // 3. RID & Stale Message Filtering
    if (rid !== undefined) {
      if (intentService?.confirmTransition) intentService.confirmTransition(rid);
      
      // [cite: 2026-01-18] FIX: Strict Monotonicity (<=) to prevent zombie packets during flush
      const isStale = rid <= highestRidProcessed;
      // 🛰️ GATE 3: MANAGER FILTER
      Debug.log("PIPELINE", `${isStale ? '❌' : '🟢'} Packet Ingress [RID:${rid}] | Floor: ${highestRidProcessed}`);
      
      if (isStale) {
        return;
      }
      // Update the high-water mark immediately
      highestRidProcessed = rid;
    }

    // 4. Geometry Result Processing
    if (type === 'RESULT' && msg.positions) {
      const scene = thunkScene();

      // [cite: 2026-01-24] TEST HANDSHAKE: Signal Playwright that the engine is "Hot" (First Frame)
      if (typeof window !== 'undefined' && !window.workerReady) {
        window.workerReady = true;
        window.__PARAMETRIC_READY__ = true; // [cite: 2026-01-24] ALIAS: Signal-based testing
        Debug.log("WORKER", "🚀 [Manager] 3D Engine is hot! (First Frame Rendered)");
      }

      if (window.__DEBUG_HUD__) {
        Debug.log("WORKER", `▶️ Applying RID:${rid} Manual:${msg.isManual}`);
      }
      
      // [cite: 2026-01-13] Extract projection state for the vertex shader/offset logic
      const currentProjecting = msg.projecting || { x: 0, y: 0, z: 0 };
      const currentScope = msg.scope || {};

      requestAnimationFrame(() => {
        if (isDisposed || rid < highestRidProcessed) return;
        
        // 🛰️ GATE 4: SCENE INJECTION
        Debug.log("PIPELINE", `🎨 Injecting to Scene [RID:${rid}]`);

        // Pass projecting values as the state for the shader
        scene?.injectGeometry(
          msg.positions, 
          msg.normals, 
          msg.indices, 
          rid, 
          msg.uvs, 
          { ...currentScope, projecting: currentProjecting } 
        );

        // 📡 RESTORE LOGGING: Confirm the math landed on the GPU
        onStatus?.({ status: 'STABLE', rid });
      });
    }
  };

  Debug.log("WORKER", `🏗️ [Manager] New Instance Created: ${instanceId}`);

  // MONITOR: Verifies the instance is alive even when UI is idle
  const heartbeat = setInterval(() => {
    if (isDisposed) {
      clearInterval(heartbeat);
      return;
    }
    if (Debug.isEnabled("WORKER")) {
      // [cite: 2026-01-16] RESTORED: Heartbeat logging
      Debug.log("WORKER", `💓 [Manager ${instanceId}] Instance Alive`);
    }
  }, 5000);

  return {
    instanceId,
    worker, // [cite: 2026-01-16] TEST HOOK: Expose raw worker for direct handshake verification
    update: ({ settings, rid, event = FormulaEvents.UPDATE, onComplete }) => {
      // TRACE: Every single update attempt
      // Debug.log("MANAGER", `[Manager ${instanceId}] Incoming Update -> RID: ${rid}`);

      // [cite: 2026-01-18] FIX: Exclusive RID Guard (Monotonic Dispatch)
      if (rid !== undefined) {
        if (rid < lastDispatchedRid) return;
        lastDispatchedRid = rid;
      }

      if (isDisposed || !settings) return;

      // [cite: 2026-01-16] GUARD: Prevent Kernel Scope Shadowing (Syntax Error)
      // We allow assignment (x = 5) but block redeclaration (let x = 5) which crashes the worker.
      if (settings.manualFormula && /(let|const|var)\s+(bendAmt|pinchAmt|spiralAmt|flattenAmt|modulateAmt|outerTextureAmt|innerTextureAmt)/.test(settings.manualFormula)) {
        throw new Error("[Kernel] Formula illegally redeclares scoped variables. Use assignment only (remove 'let/const').");
      }
      
      const dataPacket = getWorkerDataPacket(settings, event);
      
      // Path 1: Valid Dispatch [cite: 2026-01-12]
      // [cite: 2026-01-15] FIX: Allow equal RIDs for animation frames
      
      // [cite: 2026-01-15] DEBUG: Trace Worker Dispatch Payload
      // Debug.log("SYNC", "Dispatching to Worker", { 
      //   rid, 
      //   projecting: dataPacket?.projecting, 
      //   vectors: dataPacket?.projecting?.vectors 
      // });

      if (dataPacket) {
        dataPacket.rid = rid; 
        if (Debug.isEnabled("MANAGER")) {
           Debug.log("MANAGER", `[Manager] Posting to Worker [RID:${rid}]`, {
             isManual: !!dataPacket.manualFormula
           });
        }
        worker.postMessage(dataPacket);
      } 
    },

    /**
     * resetAuthority
     * [cite: 2026-01-16] Explicitly allow automatic packets again (e.g. slider move).
     */
    resetAuthority: () => {
      // [cite: 2026-01-17] MVA: Immediately invalidate all current in-flight RIDs.
      // By moving the processed floor to the current active RID, we ensure 
      // late-arriving 'zombie' packets are dropped before they touch the scene.
      // [cite: 2026-01-18] FIX: Flush the *current* dispatched RID too.
      highestRidProcessed = lastDispatchedRid;
      
      // [cite: 2026-01-18] FIX: Send explicit PURGE to clear worker's manual cache/variables
      worker.postMessage({ type: 'RESET_AUTHORITY', purge: true });
      Debug.log("MANAGER", `Pipeline Flush: Tasks <= ${highestRidProcessed} are now stale.`);
    },

    /**
     * bootstrap
     * [cite: 2026-01-17] MVA: Authoritative Full-State Kick.
     * Bypasses no-op checks to force the initial render (RID 1).
     */
    bootstrap: (initialState) => {
      // Ensure flags are synced before the first mathematical crunch
      syncFlagsToWorker();
      Debug.log("MANAGER", "Bootstrap called with:", initialState);
      const rid = 1;
      lastDispatchedRid = rid;
      const dataPacket = getWorkerDataPacket({ ...initialState, rid }, FormulaEvents.UPDATE);
      if (dataPacket) worker.postMessage(dataPacket);
    },

    /**
     * markSceneReady
     * REQUIRED by Parametric.js bootstrap to release the boot lock.
     */
    markSceneReady: () => {
      Debug.log("WORKER", `[Manager ${instanceId}] Scene signaled READY`);
    },

    dispose: () => {
      isDisposed = true;
      Debug.log("WORKER", `🗑️ [Manager] Instance Disposed: ${instanceId}`);
      // Restore original setFlag just in case
      FeatureFlags.setFlag = originalSetFlag;
      worker.terminate();
    }
  };
};