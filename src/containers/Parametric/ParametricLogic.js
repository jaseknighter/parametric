/**
 * @fileoverview ParametricLogic.js
 * MAIN LOGIC & TRANSFORMATION PIPELINE
 * PILLARS: Modulate, Bend, Shape, Project, Texture.
 * AUTHORITY: intentService.projectForCPU() with Transaction Latching.
 * [cite: 2026-01-13]
 */

import Formulas from './ParametricGeometryFormulas.js';
import { intentService } from "../../services/ParametricIntentService.js";
import { Debug } from "../../utilities/debug";

/**
 * [cite: 2026-01-16] DEBUG: Frame-Level Logging
 * Inject this into the packet return to trace the "Ghost Frame"
 */
const wrapPacketWithDebug = (packet) => {
  if (typeof window !== 'undefined' && (window.__DEBUG_HUD__ || Debug.isEnabled("LOGIC"))) {
    const t = performance.now().toFixed(3);
    const manual = !!packet.manualFormula;
    const scopeLen = Object.keys(packet.scope || {}).length;
    
    // Debug.log("LOGIC", `[PACKET] RID:${packet.rid} | Mode:${manual ? 'MANUAL' : 'AUTO'} | Scale:${packet.scaleFactor} | t:${t}`);
  }

  // [cite: 2026-01-16] TEST HOOK: Packet Stream Capture for Authority Regression Test
  if (typeof window !== 'undefined' && window.__packetLog) {
    window.__packetLog.push({
      rid: packet.rid,
      manual: !!packet.manualFormula,
      t: performance.now()
    });
  }
  return packet;
};

/**
 * prepareWorkerScope
 * [cite: 2026-01-13] AUTHORITY: intentService.projectForCPU().
 */
export const prepareWorkerScope = (settings = {}) => {
  // AUTHORITY: The Service handles the Registry path traversal
  const { mathScope } = intentService.projectForCPU(settings);
  return mathScope;
};

/**
 * getWorkerDataPacket
 * [cite: 2026-01-06] Validated: Bridging UI state to Worker math.
 */
export const getWorkerDataPacket = (settings) => {
  if (!settings) return null;
  const scope = prepareWorkerScope(settings);

  // [cite: 2026-01-17] FIX: Restore Vector Flattening.
  // The Worker requires a 1D array of keys ['x', 'y', 'z'], but the Reducer stores a 3x3 matrix.
  let flatVectors = ['x', 'y', 'z'];
  const rawVecs = settings.vectors || 
                  settings.projecting?.vectors || 
                  settings.transformationInstructions?.projecting?.vectors;
  
  if (Array.isArray(rawVecs) && Array.isArray(rawVecs[0])) {
      // Smart flatten: Find the first non-empty string in each row
      flatVectors = rawVecs.map(row => row.find(val => typeof val === 'string' && val.length > 0) || '');
  } else if (Array.isArray(rawVecs)) {
      flatVectors = rawVecs;
  }
  
  const isManual = settings.isManualOverride;
  
  // [cite: 2026-01-18] FIX: Robust Radius Extraction
  // Ensure we have a valid radius for Manual Mode scaling, falling back to state if scope fails.
  // [cite: 2026-01-18] FIX: Fallback to 5.0 (Standard Unit) if radius is missing/1.0 to prevent shrink.
  const effectiveRadius = (scope.radius !== undefined && scope.radius !== null) 
    ? Number(scope.radius) 
    : (settings.radius || settings.transformationInstructions?.shaping?.radius || 5.0);

  // [cite: 2026-01-18] Helper to extract string from formula generator
  const getAutoFormula = (axis) => {
    const res = generateFormulaString(settings, scope, axis, null, true);
    return (typeof res === 'object' && res.expr) ? res.expr : res;
  };

  // MVA: Do not "decide" what to send based on manual mode inside logic.
  // Parametric.js has already pre-calculated these strings.
  const packet = wrapPacketWithDebug({
    type: 'CALCULATE',
    rid: settings.rid, // The ONLY authoritative ID
    t: settings.t || 0,
    // [cite: 2026-01-18] FIX: Strictly nullify manualFormula in Auto Mode to prevent Worker pollution
    manualFormula: isManual ? settings.manualFormula : null,
    // [cite: 2026-01-18] FIX: Immediate Logic Invalidation
    // Always regenerate formulas to capture fresh scope.
    // [cite: 2026-01-18] FIX: Force normalized formula (isSimple=true) for Auto Mode to prevent double-scaling.
    uFormula: isManual ? settings.manualFormula : getAutoFormula('u'),
    vFormula: isManual ? settings.vFormula : getAutoFormula('v'),
    wFormula: isManual ? settings.wFormula : getAutoFormula('w'),
    scope,
    projecting: { 
      ...(settings.projecting || {}),
      vectors: flatVectors
    },
    resolution: settings.resolution || 50,
    // [cite: 2026-01-18] REFACTOR: Formula is normalized (Radius 1). Apply effective radius as scale.
    scaleFactor: effectiveRadius
  });

  Debug.log("LOGIC", "Generated Packet:", { 
    rid: packet.rid, 
    scaleFactor: packet.scaleFactor, 
    radius: scope.radius,
    isManual: settings.isManualOverride,
    vectors: packet.projecting.vectors,
    scope: scope,
    uFormulaSample: packet.uFormula ? packet.uFormula.substring(0, 60) : "N/A",
    manualFormulaSample: packet.manualFormula ? packet.manualFormula.substring(0, 60) : "N/A"
  });
  return packet;
};


/** * Utility Interface Exports [cite: 2026-01-04] */
export const generateFormulaString = (s, b = null, c = 'u', override = null, isSimple = false) => 
  Formulas.generateFormulaString(s, b || prepareWorkerScope(s), c, override, isSimple);

export const validateFormulaIntent = (settings) => {
  const hasRawFormula = !!(settings?.uFormula && settings?.vFormula);
  const hasShapeSelection = !!(settings?.transformationInstructions?.shaping?.formula);
  return hasRawFormula || hasShapeSelection;
};


export const validateAxisSelection = (v = []) => ({ 
  isValid: new Set(v).size === 3, 
  x: v.includes('x'), y: v.includes('y'), z: v.includes('z') 
});

export const normalizeFormulaString = (r) => String(r || "").replace(/\s+/g, ' ').trim();

export const preflightValidation = (code) => {
  if (!code || code.length < 5) return { valid: false, error: "Empty formula" };
  
  // [cite: 2026-01-16] FIX: Atomic Formula Lock - Syntax Validation via Parser
  // Replaces brittle regex checks for incomplete assignments (e.g. "x = ;")
  try {
    new Function(code);
  } catch (e) {
    return { valid: false, error: e.message, type: "syntax" };
  }

  // [cite: 2026-01-16] FIX: Atomic Formula Lock - Balanced Parentheses
  const opened = (code.match(/\(/g) || []).length;
  const closed = (code.match(/\)/g) || []).length;
  if (opened !== closed) {
    return { valid: false, error: "Unbalanced parentheses", type: "syntax" };
  }

  return /[uvt]/.test(code) ? { valid: true } : { valid: false, error: "Missing u, v, or t", type: "syntax" };
};

/**
 * setProjectionVector
 * [cite: 2026-01-14] Helper to update a single vector axis via IntentService.
 */
export const setProjectionVector = (index, value) => {
  // [cite: 2026-01-14] DEPRECATED: Vectors are now managed directly in Parametric.js state.
  // This function is kept for API compatibility but should not be used for state mutation.
  Debug.warn("LOGIC", "setProjectionVector in Logic is deprecated. Use UI state handler.");
};

(function verifyLogicIntegrity() {
  const exports = { prepareWorkerScope, getWorkerDataPacket, generateFormulaString, validateAxisSelection };
  const missing = Object.keys(exports).filter(fn => typeof exports[fn] !== 'function');
  if (missing.length === 0) {
    Debug.log("LOGIC", "✅ [Logic] Convergence Integrity Passed.");
  }
})();
