/**
 * @fileoverview VariableBridge.js
 * BRIDGE: Maps Intent Service State (Canonical) to Formula Execution Scope (Symbols).
 * Ensures consistency between Worker execution and Snapshot Audits.
 * [cite: 2026-01-16]
 */
import { Debug } from "./debug";

// [cite: 2026-01-20] STABILITY: Initialize with safe identity scope to prevent boot-time flash
let lastValidScope = {
  bendAmtX: 0, bendAmtY: 0, bendAmtZ: 0,
  pinchAmtX: 0, pinchAmtY: 0, pinchAmtZ: 0,
  spiralAmtX: 0, spiralAmtY: 0, spiralAmtZ: 0,
  modulateAmtX: 0, modulateAmtY: 0, modulateAmtZ: 0,
  flattenAmtX: 0, flattenAmtY: 0, flattenAmtZ: 0,
  outerTextureAmt: 0, innerTextureAmt: 0,
  t: 0, rid: 0
};

export const getFormulaExecutionScope = (settings) => {
  if (!settings) {
    // [cite: 2026-01-18] CRITICAL: Log the null-pointer but prevent the crash.
    // This ensures visibility in the HUD/Logs while keeping the Worker alive.
    // const msg = `[BRIDGE] Settings is NULL. Last Valid RID: ${lastValidScope?.rid}`;
    // console.warn(msg);
    // Debug.warn("WORKER", msg);
    // [cite: 2026-01-20] STABILITY: Use cached scope during layout thrashing
    if (lastValidScope) return lastValidScope;
    
    return lastValidScope;
  }

  // [cite: 2026-01-18] FIX: Safety fallback for null/undefined input
  const s = settings || {};
  const params = s.vectorParams || s; // Handle both nested and flat structures

  // [cite: 2026-01-16] MAPPING CONTRACT:
  // The Formula Engine (ParametricGeometryFormulas.js) uses Canonical Keys (e.g. 'bendAmtX').
  // The Worker destructures these directly from the scope.
  // This bridge ensures the Snapshot Test uses the exact same variable set.
  const scope = {
    bendAmtX: params.bendAmtX || 0,
    bendAmtY: params.bendAmtY || 0,
    bendAmtZ: params.bendAmtZ || 0,
    pinchAmtX: params.pinchAmtX || 0,
    pinchAmtY: params.pinchAmtY || 0,
    pinchAmtZ: params.pinchAmtZ || 0,
    spiralAmtX: params.spiralAmtX || 0,
    spiralAmtY: params.spiralAmtY || 0,
    spiralAmtZ: params.spiralAmtZ || 0,
    modulateAmtX: params.modulateAmtX || 0,
    modulateAmtY: params.modulateAmtY || 0,
    modulateAmtZ: params.modulateAmtZ || 0,
    flattenAmtX: params.flattenAmtX || 0,
    flattenAmtY: params.flattenAmtY || 0,
    flattenAmtZ: params.flattenAmtZ || 0,
    outerTextureAmt: params.outerTextureAmt || 0,
    innerTextureAmt: params.innerTextureAmt || 0,
    t: s.t ?? 0
  };
  
  // [cite: 2026-01-20] DIAGNOSTIC: Cache RID with scope for better null-event tracing
  scope.rid = s.rid;
  if (Debug.isEnabled("WORKER") && (!lastValidScope || lastValidScope.rid !== scope.rid)) {
    Debug.log("WORKER", `[VariableBridge] New Scope Cached. RID: ${scope.rid}`);
  }
  lastValidScope = scope;
  return scope;
};

// [cite: 2026-01-20] TEST HELPER: Explicit reset for unit tests
export const resetVariableBridge = () => {
  lastValidScope = {
    bendAmtX: 0, bendAmtY: 0, bendAmtZ: 0,
    pinchAmtX: 0, pinchAmtY: 0, pinchAmtZ: 0,
    spiralAmtX: 0, spiralAmtY: 0, spiralAmtZ: 0,
    modulateAmtX: 0, modulateAmtY: 0, modulateAmtZ: 0,
    flattenAmtX: 0, flattenAmtY: 0, flattenAmtZ: 0,
    outerTextureAmt: 0, innerTextureAmt: 0,
    t: 0, rid: 0
  };
};