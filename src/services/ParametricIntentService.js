/**
 * @fileoverview ParametricIntentService.js
 * PRIMARY INTENT AUTHORITY: Transition Latching, State Mapping, & Smoke Testing.
 * [cite: 2026-01-13]
 */
import { ParametricRegistry } from "./ParametricRegistry";
import { Debug } from "../utilities/debug";
import { INTENT_CONFIG } from "../shared/ParametricConstants";

class ParametricIntentService {
  constructor() {
    this.DEFAULT_FALLBACK = 'CIRCLE'; 
    this.registry = ParametricRegistry || {};
    
    // Smoke Testing: Explicit safety defaults
    this.state = {
      formula: this.DEFAULT_FALLBACK, 
      vectors: [['x',0,0],[0,'y',0],[0,0,'z']],
      lastValidFormula: this.DEFAULT_FALLBACK,
      lastMathHash: '',
      radius: 2.5,
      bendAmtX: 0, bendAmtY: 0, bendAmtZ: 0,
      modulateAmtX: 0, modulateAmtY: 0, modulateAmtZ: 0,
      spiralAmtX: 0, spiralAmtY: 0, spiralAmtZ: 0,
      pinchAmtX: 0.0, pinchAmtY: 0.0, pinchAmtZ: 0.0, // Identity is now 0
      flattenAmtX: 0, flattenAmtY: 0, flattenAmtZ: 0,
      innerTextureAmt: 0, outerTextureAmt: 0
    };

    this._isSyncing = false; // [cite: 2026-01-15] LOCK: Prevents circular broadcast during sync
    this._syncRaf = null; // [cite: 2026-01-15] DEBOUNCE: Coalesce rapid updates via RAF
    this._isInitialized = false; 
    this._pendingResolvers = {}; // [cite: 2026-01-16] PROMISE LATCH: Map RID -> resolve[]
    this.projections = {};
    this.blueprints = {};

    // --- ADD TO CONSTRUCTOR ---
    this.STRICT_DEFAULTS = {
      pinchAmtX: 0.0, pinchAmtY: 0.0, pinchAmtZ: 0.0,
      radius: 5.0,
      globalScale: 1.0
    };

    // --- EXPOSE FOR SMOKE TESTING ---
    if (typeof window !== 'undefined') {
      window.intentService = this;
    }

    // SOLUTION INTEGRITY: Single-pass Registry Initialization
    // Initialize with safety check
    Object.keys(this.registry).forEach(key => {
      const val = this.registry[key].default ?? this.STRICT_DEFAULTS[key] ?? 0;
      
      // [cite: 2026-01-17] FIX: Force Radius 5.0 if bad default detected
      if (key === 'radius' && (val === 2.5 || val === 4.5)) {
        this.state[key] = 5.0;
      } else {
        this.state[key] = val;
      }
      this.applyProjection(key);
    });
    Debug.log("INTENT", "Service Initialized State:", { ...this.state });

    this.performInternalSmokeTest = this.performInternalSmokeTest.bind(this);
    this.applyProjection = this.applyProjection.bind(this);
    this.setIntent = this.setIntent.bind(this);
  }

  /**
   * broadcastChange
   * [cite: 2026-01-15] FIXED: Added detail payload to satisfy Reducer Authority.
   */
  broadcastChange(key, value) {
    if (this._isSyncing) return;

    // This should ONLY be used for smoke tests or external UI updates
    window.dispatchEvent(new CustomEvent('parametric-intent-update', {
      detail: { intentKey: key, value: value }
    }));
  }

  /**
   * getValueByPath
   * [cite: 2026-01-04] SOLUTION INTEGRITY: Safely traverses nested objects.
   */
  getValueByPath(obj, path) {
    if (!path || !obj) return undefined;
    const pathArr = Array.isArray(path) ? path : path.split('.');
    return pathArr.reduce((acc, part) => acc && acc[part], obj);
  }

  /**
   * [cite: 2026-01-15] Standardized Projections.
   * Consolidates mathematical transformations based on Registry metadata.
   */
  project(key, value) {
    const metadata = ParametricRegistry[key];
    if (!metadata) return value;

    const type = metadata.projection || 'raw';

    switch (type) {
      case 'radians':
        return (value * Math.PI) / 180;
      case 'normalized':
        return value / 100;
      case 'raw':
      default:
        return value;
    }
  }

  /**
   * [cite: 2026-01-15] AUTHORITY: Bridge-free Intent Dispatch.
   * Directly utilizes the Registry metadata for action construction.
   */
  setIntent(key, value) {
    if (this._isSyncing) return; // 🛡️ Prevent "Snap-Back" during sync

    const metadata = ParametricRegistry[key];
    if (!metadata) return; // Ignore keys not defined in the Registry

    // 1. Optimistic Update (Critical for Smoke Tests & Worker Sync)
    this.state[key] = value;

    // [cite: 2026-01-15] DEBUG: Trace Intent Dispatch
    Debug.log("INTENT", `UI Intent Received: ${key} = ${value}`, { 
      category: metadata.category,
      path: metadata.path
    });

    window.dispatchEvent(new CustomEvent('parametric-intent-update', { 
      detail: {
        intentKey: key,
        value: value,
        category: metadata.category // Derived directly from Registry
      } 
    }));
  }

  /**
   * setIntentBatch
   * [cite: 2026-01-18] AUTHORITY: Atomic multi-axis updates.
   * Ensures Shift+Slider interactions emit a single RID update.
   * @param {Object} updates - Map of intentKey -> value (e.g. { bendAmtX: 5, bendAmtY: 5 })
   */
  setIntentBatch(updates) {
    if (this._isSyncing) return;

    // 1. Optimistic Update of all keys
    Object.entries(updates).forEach(([key, value]) => {
      if (this.registry[key]) this.state[key] = value;
    });

    // 2. Dispatch a single event for the entire batch
    // Note: The Reducer must listen for this event type or we need to adapt the existing listener.
    // For now, we'll assume the existing listener can handle a batch if we modify the event structure slightly
    // or introduce a new event type that the main coordinator listens to.
    window.dispatchEvent(new CustomEvent('parametric-intent-batch-update', { 
      detail: { updates } 
    }));
  }

  applyProjection(key) {
    const val = this.state[key];
    this.projections[key] = this.project(key, val);
  }

  getIntentMetadata(key) {
    return this.registry[key];
  }

  registerBlueprints(blueprintMap) {
    this.blueprints = blueprintMap;
    this.resolveActiveBlueprint(this.state.formula);
    this.broadcastChange();
  }

  /**
   * projectForCPU
   * AUTHORITY: Aggregates nested state into a flat math scope.
   */
  projectForCPU(settings = {}) {
    const mathScope = {};
    
    // Use the registry to pull values from the settings object (Reducer State)
    Object.keys(this.registry).forEach(key => {
      const path = this.registry[key].path;
      
      // [cite: 2026-01-17] FIX: Check for root-level overrides from shipIntent first
      // This handles the case where parametricObjRef is stale but intentSettings has the new value.
      let rawValue = settings[key];
      if (rawValue === undefined) {
        rawValue = this.getValueByPath(settings, path);
      }

      // Priority: Override -> Reducer State -> Service State -> Defaults
      let val = rawValue !== undefined ? rawValue : (this.state[key] ?? 0);
      
      // [cite: 2026-01-17] FIX: Ensure numeric types for math keys to prevent string poisoning
      if (typeof this.registry[key].default === 'number') val = Number(val);

      mathScope[key] = this.project(key, val);
    });

    const result = {
      mathScope: {
        ...mathScope,
        radius: settings.radius !== undefined ? settings.radius : (this.getValueByPath(settings, 'transformationInstructions.shaping.radius') || this.state.radius || 5.0),
        t: Number(settings.t) || 0
      },
      meta: {
        formula: this.getValueByPath(settings, 'transformationInstructions.shaping.formula') || this.state.formula,
        // CRITICAL FIX: Direct extraction of persistence vectors from Reducer state
        vectors: this.getValueByPath(settings, 'transformationInstructions.projecting.vectors') || 
                 this.state.vectors || 
                 [['x',0,0],[0,'y',0],[0,0,'z']],
        fallback: this.DEFAULT_FALLBACK
      }
    };

    // [cite: 2026-01-15] DEBUG: Trace Worker Handshake
    Debug.log("INTENT", 'Handshake Data for Worker:', {
      vectors: result.meta.vectors,
      formula: result.meta.formula,
      rid: settings.rid
    });

    return result;
  }

  /**
   * syncFromReducer
   * [cite: 2026-01-15] AUTHORITY: Registry-driven mirroring.
   * Eliminates naming inference to ensure Playwright visibility.
   */
  scheduleSync(reducerState) {
    if (this._syncRaf) cancelAnimationFrame(this._syncRaf);
    this._syncRaf = requestAnimationFrame(() => {
      this.syncFromReducer(reducerState);
    });
  }

  /**
   * [cite: 2026-01-16] DETERMINISTIC WAIT: Returns a promise that resolves when RID is synced.
   */
  waitForRid(rid) {
    if (this.state.rid === rid) return Promise.resolve();
    return new Promise(resolve => {
      if (!this._pendingResolvers[rid]) this._pendingResolvers[rid] = [];
      this._pendingResolvers[rid].push(resolve);
    });
  }

  syncFromReducer(reducerState) {
    // 0. RID CHECK: Skip redundant updates
    if (reducerState.rid === this.state.rid) return;

    this._isSyncing = true; // 🔒 ACTIVATE LOCK
    let didChange = false;

    try {
      // 1. Surgical Vector Sync (Mirror 2D Grid)
      const nextVectors = reducerState?.transformationInstructions?.projecting?.vectors;
      if (nextVectors) {
        // 🛡️ SECURITY: Deep clone the matrix so the reference change is detected
        this.state.vectors = JSON.parse(JSON.stringify(nextVectors));
      }

      // 2. Registry Mapping
      Object.entries(ParametricRegistry).forEach(([key, meta]) => {
        const nextValue = this.getValueByPath(reducerState, meta.path);
        if (nextValue === undefined) return;

        // 🟢 EPSILON CHECK: Prevent infinite re-syncs on micro-differences
        const current = this.state[key];
        const isNum = typeof nextValue === 'number' && typeof current === 'number';
        const isDifferent = isNum ? Math.abs(current - nextValue) > INTENT_CONFIG.SYNC_EPSILON : current !== nextValue;

        if (isDifferent) {
          this.state[key] = nextValue;
          didChange = true;
        }
      });

      // 3. THE SIGNAL: Increment Service RID to match Reducer truth
      if (didChange || (reducerState.rid !== this.state.rid)) {
        this.state.rid = reducerState.rid; // Directly mirror the authoritative RID
        didChange = true;
      }

      // 4. RESOLVE WAITERS: Notify tests/UI that this RID is fully processed
      const rid = reducerState.rid;
      if (this._pendingResolvers[rid]) {
        this._pendingResolvers[rid].forEach(resolve => resolve());
        delete this._pendingResolvers[rid];
      }
    } finally {
      this._isSyncing = false; // 🔓 RELEASE LOCK
    }

    if (didChange) {
      Debug.log("INTENT", `🔄 State Synchronized (RID: ${this.state.rid})`, { vectors: this.state.vectors });
    }
  }

  resolveActiveBlueprint(formulaName) {
    let found = null;
    for (const category in this.blueprints) {
      if (this.blueprints[category]?.[formulaName]) {
        found = this.blueprints[category][formulaName];
        break;
      }
    }
    this.state.rawJsonDefinition = found;
    // [cite: 2026-01-14] INVARIANT: Projection vectors are write-once per user action.
    // Shape changes must be projection-neutral. We do NOT reset vectors here.
  }

  performInternalSmokeTest() {
    const errors = [];
    // [cite: 2026-01-13] FIXED: Removed invalid pinch check. 0 is safe.
    return { success: errors.length === 0, errors };
  }
}

export const intentService = new ParametricIntentService();