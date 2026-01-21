/**
 * @fileoverview IntentBasedVectorSlider.js
 * FIXED: Inverse Projection ensures Sliders show Degrees while State holds Radians.
 * [cite: 2026-01-15] AUTHORITY: Registry-driven un-projection.
 */
import React, { useCallback, useMemo, useState, useEffect, useRef } from "react";
import MySlider from "./MySlider";
import { CANONICAL_KEYS } from "../../../shared/CanonicalKeys";
import { FEATURE_DOMAINS, INTENT_CONFIG } from "../../../shared/ParametricConstants";
import { getFeaturePath, ParametricRegistry } from "../../../services/ParametricRegistry"; 
import { intentService } from "../../../services/ParametricIntentService";

const IntentBasedVectorSlider = ({ parametricObj, handleUpdate, activeKey, axesLabels }) => {
  const statePath = useMemo(() => getFeaturePath(activeKey), [activeKey]);
  
  const activeDomain = useMemo(() => {
    return FEATURE_DOMAINS[activeKey] || FEATURE_DOMAINS.DEFAULT || [0, 1];
  }, [activeKey]);

  /**
   * INVERSE PROJECTION:
   * Maps state-space (Radians) back to UI-space (Degrees).
   */
  const unprojectValue = useCallback((val, key) => {
    // [cite: 2026-01-15] FIX: Reducer now stores RAW intent (Degrees).
    // No inverse projection is needed for display.
    return val;
  }, []);

  const vp = useMemo(() => {
    const parts = statePath.split('.');
    const rawGroup = parts.reduce((acc, part) => acc?.[part], parametricObj) || {};
    
    // Apply inverse projection to the whole group for the UI
    const unprojectedGroup = {};
    Object.entries(rawGroup).forEach(([k, v]) => {
      unprojectedGroup[k] = unprojectValue(v, k);
    });
    return unprojectedGroup;
  }, [parametricObj, statePath, unprojectValue]);

  const [localVals, setLocalVals] = useState({});
  // [cite: 2026-01-16] CLEANUP: Throttling moved to MySlider.js for global consistency
  const lastValRef = useRef({}); // [cite: 2026-01-16] FIX: Ref for threshold check to avoid re-renders

  useEffect(() => {
    const next = {};
    axesLabels.forEach((label) => {
      const canonical = CANONICAL_KEYS[activeKey]?.[label] || label;
      next[canonical] = vp[canonical] ?? 0;
    });
    setLocalVals(next);
  }, [vp, axesLabels, activeKey]);

  const onSliderChange = useCallback(
    (values, label, event) => {
      const val = values[0];
      const canonical = CANONICAL_KEYS[activeKey]?.[label] || label;

      // 🟢 THRESHOLD GUARD: Ignore tiny micro-jitter updates
      const prevVal = lastValRef.current[canonical] ?? 0;
      if (Math.abs(val - prevVal) < INTENT_CONFIG.SLIDER_PRECISION_THRESHOLD) return;

      // Update local tracking
      lastValRef.current[canonical] = val;
      setLocalVals((prev) => ({ ...prev, [canonical]: val }));

      const updateBatch = [{
        objectStatePath: statePath,
        paramToUpdate: canonical, 
        newValue: val,
      }];

      intentService.setIntent(canonical, val);
      handleUpdate(updateBatch, { shiftKey: event?.shiftKey || false, activeKey });
    },
    [handleUpdate, statePath, activeKey]
  );

  // Inside IntentBasedVectorSlider.js - The Return Block
  return (
    <div className="TAreaInterface_controlsContainer">
      {axesLabels.map((label, i) => {
        const canonical = CANONICAL_KEYS[activeKey]?.[label] || label;
        
        // [cite: 2026-01-15] DEFENSIVE: localVals might be empty during 
        // the first render after a projection vector change.
        const rawValue = localVals[canonical];
        const safeDefault = (typeof rawValue === 'number' && !isNaN(rawValue)) ? rawValue : 0;

        return (
          <div key={`${activeKey}_${label}`} className={`UISliderContainer UISliderContainer__${i + 1}`}>
            <label className="SliderLabel">{label}</label>
            <MySlider
              domain={activeDomain} 
              // [cite: 2026-01-06] Real Solution: Never pass undefined to MySlider
              defaultValues={[safeDefault]} 
              handleUpdate={(values, event) => onSliderChange(values, label, event)}
              testID={`slider-${activeKey}-${label}-handle`}
            />
          </div>
        );
      })}
    </div>
  );
};

export default React.memo(IntentBasedVectorSlider);