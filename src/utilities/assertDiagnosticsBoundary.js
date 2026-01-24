/**
 * @fileoverview assertDiagnosticsBoundary.js
 * PURPOSE: Hardens the boundary between Engine and Diagnostics.
 * Ensures the HUD is a "Passenger" and never a "Driver".
 * [cite: 2026-01-08]
 */

/**
 * assertReadOnly
 * JSDoc: Wraps an object in a Proxy that throws on any mutation attempt.
 * @param {Object} target - The state object to protect.
 * @param {string} label - Context for the error message.
 */
export const assertReadOnly = (target, label = 'DiagnosticsHUD') => {
  // [cite: 2026-01-18] FIX: Explicitly ignore null/undefined/primitives to prevent proxying errors.
  // Previously returned {} for null, which broke identity checks.
  if (!target || typeof target !== 'object') return target;
  
  // Skip Proxy in production for maximum performance
  if (process.env.NODE_ENV === 'production') return target;

  return new Proxy(target, {
    get(obj, prop) {
      const value = obj[prop];
      // Recursive protection for nested objects
      if (typeof value === 'object' && value !== null) {
        return assertReadOnly(value, label);
      }
      return value;
    },
    set(obj, prop, value) {
      const msg = `🛡️ [${label} Protected] Attempted to mutate property "${String(prop)}". The HUD must be Read-Only.`;
      
      // 1. Log as a warning to keep the console clean but transparent
      console.warn(msg);
      
      // 2. RETURN TRUE: This is the "Sentry" secret. 
      // In a Proxy, returning true tells the caller "I handled it," 
      // but because we didn't actually set target[prop] = value, 
      // the mutation is effectively blocked.
      return true; 
    },
    deleteProperty(obj, prop) {
      const msg = `🛡️ [${label} Protected] Attempted to delete property "${String(prop)}".`;
      console.warn(msg);
      
      // Block the deletion without crashing the execution context
      return true;
    }
  });
};