/**
 * @fileoverview MySlider.js
 * MAIN UI COMPONENT: Throttled slider with Prop-Sync Guard.
 * FIXED: Exhaustive-deps warning resolved without losing drag protection.
 */

import React, { useState, useMemo, useEffect, useRef } from "react";
import { Slider, Rail, Handles, Tracks, Ticks } from "react-compound-slider";
import { SliderRail, Handle, Track, Tick } from "./MySliderComponents";
import { SLIDER_STEP, SLIDER_THROTTLE_MS, INTENT_CONFIG } from "../../../shared/ParametricConstants";

const sliderStyle = {
  position: "relative",
  height: "9rem",
  width: "100%",
  touchAction: "none"
};

const MySlider = ({ domain: propsDomain, defaultValues, handleUpdate, testID }) => {
  const domain = useMemo(() => propsDomain || [0, 10], [propsDomain]);
  const [values, setValues] = useState(() => (defaultValues || [0]).slice());
  
  const lastNotifiedStr = useRef(JSON.stringify(defaultValues || []));
  const isDragging = useRef(false);
  const activeEventRef = useRef({ shiftKey: false, altKey: false, ctrlKey: false });
  const lastNotifyTime = useRef(0);
  const isProgrammaticUpdate = useRef(false);
  const lastExternalValue = useRef(defaultValues ? defaultValues[0] : 0);
  const throttleTimerRef = useRef(null); // [cite: 2026-01-16] FIX: Trailing edge timer

  // Prop-Sync Guard
  useEffect(() => {
    if (isDragging.current || !defaultValues || defaultValues.length === 0) return;
    
    // AUTHORITY: Only sync if the external state is actually different
    // from our local UI state. This breaks the "Bridge-free" loop.
    const incoming = defaultValues[0] || 0;

    if (Math.abs(incoming - lastExternalValue.current) > INTENT_CONFIG.SYNC_EPSILON) {
      lastExternalValue.current = incoming;
      isProgrammaticUpdate.current = true;
      setValues([...defaultValues]);
      lastNotifiedStr.current = JSON.stringify(defaultValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValues]); 

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);
    };
  }, []);

  const captureModifierState = (e) => {
    activeEventRef.current = {
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      ctrlKey: e.ctrlKey,
      type: e.type
    };
  };

  const notifyParent = (vals) => {
    lastNotifiedStr.current = JSON.stringify(vals);
    lastNotifyTime.current = performance.now();
    if (typeof handleUpdate === 'function') {
      handleUpdate(vals, activeEventRef.current);
    }
  };

  const onUpdate = (newValues) => {
    if (isProgrammaticUpdate.current) {
      isProgrammaticUpdate.current = false;
      return;
    }

    const newVal = newValues[0];
    // Prevent "Snap-Back" if the slider tries to update while a sync is in flight
    if (Math.abs(newVal - lastExternalValue.current) < INTENT_CONFIG.SYNC_EPSILON && !isDragging.current) {
      return;
    }

    if (!newValues || newValues.length === 0) return;
    setValues(newValues);
    const stringified = JSON.stringify(newValues);
    
    // [cite: 2026-01-16] FIX: Centralized Trailing Edge Throttle
    // Ensures that even if updates are dropped, the final value is eventually sent.
    const now = performance.now();
    const throttleDuration = SLIDER_THROTTLE_MS || 16;
    const timeSinceLast = now - lastNotifyTime.current;

    if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);

    if (stringified !== lastNotifiedStr.current && timeSinceLast > throttleDuration) {
      notifyParent(newValues);
    } else {
      throttleTimerRef.current = setTimeout(() => {
        notifyParent(newValues);
      }, throttleDuration - timeSinceLast);
    }
  };

  return (
    <div 
      style={{ height: "9rem", width: "100%", position: "relative" }}
        data-testid={testID ? testID.replace('-handle', '') : undefined} // SMOKE TESTING
        onPointerDown={(e) => {
        isDragging.current = true;
        isProgrammaticUpdate.current = false; // Safety reset
        captureModifierState(e);
      }}
      onPointerMove={(e) => { if(e.buttons > 0) captureModifierState(e); }}
      onPointerUp={() => { isDragging.current = false; }}
    >
      <Slider
        vertical reversed mode={1}
        step={SLIDER_STEP || 0.01}
        domain={domain}
        rootStyle={sliderStyle}
        onUpdate={onUpdate} 
        onChange={(vals) => { 
          // [cite: 2026-01-16] PATTERN: Atomic Trailing Edge (Lossless Latch)
          // Guarantees the final value is committed on release, regardless of throttling.
          isDragging.current = false;
          notifyParent(vals);
        }}
        values={values} 
      >
        <Rail>{({ 
          getRailProps }) => <SliderRail 
          getRailProps={getRailProps} 
          data-testid={testID ? `${testID.replace('-handle', '')}-rail` : undefined} // SMOKE TESTING
          />}
        </Rail>
        <Handles>
          {({ handles, getHandleProps }) => (
            <div className="slider-handles">
              {handles.map((handle) => (
                <Handle 
                  key={handle.id} 
                  handle={handle} 
                  domain={domain} 
                  getHandleProps={getHandleProps} 
                  data-testid={testID}  // SMOKE TESTING
                />
              ))}
            </div>
          )}
        </Handles>
        <Tracks left={false} right={false}>
          {({ tracks, getTrackProps }) => (
            <div className="slider-tracks">
              {tracks.map(({ id, source, target }) => (
                <Track 
                  key={id} 
                  source={source} 
                  target={target} 
                  getTrackProps={getTrackProps}
                  data-testid={testID ? `${testID.replace('-handle', '')}-track` : undefined} // SMOKE TESTING
                />
              ))}
            </div>
          )}
        </Tracks>
        {/* <Ticks count={5}>
          {({ ticks }) => (
            <div className="slider-ticks">
              {ticks.map((tick) => (
                <Tick key={tick.id} tick={tick} count={ticks.length} />
              ))}
            </div>
          )}
        </Ticks> */}
      </Slider>
    </div>
  );
};

export default MySlider;