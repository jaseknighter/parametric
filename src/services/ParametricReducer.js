/**
 * @fileoverview ParametricReducer.js
 * SOURCE OF TRUTH: Authoritative State Manager for Parametric Engine.
 * FIXED: Batch processing ensures Atomic Publication for vector "swarms."
 * FIXED: Immutable deep-path writer prevents projection snap-back.
 */
import { ParametricRegistry } from "./ParametricRegistry";
import { setByPath } from "./ParametricReducerHelpers";

/**
 * ParametricReducer
 * @param {Object} state - The global Parametric State.
 * @param {Object} action - The dispatched action (type, intentKey, value, category).
 */
export const ParametricReducer = (state, action) => {
  switch (action.type) {
    case 'INTENT_UPDATE': {
      // 1. Snapshot the ledger
      // [cite: 2026-01-18] FIX: Use JSON fallback for Jest environment compatibility (missing structuredClone)
      const nextState = JSON.parse(JSON.stringify(state));
      
      // 2. Resolve the RID
      // [cite: 2026-01-18] FIX: Atomic RID Generation
      const rid = action.rid !== undefined ? action.rid : (state.rid || 0) + 1;

      // 3. Normalize the batch (Handle single intent or array)
      const updates = action.batch || [{ 
        intentKey: action.intentKey, 
        value: action.value 
      }];

      // 4. DUMB WRITE: Apply values exactly where the Registry says
      for (const update of updates) {
        // [cite: 2026-01-18] FIX: Robustly handle 'value' vs 'newValue' and 'intentKey' vs 'paramToUpdate'
        const intentKey = update.intentKey || update.paramToUpdate;
        const value = update.value ?? update.newValue;

        const meta = ParametricRegistry[intentKey];
        if (!meta || !meta.path) continue;

        // 🛡️ THE RULE: No clamping, no projection logic, no seatbelts here.
        setByPath(nextState, meta.path, value);
      }

      nextState.rid = rid;

      // 🟢 ATOMIC PUBLICATION: Direct truth for Playwright
      if (typeof window !== 'undefined') {
        window.parametricState = nextState;
      }

      return nextState;
    }
    
    default: 
      return state;
  }
};
