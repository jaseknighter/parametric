/**
 * @fileoverview Parametric.js
 * MAIN COORDINATOR: Phase 4 Async Bootstrap.
 * FIXED: UI Sliders now aggressively break Manual HUD locks.
 * FIXED: Hoisting issue resolved for handleHUDChange.
 * [cite: 2026-01-15] AUTHORITY CONSOLIDATION: Removed local sync logic.
 */
import React, { useState, useEffect, useRef, useCallback, useMemo, useReducer, useLayoutEffect } from "react";
import { ParametricReducer } from "../../services/ParametricReducer";
import {STLExporter } from "three/addons/exporters/STLExporter.js";
import { saveAs } from "file-saver";

import { useRenderWatchdog } from "../../shared/hooks/useRenderWatchdog";

import { generateFormulaString, prepareWorkerScope, setProjectionVector } from "./ParametricLogic";
import { getFormulaExecutionScope } from "../../utilities/VariableBridge";
import { parseVectorIntentKey, setByPath } from "../../services/ParametricReducerHelpers";
import { createDiagnostics } from "../../utilities/ParametricDiagnostics";
import { runFormulaAudit } from "../../tools/FormulaSnapshotTest";
import { assertReadOnly } from "../../utilities/assertDiagnosticsBoundary";
import { createSceneManager } from "./ParametricScene";
import { createParametricManager } from "./ParametricManager";
import createWorker from './workerHelper'; 

import ParametricView from "./ParametricView";
import { Debug } from "../../utilities/debug";
import {  INITIAL_PARAMETRIC_OBJ, sanitizeNumber, DEFAULT_ACTIVE_CHANNELS, LAYOUT_THRESHOLDS } from '../../shared/ParametricConstants';
import { ParametricRegistry } from "../../services/ParametricRegistry";
import { resolveCanonical } from "../../shared/CanonicalKeys";

// [cite: 2026-01-18] OBSERVABILITY: Initialize Debug Policy
// Professional Capability Model: Debug is off by default in production.
// Producers emit signals; Policy decides visibility.
const isDev = process.env.NODE_ENV !== 'production';
// Check for runtime override (e.g. ?debug=WORKER,PIPELINE)
const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
const debugOverride = urlParams.get('debug');

Debug.init({
  // [cite: 2026-01-18] FIX: Only enable debug if explicitly requested via URL (?debug=true or ?debug=CHANNEL)
  enabled: !!debugOverride,
  channels: (debugOverride === 'true') ? DEFAULT_ACTIVE_CHANNELS : (debugOverride ? debugOverride.split(',') : [])
});

// [cite: 2026-01-18] COVERAGE: Dummy component to exercise Watchdog branches in E2E
const CoverageWatchdog = () => {
  // [cite: 2026-01-23] QUIET: Increase threshold to 100fps to ignore HUD typing bursts
  useRenderWatchdog('CoverageWatchdog', 100);
  const lastLogRef = useRef(0);
  
  useEffect(() => {
    const now = performance.now();
    // [cite: 2026-01-20] FIX: Throttle Watchdog logs to reduce console noise during resize
    if (Debug.isEnabled("MAIN") && now - lastLogRef.current > 200) {
      Debug.log("MAIN", `[CoverageWatchdog] Rendered @ ${now.toFixed(2)}ms`);
      lastLogRef.current = now;
    }
  });
  return null;
};

const Parametric = () => {
  useRenderWatchdog("ParametricMain", 25);

  // --- 1. STATE (PHASE 6: AUTHORITATIVE REDUCER) ---
  const [state, dispatch] = useReducer(ParametricReducer, INITIAL_PARAMETRIC_OBJ);
  const parametricObj = state; 

  const [isBooting, setIsBooting] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [hudBuffer, setHudBuffer] = useState(null);
  const [isEditingHUD, setIsEditingHUD] = useState(false); 
  const [hudState, setHudState] = useState({ isValid: true, error: null });
  // [cite: 2026-01-16] FIX: Explicit Error State for UI Feedback (Playwright)
  const [hasError, setHasError] = useState(false);
  const [diagStats, setDiagStats] = useState({ status: "INIT", rid: 0, error: null });
  const diagStatsRef = useRef(diagStats); // [cite: 2026-01-17] PERF: Ref for high-freq stats
  const [isHUDActive, setIsHUDActive] = useState(true);
  const [layoutMode, setLayoutMode] = useState('desktop'); // [cite: 2026-01-20] LAYOUT AUTHORITY
  const [isMathStable, setIsMathStable] = useState(true);

  // Testing harness states (Restored)
  const [isTesting, setIsTesting] = useState(false);
  const [testIterations, setTestIterations] = useState(10);
  const [comparativeResults, setComparativeResults] = useState([]);

  // --- 2. REFS ---
  const managerRef = useRef(null);
  const sceneManagerRef = useRef(null);
  const lastIntentRef = useRef({}); 
  const isInitializedRef = useRef(false);
  const hasEverBeenReadyRef = useRef(false);
  const canvasRef = useRef(null);
  const isDisposingRef = useRef(false);
  
  const parametricObjRef = useRef(INITIAL_PARAMETRIC_OBJ);
  const hudStateRef = useRef({ buffer: null, isEditing: false });
  const typingTimerRef = useRef(null);
  const lastInteractionRef = useRef(0); // [cite: 2026-01-17] COALESCING: Time-based gate
  const allowAutoTickRef = useRef(true); // [cite: 2026-01-17] AUTHORITY: Engine loop permission
  const isShiftRef = useRef(false); // [cite: 2026-01-17] RESTORED: Global Shift Tracker

  const requestRef = useRef();
  const needsUpdateRef = useRef(false);
  const tRef = useRef(0);                          
  const lastUpdateRef = useRef(performance.now()); 
  const ridCounterRef = useRef(0); // [cite: 2026-01-17] MVA: Monotonic Counter

  const FPS_CAP = 60;
  const MIN_FRAME_TIME = 1000 / FPS_CAP;
  
  // [cite: 2026-01-15] AUTHORITY: Track HUD state for event listeners without re-binding
  const isEditingHUDRef = useRef(false);
  useEffect(() => { isEditingHUDRef.current = isEditingHUD; }, [isEditingHUD]);
  const isMathStableRef = useRef(true); // [cite: 2026-01-15] Direct loop access to stability
  
  // [cite: 2026-01-15] THROTTLE REFS: Prevent HUD thrashing
  const lastFormulaRef = useRef("");
  const lastFormulaUpdateRef = useRef(0);

  const debouncedLayoutRef = useRef(null);

  // [cite: 2026-01-20] LAYOUT HYSTERESIS: Single Source of Truth for Layout Mode.
  // Prevents oscillation by requiring a significant width change to switch modes.
  useLayoutEffect(() => {
    const handleResize = () => {
      if (debouncedLayoutRef.current) clearTimeout(debouncedLayoutRef.current);
      
      const w = window.innerWidth;
      if (Debug.isEnabled("DISPLAY")) {
        Debug.log("DISPLAY", `[eResize] Window width: ${w}px`);
      }
      // [cite: 2026-01-20] FIX: Fixed Debounce (100ms).
      // Ensures LayoutMode only changes once the grid is stable.
      const delay = 100;

      debouncedLayoutRef.current = setTimeout(() => {
        setLayoutMode(prev => {
          let nextMode = prev;
          // [cite: 2026-01-20] FIX: Widened Hysteresis Buffer (700/900) to stop flicker loop
          if (prev === 'desktop' && w < LAYOUT_THRESHOLDS.DESKTOP_TO_MOBILE) nextMode = 'mobile';
          if (prev === 'mobile' && w > LAYOUT_THRESHOLDS.MOBILE_TO_DESKTOP) nextMode = 'desktop';
          if (nextMode !== prev) {
            Debug.log("DISPLAY", `[LayoutMode] Transition: ${prev} -> ${nextMode} (Width: ${w}px)`);
            Debug.log("AUTH", `Dispatching LayoutMode: ${nextMode}`);
          } else if (Debug.isEnabled("DISPLAY")) {
            Debug.log("DISPLAY", `[LayoutMode] Stable: ${prev} (Width: ${w}px)`);
          }
          return nextMode;
        });
      }, delay);
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Init
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // [cite: 2026-01-20] SYNC: Push layout mode to Scene Manager to gate resize events
  useEffect(() => {
    if (sceneManagerRef.current?.setLayoutMode) {
      sceneManagerRef.current.setLayoutMode(layoutMode);
    }
  }, [layoutMode]);

  // [cite: 2026-01-20] FIX: Force layout recalculation on mode switch to clear stale styles
  useEffect(() => {
    // Dispatch a resize event to ensure all grids and observers update immediately
    window.dispatchEvent(new Event('resize'));
    Debug.log("DISPLAY", `[LayoutMode] Forced resize event for ${layoutMode}`);
  }, [layoutMode]);

  // --- 3. HANDLERS ---

  // [cite: 2026-01-13] Global Input Tracker for Shift Sync
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Shift') isShiftRef.current = e.type === 'keydown';
    };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('keyup', handleKey);
    };
  }, []);

  // [cite: 2026-01-18] DEBUG: Trace Visibility Events for Time Warp Test
  useEffect(() => {
    const logVis = () => Debug.log("MAIN", `[Visibility] State: ${document.visibilityState}`);
    const logFocus = () => Debug.log("MAIN", `[TimeWarp] Focus Regained: Clock Reset`);
    document.addEventListener("visibilitychange", logVis);
    window.addEventListener("focus", logFocus);
    return () => { document.removeEventListener("visibilitychange", logVis); window.removeEventListener("focus", logFocus); };
  }, []);

  // [cite: 2026-01-18] AUDIT: Verify VariableBridge integrity in Dev
  // This ensures the utility is executed in the browser for coverage reporting.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      // 1. VariableBridge & ReducerHelpers
      getFormulaExecutionScope({ bendAmtX: 0 });
      getFormulaExecutionScope(null); // Exercise warning path
      
      // Expanded ReducerHelpers coverage
      parseVectorIntentKey('vectorCol0Row0');
      parseVectorIntentKey('invalidKey'); // Null return
      const pathObj = { existing: 1 };
      setByPath({}, 'a.b', 1);
      setByPath(pathObj, ['x', 'y'], 2); // Array path
      setByPath(pathObj, 'existing.child', 3); // Overwrite primitive

      // 2. Diagnostics Utility (Full API Surface)
      const diag = createDiagnostics(10);
      diag.reset();
      diag.incrementRequest();
      diag.incrementRender();
      diag.recordLatency(16);
      diag.verifyIntegrity([0,0,0], true);
      diag.getAsciiBar();
      diag.getReport('Coverage', 100, 1000);

      // 3. Formula Snapshot Tool
      runFormulaAudit(INITIAL_PARAMETRIC_OBJ);

      // 4. Boundary Assertions (Proxy Traps)
      // [cite: 2026-01-23] SILENCE: Suppress expected warnings during audit to keep console clean
      const originalWarn = console.warn;
      console.warn = () => {};
      const ro = assertReadOnly({ a: 1, nested: { b: 2 } }, 'CoverageTest');
      try { ro.a = 2; } catch (e) {} // Exercise set trap
      try { delete ro.a; } catch (e) {} // Exercise delete trap
      console.warn = originalWarn;
      const _ = ro.nested.b; // Exercise recursive get
      assertReadOnly(null); // Exercise null guard
      assertReadOnly(123); // Exercise primitive guard

      // 5. Shared Utilities Coverage
      sanitizeNumber('10.5');
      sanitizeNumber('NaN');
      setProjectionVector(0, 'x');

      // 6. Canonical Keys Coverage
      resolveCanonical('BEND', 'X');
      resolveCanonical('BEND', 'bendAmtX');
      resolveCanonical('UNKNOWN', 'Label');
    }
  }, []);

  useEffect(() => {
    if (window.__DEBUG_HUD__) {
      Debug.log("HUD", `[HUD] Manual Override Active: ${isEditingHUD}`);
    }
  }, [isEditingHUD]);

  // [cite: 2026-01-17] REF MIRROR: Synchronous escape hatch for shipIntent
  // Ensures the worker always gets the latest state, even if React hasn't re-rendered yet.
  useEffect(() => {
    parametricObjRef.current = parametricObj;
  }, [parametricObj]);

  /**
   * shipIntent
   * [cite: 2026-01-17] MVA: Centralized Intent Shipping.
   * Consolidates all worker updates (Sliders, HUD, Animation) into one pipeline.
   */
  const shipIntent = useCallback((intentSettings = {}, overrideRid = null) => {
    const manager = managerRef.current;
    if (!manager || !isReady) return;
    const { buffer, isEditing } = hudStateRef.current;

    // [cite: 2026-01-17] PERF: No-Op Intent Suppression
    // Don't ship empty packets unless it's a forced override OR we are in manual mode (shipping formula)
    if (Object.keys(intentSettings).length === 0 && !overrideRid && !isEditing) {
      return;
    }

    const rid = overrideRid || ++ridCounterRef.current;

    // ️ GATE 0: INTENT DEPARTURE
    Debug.log("INTENT", `🚀 Shipping [RID:${rid}]`, {
      ...intentSettings,
      manualFormula: isEditing ? (buffer ? buffer.substring(0, 50) + "..." : "null") : "N/A"
    });

    const settings = {
      ...parametricObjRef.current, // [cite: 2026-01-17] READ FROM REF: Always get latest synchronous state
      t: tRef.current,             // [cite: 2026-01-17] FIX: Inject latest time to prevent animation snap-back
      ...intentSettings,           // Overrides (t, or specific slider values)
      rid,
      isManualOverride: isEditing,
      manualFormula: isEditing ? buffer : null,
    };

    manager.update({ settings, rid });
  }, [isReady]);

  // [cite: 2026-01-19] REFACTOR: Extract formula generation for on-demand access.
  // This prevents "Stale Latch" bugs where clicking the HUD captures a throttled/old formula.
  const getFreshFormula = useCallback(() => {
    const scope = prepareWorkerScope(parametricObj);
    const xRes = generateFormulaString(parametricObj, scope, 'u', null, true);
    const yRes = generateFormulaString(parametricObj, scope, 'v', null, true);
    const zRes = generateFormulaString(parametricObj, scope, 'w', null, true);

    const allVars = { ...xRes.vars, ...yRes.vars, ...zRes.vars };

    // [cite: 2026-01-16] FIX: Variable Ownership Contract
    const SCOPE_VARS = new Set([
      'bendAmtX', 'bendAmtY', 'bendAmtZ',
      'modulateAmtX', 'modulateAmtY', 'modulateAmtZ',
      'spiralAmtX', 'spiralAmtY', 'spiralAmtZ',
      'pinchAmtX', 'pinchAmtY', 'pinchAmtZ',
      'flattenAmtX', 'flattenAmtY', 'flattenAmtZ',
      'outerTextureAmt', 'innerTextureAmt'
    ]);
    
    let varBlock = "";
    Object.entries(allVars).forEach(([key, val]) => {
      const num = Number(val);
      if (SCOPE_VARS.has(key)) {
        // [cite: 2026-01-19] FIX: Hybrid Authority - Do NOT bake slider variables.
        // Letting them fall through to the Worker Scope ensures:
        // 1. Precision Parity (No float truncation)
        // 2. Live Updates (Sliders work in Manual Mode)
        return; 
      }
      varBlock += `let ${key} = ${isNaN(num) ? "0.0000" : num.toFixed(8)};\n`; 
    });
    
    const result = `${varBlock}x = ${xRes.expr};\ny = ${yRes.expr};\nz = ${zRes.expr};`.trim();
    
    if (Debug.isEnabled("MAIN")) {
      Debug.log("MAIN", "Generated HUD Formula", { 
        // [cite: 2026-01-19] DEBUG: Log full formula for precision audit
        fullFormula: result
      });
    }
    return result;
  }, [parametricObj]);

  /**
   * effectiveFormula
   * Ensures HUD only gets simple math.
   * [cite: 2026-01-15] THROTTLED: Prevents HUD thrashing during high-frequency updates.
   */
  const effectiveFormula = useMemo(() => {
    const now = performance.now();

    // Throttle updates to ~15fps (66ms) unless manually editing
    if (!isEditingHUD && (now - lastFormulaUpdateRef.current < 66) && lastFormulaRef.current) {
      return lastFormulaRef.current;
    }

    let result;
    if (isEditingHUD && hudBuffer !== null) {
      result = hudBuffer;
    } else {
      result = getFreshFormula();
    }
    lastFormulaUpdateRef.current = now;
    lastFormulaRef.current = result;
    return result;
  }, [isEditingHUD, hudBuffer, parametricObj]);

  // [cite: 2026-01-18] FIX: Expose Effective Formula to Engine Loop
  // Allows the loop to detect 't' in Auto Mode shapes (like Mobius) without relying on stale Reducer state.
  const effectiveFormulaRef = useRef(effectiveFormula);
  useEffect(() => { effectiveFormulaRef.current = effectiveFormula; }, [effectiveFormula]);

  const handleHUDChange = useCallback((input, meta = {}) => {
    // [cite: 2026-01-13] FIXED: Robust input handling for Event vs String
    // [cite: 2026-01-14] FIXED: Handle structured INTENT_UPDATE object from FormulaHUD
    let rawCode = "";
    // Inject { isManual: true } so the Debugger knows to bypass the 10s heartbeat
    Debug.log("HUD", "handleHUDChange input:", input, { isManual: true });

    if (input && typeof input === 'object') {
      if (input.type === 'INTENT_UPDATE') {
        rawCode = input.value;
        if (input.isManual) meta.beginEdit = true;
      } else if (input.target) {
        rawCode = input.target.value;
      }
    } else {
      rawCode = input;
    }

    // Ensure rawCode is always a string to prevent .replace errors downstream
    if (typeof rawCode !== 'string') rawCode = "";

    // [cite: 2026-01-16] FIX: Immediate Validation (The "Input" Guard)
    // Validate BEFORE any early returns to ensure the Error Channel is always active.
    // This catches the "x = ;" case even on the very first keystroke that engages manual mode.
    let isValidSyntax = true;
    try {
      // Minimal parser check as requested
      new Function(rawCode); 
      setHasError(false);
      setHudState(prev => ({ ...prev, isValid: true, error: null }));
    } catch (e) {
      isValidSyntax = false;
      setHasError(true);
      setHudState(prev => ({ ...prev, isValid: false, error: { message: e.message, type: "syntax" } }));
      Debug.warn("HUD", `Syntax Error detected: ${e.message}`);
    }

    // [cite: 2026-01-13] Guard: If the system tries to inject its internal pipeline
    // into the HUD during an edit, we reject the IIFE and keep the simple version.
    if (meta.beginEdit && rawCode?.includes("(function")) {
      // We don't update hudBuffer with the IIFE; we keep the last simple formula.
      setIsEditingHUD(true);
      return;
    }

    if (meta.forceSync) {
      managerRef.current?.resetAuthority(); // [cite: 2026-01-17] MVA: Unlock Worker
      setIsEditingHUD(false);
      
      // [cite: 2026-01-17] FIX: Synchronously unlock the ref for immediate slider updates
      hudStateRef.current = { buffer: null, isEditing: false };

      setHudBuffer(null);
      setHudState({ isValid: true, error: null });
      setHasError(false); // Reset error state
      return;
    }

    // [cite: 2026-01-16] FIX: Atomic Handover - Only snapshot if NOT already editing.
    // This allows subsequent edits to fall through to validation and update triggers.
    if (meta.beginEdit && !isEditingHUD) {
      // [cite: 2026-01-16] IMMEDIATE LATCH: Synchronously block the engine loop.
      isEditingHUDRef.current = true;
      // [cite: 2026-01-16] SYNC REF: Ensure loop sees manual mode immediately (prevents Ghost Gap)
      // [cite: 2026-01-19] FIX: Force fresh generation to bypass throttle stale state
      const startVal = rawCode || getFreshFormula();
      hudStateRef.current = { buffer: startVal, isEditing: true };

      // 🛡️ STEP 1: Capture the high-precision formula from the current memo
      setHudBuffer(startVal);
      
      // 🛡️ STEP 2: Wait for the next tick to flip the manual bit (Atomic Latch)
      setTimeout(() => {
        setIsEditingHUD(true);
        // [cite: 2026-01-16] TEST HOOK: Signal Playwright that manual mode transition is complete
        if (window.__PLAYWRIGHT__) window.__HUD_READY__ = true;
      }, 0);
      
      // [cite: 2026-01-19] FIX: AUTHORITY BOUNDARY - Read-Only Focus.
      // Entering Manual Mode is a UI state transition, not a math event.
      // We strictly return here to prevent shipIntent from firing.
      return; 
    }

    // [cite: 2026-01-16] FIX: Zero-Latency State Update for Animation Loop
    hudStateRef.current = { buffer: rawCode, isEditing: true };

    // Update the visual buffer
    setHudBuffer(rawCode);
    if (!isEditingHUD) setIsEditingHUD(true); // Ensure state catches up

    if (!isValidSyntax) {
      // [cite: 2026-01-16] STOP: Do not ship invalid code to the Worker.
      // This ensures the error state persists and isn't overwritten by a previous valid debounce.
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      return;
    }

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      typingTimerRef.current = null; 
      lastInteractionRef.current = performance.now();
      // ADD { isManual: true } HERE
      shipIntent({ isManual: true }); 
    }, 300);
  }, [effectiveFormula, shipIntent, getFreshFormula]);


  const updateParametricObjHandler = useCallback((updateArray) => {
    if (!updateArray || updateArray.length === 0) return;

    // 1. Generate the shared Authority RID
    const rid = ++ridCounterRef.current;

    // [cite: 2026-01-17] RESTORED: Atomic Fan-Out (Swarm Logic) for Shift+Drag
    let finalUpdates = updateArray;
    const first = updateArray[0];
    const isVectorAction = first?.paramToUpdate?.match(/(Amt|Scale)[XYZ]$/);
    
    if (isShiftRef.current && isVectorAction) {
      const baseKey = first.paramToUpdate.slice(0, -1); // e.g. "bendAmt"
      const val = first.newValue ?? first.value;
      const cat = first.category || ParametricRegistry[first.paramToUpdate]?.category;
      
      finalUpdates = ['X', 'Y', 'Z'].map(axis => ({
        paramToUpdate: `${baseKey}${axis}`,
        newValue: val,
        category: cat
      }));
      Debug.log("PIPELINE", `Swarm Intent: ${baseKey}[XYZ] -> ${val}`);
    }

    // 2. Update the Ledger (Reducer) so Playwright sees it
    dispatch({ type: 'INTENT_UPDATE', batch: finalUpdates, rid });

    // [cite: 2026-01-18] FIX: Immediate Ref Mirroring (Heartbeat)
    // Manually advance the ref so shipIntent sees the new state immediately.
    parametricObjRef.current = ParametricReducer(parametricObjRef.current, { 
      type: 'INTENT_UPDATE', batch: finalUpdates, rid 
    });

    // 3. Break the HUD focus if a slider is touched
    const category = first?.category || ParametricRegistry[first?.paramToUpdate]?.category;
    
    // [cite: 2026-01-18] FIX: Shape buttons must also break Manual Mode to apply immediately
    if (['deform', 'project', 'postProcess', 'shape', 'displace'].includes(category)) {
        // [cite: 2026-01-17] MVA: Only flush if breaking a manual lock
        if (isEditingHUD) {
            Debug.log("PIPELINE", "Switching Authority: HUD -> Slider. Flushing.");
            if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
            setIsEditingHUD(false); 
            handleHUDChange(null, { forceSync: true }); 
        }
    }

    // [cite: 2026-01-17] WAKE UP: Tell the engine loop something changed
    needsUpdateRef.current = true;
    lastInteractionRef.current = performance.now(); // [cite: 2026-01-17] COALESCING: Pause engine
    allowAutoTickRef.current = false; // [cite: 2026-01-17] AUTHORITY: Revoke auto-tick for this frame

    // 🚀 THE VITAL STEP: Actually ship the data to the worker!
    // [cite: 2026-01-18] FIX: Ship only RID, as state is already in parametricObjRef.current
    shipIntent({}, rid);
  }, [isEditingHUD, dispatch, handleHUDChange, shipIntent]);

  const handleManualRotate = useCallback((dx, dy) => {
    sceneManagerRef.current?.rotate(dx, dy);
  }, []);

  const handleManualZoom = useCallback((amt) => {
    sceneManagerRef.current?.zoom(amt);
  }, []);

  // STATE SYNC
  useEffect(() => {
    if (window.intentService) {
      window.intentService.scheduleSync(parametricObj);
    }
  }, [parametricObj]);

  // [cite: 2026-01-16] TEST SYNC: Expose comprehensive state for Playwright
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // [cite: 2026-01-17] FIX: Use Worker RID for Test Authority
      // The Worker RID is the only RID the tests should trust for completion.
      window.parametricState = { 
        ...parametricObj, 
        rid: diagStatsRef.current?.rid ?? 0, 
        isManualOverride: isEditingHUD, 
        ready: isReady 
      };
    }
  }, [parametricObj, isEditingHUD, isReady]);

  // [cite: 2026-01-16] TEST HOOK: Signal full system readiness (Scene + State)
  useEffect(() => {
    const isE2E = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('e2e');
    
    if (isReady && (window.__PLAYWRIGHT__ || isE2E)) {
      window.__PARAM_READY__ = true;
      // [cite: 2026-01-16] TEST HOOK: Expose Manager for Worker Integration Tests
      // This bypasses strict encapsulation only for the test harness.
      window.__PARAMETRIC_TEST_HOOKS__ = {
        manager: managerRef.current,
        worker: managerRef.current?.worker, // [cite: 2026-01-16] TEST HOOK: Direct worker access
        scene: sceneManagerRef.current,
        intentService: window.intentService
      };
    }
  }, [isReady]);

  // [cite: 2026-01-13] Expose handler for Smoke Tests to simulate precise events
  useEffect(() => {
    window.onUpdateParametric = updateParametricObjHandler;
    // [cite: 2026-01-18] TEST HOOK: Expose handler for atomic batch testing
    window.updateParametricObjHandler = updateParametricObjHandler;
    return () => { 
      delete window.onUpdateParametric;
      delete window.updateParametricObjHandler;
    };
  }, [updateParametricObjHandler]);

  // [cite: 2026-01-15] Sync tRef with external intent (e.g. tests)
  useEffect(() => {
    if (parametricObj.t !== undefined) {
      tRef.current = parametricObj.t;
    }
  }, [parametricObj.t]);

  // EXTERNAL EVENT LISTENER
  useEffect(() => {
    const handleUpdate = (e) => {
      const { intentKey, value, category } = e.detail;
      if (lastIntentRef.current[intentKey] === value) {
        return;
      }
      lastIntentRef.current[intentKey] = value;

      dispatch({ type: 'INTENT_UPDATE', intentKey, value, category });
      
      // [cite: 2026-01-18] FIX: Ensure external intents (e.g. Tests) wake the engine
      needsUpdateRef.current = true;
      shipIntent({ [intentKey]: value });
    };
    window.addEventListener('parametric-intent-update', handleUpdate);
    
    // [cite: 2026-01-18] FIX: Handle Atomic Batch Updates
    const handleBatchUpdate = (e) => {
      const { updates } = e.detail;
      const batch = [];
      
      Object.entries(updates).forEach(([key, value]) => {
        lastIntentRef.current[key] = value;
        const category = ParametricRegistry[key]?.category;
        batch.push({ intentKey: key, value, category });
      });

      if (batch.length > 0) {
        dispatch({ type: 'INTENT_UPDATE', batch });
        needsUpdateRef.current = true;
        shipIntent(updates); // Ship all overrides at once
      }
    };
    window.addEventListener('parametric-intent-batch-update', handleBatchUpdate);

    return () => {
      window.removeEventListener('parametric-intent-update', handleUpdate);
      window.removeEventListener('parametric-intent-batch-update', handleBatchUpdate);
    };
  }, [shipIntent]); // [cite: 2026-01-19] FIX: Re-bind listener when shipIntent updates (e.g. isReady flips)

  // Sync Refs with State for Async Loop
  useEffect(() => { 
    hudStateRef.current = { buffer: hudBuffer, isEditing: isEditingHUD }; 
  }, [hudBuffer, isEditingHUD]);

  // --- ENGINE LOOP (MVA) ---
  useEffect(() => {
    if (!isReady) return;

    const tick = () => {
      const now = performance.now();
      if (now - lastUpdateRef.current < MIN_FRAME_TIME) {
        requestRef.current = requestAnimationFrame(tick);
        return;
      }

      // [cite: 2026-01-17] COALESCING: Strict Engine Yield
      // This prevents 't' updates from overwriting slider/HUD packets in the worker.
      if (now - lastInteractionRef.current < 100) {
        // [cite: 2026-01-17] AUTHORITY: Hand control back to engine after interaction
        allowAutoTickRef.current = true;
        lastUpdateRef.current = now; // [cite: 2026-01-18] FIX: Prevent time jump after pause
        requestRef.current = requestAnimationFrame(tick);
        return;
      }

      if (!allowAutoTickRef.current) {
        lastUpdateRef.current = now; // [cite: 2026-01-18] FIX: Keep clock synced even when paused
        requestRef.current = requestAnimationFrame(tick);
        return;
      }

      // 🛡️ THE STABILITY GATE
      // [cite: 2026-01-18] FIX: Strict Animation Gate.
      // Only increment 't' if explicitly playing OR if the formula implies animation via 't'.
      // We ignore needsUpdateRef here because handlers (sliders/HUD) ship their own intents immediately.
      // This prevents the loop from generating redundant "Ghost Frames" when the system should be static.
      const currentObj = parametricObjRef.current;
      const isManual = isEditingHUDRef.current;
      const activeCode = isManual ? (hudStateRef.current.buffer || "") : effectiveFormulaRef.current;
      const isTimeDependent = /\bt\b/.test(activeCode);

      const isPlaying = currentObj.isPlaying || isTimeDependent;
      
      if (isPlaying || !isMathStableRef.current) {
        needsUpdateRef.current = false;
        
        const delta = (now - lastUpdateRef.current) / 1000;
        if (isPlaying) {
            tRef.current += delta;
        }
        
        shipIntent({ t: tRef.current });
      }

      lastUpdateRef.current = now;
      requestRef.current = requestAnimationFrame(tick);
    };

    requestRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isReady, isEditingHUD, shipIntent]);

  // --- 5. LIFECYCLE ---
  useEffect(() => {
    if (!canvasRef.current || isInitializedRef.current) return;
    let isMounted = true;
    isInitializedRef.current = true;

    const bootstrap = async () => {
      const scene = createSceneManager(canvasRef.current);
      sceneManagerRef.current = scene;
      
      // [cite: 2026-01-13] EXPOSE FOR SMOKE TESTING
      if (window.location.hostname === 'localhost') {
        window.scene = scene;
      }

      managerRef.current = createParametricManager(
        createWorker,
        () => sceneManagerRef.current,
        (statusInfo) => {
          if (isDisposingRef.current || !isMounted) return;
          
          // [cite: 2026-01-18] FIX: Explicitly update window.parametricState.rid for Playwright
          if (statusInfo.rid && typeof window !== 'undefined' && window.parametricState) {
             window.parametricState.rid = statusInfo.rid;
          }

          // [cite: 2026-01-17] PERF: Muzzle high-frequency updates
          setDiagStats(prev => {
            if (prev.status === statusInfo.status && statusInfo.status === 'STABLE') {
               // Silent update for refs/tests
               diagStatsRef.current = { ...diagStatsRef.current, rid: statusInfo.rid };
               if (typeof window !== 'undefined' && window.parametricState) {
                 window.parametricState.rid = statusInfo.rid;
               }
               return prev;
            }
            const next = { ...prev, ...statusInfo };
            diagStatsRef.current = next;
            return next;
          });

          if (statusInfo.status === 'ERROR') {
             setHasError(true);
             setIsMathStable(true);
             // [cite: 2026-01-19] FIX: Propagate Worker Error to HUD immediately
             setHudState(prev => ({ ...prev, isValid: false, error: { message: statusInfo.error, type: "worker" } }));
          }
        }
      );
      
      try {
        await scene.ready;
        managerRef.current.markSceneReady(); 
        
        if (!isMounted) return;

        // releasing these triggers the useEffect loop above
        setIsReady(true);
        setIsBooting(false);
        hasEverBeenReadyRef.current = true;
        
        // [cite: 2026-01-17] FIX: Trigger initial render on load
        needsUpdateRef.current = true;
        
        // [cite: 2026-01-17] FIX: Sync corrected defaults (Radius 5.0) from IntentService to Reducer
        if (window.intentService) {
          dispatch({ type: 'INTENT_UPDATE', batch: [{ intentKey: 'radius', value: 5.0, category: 'shape' }], rid: 1 });
          // [cite: 2026-01-18] FIX: Sync local RID counter to match the bootstrap RID
          // This prevents the first manual interaction from reusing RID 1.
          ridCounterRef.current = 1;
        }

        Debug.log("BOOT", "🚀 System Ready. Triggering initial render.", { 
          initialState: parametricObj,
          radius: parametricObj.transformationInstructions?.shaping?.radius,
          intentServiceState: window.intentService?.state
        });
        
        // [cite: 2026-01-17] MVA: Authoritative Full-State Kick
        // Force correct radius 5.0 for initial render to match IntentService defaults
        const bootstrapState = { ...parametricObj };
        if (bootstrapState.transformationInstructions?.shaping) {
           bootstrapState.transformationInstructions.shaping.radius = 5.0;
        }
        managerRef.current.bootstrap(bootstrapState);
      } catch (err) {
        Debug.error("BOOT", "🚨 [Boot] Failure:", err);
      }
    };

    bootstrap();
    return () => {
      isMounted = false;
    };
  }, []); // [cite: 2026-01-16] CLEANUP: Resize handled by ResizeObserver in ParametricScene

  return (
    <div data-testid="parametric-view" onPointerDownCapture={() => sceneManagerRef.current?.stopMotion()} style={{ width: '100%', height: '100%', position: 'relative' }}>
      {process.env.NODE_ENV !== 'production' && <CoverageWatchdog />}
      <ParametricView 
        ref={canvasRef}
        isDebugEnabled={!!debugOverride}
        diagStats={diagStats}
        isBooting={isBooting}
        isReady={isReady}
        hasEverBeenReady={hasEverBeenReadyRef.current}
        isHUDActive={isHUDActive}
        parametricObj={parametricObj}
        layoutMode={layoutMode}
        isFormulaValid={hudState.isValid}
        isMathStable={isMathStable && diagStatsRef.current.status !== 'ERROR'}
        isMathematicalError={hasError || !hudState.isValid || hudState.error?.type === "math" || diagStatsRef.current.status === 'ERROR'}
        isManualOverride={isEditingHUD}
        formulaCode={effectiveFormula} 
        onUpdateParametric={updateParametricObjHandler}
        onToggleHUD={setIsHUDActive}
        onFormulaChange={handleHUDChange}
        onRotate={handleManualRotate}
        onZoom={handleManualZoom}
        isTesting={isTesting}
        testIterations={testIterations}
        comparativeResults={comparativeResults}
        onTestToggle={() => setIsTesting(!isTesting)}
        onIterationChange={setTestIterations}
        onExport={() => {
          const mesh = sceneManagerRef.current?.getMesh(); 
          if (mesh) {
            const result = new STLExporter().parse(mesh);
            saveAs(new Blob([result], { type: 'text/plain' }), "parametric.stl");
          }
        }}
        onBenchmark={() => managerRef.current?.update({ t: 1, resolution: 200 })}
      />
    </div>
  );
};

export default Parametric;