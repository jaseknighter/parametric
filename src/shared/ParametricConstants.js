/**
 * @fileoverview ParametricConstants.js
 * MAIN DEFINITIONS: Centralized constants for the high-fidelity math pipeline.
 * FIXED: Added FEATURE_DOMAINS to support the dynamic range registry.
 * [cite: 2026-01-08]
 */

export const DEBUG_THROTTLES = {
  INTENT: 10000,    
  PIPELINE: 10000,  
  LOGIC: 10000,     
  MANAGER: 10000,
  WORKER: 5000,      // Keep heartbeats slightly faster to ensure it's alive
  VIEW: 10000,
  DISPLAY: 500,      // [cite: 2026-01-19] DISPLAY: High-freq resize events need tighter throttling
};

export const SLIDER_THROTTLE_MS = 16; 
export const SLIDER_STEP = 0.01;
export const MAX_VERTICES = 70000;
export const HUD_TYPING_DEBOUNCE = 300;
export const SCALE_FACTOR = 5.0;

// [cite: 2026-01-19] MOBILE LAYOUT CONSTANTS
export const MOBILE_SCALE_FACTOR = 0.65;

export const LAYOUT_THRESHOLDS = {
  DESKTOP_TO_MOBILE: 700,
  MOBILE_TO_DESKTOP: 950
};

/**
 * DEBUG_CHANNELS
 * The Central Authority for observability.
 */
export const DEBUG_CHANNELS = {
  WORKER: "WORKER",       // Geometry processing
  CONTRACT: "CONTRACT",   // RID & state sync
  LOGIC: "LOGIC",         // Formula parsing
  DISPLAY: "DISPLAY",     // Layout, Resize, & Breakpoints
  AUTHORITY: "AUTHORITY", // System locks
  PIPELINE: "PIPELINE",   // Rendering & Viewport fit
  INTENT: "INTENT",       // Input shipping
  MAIN: "MAIN",           // Core Lifecycle
  MANAGER: "MANAGER"      // Worker Orchestration
};

export const DEFAULT_ACTIVE_CHANNELS = Object.values(DEBUG_CHANNELS);

/** @constant {number} PI Standard Math Circle Constant */
export const PI = Math.PI;

/** * ROMANESCO FRACTAL CONSTANTS */
export const ROMANESCO_G_VAL = 0.5; 
export const ROMANESCO_P_OFF = -0.2; 
export const ROMANESCO_NUM   = 1.0; 
export const ROMANESCO_SCALE = 1.5; 
export const ROMANESCO_MASK  = 7.0; 

/** * PIPELINE TUNING CONSTANTS */
export const BEND_FREQ_BASE = Math.PI; // Base for the half-bend arc
export const SPIRAL_FREQ_MULT = Math.PI * 4; 
export const MODULATE_FREQ_MULT = Math.PI * 8; 

/** * INDIVIDUAL EFFECT SCALARS */
export const SCALARS = {
  BEND: 100.0,            // SCALAR now acts as the "Curvature Intensity"
  MODULATE: 10,
  SPIRAL_LOOP: 100,     // Strength of the sin/cos loop offset
  SPIRAL_WINDING: 50,  // Strength of the rotational twist
  PINCH: 0.5,           // Power factor for the pinch curve
  TEX_OUTER: 0.2,       // Restored Legacy Texture Scalar
  TEX_INNER: -0.7       // Restored Legacy Texture Scalar
};

/** * RESTORED TEXTURE FREQUENCY CONSTANTS */
export const TEX_OUTER_FREQ = 14.0;   
export const TEX_INNER_FREQ = 45.0;   

/** @enum {string} */
export const FormulaMode = { STAGE: 'STAGE', MANUAL: 'MANUAL' };

/** @enum {string} */
export const FormulaEvents = {
  USER_EDIT: 'USER_EDIT_FORMULA',
  EXIT_MANUAL: 'USER_EXIT_MANUAL',
  UPDATE: 'STATE_UPDATE'
};

export const SHAPE_KEYS = {
  SINE: "SINE",
  CIRCLE: "CIRCLE",
  SEASHELL: "SEASHELL",
  MOBIUS: "MOBIUS",
  KLEIN: "KLEIN",
  FRACTAL: "FRACTAL",
  DIAGNOSTIC: "DIAGNOSTIC"
};

/**
 * FEATURE_DOMAINS
 * Defines the [min, max] range for specific UI controls.
 */
export const FEATURE_DOMAINS = {
  BEND: [0, 5],
  MODULATE: [0, 2],
  SPIRAL: [0, 1],
  PINCH: [0, 5],
  FLATTEN: [0, 1],
  SCALE: [0.1, 5],
  ROTATION: [-Math.PI, Math.PI],
  TEXTURE: [0, 2],
  DEFAULT: [0, 1]
};

export const sanitizeNumber = (val) => {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
};

export const PARAM_MAP = {
  BEND: { x: 'bendAmtX', y: 'bendAmtY', z: 'bendAmtZ', leader: 'bendAmtX' },
  MODULATE: { x: 'modulateAmtX', y: 'modulateAmtY', z: 'modulateAmtZ', leader: 'modulateAmtX' },
  SPIRAL: { x: 'spiralAmtX', y: 'spiralAmtY', z: 'spiralAmtZ', leader: 'spiralAmtZ' },
  PINCH: { x: 'pinchAmtX', y: 'pinchAmtY', z: 'pinchAmtZ', leader: 'pinchAmtX' },
  FLATTEN: { x: 'flattenAmtX', y: 'flattenAmtY', z: 'flattenAmtZ', leader: 'flattenAmtX' },
  SCALE: { x: 'scaleAmtX', y: 'scaleAmtY', z: 'scaleAmtZ', leader: 'scaleAmtX' },
  ROTATION: { x: 'rotationAmtX', y: 'rotationAmtY', z: 'rotationAmtZ', leader: 'rotationAmtX' },
  TEXTURE: { outerTexture: 'outerTextureAmt', innerTexture: 'innerTextureAmt', leader: 'texture' }
};

/**
 * INITIAL_PARAMETRIC_OBJ
 * FIXED: Changed formulas to a high-visibility ripple plane.
 * FIXED: Ensured scale is non-zero.
 */
export const INITIAL_PARAMETRIC_OBJ = {
  version: "2.1.0",
  rid: 1, // Start with a non-zero authority
  resolution: 100,
  // Mapping 0..1 to -5..5
  uFormula: "(u * 10) - 5", 
  vFormula: "(v * 10) - 5",
  // A simple ripple that MUST produce height
  wFormula: "sin(u * 5) * 2", 
  transformationInstructions: {
    shaping: {
      radius: 5.0, // [cite: 2026-01-20] FIX: Match bootstrap default to stabilize snapshots
      vectorParams: {
        BEND: { bendAmtX: 0.0, bendAmtY: 0.0, bendAmtZ: 0.0 },
        MODULATE: { modulateAmtX: 0.0, modulateAmtY: 0.0, modulateAmtZ: 0.0 },
        SPIRAL: { spiralAmtX: 0.0, spiralAmtY: 0.0, spiralAmtZ: 0.0 },
        TEXTURE: {
          outerTextureAmt: 0.0, innerTextureAmt: 0.0, texture: 0.0
        },
        PINCH: { pinchAmtX: 0.0, pinchAmtY: 0.0, pinchAmtZ: 0.0 },
        FLATTEN: { flattenAmtX: 0.0, flattenAmtY: 0.0, flattenAmtZ: 0.0 },
        // CRITICAL: Ensure these stay at 1.0
        SCALE: { scaleAmtX: 1.0, scaleAmtY: 1.0, scaleAmtZ: 1.0 },
        ROTATION: { rotationAmtX: 0.0, rotationAmtY: 0.0, rotationAmtZ: 0.0 }
      }
    },
    projecting: { vectors: ['x', 'y', 'z'] }
  }
};

/**
 * PARAMETRIC PERFORMANCE TUNING
 * [cite: 2026-01-16]
 */
export const INTENT_CONFIG = { // Also serves as PERFORMANCE_CONFIG
  // 1. INPUT GOVERNOR (The Slider "Sieve")
  // Only emit an update if the value has changed by more than this epsilon.
  SLIDER_PRECISION_THRESHOLD: 0.005, 

  // 2. TEMPORAL THROTTLE (The "Pulse")
  // Minimum time in ms between consecutive INTENT_UPDATE dispatches.
  EVENT_THROTTLE_MS: 16,

  // 3. CONVERGENCE TOLERANCE (The "Handshake")
  // Epsilon used by IntentService and Playwright to verify state mirroring.
  SYNC_EPSILON: 0.0001,
};
