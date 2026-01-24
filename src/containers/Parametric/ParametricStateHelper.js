/**
 * syncParametricUpdate
 * [cite: 2026-01-11] Compare against last state to prevent dropping logic.
 * [cite: 2026-01-13] Atomic latching of UI state and math values.
 * [cite: 2026-01-11] Comparing against previous state to ensure path accuracy.
 */

import { ParametricRegistry } from "../../services/ParametricRegistry";
import { Debug } from "../../utilities/debug";

export const syncParametricUpdate = (prevObj, updateArray, isSynced, activeKey) => {
  if (!prevObj) return prevObj;
  
  // [cite: 2026-01-13] DEBUG: Verify entry arguments
  if (isSynced) Debug.log("LOGIC", `[SyncHelper] Entry. Synced: ${isSynced}, ActiveKey: ${activeKey}, Updates: ${updateArray.length}`);

  const nextObj = JSON.parse(JSON.stringify(prevObj));
  let hasChanged = false;

  // 1. Highlight Latch: Update UI state
  if (activeKey) {
    if (!nextObj.transformationInstructions) nextObj.transformationInstructions = {};
    if (!nextObj.transformationInstructions.projecting) nextObj.transformationInstructions.projecting = {};
    nextObj.transformationInstructions.projecting.activeMode = activeKey;
    hasChanged = true;
  }

  // 2. Value Latch: Direct paths
  updateArray.forEach((update) => {
    const { objectStatePath } = update;
    // [cite: 2026-01-18] FIX: Robustly handle 'value' vs 'newValue' and 'intentKey' vs 'paramToUpdate'
    const paramKey = update.paramToUpdate || update.intentKey;
    const newValue = update.newValue ?? update.value;
    let fullPath = objectStatePath;
    
    // [cite: 2026-01-13] AUTHORITY: Resolve path via Registry to prevent UI mismatches
    if (ParametricRegistry[paramKey]) {
      fullPath = ParametricRegistry[paramKey].path;
    }
    
    // [cite: 2026-01-18] FIX: Dumb Writer - If no path, we cannot write.
    if (!fullPath) return;

    const parts = fullPath.split('.');
    const key = parts.pop();
    let target = nextObj;
    
    for (const part of parts) {
      if (!target[part]) target[part] = {};
      target = target[part];
    }

    if (target[key] !== newValue) {
      target[key] = newValue;
      hasChanged = true;
    }
  });

  return hasChanged ? nextObj : prevObj;
};