/**
 * @fileoverview withInterfaceControls.js
 * HOC: Standardizes UI control behavior.
 * RESTORED: All animation logic, transition locking, and proxy handlers.
 * FIXED: Identity propagation for stable Playwright testing.
 * [cite: 2026-01-12]
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { isFeatureEnabled } from "../../../shared/featureFlagUtils";

/**
 * withInterfaceControls
 * A High-Order Component that wraps control groups with animation and identity logic.
 * @param {React.Component} WrappedComponent - The UI component to wrap.
 * @param {string|null} defaultID - Fallback ID if none is provided via props.
 * @param {string} controlClass - CSS class for the wrapper.
 */
const withInterfaceControls = (WrappedComponent, defaultID, controlClass) => {
  
  const ControlWrapper = (props) => {
    const { 
      id: propID, 
      numberOfColumns, 
      collapse, 
      onOpen, 
      onClose, 
      adjustYAmt = 0, 
      handleUpdate, 
      setActiveControlKey,
      ...rest 
    } = props;

    // 🟢 IDENTITY RESOLUTION: Prioritize propID from Interface.js loop
    const controlID = propID || defaultID;
    
    // [cite: 2026-01-27] A11Y: Feature Flag check
    const isA11yEnabled = isFeatureEnabled('accessibilityHardening');
    const sectionId = `section-content-${controlID}`;

    const [isOpen, setIsOpen] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const controlsRef = useRef(null);

    const openStyle = useMemo(() => 
      `Controls___Container_${numberOfColumns.toString().replace('.', '_')}column_Open`, 
      [numberOfColumns]
    );
    const closeStyle = useMemo(() => 
      `Controls___Container_${numberOfColumns.toString().replace('.', '_')}column_Close`, 
      [numberOfColumns]
    );

    /**
     * handleUpdateProxy
     * Passes the update array through to the Batcher.
     */
    const handleUpdateProxy = useCallback((updates, event) => {
      if (process.env.NODE_ENV === 'development' && Array.isArray(updates)) {
        const isSlider = updates.some(u => u.paramToUpdate?.toLowerCase().includes('amt'));
        if (isSlider && !event) {
          console.warn(`[Architectural Violation]: ${controlID} missing event.`);
        }
      }
      if (handleUpdate) handleUpdate(updates, event);
    }, [handleUpdate, controlID]);

    const runOpenAnim = useCallback((cRef, interfaceEl) => {
      if (!interfaceEl) return;
      setIsTransitioning(true);
      cRef.classList.add(openStyle);
      cRef.classList.remove(closeStyle);
      setTimeout(() => {
        interfaceEl.classList.remove("Controls_Hide");
        interfaceEl.classList.add("Controls_Show");
        interfaceEl.style.transform = `translateY(${-1 * adjustYAmt}px)`;
        setIsOpen(true);
        setIsTransitioning(false);
        // [cite: 2026-01-15] FIX: Trigger resize to ensure sliders measure correct width after animation
        window.dispatchEvent(new Event('resize'));
      }, 250);
    }, [adjustYAmt, openStyle, closeStyle]);

    const runCloseAnim = useCallback((cRef, interfaceEl) => {
      if (!interfaceEl) return;
      setIsTransitioning(true);
      interfaceEl.classList.add("Controls_Hide");
      setTimeout(() => {
        cRef.classList.add(closeStyle);
        interfaceEl.classList.remove("Controls_Show");
        cRef.classList.remove(openStyle);
        setTimeout(() => {
          setIsOpen(false);
          setIsTransitioning(false);
          if (onClose) onClose(controlID);
        }, 250);
      }, 250);
    }, [controlID, onClose, openStyle, closeStyle]);

    const updateControlsRef = useCallback(() => {
      if (isTransitioning) return;
      const cRef = controlsRef.current;
      const interfaceEl = cRef?.querySelector(".TAreaInterface_controlsContainer");
      if (!cRef || !interfaceEl) return;

      if (!isOpen) {
        if (onOpen) onOpen(controlID);
        runOpenAnim(cRef, interfaceEl);
      } else {
        runCloseAnim(cRef, interfaceEl);
      }
    }, [isOpen, isTransitioning, controlID, onOpen, runOpenAnim, runCloseAnim]);

    useEffect(() => {
      if (collapse && isOpen && !isTransitioning) {
        const cRef = controlsRef.current;
        const interfaceEl = cRef?.querySelector(".TAreaInterface_controlsContainer");
        if (cRef && interfaceEl) runCloseAnim(cRef, interfaceEl);
      }
    }, [collapse, isOpen, isTransitioning, runCloseAnim]);

    const onEnter = useCallback(() => {
      if (setActiveControlKey) setActiveControlKey(controlID);
    }, [setActiveControlKey, controlID]);

    const onLeave = useCallback(() => {
      if (setActiveControlKey) setActiveControlKey(null);
    }, [setActiveControlKey]);

    return (
      <div 
        id={controlID} 
        data-testid={`control-stripe-${controlID}`} // SMOKE TESTING
        className={controlClass} 
        ref={controlsRef} 
        onMouseEnter={onEnter} 
        onMouseLeave={onLeave}
      >
        <WrappedComponent
          {...rest}
          controlID={controlID} // SMOKE TESTING: Pass for internal use if needed
          handleUpdate={handleUpdateProxy} 
          updateControlsRef={updateControlsRef}
          isOpen={isOpen}
          isA11yEnabled={isA11yEnabled}
          sectionId={sectionId}
        />
      </div>
    );
  };

  return React.memo(ControlWrapper);
};

export default withInterfaceControls;