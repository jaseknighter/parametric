/**
 * @fileoverview withInterfaceControls.js
 * HOC: Standardizes UI control behavior.
 * RESTORED: All animation logic, transition locking, and proxy handlers.
 * FIXED: Identity propagation for stable Playwright testing.
 * [cite: 2026-01-12]
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { isFeatureEnabled } from "../../../shared/featureFlagUtils";
import { GUIDANCE_REGISTRY } from "../../../shared/GUIDANCE_REGISTRY/GUIDANCE_REGISTRY";
import MathTooltip from "../../../components/Common/MathTooltip";
import { useAdaptiveTooltip } from "../../../shared/hooks/useAdaptiveTooltip";

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
    
    // [cite: 2026-01-27] INSTRUCTIONAL BRIDGE: Lookup guidance
    const registryKey = `${controlID.toUpperCase()}_DRAWER`;
    const guidance = GUIDANCE_REGISTRY[registryKey] || {};
    const intentId = `intent-${controlID}`;
    
    // [cite: 2026-01-27] v0.5.2: Classified Content Lookup
    let behavior = guidance.tableBehavior || guidance.proseBehavior || "";
    // [cite: 2026-01-27] FIX: Append math expression if present so it appears in tooltip
    if (guidance.mathExpression) {
      behavior += ` $${guidance.mathExpression}$`;
    }

    // [cite: 2026-01-27] DX: Warn if guidance is missing in dev
    useEffect(() => {
      if (process.env.NODE_ENV === 'development' && !guidance.intent && !behavior) {
        console.warn(`[Guidance Missing]: No registry entry found for ${registryKey}`);
      }
    }, [registryKey, guidance, behavior]);

    // 🎯 Tooltip State
    const { tooltip, showTooltip, hideTooltip, handleMouseMove, handleFocus, handleBlur } = useAdaptiveTooltip();

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

    // [cite: 2026-01-27] INJECT: Apply attributes to children via DOM ref
    useEffect(() => {
      const root = controlsRef.current;
      if (!root) return;

      const button = root.querySelector('.TAreaInterface___TitleButton');
      if (button && behavior) { // [cite: 2026-01-27] GUARD: Ensure button exists
        // 🛡️ Remove native title to prevent browser tooltip collision
        button.removeAttribute('title');
        
        const triggerShow = (e) => showTooltip(e, { text: behavior, intent: guidance.intent });
        const triggerFocus = (e) => handleFocus(e, { text: behavior, intent: guidance.intent });

        button.addEventListener('mouseenter', triggerShow);
        button.addEventListener('mouseleave', hideTooltip);
        button.addEventListener('mousemove', handleMouseMove);
        button.addEventListener('focus', triggerFocus);
        button.addEventListener('blur', handleBlur);
        
        // Cleanup listeners on unmount or re-render
        return () => {
          button.removeEventListener('mouseenter', triggerShow);
          button.removeEventListener('mouseleave', hideTooltip);
          button.removeEventListener('mousemove', handleMouseMove);
          button.removeEventListener('focus', triggerFocus);
          button.removeEventListener('blur', handleBlur);
        };
      }

      const container = root.querySelector('.TAreaInterface_controlsContainer');
      if (container && guidance.intent) {
        container.setAttribute('aria-describedby', intentId);
      }
    }, [behavior, guidance.intent, intentId, showTooltip, hideTooltip, handleMouseMove, handleFocus, handleBlur]);

    return (
      <div 
        id={controlID} 
        data-testid={`control-stripe-${controlID}`} // SMOKE TESTING
        className={controlClass} 
        ref={controlsRef} 
        onMouseEnter={onEnter} 
        onMouseLeave={onLeave}
      >
        {guidance.intent && (
          <span id={intentId} className="sr-only">{guidance.intent}</span>
        )}
        <WrappedComponent
          {...rest}
          controlID={controlID} // SMOKE TESTING: Pass for internal use if needed
          handleUpdate={handleUpdateProxy} 
          updateControlsRef={updateControlsRef}
          isOpen={isOpen}
          isA11yEnabled={isA11yEnabled}
          sectionId={sectionId}
        />
        
        {/* 🚀 Decoupled MathTooltip with Stable Test ID */}
        <MathTooltip 
          intent={tooltip.intent}
          text={tooltip.text} 
          visible={tooltip.visible} 
          x={tooltip.x} 
          y={tooltip.y} 
          data-testid={`math-tooltip-${controlID}`} 
          isA11yEnabled={isA11yEnabled}
        />
      </div>
    );
  };

  return React.memo(ControlWrapper);
};

export default withInterfaceControls;